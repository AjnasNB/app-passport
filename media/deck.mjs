import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const runtime=process.env.ARTIFACT_NODE_MODULES;
if(!runtime)throw new Error('Set ARTIFACT_NODE_MODULES to the installed artifact-tool package directory.');
const {Presentation,PresentationFile}=await import(pathToFileURL(path.join(runtime,'@oai/artifact-tool/dist/artifact_tool.mjs')));
const root=process.cwd(),out=path.join(root,'output/presentation');await fs.mkdir(out,{recursive:true});
const p=Presentation.create({slideSize:{width:1920,height:1080}});
const frames=['poster.png','frame-20.png','reader-frame.png','close-frame.png'];
const notes=[
 'AppPassport is newly built integration code over a disclosed pre-existing Qarinah compiler. Source: https://github.com/AjnasNB/app-passport/blob/main/PREEXISTING.md. Both demo wallets are project controlled. The physical passport is an original motion illustration, not a photograph.',
 'This image is a recording of the actual public website over a genuine Qarinah packet generated from a synthetic repository. Evidence: https://passport.ajnasnb.com/data/context-evaluation.json and https://passport.ajnasnb.com/data/browser-evaluation.json. No private memory is published.',
 'The independent example consumer and CLI were tested through the raw Tiramisu RPC without the website backend. Evidence: https://passport.ajnasnb.com/data/consumer-evaluation.json. No second LLM inference or external adoption is claimed. The diagram illustrates readers and the shared data layer.',
 'Measured results: ten pinned tool artifacts, ten controlled MCP calls, 44 SDK/API/source-file tests, and 31 signed chain records. Evidence: /data/protocol-evaluation.json, /data/security-evaluation.json and /data/live-verification.json at https://passport.ajnasnb.com. These checks do not certify production security or malware safety.'
];
for(let i=0;i<frames.length;i++){
 const slide=p.slides.add();const bytes=await fs.readFile(path.join(root,'.local/passport-film',frames[i]));slide.images.add({blob:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),contentType:'image/png',alt:['AppPassport artifact and separate signatures','Verified live Qarinah context handoff','Arkiv evidence shared with browser, SDK and CLI','AppPassport evaluation and public URL'][i],fit:'contain',position:{left:0,top:0,width:1920,height:1080}});slide.speakerNotes.text=notes[i];
 const png=await p.export({slide,format:'png',scale:.6});await fs.writeFile(path.join(out,'slide-'+(i+1)+'.png'),new Uint8Array(await png.arrayBuffer()));
}
await (await PresentationFile.exportPptx(p)).save(path.join(out,'app-passport-deck.pptx'));
console.log(JSON.stringify({slides:p.slides.items.length,deck_created:true}));
