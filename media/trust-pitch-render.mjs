import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const runtime = process.env.ARTIFACT_NODE_MODULES;
if (!runtime) throw new Error('Use the bundled artifact runtime.');
const root = process.cwd();
const build = path.resolve(root, process.argv[2] || '.local/media-trust-refresh/deck-r3');
const finalPath = path.join(build, 'final/arkiv-graph-trust-pitch.pptx');
const req = createRequire(path.join(runtime, 'presentation-font.cjs'));
req('@napi-rs/canvas').GlobalFonts.registerFromPath(path.join(root, 'apps/web/public/fonts/dm-sans-latin.woff2'), 'DM Sans');
const {FileBlob, PresentationFile} = await import(pathToFileURL(path.join(runtime, '@oai/artifact-tool/dist/artifact_tool.mjs')));
const p = await PresentationFile.importPptx(await FileBlob.load(finalPath));
if (p.slides.items.length !== 7) throw new Error('Unexpected final slide count.');
const finalHash = createHash('sha256').update(await fs.readFile(finalPath)).digest('hex');
for (const [i, slide] of p.slides.items.entries()) {
  const blob = await p.export({slide, format: 'png', scale: 1});
  await fs.writeFile(path.join(build, `slide-${i + 1}.png`), new Uint8Array(await blob.arrayBuffer()));
  globalThis.gc?.();
}
await fs.writeFile(path.join(build, 'final-render.json'), JSON.stringify({
  final_pptx_sha256: finalHash,
  rendered_slides: 7,
  renderer: 'Bundled first-party Artifact Tool, final exported PPTX reimported',
  font: 'DM Sans registered from the product bundled font',
  native_powerpoint_execution: false,
}, null, 2) + '\n');
console.log(JSON.stringify({rendered_slides: 7, final_pptx_sha256: finalHash, build}));
