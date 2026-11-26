import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Le co-CEO (24/11/2026) — passerelle entre les agents et le WhatsApp d'Hippolyte.
 *
 * Les agents déposent leurs demandes dans `qg_demandes` (migration 2026112402). Cette fonction :
 *  - les envoie sur WhatsApp, une par message, avec trois boutons : Valider · Refuser · Modifier ;
 *  - reçoit la réponse (webhook Meta) et écrit la décision dans la base — l'agent n'agit qu'après ;
 *  - après « Modifier », prend le message suivant d'Hippolyte comme consigne pour l'agent ;
 *  - envoie chaque soir le récap de la journée.
 *
 * WhatsApp n'autorise un message libre (et donc des boutons) que dans les 24 h qui suivent le
 * dernier message d'Hippolyte. Au-delà, il faut un modèle approuvé par Meta : `qg_demande`
 * (créé par ?action=creer_modeles). Une réponse d'Hippolyte rouvre la fenêtre.
 *
 * Appels :
 *   GET  (Meta)                       vérification du webhook (hub.challenge)
 *   POST (Meta, signé)                messages entrants
 *   POST ?action=passage  (x-qg-token) envoi des demandes en attente + récap du soir (pg_cron, chaque minute)
 *   POST ?action=test     (x-qg-token) premier contact : modèle « hello_world » de Meta, puis un message d'essai
 *   POST ?action=creer_modeles (x-qg-token) dépose les modèles qg_demande et qg_message chez Meta
 *
 * Secrets (supabase secrets set) : WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_WABA_ID,
 *   WHATSAPP_APP_SECRET, WHATSAPP_VERIFY_TOKEN, QG_WHATSAPP_NUMERO (le numéro d'Hippolyte, chiffres
 *   seuls, indicatif compris : 33612345678), QG_TOKEN ; facultatifs : WHATSAPP_API_VERSION (v23.0),
 *   QG_HEURE_RECAP (21), QG_URL (adresse de l'application QG).
 *
 * Déploiement : supabase functions deploy qg --no-verify-jwt (Meta n'envoie pas de jeton Supabase).
 */

const env = (k: string, d = "") => Deno.env.get(k) ?? d;
const VERSION = env("WHATSAPP_API_VERSION", "v23.0");
const GRAPH = `https://graph.facebook.com/${VERSION}`;
const NUMERO = env("QG_WHATSAPP_NUMERO").replace(/\D/g, "");
const QG_URL = env("QG_URL");

const EQUIPES: Record<string, string> = {
  direction: "Direction", marketing: "Marketing", prospection: "Prospection",
  developpement: "Développement", production: "Production du site",
};
const RISQUE: Record<string, string> = { faible: "risque faible", normal: "", eleve: "⚠️ risque élevé" };

type Demande = {
  id: string; societe: string; equipe: string; agent: string; action: string; titre: string; resume: string | null;
  apercu: Record<string, unknown>; risque: string; cout_estime: number | null; urgence: boolean; statut: string;
};

function db(): SupabaseClient {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
}

/* ─────────────────────────────── WhatsApp ─────────────────────────────── */

async function graph(chemin: string, corps: unknown): Promise<{ ok: boolean; json: any }> {
  const r = await fetch(`${GRAPH}/${chemin}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env("WHATSAPP_TOKEN")}`, "Content-Type": "application/json" },
    body: JSON.stringify(corps),
  });
  return { ok: r.ok, json: await r.json().catch(() => ({})) };
}
const envoyer = (message: Record<string, unknown>) =>
  graph(`${env("WHATSAPP_PHONE_NUMBER_ID")}/messages`, { messaging_product: "whatsapp", recipient_type: "individual", to: NUMERO, ...message });
const texte = (corps: string) => envoyer({ type: "text", text: { body: corps.slice(0, 4096), preview_url: true } });
/** Code 131047 : plus de 24 h depuis le dernier message d'Hippolyte → modèle obligatoire. */
const horsFenetre = (json: any) => [131047, 131026].includes(Number(json?.error?.code));

const coupe = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…");

