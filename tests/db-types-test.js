const assert=require('node:assert/strict'),path=require('path'),fs=require('fs'),vm=require('vm');
const types=require('../Backend/Database_interface/db_types');
let count=0;const test=(name,fn)=>{fn();count++;console.log('PASS',name);};
for(const v of [false,0,'0',null,undefined,'false','true',{},[],2])test('permission rejects '+String(v),()=>assert.equal(types.sqlBoolean(v),false));
for(const v of [true,1,'1'])test('permission accepts '+String(v),()=>assert.equal(types.sqlBoolean(v),true));
test('BIGINT IDs retain all 19 digits',()=>assert.equal(JSON.stringify({CommandID:9223372036854775807n},types.jsonValue),'{"CommandID":"9223372036854775807"}'));
for(const v of ['0','-1','1.1','01','1e3','9223372036854775808',9007199254740992])test('invalid BIGINT rejected '+v,()=>assert.equal(types.sqlID(v),null));
test('maximum SQL BIGINT accepted',()=>assert.equal(types.sqlID('9223372036854775807'),'9223372036854775807'));
test('UTC timestamps have explicit offset',()=>assert.equal(types.jsonValue('MeasuredAt','2026-10-30 20:00:00.1234567'),'2026-10-30T20:00:00.123Z'));
test('date-only values stay calendar dates',()=>assert.equal(types.jsonValue('PlantedAt','2026-10-30'),'2026-10-30'));
// Exercise actual connection wrapper, not just the converter.
const connection={query:async()=>[{UserID:1,IsActive:'0',IsAdmin:'0',CommandID:50n,MeasuredAt:'2026-10-30 20:00:00.0000000'}],close:async()=>{}};
const ctx={require:n=>n==='odbc'?{connect:async()=>connection}:n==='./db_types'?types:require(n),module:{exports:{}},process,console};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../Backend/Database_interface/database_interface.js'),'utf8'),ctx);
(async()=>{const row=await ctx.module.exports.getUserById(1);assert.equal(row.IsActive,false);assert.equal(row.IsAdmin,false);assert.equal(row.CommandID,'50');assert.equal(row.MeasuredAt,'2026-10-30T20:00:00.000Z');console.log('PASS actual DB query wrapper normalizes native types');console.log('DB TYPE CASES:',count+1);})().catch(e=>{console.error(e);process.exitCode=1;});
