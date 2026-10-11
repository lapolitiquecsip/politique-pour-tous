/**
 * Débats et votes des primaires : annonce tenue à la main, retransmission retrouvée seule.
 *
 * Aucune API ne publie « Les Républicains débattront le 12 novembre sur LCI » : cette
 * annonce-là est éditoriale, et elle vit dans src/lib/data/primaires.json. Ce que la
 * machine sait faire, en revanche, c'est retrouver la vidéo une fois le débat passé —
 * c'est le partage retenu, et c'est le seul qui tienne.
 *
 * La recherche YouTube est volontairement stricte. Un « débat » et un nom de parti
 * suffisent à faire remonter des extraits de chaînes d'opinion, des rediffusions
 * tronquées et des commentaires de plateau. On exige donc que le titre porte le mot
 * « débat » ET le nom de la primaire ou du diffuseur, et que la mise en ligne tombe
 * dans les trois jours qui suivent le rendez-vous. Mieux vaut aucune vidéo qu'une
 * vidéo qui n'est pas la bonne.
 *
 * Usage :
 *   npx tsx scripts/update-primary-debates.ts
 *   npx tsx scripts/update-primary-debates.ts --dry-run
 *
 * Variables : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, YOUTUBE_API_KEY.
 */
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");

const YT_KEY = process.env.YOUTUBE_API_KEY || "";

/** Fenêtre, en jours, pendant laquelle une mise en ligne peut être la retransmission. */
const FENETRE_JOURS = 3;

type Evenement = {
  id: string;
  primaire: string;
  type?: "debat" | "vote";
  titre: string;
  date_prevue: string;
  heure?: string;
  diffuseur?: string;
  participants?: string[];
  statut?: "a_venir" | "diffuse" | "annule";
  /** Retransmission déjà connue de l'éditeur : on la prend telle quelle. */
  video_id?: string;
  recherche?: string;
  media_url?: string;
  source_url?: string;
};

type Calendrier = {
  primaires: { nom: string; camp: string; candidats: string[]; resultat?: { vainqueur: string } }[];
  evenements: Evenement[];
};

/** Préfixe du champ `resume` d'un vote dont le vainqueur a été repéré dans la presse. */
const VAINQUEUR_AUTO = "VAINQUEUR_AUTO";

/**
 * Cherche dans la presse le vainqueur d'un vote de primaire qui vient d'avoir lieu.
 *
 * Aucune API ne publie le résultat d'une primaire : il est proclamé par ses organisateurs et
 * repris dans l'heure par toute la presse. On lit donc les titres de Google Actualités (flux
 * RSS, libre et sans clé) parus depuis l'ouverture du vote, et on ne retient un nom que si
 * plusieurs médias DISTINCTS l'annoncent vainqueur sans ambiguïté — jamais sur un titre isolé,
 * un sondage ou une question. Les scores détaillés, eux, restent saisis à la main dans
 * primaires.json (bloc `resultat`) : les médias divergent trop pour les recopier seuls.
 */