function corpsDemande(d: Demande): string {
  const a = d.apercu || {};
  const lignes = [
    `*${coupe(d.titre, 200)}*`,
    d.resume ? coupe(d.resume, 400) : "",
    typeof a.texte === "string" && a.texte ? `\n« ${coupe(a.texte, 450)} »` : "",
    typeof a.destinataire === "string" ? `Destinataire : ${a.destinataire}` : "",
    typeof a.lien === "string" ? `Voir : ${a.lien}` : "",
    [RISQUE[d.risque] || "", d.cout_estime ? `coût ${d.cout_estime} €` : ""].filter(Boolean).join(" · "),
    QG_URL ? `Détail dans le QG : ${QG_URL}/#${d.id}` : "",
  ];
  return lignes.filter(Boolean).join("\n").slice(0, 1024);
}

async function envoyerDemande(d: Demande): Promise<{ ok: boolean; id?: string; erreur?: string }> {
  const a = d.apercu || {};
  const entete = `${d.urgence ? "🔴 " : ""}${EQUIPES[d.equipe] || d.equipe}${d.societe === "daedalus" ? " · DAEDALUS" : ""}`;
  const image = typeof a.image === "string" && /^https:\/\//.test(a.image) ? a.image : null;
  const r = await envoyer({
    type: "interactive",
    interactive: {
      type: "button",
      header: image ? { type: "image", image: { link: image } } : { type: "text", text: coupe(entete, 60) },
      body: { text: corpsDemande(d) },
      footer: { text: coupe(`${image ? entete + " · " : ""}${d.agent}`, 60) },
      action: {
        buttons: [
          { type: "reply", reply: { id: `v:${d.id}`, title: "✅ Valider" } },
          { type: "reply", reply: { id: `r:${d.id}`, title: "❌ Refuser" } },
          { type: "reply", reply: { id: `m:${d.id}`, title: "✏️ Modifier" } },
        ],
      },
    },
  });
  if (r.ok) return { ok: true, id: r.json?.messages?.[0]?.id };
  if (!horsFenetre(r.json)) return { ok: false, erreur: JSON.stringify(r.json?.error ?? r.json).slice(0, 500) };
  // Fenêtre fermée : le modèle approuvé, avec les mêmes trois boutons (charge utile fixée à l'envoi).
  const m = await envoyer({
    type: "template",
    template: {
      name: env("QG_MODELE_DEMANDE", "qg_demande"), language: { code: "fr" },
      components: [
        { type: "body", parameters: [{ type: "text", text: coupe(entete, 60) }, { type: "text", text: coupe(d.titre, 300) }] },
        ...["v", "r", "m"].map((k, i) => ({ type: "button", sub_type: "quick_reply", index: String(i), parameters: [{ type: "payload", payload: `${k}:${d.id}` }] })),
      ],
    },
  });
  return m.ok ? { ok: true, id: m.json?.messages?.[0]?.id } : { ok: false, erreur: `hors fenêtre de 24 h, modèle refusé : ${JSON.stringify(m.json?.error ?? m.json).slice(0, 400)}` };
}

/** Message libre ; hors fenêtre, le modèle générique `qg_message`. */
async function message(corps: string): Promise<boolean> {
  const r = await texte(corps);
  if (r.ok) return true;
  if (!horsFenetre(r.json)) return false;
  const m = await envoyer({
    type: "template",
    template: { name: env("QG_MODELE_MESSAGE", "qg_message"), language: { code: "fr" }, components: [{ type: "body", parameters: [{ type: "text", text: coupe(corps.replace(/\n+/g, " · "), 900) }] }] },
  });
  return m.ok;
}

/* ─────────────────────────────── État ─────────────────────────────── */

async function lireEtat(s: SupabaseClient, cle: string): Promise<any> {
  const { data } = await s.from("qg_etat").select("valeur").eq("cle", cle).maybeSingle();
  return data?.valeur ?? null;
}
const ecrireEtat = (s: SupabaseClient, cle: string, valeur: unknown) =>
  s.from("qg_etat").upsert({ cle, valeur, maj_le: new Date().toISOString() });
const activite = (s: SupabaseClient, a: Record<string, unknown>) => s.from("qg_activite").insert(a);

/* ─────────────────────────────── Passage (chaque minute) ─────────────────────────────── */

