/**
 * BACKFILL VÉRIFIÉ des fiches maires (communes > 3000 hab) depuis le RNE officiel.
 *
 * Contexte : les photos et les bios narratives des maires nouvellement élus (municipales de
 * mars 2026) n'existent PAS dans une source libre vérifiable (Wikidata/Wikipédia ne couvrent
 * que les élus déjà notables, et leur donnée « maire » est de surcroît périmée). On NE fabrique
 * donc RIEN. Ce script complète uniquement ce qui est OFFICIEL et vérifié, depuis le Répertoire
 * National des Élus (scripts/rne_maires.csv) :
 *   - bio.profession  : catégorie socio-professionnelle déclarée (remplit la ligne PROFESSION).
 *   - bio.summary     : une phrase 100 % factuelle (nom, commune, mandat mars 2026), genrée via le RNE.
 * Matching par CODE INSEE (aucun risque d'homonyme). N'écrase jamais une bio déjà présente.
 *
 * Usage :
 *   node scripts/enrich-mayors-rne.js --dry     → simulation (lecture seule, clé anon suffit)
 *   node scripts/enrich-mayors-rne.js           → écriture (nécessite SUPABASE_SERVICE_ROLE_KEY)
 */

try { require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') }); } catch { /* env déjà fourni */ }
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry');
const RNE_PATH = path.join(__dirname, 'rne_maires.csv');
const MIN_POP = 3000;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Découpe une ligne CSV « ; » en respectant les guillemets.
function splitCsv(line) {
  const out = []; let cur = ''; let inq = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (inq && line[i + 1] === '"') { cur += '"'; i++; } else inq = !inq; }
    else if (c === ';' && !inq) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

// insee : « Code de la commune » du RNE → code INSEE 5 caractères.
const toInsee = (code) => (/^\d+$/.test(code) ? code.padStart(5, '0') : code.trim());

// Parse le RNE → Map(insee5 → { profession, sexe }).
function loadRne() {
  const raw = fs.readFileSync(RNE_PATH, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const header = splitCsv(lines[0]).map((h) => h.replace(/^"|"$/g, ''));
  const iInsee = header.indexOf('Code de la commune');
  const iSexe = header.indexOf('Code sexe');
  const iProf = header.indexOf('Libellé de la catégorie socio-professionnelle');
  const map = new Map();
  for (let i = 1; i < lines.length; i++) {
    const f = splitCsv(lines[i]).map((x) => x.replace(/^"|"$/g, '').trim());
    const insee = toInsee(f[iInsee] || '');
    if (!insee) continue;
    map.set(insee, { profession: f[iProf] || '', sexe: f[iSexe] || '' });
  }
  return map;
}

// Phrase factuelle (aucune donnée inventée : tout vient du RNE / de la base).
function buildSummary(m, rne) {
  const elu = rne.sexe === 'F' ? 'élue' : 'élu';
  const pop = m.population ? ` (${Number(m.population).toLocaleString('fr-FR')} habitants)` : '';
  const prof = rne.profession ? `, ${rne.profession.toLowerCase()},` : '';
  return `${m.full_name}${prof} est maire de ${m.commune_name}${pop}. ${rne.sexe === 'F' ? 'Elle' : 'Il'} a été ${elu} lors des élections municipales de mars 2026.`;
}

async function main() {
  console.log(`=== Backfill maires >${MIN_POP} hab depuis le RNE ${DRY ? '(SIMULATION)' : '(ÉCRITURE)'} ===`);
  if (!supabaseUrl) { console.error('❌ NEXT_PUBLIC_SUPABASE_URL manquant.'); process.exit(1); }
  const key = DRY ? (anonKey || serviceKey) : serviceKey;
  if (!key) { console.error(`❌ ${DRY ? 'Clé anon' : 'SUPABASE_SERVICE_ROLE_KEY'} manquante.`); process.exit(1); }
  const sb = createClient(supabaseUrl, key, { auth: { persistSession: false } });

  const rne = loadRne();
  console.log(`RNE chargé : ${rne.size} maires.`);

  let scanned = 0, unmatched = 0, toFillProf = 0, toFillSummary = 0, written = 0;
  const samples = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('mayors')
      .select('insee_code, full_name, commune_name, population, bio')
      .gt('population', MIN_POP).range(from, from + 999);
    if (error) { console.error('Erreur lecture mayors :', error.message); process.exit(1); }
    if (!data || !data.length) break;

    for (const m of data) {
      scanned++;
      const r = rne.get(m.insee_code);
      if (!r) { unmatched++; continue; }
      const bio = { ...(m.bio || {}) };
      let changed = false;
      if (!bio.profession && r.profession) { bio.profession = r.profession; toFillProf++; changed = true; }
      if (!bio.summary) { bio.summary = buildSummary(m, r); toFillSummary++; changed = true; }
      if (!changed) continue;
      if (samples.length < 6) samples.push(`${m.commune_name} — ${m.full_name} | prof:${bio.profession || '—'} | ${bio.summary}`);
      if (!DRY) {
        const { error: e } = await sb.from('mayors').update({ bio }).eq('insee_code', m.insee_code);
        if (e) console.error(`  ✗ ${m.insee_code} : ${e.message}`); else written++;
      }
    }
    if (data.length < 1000) break;
  }

  console.log(`\nMaires >${MIN_POP} balayés : ${scanned}`);
  console.log(`  non trouvés dans le RNE (INSEE) : ${unmatched}`);
  console.log(`  professions à remplir : ${toFillProf}`);
  console.log(`  résumés à remplir     : ${toFillSummary}`);
  if (!DRY) console.log(`  lignes écrites        : ${written}`);
  console.log('\nExemples :');
  for (const s of samples) console.log('  ', s);
  if (DRY) console.log('\n(SIMULATION — aucune écriture. Relancer sans --dry avec la clé service pour appliquer.)');
}

main().catch((e) => { console.error('Erreur fatale :', e); process.exit(1); });
