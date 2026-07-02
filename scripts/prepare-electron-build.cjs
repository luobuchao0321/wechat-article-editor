const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const standaloneDir = path.join(root, '.next', 'standalone');
const staticDir = path.join(root, '.next', 'static');
const standaloneStaticDir = path.join(standaloneDir, '.next', 'static');
const publicDir = path.join(root, 'public');
const standalonePublicDir = path.join(standaloneDir, 'public');

function copyDir(source, target) {
  if (!fs.existsSync(source)) return;
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(source, target, { recursive: true });
}

if (!fs.existsSync(path.join(standaloneDir, 'server.js'))) {
  throw new Error('Missing .next/standalone/server.js. Run `npm run build` before packaging the desktop app.');
}

copyDir(staticDir, standaloneStaticDir);
copyDir(publicDir, standalonePublicDir);

console.log('Prepared Next.js standalone output for Electron packaging.');
