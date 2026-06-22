const fs = require('fs');
const path = require('path');

const MAYORS_PATH = path.join(__dirname, '../public/data/mayors.json');
const T1_CSV_PATH = path.join(__dirname, 'municipales_t1_communes.csv');
const T2_CSV_PATH = path.join(__dirname, 'municipales_t2_communes.csv');
const OUTPUT_PATH = path.join(__dirname, '../public/data/election_results.json');

function normalizeName(name) {
    if (!name) return '';
    return name.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z]/g, '');
}

function parseCSV(filePath) {
    console.log(`Parsing ${filePath}...`);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    // Clean headers: remove quotes and BOM
    const header = lines[0].replace(/^\uFEFF/, '').split(';').map(h => h.replace(/"/g, '').trim());
    console.log('Header sample:', header.slice(0, 10));
    
    const results = {};

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cells = lines[i].split(';').map(c => c.replace(/"/g, '').trim());
        
        const depCodeRaw = cells[0];
        const comCodeRaw = cells[2];
        if (!depCodeRaw || !comCodeRaw) continue;

        const depCode = depCodeRaw.padStart(2, '0');
        const comCode = comCodeRaw.slice(-3).padStart(3, '0'); // INSEE is usually Dep + 3 digits
        const insee = depCode + comCode;

        const candidates = [];
        for (let c = 1; c <= 20; c++) {
            const nameIdx = header.findIndex(h => h === `Nom candidat ${c}`);
            const firstNameIdx = header.findIndex(h => h === `Prénom candidat ${c}`);
            const nuanceIdx = header.findIndex(h => h === `Nuance liste ${c}`);
            const libelleIdx = header.findIndex(h => h === `Libellé de liste ${c}`);
            const scoreIdx = header.findIndex(h => h === `% Voix/exprimés ${c}`);

            if (nameIdx === -1) break;

            const name = cells[nameIdx] || '';
            const firstName = cells[firstNameIdx] || '';
            const nuance = cells[nuanceIdx] || '';
            const libelle = cells[libelleIdx] || '';
            const scoreRaw = cells[scoreIdx]?.replace(',', '.').replace('%', '').trim();
            const score = parseFloat(scoreRaw);

            if (name || nuance || libelle) {
                candidates.push({
                    name: name ? `${firstName} ${name}`.trim() : (libelle || nuance),
                    party: nuance,
                    score: score || 0
                });
            } else if (c > 3) {
                // If we have no info for candidate X and X > 3, we probably reached the end
                break;
            }
        }

        if (candidates.length > 0) {
            results[insee] = candidates;
        }
    }
    return results;
}

async function run() {
    const mayors = JSON.parse(fs.readFileSync(MAYORS_PATH, 'utf8'));
    const t1Results = parseCSV(T1_CSV_PATH);
    const t2Results = parseCSV(T2_CSV_PATH);

    console.log(`T1 parsed: ${Object.keys(t1Results).length}`);
    console.log(`T2 parsed: ${Object.keys(t2Results).length}`);

    const electionData = {};

    for (const insee in mayors) {
        const mayorInfo = mayors[insee];
        const mayorNameNorm = normalizeName(mayorInfo.n);
        
        // Prefer T2 results if available, else T1
        const candidates = t2Results[insee] || t1Results[insee];

        if (candidates) {
            let mayorCandidate = null;
            let maxScoreCand = candidates[0];
            for (const cand of candidates) {
                if (cand.score > (maxScoreCand?.score || 0)) maxScoreCand = cand;
                
                const candNameNorm = normalizeName(cand.name);
                if (mayorNameNorm && (candNameNorm === mayorNameNorm || candNameNorm.includes(mayorNameNorm) || mayorNameNorm.includes(candNameNorm))) {
                    mayorCandidate = cand;
                }
            }

            // Fallback to max score if no name match
            if (!mayorCandidate) mayorCandidate = maxScoreCand;

            const competitors = [];
            for (const cand of candidates) {
                if (cand === mayorCandidate) continue;
                competitors.push({
                    p: cand.party,
                    s: cand.score
                });
            }

            // Sort competitors by score
            competitors.sort((a, b) => b.s - a.s);

            electionData[insee] = {
                m_score: mayorCandidate ? mayorCandidate.score : null,
                comp: competitors
            };
        }
    }

    console.log(`Saving ${Object.keys(electionData).length} results...`);
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(electionData));
    console.log('Done.');
}

run().catch(console.error);
