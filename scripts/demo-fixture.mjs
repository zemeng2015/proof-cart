import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const childEnv = {...process.env, PROOF_CART_MODE: 'fixture'};
const args = process.argv.slice(2);

function run(script, arguments_) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...arguments_], {
      cwd: projectRoot,
      env: childEnv,
      stdio: 'inherit',
      windowsHide: true,
    });
    const stop = () => child.kill('SIGTERM');
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    child.once('error', reject);
    child.once('exit', (code) => {
      process.removeListener('SIGINT', stop);
      process.removeListener('SIGTERM', stop);
      if (code === 0) resolve();
      else reject(new Error('Fixture command did not complete successfully.'));
    });
  });
}

try {
  await run('scripts/build.mjs', []);
  await run('node_modules/vite/bin/vite.js', ['preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort', ...args]);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Fixture preview failed.');
  process.exitCode = 1;
}
