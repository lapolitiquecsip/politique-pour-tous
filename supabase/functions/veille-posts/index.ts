import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { quasiDoublon } from "../../../src/lib/quasi-doublon.ts";

/**
 * Veille « idées de post » — l'agent qui lit le site comme un rédacteur en chef.
 *
 * Toutes les quinze minutes (pg_cron → cette fonction), il relève ce qui vient
 * d'arriver dans la base : lois promulguées, textes notés importants, actualité
 * des candidats et des partis, sondages, programmes, pétitions qui franchissent
 * un seuil, primaires, controverses d'élus, indicateurs publics, fil d'accueil.
 * Il garde ce qui mérite un post et envoie, pour chaque info, un e-mail avec de
 * quoi l'écrire : les faits sourcés, pourquoi ça compte, des angles, un
 * carrousel Instagram, un texte LinkedIn, des hashtags, une idée de visuel et
 * les points de vigilance.
 *
 * La note vient d'une règle quand l'événement parle de lui-même (une loi
 * promulguée, une pétition à 500 000 signatures), sinon de l'IA, par lots, sur
 * une grille fixe. Le brouillon n'a droit qu'aux faits que le site détient ; tout
 * chiffre du brouillon absent de ces faits est signalé en tête de l'e-mail.
 *
 * Paramètres (secrets de la fonction) :
 *   VEILLE_POSTS_TO      destinataire des e-mails (jamais écrit dans le dépôt, public)
 *   VEILLE_POSTS_TOKEN   jeton exigé dans l'en-tête x-veille-token (pg_cron le lit dans le coffre)
 *   RESEND_API_KEY, LLM_FREE_API_KEY  déjà posés pour contact et topic-brief
 *   VEILLE_SEUIL (4), VEILLE_MAX_PASSAGE (3), VEILLE_MAX_JOUR (15)
 *
 * Appels manuels : POST avec l'en-tête x-veille-token ; ?essai=1 renvoie ce qui
 * serait envoyé sans rien écrire ni envoyer.
 *
 * Déploiement : supabase functions deploy veille-posts --no-verify-jwt
 */

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const SITE = "https://lapolitiquecestsimple.fr";
const SEUIL = Number(Deno.env.get("VEILLE_SEUIL") ?? 4);
const MAX_PASSAGE = Number(Deno.env.get("VEILLE_MAX_PASSAGE") ?? 3);
const MAX_JOUR = Number(Deno.env.get("VEILLE_MAX_JOUR") ?? 15);
const HEURE = 3600_000;

type Signal = {
  cle: string;
  source: string;
  titre: string;
  url?: string | null;
  lien_site?: string | null;
  date_objet?: string | null;
  faits: string;
  importance?: number;
  raison?: string;
  methode?: string;
};

/* ─────────────────────────── Le modèle gratuit ─────────────────────────── */

const MODELES = (Deno.env.get("LLM_FREE_MODELS") ??
  "gemini-3.6-flash,gemini-3.5-flash,gemini-3.1-flash-lite,gemini-flash-latest,gemini-flash-lite-latest")
  .split(",").map(m => m.trim()).filter(Boolean);

const pause = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Même mécanique que topic-brief : on change de lignée de modèle sur un 429. */
async function demander(systeme: string, utilisateur: string, jetons = 4096): Promise<string> {
  const cle = Deno.env.get("LLM_FREE_API_KEY") ?? Deno.env.get("GEMINI_API_KEY");
  if (!cle) throw new Error("LLM_FREE_API_KEY absente de la fonction");
  const appeler = (modele: string, avecReflexion: boolean) => fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent?key=${cle}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(45000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systeme }] },
        contents: [{ role: "user", parts: [{ text: utilisateur }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: jetons,
          responseMimeType: "application/json",
          ...(avecReflexion ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      }),
    },
  );
  let derniere = "";
  let aRejouer = MODELES;
  for (let passage = 0; passage < 2 && aRejouer.length; passage++) {
    if (passage) await pause(2500);
    const surcharges: string[] = [];
    for (const modele of aRejouer) {
      try {
        let r = await appeler(modele, true);
        if (r.status === 400) r = await appeler(modele, false);
        if (r.status === 503) { derniere = "HTTP 503"; surcharges.push(modele); continue; }
        if (r.status === 429) { derniere = "HTTP 429"; continue; }
        if (!r.ok) { derniere = `HTTP ${r.status} ${(await r.text()).slice(0, 200)}`; continue; }
        const data = await r.json();
        const texte = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
        if (!texte.trim()) { derniere = "réponse vide"; continue; }
        return texte;
      } catch (e) {
        derniere = (e as Error).message;
      }
    }
    aRejouer = surcharges;
  }
  throw new Error(`aucun modèle disponible (${derniere})`);
}

