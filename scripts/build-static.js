const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const apiPath = path.join(__dirname, '..', 'src', 'app', 'api');
const disabledApiPath = path.join(__dirname, '..', 'src', 'api_disabled');

let renamed = false;

try {
  // 1. Temporarily rename the api directory to hide it from Next.js build
  if (fs.existsSync(apiPath)) {
    console.log('[Static Build Helper] Disabling API routes temporarily...');
    fs.renameSync(apiPath, disabledApiPath);
    renamed = true;
  } else {
    console.log('[Static Build Helper] No api directory found or already disabled.');
  }

  // 2. Run Next.js build
  console.log('[Static Build Helper] Running Next.js build...');
  execSync('npm run build', { stdio: 'inherit' });

  // 3. Run Capacitor sync if Capacitor is initialized
  const capConfigPath = path.join(__dirname, '..', 'capacitor.config.ts');
  if (fs.existsSync(capConfigPath) && !process.env.NETLIFY) {
    console.log('[Static Build Helper] Running Capacitor sync...');
    execSync('npx cap sync', { stdio: 'inherit' });
  }

} catch (error) {
  console.error('[Static Build Helper] Build failed:', error.message);
  process.exitCode = 1;
} finally {
  // 4. Restore the api directory in all circumstances
  if (renamed && fs.existsSync(disabledApiPath)) {
    console.log('[Static Build Helper] Restoring API routes...');
    fs.renameSync(disabledApiPath, apiPath);
  }
}
