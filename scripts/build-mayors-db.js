/**
 * Script: Convertit le CSV RNE Maires en JSON compact
 * Source: https://www.data.gouv.fr/fr/datasets/repertoire-national-des-elus-1/
 */

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, 'rne_maires.csv');
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'data', 'mayors.json');

// Known party affiliations for major cities
const KNOWN_PARTIES = {
  "75056": "PS", "13055": "DVG", "69123": "EELV", "31555": "LR",
  "06088": "Horizons", "44109": "PS", "34172": "DVG", "67482": "EELV",
  "33063": "EELV", "59350": "EELV", "35238": "PS", "51454": "LR",
  "76540": "Horizons", "42218": "DVG", "21231": "PS", "38185": "EELV",
  "49007": "LR", "37261": "DVG", "63113": "LR", "29019": "PS",
  "80021": "LR", "14118": "LR", "57463": "DVD", "72181": "DVG",
  "30189": "DVD", "13001": "DVG", "83137": "LR",
  "97105": "DVG", "97209": "DVG", "97302": "DVG", "97411": "DVG",
  "25056": "EELV", "45234": "LR", "54395": "PS", "87085": "PS",
  "86194": "DVG", "68224": "DVD", "66136": "RN", "62041": "RN",
};

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ';' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function formatName(prenom, nom) {
  if (!prenom && !nom) return '';
  
  function capitalize(s) {
    return s.split(/(\s+|-)/g).map(part => {
      if (part === ' ' || part === '-') return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    }).join('');
  }
  
  const p = capitalize(prenom || '');
  const n = capitalize(nom || '');
  return `${p} ${n}`.trim();
}

function buildMayorsDb() {
  console.log('Reading CSV...');
  
  // Read as UTF-8 (the RNE CSV from data.gouv.fr is UTF-8 encoded)
  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = raw.split('\n').filter(l => l.trim().length > 0);
  
  console.log(`${lines.length - 1} lines found`);
  
  const mayors = {};
  let skipped = 0;
  
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i].replace(/\r$/, ''));
    
    if (cols.length < 13) { skipped++; continue; }
    
    const codeCommune = cols[4];
    const nom = cols[6];
    const prenom = cols[7];
    const sexe = cols[8];
    const dateMandat = cols[12];
    
    if (!codeCommune || !nom) { skipped++; continue; }

    const fullCode = codeCommune.toString().padStart(5, '0');
    const fullName = formatName(prenom, nom);
    
    const entry = {
      n: fullName,
      s: sexe,
      d: dateMandat,
    };
    
    if (KNOWN_PARTIES[fullCode]) {
      entry.p = KNOWN_PARTIES[fullCode];
    }
    
    mayors[fullCode] = entry;
  }
  
  console.log(`${Object.keys(mayors).length} mayors extracted`);
  console.log(`${skipped} lines skipped`);
  
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(mayors), 'utf8');
  
  const stats = fs.statSync(OUTPUT_PATH);
  console.log(`Output: ${OUTPUT_PATH}`);
  console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  
  // Samples
  console.log('\nSamples:');
  ['75056', '13055', '69123', '31555', '06088'].forEach(code => {
    if (mayors[code]) {
      console.log(`  ${code}: ${JSON.stringify(mayors[code])}`);
    }
  });
}

buildMayorsDb();