async function detecterVainqueur(
  candidats: { slug: string; nom: string }[], depuis: string,
): Promise<{ slug: string; nom: string; medias: number; url: string; titre: string } | null> {
  const familles = candidats.map(c => ({ ...c, cle: sansAccent(c.nom.split(" ").slice(-1)[0]) }));
  const balise = (bloc: string, nom: string) => {
    const m = bloc.match(new RegExp("<" + nom + "[^>]*>([^]*?)</" + nom + ">"));
    return (m?.[1] ?? "").replace("<![CDATA[", "").replace("]]>", "").trim();
  };
  // Deux formulations : Google Actualités ne renvoie pas les mêmes titres d'une requête à l'autre.
  const requetes = [
    `primaire ${familles.map(c => c.cle).join(" ")} résultat`,
    `primaire ${familles.map(c => c.cle).join(" OR ")} vainqueur when:7d`,
  ];
  const gagne = "(remporte|l.emporte des|l.emporte avec|l.emporte largement|vainqueur|designe|est elu|elu des|elu candidat|s.impose|ecrase|sacre)";
  const voix = new Map<string, { medias: Set<string>; url: string; titre: string }>();
  const vus = new Set<string>();
  for (const q of requetes) {
    const r = await fetch(
      `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=fr&gl=FR&ceid=FR:fr`,
      { headers: { "User-Agent": "Mozilla/5.0" } },
    );
    if (!r.ok) throw new Error(`Google Actualités a répondu ${r.status}`);
    const xml = await r.text();
    for (const it of xml.split("<item>").slice(1)) {
      const titre = balise(it, "title"), date = balise(it, "pubDate");
      const media = balise(it, "source") || titre.split(" - ").pop() || "";
      if (!titre || !date || vus.has(titre) || new Date(date) < new Date(`${depuis}T00:00:00Z`)) continue;
      vus.add(titre);
      const t = sansAccent(titre);
      // Ni question, ni conditionnel, ni pronostic, ni débat : seulement des annonces de résultat.
      if (/[?]|pourrait|espere|vise |favori|sondage|pronostic|selon un|avant le vote|peut-il|va-t-il|debat/.test(t)) continue;
      // Un titre qui cite deux candidats ne dit pas clairement lequel a gagné.
      const cites = familles.filter(c => t.includes(c.cle));
      if (cites.length !== 1) continue;
      const c = cites[0];
      const annonce = new RegExp(
        c.cle + "[^|]{0,70}" + gagne + "|(victoire|triomphe|sacre|vainqueur)[^|]{0,60}" + c.cle,
      ).test(t);
      if (!annonce) continue;
      const v = voix.get(c.slug) ?? { medias: new Set<string>(), url: balise(it, "link"), titre };
      v.medias.add(sansAccent(media));
      voix.set(c.slug, v);
    }
  }
  const tri = [...voix.entries()].sort((a, b) => b[1].medias.size - a[1].medias.size);
  if (!tri.length) return null;
  const [slug, premier] = tri[0];
  const second = tri[1]?.[1].medias.size ?? 0;
  // Au moins trois médias distincts, et trois fois plus que le suivant.
  if (premier.medias.size < 3 || premier.medias.size < 3 * second) return null;
  return { slug, nom: familles.find(c => c.slug === slug)!.nom, medias: premier.medias.size, url: premier.url, titre: premier.titre };
}

const sansAccent = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Titre et date de mise en ligne d'une vidéo dont on connaît déjà l'identifiant.
 *
 * Quand l'éditeur a repéré la retransmission lui-même — c'est le cas courant pour
 * un débat diffusé par le parti organisateur, qui le met en ligne sur sa propre
 * chaîne — chercher serait à la fois inutile et hasardeux. On se contente de lire
 * la fiche de la vidéo pour afficher son vrai titre. Une réponse vide signifie que
 * l'identifiant ne désigne rien : mieux vaut le savoir que servir un lecteur mort.
 */
