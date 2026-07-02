const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const standaloneDir = path.join(root, '.next', 'standalone');
const staticDir = path.join(root, '.next', 'static');
const standaloneStaticDir = path.join(standaloneDir, '.next', 'static');
const publicDir = path.join(root, 'public');
const standalonePublicDir = path.join(standaloneDir, 'public');
const localOnlyPaths = [
  '.cache',
  path.join('.next', 'node_modules'),
  'article.json',
  'wechat_article.html',
];

function copyDir(source, target) {
  if (!fs.existsSync(source)) return;
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(source, target, { recursive: true });
}

function removeAppleDoubleFiles(target) {
  if (!fs.existsSync(target)) return;
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const entryPath = path.join(target, entry.name);
    if (entry.name.startsWith('._')) {
      fs.rmSync(entryPath, { recursive: true, force: true });
    } else if (entry.isDirectory()) {
      removeAppleDoubleFiles(entryPath);
    }
  }
}

if (!fs.existsSync(path.join(standaloneDir, 'server.js'))) {
  throw new Error('Missing .next/standalone/server.js. Run `npm run build` before packaging the desktop app.');
}

copyDir(staticDir, standaloneStaticDir);
copyDir(publicDir, standalonePublicDir);

for (const relativePath of localOnlyPaths) {
  fs.rmSync(path.join(standaloneDir, relativePath), { recursive: true, force: true });
}

removeAppleDoubleFiles(standaloneDir);
removeAppleDoubleFiles(standalonePublicDir);
removeAppleDoubleFiles(publicDir);
removeAppleDoubleFiles(path.join(root, 'electron'));

console.log('Prepared Next.js standalone output for Electron packaging.');
