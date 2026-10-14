import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const runtime=process.env.ARTIFACT_NODE_MODULES;if(!runtime)throw new Error('Use the bundled artifact runtime');
const {FileBlob,PresentationFile}=await import(pathToFileURL(path.join(runtime,'@oai/artifact-tool/dist/artifact_tool.mjs')));
const p=await PresentationFile.importPptx(await FileBlob.load('apps/web/public/downloads/arkiv-graph-pitch.pptx'));
if(p.slides.items.length!==7)throw new Error('Unexpected slide count');
const output='apps/web/public/downloads/arkiv-graph-pitch-pages';await fs.mkdir(output,{recursive:true});
for(let i=0;i<p.slides.items.length;i++){const blob=await p.export({slide:p.slides.items[i],format:'png',scale:1});await fs.writeFile(output+'/slide-'+(i+1)+'.png',new Uint8Array(await blob.arrayBuffer()));}
console.log(JSON.stringify({final_slides_rendered:7,output}));
