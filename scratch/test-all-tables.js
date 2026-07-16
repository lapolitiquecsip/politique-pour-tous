const fs = require('fs');
const https = require('https');

console.log("Loading .env.local...");
try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach(line => {
    const idx = line.indexOf('=');
    if (idx !== -1) {
      const key = line.substring(0, idx).trim();
      const val = line.substring(idx + 1).trim();
      process.env[key] = val;
    }
  });
} catch (err) {
  console.error("Could not load .env.local:", err.message);
}

const urlString = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rsudvwqgjesswmssqcvi.supabase.co';
const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const tablesToTest = ['vocabulary', 'deputies', 'scrutins', 'petitions', 'laws'];

function queryTable(tableName) {
  return new Promise((resolve) => {
    const restUrl = `${urlString}/rest/v1/${tableName}?limit=1`;
    const urlObj = new URL(restUrl);
    
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 5000 // 5 seconds timeout per table
    };

    console.log(`[${tableName}] Querying...`);
    const startTime = Date.now();

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const duration = Date.now() - startTime;
        resolve({
          table: tableName,
          status: res.statusCode,
          duration: `${duration}ms`,
          body: data.substring(0, 100)
        });
      });
    });

    req.on('timeout', () => {
      const duration = Date.now() - startTime;
      req.destroy();
      resolve({
        table: tableName,
        status: 'TIMEOUT',
        duration: `${duration}ms`,
        error: 'Request timed out after 5 seconds'
      });
    });

    req.on('error', (err) => {
      const duration = Date.now() - startTime;
      resolve({
        table: tableName,
        status: 'ERROR',
        duration: `${duration}ms`,
        error: err.message
      });
    });

    req.end();
  });
}

async function runAll() {
  console.log("Starting test of major Supabase tables...");
  const results = [];
  for (const table of tablesToTest) {
    const res = await queryTable(table);
    results.push(res);
  }
  console.log("\n=== Diagnostic Results ===");
  console.log(JSON.stringify(results, null, 2));
}

runAll();
