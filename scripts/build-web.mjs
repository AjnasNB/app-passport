import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

// A developer shell may export NODE_ENV=development. A release must still use
// React's production runtime and JSX transform on Windows, macOS and Linux.
const web=new URL('../apps/web/',import.meta.url);
const require=createRequire(new URL('package.json',web));
const vite=path.join(path.dirname(require.resolve('vite/package.json')),'bin','vite.js');
const child=spawn(process.execPath,[vite,'build',...process.argv.slice(2)],{
  cwd:fileURLToPath(web),env:{...process.env,NODE_ENV:'production'},stdio:'inherit',windowsHide:true,
});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
