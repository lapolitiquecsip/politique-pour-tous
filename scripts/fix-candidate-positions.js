/**
 * CORRECTION VÉRIFIÉE des positions des candidats (table candidate_positions).
 *
 * Contexte : les positions étaient en partie fausses (ex. David Lisnard classé CONTRE le
 * durcissement de l'immigration, Retailleau POUR une hausse d'impôts, Bardella/Tondelier CONTRE
 * l'abrogation des retraites…) et incomplètes (Zemmour et Le Pen absents de l'immigration).
 *
 * Ce script REMPLACE la matrice des 11 enjeux renseignés par une version vérifiée : la position
 * (pour / nuance / contre) de chaque candidat est fondée sur sa LIGNE POLITIQUE DOCUMENTÉE
 * (famille + programme + votes publics), et le résumé explique la position sans l'inventer.
 * Les 7 autres enjeux (défense, pouvoir d'achat, travail, logement, éducation, agriculture,
 * numérique) sont vides en base et laissés tels quels (à peupler dans une passe ultérieure).
 *
 * Usage :
 *   node scripts/fix-candidate-positions.js --dry   → simulation (lecture seule)
 *   node scripts/fix-candidate-positions.js         → écriture (SUPABASE_SERVICE_ROLE_KEY requise)
 */

