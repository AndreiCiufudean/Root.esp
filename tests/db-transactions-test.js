/* Offline ODBC transaction tests: actual DB module + in-memory connection stub. */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../Backend/Database_interface/database_interface.js'),'utf8');
function createDb({failSecond=false, ack=true, owned=true}={}){
 const logs=[];let queryCount=0;
 const connection={
  async beginTransaction(){logs.push('BEGIN')},async commit(){logs.push('COMMIT')},async rollback(){logs.push('ROLLBACK')},async close(){logs.push('CLOSE')},
  async query(sql,params=[]){logs.push('QUERY:'+sql.trim().slice(0,42));queryCount++;
   if(failSecond && queryCount===2)throw Error('insert failed');
   if(sql.includes('SELECT PlantID, DeviceID FROM UserPlants'))return owned?[{PlantID:13,DeviceID:7}]:[];
   if(sql.includes('INSERT INTO UserPlants'))return [{PlantID:13}];
   if(sql.includes('INSERT INTO EspDevices'))return [{DeviceID:44}];
   if(sql.includes('SELECT Status,DurationSeconds'))return ack?[{Status:'Processing',DurationSeconds:1}]:[];
   if(sql.includes('UPDATE DeviceCommands'))return ack?[{CommandID:50,CommandType:'Water',DurationSeconds:1}]:[];
   if(sql.includes('FROM UserPlants WHERE DeviceID'))return [{PlantID:13}];
   return [];
  }
 };
 const context={require(name){if(name==='./db_types')return require('../Backend/Database_interface/db_types');if(name==='odbc')return {connect:async()=>connection};if(name==='node:crypto')return crypto;throw Error(name)},module:{exports:{}},process:{env:{}},console};
 vm.runInNewContext(source,context,{filename:'database_interface.js'});
 return {db:context.module.exports,logs};
}
(async()=>{
 let t=0;const ok=(name)=>{t++;console.log('PASS',name)};
 const plant={userID:1,speciesID:2,deviceID:null,plantName:'Rose'};
 let sim=createDb();assert.equal(await sim.db.addUserPlant(plant),13);assert.ok(sim.logs.includes('BEGIN')&&sim.logs.includes('COMMIT'));assert.ok(!sim.logs.includes('ROLLBACK'));ok('plant creation commits after both inserts');
 sim=createDb({failSecond:true});await assert.rejects(sim.db.addUserPlant(plant),/insert failed/);assert.ok(sim.logs.includes('ROLLBACK')&&!sim.logs.includes('COMMIT'));ok('failed plant settings insertion rolls back');
 sim=createDb();assert.equal(await sim.db.acknowledgeDeviceCommand(5,50,'Completed',1),true);assert.ok(sim.logs.includes('COMMIT'));assert.ok(sim.logs.some(x=>x.includes('INSERT INTO WateringHistory')));ok('completed watering creates history in transaction');
 sim=createDb({ack:false});assert.equal(await sim.db.acknowledgeDeviceCommand(5,50,'Completed',1),false);assert.ok(sim.logs.includes('ROLLBACK'));ok('repeated/wrong acknowledgement not saved');
 sim=createDb();const k=await sim.db.addDevice({userID:1,deviceName:'Board',deviceCode:'Board-A'});assert.equal(k.deviceKey.length,64);assert.equal(k.deviceID,44);ok('device enrollment returns high-entropy one-time key');
 sim=createDb();assert.equal(await sim.db.deleteUserPlant(13,1),true);
 const stmts=sim.logs.filter(x=>x.startsWith('QUERY:'));
 assert.ok(sim.logs.includes('COMMIT')&&!sim.logs.includes('ROLLBACK'));
 assert.ok(stmts.some(x=>x.includes('UPDATE DeviceCommands')),'pending commands cancelled');
 assert.ok(stmts.findIndex(x=>x.includes('DELETE FROM WateringHistory'))<stmts.findIndex(x=>x.includes('DELETE FROM UserPlants')),'children before the plant');
 assert.ok(['SensorMeasurements','PlantCareSettings','PlantPhotos','UserNotifications','PlantCareActivities','PlantDiseaseReports'].every(t=>stmts.some(x=>x.includes('DELETE FROM '+t))));
 assert.ok(!stmts.some(x=>x.includes('DELETE FROM EspDevices')),'device stays registered');ok('plant deletion removes children then plant in one transaction, keeps the device, cancels pending watering');
 sim=createDb({owned:false});assert.equal(await sim.db.deleteUserPlant(13,2),false);assert.ok(sim.logs.includes('ROLLBACK')&&!sim.logs.some(x=>x.includes('DELETE FROM')));ok("plant deletion refuses another user's plant and deletes nothing");
 sim=createDb({failSecond:true});await assert.rejects(sim.db.deleteUserPlant(13,1),/insert failed/);assert.ok(sim.logs.includes('ROLLBACK')&&!sim.logs.includes('COMMIT'));ok('failed plant deletion rolls back completely');
 console.log('DATABASE TRANSACTIONS:',t,'/',t,'PASS');
})().catch(e=>{console.error('FAIL',e);process.exitCode=1});
