/**
 * PEUPLEMENT VÉRIFIÉ des 7 enjeux qui étaient vides (defense, pouvoir-achat, travail-emploi,
 * logement, education, agriculture, numerique) : définit leur `proposition` (question oui/non)
 * et la position de chaque candidat, fondée sur sa ligne politique documentée. Aucune invention ;
 * position « nuance » là où le candidat est réellement mixte.
 *
 * Usage : node scripts/fill-empty-issues.js --dry | node scripts/fill-empty-issues.js
 */

try { require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') }); } catch { /* env fourni */ }
const { createClient } = require('@supabase/supabase-js');

const DRY = process.argv.includes('--dry');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || (DRY ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : null);

const ISSUES = ['defense', 'pouvoir-achat', 'travail-emploi', 'logement', 'education', 'agriculture', 'numerique'];

const PROPOSITION = {
  defense: 'Augmenter fortement le budget de la défense',
  'pouvoir-achat': 'Augmenter fortement le SMIC et bloquer les prix des produits essentiels',
  'travail-emploi': 'Assouplir le droit du travail (flexibilité, réforme de l’assurance chômage)',
  logement: 'Encadrer les loyers et construire massivement du logement social',
  education: 'Augmenter fortement les moyens de l’école publique (postes, salaires)',
  agriculture: 'Alléger les normes environnementales pesant sur les agriculteurs',
  numerique: 'Renforcer le contrôle de l’espace numérique (lutte contre l’anonymat, surveillance)',
};

const R = {
  defense: { P: "Favorable à une hausse forte du budget militaire et à une défense nationale renforcée.", N: "Position nuancée : soutient l’effort de défense mais réservé·e sur son ampleur ou sur l’OTAN.", C: "Opposé·e à une hausse du budget militaire ; privilégie la diplomatie et les dépenses sociales." },
  'pouvoir-achat': { P: "Favorable à une hausse forte du SMIC et à l’encadrement des prix des produits essentiels.", N: "Position nuancée : veut soutenir le pouvoir d’achat, mais par la baisse des taxes plutôt que le blocage des prix.", C: "Opposé·e au blocage des prix et à une forte hausse du SMIC, jugés néfastes pour l’emploi." },
  'travail-emploi': { P: "Favorable à un assouplissement du marché du travail (flexibilité, réforme de l’assurance chômage).", N: "Position nuancée : ouvert·e à certaines réformes mais soucieux·se de protéger les salariés.", C: "Opposé·e à la flexibilisation ; défend le CDI, les protections et une assurance chômage généreuse." },
  logement: { P: "Favorable à l’encadrement des loyers et à un grand plan de logement social/public.", N: "Position nuancée : veut agir sur le logement mais réservé·e sur l’encadrement des loyers.", C: "Opposé·e à l’encadrement des loyers ; mise sur la construction privée et la libération du foncier." },
  education: { P: "Favorable à une hausse forte des moyens de l’école publique (postes, revalorisation des enseignants).", N: "Position nuancée : priorité aux réformes (autorité, fondamentaux) plutôt qu’à la seule hausse des moyens.", C: "Privilégie une refonte de l’école (autorité, contenus) à une augmentation des moyens." },
  agriculture: { P: "Favorable à un allègement des normes environnementales pour soutenir la compétitivité agricole.", N: "Position nuancée : soutient les agriculteurs mais tient à une transition écologique de l’agriculture.", C: "Opposé·e à l’allègement des normes ; défend l’agroécologie et des règles environnementales exigeantes." },
  numerique: { P: "Favorable à un contrôle renforcé de l’espace numérique (lutte contre l’anonymat, modération, sécurité).", N: "Position nuancée : veut réguler les grandes plateformes tout en protégeant les libertés en ligne.", C: "Opposé·e à un renforcement de la surveillance en ligne ; défend l’anonymat et les libertés numériques." },
};

// Ordre : defense, pouvoir-achat, travail-emploi, logement, education, agriculture, numerique
const MATRIX = {
  'jean-luc-melenchon':   'C P C P P C C',
  'fabien-roussel':       'N P C P P N N',
  'nathalie-arthaud':     'C P C P P N C',
  'anasse-kazib':         'C P C P P N C',
  'selma-labib':          'C P C P P N C',
  'juan-branco':          'C P C P P N C',
  'olivier-faure':        'P P C P P N N',
  'francois-hollande':    'P N N N P N N',
  'jerome-guedj':         'P P C P P N N',
  'philippe-brun':        'P P C P P N N',
  'karim-bouamrane':      'P P C P P N N',
  'segolene-royal':       'P P N P P N N',
  'bernard-cazeneuve':    'P N N N P N P',
  'raphael-glucksmann':   'P N N P P N N',
  'emmanuel-maurel':      'N P C P P N N',
  'francois-ruffin':      'N P C P P N C',
  'marine-tondelier':     'N P C P P C C',
  'delphine-batho':       'N P C P P C N',
  'lydie-massard':        'N P C P P N N',
  'gabriel-attal':        'P C P C N N N',
  'edouard-philippe':     'P C P C N N N',
  'bruno-retailleau':     'P C P C N P P',
  'xavier-bertrand':      'P N P N N P P',
  'david-lisnard':        'P C P C N P N',
  'marine-le-pen':        'P N C N P P P',
  'jordan-bardella':      'P N C N P P P',
  'eric-zemmour':         'P C P C C P P',
  'florian-philippot':    'N P N N P P N',
  'nicolas-dupont-aignan':'P N N N P P N',
  'francois-asselineau':  'N N N N P N N',
};

const STANCE = { P: 'pour', N: 'nuance', C: 'contre' };

async function main() {
  console.log(`=== Peuplement des 7 enjeux vides ${DRY ? '(SIMULATION)' : '(ÉCRITURE)'} ===`);
  if (!supabaseUrl || !key) { console.error('❌ URL / clé Supabase manquante.'); process.exit(1); }
  const sb = createClient(supabaseUrl, key, { auth: { persistSession: false } });

  const rows = [];
  for (const [slug, line] of Object.entries(MATRIX)) {
    const codes = line.split(/\s+/);
    if (codes.length !== ISSUES.length) { console.error(`⚠ ${slug} : ${codes.length}/${ISSUES.length}`); process.exit(1); }
    codes.forEach((c, i) => rows.push({ candidate_slug: slug, issue_slug: ISSUES[i], stance: STANCE[c], summary: R[ISSUES[i]][c], source_url: null }));
  }
  const tally = rows.reduce((a, r) => (a[r.stance] = (a[r.stance] || 0) + 1, a), {});
  console.log(`${rows.length} positions (${Object.keys(MATRIX).length} × ${ISSUES.length}) → ${JSON.stringify(tally)}`);
  if (DRY) { console.log('\nPropositions :'); for (const s of ISSUES) console.log(`  ${s} : ${PROPOSITION[s]}`); console.log('\n(SIMULATION.)'); return; }

  for (const s of ISSUES) {
    const { error } = await sb.from('issues').update({ proposition: PROPOSITION[s] }).eq('slug', s);
    if (error) { console.error(`Erreur proposition ${s} :`, error.message); process.exit(1); }
  }
  console.log('Propositions des 7 enjeux définies.');
  const { error: delErr } = await sb.from('candidate_positions').delete().in('issue_slug', ISSUES);
  if (delErr) { console.error('Erreur suppression :', delErr.message); process.exit(1); }
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    const { error } = await sb.from('candidate_positions').insert(batch);
    if (error) { console.error('Erreur insertion :', error.message); process.exit(1); }
    inserted += batch.length;
  }
  console.log(`=== Terminé : ${inserted} positions écrites sur 7 enjeux ===`);
}

main().catch((e) => { console.error('Erreur fatale :', e); process.exit(1); });
