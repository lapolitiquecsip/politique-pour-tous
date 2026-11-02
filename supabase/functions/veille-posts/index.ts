import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { quasiDoublon } from "../../../src/lib/quasi-doublon.ts";

/**
 * Veille « idées de post » — l'agent qui lit le site comme un rédacteur en chef.
 *
 * Toutes les quinze minutes (pg_cron → cette fonction), il relève ce qui vient
 * d'arriver dans la base : lois promulguées, textes notés importants, actualité
 * des candidats et des partis, sondages, programmes, pétitions qui franchissent
 * un seuil, primaires, controverses d'élus, indicateurs publics, fil d'accueil.
 * Il garde ce qui mérite un post et en prépare la matière : les faits sourcés,
 * pourquoi ça compte, des angles, un carrousel Instagram, un texte LinkedIn, des
 * hashtags, une idée de visuel et les points de vigilance.
 *
 * Rien n'est envoyé dans la journée (demande de l'équipe : pas d'alertes en
 * continu). Le soir, un seul e-mail : les meilleures idées en détail, puis TOUT ce
 * qui est apparu sur le site depuis le dernier récap (02/11/2026). Les votes d'hier,
 * relevés cette nuit, sont du nouveau contenu : seules les sources dont la collecte
 * remonte de vieux articles (candidats, fil, partis, débats) restent filtrées sur
 * la date de l'événement.
 *
 * La note vient d'une règle quand l'événement parle de lui-même (une loi
 * promulguée, une pétition à 500 000 signatures), sinon de l'IA, par lots, sur
 * une grille fixe. Le brouillon n'a droit qu'aux faits que le site détient ; tout
 * chiffre du brouillon absent de ces faits est signalé dans le récapitulatif.
 *
 * Paramètres (secrets de la fonction) :
 *   VEILLE_POSTS_TO      destinataire des e-mails (jamais écrit dans le dépôt, public)
 *   VEILLE_POSTS_TOKEN   jeton exigé dans l'en-tête x-veille-token (pg_cron le lit dans le coffre)
 *   RESEND_API_KEY, LLM_FREE_API_KEY  déjà posés pour contact et topic-brief
 *   VEILLE_SEUIL (4), VEILLE_MAX_PASSAGE (3 brouillons par passage), VEILLE_HEURE_RECAP (21, heure de Paris)
 *
 * Appels manuels : POST avec l'en-tête x-veille-token ; ?essai=1 renvoie ce qui
 * serait retenu sans rien écrire ; ?recap=1 envoie le récapitulatif du jour
 * (?recap=1&force=1 : même hors de l'heure prévue ou s'il est déjà parti).
 *
 * Déploiement : supabase functions deploy veille-posts --no-verify-jwt
 */

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const SITE = "https://lapolitiquecestsimple.fr";
const SEUIL = Number(Deno.env.get("VEILLE_SEUIL") ?? 4);
const MAX_PASSAGE = Number(Deno.env.get("VEILLE_MAX_PASSAGE") ?? 3);
const HEURE_RECAP = Number(Deno.env.get("VEILLE_HEURE_RECAP") ?? 21);
const HEURE = 3600_000;

/** Le jour (AAAA-MM-JJ) d'une date, à l'heure de Paris. */
const jourParis = (d: string | number | Date = Date.now()) =>
  new Date(d).toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
