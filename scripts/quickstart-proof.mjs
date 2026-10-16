#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Node.js 24 or newer is required');
const docs = await fs.readFile(path.join(root, 'docs/GETTING_STARTED.md'), 'utf8');
const example = docs.match(/<!-- quickstart:offline:start -->\s*```js\r?\n([\s\S]*?)\r?\n```\s*<!-- quickstart:offline:end -->/);
if (!example) throw new Error('The complete marked documentation example was not found');

const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'arkiv-graph-quickstart-'));
const relative = path.relative(root, directory);
if (!relative.startsWith('..' + path.sep) && !path.isAbsolute(relative)) throw new Error('Quickstart must run outside the source workspace');
const essentials = new Set(['path', 'pathext', 'systemroot', 'windir', 'comspec', 'temp', 'tmp', 'home', 'userprofile', 'homedrive', 'homepath', 'appdata', 'localappdata', 'programfiles', 'programfiles(x86)', 'programdata', 'os', 'processor_architecture', 'lang', 'lc_all', 'tz', 'node_extra_ca_certs', 'ssl_cert_file', 'ssl_cert_dir']);
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => essentials.has(key.toLowerCase())));
const run = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { cwd: directory, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '', error = '';
  child.stdout.on('data', data => output += data);
  child.stderr.on('data', data => error += data);
  child.on('error', reject);
  child.on('close', code => code === 0 ? resolve(output) : reject(new Error('Quickstart command failed (' + code + '): ' + error.slice(-2000))));
});

await fs.writeFile(path.join(directory, 'package.json'), JSON.stringify({ name: 'arkiv-graph-quickstart', private: true, type: 'module' }) + '\n');
await fs.writeFile(path.join(directory, 'npm-user-empty.npmrc'), '');
await fs.writeFile(path.join(directory, 'npm-global-empty.npmrc'), '');
const install = ['install', '@ajnasnb/arkiv-graph@0.4.0', '--ignore-scripts', '--no-audit', '--no-fund', '--workspaces=false', '--userconfig=npm-user-empty.npmrc', '--globalconfig=npm-global-empty.npmrc', '--registry=https://registry.npmjs.org', '--cache=./npm-cache'];
const npmCli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
try {
  await fs.access(npmCli);
  await run(process.execPath, [npmCli, ...install]);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  // Fixed arguments only; no source text, user values or credentials enter this command.
  if (process.platform === 'win32') await run('cmd.exe', ['/d', '/s', '/c', 'npm ' + install.join(' ')]);
  else await run('npm', install);
}

const packageDirectory = path.join(directory, 'node_modules', '@ajnasnb', 'arkiv-graph');
if ((await fs.lstat(packageDirectory)).isSymbolicLink()) throw new Error('A workspace package symlink is not an isolated install');
const installed = JSON.parse(await fs.readFile(path.join(packageDirectory, 'package.json'), 'utf8'));
if (installed.name !== '@ajnasnb/arkiv-graph' || installed.version !== '0.4.0') throw new Error('Installed package identity mismatch');
await fs.writeFile(path.join(directory, 'graph.mjs'), example[1] + '\n');
await fs.writeFile(path.join(directory, 'offline.mjs'), "globalThis.fetch = async () => { throw new Error('Network disabled during offline quickstart'); };\nawait import('./graph.mjs');\n");
const result = JSON.parse(await run(process.execPath, ['offline.mjs']));
if (JSON.stringify(result.nodes) !== JSON.stringify(['package:demo', 'source:demo']) || JSON.stringify(result.edges) !== JSON.stringify(['edge:compiled-from']) || result.truncated !== false || !/^sha256:[0-9a-f]{64}$/.test(result.graph_digest)) throw new Error('The documented graph did not produce the expected complete path');
console.log(JSON.stringify({
  schema: 'arkiv-graph.quickstart-proof.v1',
  checked_at: new Date().toISOString(),
  passed: true,
  node_version: process.version,
  package: { name: installed.name, version: installed.version },
  installation: { source: 'https://registry.npmjs.org', fresh_os_temporary_directory: true, fresh_npm_cache: true, isolated_npm_config: true, npm_authentication_used: false, workspace_symlinks_used: false, node_path_used: false, inherited_node_options_used: false },
  documented_example_used_verbatim: true,
  fetch_disabled_during_example: true,
  wallet_used: false,
  rpc_used: false,
  result,
  scope: 'Project-run anonymous installation and local schema/traversal proof. No publication, network signature verification, external users or runtime read count.',
}, null, 2));
