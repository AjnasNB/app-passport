import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

// --root allows the same build guard to be tested against isolated fixture trees.
const args=process.argv.slice(2);
assert(args.length===0||(args.length===2&&args[0]==='--root'),'Usage: node scripts/check-runtime-binding.mjs [--root directory]');
const root=args.length?path.resolve(args[1]):fileURLToPath(new URL('../',import.meta.url));
const implementationPath=path.resolve(root,'packages/sdk/src/tools.ts');
const [implementation,published,worker,descriptor,graph]=await Promise.all([
 readFile(implementationPath),readFile(path.join(root,'apps/web/public/sources/tools.ts')),
 readFile(path.join(root,'worker/ai.ts'),'utf8'),
 readFile(path.join(root,'apps/web/public/data/runtime-descriptor.json'),'utf8').then(JSON.parse),
 readFile(path.join(root,'apps/web/public/data/evidence-graph.json'),'utf8').then(JSON.parse),
]);
assert(implementation.equals(published),'Published /sources/tools.ts differs from the SDK implementation bundled by the Worker');
const digest='sha256:'+createHash('sha256').update(implementation).digest('hex');
assert.equal(descriptor.artifact_digest,digest,'Runtime descriptor no longer identifies the bundled implementation');
const runtime=graph.nodes.find(node=>node.id==='tool:runtime');
assert(runtime?.type==='tool'&&runtime.source_path==='/sources/tools.ts'&&runtime.digest===digest,'Signed-graph runtime node no longer identifies the bundled implementation');
const source=ts.createSourceFile('ai.ts',worker,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const imports=source.statements.filter(ts.isImportDeclaration).filter(statement=>{
 if(!ts.isStringLiteral(statement.moduleSpecifier))return false;
 return path.resolve(root,'worker',statement.moduleSpecifier.text+'.ts')===implementationPath;
});
const names=imports.flatMap(statement=>{
 const bindings=statement.importClause?.namedBindings;
 return bindings&&ts.isNamedImports(bindings)?bindings.elements.filter(element=>!element.isTypeOnly).map(element=>element.propertyName?.text??element.name.text):[];
});
assert(['indianNumber','safetyQuestions','testGuard','guardSchema'].every(name=>names.includes(name)),'Worker must import its executed runtime functions from the checked SDK source');
console.log(`Runtime binding checked: ${implementation.length} exact bytes, ${digest}; Worker import, public source, descriptor and graph agree.`);