function lireJSON<T>(texte: string): T {
  const debut = texte.search(/[[{]/);
  return JSON.parse(debut > 0 ? texte.slice(debut) : texte) as T;
}

/* ─────────────────────────── État et curseurs ─────────────────────────── */

type Etat = { curseur: string | null; instantane: any };

async function lireEtats(db: SupabaseClient): Promise<Map<string, Etat>> {
  const { data } = await db.from("veille_posts_etat").select("source, curseur, instantane");
  return new Map((data ?? []).map((r: any) => [r.source, { curseur: r.curseur, instantane: r.instantane }]));
}

// Au premier passage d'une source, on ne remonte qu'à 24 heures : au-delà, c'est
// de l'histoire, pas une info à poster.
const depuis = (e?: Etat) => e?.curseur ?? new Date(Date.now() - 24 * HEURE).toISOString();
const plusRecent = (dates: (string | null | undefined)[], defaut: string) =>
  dates.filter(Boolean).sort().at(-1) ?? defaut;

const court = (s: unknown, n = 1200) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const sansGoogle = (u?: string | null) => u ?? null;

/* ───────────────────────────── Les veilleurs ───────────────────────────── */
// Chacun lit une source et rend ses signaux, plus l'état à retenir pour la suite.

type Releve = { signaux: Signal[]; etat: Etat };

async function veilleLois(db: SupabaseClient, e?: Etat): Promise<Releve> {
  const de = depuis(e);
  const { data: lois } = await db.from("promulgated_laws")
    .select("id, dossier_id, title, promulgated_at, source_url, created_at")
    .gt("created_at", de).order("created_at").limit(20);
  const ids = (lois ?? []).map(l => l.dossier_id).filter(Boolean);
  const [{ data: analyses }, { data: impacts }] = await Promise.all([
    ids.length ? db.from("legislative_analyses").select("dossier_id, summary, generated_at").in("dossier_id", ids).eq("audience", "public").order("generated_at", { ascending: false }) : { data: [] },
    ids.length ? db.from("law_citizen_impact").select("dossier_id, impact").in("dossier_id", ids) : { data: [] },
  ]);
  const resume = new Map<string, string>();
  for (const a of analyses ?? []) if (!resume.has(a.dossier_id)) resume.set(a.dossier_id, a.summary);
  const impact = new Map((impacts ?? []).map((i: any) => [i.dossier_id, i.impact]));
  return {
    signaux: (lois ?? []).map(l => ({
      cle: `loi:${l.id}`, source: "Loi promulguée", titre: l.title,
      url: l.source_url, lien_site: l.dossier_id ? `${SITE}/lois/texte/${l.dossier_id}` : `${SITE}/lois`,
      date_objet: l.promulgated_at,
      faits: [`${l.title}, publiée au Journal officiel le ${l.promulgated_at}.`, resume.get(l.dossier_id) ?? "",
        impact.get(l.dossier_id) ? `Ce que ça change : ${court(impact.get(l.dossier_id), 800)}` : ""].filter(Boolean).join("\n"),
      importance: 5, raison: "Loi promulguée au Journal officiel", methode: "regle",
    })),
    etat: { curseur: plusRecent((lois ?? []).map(l => l.created_at), de), instantane: null },
  };
}

async function veilleTextes(db: SupabaseClient, e?: Etat): Promise<Releve> {
  const de = depuis(e);
  const { data } = await db.from("textes_impacts")
    .select("id, source, chambre, titre, resume, url, date_texte, importance, explication, resultat, analyse_le")
    .gt("analyse_le", de).gte("importance", 4).order("analyse_le").limit(20);
  return {
    signaux: (data ?? []).map(t => ({
      cle: `texte:${t.id}`, source: t.source === "decret" ? "Décret au Journal officiel" : `Texte (${t.chambre})`,
      titre: t.titre, url: t.url, lien_site: `${SITE}/lois`, date_objet: t.date_texte,
      faits: [t.titre, t.resultat ? `Résultat : ${t.resultat}` : "", court(t.resume, 1500), t.explication ? `Ce que ça change : ${t.explication}` : ""].filter(Boolean).join("\n"),
      importance: t.importance, raison: "Texte noté important par l'analyse du site", methode: "regle",
    })),
    etat: { curseur: plusRecent((data ?? []).map(t => t.analyse_le), de), instantane: null },
  };
}

async function veilleFil(db: SupabaseClient, e?: Etat): Promise<Releve> {
  const de = depuis(e);
  const { data } = await db.from("content")
    .select("id, titre_simplifie, resume_flash, resume_detaille, raw_text, source_url, source_name, institution, date_publication, created_at")
    .gt("created_at", de).order("created_at").limit(60);
  return {
    signaux: (data ?? []).filter(c => c.titre_simplifie).map(c => ({
      cle: `fil:${c.id}`, source: `Actualité (${c.institution})`, titre: c.titre_simplifie,
      url: c.source_url, lien_site: `${SITE}/#actualites`, date_objet: c.date_publication,
      // Le texte que le rédacteur du fil a lu : la matière du post, au-delà du résumé.
      faits: [c.titre_simplifie, court(c.resume_flash, 800), court(c.resume_detaille, 1500), c.source_name ? `Sources : ${c.source_name}` : "",
        c.raw_text ? `Extrait de l'article source :\n${court(c.raw_text, 3500)}` : ""].filter(Boolean).join("\n"),
    })),
    etat: { curseur: plusRecent((data ?? []).map(c => c.created_at), de), instantane: null },
  };
}

type Candidat = { nom: string; slug: string; parti: string; contexte: string };

/**
 * Les candidats, avec ce que le site sait d'eux : portrait, quelques propositions,
 * dernier score de sondage. Une dépêche de deux lignes ne suffit pas à faire un
 * post ; ce contexte, déjà vérifié sur le site, donne au brouillon de la matière.
 */
async function candidatsParId(db: SupabaseClient): Promise<Map<string, Candidat>> {
  const [{ data }, { data: props }, { data: sondage }] = await Promise.all([
    db.from("presidential_candidates").select("id, slug, full_name, party, summary"),
    db.from("candidate_proposals").select("candidate_id, theme, text").order("sort_order").limit(3000),
    db.from("sondages").select("institut, date_fin, resultats").eq("tour", 1).eq("hypothese", 1).order("date_fin", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const parCandidat = new Map<string, string[]>();
  for (const p of props ?? []) {
    const l = parCandidat.get(p.candidate_id) ?? [];
    if (l.length < 5) l.push(`${p.theme} : ${court(p.text, 200)}`);
    parCandidat.set(p.candidate_id, l);
  }
  const scores = new Map(((sondage?.resultats ?? []) as any[]).map(r => [r.slug, r.pct]));
  return new Map((data ?? []).map((c: any) => [c.id, {
    nom: c.full_name, slug: c.slug, parti: c.party,
    contexte: [
      c.summary ? `Portrait (site) : ${court(c.summary, 600)}` : "",
      parCandidat.get(c.id)?.length ? `Propositions relevées sur le site :\n${parCandidat.get(c.id)!.map(x => `- ${x}`).join("\n")}` : "",
      scores.has(c.slug) ? `Dernier sondage ${sondage!.institut} (${sondage!.date_fin}, 1er tour) : ${scores.get(c.slug)} %.` : "",
    ].filter(Boolean).join("\n"),
  }]));
}

async function veilleCandidats(db: SupabaseClient, e: Etat | undefined, cand: Map<string, Candidat>): Promise<Releve> {
  const de = depuis(e);
  const { data } = await db.from("candidate_news")
    .select("id, candidate_id, date, title, summary, news_type, source_name, source_url, created_at")
    .gt("created_at", de).order("created_at").limit(80);
  // created_at est la date de collecte : une interview du 8 peut arriver le 26. Seule
  // une info datée de moins de trois jours est encore une info.
  const fraiche = new Date(Date.now() - 3 * 24 * HEURE).toISOString().slice(0, 10);
  return {
    signaux: (data ?? []).filter(n => !n.date || n.date >= fraiche).map(n => {
      const c = cand.get(n.candidate_id);
      return {
        cle: `candidat:${n.id}`, source: `Candidat 2027${c ? ` · ${c.nom}` : ""}`, titre: n.title,
        url: sansGoogle(n.source_url), lien_site: c ? `${SITE}/presidentielles-2027/?candidat=${c.slug}` : `${SITE}/presidentielles-2027`,
        date_objet: n.date,
        faits: [n.title, court(n.summary, 800), c ? `${c.nom} (${c.parti}), candidat à la présidentielle 2027.` : "", `Type : ${n.news_type ?? "?"} · Média : ${n.source_name ?? "?"}`, c?.contexte ?? ""].filter(Boolean).join("\n"),
      };
    }),
    etat: { curseur: plusRecent((data ?? []).map(n => n.created_at), de), instantane: null },
  };
}

async function veilleSuivis(db: SupabaseClient, e?: Etat): Promise<Releve> {
  const de = depuis(e);
  const { data } = await db.from("tri_suivis")
    .select("cle, entite, titre, importance, nature, raison, evenement, cree_le")
    .gt("cree_le", de).gte("importance", 4).order("cree_le").limit(40);
  const titres = (data ?? []).map(t => t.titre);
  const { data: liens } = titres.length
    ? await db.from("entity_feed").select("title, url").in("title", titres)
    : { data: [] as { title: string; url: string }[] };
  const url = new Map((liens ?? []).map((l: any) => [l.title, l.url]));
  return {
    signaux: (data ?? []).map(t => ({
      cle: `suivi:${t.cle}`, source: `Parti · ${t.entite}`, titre: t.titre, url: url.get(t.titre) ?? null,
      lien_site: `${SITE}/partis`, date_objet: t.cree_le,
      faits: [t.evenement || t.titre, `Acteur : ${t.entite}`, `Nature : ${t.nature}`, t.raison ? `Pourquoi c'est notable : ${t.raison}` : ""].filter(Boolean).join("\n"),
    })),
    etat: { curseur: plusRecent((data ?? []).map(t => t.cree_le), de), instantane: null },
  };
}

async function veilleSondages(db: SupabaseClient, e?: Etat): Promise<Releve> {
  const de = depuis(e);
  const { data } = await db.from("sondages")
    .select("id, institut, tour, hypothese, date_fin, echantillon, resultats, source_url, commanditaire, cree_le")
    .gt("cree_le", de).eq("tour", 1).eq("hypothese", 1).order("cree_le").limit(10);
  const signaux: Signal[] = [];
  for (const s of data ?? []) {
    // Comparer au sondage précédent du même institut : « +3 points » fait le post.
    const { data: avant } = await db.from("sondages").select("date_fin, resultats")
      .eq("institut", s.institut).eq("tour", 1).eq("hypothese", 1).lt("date_fin", s.date_fin)
      .order("date_fin", { ascending: false }).limit(1).maybeSingle();
    const prec = new Map(((avant?.resultats ?? []) as any[]).map(r => [r.nom, r.pct]));
    const lignes = ((s.resultats ?? []) as any[]).slice(0, 8).map(r => {
      const p = prec.get(r.nom);
      const ecart = typeof p === "number" ? ` (${r.pct - p >= 0 ? "+" : ""}${Math.round((r.pct - p) * 10) / 10} pt depuis le ${avant!.date_fin})` : "";
      return `${r.complet || r.nom} : ${r.pct} %${ecart}`;
    });
    signaux.push({
      cle: `sondage:${s.id}`, source: `Sondage · ${s.institut}`,
      titre: `Sondage ${s.institut} (1er tour, ${s.date_fin}) : ${lignes.slice(0, 2).join(", ")}`,
      url: s.source_url, lien_site: `${SITE}/presidentielles-2027`, date_objet: s.date_fin,
      faits: [`Sondage ${s.institut}${s.commanditaire ? ` pour ${s.commanditaire}` : ""}, terrain achevé le ${s.date_fin}${s.echantillon ? `, ${s.echantillon} personnes interrogées` : ""}, premier tour (hypothèse principale).`, ...lignes,
        "Un sondage mesure des intentions à une date donnée, ce n'est pas une prédiction."].join("\n"),
    });
  }
  return { signaux, etat: { curseur: plusRecent((data ?? []).map(s => s.cree_le), de), instantane: null } };
}

async function veilleControverses(db: SupabaseClient, e?: Etat): Promise<Releve> {
  const de = depuis(e);
  const { data } = await db.from("controverses_veille")
    .select("id, personne, texte, date_faits, sources, creee_le")
    .gt("creee_le", de).eq("masquee", false).order("creee_le").limit(15);
  return {
    signaux: (data ?? []).map(c => ({
      cle: `controverse:${c.id}`, source: `Élu · ${c.personne}`, titre: `${c.personne} : ${court(c.texte, 110)}`,
      url: ((c.sources ?? []) as any[])[0]?.url ?? null, lien_site: SITE, date_objet: c.date_faits,
      faits: [court(c.texte, 1500), "Affaire judiciaire ou controverse : respecter la présomption d'innocence, citer les sources, distinguer enquête, mise en examen et condamnation."].join("\n"),
    })),
    etat: { curseur: plusRecent((data ?? []).map(c => c.creee_le), de), instantane: null },
  };
}

async function veilleDebats(db: SupabaseClient, e: Etat | undefined, cand: Map<string, Candidat>): Promise<Releve> {
  // updated_at bouge chaque nuit pour toutes les lignes : on lit la date de l'émission.
  const jour = new Date(Date.now() - 3 * 24 * HEURE).toISOString().slice(0, 10);
  const { data } = await db.from("candidate_debates")
    .select("candidate_id, kind, title, broadcaster, date, url, a_venir")
    .gte("date", jour).eq("a_venir", false).limit(30);
  return {
    signaux: (data ?? []).map(d => {
      const c = cand.get(d.candidate_id);
      return {
        cle: `debat:${d.url}`, source: `Débat · ${d.broadcaster?.trim() ?? "télé"}`, titre: d.title, url: d.url,
        lien_site: c ? `${SITE}/presidentielles-2027/?candidat=${c.slug}` : `${SITE}/presidentielles-2027`, date_objet: d.date,
        faits: [d.title, `Diffusé par ${d.broadcaster?.trim() ?? "?"} le ${d.date}.`, c ? `Candidat concerné : ${c.nom} (${c.parti}).` : "", c?.contexte ?? ""].filter(Boolean).join("\n"),
      };
    }),
    etat: { curseur: e?.curseur ?? null, instantane: null },
  };
}

// ── Sources lues par instantané : on compare à l'état retenu au passage précédent.
// Au tout premier passage, on retient l'état sans rien signaler.

async function veillePetitions(db: SupabaseClient, e?: Etat): Promise<Releve> {
  const { data } = await db.from("petitions").select("id, title, signatures, url").gte("signatures", 50000);
  const avant = (e?.instantane ?? null) as Record<string, number> | null;
  const apres: Record<string, number> = {};
  const signaux: Signal[] = [];
  for (const p of data ?? []) {
    const palier = p.signatures >= 500000 ? 500000 : p.signatures >= 100000 ? 100000 : 0;
    apres[p.id] = palier;
    if (!avant || !palier || (avant[p.id] ?? 0) >= palier) continue;
    signaux.push({
      cle: `petition:${p.id}:${palier}`, source: "Pétition à l'Assemblée",
      titre: `${palier.toLocaleString("fr-FR")} signatures : « ${court(p.title, 90)} »`, url: p.url, lien_site: `${SITE}/#petitions`,
      faits: [`La pétition « ${p.title} » a dépassé ${palier.toLocaleString("fr-FR")} signatures (${p.signatures.toLocaleString("fr-FR")} à ce jour) sur la plateforme de l'Assemblée nationale.`,
        palier === 500000
          ? "À partir de 500 000 signatures issues d'au moins 30 départements ou collectivités d'outre-mer, la Conférence des présidents peut décider d'organiser un débat en séance publique. Ce débat n'est pas automatique."
          : "À partir de 100 000 signatures, la pétition est mise en avant sur le site de l'Assemblée. Son examen n'en devient pas obligatoire : la commission saisie décide de l'examiner ou de la classer."].join("\n"),
      importance: palier === 500000 ? 5 : 4, raison: `Seuil des ${palier.toLocaleString("fr-FR")} signatures franchi`, methode: "regle",
    });
  }
  return { signaux, etat: { curseur: null, instantane: apres } };
}

async function veilleCandidatures(db: SupabaseClient, e?: Etat): Promise<Releve> {
  const { data } = await db.from("presidential_candidates").select("id, slug, full_name, party, status, declared_at, summary");
  const avant = (e?.instantane ?? null) as Record<string, string> | null;
  const apres: Record<string, string> = {};
  const signaux: Signal[] = [];
  const LIBELLE: Record<string, string> = { declared: "se déclare candidat(e)", withdrawn: "renonce", non_candidat: "n'est pas candidat(e)" };
  for (const c of data ?? []) {
    apres[c.id] = c.status;
    if (!avant || avant[c.id] === c.status || !LIBELLE[c.status]) continue;
    signaux.push({
      cle: `candidature:${c.id}:${c.status}`, source: "Présidentielle 2027",
      titre: `${c.full_name} ${LIBELLE[c.status]} à la présidentielle 2027`, lien_site: `${SITE}/presidentielles-2027/?candidat=${c.slug}`,
      date_objet: c.declared_at,
      faits: [`${c.full_name} (${c.party}) : statut passé de « ${avant[c.id] ?? "inconnu"} » à « ${c.status} »${c.declared_at ? `, déclaration du ${c.declared_at}` : ""}.`, court(c.summary, 800)].filter(Boolean).join("\n"),
      importance: 5, raison: "Changement dans la liste des candidats", methode: "regle",
    });
  }
  return { signaux, etat: { curseur: null, instantane: apres } };
}

async function veilleProgrammes(db: SupabaseClient, e: Etat | undefined, cand: Map<string, Candidat>): Promise<Releve> {
  const tout: any[] = [];
  for (let de = 0; ; de += 1000) {
    const { data } = await db.from("candidate_proposals").select("id, candidate_id, theme, text, source_url").range(de, de + 999);
    tout.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const connus = e?.instantane ? new Set<string>(e.instantane as string[]) : null;
  const signaux: Signal[] = [];
  if (connus) {
    const groupes = new Map<string, any[]>();
    for (const p of tout) if (!connus.has(p.id)) {
      const k = `${p.candidate_id}|${p.theme}`;
      groupes.set(k, [...(groupes.get(k) ?? []), p]);
    }
    for (const [k, props] of groupes) {
      const c = cand.get(props[0].candidate_id);
      signaux.push({
        cle: `programme:${k}:${props.map(p => p.id).sort().join(",").slice(0, 60)}`, source: `Programme 2027${c ? ` · ${c.nom}` : ""}`,
        titre: `${c?.nom ?? "Un candidat"} : ${props.length} proposition${props.length > 1 ? "s" : ""} sur « ${props[0].theme} »`,
        url: props[0].source_url, lien_site: c ? `${SITE}/presidentielles-2027/?candidat=${c.slug}` : `${SITE}/presidentielles-2027`,
        faits: [`${c?.nom ?? "Candidat"}${c ? ` (${c.parti})` : ""} publie des propositions sur le thème « ${props[0].theme} » :`, ...props.slice(0, 12).map(p => `- ${court(p.text, 300)}`), c?.contexte ?? ""].filter(Boolean).join("\n"),
        importance: 4, raison: "Nouvelles propositions de programme", methode: "regle",
      });
    }
  }
  return { signaux, etat: { curseur: null, instantane: tout.map(p => p.id) } };
}

async function veillePrimaires(db: SupabaseClient, e?: Etat): Promise<Releve> {
  const { data } = await db.from("primary_events").select("id, primaire, camp, type, titre, statut, resume, source_url");
  const avant = (e?.instantane ?? null) as Record<string, string> | null;
  const apres: Record<string, string> = {};
  const signaux: Signal[] = [];
  for (const p of data ?? []) {
    const empreinte = `${p.titre}|${p.statut}|${court(p.resume, 200)}`;
    apres[p.id] = empreinte;
    if (!avant || avant[p.id] === empreinte || p.statut === "annule") continue;
    const resultat = /%|élu|vainqueur|remporte|désigné/i.test(`${p.titre} ${p.resume ?? ""}`);
    signaux.push({
      cle: `primaire:${p.id}:${empreinte.slice(0, 80)}`, source: `Primaire · ${p.primaire}`, titre: p.titre, url: p.source_url,
      lien_site: `${SITE}/presidentielles-2027`,
      faits: [`${p.primaire} (${p.camp}) : ${p.titre} — statut ${p.statut}.`, court(p.resume, 1200)].filter(Boolean).join("\n"),
      ...(resultat ? { importance: 5, raison: "Résultat de primaire", methode: "regle" } : {}),
    });
  }
  return { signaux, etat: { curseur: null, instantane: apres } };
}

async function veilleIndicateurs(db: SupabaseClient, e?: Etat): Promise<Releve> {
  const { data } = await db.from("indicators").select("code, theme, label, sub, value, unit, period_label, source, source_url, better_when");
  const avant = (e?.instantane ?? null) as Record<string, string> | null;
  const apres: Record<string, string> = {};
  const signaux: Signal[] = [];
  for (const i of data ?? []) {
    const empreinte = `${i.period_label}|${i.value}`;
    apres[i.code] = empreinte;
    if (!avant || !avant[i.code] || avant[i.code] === empreinte) continue;
    const [periodeAvant, valeurAvant] = avant[i.code].split("|");
    signaux.push({
      cle: `indicateur:${i.code}:${empreinte}`, source: `Chiffre officiel · ${i.source}`,
      titre: `${i.label} : ${i.value} ${i.unit} (${i.period_label})`, url: i.source_url, lien_site: `${SITE}/presidentielles-2027`,
      faits: [`${i.label}${i.sub ? ` (${i.sub})` : ""} : ${i.value} ${i.unit} sur ${i.period_label}, selon ${i.source}.`,
        `Valeur précédente publiée : ${valeurAvant} ${i.unit} (${periodeAvant}).`, `Thème : ${i.theme}.`].join("\n"),
    });
  }
  return { signaux, etat: { curseur: null, instantane: apres } };
}

/* ─────────────────────────── La note de l'IA ─────────────────────────── */

const GRILLE = `Tu es rédacteur en chef de « La Politique C'est Simple », média pédagogique et NON PARTISAN qui explique la politique française sur Instagram et LinkedIn. Pour chaque info, dis si elle mérite un post.
Grille (note entière) :
5 = événement majeur que tout le monde va chercher à comprendre : loi qui change le quotidien, résultat d'élection ou de primaire, candidature présidentielle, décision historique, chiffre officiel choc.
4 = mérite un post : mesure concrète qui touche beaucoup de gens, vote important, proposition de programme chiffrée ou clivante, sondage qui bouge nettement, débat national qui s'ouvre, affaire judiciaire majeure d'un responsable national.
3 = intéressant mais niche, ou simple déclaration / petite phrase sans fait nouveau.
2 = routine (nominations, agenda, interview sans annonce).
1 = bruit, doublon, info locale sans portée nationale.
Une opinion, une réaction ou une interview sans annonce ne dépasse pas 3. Réponds en JSON : [{"i": numéro, "note": 1-5, "raison": "8 mots max"}].`;

async function noter(signaux: { i: number; s: Signal }[]): Promise<Map<number, { note: number; raison: string }>> {
  const liste = signaux.map(({ i, s }) => `${i}. [${s.source}] ${s.titre} — ${court(s.faits, 260)}`).join("\n");
  const r = lireJSON<{ i: number; note: number; raison: string }[]>(await demander(GRILLE, liste, 2048));
  return new Map(r.filter(x => typeof x.i === "number").map(x => [x.i, { note: Math.max(1, Math.min(5, Math.round(x.note))), raison: court(x.raison, 80) }]));
}

/* ─────────────────────────── Le brouillon du post ─────────────────────────── */

type Brief = {
  accroche: string;
  pourquoi: string;
  faits_cles: string[];
  angles: string[];
  instagram: { slides: string[]; legende: string; hashtags: string[] };
  linkedin: { texte: string; hashtags: string[] };
  visuel: string;
  prudence: string[];
};

const CONSIGNE_BRIEF = `Tu prépares la matière d'un post pour « La Politique C'est Simple » (lapolitiquecestsimple.fr), média pédagogique et NON PARTISAN : on explique, on ne prend pas parti, on ne caricature personne.
RÈGLE ABSOLUE : n'utilise QUE les faits fournis. Aucun chiffre, nom, date ou citation qui n'y figure pas. Si une information manque, ne la comble pas.
Réponds en JSON strict :
{
 "accroche": "titre de post percutant, 90 caractères max, sans clickbait mensonger",
 "pourquoi": "2 phrases : pourquoi ça concerne notre public",
 "faits_cles": ["3 à 5 faits vérifiables tirés des faits fournis"],
 "angles": ["3 angles de post différents : pédagogique (ce que ça change), comparaison/contexte, question posée à l'audience"],
 "instagram": {"slides": ["carrousel de 5 à 7 slides, texte court par slide, la 1re = accroche, la dernière = appel à suivre / lien en bio"], "legende": "légende Instagram 400 caractères max", "hashtags": ["6 à 10 hashtags"]},
 "linkedin": {"texte": "post LinkedIn de 700 à 1200 caractères, phrases courtes, sauts de ligne, une conclusion qui ouvre la discussion, renvoi vers lapolitiquecestsimple.fr", "hashtags": ["3 à 5 hashtags"]},
 "visuel": "idée de visuel précise (chiffre clé en grand, photo, schéma, comparatif)",
 "prudence": ["points de vigilance : ce qui reste à vérifier, neutralité, présomption d'innocence, sondage ≠ prédiction… (liste vide si rien)"]
}`;

async function rediger(s: Signal): Promise<Brief> {
  const question = `Source : ${s.source}\nTitre : ${s.titre}\nDate : ${s.date_objet ?? "?"}\nLien source : ${s.url ?? "—"}\nPage du site : ${s.lien_site ?? SITE}\n\nFAITS :\n${s.faits}`;
  // Il arrive au modèle de rendre un JSON cassé (guillemet non échappé dans une
  // citation) : un second tirage suffit presque toujours.
  try {
    return lireJSON<Brief>(await demander(CONSIGNE_BRIEF, question, 4096));
  } catch (e) {
    if (!(e instanceof SyntaxError)) throw e;
    return lireJSON<Brief>(await demander(`${CONSIGNE_BRIEF}\nÉchappe tout guillemet à l'intérieur des textes (\\").`, question, 4096));
  }
}

/** Chiffres du brouillon absents des faits : à vérifier avant de publier. */
function chiffresAVerifier(brief: Brief, faits: string): string[] {
  const norme = (n: string) => n.replace(/[\s  ]/g, "").replace(",", ".").replace(/\.0+$/, "");
  const nombres = (t: string) => (t.match(/\d[\d\s  ]*(?:[.,]\d+)?/g) ?? []).map(norme).filter(n => n && Number(n) > 10);
  const connus = new Set(nombres(faits));
  const tout = JSON.stringify(brief).replace(/\\n/g, " ");
  return [...new Set(nombres(tout).filter(n => !connus.has(n)))].slice(0, 12);
}

/* ─────────────────────────────── L'e-mail ─────────────────────────────── */

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
const etoiles = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

function bloc(titre: string, contenu: string, fond = "#ffffff") {
  return `<tr><td style="padding:0 24px 16px"><div style="background:${fond};border:1px solid #e7e2d6;border-radius:14px;padding:16px 18px">
<div style="font:800 11px/1 -apple-system,Segoe UI,Roboto,Arial;letter-spacing:.14em;text-transform:uppercase;color:#64748b;margin-bottom:10px">${titre}</div>${contenu}</div></td></tr>`;
}
const para = (t: string) => `<p style="margin:0 0 8px;font:15px/1.55 -apple-system,Segoe UI,Roboto,Arial;color:#0f172a">${esc(t).replace(/\n/g, "<br>")}</p>`;
const liste = (l: string[]) => `<ul style="margin:0;padding-left:20px;font:15px/1.55 -apple-system,Segoe UI,Roboto,Arial;color:#0f172a">${l.map(x => `<li style="margin-bottom:4px">${esc(x)}</li>`).join("")}</ul>`;

function rendu(p: any): { sujet: string; html: string; texte: string } {
  const b: Brief | null = p.brief;
  const imp = p.importance ?? 4;
  const lignes: string[] = [];
  lignes.push(`<tr><td style="background:#0b1020;padding:22px 24px;border-radius:18px 18px 0 0">
<div style="font:800 11px/1 -apple-system,Segoe UI,Roboto,Arial;letter-spacing:.16em;text-transform:uppercase;color:#fbbf24">Idée de post · ${esc(p.source)}</div>
<div style="margin-top:10px;font:800 22px/1.25 -apple-system,Segoe UI,Roboto,Arial;color:#ffffff">${esc(b?.accroche || p.titre)}</div>
<div style="margin-top:10px;font:14px/1.4 -apple-system,Segoe UI,Roboto,Arial;color:#cbd5e1"><span style="color:#fbbf24">${etoiles(imp)}</span> &nbsp;${esc(p.raison ?? "")}</div></td></tr><tr><td style="height:16px"></td></tr>`);
  if (p.chiffres_a_verifier?.length) {
    lignes.push(bloc("⚠ Chiffres à vérifier avant de publier", para(`Le brouillon cite ${p.chiffres_a_verifier.join(", ")}, absent(s) des faits du site. Vérifiez-les à la source ou retirez-les.`), "#fff7ed"));
  }
  const liens = [p.url ? `<a href="${esc(p.url)}" style="color:#1d4ed8">Source</a>` : "", p.lien_site ? `<a href="${esc(p.lien_site)}" style="color:#1d4ed8">Page du site à partager</a>` : ""].filter(Boolean).join(" &nbsp;·&nbsp; ");
  lignes.push(bloc("L'info", para(p.titre) + (b?.faits_cles?.length ? liste(b.faits_cles) : para(p.faits)) + (liens ? `<p style="margin:10px 0 0;font:14px -apple-system,Segoe UI,Roboto,Arial">${liens}</p>` : "")));
  if (b) {
    lignes.push(bloc("Pourquoi ça mérite un post", para(b.pourquoi)));
    if (b.angles?.length) lignes.push(bloc("Angles possibles", liste(b.angles)));
    if (b.instagram?.slides?.length) {
      lignes.push(bloc("Instagram · carrousel", `<ol style="margin:0 0 10px;padding-left:22px;font:15px/1.55 -apple-system,Segoe UI,Roboto,Arial;color:#0f172a">${b.instagram.slides.map(x => `<li style="margin-bottom:6px">${esc(x)}</li>`).join("")}</ol>`
        + para(`Légende : ${b.instagram.legende ?? ""}`) + para((b.instagram.hashtags ?? []).map(h => h.startsWith("#") ? h : `#${h}`).join(" ")), "#fdf4ff"));
    }
    if (b.linkedin?.texte) {
      lignes.push(bloc("LinkedIn · texte prêt à adapter", para(b.linkedin.texte) + para((b.linkedin.hashtags ?? []).map(h => h.startsWith("#") ? h : `#${h}`).join(" ")), "#eff6ff"));
    }
    if (b.visuel) lignes.push(bloc("Idée de visuel", para(b.visuel)));
    if (b.prudence?.length) lignes.push(bloc("Points de vigilance", liste(b.prudence), "#f8fafc"));
  } else {
    lignes.push(bloc("Brouillon", para("Le brouillon IA n'a pas pu être rédigé (modèle gratuit indisponible). Les faits bruts sont ci-dessus.")));
  }
  lignes.push(`<tr><td style="padding:4px 24px 28px;font:12px/1.5 -apple-system,Segoe UI,Roboto,Arial;color:#94a3b8">Veille automatique de La Politique C'est Simple — détecté le ${esc(new Date(p.detecte_le ?? Date.now()).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }))}. Les brouillons sont rédigés par IA à partir des seuls faits du site : relisez avant de publier.</td></tr>`);
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f4f1ea"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:20px 0"><tr><td align="center">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#f4f1ea">${lignes.join("")}</table></td></tr></table></body></html>`;
  const texte = [b?.accroche || p.titre, `${etoiles(imp)} ${p.raison ?? ""}`, "", p.faits, "", b ? `INSTAGRAM\n${(b.instagram?.slides ?? []).map((x, i) => `${i + 1}. ${x}`).join("\n")}\n\nLINKEDIN\n${b.linkedin?.texte ?? ""}` : "", "", p.url ?? "", p.lien_site ?? ""].join("\n");
  return { sujet: `${imp >= 5 ? "🔥" : "💡"} Idée de post · ${court(b?.accroche || p.titre, 110)}`, html, texte };
}

async function envoyer(sujet: string, html: string, texte: string): Promise<void> {
  const cle = Deno.env.get("RESEND_API_KEY");
  const a = Deno.env.get("VEILLE_POSTS_TO");
  if (!cle || !a) throw new Error("RESEND_API_KEY ou VEILLE_POSTS_TO absente");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "La Politique C'est Simple — Veille <veille@lapolitiquecestsimple.fr>", to: a.split(",").map(x => x.trim()), subject: sujet, html, text: texte }),
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`Resend HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
}

/* ─────────────────────────────── Le passage ─────────────────────────────── */

async function passage(db: SupabaseClient, essai: boolean) {
  const journal: string[] = [];
  const etats = await lireEtats(db);
  const cand = await candidatsParId(db);

  // 1. Relever.
  const veilleurs: [string, () => Promise<Releve>][] = [
    ["lois", () => veilleLois(db, etats.get("lois"))],
    ["textes", () => veilleTextes(db, etats.get("textes"))],
    ["fil", () => veilleFil(db, etats.get("fil"))],
    ["candidats", () => veilleCandidats(db, etats.get("candidats"), cand)],
    ["suivis", () => veilleSuivis(db, etats.get("suivis"))],
    ["sondages", () => veilleSondages(db, etats.get("sondages"))],
    ["controverses", () => veilleControverses(db, etats.get("controverses"))],
    ["debats", () => veilleDebats(db, etats.get("debats"), cand)],
    ["petitions", () => veillePetitions(db, etats.get("petitions"))],
    ["candidatures", () => veilleCandidatures(db, etats.get("candidatures"))],
    ["programmes", () => veilleProgrammes(db, etats.get("programmes"), cand)],
    ["primaires", () => veillePrimaires(db, etats.get("primaires"))],
    ["indicateurs", () => veilleIndicateurs(db, etats.get("indicateurs"))],
  ];
  const nouveaux: Signal[] = [];
  const nouveauxEtats: { source: string; curseur: string | null; instantane: any; maj_le: string }[] = [];
  for (const [nom, veiller] of veilleurs) {
    try {
      const { signaux, etat } = await veiller();
      nouveaux.push(...signaux);
      nouveauxEtats.push({ source: nom, curseur: etat.curseur, instantane: etat.instantane, maj_le: new Date().toISOString() });
      if (signaux.length) journal.push(`${nom} : ${signaux.length}`);
    } catch (e) {
      journal.push(`${nom} : ÉCHEC ${(e as Error).message}`);
    }
  }

  // 2. Écarter le déjà-vu : même clé, ou même événement qu'une info des trois derniers jours.
  const { data: recents } = await db.from("veille_posts").select("cle, titre, statut")
    .gte("detecte_le", new Date(Date.now() - 72 * HEURE).toISOString());
  const vus = new Set((recents ?? []).map(r => r.cle));
  const titres = (recents ?? []).filter(r => r.statut !== "ignore").map(r => r.titre);
  const retenus: Signal[] = [];
  for (const s of nouveaux.sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))) {
    if (vus.has(s.cle)) continue;
    vus.add(s.cle);
    if ([...titres, ...retenus.map(r => r.titre)].some(t => quasiDoublon(t, s.titre))) continue;
    retenus.push(s);
  }

  if (essai) return { journal, retenus };

  if (retenus.length) {
    const { error } = await db.from("veille_posts").upsert(retenus.map(s => ({
      cle: s.cle, source: s.source, titre: court(s.titre, 300), url: s.url ?? null, lien_site: s.lien_site ?? null,
      date_objet: s.date_objet ?? null, faits: court(s.faits, 6000),
      importance: s.importance ?? null, raison: s.raison ?? null, methode: s.methode ?? null,
      statut: s.importance != null ? (s.importance >= SEUIL ? "a_envoyer" : "ignore") : "a_noter",
    })), { onConflict: "cle", ignoreDuplicates: true });
    if (error) throw error;
  }
  // L'état n'avance qu'une fois les signaux enregistrés : rien ne se perd sur une panne.
  await db.from("veille_posts_etat").upsert(nouveauxEtats, { onConflict: "source" });

  // 3. Noter ce qui attend une note (y compris les restes d'un passage où l'IA était saturée).
  const { data: aNoter } = await db.from("veille_posts").select("cle, source, titre, faits, detecte_le")
    .eq("statut", "a_noter").gte("detecte_le", new Date(Date.now() - 12 * HEURE).toISOString()).limit(80);
  for (let i = 0; i < (aNoter ?? []).length; i += 40) {
    const lot = aNoter!.slice(i, i + 40).map((r, k) => ({ i: k + 1, s: r as Signal, cle: r.cle }));
    try {
      const notes = await noter(lot);
      for (const { i: n, cle } of lot) {
        const note = notes.get(n);
        if (!note) continue;
        await db.from("veille_posts").update({ importance: note.note, raison: note.raison, methode: "ia", statut: note.note >= SEUIL ? "a_envoyer" : "ignore" }).eq("cle", cle);
      }
      journal.push(`notés : ${lot.length}`);
    } catch (e) {
      journal.push(`note IA indisponible : ${(e as Error).message}`);
      break;
    }
  }
  await db.from("veille_posts").update({ statut: "non_note" }).eq("statut", "a_noter").lt("detecte_le", new Date(Date.now() - 12 * HEURE).toISOString());

  // 4. Rédiger et envoyer, les plus importantes d'abord, dans la limite du jour.
  await db.from("veille_posts").update({ statut: "perime" }).eq("statut", "a_envoyer").lt("detecte_le", new Date(Date.now() - 36 * HEURE).toISOString());
  const { count: envoyes } = await db.from("veille_posts").select("cle", { count: "exact", head: true })
    .gte("envoye_le", new Date(Date.now() - 24 * HEURE).toISOString());
  const place = Math.max(0, Math.min(MAX_PASSAGE, MAX_JOUR - (envoyes ?? 0)));
  const { data: aEnvoyer } = place ? await db.from("veille_posts").select("*").eq("statut", "a_envoyer")
    .order("importance", { ascending: false }).order("detecte_le", { ascending: false }).limit(place) : { data: [] as any[] };
  for (const p of aEnvoyer ?? []) {
    let brief: Brief | null = p.brief;
    if (!brief) {
      try { brief = await rediger(p as Signal); } catch (e) {
        // Le gratuit est saturé : on réessaie aux passages suivants, puis on envoie les faits seuls
        // plutôt que de laisser passer l'info.
        const age = Date.now() - Date.parse(p.detecte_le);
        if (p.tentatives < 3 && age < 4 * HEURE) {
          await db.from("veille_posts").update({ tentatives: p.tentatives + 1, erreur: court((e as Error).message, 300) }).eq("cle", p.cle);
          continue;
        }
      }
    }
    const chiffres = brief ? chiffresAVerifier(brief, `${p.faits} ${p.titre}`) : [];
    const { sujet, html, texte } = rendu({ ...p, brief, chiffres_a_verifier: chiffres });
    try {
      await envoyer(sujet, html, texte);
      await db.from("veille_posts").update({ brief, chiffres_a_verifier: chiffres, statut: "envoye", envoye_le: new Date().toISOString(), erreur: null }).eq("cle", p.cle);
      journal.push(`envoyé : ${court(p.titre, 60)}`);
    } catch (e) {
      await db.from("veille_posts").update({ brief, statut: p.tentatives >= 3 ? "echec" : "a_envoyer", tentatives: p.tentatives + 1, erreur: court((e as Error).message, 300) }).eq("cle", p.cle);
      journal.push(`envoi raté : ${(e as Error).message}`);
    }
  }
  return { journal };
}

Deno.serve(async (req) => {
  const jeton = Deno.env.get("VEILLE_POSTS_TOKEN");
  if (!jeton || req.headers.get("x-veille-token") !== jeton) return new Response("interdit", { status: 403 });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const essai = new URL(req.url).searchParams.get("essai") === "1";
  if (essai) return Response.json(await passage(db, true));

  // pg_net n'attend pas : on répond tout de suite et le passage continue en arrière-plan.
  // Le verrou évite deux passages simultanés si l'un déborde sur le quart d'heure suivant.
  const { data: verrou } = await db.from("veille_posts_etat").select("curseur").eq("source", "verrou").maybeSingle();
  if (verrou?.curseur && Date.parse(verrou.curseur) > Date.now()) return Response.json({ deja: "passage en cours" });
  await db.from("veille_posts_etat").upsert({ source: "verrou", curseur: new Date(Date.now() + 10 * 60_000).toISOString(), maj_le: new Date().toISOString() });
  EdgeRuntime.waitUntil((async () => {
    try {
      const { journal } = await passage(db, false);
      console.log(`[veille-posts] ${journal.join(" | ") || "rien de neuf"}`);
    } catch (e) {
      console.error("[veille-posts]", e);
    } finally {
      await db.from("veille_posts_etat").upsert({ source: "verrou", curseur: null, maj_le: new Date().toISOString() });
    }
  })());
  return Response.json({ ok: true }, { status: 202 });
});
