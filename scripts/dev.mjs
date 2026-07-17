#!/usr/bin/env node
/**
 * Development runner: starts the Mastra API server (mastra dev, :4111) and
 * the Vite SPA dev server (:5173) side by side, and prints the app URLs once
 * both are ready.
 *
 * Ports are overridable: PORT for the API server, MASTRACODE_UI_PORT for the
 * UI. The UI port is strict (no hopping to a free port): OAuth callbacks are
 * registered against the configured origin, so a silently relocated UI would
 * break every WorkOS/GitHub/Linear redirect. Change MASTRACODE_UI_PORT and
 * MASTRACODE_PUBLIC_URL together.
 *
 * Env is loaded/validated by varlock from .env against .env.schema.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const binDir = path.join(root, 'node_modules', '.bin');
const PATH_KEY = process.platform === 'win32' ? 'Path' : 'PATH';

const serverPort = process.env.PORT ?? '4111';
const uiPort = process.env.MASTRACODE_UI_PORT ?? '5173';
const serverUrl = `http://localhost:${serverPort}`;

const env = {
  ...process.env,
  [PATH_KEY]: `${binDir}${path.delimiter}${process.env[PATH_KEY] ?? process.env.PATH ?? ''}`,
  MASTRA_SKIP_PEERDEP_CHECK: '1',
};

const children = [];
let bannerPrinted = false;
let serverReady = false;
let uiUrl; // actual Vite URL, parsed from its output

function printBanner() {
  if (bannerPrinted || !serverReady || !uiUrl) return;
  bannerPrinted = true;
  const rows = [
    ['Factory UI:', uiUrl],
    ['Mastra Studio:', serverUrl],
    ['API:', `${serverUrl}/api`],
  ];
  const width = Math.max(38, ...rows.map(([label, url]) => label.length + url.length + 2)) + 6;
  const line = content => `  │ ${content.padEnd(width - 4)} │`;
  console.log('');
  console.log(`  ┌${'─'.repeat(width - 2)}┐`);
  console.log(line(''));
  console.log(line('Mastra Software Factory is running'));
  console.log(line(''));
  for (const [label, url] of rows) console.log(line(`${label.padEnd(15)}${url}`));
  console.log(line(''));
  console.log(`  └${'─'.repeat(width - 2)}┘`);
  console.log('');
}

function run(name, command, commandArgs, extraEnv = {}, onLine) {
  const child = spawn(command, commandArgs, {
    cwd: root,
    env: { ...env, ...extraEnv },
    shell: process.platform === 'win32',
  });
  children.push(child);
  const forward = stream => data => {
    const text = data.toString();
    for (const line of text.split('\n')) {
      if (line.trim()) stream.write(`[${name}] ${line}\n`);
    }
    onLine?.(text);
  };
  child.stdout.on('data', forward(process.stdout));
  child.stderr.on('data', forward(process.stderr));
  child.on('close', code => shutdown(code ?? 1));
  return child;
}

let shuttingDown = false;
function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill('SIGTERM');
  }
  process.exitCode = code;
}

process.on('SIGINT', () => shutdown(130));
process.on('SIGTERM', () => shutdown(143));

run('server', 'varlock', ['run', '--', 'mastra', 'dev', '--dir', 'src/mastra'], { PORT: serverPort }, text => {
  if (/Studio available|Mastra API running|ready in/i.test(text)) {
    serverReady = true;
    printBanner();
  }
});

run(
  'ui',
  'vite',
  ['--config', 'src/web/vite.config.ts'],
  { MASTRACODE_UI_PORT: uiPort, MASTRACODE_API_TARGET: serverUrl },
  text => {
    // eslint-disable-next-line no-control-regex
    const clean = text.replace(/\u001b\[[0-9;]*m/g, '');
    if (/Port \d+ is (already )?in use/i.test(clean)) {
      console.error('');
      console.error(`[ui] Port ${uiPort} is already in use — the UI port is strict because OAuth`);
      console.error('[ui] callback URLs (WorkOS/GitHub/Linear) are registered against it.');
      console.error('[ui] Either free the port, or relocate the app:');
      console.error('[ui]   1. Run with MASTRACODE_UI_PORT=<port> npm run dev');
      console.error('[ui]   2. Set MASTRACODE_PUBLIC_URL=http://localhost:<port> in .env');
      console.error('[ui]   3. Update the callback URLs registered on your OAuth apps to match');
      console.error('');
      return;
    }
    const match = clean.match(/Local:\s+(https?:\/\/\S+?)\/?\s/);
    if (match) {
      uiUrl = match[1];
      printBanner();
    }
  },
);
