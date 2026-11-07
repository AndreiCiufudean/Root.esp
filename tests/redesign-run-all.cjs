const {spawnSync}=require('node:child_process');
const path=require('node:path');
const scripts=['v2-1-feature-test.cjs','v2-3-feature-test.cjs','v2-4-feature-test.cjs','v2-5-feature-test.cjs','redesign-smoke.cjs','sensor-boundaries-test.js','db-types-test.js','device-routes-test.js','command-lifecycle-test.js','settings-concurrency-test.js'];
let failed=0;for(const name of scripts){console.log('\n== '+name+' ==');const r=spawnSync(process.execPath,[path.join(__dirname,name)],{stdio:'inherit'});if(r.status!==0){failed++;console.error(name+' FAILED');}}
if(process.platform!=='win32'&&spawnSync('g++',['--version'],{stdio:'ignore'}).status===0){console.log('\n== Firmware offline compilation ==');const r=spawnSync('bash',[path.join(__dirname,'check-firmware-offline.sh')],{stdio:'inherit'});if(r.status!==0)failed++;}
console.log(failed?'REDESIGN CHECKS FAILED':'REDESIGN CHECKS PASSED');process.exitCode=failed?1:0;
