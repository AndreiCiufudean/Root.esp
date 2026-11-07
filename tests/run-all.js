const {spawnSync}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const scripts=['nature-test.cjs','check-project.js','edge-test.js','route-test.js','device-routes-test.js','db-transactions-test.js','command-lifecycle-test.js','sensor-boundaries-test.js','db-types-test.js','settings-concurrency-test.js','phase1-test.cjs','phase2-test.cjs','phase3-test.cjs','phase4-test.cjs'];
let failures=0;
for(const script of scripts){
  console.log(`\n===== ${script} =====`);
  const r=spawnSync(process.execPath,[path.join(__dirname,script)],{cwd:root,stdio:'inherit'});
  if(r.status!==0){failures++;console.error('FAILED:',script);}
}
if (process.platform !== 'win32') {
  const check=spawnSync('g++',['--version'],{stdio:'ignore'});
  if(check.status===0){
    console.log('\n===== check-firmware-offline.sh =====');
    const r=spawnSync('bash',[path.join(__dirname,'check-firmware-offline.sh')],{cwd:root,stdio:'inherit'});
    if(r.status!==0){failures++;console.error('FAILED: firmware C++ simulation');}
  } else console.log('Firmware C++ test skipped: g++ unavailable.');
}
console.log(`\n${failures?'FAILED':'ALL AVAILABLE OFFLINE CHECKS PASSED'}`);
process.exitCode=failures?1:0;
