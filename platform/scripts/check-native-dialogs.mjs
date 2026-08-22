import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const roots = ['apps', 'packages'];
const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
const findings = [];

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'dist' || entry.name === 'node_modules' || entry.name.endsWith('.d.ts')) {
      continue;
    }
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await scan(entryPath);
      continue;
    }
    if (!sourceExtensions.has(path.extname(entry.name))) continue;

    const source = await readFile(entryPath, 'utf8');
    source.split(/\r?\n/).forEach((line, index) => {
      const windowCall = /\b(?:window|globalThis)\s*\.\s*(?:alert|confirm|prompt)\s*\(/.test(line);
      const bareCall = /(?:^|[^\w.$])(?:alert|confirm|prompt)\s*\(/.test(line);
      if (windowCall || bareCall) findings.push(`${entryPath}:${index + 1}`);
    });
  }
}

for (const root of roots) await scan(path.resolve(root));

if (findings.length > 0) {
  console.error('Native browser dialogs are prohibited. Use the shared MUI dialog APIs:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log('Native browser dialog check passed.');
}
