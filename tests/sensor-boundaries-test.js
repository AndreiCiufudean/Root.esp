const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
(async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../Frontend/src/logic.js'),'utf8');
 const logic=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 for(const value of [' ','\t',[],[50],{},true,false,null,undefined,NaN,Infinity,-1,101]) assert.equal(logic.percentage(value),null);
 assert.equal(logic.percentage('50'),50);assert.equal(logic.percentage(50),50);
 assert.equal(logic.isOnline([]),false);assert.equal(logic.isOnline(0),false);
 console.log('PASS 17 malformed/valid sensor and timestamp boundaries');
})().catch(e=>{console.error(e);process.exitCode=1;});
