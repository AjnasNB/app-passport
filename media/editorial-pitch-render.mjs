import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const runtime=process.env.ARTIFACT_NODE_MODULES;if(!runtime)throw new Error('Bundled runtime required.');
const root=process.cwd(),build=path.resolve(root,process.argv[2]||'.local/editorial-pitch/r2');
const fonts=createRequire(path.join(runtime,'editorial-fonts.cjs'))('@napi-rs/canvas').GlobalFonts;
for(const [file,family]of [['C:/Windows/Fonts/arial.ttf','Arial'],['C:/Windows/Fonts/georgia.ttf','Georgia'],['C:/Windows/Fonts/consola.ttf','Consolas']])fonts.registerFromPath(file,family);
const {FileBlob,PresentationFile}=await import(pathToFileURL(path.join(runtime,'@oai/artifact-tool/dist/artifact_tool.mjs')));
const file=path.join(build,'final/arkiv-graph-pitch.pptx'),p=await PresentationFile.importPptx(await FileBlob.load(file));
if(p.slides.items.length!==8)throw new Error('Expected eight slides.');
for(const [i,slide]of p.slides.items.entries()){const b=await p.export({slide,format:'png',scale:1});await fs.writeFile(path.join(build,`slide-${i+1}.png`),new Uint8Array(await b.arrayBuffer()));globalThis.gc?.();}
const report={sha256:createHash('sha256').update(await fs.readFile(file)).digest('hex'),rendered_slides:8,renderer:'Final exported PPTX reimported with bundled Artifact Tool and verified fonts',native_powerpoint_execution:false};
await fs.writeFile(path.join(build,'final-render.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
