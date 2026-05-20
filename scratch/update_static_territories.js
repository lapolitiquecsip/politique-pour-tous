const fs = require('fs');
const path = require('path');

const presidents = JSON.parse(fs.readFileSync('scratch/presidents.json', 'utf8'));
const territoriesPath = 'src/lib/data/territories.ts';
let content = fs.readFileSync(territoriesPath, 'utf8');

// Update REGIONS
presidents.filter(p => p.type === 'region').forEach(p => {
    const regex = new RegExp(`({ id: "${p.id}", name: "[^"]+", president: ")[^"]+(")`, 'g');
    if (content.match(regex)) {
        content = content.replace(regex, `$1${p.president}$2`);
    } else {
        // Try without exact name match if ID matches
        const regex2 = new RegExp(`({ id: "${p.id}",[^}]+president: ")[^"]+(")`, 'g');
        content = content.replace(regex2, `$1${p.president}$2`);
    }
});

// Update DEPARTMENTS
presidents.filter(p => p.type === 'department').forEach(p => {
    const regex = new RegExp(`({ id: "${p.id}", name: "[^"]+", president: ")[^"]+(")`, 'g');
    if (content.match(regex)) {
        content = content.replace(regex, `$1${p.president}$2`);
    } else {
        const regex2 = new RegExp(`({ id: "${p.id}",[^}]+president: ")[^"]+(")`, 'g');
        content = content.replace(regex2, `$1${p.president}$2`);
    }
});

fs.writeFileSync(territoriesPath, content);
console.log('Static territories updated.');
