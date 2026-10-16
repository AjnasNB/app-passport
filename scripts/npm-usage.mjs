#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { values } = parseArgs({ options: { end: { type: 'string' } } });
const day = 86400000;
const utcToday = new Date().toISOString().slice(0, 10);
const end = values.end ?? new Date(Date.parse(utcToday) - day).toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(end) || !Number.isFinite(Date.parse(end)) || new Date(end).toISOString().slice(0, 10) !== end || end >= utcToday) throw new Error('--end must be a completed UTC day in YYYY-MM-DD form');
const windows = [7, 30].map(days => ({ label: `last-${days}-complete-days`, days, start: new Date(Date.parse(end) - (days - 1) * day).toISOString().slice(0, 10), end }));
const releases = [{ name: '@ajnasnb/arkiv-graph', expected_version: '0.4.1' }, { name: '@ajnasnb/ai-passport', expected_version: '0.6.1' }];

async function request(source_url) {
  const fetched_at = new Date().toISOString();
  try {
    const response = await fetch(source_url, { signal: AbortSignal.timeout(20000), headers: { accept: 'application/json' } });
    const raw_response = await response.text();
    let body;
    try { body = JSON.parse(raw_response); } catch { body = null; }
    return { source_url, fetched_at, http_status: response.status, response_date: response.headers.get('date'), raw_response, body };
  } catch {
    return { source_url, fetched_at, http_status: null, response_date: null, raw_response: null, body: null, error: 'Request failed or exceeded the 20-second timeout' };
  }
}

const packages = await Promise.all(releases.map(async release => {
  const encoded = encodeURIComponent(release.name);
  const [registryResponse, ...downloadResponses] = await Promise.all([
    request(`https://registry.npmjs.org/${encoded}`),
    ...windows.map(window => request(`https://api.npmjs.org/downloads/point/${window.start}:${window.end}/${encoded}`)),
  ]);
  const latest = registryResponse.body?.['dist-tags']?.latest;
  const published_at = typeof latest === 'string' ? registryResponse.body?.time?.[latest] ?? null : null;
  const registry = {
    source_url: registryResponse.source_url,
    fetched_at: registryResponse.fetched_at,
    http_status: registryResponse.http_status,
    response_date: registryResponse.response_date,
    latest: typeof latest === 'string' ? latest : null,
    published_at,
    expected_version: release.expected_version,
    expected_version_is_latest: latest === release.expected_version,
    npm_authentication_used: false,
    // Relevant verbatim metadata fields; the full packument may contain all historic releases.
    raw_dist_tags: registryResponse.body?.['dist-tags'] ?? null,
    raw_release_time: registryResponse.body?.time?.[release.expected_version] ?? null,
  };
  const observations = downloadResponses.map((response, index) => {
    const window = windows[index], body = response.body;
    const available = response.http_status === 200 && Number.isSafeInteger(body?.downloads) && body.downloads >= 0 && body.package === release.name && body.start === window.start && body.end === window.end;
    const { body: ignored, ...provenance } = response;
    return { ...window, status: available ? 'available' : 'unavailable', downloads: available ? body.downloads : null, ...provenance };
  });
  return { name: release.name, registry, windows: observations };
}));

const report = {
  schema: 'arkiv-graph.npm-usage.v1',
  fetched_at: new Date().toISOString(),
  metric: 'npm-package-downloads',
  window_semantics: 'Explicit inclusive UTC dates ending on a complete UTC day; package-level counts include all versions.',
  packages,
  limitations: [
    'npm downloads are package retrievals, not unique people, applications, runtime graph reads or independent adoption.',
    'Counts may include project, automated verification, CI, repeated and dependency installations. These components cannot be separated with this API.',
    'A missing, failed or malformed statistics response is unavailable (downloads: null), never evidence of zero downloads.',
    'The public registry confirms publication and current package versions. It does not establish external use.',
    'No external user count or runtime graph-read counter has been verified by this project.',
  ],
};
const target = path.join(root, 'apps/web/public/data/npm-usage.json');
await fs.writeFile(target + '.tmp', JSON.stringify(report, null, 2) + '\n');
await fs.rename(target + '.tmp', target);
console.log(JSON.stringify(report, null, 2));
