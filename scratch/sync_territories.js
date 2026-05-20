require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

// Minimal implementation of syncTerritoryPresidents for the script
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function sync() {
  console.log('Fetching RNE data...');
  const res = await fetch('https://www.data.gouv.fr/api/1/datasets/repertoire-national-des-elus-1/');
  const dataset = await res.json();
  
  const depResource = dataset.resources.find(r => /d.partementaux/i.test(r.title) && r.format === 'csv');
  const regResource = dataset.resources.find(r => /r.gionaux/i.test(r.title) && r.format === 'csv');

  console.log('Downloading DEP CSV...');
  const depCsvRes = await fetch(depResource.url);
  const depCsv = await depCsvRes.text();
  
  console.log('Downloading REG CSV...');
  const regCsvRes = await fetch(regResource.url);
  const regCsv = await regCsvRes.text();

  const allPresidents = [];
  const process = async (csv, type) => {
    const lines = csv.split('\n');
    const header = lines[0].split(';').map(h => h.replace(/"/g, '').trim());
    const codeIdx = header.findIndex(h => h.startsWith('Code d') && (h.includes('région') || h.includes('département')));
    const nameIdx = header.findIndex(h => h.startsWith('Libellé d') && (h.includes('région') || h.includes('département')));
    const nomIdx = header.findIndex(h => h === "Nom de l'élu");
    const prenomIdx = header.findIndex(h => h === "Prénom de l'élu");
    const fonctionIdx = header.findIndex(h => h.toLowerCase().includes('fonction'));
    const nuanceIdx = header.findIndex(h => h.toLowerCase().includes('nuance'));

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cells = lines[i].split(';').map(c => c.replace(/"/g, '').trim());
      const fonction = cells[fonctionIdx];
      if (fonction && (fonction.includes('Président du conseil') || fonction.includes('Présidente du conseil'))) {
        const p = {
          id: cells[codeIdx]?.replace(/"/g, '').padStart(2, '0'),
          name: cells[nameIdx]?.replace(/"/g, ''),
          type,
          president: `${cells[prenomIdx]?.replace(/"/g, '')} ${cells[nomIdx]?.replace(/"/g, '')}`,
          party: cells[nuanceIdx]?.replace(/"/g, '') || 'N/A'
        };
        allPresidents.push(p);
      }
    }
  };

  await process(depCsv, 'department');
  await process(regCsv, 'region');
  
  require('fs').writeFileSync('scratch/presidents.json', JSON.stringify(allPresidents, null, 2));
}

sync().then(() => console.log('Done')).catch(console.error);
