/**
 * Les fichiers vidéo des réunions de commission, pour les lire SUR LE SITE (24/11/2026).
 *
 * L'éditeur : « pas possible de mettre directement la vidéo de l'audition sur mon site, et pas
 * renvoyer sur le portail vidéo de l'AN ? ». Les deux assemblées diffusent leurs enregistrements en
 * MP4 ouvert à l'intégration : l'Assemblée fournit elle-même le code d'intégration de chaque vidéo,
 * et les fichiers sont servis avec « Access-Control-Allow-Origin: * » et la lecture par plages.
 *
 * Pour chaque réunion : la page vidéo officielle (déjà connue, ou retrouvée dans le compte rendu
 * de l'Assemblée), puis l'adresse du fichier MP4 et l'instant où commence la réunion dans ce
 * fichier (le Sénat filme avant l'ouverture ; une vidéo couvre parfois plusieurs points de l'ordre
 * du jour). Écrit commission_reports.video_mp4 / video_debut / video_verifie_at.
 *
 * Gratuit, sans IA. Une réunion déjà vérifiée n'est relue que si elle a moins de trois semaines
 * (la vidéo de l'Assemblée paraît parfois après le compte rendu), au plus une fois par jour.
 *
 *   npx tsx scripts/videos-commissions.ts [--max=80] [--ref=…] [--dry-run]
 */
import { createClient } from "@supabase/supabase-js";
import { indexVideo, restreindre } from "./lib/video-an";
import { pageVideo } from "./lib/video-page";

const args = process.argv.slice(2);
const option = (nom: string) => args.find(x => x.startsWith(`--${nom}=`))?.split("=")[1];
const MAX = Number(option("max")) || 80;
const REF = option("ref") ?? null;
const DRY = args.includes("--dry-run");
const PAUSE_MS = 1500; // l'Assemblée répond 503 quand on va vite

const attendre = (ms: number) => new Promise(r => setTimeout(r, ms));
const jours = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error("❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants"); process.exit(1); }
  const supabase = createClient(url, key);

  const colonnes = "ref, chamber, title, meeting_date, cr_url, video_url, video_mp4, video_verifie_at";
  let q = supabase.from("commission_reports").select(colonnes).order("meeting_date", { ascending: false });
  if (REF) q = q.eq("ref", REF);
  else q = q.is("video_mp4", null)
    .or(`video_verifie_at.is.null,and(video_verifie_at.lt.${jours(1)},meeting_date.gte.${jours(21).slice(0, 10)})`)
    .limit(MAX * 3);
  const { data, error } = await q;
  if (error) {
    if (error.code === "42703") {
      console.log("::warning title=Vidéos des commissions::Migration 2026112401_commission_video_fichier.sql non appliquée : rien à faire.");
      return;
    }
    console.error(`❌ lecture : ${error.message}`); process.exit(1);
  }
  // Une réunion sans page vidéo connue ni compte rendu de l'Assemblée n'a aucune piste : on la saute.
  const file = (data ?? []).filter((r: any) => REF || /\/video\.\d+_/.test(r.video_url ?? "") || (r.chamber !== "SENAT" && r.cr_url))
    .slice(0, MAX);
  console.log(`=== ${file.length} réunion(s) à vérifier ===`);

  let trouvees = 0, sans = 0, erreurs = 0;
  for (const r of file as any[]) {
    const maintenant = new Date().toISOString();
    try {
      const page = /\/video\.\d+_/.test(r.video_url ?? "")
        ? r.video_url
        : r.chamber !== "SENAT" && r.cr_url ? await pageVideo(r.cr_url).catch(() => null) : null;
      if (!page) {
        sans++;
        if (!DRY) await supabase.from("commission_reports").update({ video_verifie_at: maintenant }).eq("ref", r.ref);
        continue;
      }
      const entier = await indexVideo(page);
      if (!entier.mp4) {
        sans++;
        console.log(`  ${r.meeting_date} ${r.ref} : page sans fichier vidéo`);
        if (!DRY) await supabase.from("commission_reports").update({ video_url: page, video_verifie_at: maintenant }).eq("ref", r.ref);
        continue;
      }
      // Le point de l'ordre du jour de CETTE réunion, quand la vidéo en couvre plusieurs.
      const idx = restreindre(entier, r.title ?? "") ?? entier;
      const debut = Math.max(0, Math.floor((idx.interventions[0]?.t ?? idx.sections[0]?.t ?? entier.debutLecture) - 3));
      const ligne = { video_url: page, video_mp4: entier.mp4, video_debut: debut, video_verifie_at: maintenant };
      console.log(`  ✓ ${r.meeting_date} ${r.ref} → ${entier.mp4.split("/").pop()} @ ${debut} s`);
      trouvees++;
      if (!DRY) {
        const { error: e } = await supabase.from("commission_reports").update(ligne).eq("ref", r.ref);
        if (e) throw new Error(e.message);
      }
    } catch (e) {
      erreurs++;
      console.warn(`  ⚠ ${r.ref} : ${(e as Error).message}`);
      if (!DRY) await supabase.from("commission_reports").update({ video_verifie_at: maintenant }).eq("ref", r.ref);
    }
    await attendre(PAUSE_MS);
  }
  console.log(`\n=== ${trouvees} vidéo(s) lisibles sur le site · ${sans} sans vidéo · ${erreurs} erreur(s) ===`);
}

main().catch(e => { console.error(e); process.exit(1); });
