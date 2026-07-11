const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const [directory = 'release', outputName = 'SHA256SUMS.txt'] = process.argv.slice(2);
const absoluteDirectory = path.resolve(directory);
const outputPath = path.join(absoluteDirectory, outputName);

const files = fs
  .readdirSync(absoluteDirectory)
  .filter((name) => /\.(dmg|exe|AppImage|deb)$/i.test(name))
  .sort();

if (!files.length) {
  throw new Error(`No installer files found in ${absoluteDirectory}`);
}

const lines = files.map((name) => {
  const data = fs.readFileSync(path.join(absoluteDirectory, name));
  return `${crypto.createHash('sha256').update(data).digest('hex')}  ${name}`;
});

fs.writeFileSync(outputPath, `${lines.join('\n')}\n`);
console.log(`Wrote ${outputPath}`);
