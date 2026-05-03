import { spawnSync } from 'node:child_process';
import {
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [browser, archiveExtension] = process.argv.slice(2);

if (!browser || !archiveExtension) {
  console.error('Usage: node tools/publish-build.mjs <browser> <zip|xpi>');
  process.exit(1);
}

const workspaceRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const manifestPath = join(workspaceRoot, 'src', 'manifest.json');
const distDir = join(workspaceRoot, 'dist', browser);
const { name, version } = JSON.parse(readFileSync(manifestPath, 'utf8'));

const extensionBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const buildResult = spawnSync(
  extensionBin,
  ['extension', 'build', '--browser', browser, '--zip'],
  {
    cwd: workspaceRoot,
    stdio: 'inherit',
  },
);

if (buildResult.status !== 0) {
  process.exit(buildResult.status ?? 1);
}

const archiveCandidates = readdirSync(distDir)
  .filter((entry) => entry.endsWith('.zip'))
  .map((entry) => ({
    entry,
    modifiedAt: statSync(join(distDir, entry)).mtimeMs,
  }))
  .sort((left, right) => right.modifiedAt - left.modifiedAt);

const latestArchive = archiveCandidates[0];

if (!latestArchive) {
  console.error(`No ZIP artifact found in ${distDir}`);
  process.exit(1);
}

const finalName = `${name}-${browser}-${version}.${archiveExtension}`;
const finalPath = join(distDir, finalName);

rmSync(finalPath, { force: true });
renameSync(join(distDir, latestArchive.entry), finalPath);

console.log(`Packaged artifact: ${finalPath}`);
