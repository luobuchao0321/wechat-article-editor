const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const buildRoot = path.join(os.homedir(), 'Desktop', 'contentcraft-electron-build-1.0.1');
const releaseRoot = path.join(projectRoot, 'release');
const archArg = process.argv[2] || 'all';

const ignoredNames = new Set(['.git', 'node_modules', '.next', 'release']);
const ignoredPrefixes = ['._'];

function shouldSkip(name, fullPath) {
  if (ignoredNames.has(name)) return true;
  if (ignoredPrefixes.some((prefix) => name.startsWith(prefix))) return true;
  return fullPath.includes(`${path.sep}deploy${path.sep}.next`);
}

function copyClean(source, target) {
  const stat = fs.statSync(source);
  const name = path.basename(source);
  if (shouldSkip(name, source)) return;

  if (stat.isDirectory()) {
    fs.mkdirSync(target, { recursive: true });
    for (const child of fs.readdirSync(source)) {
      copyClean(path.join(source, child), path.join(target, child));
    }
    return;
  }

  if (stat.isFile()) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      COPYFILE_DISABLE: '1',
      CSC_IDENTITY_AUTO_DISCOVERY: 'false',
    },
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

function copyReleaseArtifacts() {
  fs.rmSync(releaseRoot, { recursive: true, force: true });
  fs.mkdirSync(releaseRoot, { recursive: true });

  const sourceRelease = path.join(buildRoot, 'release');
  for (const file of fs.readdirSync(sourceRelease)) {
    if (!file.endsWith('.dmg') && !file.endsWith('.blockmap')) continue;
    fs.copyFileSync(path.join(sourceRelease, file), path.join(releaseRoot, file));
  }
}

fs.rmSync(buildRoot, { recursive: true, force: true });
fs.mkdirSync(buildRoot, { recursive: true });
copyClean(projectRoot, buildRoot);

run('npm', ['ci'], buildRoot);
run('npm', ['run', 'build'], buildRoot);
run('node', ['scripts/prepare-electron-build.cjs'], buildRoot);

if (archArg === 'arm64') {
  run('npx', ['electron-builder', '--mac', 'dmg', '--arm64', '--publish', 'never'], buildRoot);
} else if (archArg === 'x64') {
  run('npx', ['electron-builder', '--mac', 'dmg', '--x64', '--publish', 'never'], buildRoot);
} else {
  run('npx', ['electron-builder', '--mac', 'dmg', '--arm64', '--publish', 'never'], buildRoot);
  run('npx', ['electron-builder', '--mac', 'dmg', '--x64', '--publish', 'never'], buildRoot);
}

copyReleaseArtifacts();
console.log(`macOS installer files copied to ${releaseRoot}`);
