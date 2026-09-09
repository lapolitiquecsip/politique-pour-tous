/**
 * CRON SCRIPT: update-borrowing-rates.js
 *
 * Objectif : mettre à jour CHAQUE JOUR le taux d'emprunt de l'État à 10 ans
 * (obligations souveraines) pour la France et les principaux pays de comparaison,
 * dont les États-Unis et le Royaume-Uni — en temps quasi réel.
 *
 * Sources (gratuites, sans clé) :
 *  - CNBC (quote service)  → taux de marché à 10 ans, une seule source cohérente pour
 *    FR, US, GB (UK), DE, IT, ES, BE, NL. Valeurs « last » horodatées (intraday).
 *  - BCE (ECB Data Portal) → agrégat « zone euro » (courbe des taux, 10 ans, tous émetteurs).
 *
 * Écriture : table `national_finance_indicators`, sous de NOUVEAUX codes
 * `bond_yield_10y_<GEO>` (pour NE PAS entrer en conflit avec le cron Eurostat MENSUEL
 * existant qui écrit `long_term_rate_<GEO>`). Le front lit en priorité les codes
 * quotidiens `bond_yield_10y_*` et retombe sur `long_term_rate_*` si absents.
 *
 * Exécution : GitHub Actions (cron quotidien) — voir .github/workflows/update-borrowing-rates.yml
 * Résilience : chaque pays est indépendant ; si une source échoue, l'ancienne valeur en
 * base est CONSERVÉE (aucun écrasement par une valeur nulle).
 */

// Chargement optionnel de .env.local pour le dev local. En CI (GitHub Actions), `dotenv`
// n'est pas installé et les variables viennent directement de l'environnement du workflow :
// le try/catch évite tout crash « Cannot find module 'dotenv' ».
try { require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') }); } catch { /* variables déjà dans process.env */ }
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABLE = 'national_finance_indicators';

// CNBC : symbole → code géo interne. Une seule requête groupée (séparateur « | »).
const CNBC = {
  'US10Y': 'US',
  'FR10Y-FR': 'FR',
  'GB10Y-GB': 'GB',
  'DE10Y-DE': 'DE',
  'IT10Y-IT': 'IT',
  'ES10Y-ES': 'ES',
  'BE10Y-BE': 'BE',
  'NL10Y-NL': 'NL',
};
const CNBC_URL = 'https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol'
  + '?symbols=' + Object.keys(CNBC).join('|')
  + '&requestMethod=itv&noform=1&partnerId=2&output=json';
const CNBC_SOURCE = 'https://www.cnbc.com/bonds/';

// BCE : courbe des taux zone euro, 10 ans, TOUS émetteurs/toutes notations (agrégat le
// plus proche d'une « moyenne zone euro »).
const ECB_URL = 'https://data-api.ecb.europa.eu/service/data/YC/'
  + 'B.U2.EUR.4F.G_N_C.SV_C_YM.SR_10Y?lastNObservations=1&format=csvdata';
const ECB_SOURCE = 'https://data.ecb.europa.eu/';

const UA = 'Mozilla/5.0 (compatible; lapolitiquecestsimple-bot/1.0)';

// Récupère les taux de marché CNBC → [{ geo, value, at }]
async function fetchCnbc() {
  const res = await fetch(CNBC_URL, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`CNBC HTTP ${res.status}`);
  const json = await res.json();
  const quotes = json?.FormattedQuoteResult?.FormattedQuote || [];
  const out = [];
  for (const q of quotes) {
    const geo = CNBC[q.symbol];
    if (!geo) continue;
    const value = parseFloat(String(q.last).replace(/[%\s]/g, '').replace(',', '.'));
    if (!Number.isFinite(value)) { console.warn(`  ⚠ CNBC ${q.symbol} valeur illisible: ${q.last}`); continue; }
    const at = q.last_time ? new Date(q.last_time) : new Date();
    out.push({ geo, value, at: Number.isNaN(at.getTime()) ? new Date() : at, source: CNBC_SOURCE });
  }
  return out;
}

// Récupère l'agrégat zone euro (BCE). Renvoie { geo:'EA', value, at } ou null.
async function fetchEuroArea() {
  const res = await fetch(ECB_URL, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`ECB HTTP ${res.status}`);
  const csv = await res.text();
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('ECB CSV vide');
  const header = lines[0].split(',');
  const row = lines[1].split(',');
  const iVal = header.indexOf('OBS_VALUE');
  const iTime = header.indexOf('TIME_PERIOD');
  const value = parseFloat(row[iVal]);
  if (!Number.isFinite(value)) throw new Error(`ECB valeur illisible: ${row[iVal]}`);
  const at = iTime >= 0 && row[iTime] ? new Date(row[iTime] + 'T00:00:00Z') : new Date();
  return { geo: 'EA', value, at: Number.isNaN(at.getTime()) ? new Date() : at, source: ECB_SOURCE };
}

// Upsert résilient (update sinon insert) — indépendant du nom exact de la contrainte unique.
async function upsertRate(sb, { geo, value, at, source }) {
  const code = `bond_yield_10y_${geo}`;
  const payload = {
    reference_year: at.getUTCFullYear(),
    value: Math.round(value * 1000) / 1000, // 3 décimales max
    unit: '%',
    value_type: 'observed',
    source_urls: [source],
    source_updated_at: at.toISOString(),
    collected_at: new Date().toISOString(),
  };
  const { data: upd, error: e1 } = await sb.from(TABLE).update(payload).eq('indicator_code', code).select('indicator_code');
  if (e1) throw e1;
  if (!upd || upd.length === 0) {
    const { error: e2 } = await sb.from(TABLE).insert({ indicator_code: code, ...payload });
    if (e2) throw e2;
    return 'inséré';
  }
  return 'mis à jour';
}

async function main() {
  console.log('=== Mise à jour des taux d\'emprunt à 10 ans (quotidien) ===');
  if (!supabaseUrl || !supabaseKey) { console.error('❌ Variables Supabase manquantes.'); process.exit(1); }
  const sb = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  // 1) Collecte des sources (indépendantes : un échec n'empêche pas les autres).
  let rates = [];
  try {
    const cnbc = await fetchCnbc();
    console.log(`✓ CNBC : ${cnbc.length} pays récupérés`);
    rates = rates.concat(cnbc);
  } catch (e) { console.error(`✗ CNBC échec : ${e.message} (les taux pays gardent leur valeur précédente)`); }

  try {
    const ea = await fetchEuroArea();
    console.log(`✓ BCE zone euro : ${ea.value} % (${ea.at.toISOString().slice(0, 10)})`);
    rates.push(ea);
  } catch (e) { console.error(`✗ BCE échec : ${e.message} (zone euro garde sa valeur précédente)`); }

  if (rates.length === 0) { console.error('❌ Aucune source disponible, rien à écrire.'); process.exit(1); }

  // 2) Écriture (résiliente, par pays).
  let ok = 0;
  for (const r of rates) {
    try {
      const action = await upsertRate(sb, r);
      console.log(`  • ${r.geo.padEnd(3)} ${String(r.value).padStart(7)} %  → ${action}`);
      ok++;
    } catch (e) { console.error(`  ✗ ${r.geo} non écrit : ${e.message}`); }
  }

  console.log(`=== Terminé : ${ok}/${rates.length} taux écrits ===`);
  if (ok === 0) process.exit(1);
}

main().catch((e) => { console.error('Erreur fatale :', e); process.exit(1); });