const heureParis = () => Number(new Date().toLocaleString("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hour12: false }));
const jourParis = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });

async function passage(s: SupabaseClient) {
  // 1. Les demandes en attente, les urgentes d'abord ; cinq au plus par minute.
  const { data: attente } = await s.from("qg_demandes").select("*")
    .eq("statut", "a_valider").is("whatsapp_envoye_le", null)
    .order("urgence", { ascending: false }).order("cree_le").limit(5);
  let envoyees = 0;
  for (const d of (attente ?? []) as Demande[]) {
    const r = await envoyerDemande(d);
    await s.from("qg_demandes").update(r.ok
      ? { whatsapp_envoye_le: new Date().toISOString(), whatsapp_message_id: r.id, whatsapp_erreur: null }
      // Échec : on note l'erreur et on marque l'envoi pour ne pas réessayer en boucle chaque minute ;
      // la demande reste à valider dans le QG.
      : { whatsapp_envoye_le: new Date().toISOString(), whatsapp_erreur: r.erreur }).eq("id", d.id);
    if (r.ok) envoyees++;
    else await activite(s, { societe: d.societe, equipe: "direction", agent: "co-ceo", genre: "attention", message: `WhatsApp n'a pas pu envoyer « ${d.titre} » : ${r.erreur}`, demande: d.id });
  }

  // 2. Le récap du soir, une fois par jour.
  let recap = false;
  const jour = jourParis();
  if (heureParis() === Number(env("QG_HEURE_RECAP", "21")) && (await lireEtat(s, "recap"))?.jour !== jour) {
    await ecrireEtat(s, "recap", { jour });
    recap = await message(await texteRecap(s));
  }
  return { envoyees, recap };
}

async function texteRecap(s: SupabaseClient): Promise<string> {
  const depuis = new Date(Date.now() - 24 * 3600e3).toISOString();
  const [{ data: act }, { data: enAttente }, { data: pannes }] = await Promise.all([
    s.from("qg_activite").select("equipe, genre").gte("le", depuis),
    s.from("qg_demandes").select("titre, equipe").in("statut", ["a_valider", "a_modifier"]).order("cree_le").limit(8),
    s.from("qg_agents").select("prenom, equipe, dernier_message").eq("dernier_etat", "panne").limit(8),
  ]);
  const parEquipe = new Map<string, number>();
  for (const a of act ?? []) parEquipe.set(a.equipe || "direction", (parEquipe.get(a.equipe || "direction") || 0) + 1);
  const succes = (act ?? []).filter(a => a.genre === "succes").length;
  return [
    `*Récap du ${new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" })}*`,
    `${(act ?? []).length} événements, dont ${succes} actions réussies.`,
    [...parEquipe].map(([e, n]) => `• ${EQUIPES[e] || e} : ${n}`).join("\n"),
    enAttente?.length ? `\n*En attente de ta décision (${enAttente.length})*\n${enAttente.map(d => `• ${d.titre}`).join("\n")}` : "\nAucune décision en attente.",
    pannes?.length ? `\n*En panne*\n${pannes.map(p => `• ${p.prenom} (${EQUIPES[p.equipe] || p.equipe}) : ${p.dernier_message ?? ""}`).join("\n")}` : "",
    QG_URL ? `\nLe QG : ${QG_URL}` : "",
  ].filter(Boolean).join("\n");
}

/* ─────────────────────────────── Réponses d'Hippolyte ─────────────────────────────── */

async function signatureValide(brut: string, signature: string | null): Promise<boolean> {
  const secret = env("WHATSAPP_APP_SECRET");
  if (!secret || !signature?.startsWith("sha256=")) return false;
  const cle = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", cle, new TextEncoder().encode(brut)));
  const attendu = [...mac].map(b => b.toString(16).padStart(2, "0")).join("");
  const recu = signature.slice(7);
  if (recu.length !== attendu.length) return false;
  let diff = 0;
  for (let i = 0; i < recu.length; i++) diff |= recu.charCodeAt(i) ^ attendu.charCodeAt(i);
  return diff === 0;
}

const MOTS: Record<string, string> = { v: "validee", r: "refusee" };

