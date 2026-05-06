const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'ministres-photos';
const DATA_FILE = path.join(__dirname, '../src/lib/data/ministersBios.json');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Erreur : SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans le .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function downloadImage(url) {
  // Use weserv.nl proxy to bypass Wikipedia blocking
  // Some proxies prefer the URL without the protocol
  const targetUrl = url.replace('https://', '').replace('http://', '');
  const proxiedUrl = `https://images.weserv.nl/?url=${encodeURIComponent(targetUrl)}&w=1000&output=jpg`;
  
  console.log(`\n📥 Téléchargement : ${url}`);
  try {
    const response = await axios({
      url: proxiedUrl,
      method: 'GET',
      responseType: 'arraybuffer',
      timeout: 15000
    });
    return Buffer.from(response.data);
  } catch (error) {
    console.error(`❌ Échec du téléchargement : ${error.message}`);
    return null;
  }
}

async function uploadToSupabase(buffer, filename) {
  console.log(`📤 Upload vers Supabase : ${filename}`);
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filename, buffer, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (error) {
    console.error(`❌ Échec de l'upload : ${error.message}`);
    return null;
  }

  const { data: publicData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filename);

  return publicData.publicUrl;
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function main() {
  console.log('🚀 Démarrage du script de scraping et d\'upload...');

  if (!fs.existsSync(DATA_FILE)) {
    console.error('❌ Fichier de données introuvable :', DATA_FILE);
    return;
  }

  const ministers = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  let updatedCount = 0;

  for (const minister of ministers) {
    // On ne traite que si c'est une URL externe (Wikipédia) ou si on veut forcer l'update
    if (minister.image && (minister.image.includes('wikimedia.org') || minister.image.includes('wikipedia.org'))) {
      const filename = `${slugify(minister.name)}.jpg`;
      const buffer = await downloadImage(minister.image);

      if (buffer) {
        const publicUrl = await uploadToSupabase(buffer, filename);
        if (publicUrl) {
          minister.image = publicUrl;
          minister.imageSource = 'supabase';
          updatedCount++;
          console.log(`✅ Succès pour ${minister.name}`);
        }
      }
    } else {
      console.log(`⏩ Passage pour ${minister.name} (déjà sur Supabase ou URL non-Wikipédia)`);
    }
  }

  if (updatedCount > 0) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(ministers, null, 2));
    console.log(`\n🎉 Terminé ! ${updatedCount} ministres mis à jour dans ministersBios.json`);
  } else {
    console.log('\n✨ Aucune mise à jour nécessaire.');
  }
}

main();
