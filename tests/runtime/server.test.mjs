import assert from 'node:assert/strict';
import {Buffer} from 'node:buffer';
import {execFile, spawn} from 'node:child_process';
import {mkdir, writeFile} from 'node:fs/promises';
import http from 'node:http';
import {createServer} from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';
import {test} from 'node:test';
import {promisify} from 'node:util';

async function assertFreePort(port) {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(port, '127.0.0.1', () => probe.close(resolve));
  });
}

function sendHttp(base, agent, signal, method, framing) {
  const body = Buffer.from('REJECTED_BODY_SECRET_MARKER');
  const headers = framing === 'length' ? {'content-length': body.length} : framing === 'chunked' ? {'transfer-encoding': 'chunked'} : {};
  return new Promise((resolve, reject) => {
    const request = http.request(`${base}/missing?private-token=URL_QUERY_SECRET_MARKER`, {method, agent, signal, headers}, response => {
      let text = '';
      response.setEncoding('utf8');
      response.on('data', chunk => {text += chunk;});
      response.once('error', reject);
      response.once('end', () => resolve({status: response.statusCode, allow: response.headers.allow, text}));
    });
    request.once('error', reject);
    request.setTimeout(5_000, () => request.destroy(new Error('Local HTTP request timed out.')));
    if (framing === 'chunked') {
      assert.equal(request.getHeader('transfer-encoding'), 'chunked');
      request.write(body.subarray(0, 8));
      request.end(body.subarray(8));
    } else if (framing === 'length') request.end(body);
    else request.end();
  });
}

async function checkRejectedStreams(base, signal) {
  // Clients keep their normal persistent-connection behavior. No test-side
  // Connection: close header can conceal a broken local bridge.
  const agent = new http.Agent({keepAlive: true, maxSockets: 4});
  const methods = ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
  const assertRejected = async (method, framing) => {
    const response = await sendHttp(base, agent, signal, method, framing);
    assert.deepEqual(response, {status: 405, allow: 'GET, HEAD', text: 'This preview is read-only.'}, `${method} ${framing}`);
  };
  try {
    for (let round = 0; round < 2; round++) {
      for (const method of methods) {
        await assertRejected(method, 'length');
        await assertRejected(method, 'chunked');
      }
    }
    await Promise.all(methods.flatMap(method => [assertRejected(method, 'length'), assertRejected(method, 'chunked')]));
    const get = await sendHttp(base, agent, signal, 'GET');
    assert.equal(get.status, 404);
    assert.ok(get.text.includes('This page isn’t here.'));
    const head = await sendHttp(base, agent, signal, 'HEAD');
    assert.equal(head.status, 404);
    assert.equal(head.text, '');
  } finally {agent.destroy();}
}

async function withServer(command, port, mode, signal, check) {
  await assertFreePort(port);
  signal.throwIfAborted();
  const output = [];
  const child = spawn(process.execPath, [
    'node_modules/vite/bin/vite.js', ...command,
    '--host', '127.0.0.1', '--port', String(port), '--strictPort',
  ], {
    env: {...process.env, PROOF_CART_MODE: mode, PRIVATE_STOREFRONT_API_TOKEN: 'RUNTIME_ENV_SECRET_MARKER'},
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    detached: process.platform !== 'win32',
  });
  let exited = false;
  const completion = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', () => {exited = true; resolve();});
  });
  // The completion is also observed during readiness/cleanup.
  void completion.catch(() => {});
  child.stdout.on('data', (data) => output.push(data.toString()));
  child.stderr.on('data', (data) => output.push(data.toString()));
  const base = `http://127.0.0.1:${port}`;
  const request = (url) => fetch(url, {signal: AbortSignal.any([signal, AbortSignal.timeout(5_000)])});
  try {
    let ready = false;
    for (let attempt = 0; attempt < 150; attempt++) {
      signal.throwIfAborted();
      assert.equal(exited, false, 'Owned Vite process terminated before becoming ready');
      try {
        assert.ok(output.join('').includes(base), 'Wait for the owned Vite startup message');
        const response = await request(base);
        await response.text();
        assert.equal(exited, false, 'Owned Vite process must still be running');
        ready = true;
        break;
      } catch {
        signal.throwIfAborted();
        await delay(200, undefined, {signal});
      }
    }
    assert.ok(ready, 'Local worker must become ready');
    await check(base, request);
    assert.equal(exited, false, 'Owned Vite process terminated during the check');
    await delay(250, undefined, {signal});
  } finally {
    try {
      if (!exited && child.pid !== undefined) {
        if (process.platform === 'win32') {
          // This exact PID is our still-live child; terminate its owned tree.
          await promisify(execFile)('taskkill', ['/PID', String(child.pid), '/T', '/F'], {windowsHide: true});
        } else process.kill(-child.pid, 'SIGTERM');
      }
      await Promise.race([
        completion,
        delay(5_000, undefined, {ref: false}).then(() => {throw new Error('Owned Vite process did not terminate');}),
      ]);
      await assertFreePort(port);
    } finally {
      await mkdir('test-results/runtime', {recursive: true});
      await writeFile(`test-results/runtime/server-${port}.log`, output.join(''));
    }
  }
  return output.join('');
}

test('preview rejects an unknown provider without echoing its value or env secrets', {timeout: 60_000}, async (context) => {
  const output = await withServer(['preview'], 4186, 'UNSUPPORTED_MODE_SECRET_MARKER', context.signal, async (base, request) => {
    const response = await request(base);
    assert.equal(response.status, 503);
    assert.equal(await response.text(), 'The preview is temporarily unavailable.');
  });
  assert.ok(output.includes('Fixture configuration rejected.'));
  assert.ok(!output.includes('UNSUPPORTED_MODE_SECRET_MARKER'));
  assert.ok(!output.includes('RUNTIME_ENV_SECRET_MARKER'));
});

for (const [name, command, port] of [['production preview', ['preview'], 4187], ['development server', [], 4188]]) {
  test(`${name} never logs supplied URL/query markers`, {timeout: 60_000}, async (context) => {
    const output = await withServer(command, port, 'fixture', context.signal, async (base, request) => {
      const response = await request(`${base}/?private-token=URL_QUERY_SECRET_MARKER`);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(html.includes('Grounded in proof.'));
      assert.ok(!html.includes('RUNTIME_ENV_SECRET_MARKER'));
      const missing = await request(`${base}/missing?private-token=URL_QUERY_SECRET_MARKER`);
      assert.equal(missing.status, 404);
      await missing.text();
      await checkRejectedStreams(base, context.signal);
    });
    assert.ok(!output.includes('URL_QUERY_SECRET_MARKER'));
    assert.ok(!output.includes('RUNTIME_ENV_SECRET_MARKER'));
    assert.ok(!output.includes('REJECTED_BODY_SECRET_MARKER'));
  });
}
