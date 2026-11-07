// Actual database helper exercised with a serialized in-memory ODBC adapter.
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
let commands=[],history=[],next=1,tail=Promise.resolve(),failInsert=false;
const adapter={connect:async()=>{
 let release,locked=false;
 return {
 beginTransaction:async()=>{},
 commit:async()=>{if(locked){release();locked=false;}},rollback:async()=>{if(locked){release();locked=false;}},close:async()=>{},
 query:async(sql,args=[])=>{
  if(sql.includes('WITH (UPDLOCK,HOLDLOCK)') && sql.includes('FROM EspDevices')){let previous=tail;tail=new Promise(r=>release=r);await previous;locked=true;return [{DeviceID:5}];}
  if(sql.includes('SELECT CommandID FROM DeviceCommands'))return commands.filter(c=>['Pending','Processing'].includes(c.Status));
  if(sql.includes('INSERT INTO DeviceCommands')){if(failInsert)throw Error('injected insert failure');const c={CommandID:next++,Status:'Pending',DurationSeconds:args[1]};commands.push(c);return [c];}
  if(sql.includes('SELECT Status,DurationSeconds'))return commands.filter(c=>c.CommandID===args[0]);
  if(sql.includes('UPDATE DeviceCommands')&&sql.includes('OUTPUT INSERTED.CommandID')){const c=commands.find(c=>c.CommandID===args[1]&&c.Status==='Processing');if(!c)return [];c.Status=args[0];return [{...c,CommandType:'Water'}];}
  if(sql.includes('FROM UserPlants WHERE DeviceID'))return [{PlantID:10}];
  if(sql.includes('INSERT INTO WateringHistory'))history.push(args);
  return [];
 }
 };
}};
const ctx={require:n=>n==='./db_types'?require('../Backend/Database_interface/db_types'):n==='odbc'?adapter:require(n),module:{exports:{}},process,console};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../Backend/Database_interface/database_interface.js'),'utf8'),ctx);
const db=ctx.module.exports;
(async()=>{
 const pair=await Promise.all(Array.from({length:30},()=>db.enqueueWaterCommand({deviceID:5,durationSeconds:5,requestedByUserID:1})));
 assert.equal(pair.filter(Boolean).length,1);assert.equal(commands.length,1);console.log('PASS 30 concurrent enqueue attempts produce one command');
 commands[0].Status='Processing';assert.equal(await db.acknowledgeDeviceCommand(5,1,'Completed',6),false);assert.equal(history.length,0);console.log('PASS excessive ACK duration rejected before mutation');
 assert.equal(await db.acknowledgeDeviceCommand(5,1,'Completed',1),true);
 assert.equal(await db.acknowledgeDeviceCommand(5,1,'Completed',1),true);assert.equal(history.length,1);console.log('PASS repeated ACK succeeds with one watering history entry');
 assert.equal(await db.acknowledgeDeviceCommand(5,1,'Failed',null),false);console.log('PASS conflicting terminal ACK rejected');
 failInsert=true;await assert.rejects(db.enqueueWaterCommand({deviceID:5,durationSeconds:1}),/injected/);failInsert=false;
 assert.ok(await db.enqueueWaterCommand({deviceID:5,durationSeconds:1}));console.log('PASS failed insert rolls back and releases lock');
})().catch(e=>{console.error(e);process.exitCode=1;});