const heureParis = () => Number(new Date().toLocaleString("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hour12: false }));

type Signal = {
  cle: string;
  source: string;
  titre: string;
  url?: string | null;
  lien_site?: string | null;
  date_objet?: string | null;
  /** Quand l'info est sortie (publication, vote, journal officiel…). Sans elle : le moment où on la repère. */
  jour?: string | null;
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
    ? await db.from("entity_feed").select("title, url, published_at").in("title", titres)
    : { data: [] as { title: string; url: string; published_at: string }[] };
  const article = new Map((liens ?? []).map((l: any) => [l.title, l]));
  return {
    signaux: (data ?? []).map(t => ({
      cle: `suivi:${t.cle}`, source: `Parti · ${t.entite}`, titre: t.titre, url: article.get(t.titre)?.url ?? null,
      // cree_le est le moment du tri : la date de l'article dit quand l'info est sortie.
      lien_site: `${SITE}/partis`, date_objet: article.get(t.titre)?.published_at ?? t.cree_le,
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
      // La fin du terrain précède la publication de deux ou trois jours : c'est la parution qui compte.
      url: s.source_url, lien_site: `${SITE}/presidentielles-2027`, date_objet: s.date_fin, jour: s.cree_le,
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
      // date_faits peut remonter à des années : l'info du jour, c'est l'article qui en parle.
      url: ((c.sources ?? []) as any[])[0]?.url ?? null, lien_site: SITE, date_objet: c.date_faits, jour: c.creee_le,
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

/* ── Les votes, source par source ──
 * Le fond d'un post « vote » : ce qui était proposé, le résultat, et qui a voté quoi. */

const lignesGroupes = (groupes: any[] | null) => [...(groupes ?? [])]
  .sort((a, b) => ((b.pour ?? 0) + (b.contre ?? 0)) - ((a.pour ?? 0) + (a.contre ?? 0)))
  .map(g => `${g.group_label ?? g.group_id} : ${g.pour ?? 0} pour, ${g.contre ?? 0} contre, ${g.abstention ?? 0} abstention`).join("\n");

/** Une note de règle : on ne dépense pas d'IA sur 40 scrutins par jour de budget. */
function noteVote(pour: number, contre: number, adopte: boolean, amendement: boolean, objet: string): { importance: number; raison: string } {
  if (/ensemble d[ue]|l'ensemble/i.test(objet)) return { importance: 5, raison: "Vote sur l'ensemble d'un texte" };
  const exprimes = pour + contre;
  if (exprimes && Math.abs(pour - contre) / exprimes <= 0.1) return { importance: 4, raison: "Vote très serré" };
  if (amendement && adopte) return { importance: 4, raison: "Amendement adopté en scrutin public" };
  return { importance: 3, raison: amendement ? "Amendement rejeté" : "Scrutin public" };
}

function signalVote(v: { cle: string; chambre: string; objet: string; adopte: boolean; resultat: string; pour: number; contre: number; abstention: number; date: string; groupes: any[] | null; url: string | null }, a: any | undefined): Signal {
  const texte = a?.texte_titre ? court(a.texte_titre, 90) : null;
  return {
    cle: v.cle, source: `${a ? "Amendement voté" : "Vote"} · ${v.chambre}`,
    titre: a ? `Amendement ${a.numero}${texte ? ` (${texte})` : ""} : ${a.sort ?? v.resultat}, ${v.pour} pour, ${v.contre} contre` : `${court(v.objet, 150)} : ${v.pour} pour, ${v.contre} contre`,
    url: a?.url ?? v.url, lien_site: `${SITE}/lois`, date_objet: v.date,
    faits: [`Vote du ${v.date.slice(0, 10)}, ${v.chambre} : ${court(v.objet, 300)}.`, `Résultat : ${v.resultat}. ${v.pour} pour, ${v.abstention} abstention, ${v.contre} contre.`,
      lignesGroupes(v.groupes) ? `Par groupe :\n${lignesGroupes(v.groupes)}` : "",
      a ? `Déposé par ${a.auteur ?? "?"}${a.groupe ? ` (${a.groupe})` : ""}.` : "",
      a?.expose ? `Ce que défend l'auteur : ${court(String(a.expose).replace(/<[^>]+>/g, " "), 700)}` : "",
      a?.dispositif ? `Texte de l'amendement : ${court(String(a.dispositif).replace(/<[^>]+>/g, " "), 500)}` : ""].filter(Boolean).join("\n"),
    ...noteVote(v.pour, v.contre, v.adopte, !!a, v.objet), methode: "regle",
  };
}

async function veilleVotesAN(db: SupabaseClient, e?: Etat): Promise<Releve> {
  const de = depuis(e);
  const { data } = await db.from("scrutins").select("id, numero, date_scrutin, objet, resultat, pour, contre, abstention, group_results, created_at, institution")
    .gt("created_at", de).eq("institution", "AN").order("created_at").limit(150);
  const ids = (data ?? []).map(v => v.id);
  const { data: amdts } = ids.length ? await db.from("amendements_an").select("scrutin_id, numero, texte_titre, sort, auteur, groupe, expose, dispositif, url").in("scrutin_id", ids) : { data: [] as any[] };
  const parScrutin = new Map((amdts ?? []).map(a => [a.scrutin_id, a]));
  const signaux = (data ?? []).map(v => signalVote({
    cle: `vote:AN:${v.id}`, chambre: "Assemblée nationale", objet: v.objet ?? "", adopte: !/n'a pas adopt/i.test(v.resultat ?? ""), resultat: v.resultat ?? "?",
    pour: v.pour ?? 0, contre: v.contre ?? 0, abstention: v.abstention ?? 0, date: v.date_scrutin, groupes: v.group_results,
    url: `https://www.assemblee-nationale.fr/dyn/17/scrutins/${v.numero}`,
  }, parScrutin.get(v.id)));

  // « Focus parti » : ce qu'a voté chaque groupe sur l'ensemble des scrutins d'une journée.
  const parJour = new Map<string, any[]>();
  for (const v of data ?? []) parJour.set(String(v.date_scrutin).slice(0, 10), [...(parJour.get(String(v.date_scrutin).slice(0, 10)) ?? []), v]);
  for (const [jour, votes] of parJour) {
    if (votes.length < 5) continue;
    const bilan = new Map<string, { pour: number; contre: number; abstention: number }>();
    for (const v of votes) for (const g of (v.group_results ?? []) as any[]) {
      const b = bilan.get(g.group_label) ?? { pour: 0, contre: 0, abstention: 0 };
      const max = Math.max(g.pour ?? 0, g.contre ?? 0, g.abstention ?? 0);
      if (!max) continue;
      if ((g.pour ?? 0) === max) b.pour++; else if ((g.contre ?? 0) === max) b.contre++; else b.abstention++;
      bilan.set(g.group_label, b);
    }
    signaux.push({
      cle: `groupes:AN:${jour}`, source: "Votes des partis · Assemblée nationale", titre: `Comment chaque groupe a voté sur les ${votes.length} scrutins du ${jour}`,
      url: null, lien_site: `${SITE}/deputes`, date_objet: jour,
      faits: [`${votes.length} scrutins publics à l'Assemblée nationale le ${jour}. Position majoritaire de chaque groupe :`, ...[...bilan].map(([g, b]) => `${g} : pour sur ${b.pour} scrutins, contre sur ${b.contre}, abstention sur ${b.abstention}`)].join("\n"),
      importance: 4, raison: "Bilan de vote par parti", methode: "regle",
    });
  }
  return { signaux, etat: { curseur: plusRecent((data ?? []).map(v => v.created_at), de), instantane: null } };
}

async function veilleVotesSenat(db: SupabaseClient, e?: Etat): Promise<Releve> {
  // Ni date d'ajout ni date fiable : on compare aux scrutins déjà vus, sur les 45 derniers jours.
  const { data } = await db.from("legislative_scrutins").select("id, official_id, title, result_label, for_count, against_count, abstain_count, voted_at, group_results, source_url")
    .eq("chamber", "SENAT").gte("voted_at", new Date(Date.now() - 45 * 24 * HEURE).toISOString()).limit(800);
  const connus = e?.instantane ? new Set<string>(e.instantane as string[]) : null;
  const nouveaux = connus ? (data ?? []).filter(v => !connus.has(v.id)).slice(0, 80) : [];
  const ids = nouveaux.map(v => v.id);
  const { data: amdts } = ids.length ? await db.from("amendements_senat").select("scrutin_id, numero, texte_titre, sort, auteur, groupe, expose, dispositif, url").in("scrutin_id", ids) : { data: [] as any[] };
  const parScrutin = new Map((amdts ?? []).map(a => [a.scrutin_id, a]));
  return {
    signaux: nouveaux.map(v => signalVote({
      cle: `vote:SENAT:${v.id}`, chambre: "Sénat", objet: v.title ?? "", adopte: !/n'a pas adopt/i.test(v.result_label ?? ""), resultat: v.result_label ?? "?",
      pour: v.for_count ?? 0, contre: v.against_count ?? 0, abstention: v.abstain_count ?? 0, date: v.voted_at, groupes: v.group_results, url: v.source_url,
    }, parScrutin.get(v.id))),
    etat: { curseur: null, instantane: (data ?? []).map(v => v.id) },
  };
}

async function veilleAnnonces(db: SupabaseClient, e?: Etat): Promise<Releve> {
  const de = depuis(e);
  const { data } = await db.from("executif_annonces").select("id, titre, chapo, ministere, porteur, date_annonce, montants, analyse_detail, sources, verifie, cree_le")
    .gt("cree_le", de).eq("publie", true).order("cree_le").limit(30);
  return {
    signaux: (data ?? []).map(a => ({
      cle: `annonce:${a.id}`, source: `Annonce du gouvernement${a.ministere ? ` · ${court(a.ministere, 50)}` : ""}`, titre: a.titre,
      url: ((a.sources ?? []) as any[])[0]?.url ?? null, lien_site: `${SITE}/executif`, date_objet: a.date_annonce,
      faits: [a.titre, court(a.chapo, 700), a.porteur ? `Porté par : ${a.porteur}.` : "", a.montants ? `Montants : ${court(JSON.stringify(a.montants), 300)}` : "", court(a.analyse_detail, 1500),
        a.verifie ? "" : "Attention : cette analyse n'a pas été relue par le second agent, à vérifier à la source."].filter(Boolean).join("\n"),
    })),
    etat: { curseur: plusRecent((data ?? []).map(a => a.cree_le), de), instantane: null },
  };
}

async function veilleDecretsApplication(db: SupabaseClient, e?: Etat): Promise<Releve> {
  const de = depuis(e);
  const { data } = await db.from("application_mesures").select("loi_jorf_id, objet, articles, decret_id, applique_vu_le").gt("applique_vu_le", de).order("applique_vu_le").limit(60);
  const parLoi = new Map<string, any[]>();
  for (const m of data ?? []) parLoi.set(m.loi_jorf_id, [...(parLoi.get(m.loi_jorf_id) ?? []), m]);
  const ids = [...parLoi.keys()];
  const { data: lois } = ids.length ? await db.from("application_lois").select("jorf_id, titre, nb_mesures, nb_appliquees").in("jorf_id", ids) : { data: [] as any[] };
  const titres = new Map((lois ?? []).map(l => [l.jorf_id, l]));
  return {
    signaux: [...parLoi].map(([id, ms]) => {
      const l = titres.get(id);
      return {
        cle: `decret:${id}:${ms.at(-1).applique_vu_le}`, source: "Décret d'application", titre: `${ms.length > 1 ? `${ms.length} textes d'application parus` : "Texte d'application paru"} : ${court(l?.titre ?? id, 130)}`,
        url: ms[0].decret_id ? `https://www.legifrance.gouv.fr/jorf/id/${ms[0].decret_id}` : null, lien_site: `${SITE}/lois`,
        faits: [`Loi : ${l?.titre ?? id}.`, l ? `${l.nb_appliquees} mesures prises sur ${l.nb_mesures}.` : "", ...ms.slice(0, 6).map(m => `- ${m.articles ? `${m.articles} : ` : ""}${court(m.objet, 220)}`)].filter(Boolean).join("\n"),
        importance: 4, raison: "Une loi devient applicable", methode: "regle",
      };
    }),
    etat: { curseur: plusRecent((data ?? []).map(m => m.applique_vu_le), de), instantane: null },
  };
}

async function veilleElus(db: SupabaseClient, e?: Etat): Promise<Releve> {
  const de = depuis(e);
  const { data } = await db.from("elus_changements").select("id, elu_kind, elu_slug, nom, nature, categorie, avant, apres, source_url, detecte_le")
    .gt("detecte_le", de).neq("nature", "bio_corrigee").order("detecte_le").limit(60);
  const PAGES: Record<string, string> = { depute: "deputes", senateur: "senateurs", eurodepute: "eurodeputes", maire: "maires" };
  return {
    signaux: (data ?? []).map(c => {
      const majeur = c.categorie === "bureau" || c.categorie === "groupe" || c.categorie === "mandat";
      const quoi = c.nature === "retrait" ? `n'est plus ${c.avant}` : c.nature === "modification" ? `${c.avant} → ${c.apres}` : c.apres;
      return {
        cle: `elu:${c.id}`, source: `Élu · ${c.elu_kind}`, titre: `${c.nom} : ${quoi}`, url: c.source_url, lien_site: `${SITE}/${PAGES[c.elu_kind] ?? "deputes"}/${c.elu_slug}`,
        faits: `${c.nom} : ${quoi}. Relevé dans les données officielles le ${String(c.detecte_le).slice(0, 10)}.`,
        importance: majeur ? 4 : 3, raison: "Changement dans les données officielles", methode: "regle",
      };
    }),
    etat: { curseur: plusRecent((data ?? []).map(c => c.detecte_le), de), instantane: null },
  };
}

async function veilleCommissions(db: SupabaseClient, e?: Etat): Promise<Releve> {
  const de = depuis(e);
  const { data } = await db.from("commission_reports").select("ref, commission, title, meeting_date, cr_url, summary, chamber, analyzed_at")
    .gt("analyzed_at", de).order("analyzed_at").limit(30);
  return {
    signaux: (data ?? []).map(c => ({
      cle: `commission:${c.ref}`, source: `Commission · ${c.chamber ?? ""}`.trim(), titre: `${court(c.commission, 70)} : ${court(c.title, 130)}`,
      url: c.cr_url, lien_site: SITE, date_objet: c.meeting_date, faits: [c.title, `${c.commission}, réunion du ${c.meeting_date}.`, court(c.summary, 1800)].filter(Boolean).join("\n"),
    })),
    etat: { curseur: plusRecent((data ?? []).map(c => c.analyzed_at), de), instantane: null },
  };
}

async function veilleEurope(db: SupabaseClient, e?: Etat): Promise<Releve> {
  const { data } = await db.from("eu_france_decisions").select("id, title, summary, url, published_at, institution").order("published_at", { ascending: false }).limit(300);
  const connus = e?.instantane ? new Set<string>((e.instantane as any[]).map(String)) : null;
  return {
    signaux: (connus ? (data ?? []).filter(d => !connus.has(String(d.id))) : []).slice(0, 20).map(d => ({
      cle: `europe:${d.id}`, source: `Décision européenne${d.institution ? ` · ${court(d.institution, 40)}` : ""}`, titre: d.title, url: d.url, lien_site: `${SITE}/europe`, date_objet: d.published_at,
      faits: [d.title, court(d.summary, 1500)].filter(Boolean).join("\n"),
    })),
    etat: { curseur: null, instantane: (data ?? []).map(d => d.id) },
  };
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

/* ─────────────────────── Les prompts pour ChatGPT ───────────────────────
 * Demande de l'user (28/10/2026) : pour chaque idée, un prompt prêt à coller dans ChatGPT,
 * qui contient tout le contenu nécessaire au post et rien de technique. Deux niveaux :
 * Instagram court (l'essentiel pour un carrousel), LinkedIn détaillé (contexte, angles,
 * vigilance). La matière vient des FAITS du site (vérifiés) ; le brouillon IA n'apporte que
 * l'accroche, l'enjeu et les angles — ses chiffres non attestés ne passent pas dans le prompt.
 */
const extrait = (s: unknown, n: number) => {
  const t = String(s ?? "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return t.length <= n ? t : `${t.slice(0, t.lastIndexOf(" ", n))}…`;
};
const dateEnClair = (d?: string | null) => {
  if (!d) return null;
  const x = new Date(d);
  return isNaN(x.getTime()) ? null : `${x.getUTCDate()} ${MOIS[x.getUTCMonth()]} ${x.getUTCFullYear()}`;
};

function promptInstagram(p: any): string {
  const b: Brief | null = p.brief;
  return [
    `Rédige un carrousel Instagram pour « La Politique C'est Simple », un média qui explique la politique française simplement, sans prendre parti.`,
    ``,
    `Sujet : ${b?.accroche || p.titre}`,
    b?.pourquoi ? `Pourquoi ça intéresse nos abonnés : ${b.pourquoi}` : null,
    dateEnClair(p.date_objet) ? `Date : ${dateEnClair(p.date_objet)}` : null,
    ``,
    `Les informations à utiliser (n'ajoute aucun chiffre, nom ou date qui n'y figure pas) :`,
    extrait(p.faits, 900),
    ``,
    `Ce que j'attends :`,
    /^vote:/.test(p.cle) ? `- Format « vote » : la slide 1 dit en une phrase simple ce qui était en jeu (jamais le numéro d'amendement), avec la date et le résultat Pour / Abstention / Contre. Les suivantes : ce que proposait le texte, qui a voté quoi groupe par groupe, ce que ça change et ce qui se passe maintenant.` : null,
    /^groupes:/.test(p.cle) ? `- Format « focus parti » : un groupe par slide, ce qu'il a soutenu et rejeté, sans commentaire sur ses choix.` : null,
    `- 6 slides. Slide 1 : une accroche de 10 mots maximum qui donne envie de faire défiler. Slides 2 à 5 : une idée par slide, 25 mots maximum, avec le chiffre ou le fait le plus parlant. Slide 6 : « Tout comprendre : lien en bio » et une invitation à s'abonner.`,
    `- Une légende de 400 caractères maximum, puis 6 à 8 hashtags.`,
    `- Ton : clair, neutre, compréhensible par un lycéen. Pas d'opinion, pas de caricature.`,
    b?.visuel ? `- Idée de visuel : ${b.visuel}` : null,
  ].filter(l => l !== null).join("\n");
}

function promptLinkedIn(p: any): string {
  const b: Brief | null = p.brief;
  const vigilance = (b?.prudence ?? []).filter(Boolean);
  return [
    `Rédige un post LinkedIn pour « La Politique C'est Simple » (lapolitiquecestsimple.fr), un média qui explique la politique française de façon factuelle et non partisane, pour un public de professionnels, d'élus, de journalistes et de citoyens engagés.`,
    ``,
    `Sujet : ${b?.accroche || p.titre}`,
    dateEnClair(p.date_objet) ? `Date : ${dateEnClair(p.date_objet)}` : null,
    b?.pourquoi ? `Pourquoi c'est important : ${b.pourquoi}` : null,
    ``,
    `Les faits (n'utilise que ceux-ci : aucun chiffre, nom, date ou citation en plus) :`,
    extrait(p.faits, 2200),
    b?.angles?.length ? `\nAngles possibles (choisis le plus fort, ou combine-les) :\n${b.angles.map(a => `- ${a}`).join("\n")}` : null,
    vigilance.length ? `\nPoints de vigilance :\n${vigilance.map(v => `- ${v}`).join("\n")}` : null,
    ``,
    `Ce que j'attends :`,
    `- 900 à 1 300 caractères. Une première ligne forte qui donne envie de cliquer sur « voir plus ».`,
    `- Des paragraphes courts, aérés, avec les chiffres précis et ce que ça change concrètement.`,
    `- Une conclusion qui ouvre la discussion par une question posée aux lecteurs.`,
    p.lien_site ? `- En fin de post, renvoie vers ${p.lien_site} pour le détail.` : `- En fin de post, renvoie vers lapolitiquecestsimple.fr.`,
    `- 3 à 5 hashtags.`,
    `- Ton : expert, factuel, neutre. Aucune prise de position partisane.`,
  ].filter(l => l !== null).join("\n");
}

/* ─────────────────────────────── L'e-mail ─────────────────────────────── */

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
const etoiles = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);
const POLICE = "-apple-system,Segoe UI,Roboto,Arial,sans-serif";
const hashtags = (l?: string[]) => (l ?? []).map(h => h.startsWith("#") ? h : `#${h}`).join(" ");

function bloc(titre: string, contenu: string, fond = "#ffffff") {
  return `<div style="background:${fond};border:1px solid #e7e2d6;border-radius:12px;padding:14px 16px;margin-top:10px">
<div style="font:800 10px/1 ${POLICE};letter-spacing:.14em;text-transform:uppercase;color:#64748b;margin-bottom:8px">${titre}</div>${contenu}</div>`;
}
const para = (t: string) => `<p style="margin:0 0 6px;font:15px/1.55 ${POLICE};color:#0f172a">${esc(t).replace(/\n/g, "<br>")}</p>`;
// Un prompt : texte brut dans une zone bordée, retours à la ligne gardés, facile à sélectionner.
const prompt = (t: string) => `<div style="margin:0;padding:12px 14px;background:#ffffff;border:1px dashed #94a3b8;border-radius:10px;white-space:pre-wrap;word-break:break-word;font:14px/1.5 ${POLICE};color:#0f172a">${esc(t)}</div>
<p style="margin:6px 0 0;font:12px/1.4 ${POLICE};color:#64748b">Appui long → Tout sélectionner → Copier, puis coller dans ChatGPT.</p>`;
const liste = (l: string[], ordonnee = false) => {
  const balise = ordonnee ? "ol" : "ul";
  return `<${balise} style="margin:0;padding-left:20px;font:15px/1.55 ${POLICE};color:#0f172a">${l.map(x => `<li style="margin-bottom:4px">${esc(x)}</li>`).join("")}</${balise}>`;
};

/** Une idée de post, complète : de quoi écrire le post sans rouvrir le site. */
function fiche(p: any, n: number): string {
  const b: Brief | null = p.brief;
  const imp = p.importance ?? SEUIL;
  const liens = [p.url ? `<a href="${esc(p.url)}" style="color:#1d4ed8">Source</a>` : "", p.lien_site ? `<a href="${esc(p.lien_site)}" style="color:#1d4ed8">Page du site à partager</a>` : ""].filter(Boolean).join(" &nbsp;·&nbsp; ");
  const parties = [
    `<div id="idee-${n}" style="font:800 11px/1 ${POLICE};letter-spacing:.14em;text-transform:uppercase;color:#b45309">Idée n° ${n} · ${esc(p.source)}</div>
<div style="margin-top:8px;font:800 21px/1.25 ${POLICE};color:#0f172a">${esc(b?.accroche || p.titre)}</div>
<div style="margin-top:6px;font:14px/1.4 ${POLICE};color:#475569"><span style="color:#d97706">${etoiles(imp)}</span> &nbsp;${esc(p.raison ?? "")}</div>`,
  ];
  if (p.chiffres_a_verifier?.length) {
    parties.push(bloc("⚠ Chiffres à vérifier avant de publier", para(`Le brouillon cite ${p.chiffres_a_verifier.join(", ")}, absent(s) des faits du site : vérifiez à la source ou retirez.`), "#fff7ed"));
  }
  parties.push(bloc("L'info", para(p.titre) + (b?.faits_cles?.length ? liste(b.faits_cles) : para(court(p.faits, 1200)))
    + (liens ? `<p style="margin:8px 0 0;font:14px ${POLICE}">${liens}</p>` : "")));
  if (b?.pourquoi) parties.push(bloc("Pourquoi ça mérite un post", para(b.pourquoi)));
  // Les deux prompts, prêts à copier-coller dans ChatGPT (angles, visuel et vigilance y sont repris).
  parties.push(bloc("Prompt ChatGPT · Instagram (carrousel)", prompt(promptInstagram(p)), "#fdf4ff"));
  parties.push(bloc("Prompt ChatGPT · LinkedIn (post détaillé)", prompt(promptLinkedIn(p)), "#eff6ff"));
  return `<tr><td style="padding:0 20px 18px"><div style="background:#ffffff;border-radius:16px;padding:20px 20px 16px;border:1px solid #e7e2d6">${parties.join("")}</div></td></tr>`;
}

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const jourEnClair = (j: string) => { const d = new Date(`${j}T12:00:00Z`); return `${JOURS[d.getUTCDay()]} ${d.getUTCDate()} ${MOIS[d.getUTCMonth()]}`; };

/** Au-delà, Gmail coupe le message (« Message tronqué ») : les suivantes passent en liste. */
// Avec les deux prompts, une fiche pèse ~8 Ko : 11 fiches restent sous la coupure de Gmail.
const FICHES_MAX = 8;       // ~8 Ko par fiche, et l'inventaire doit tenir sous la coupure de Gmail
const INVENTAIRE_MAX = 150;
const PAR_FAMILLE_MAX = 2;   // des idées variées : pas huit fiches sur le même programme
const famille = (source: string) => source.split(/ · | \(/)[0];

/** Les idées détaillées : les plus fortes, deux au plus par famille tant qu'il reste de la variété. */
function choisirFiches(idees: any[]): any[] {
  const vus = new Map<string, number>();
  const choisies = idees.filter(p => {
    const f = famille(p.source), n = vus.get(f) ?? 0;
    if (n >= PAR_FAMILLE_MAX) return false;
    vus.set(f, n + 1);
    return true;
  }).slice(0, FICHES_MAX);
  const reste = idees.filter(p => !choisies.includes(p));
  return [...choisies, ...reste.slice(0, FICHES_MAX - choisies.length)];
}

/** Tout ce qui est apparu sur le site : une ligne par contenu, rangée par rubrique. */
function blocInventaire(lignes: any[]): string {
  const rubriques = new Map<string, any[]>();
  for (const p of lignes.slice(0, INVENTAIRE_MAX)) rubriques.set(famille(p.source), [...(rubriques.get(famille(p.source)) ?? []), p]);
  const html = [...rubriques].map(([f, l]) => `<div style="margin:12px 0 4px;font:800 13px/1.3 ${POLICE};color:#0f172a">${esc(f)} (${l.length})</div>
<ul style="margin:0;padding-left:18px;font:13.5px/1.45 ${POLICE};color:#334155">${l.map(p => `<li style="margin-bottom:3px">${p.lien_site || p.url ? `<a href="${esc(p.url || p.lien_site)}" style="color:#334155">${esc(court(p.titre, 150))}</a>` : esc(court(p.titre, 150))}</li>`).join("")}</ul>`).join("");
  const plus = lignes.length > INVENTAIRE_MAX ? `<p style="margin:10px 0 0;font:13px ${POLICE};color:#64748b">Et ${lignes.length - INVENTAIRE_MAX} autres contenus.</p>` : "";
  return `<tr><td style="padding:0 20px 18px">${bloc(`Tout le nouveau contenu du site (${lignes.length})`, html + plus, "#f8fafc")}</td></tr>`;
}

function recapitulatif(jour: string, toutesIdees: any[], autres: any[]): { sujet: string; html: string; texte: string } {
  const quand = jourEnClair(jour);
  const idees = choisirFiches(toutesIdees);
  const inventaire = [...toutesIdees.filter(p => !idees.includes(p)), ...autres];
  const lignes: string[] = [];
  lignes.push(`<tr><td style="background:#0b1020;padding:24px 22px;border-radius:18px 18px 0 0">
<div style="font:800 11px/1 ${POLICE};letter-spacing:.16em;text-transform:uppercase;color:#fbbf24">Récap du jour · idées de post</div>
<div style="margin-top:10px;font:800 24px/1.25 ${POLICE};color:#ffffff">${idees.length ? `${idees.length} idée${idees.length > 1 ? "s" : ""} de post pour ce ${esc(quand)}` : `Rien de marquant ce ${esc(quand)}`}</div>
<div style="margin-top:8px;font:14px/1.45 ${POLICE};color:#cbd5e1">Les meilleures idées en détail, puis tout ce qui est apparu sur le site depuis le dernier récap.</div></td></tr><tr><td style="height:16px"></td></tr>`);
  if (idees.length) {
    lignes.push(`<tr><td style="padding:0 20px 18px"><div style="background:#ffffff;border-radius:16px;padding:16px 18px;border:1px solid #e7e2d6">
<div style="font:800 10px/1 ${POLICE};letter-spacing:.14em;text-transform:uppercase;color:#64748b;margin-bottom:8px">Au sommaire</div>
<ol style="margin:0;padding-left:22px;font:15px/1.6 ${POLICE};color:#0f172a">${idees.map((p, i) => `<li><a href="#idee-${i + 1}" style="color:#0f172a;text-decoration:none"><span style="color:#d97706">${etoiles(p.importance ?? SEUIL)}</span> ${esc(p.brief?.accroche || p.titre)}</a> <span style="color:#94a3b8">· ${esc(p.source)}</span></li>`).join("")}</ol></div></td></tr>`);
    idees.forEach((p, i) => lignes.push(fiche(p, i + 1)));
  } else {
    lignes.push(`<tr><td style="padding:0 20px 18px">${bloc("Aujourd'hui", para("Aucune info du jour n'a été jugée assez forte pour un post (4/5 ou plus)."))}</td></tr>`);
  }
  if (inventaire.length) lignes.push(blocInventaire(inventaire));
  lignes.push(`<tr><td style="padding:4px 22px 28px;font:12px/1.5 ${POLICE};color:#94a3b8">Veille automatique de La Politique C'est Simple. Chaque prompt ne contient que les faits relevés sur le site : relisez le post de ChatGPT avant de publier.</td></tr>`);
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f4f1ea"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:20px 0"><tr><td align="center">
<table role="presentation" width="660" cellpadding="0" cellspacing="0" style="max-width:660px;width:100%">${lignes.join("")}</table></td></tr></table></body></html>`;
  const texte = [`Idées de post du ${quand}`, "", ...idees.map((p, i) => {
    const b: Brief | null = p.brief;
    return [`${i + 1}. ${b?.accroche || p.titre} (${p.source}, ${etoiles(p.importance ?? SEUIL)})`, p.url ?? "",
      `--- Prompt ChatGPT · Instagram ---\n${promptInstagram(p)}`, `--- Prompt ChatGPT · LinkedIn ---\n${promptLinkedIn(p)}`, ""].join("\n\n");
  })].join("\n");
  return {
    sujet: idees.length ? `📮 ${idees.length} idée${idees.length > 1 ? "s" : ""} de post · ${quand}` : `📮 Récap du ${quand} · rien de marquant`,
    html, texte,
  };
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
// Toutes les 15 minutes : relever, noter, préparer les brouillons. Rien n'est envoyé.

/** Rédige le brouillon d'une idée et le range ; false si le modèle n'a pas répondu. */
async function preparer(db: SupabaseClient, p: any): Promise<boolean> {
  try {
    const brief = await rediger(p as Signal);
    const chiffres = chiffresAVerifier(brief, `${p.faits} ${p.titre}`);
    await db.from("veille_posts").update({ brief, chiffres_a_verifier: chiffres, statut: "pret", erreur: null }).eq("cle", p.cle);
    p.brief = brief; p.chiffres_a_verifier = chiffres;
    return true;
  } catch (e) {
    await db.from("veille_posts").update({ tentatives: (p.tentatives ?? 0) + 1, erreur: court((e as Error).message, 300) }).eq("cle", p.cle);
    return false;
  }
}

async function passage(db: SupabaseClient, essai: boolean) {
  const journal: string[] = [];
  const etats = await lireEtats(db);
  const cand = await candidatsParId(db);
  const aujourdhui = jourParis();

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
    ["votes_an", () => veilleVotesAN(db, etats.get("votes_an"))],
    ["votes_senat", () => veilleVotesSenat(db, etats.get("votes_senat"))],
    ["annonces", () => veilleAnnonces(db, etats.get("annonces"))],
    ["decrets_application", () => veilleDecretsApplication(db, etats.get("decrets_application"))],
    ["elus", () => veilleElus(db, etats.get("elus"))],
    ["commissions", () => veilleCommissions(db, etats.get("commissions"))],
    ["europe", () => veilleEurope(db, etats.get("europe"))],
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
  const titres = (recents ?? []).filter(r => r.statut !== "ignore" && r.statut !== "hors_jour").map(r => r.titre);
  const retenus: Signal[] = [];
  for (const s of nouveaux.sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))) {
    if (vus.has(s.cle)) continue;
    vus.add(s.cle);
    // Deux votes sur un même texte ont des titres voisins sans être le même événement.
    if (!/^(vote|groupes|elu|decret):/.test(s.cle) && [...titres, ...retenus.map(r => r.titre)].some(t => quasiDoublon(t, s.titre))) continue;
    retenus.push(s);
  }
  // Le jour de l'info, et non celui de la collecte : seules les infos du jour font le récap.
  // Ces collectes ramènent de vieux articles : leur date compte. Le reste est nouveau le jour où il paraît sur le site.
  const jourDe = (s: Signal) => /^(candidat|fil|suivi|debat):/.test(s.cle) ? jourParis(s.jour ?? s.date_objet ?? Date.now()) : jourParis();

  if (essai) return { journal, retenus: retenus.map(s => ({ ...s, jour: jourDe(s), du_jour: jourDe(s) === aujourdhui })) };

  if (retenus.length) {
    const { error } = await db.from("veille_posts").upsert(retenus.map(s => {
      const jour = jourDe(s);
      return {
        cle: s.cle, source: s.source, titre: court(s.titre, 300), url: s.url ?? null, lien_site: s.lien_site ?? null,
        date_objet: s.date_objet ?? null, jour, faits: court(s.faits, 6000),
        importance: s.importance ?? null, raison: s.raison ?? null, methode: s.methode ?? null,
        // Une info d'un autre jour est gardée (elle sert au dédoublonnage) mais ni notée ni préparée.
        statut: jour !== aujourdhui ? "hors_jour" : s.importance != null ? (s.importance >= SEUIL ? "a_preparer" : "ignore") : "a_noter",
      };
    }), { onConflict: "cle", ignoreDuplicates: true });
    if (error) throw error;
  }
  // L'état n'avance qu'une fois les signaux enregistrés : rien ne se perd sur une panne.
  await db.from("veille_posts_etat").upsert(nouveauxEtats, { onConflict: "source" });

  // 3. Noter ce qui attend une note (y compris les restes d'un passage où l'IA était saturée).
  const { data: aNoter } = await db.from("veille_posts").select("cle, source, titre, faits")
    .eq("statut", "a_noter").eq("jour", aujourdhui).limit(80);
  for (let i = 0; i < (aNoter ?? []).length; i += 40) {
    const lot = aNoter!.slice(i, i + 40).map((r, k) => ({ i: k + 1, s: r as Signal, cle: r.cle }));
    try {
      const notes = await noter(lot);
      for (const { i: n, cle } of lot) {
        const note = notes.get(n);
        if (!note) continue;
        await db.from("veille_posts").update({ importance: note.note, raison: note.raison, methode: "ia", statut: note.note >= SEUIL ? "a_preparer" : "ignore" }).eq("cle", cle);
      }
      journal.push(`notés : ${lot.length}`);
    } catch (e) {
      journal.push(`note IA indisponible : ${(e as Error).message}`);
      break;
    }
  }
  await db.from("veille_posts").update({ statut: "non_note" }).eq("statut", "a_noter").lt("jour", aujourdhui);

  // 4. Préparer les brouillons dans la journée, quand le quota gratuit est disponible :
  //    le soir, il est souvent épuisé, et le récap n'aurait plus que les faits bruts.
  const { data: aPreparer } = await db.from("veille_posts").select("*").eq("statut", "a_preparer").eq("jour", aujourdhui)
    .lt("tentatives", 6).order("importance", { ascending: false }).order("detecte_le").limit(MAX_PASSAGE);
  for (const p of aPreparer ?? []) {
    journal.push(`${await preparer(db, p) ? "préparé" : "brouillon reporté"} : ${court(p.titre, 60)}`);
  }
  return { journal };
}

/* ─────────────────────────────── Le récap du soir ─────────────────────────────── */

/** Tout ce qui n'a pas encore été dans un récap, depuis la veille : ce qui arrive après 21 h n'est plus perdu. */
async function contenuDuRecap(db: SupabaseClient, jour: string): Promise<{ idees: any[]; autres: any[] }> {
  const hier = jourParis(new Date(`${jour}T12:00:00Z`).getTime() - 24 * HEURE);
  const { data } = await db.from("veille_posts").select("*").in("jour", [hier, jour]).is("recap_le", null)
    .not("statut", "eq", "hors_jour").order("importance", { ascending: false, nullsFirst: false }).order("detecte_le", { ascending: false }).limit(400);
  const lignes = data ?? [];
  return {
    idees: lignes.filter(p => (p.importance ?? 0) >= SEUIL && ["pret", "a_preparer", "a_envoyer", "envoye"].includes(p.statut)),
    autres: lignes.filter(p => (p.importance ?? 0) < SEUIL),
  };
}

async function recap(db: SupabaseClient, force: boolean): Promise<string> {
  const jour = jourParis();
  // pg_cron tourne en UTC : il frappe à deux heures (hiver / été) et seule celle qui tombe
  // à HEURE_RECAP à Paris envoie. L'état « recap » empêche un second envoi le même jour.
  if (!force && heureParis() !== HEURE_RECAP) return `pas l'heure (${heureParis()} h à Paris)`;
  const { data: etat } = await db.from("veille_posts_etat").select("curseur").eq("source", "recap").maybeSingle();
  if (!force && etat?.curseur && jourParis(etat.curseur) === jour) return "récap déjà envoyé aujourd'hui";

  const { idees, autres } = await contenuDuRecap(db, jour);
  // Dernière chance pour les brouillons manquants ; sinon, les faits seuls.
  let essais = 0;
  for (const p of choisirFiches(idees)) if (!p.brief && essais++ < 4) await preparer(db, p);

  const { sujet, html, texte } = recapitulatif(jour, idees, autres);
  await envoyer(sujet, html, texte);
  const maintenant = new Date().toISOString();
  const dejaVues = [...idees, ...autres].map(p => p.cle);
  for (let i = 0; i < dejaVues.length; i += 200) await db.from("veille_posts").update({ recap_le: maintenant }).in("cle", dejaVues.slice(i, i + 200));
  await db.from("veille_posts_etat").upsert({ source: "recap", curseur: maintenant, maj_le: maintenant });
  return `récap envoyé : ${idees.length} idée(s), ${autres.length} autres contenus, ${Math.round(html.length / 1024)} Ko`;
}

Deno.serve(async (req) => {
  const jeton = Deno.env.get("VEILLE_POSTS_TOKEN");
  if (!jeton || req.headers.get("x-veille-token") !== jeton) return new Response("interdit", { status: 403 });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const params = new URL(req.url).searchParams;
  if (params.get("essai") === "1") return Response.json(await passage(db, true));
  // Récap d'un jour donné, envoyé tel quel pour voir la mise en forme ; l'envoi du soir n'en sait rien.
  if (params.get("essai_recap") === "1") {
    const jour = params.get("jour") || jourParis();
    const { idees, autres } = await contenuDuRecap(db, jour);
    const { sujet, html, texte } = recapitulatif(jour, idees, autres);
    if (params.get("envoyer") === "1") await envoyer(`[Essai] ${sujet}`, html, texte);
    return Response.json({ jour, idees: idees.length, autres: autres.length, ko: Math.round(html.length / 1024), envoye: params.get("envoyer") === "1", ...(params.get("voir") === "1" ? { texte } : {}) });
  }
  if (params.get("recap") === "1") {
    const lancer = recap(db, params.get("force") === "1")
      .then(r => { console.log(`[veille-posts] ${r}`); return r; })
      .catch(e => { console.error("[veille-posts] récap", e); return `échec : ${(e as Error).message}`; });
    // Appel à la main (attendre=1) : on rend le résultat. Depuis pg_cron (qui n'attend que
    // 10 s) : réponse immédiate, le récap se termine en arrière-plan.
    if (params.get("attendre") === "1") return Response.json({ recap: await lancer });
    EdgeRuntime.waitUntil(lancer);
    return Response.json({ ok: true }, { status: 202 });
  }

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
