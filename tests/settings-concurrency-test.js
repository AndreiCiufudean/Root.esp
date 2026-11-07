const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const types=require('../Backend/Database_interface/db_types');
let tail=Promise.resolve(),writes=0;
let row={PlantID:3,SoilMoistureThreshold:30,AutomaticWateringEnabled:'0',WateringDurationSeconds:5,FanAutomaticEnabled:'0',FanStartTemperature:28,FanStopTemperature:24};
const odbc={connect:async()=>{let release;return {
 beginTransaction:async()=>{},close:async()=>{},commit:async()=>{if(release)release();},rollback:async()=>{if(release)release();},
 query:async(sql,args)=>{
 if(sql.startsWith('SELECT * FROM PlantCareSettings WITH')){const prior=tail;tail=new Promise(r=>release=r);await prior;return [{...row}];}
 if(sql.startsWith('UPDATE PlantCareSettings')){writes++;row.SoilMoistureThreshold=args[0];return [];}
 return [];
 }
};}};
const ctx={require:n=>n==='odbc'?odbc:n==='./db_types'?types:require(n),module:{exports:{}},process,console};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../Backend/Database_interface/database_interface.js'),'utf8'),ctx);
(async()=>{
 const expected={threshold:'30',auto:false,duration:'5',fanAuto:false,fanStart:'28',fanStop:'24'};
 const settings={plantID:3,automaticWateringEnabled:false,wateringDurationSeconds:5,fanAutomaticEnabled:false,fanStartTemperature:28,fanStopTemperature:24};
 const r=await Promise.all([42,43].map(soilMoistureThreshold=>ctx.module.exports.updatePlantCareSettings({...settings,soilMoistureThreshold},expected)));
 assert.equal(r.filter(Boolean).length,1);assert.equal(writes,1);console.log('PASS simultaneous edits with same baseline cause one write and one conflict');
 const late=await ctx.module.exports.updatePlantCareSettings({...settings,soilMoistureThreshold:55},expected);
 assert.equal(late,false);assert.equal(writes,1);console.log('PASS stale baseline cannot overwrite newer settings');
})().catch(e=>{console.error(e);process.exitCode=1;});
