const fs=require('fs'),vm=require('vm'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const reqmod=require('module').createRequire(path.join(__dirname,'../Backend/Database_interface/index.js'));
const express=reqmod('express'),app=express();app.use(express.json());
let active='0',rows=[];const key='a'.repeat(64),hash=crypto.createHash('sha256').update(key).digest('hex');
const db={query:async(sql)=>sql.includes('DeviceKeyHash')?[{DeviceID:5,DeviceKeyHash:hash,IsActive:active}]:sql.includes('FROM UserPlants')?[{PlantID:10}]:sql.includes('UPDATE nextCmd')?rows:[],getPlantCareSettings:async()=>[{AutomaticWateringEnabled:'0',FanAutomaticEnabled:'0'}],updateDeviceLastSeen:async()=>{}};
require('../Backend/Database_interface/device_routes')(app,db);
app.use((e,req,res,next)=>res.status(500).json({error:e.message}));
process.env.ENABLE_DEVICE_API='true';process.env.DEVICE_API_REQUIRE_HTTPS='false';
const server=app.listen(0,'127.0.0.1',async()=>{const results=[];async function call(p){const r=await fetch(`http://127.0.0.1:${server.address().port}/api/device${p}`,{headers:{'x-device-id':'5','x-device-key':key}});return {status:r.status,body:await r.json()};}
let r=await call('/config');results.push({name:'inactive string-zero device rejected',pass:r.status===401,result:r});
active='1';r=await call('/config');results.push({name:'config has actual false booleans',pass:r.body.settings?.AutomaticWateringEnabled===false&&r.body.settings?.FanAutomaticEnabled===false,result:r});
rows=[{CommandID:50n,CommandType:'Water',DurationSeconds:5}];r=await call('/commands/next');results.push({name:'claimed BIGINT command serializes',pass:r.status===200,result:r});

let saves=0;
db.saveSensorMeasurement=async()=>{saves++;};db.generateDeviceAlerts=async()=>{throw Error('injected notification DB error');};
const response=await fetch(`http://127.0.0.1:${server.address().port}/api/device/telemetry`,{method:'POST',headers:{'x-device-id':'5','x-device-key':key,'Content-Type':'application/json'},body:JSON.stringify({SoilMoisture:20})});
results.push({name:'telemetry save survives optional alert failure without reporting failed save',pass:response.status===201,result:{status:response.status,saves,body:await response.json()}});

const originalQuery=db.query;
db.query=async(sql,args)=>{if(sql.includes('SELECT CommandID,Status')){assert.equal(args[0],'9223372036854775807');assert.equal(args[1],5);return [{CommandID:9223372036854775807n,Status:'Failed'}];}return originalQuery(sql,args);};
r=await call('/commands/9223372036854775807/status');results.push({name:'terminal command status keeps full ID and device ownership',pass:r.status===200&&r.body.CommandID==='9223372036854775807'&&r.body.Status==='Failed',result:r});
r=await call('/commands/9223372036854775808/status');results.push({name:'out-of-range command status ID rejected',pass:r.status===400,result:r});
assert.ok(results.every(r=>r.pass),'device contract regression failed');console.log(JSON.stringify(results,null,2));fs.writeFileSync(path.join(require('os').tmpdir(),'root-esp-device-contract-results.json'),JSON.stringify(results,null,2));server.close();});
