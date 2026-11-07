/* Writes CREDITS.md from Frontend/src/credits.js. Run: node tests/build-credits.cjs  (--check only verifies). */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),src=path.join(root,'Frontend/src');
async function build(){
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'credits-'));
  for(const n of ['credits','gameImages']){let t=fs.readFileSync(path.join(src,n+'.js'),'utf8').replace(/from\s+(['"])\.\/(\w+)\1/g,"from './$2.mjs'");fs.writeFileSync(path.join(tmp,n+'.mjs'),t);}
  return (await import(pathToFileURL(path.join(tmp,'credits.mjs')).href)).creditsMarkdown()+'\n';
}
module.exports={build};
if(require.main===module)build().then(md=>{const f=path.join(root,'CREDITS.md');if(process.argv.includes('--check')){process.exit(fs.existsSync(f)&&fs.readFileSync(f,'utf8')===md?0:1)}fs.writeFileSync(f,md);console.log('CREDITS.md written');});
