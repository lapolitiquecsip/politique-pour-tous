const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function walkAndDeleteTxt(dir) {
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkAndDeleteTxt(fullPath);
    } else if (file.endsWith('.txt')) {
      fs.unlinkSync(fullPath);
    }
  });
}

function removeEmptyDirs(dir) {
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      removeEmptyDirs(fullPath);
    }
  });

  // Re-read after child directories are cleaned
  const remaining = fs.readdirSync(dir);
  if (remaining.length === 0) {
    fs.rmdirSync(dir);
  }
}

try {
  // 1. Run build
  console.log('[Deploy Helper] Running build...');
  execSync('node scripts/build-static.js', { stdio: 'inherit' });

  // 2. Delete .txt files in target dynamic route directories
  const targetDirs = [
    'deputes',
    'senateurs',
    'executif',
    'lois',
    'promesses'
  ];

  console.log('[Deploy Helper] Deleting non-essential .txt files to reduce file count...');
  targetDirs.forEach((dirName) => {
    const dirPath = path.join(__dirname, '..', 'out', dirName);
    if (fs.existsSync(dirPath)) {
      walkAndDeleteTxt(dirPath);
    }
  });

  // 3. Remove empty directories
  console.log('[Deploy Helper] Removing empty directories...');
  const outPath = path.join(__dirname, '..', 'out');
  removeEmptyDirs(outPath);

  // 3.5. Copy index.html to 200.html for single-page routing fallback on Surge
  console.log('[Deploy Helper] Creating 200.html fallback...');
  fs.copyFileSync(path.join(outPath, 'index.html'), path.join(outPath, '200.html'));

  // 4. Count remaining files
  const walkCount = (dir) => {
    let count = 0;
    fs.readdirSync(dir).forEach((file) => {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        count += walkCount(fullPath);
      } else {
        count++;
      }
    });
    return count;
  };
  const totalFiles = walkCount(outPath);
  console.log(`[Deploy Helper] Total files to deploy: ${totalFiles}`);

  // 5. Deploy to Surge
  console.log('[Deploy Helper] Deploying to Surge...');
  execSync('npx surge out lapolitique-villes.surge.sh', { stdio: 'inherit' });
  console.log('[Deploy Helper] Success!');

} catch (error) {
  console.error('[Deploy Helper] Failed:', error.message);
  process.exitCode = 1;
}
