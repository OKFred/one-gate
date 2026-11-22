import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fastOnly = process.argv.includes('--fast');

/** @type {Array<{ name: string; args: string[] }>} */
const fastSteps = [
  { name: 'contracts:build', args: ['run', 'contracts:build'] },
  { name: 'contracts:check', args: ['run', 'contracts:check'] },
  { name: 'contracts:test', args: ['--filter', '@hodor/contracts', 'test'] },
  { name: 'contracts:typecheck', args: ['--filter', '@hodor/contracts', 'typecheck'] },
  { name: 'feature-map:check', args: ['run', 'feature-map:check'] },
  { name: 'check:architecture', args: ['run', 'check:architecture'] },
  { name: 'platform:check:native-dialogs', args: ['--dir', 'platform', 'run', 'check:native-dialogs'] },
  { name: 'platform:lint:check', args: ['--dir', 'platform', 'run', 'lint:check'] },
  { name: 'server:lint:check', args: ['--dir', 'server', 'run', 'lint:check'] },
  { name: 'platform:typecheck:e2e', args: ['--dir', 'platform', 'run', 'typecheck:e2e'] },
  { name: 'server:tsc', args: ['--dir', 'server/apps/server', 'exec', 'tsc', '--noEmit'] },
];

/** @type {Array<{ name: string; args: string[] }>} */
const fullExtraSteps = [
  { name: 'platform:build:all', args: ['--dir', 'platform', 'run', 'build:all'] },
  { name: 'server:build', args: ['--dir', 'server', 'run', 'build'] },
  {
    name: 'server:vitest:node',
    args: ['--dir', 'server/apps/server', 'exec', 'vitest', 'run', '--config', 'vitest.config.node.mts', '--maxWorkers=2'],
  },
];

const steps = fastOnly ? fastSteps : [...fastSteps, ...fullExtraSteps];
const suiteStart = Date.now();

console.log(`Running ${fastOnly ? 'verify:fast' : 'verify'} (${steps.length} steps)...`);

for (const [index, step] of steps.entries()) {
  const label = `[${index + 1}/${steps.length}] ${step.name}`;
  console.log(`\n=== ${label} ===`);
  const stepStart = Date.now();
  const command = process.platform === 'win32' ? 'cmd.exe' : 'pnpm';
  const args = process.platform === 'win32' ? ['/d', '/s', '/c', 'pnpm', ...step.args] : step.args;
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  const elapsedSec = ((Date.now() - stepStart) / 1000).toFixed(1);

  if (result.error) {
    console.error(`FAILED ${label} after ${elapsedSec}s:`, result.error.message);
    process.exit(1);
  }
  if (typeof result.status === 'number' && result.status !== 0) {
    console.error(`FAILED ${label} with exit code ${result.status} (${elapsedSec}s)`);
    process.exit(result.status);
  }
  console.log(`PASSED ${label} (${elapsedSec}s)`);
}

const totalSec = ((Date.now() - suiteStart) / 1000).toFixed(1);
console.log(`\nALL ${steps.length} CHECKS PASSED in ${totalSec}s.`);
