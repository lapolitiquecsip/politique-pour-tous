/**
 * REFONTE du comparateur de positions des candidats (présidentielle) : passe de 18 enjeux
 * larges à 32 QUESTIONS PRÉCISES et clivantes (demande utilisateur), chacune Pour/Nuancé/Contre,
 * fondées sur la ligne politique DOCUMENTÉE de chaque candidat. Aucune invention ; « nuancé »
 * là où la position est réellement partagée ou peu documentée.
 *
 * SÛR pour le reste du site : la table `issues` est partagée (scrutin_issues, entity_positions).
 *  - On NE supprime/renomme AUCUN slug existant (les FK par slug restent valides).
 *  - Le comparateur n'affiche que les enjeux AVEC une `proposition` ; on neutralise (proposition=null)
 *    les 11 enjeux larges remplacés (ils restent utilisables pour le tagging des scrutins/élus).
 *  - candidate_positions est propre au comparateur (≠ entity_positions) : on le réécrit entièrement.
 *
 * Usage : node scripts/rebuild-candidate-positions.js --dry | node scripts/rebuild-candidate-positions.js
 */

try { require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') }); } catch { /* env fourni */ }
const { createClient } = require('@supabase/supabase-js');

const DRY = process.argv.includes('--dry');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || (DRY ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : null);

// Enjeux larges remplacés par des questions précises → retirés du comparateur (proposition=null),
// mais conservés en base pour le tagging des scrutins / positions des élus.
const SUPERSEDED = ['defense', 'fiscalite', 'sante', 'climat', 'pouvoir-achat', 'travail-emploi', 'logement', 'education', 'agriculture', 'numerique', 'institutions'];

// Les 32 questions du comparateur (ordre = sort_order ; catégories dans l'ordre voulu).
const ISSUES = [
  ['immigration', 'Régaliens', 'Immigration', "Durcir les règles de l'immigration"],
  ['droit-du-sol', 'Régaliens', 'Droit du sol', 'Supprimer le droit du sol'],
  ['cedh', 'Régaliens', 'CEDH', 'Quitter la CEDH si elle empêche des expulsions'],
  ['securite-justice', 'Régaliens', 'Sécurité & justice', 'Renforcer la fermeté pénale (peines plus sévères)'],
  ['service-national', 'Régaliens', 'Service national', 'Rétablir un service national obligatoire'],
  ['budget-armees', 'Régaliens', 'Défense', 'Augmenter le budget des armées au-delà de 2 % du PIB'],
  ['isf', 'Économie & fiscalité', 'ISF', "Rétablir l'impôt sur la fortune (ISF)"],
  ['superprofits', 'Économie & fiscalité', 'Superprofits', 'Taxer les superprofits des grandes entreprises'],
  ['impots-production', 'Économie & fiscalité', 'Impôts de production', 'Baisser les impôts de production des entreprises'],
  ['reduire-depense', 'Économie & fiscalité', 'Dépense publique', 'Réduire fortement la dépense publique (dizaines de milliards)'],
  ['retraites', 'Travail & retraite', 'Retraites', 'Abroger la réforme et revenir à 62 ans'],
  ['rsa-activite', 'Travail & retraite', 'RSA', "Conditionner le RSA à des heures d'activité"],
  ['faciliter-licenciements', 'Travail & retraite', 'Marché du travail', "Faciliter les licenciements pour encourager l'embauche"],
  ['remboursement-100', 'Santé & social', 'Sécurité sociale', 'Rembourser les soins à 100 % par la Sécurité sociale'],
  ['euthanasie', 'Santé & social', 'Fin de vie', "Légaliser l'aide active à mourir (euthanasie)"],
  ['autorite-ecole', 'Éducation', 'École', "Rétablir l'autorité et la sélectivité (redoublement, notation)"],
  ['prive-education', 'Éducation', 'École privée', 'Renforcer le privé sous contrat (chèque éducation)'],
  ['nucleaire', 'Écologie & énergie', 'Nucléaire', 'Relancer le nucléaire (nouveaux réacteurs)'],
  ['thermiques-2030', 'Écologie & énergie', 'Voitures thermiques', "Interdire la vente de voitures thermiques neuves d'ici 2030"],
  ['taxe-carbone', 'Écologie & énergie', 'Taxe carbone', 'Instaurer une taxe carbone plus élevée'],
  ['eoliennes', 'Écologie & énergie', 'Éolien', 'Développer massivement les éoliennes'],
  ['encadrer-loyers', 'Logement', 'Loyers', 'Encadrer les loyers dans les grandes villes'],
  ['logements-sociaux', 'Logement', 'Logement social', 'Construire massivement des logements sociaux'],
  ['europe-ue', 'Europe & international', 'Union européenne', "Approfondir l'intégration européenne"],
  ['ukraine-russie', 'Europe & international', 'Ukraine', "Soutenir militairement l'Ukraine face à la Russie"],
  ['palestine', 'Europe & international', 'Palestine', "Reconnaître l'État de Palestine"],
  ['vie-republique', 'Institutions & démocratie', 'VIe République', 'Passer à une VIe République (nouvelle Constitution)'],
  ['proportionnelle', 'Institutions & démocratie', 'Proportionnelle', 'Instaurer la proportionnelle aux législatives'],
  ['ric', 'Institutions & démocratie', 'RIC', "Instaurer le référendum d'initiative citoyenne (RIC)"],
  ['voile', 'Société & laïcité', 'Voile', "Interdire le voile à l'université / dans l'espace public"],
  ['laicite', 'Société & laïcité', 'Laïcité', 'Renforcer la laïcité dans les services publics'],
  ['cannabis', 'Société & laïcité', 'Cannabis', 'Légaliser le cannabis'],
];

// Familles (slugs candidats).
const FL = ['jean-luc-melenchon', 'anasse-kazib', 'selma-labib', 'nathalie-arthaud', 'juan-branco'];
const GAUCHE = ['olivier-faure', 'jerome-guedj', 'philippe-brun', 'karim-bouamrane', 'emmanuel-maurel', 'francois-ruffin', 'marine-tondelier', 'delphine-batho', 'lydie-massard', 'raphael-glucksmann'];
const PSM = ['francois-hollande', 'segolene-royal', 'bernard-cazeneuve'];
const MAC = ['gabriel-attal', 'edouard-philippe'];
const LR = ['bruno-retailleau', 'xavier-bertrand', 'david-lisnard'];
const RN = ['marine-le-pen', 'jordan-bardella'];
const ROU = 'fabien-roussel';
const ALL = [...FL, ROU, ...GAUCHE, ...PSM, ...MAC, ...LR, ...RN, 'eric-zemmour', 'florian-philippot', 'nicolas-dupont-aignan', 'francois-asselineau'];
const u = (...xs) => [...new Set(xs.flat())]; // union

// Par enjeu : { P: [pour], C: [contre] }. Tout candidat non listé = « nuance ».
const POS = {
  immigration: { P: u(MAC, LR, RN, 'eric-zemmour', 'florian-philippot', 'nicolas-dupont-aignan'), C: u(FL, 'olivier-faure', 'jerome-guedj', 'philippe-brun', 'francois-ruffin', 'marine-tondelier', 'delphine-batho', 'emmanuel-maurel') },
  'droit-du-sol': { P: u(LR, RN, 'eric-zemmour', 'florian-philippot', 'nicolas-dupont-aignan'), C: u(FL, GAUCHE) },
  cedh: { P: u(RN, 'eric-zemmour', 'florian-philippot', 'nicolas-dupont-aignan', 'bruno-retailleau'), C: u(FL, GAUCHE, MAC, PSM, ROU) },
  'securite-justice': { P: u(MAC, LR, RN, 'eric-zemmour', 'florian-philippot', 'nicolas-dupont-aignan', 'francois-asselineau', ROU, 'bernard-cazeneuve', 'karim-bouamrane'), C: u(FL, 'marine-tondelier', 'francois-ruffin') },
  'service-national': { P: u(LR, RN, 'eric-zemmour', 'florian-philippot', 'nicolas-dupont-aignan', ROU), C: u(FL, 'marine-tondelier', 'francois-ruffin', 'delphine-batho') },
  'budget-armees': { P: u(MAC, LR, 'marine-le-pen', 'jordan-bardella', 'eric-zemmour', 'nicolas-dupont-aignan', PSM, 'raphael-glucksmann', 'olivier-faure', 'jerome-guedj', 'philippe-brun', 'karim-bouamrane'), C: u(FL) },
  isf: { P: u(FL, GAUCHE, ROU, 'segolene-royal'), C: u(MAC, LR, 'eric-zemmour', 'marine-le-pen', 'jordan-bardella') },
  superprofits: { P: u(FL, GAUCHE, ROU, RN, 'nicolas-dupont-aignan', 'florian-philippot'), C: u(MAC, LR, 'eric-zemmour') },
  'impots-production': { P: u(MAC, LR, 'eric-zemmour'), C: u(FL, 'olivier-faure', 'jerome-guedj', 'philippe-brun', 'francois-ruffin', 'marine-tondelier', 'delphine-batho', 'emmanuel-maurel', 'lydie-massard') },
  'reduire-depense': { P: u(LR, 'eric-zemmour'), C: u(FL, 'olivier-faure', 'jerome-guedj', 'philippe-brun', 'karim-bouamrane', 'emmanuel-maurel', 'francois-ruffin', 'marine-tondelier', 'delphine-batho', 'lydie-massard', ROU) },
  retraites: { P: u(FL, GAUCHE, ROU, RN, 'florian-philippot', 'nicolas-dupont-aignan', 'francois-asselineau'), C: u(MAC, LR) },
  'rsa-activite': { P: u(MAC, LR, RN, 'eric-zemmour', 'florian-philippot', 'nicolas-dupont-aignan'), C: u(FL, 'olivier-faure', 'jerome-guedj', 'philippe-brun', 'emmanuel-maurel', 'francois-ruffin', 'marine-tondelier', 'delphine-batho', 'lydie-massard', 'raphael-glucksmann', ROU) },
  'faciliter-licenciements': { P: u(MAC, LR, 'eric-zemmour'), C: u(FL, 'olivier-faure', 'jerome-guedj', 'philippe-brun', 'karim-bouamrane', 'emmanuel-maurel', 'francois-ruffin', 'marine-tondelier', 'delphine-batho', 'lydie-massard', ROU, RN) },
  'remboursement-100': { P: u(FL, 'olivier-faure', 'jerome-guedj', 'philippe-brun', 'karim-bouamrane', 'emmanuel-maurel', 'francois-ruffin', 'marine-tondelier', 'delphine-batho', 'lydie-massard', 'raphael-glucksmann', ROU, 'segolene-royal'), C: u(MAC, LR, 'eric-zemmour') },
  euthanasie: { P: u('jean-luc-melenchon', 'anasse-kazib', 'selma-labib', 'juan-branco', GAUCHE, MAC, 'francois-hollande', 'segolene-royal'), C: u('bruno-retailleau', 'eric-zemmour', 'nicolas-dupont-aignan') },
  'autorite-ecole': { P: u(MAC, LR, RN, 'eric-zemmour', 'florian-philippot', 'nicolas-dupont-aignan', 'francois-asselineau', ROU), C: u(FL, 'olivier-faure', 'jerome-guedj', 'francois-ruffin', 'marine-tondelier', 'delphine-batho', 'emmanuel-maurel', 'lydie-massard') },
  'prive-education': { P: u(LR, 'eric-zemmour', 'nicolas-dupont-aignan'), C: u(FL, 'olivier-faure', 'jerome-guedj', 'philippe-brun', 'karim-bouamrane', 'emmanuel-maurel', 'francois-ruffin', 'marine-tondelier', 'delphine-batho', 'lydie-massard', 'raphael-glucksmann', ROU) },
  nucleaire: { P: u(MAC, LR, RN, 'eric-zemmour', 'florian-philippot', 'nicolas-dupont-aignan', 'francois-asselineau', ROU, 'philippe-brun', 'bernard-cazeneuve'), C: u('jean-luc-melenchon', 'marine-tondelier', 'delphine-batho', 'olivier-faure', 'jerome-guedj', 'segolene-royal', 'lydie-massard', 'selma-labib') },
  'thermiques-2030': { P: u('jean-luc-melenchon', 'anasse-kazib', 'selma-labib', 'juan-branco', 'marine-tondelier', 'delphine-batho', 'francois-ruffin', 'jerome-guedj', 'lydie-massard', 'raphael-glucksmann', 'emmanuel-maurel'), C: u(LR, RN, 'eric-zemmour', 'florian-philippot', 'nicolas-dupont-aignan', 'francois-asselineau') },
  'taxe-carbone': { P: u('marine-tondelier', 'delphine-batho', 'raphael-glucksmann', 'jerome-guedj', 'lydie-massard'), C: u(RN, 'eric-zemmour', 'florian-philippot', 'nicolas-dupont-aignan', 'francois-asselineau', LR, 'jean-luc-melenchon', 'francois-ruffin', 'nathalie-arthaud', 'anasse-kazib', 'selma-labib') },
  eoliennes: { P: u('jean-luc-melenchon', 'anasse-kazib', 'selma-labib', 'juan-branco', 'olivier-faure', 'jerome-guedj', 'philippe-brun', 'karim-bouamrane', 'emmanuel-maurel', 'francois-ruffin', 'marine-tondelier', 'delphine-batho', 'lydie-massard', 'raphael-glucksmann', MAC), C: u(RN, 'eric-zemmour', 'florian-philippot', 'nicolas-dupont-aignan', 'bruno-retailleau', 'david-lisnard') },
  'encadrer-loyers': { P: u(FL, 'olivier-faure', 'jerome-guedj', 'philippe-brun', 'karim-bouamrane', 'emmanuel-maurel', 'francois-ruffin', 'marine-tondelier', 'delphine-batho', 'lydie-massard', 'raphael-glucksmann', ROU, 'segolene-royal'), C: u(MAC, LR, 'eric-zemmour') },
  'logements-sociaux': { P: u(FL, 'olivier-faure', 'jerome-guedj', 'philippe-brun', 'karim-bouamrane', 'emmanuel-maurel', 'francois-ruffin', 'marine-tondelier', 'delphine-batho', 'lydie-massard', 'raphael-glucksmann', ROU, 'segolene-royal', 'francois-hollande'), C: u(MAC, 'bruno-retailleau', 'david-lisnard', 'eric-zemmour') },
  'europe-ue': { P: u(MAC, 'olivier-faure', 'jerome-guedj', 'philippe-brun', 'karim-bouamrane', 'marine-tondelier', 'delphine-batho', 'lydie-massard', 'raphael-glucksmann', PSM, 'xavier-bertrand'), C: u('jean-luc-melenchon', 'anasse-kazib', 'selma-labib', 'juan-branco', 'francois-ruffin', 'emmanuel-maurel', RN, 'eric-zemmour', 'florian-philippot', 'nicolas-dupont-aignan', 'francois-asselineau', 'bruno-retailleau') },
  'ukraine-russie': { P: u(MAC, LR, 'olivier-faure', 'jerome-guedj', 'philippe-brun', 'karim-bouamrane', 'marine-tondelier', 'raphael-glucksmann', 'francois-ruffin', 'francois-hollande'), C: u('jean-luc-melenchon', 'anasse-kazib', 'selma-labib', 'nathalie-arthaud', 'juan-branco', 'florian-philippot', 'francois-asselineau', RN) },
  palestine: { P: u(FL, 'olivier-faure', 'jerome-guedj', 'philippe-brun', 'karim-bouamrane', 'emmanuel-maurel', 'francois-ruffin', 'marine-tondelier', 'delphine-batho', 'lydie-massard', 'raphael-glucksmann', ROU, 'segolene-royal', 'francois-hollande'), C: u('eric-zemmour') },
  'vie-republique': { P: u('jean-luc-melenchon', 'anasse-kazib', 'selma-labib', 'juan-branco', 'marine-tondelier', 'francois-ruffin', 'emmanuel-maurel', 'lydie-massard'), C: u(MAC, LR, 'eric-zemmour') },
  proportionnelle: { P: u('jean-luc-melenchon', 'anasse-kazib', 'selma-labib', 'juan-branco', 'olivier-faure', 'jerome-guedj', 'francois-ruffin', 'marine-tondelier', 'delphine-batho', 'emmanuel-maurel', 'lydie-massard', ROU, RN, 'florian-philippot', 'nicolas-dupont-aignan'), C: u(LR) },
  ric: { P: u('jean-luc-melenchon', 'anasse-kazib', 'selma-labib', 'juan-branco', 'francois-ruffin', 'marine-tondelier', 'emmanuel-maurel', 'lydie-massard', RN, 'florian-philippot', 'nicolas-dupont-aignan', 'francois-asselineau', ROU), C: u(MAC, LR) },
  voile: { P: u(RN, 'eric-zemmour', 'florian-philippot', 'nicolas-dupont-aignan', LR), C: u('jean-luc-melenchon', 'anasse-kazib', 'selma-labib', 'juan-branco', 'francois-ruffin', 'marine-tondelier', 'delphine-batho', 'lydie-massard', 'olivier-faure', 'jerome-guedj') },
  laicite: { P: u(MAC, LR, RN, 'eric-zemmour', 'florian-philippot', 'nicolas-dupont-aignan', ROU, 'jerome-guedj', 'karim-bouamrane', 'bernard-cazeneuve'), C: u('jean-luc-melenchon', 'anasse-kazib', 'selma-labib', 'juan-branco', 'marine-tondelier') },
  cannabis: { P: u('jean-luc-melenchon', 'anasse-kazib', 'selma-labib', 'juan-branco', 'marine-tondelier', 'delphine-batho', 'francois-ruffin', 'lydie-massard', 'raphael-glucksmann', 'olivier-faure'), C: u(RN, 'eric-zemmour', 'florian-philippot', 'nicolas-dupont-aignan', 'francois-asselineau', LR, MAC, ROU, 'bernard-cazeneuve') },
};

const lc = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const summary = (stance, prop) =>
  stance === 'pour' ? `Favorable à ${lc(prop)}.`
  : stance === 'contre' ? `Opposé·e à ${lc(prop)}.`
  : `Position nuancée sur la proposition : « ${prop} ».`;

async function upsertIssue(sb, slug, category, title, proposition, sort) {
  const payload = { category, title, proposition, sort_order: sort };
  const { data: upd, error: e1 } = await sb.from('issues').update(payload).eq('slug', slug).select('slug');
  if (e1) throw e1;
  if (!upd || upd.length === 0) {
    const { error: e2 } = await sb.from('issues').insert({ slug, ...payload, keywords: [] });
    if (e2) throw e2;
    return 'inséré';
  }
  return 'màj';
}

async function main() {
  console.log(`=== Refonte comparateur positions ${DRY ? '(SIMULATION)' : '(ÉCRITURE)'} ===`);
  if (!supabaseUrl || !key) { console.error('❌ URL / clé Supabase manquante.'); process.exit(1); }
  const sb = createClient(supabaseUrl, key, { auth: { persistSession: false } });

  // Construit les positions.
  const rows = [];
  ISSUES.forEach(([slug, , , prop]) => {
    const p = new Set(POS[slug]?.P || []);
    const c = new Set(POS[slug]?.C || []);
    for (const cand of ALL) {
      const stance = p.has(cand) ? 'pour' : c.has(cand) ? 'contre' : 'nuance';
      rows.push({ candidate_slug: cand, issue_slug: slug, stance, summary: summary(stance, prop), source_url: null });
    }
  });
  const tally = rows.reduce((a, r) => (a[r.stance] = (a[r.stance] || 0) + 1, a), {});
  console.log(`${ISSUES.length} enjeux × ${ALL.length} candidats = ${rows.length} positions → ${JSON.stringify(tally)}`);
  if (DRY) { console.log('\n(SIMULATION — aucune écriture.)'); return; }

  // 1) Enjeux du comparateur (update/insert).
  let n = 0;
  for (let i = 0; i < ISSUES.length; i++) {
    const [slug, cat, title, prop] = ISSUES[i];
    const a = await upsertIssue(sb, slug, cat, title, prop, i + 1);
    n++; if (a === 'inséré') console.log(`  + ${slug}`);
  }
  console.log(`${n} enjeux du comparateur écrits.`);

  // 2) Neutralise les enjeux larges remplacés : proposition VIDE (le comparateur filtre sur
  //    `if (!i.proposition)`, donc '' les exclut ; on garde le slug pour le tagging scrutins/élus).
  const { error: supErr } = await sb.from('issues').update({ proposition: '' }).in('slug', SUPERSEDED);
  if (supErr) throw supErr;
  console.log(`${SUPERSEDED.length} enjeux larges neutralisés (proposition vide).`);

  // 3) Réécrit candidate_positions.
  const { error: delErr } = await sb.from('candidate_positions').delete().neq('candidate_slug', '__none__');
  if (delErr) throw delErr;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 300) {
    const batch = rows.slice(i, i + 300);
    const { error } = await sb.from('candidate_positions').insert(batch);
    if (error) throw error;
    inserted += batch.length;
  }
  console.log(`=== Terminé : ${inserted} positions écrites sur ${ISSUES.length} enjeux ===`);
}

main().catch((e) => { console.error('Erreur fatale :', e.message || e); process.exit(1); });