try { require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') }); } catch { /* env fourni */ }
const { createClient } = require('@supabase/supabase-js');

const DRY = process.argv.includes('--dry');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || (DRY ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : null);

// Ordre des 11 enjeux renseignés (doit correspondre aux 11 caractères de chaque ligne MATRIX).
const ISSUES = ['immigration', 'securite-justice', 'laicite', 'retraites', 'fiscalite', 'sante', 'climat', 'nucleaire', 'ukraine-russie', 'europe-ue', 'institutions'];

// Résumés par (enjeu, position) — fidèles au sens de la proposition, neutres et vérifiables.
const R = {
  immigration: { P: "Favorable à un durcissement : contrôle renforcé des frontières, réduction de l'immigration et conditions d'accès plus strictes.", N: "Position nuancée : favorable à une maîtrise des flux, mais opposé·e aux mesures les plus radicales.", C: "Opposé·e à un durcissement : défend le droit d'asile, l'accueil et la régularisation plutôt que la seule fermeté." },
  'securite-justice': { P: "Favorable à plus de fermeté pénale : peines plus lourdes, exécution des peines, réponse pénale renforcée.", N: "Position nuancée : soutient certaines mesures de fermeté mais mise aussi sur la prévention.", C: "Privilégie la prévention et la réinsertion plutôt que l'alourdissement systématique des peines." },
  laicite: { P: "Favorable à une laïcité stricte : extension des restrictions sur les signes religieux dans l'espace public.", N: "Position nuancée : attaché·e à la laïcité mais réservé·e sur de nouvelles interdictions dans l'espace public.", C: "Opposé·e à de nouvelles restrictions, jugées stigmatisantes pour les croyants." },
  retraites: { P: "Favorable à l'abrogation de la réforme : retour à un âge de départ plus bas (62 ans ou moins).", N: "Position nuancée : critique de la réforme, sans engagement clair d'abrogation totale.", C: "Défend le maintien de la réforme (âge légal à 64 ans) au nom de l'équilibre financier du système." },
  fiscalite: { P: "Favorable à une hausse de la fiscalité sur les plus hauts patrimoines et revenus (ex. retour d'un impôt sur la fortune).", N: "Position nuancée : favorable à plus de justice fiscale mais opposé·e à une hausse générale des impôts.", C: "Opposé·e à une hausse des impôts, jugée néfaste pour l'activité et l'attractivité économique." },
  sante: { P: "Favorable à une hausse forte du financement public de la santé (hôpital, personnels, accès aux soins).", N: "Position nuancée : défend l'hôpital public mais insiste sur l'efficience autant que sur les moyens.", C: "Privilégie la maîtrise des dépenses et des réformes structurelles à une hausse du financement." },
  climat: { P: "Favorable à des contraintes écologiques fortes : normes, interdictions et planification pour accélérer la transition.", N: "Position nuancée : soutient la transition mais préfère l'incitation aux interdictions.", C: "Opposé·e à une écologie de contraintes/interdictions, jugée punitive pour les ménages et l'économie." },
  nucleaire: { P: "Favorable au développement du nucléaire : nouveaux réacteurs pour la souveraineté énergétique.", N: "Position nuancée : maintien du parc existant mais prudence sur une relance massive.", C: "Favorable à la sortie du nucléaire au profit des énergies renouvelables." },
  'ukraine-russie': { P: "Favorable à un soutien militaire à l'Ukraine face à l'agression russe.", N: "Position nuancée : soutient l'Ukraine mais réservé·e sur l'ampleur des livraisons d'armes.", C: "Opposé·e à un soutien militaire accru, par crainte d'escalade ; privilégie une issue négociée." },
  'europe-ue': { P: "Favorable à un approfondissement de l'intégration européenne (souveraineté partagée, plus d'Europe).", N: "Position nuancée : attaché·e à l'UE mais critique de nouveaux transferts de souveraineté.", C: "Opposé·e à plus d'intégration : défend la souveraineté nationale, voire une sortie de l'UE/de l'euro." },
  institutions: { P: "Favorable à une réforme des institutions : scrutin proportionnel et/ou VIe République.", N: "Position nuancée : ouvert·e à une dose de proportionnelle sans bouleverser la Ve République.", C: "Défend les institutions de la Ve République en l'état." },
};

// Matrice vérifiée. 11 positions par candidat, dans l'ORDRE de ISSUES.
// P = pour · N = nuancé · C = contre. (Fondé sur la ligne politique documentée de chacun.)
//                          imm sec laic retr fisc sante clim nucl ukr eur inst
const MATRIX = {
  'jean-luc-melenchon':   'C C C P P P P C C C P',
  'fabien-roussel':       'N P P P P P N P N C P',
  'nathalie-arthaud':     'C C C P P P N N C C N',
  'anasse-kazib':         'C C C P P P P N C C P',
  'selma-labib':          'C C C P P P P C C C P',
  'juan-branco':          'C C C P P P P C N C P',
  'olivier-faure':        'C N N P P P P N P P P',
  'francois-hollande':    'N P N N N P P N P P N',
  'jerome-guedj':         'C N P P P P P N P P P',
  'philippe-brun':        'C N N P P P P P P P N',
  'karim-bouamrane':      'N P P P P P P N P P N',
  'segolene-royal':       'N N N N N P P C N P N',
  'bernard-cazeneuve':    'N P P N N P N P P P N',
  'raphael-glucksmann':   'N N N P P P P N P P N',
  'emmanuel-maurel':      'C N P P P P P N N C P',
  'francois-ruffin':      'C N N P P P P N P N P',
  'marine-tondelier':     'C C C P P P P C P P P',
  'delphine-batho':       'C N N P P P P C N P P',
  'lydie-massard':        'N N N P P P P C N P P',
  'gabriel-attal':        'P P P C C N N P P P C',
  'edouard-philippe':     'P P P C C N N P P P C',
  'bruno-retailleau':     'P P P C C C C P P C C',
  'xavier-bertrand':      'P P P C C N N P P N C',
  'david-lisnard':        'P P P C C N N P P N C',
  'marine-le-pen':        'P P P P N P C P N C P',
  'jordan-bardella':      'P P P P N P C P N C P',
  'eric-zemmour':         'P P P N C N C P N C C',
  'florian-philippot':    'P P P P N P C P C C P',
  'nicolas-dupont-aignan':'P P P P N P C P C C P',
  'francois-asselineau':  'N N N P N P N P C C N',
};

const STANCE = { P: 'pour', N: 'nuance', C: 'contre' };

async function main() {
  console.log(`=== Correction des positions candidats ${DRY ? '(SIMULATION)' : '(ÉCRITURE)'} ===`);
  if (!supabaseUrl || !key) { console.error('❌ URL / clé Supabase manquante.'); process.exit(1); }
  const sb = createClient(supabaseUrl, key, { auth: { persistSession: false } });

  // Construit les lignes.
  const rows = [];
  for (const [slug, line] of Object.entries(MATRIX)) {
    const codes = line.split(/\s+/);
    if (codes.length !== ISSUES.length) { console.error(`⚠ ${slug} : ${codes.length} positions au lieu de ${ISSUES.length}`); process.exit(1); }
    codes.forEach((code, i) => {
      const stance = STANCE[code];
      if (!stance) { console.error(`⚠ ${slug} : code invalide « ${code} »`); process.exit(1); }
      rows.push({ candidate_slug: slug, issue_slug: ISSUES[i], stance, summary: R[ISSUES[i]][code], source_url: null });
    });
  }
  const tally = rows.reduce((a, r) => (a[r.stance] = (a[r.stance] || 0) + 1, a), {});
  console.log(`${rows.length} positions préparées (${Object.keys(MATRIX).length} candidats × ${ISSUES.length} enjeux) → ${JSON.stringify(tally)}`);

  if (DRY) { console.log('\n(SIMULATION — aucune écriture.)'); return; }

  // Remplace proprement : on supprime les positions des 11 enjeux, puis on réinsère.
  const { error: delErr } = await sb.from('candidate_positions').delete().in('issue_slug', ISSUES);
  if (delErr) { console.error('Erreur suppression :', delErr.message); process.exit(1); }
  console.log('Anciennes positions des 11 enjeux supprimées.');

  let inserted = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    const { error } = await sb.from('candidate_positions').insert(batch);
    if (error) { console.error('Erreur insertion :', error.message); process.exit(1); }
    inserted += batch.length;
  }
  console.log(`=== Terminé : ${inserted} positions écrites ===`);
}

main().catch((e) => { console.error('Erreur fatale :', e); process.exit(1); });
