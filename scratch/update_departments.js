const fs = require('fs');

const presidents = JSON.parse(fs.readFileSync('scratch/presidents.json', 'utf8'));
const territoriesPath = 'src/lib/data/territories.ts';
let content = fs.readFileSync(territoriesPath, 'utf8');

const lines = content.split('\n');
let inDepartments = false;
const newLines = lines.map(line => {
    if (line.includes('export const DEPARTMENTS')) {
        inDepartments = true;
        return line;
    }
    if (inDepartments && line.includes('"id":')) {
        const match = line.match(/"id": "([^"]+)"/);
        if (match) {
            const id = match[1];
            const p = presidents.find(pres => pres.id === id && pres.type === 'department');
            if (p) {
                // Find next lines for name and president
                return line; // current line is id
            }
        }
    }
    // Simple regex approach within the line for president
    if (inDepartments && line.includes('"president":')) {
        // We need the ID from the previous lines. This is hard with map.
    }
    return line;
});

// Let's use a global regex with state
content = content.replace(/{[\s\n]*"id": "([^"]+)",[\s\n]*"name": "([^"]+)",[\s\n]*"president": "([^"]+)",[\s\n]*"party": "([^"]+)"[\s\n]*}/g, (match, id, name, oldPres, party) => {
    const p = presidents.find(pres => pres.id === id && pres.type === 'department');
    if (p) {
        return `{
    "id": "${id}",
    "name": "${name}",
    "president": "${p.president}",
    "party": "${party}"
  }`;
    }
    return match;
});

fs.writeFileSync(territoriesPath, content);
console.log('Departments updated.');