async function decider(s: SupabaseClient, id: string, statut: string, commentaire?: string) {
  const { data: d } = await s.from("qg_demandes")
    .update({ statut, decide_le: new Date().toISOString(), decide_par: "whatsapp", ...(commentaire ? { commentaire } : {}) })
    .eq("id", id).in("statut", ["a_valider", "a_modifier"]).select("*").maybeSingle();
  if (!d) return null;
  await activite(s, {
    societe: d.societe, equipe: d.equipe, agent: d.agent, genre: "decision", demande: d.id,
    message: `${statut === "validee" ? "Validé" : statut === "refusee" ? "Refusé" : "À modifier"} sur WhatsApp : ${d.titre}${commentaire ? ` — « ${commentaire} »` : ""}`,
  });
  return d as Demande;
}

/**
 * Télécharge une image ou un fichier reçu sur WhatsApp (l'URL de Meta expire en quelques minutes
 * et exige le jeton) et le range dans le stockage, sous un chemin impossible à deviner. Renvoie
 * son adresse publique, ou null.
 */
async function mediaRecu(s: SupabaseClient, m: any): Promise<string | null> {
  const media = m.image ?? m.document;
  if (!media?.id) return null;
  const auth = { Authorization: `Bearer ${env("WHATSAPP_TOKEN")}` };
  try {
    const info = await fetch(`${GRAPH}/${media.id}`, { headers: auth }).then((r) => r.json());
    if (!info?.url) return null;
    const contenu = await fetch(info.url, { headers: auth }).then((r) => (r.ok ? r.arrayBuffer() : null));
    if (!contenu) return null;
    const type = String(info.mime_type || media.mime_type || "image/jpeg").split(";")[0];
    const ext = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" } as Record<string, string>)[type] ?? "bin";
    const chemin = `qg/recus/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
    const { error } = await s.storage.from("publications").upload(chemin, contenu, { contentType: type, upsert: false });
    if (error) return null;
    return s.storage.from("publications").getPublicUrl(chemin).data.publicUrl;
  } catch {
    return null;
  }
}

async function recevoir(s: SupabaseClient, m: any) {
  if (String(m.from || "").replace(/\D/g, "") !== NUMERO) return;   // un inconnu : ignoré
  await ecrireEtat(s, "fenetre", { dernier_recu: new Date().toISOString() });

  // Bouton : réponse à un message (interactive) ou à un modèle (button).
  const charge: string | undefined = m.interactive?.button_reply?.id ?? m.button?.payload;
  if (charge && /^[vrm]:[0-9a-f-]{36}$/.test(charge)) {
    const [k, id] = charge.split(":");
    if (k === "m") {
      const { data: d } = await s.from("qg_demandes").select("titre, statut").eq("id", id).maybeSingle();
      if (!d || !["a_valider", "a_modifier"].includes(d.statut)) { await texte("Cette demande est déjà décidée."); return; }
      await ecrireEtat(s, "modification", { demande: id, depuis: new Date().toISOString() });
      await texte(`✏️ Écris ta consigne en un message, je la transmets à l'agent.\n(${coupe(d.titre, 120)})`);
      return;
    }
    const d = await decider(s, id, MOTS[k]);
    await texte(d ? `${k === "v" ? "✅ Validé" : "❌ Refusé"} : ${coupe(d.titre, 150)}` : "Cette demande est déjà décidée.");
    return;
  }

  // Une image pour la bibliothèque de Rose (26/11) : légende « objet <nom> » (ex. « objet sante »).
  // Envoyée en FICHIER (document), un PNG garde sa transparence ; en photo, WhatsApp le convertit en JPEG.
  const legende: string = (m.image?.caption ?? m.document?.caption ?? "").trim();
  const objet = /^(objet|image)\s+([\p{L}\d-]+)/iu.exec(legende);
  if (objet && (m.type === "image" || m.type === "document")) {
    const nom = objet[2].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9-]/g, "");
    const media = m.image ?? m.document;
    const auth = { Authorization: `Bearer ${env("WHATSAPP_TOKEN")}` };
    try {
      const info = await fetch(`${GRAPH}/${media.id}`, { headers: auth }).then((r) => r.json());
      const contenu = await fetch(info.url, { headers: auth }).then((r) => r.arrayBuffer());
      const type = String(info.mime_type || media.mime_type || "").split(";")[0];
      if (type !== "image/png") {
        await texte("⚠️ Reçu en photo : WhatsApp l'a convertie en JPEG et la transparence est perdue. Renvoie le PNG en *Fichier* (trombone → Document), avec la même légende.");
        return;
      }
      const { error } = await s.storage.from("publications").upload(`objets/${nom}.png`, contenu, { contentType: "image/png", upsert: true });
      if (error) throw error;
      await activite(s, { societe: "lpcs", equipe: "marketing", agent: "co-ceo", genre: "succes", message: `Nouvelle image pour Rose : ${nom}`, lien: s.storage.from("publications").getPublicUrl(`objets/${nom}.png`).data.publicUrl });
      await texte(`🎨 Image « ${nom} » ajoutée à la bibliothèque de Rose.`);
    } catch {
      await texte("Je n'ai pas pu ranger cette image, renvoie-la stp.");
    }
    return;
  }

  // Une image (ou un fichier) : un exemple à suivre, une maquette… Elle rejoint la consigne.
  const image = m.type === "image" || m.type === "document" ? await mediaRecu(s, m) : null;
  const corps: string = (m.text?.body ?? m.image?.caption ?? m.document?.caption ?? "").trim();
  if (m.type === "image" || m.type === "document") {
    if (!image) { await texte("Je n'ai pas pu récupérer ce fichier, renvoie-le stp."); return; }
  } else if (!corps) return;
  // Consigne attendue après « Modifier » (pendant une heure) ; les images reçues entre-temps la suivent.
  const modif = await lireEtat(s, "modification");
  if (modif?.demande && Date.now() - Date.parse(modif.depuis) < 3600e3) {
    const images: string[] = [...(modif.images ?? []), ...(image ? [image] : [])];
    if (!corps) {
      await ecrireEtat(s, "modification", { ...modif, images });
      await texte("📎 Image reçue. Écris maintenant ta consigne (ou envoie d'autres images).");
      return;
    }
    await ecrireEtat(s, "modification", {});
    const consigne = [corps, ...images.map((u) => `📎 ${u}`)].join("\n");
    const d = await decider(s, modif.demande, "a_modifier", consigne);
    await texte(d ? `Noté. L'agent reprend avec ta consigne : « ${coupe(corps, 200)} »${images.length ? ` (+ ${images.length} image${images.length > 1 ? "s" : ""})` : ""}` : "Cette demande est déjà décidée.");
    return;
  }
  // Image envoyée APRÈS la consigne : jointe à la dernière demande renvoyée à un agent (24 h).
  if (image) {
    const { data: der } = await s.from("qg_demandes").select("id, titre, commentaire, agent, equipe, societe").eq("statut", "a_modifier")
      .gte("decide_le", new Date(Date.now() - 24 * 3600e3).toISOString()).order("decide_le", { ascending: false }).limit(1).maybeSingle();
    if (der) {
      await s.from("qg_demandes").update({ commentaire: [der.commentaire, `📎 ${image}${corps ? ` — ${corps}` : ""}`].filter(Boolean).join("\n") }).eq("id", der.id);
      await activite(s, { societe: der.societe, equipe: der.equipe, agent: der.agent, genre: "decision", demande: der.id, message: `Image jointe à la consigne : ${der.titre}`, lien: image });
      await texte(`📎 Image jointe à ta consigne : ${coupe(der.titre, 120)}`);
      return;
    }
    await activite(s, { societe: "lpcs", equipe: "direction", agent: "co-ceo", genre: "info", message: `Image reçue${corps ? ` : ${corps}` : ""}`, lien: image });
    await texte("📎 Image rangée dans le QG (onglet Activité). Pour la joindre à une demande, appuie d'abord sur ✏️ Modifier.");
    return;
  }
  // Petites commandes.
  const mot = corps.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/^(etat|recap|bilan)\b/.test(mot)) { await texte(await texteRecap(s)); return; }
  if (/^(attente|en attente|demandes)\b/.test(mot)) {
    const { data } = await s.from("qg_demandes").select("*").eq("statut", "a_valider").order("cree_le").limit(5);
    if (!data?.length) { await texte("Aucune demande en attente. 👌"); return; }
    for (const d of data as Demande[]) await envoyerDemande(d);
    return;
  }
  await texte([
    "Je suis le co-CEO de tes agents. Ce que je comprends :",
    "• *état* : le récap de la journée",
    "• *attente* : te renvoyer les demandes en attente",
    "• les boutons ✅ ❌ ✏️ sous chaque demande",
    QG_URL ? `Tout le reste est dans le QG : ${QG_URL}` : "",
  ].filter(Boolean).join("\n"));
}