async function ficheVideo(id: string): Promise<{ titre: string; publiee: string } | null> {
  if (!YT_KEY) return null;
  const url = "https://www.googleapis.com/youtube/v3/videos"
    + `?part=snippet&id=${encodeURIComponent(id)}&key=${YT_KEY}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`YouTube a répondu ${r.status}`);
  const j: any = await r.json();
  const v = (j.items ?? [])[0];
  if (!v) return null;
  return { titre: String(v.snippet?.title ?? ""), publiee: String(v.snippet?.publishedAt ?? "") };
}

/**
 * Cherche la retransmission d'un rendez-vous passé.
 *
 * Coût : une unité de quota par recherche, sur les dix mille quotidiennes. On ne
 * cherche que pour les rendez-vous passés et encore dépourvus de vidéo, donc au plus
 * quelques appels par jour.
 */
async function chercherVideo(e: Evenement): Promise<{
  id: string; titre: string; publiee: string;
} | null> {
  if (!YT_KEY) return null;

  const requete = e.recherche || `${e.titre} ${e.diffuseur ?? ""} débat`;
  const apres = new Date(`${e.date_prevue}T00:00:00Z`);
  const avant = new Date(apres.getTime() + FENETRE_JOURS * 864e5);

  const url = "https://www.googleapis.com/youtube/v3/search"
    + `?part=snippet&type=video&maxResults=10&order=relevance&regionCode=FR&relevanceLanguage=fr`
    + `&publishedAfter=${apres.toISOString()}&publishedBefore=${avant.toISOString()}`
    + `&q=${encodeURIComponent(requete)}&key=${YT_KEY}`;

  const r = await fetch(url);
  if (!r.ok) throw new Error(`YouTube a répondu ${r.status}`);
  const j: any = await r.json();

  // Le titre doit parler de débat ET nommer la primaire ou le diffuseur. Sans cette
  // double condition, la recherche ramène des plateaux de commentateurs.
  const attendus = [e.primaire, e.diffuseur].filter(Boolean).map(x => sansAccent(String(x)));
  for (const it of j.items ?? []) {
    const titre = String(it.snippet?.title ?? "");
    const t = sansAccent(titre);
    const parleDeDebat = e.type === "vote" ? /vote|resultat|depouillement/.test(t) : /debat/.test(t);
    if (!parleDeDebat) continue;
    // On accepte qu'un seul des repères attendus figure : les chaînes abrègent.
    const nomme = attendus.some(a => a.split(/\s+/).some(mot => mot.length > 4 && t.includes(mot)));
    if (!nomme) continue;
    return { id: it.id.videoId, titre, publiee: it.snippet.publishedAt };
  }
  return null;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requises.");
    process.exit(1);
  }
  const supabase = createClient(url, key);

  console.log("=== Débats et votes des primaires ===");
  const brut = await readFile(join(process.cwd(), "src/lib/data/primaires.json"), "utf8");
  const cal: Calendrier = JSON.parse(brut);
  const campDe = new Map(cal.primaires.map(p => [p.nom, p.camp]));

  if (!cal.evenements.length) {
    console.log("  Aucun rendez-vous au calendrier : renseignez src/lib/data/primaires.json.");
    return;
  }

  // Les candidats connus, pour refuser un slug qui n'existe pas — une faute de frappe
  // dans le calendrier rattacherait le débat à personne, sans rien signaler.
  const { data: candidats } = await supabase.from("presidential_candidates").select("slug, full_name");
  const connus = new Set((candidats ?? []).map((c: any) => c.slug));
  const nomDe = new Map((candidats ?? []).map((c: any) => [c.slug as string, c.full_name as string]));

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const lignes: any[] = [];
  let trouvees = 0;

  for (const e of cal.evenements) {
    const inconnus = (e.participants ?? []).filter(s => !connus.has(s));
    if (inconnus.length) console.warn(`  ⚠ ${e.id} : candidat(s) inconnu(s) — ${inconnus.join(", ")}`);

    const passe = e.date_prevue <= aujourdhui;
    const ligne: any = {
      id: e.id,
      primaire: e.primaire,
      camp: campDe.get(e.primaire) ?? null,
      type: e.type ?? "debat",
      titre: e.titre,
      date_prevue: e.date_prevue,
      heure: e.heure ?? null,
      diffuseur: e.diffuseur ?? null,
      participants: (e.participants ?? []).filter(s => connus.has(s)),
      statut: e.statut ?? (passe ? "diffuse" : "a_venir"),
      media_url: e.media_url ?? null,
      source_url: e.source_url ?? null,
      updated_at: new Date().toISOString(),
    };

    // Retransmission donnée à la main : elle l'emporte, et rien n'est cherché.
    if (e.video_id) {
      ligne.video_id = e.video_id;
      ligne.video_url = `https://www.youtube.com/watch?v=${e.video_id}`;
      try {
        const f = await ficheVideo(e.video_id);
        if (f) {
          ligne.video_title = f.titre;
          ligne.video_published_at = f.publiee;
          console.log(`  = ${e.id} → ${f.titre.slice(0, 70)} (indiquée au calendrier)`);
        } else {
          console.warn(`  ⚠ ${e.id} : la vidéo ${e.video_id} est introuvable ou privée`);
        }
      } catch (err) {
        console.warn(`  ⚠ ${e.id} : ${(err as Error).message}`);
      }
    }
    // Sinon on ne cherche que pour un rendez-vous passé qui n'a pas encore de vidéo.
    else if (passe && ligne.statut !== "annule") {
      const { data: deja } = await supabase
        .from("primary_events").select("video_id").eq("id", e.id).maybeSingle();
      if (!deja?.video_id) {
        try {
          const v = await chercherVideo(e);
          if (v) {
            ligne.video_id = v.id;
            ligne.video_url = `https://www.youtube.com/watch?v=${v.id}`;
            ligne.video_title = v.titre;
            ligne.video_published_at = v.publiee;
            trouvees++;
            console.log(`  ✓ ${e.id} → ${v.titre.slice(0, 70)}`);
          } else {
            console.log(`  · ${e.id} : aucune retransmission trouvée pour l'instant`);
          }
        } catch (err) {
          console.warn(`  ⚠ ${e.id} : ${(err as Error).message}`);
        }
      }
    }

    lignes.push(ligne);
  }

  // Vainqueur d'un vote récent : cherché dans la presse tant que primaires.json n'a pas de bloc
  // `resultat`. Dès qu'il est connu, les tours suivants de la même primaire sont annulés : sans
  // cela, un second tour devenu sans objet restait annoncé « à venir ».
  const annonces: { id: string; resume: string }[] = [];
  for (const p of cal.primaires) {
    const votes = lignes
      .filter(l => l.primaire === p.nom && l.type === "vote" && l.statut !== "annule")
      .sort((a, b) => a.date_prevue.localeCompare(b.date_prevue));
    const dernierPasse = [...votes].reverse().find(l => l.date_prevue <= aujourdhui);
    if (!dernierPasse) continue;
    let vainqueur = p.resultat?.vainqueur ?? null;
    const recent = dernierPasse.date_prevue >= new Date(Date.now() - 21 * 864e5).toISOString().slice(0, 10);
    if (!vainqueur && recent) {
      try {
        const v = await detecterVainqueur(
          p.candidats.map(sl => ({ slug: sl, nom: nomDe.get(sl) ?? sl })), dernierPasse.date_prevue,
        );
        if (v) {
          vainqueur = v.slug;
          annonces.push({ id: dernierPasse.id, resume: [VAINQUEUR_AUTO, v.slug, v.medias, v.url, v.titre].join("|") });
          console.log(`  ★ ${p.nom} : ${v.nom} donné vainqueur par ${v.medias} médias — à confirmer dans primaires.json (bloc resultat)`);
        } else {
          console.log(`  · ${p.nom} : pas de vainqueur établi dans la presse pour l'instant`);
        }
      } catch (err) {
        console.warn(`  ⚠ ${p.nom} : ${(err as Error).message}`);
      }
    }
    if (vainqueur) for (const l of votes) if (l.date_prevue > dernierPasse.date_prevue) l.statut = "annule";
  }

  if (DRY) { console.log(`\n  (--dry-run : ${lignes.length} rendez-vous, rien n'est écrit)`); return; }
  const { error } = await supabase.from("primary_events").upsert(lignes, { onConflict: "id" });
  if (error) { console.error(`  ✗ écriture : ${error.message}`); process.exit(1); }
  // Écrit à part : glissé dans l'envoi groupé, ce champ présent sur une seule ligne aurait
  // effacé le compte rendu des autres.
  for (const a of annonces) {
    await supabase.from("primary_events")
      .update({ resume: a.resume, resume_at: new Date().toISOString() }).eq("id", a.id);
  }
  console.log(`\n  → ${lignes.length} rendez-vous enregistré(s), ${trouvees} retransmission(s) rattachée(s)`);
}

main().catch(e => { console.error("Erreur fatale :", e); process.exit(1); });