/* ─────────────────────────────── Modèles Meta ─────────────────────────────── */

async function creerModeles() {
  const waba = env("WHATSAPP_WABA_ID");
  const modeles = [
    {
      name: env("QG_MODELE_DEMANDE", "qg_demande"), language: "fr", category: "UTILITY",
      components: [
        { type: "BODY", text: "Nouvelle demande de validation ({{1}}) : {{2}}. Réponds avec un des boutons ci-dessous.", example: { body_text: [["Marketing", "Publier le post Instagram sur la loi fin de vie"]] } },
        { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Valider" }, { type: "QUICK_REPLY", text: "Refuser" }, { type: "QUICK_REPLY", text: "Modifier" }] },
      ],
    },
    {
      name: env("QG_MODELE_MESSAGE", "qg_message"), language: "fr", category: "UTILITY",
      // Meta refuse une variable au début ou à la fin du texte.
      components: [{ type: "BODY", text: "Point du co-CEO de tes agents : {{1}}. Tout le détail est dans le QG.", example: { body_text: [["3 actions réussies aujourd'hui, 1 décision en attente"]] } }],
    },
  ];
  const resultats = [];
  for (const m of modeles) resultats.push({ modele: m.name, ...(await graph(`${waba}/message_templates`, m)).json });
  return resultats;
}

/* ─────────────────────────────── Entrée ─────────────────────────────── */

const json = (corps: unknown, status = 200) => new Response(JSON.stringify(corps), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // Vérification du webhook par Meta.
  if (req.method === "GET") {
    const ok = url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === env("WHATSAPP_VERIFY_TOKEN");
    return ok ? new Response(url.searchParams.get("hub.challenge") ?? "") : new Response("interdit", { status: 403 });
  }
  if (req.method !== "POST") return new Response("méthode", { status: 405 });

  const action = url.searchParams.get("action");
  const s = db();

  // Appels internes (pg_cron, essais) : jeton exigé.
  if (action) {
    if (!env("QG_TOKEN") || req.headers.get("x-qg-token") !== env("QG_TOKEN")) return new Response("interdit", { status: 403 });
    if (action === "passage") return json(await passage(s));
    if (action === "creer_modeles") return json(await creerModeles());
    if (action === "test") {
      // Premier contact : seul un modèle peut ouvrir la conversation. « hello_world » existe d'office.
      const modele = await envoyer({ type: "template", template: { name: "hello_world", language: { code: "en_US" } } });
      const libre = await texte("Bonjour, je suis le co-CEO de tes agents. Réponds-moi un mot (« ok ») pour ouvrir notre conversation : je pourrai alors t'envoyer les demandes avec leurs boutons.");
      return json({ modele: modele.json, message_libre: libre.ok ? "envoyé" : libre.json });
    }
    return json({ erreur: "action inconnue" }, 400);
  }

  // Webhook Meta : signé avec le secret de l'application.
  const brut = await req.text();
  if (!(await signatureValide(brut, req.headers.get("x-hub-signature-256")))) return new Response("signature", { status: 401 });
  let corps: any = {};
  try { corps = JSON.parse(brut); } catch { return new Response("ok"); }
  for (const entree of corps.entry ?? []) {
    for (const changement of entree.changes ?? []) {
      for (const m of changement.value?.messages ?? []) {
        try { await recevoir(s, m); } catch (e) { console.error("qg recevoir", e); }
      }
    }
  }
  // Meta attend un 200 rapide, sinon il renvoie le message.
  return new Response("ok");
});
