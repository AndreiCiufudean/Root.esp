/* Offline simulated device endpoints. Runs real route functions with fake DB & HTTP response. */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mount = require('../Backend/Database_interface/device_routes');
const key = 'a'.repeat(64), otherKey = 'b'.repeat(64), hash = crypto.createHash('sha256').update(key).digest('hex');
const layers = [];
const app = {use(path, fn){layers.push({method:'USE',path,fn});},get(path,fn){layers.push({method:'GET',path,fn});},post(path,fn){layers.push({method:'POST',path,fn});}};
let latestMeasurements = [], nextCommand = null, ackCount=0;
const db = {
  generateDeviceAlerts:async()=>{},
  generateOfflineAlerts:async()=>{},
  async getPlantCareSettings(){return [{SoilMoistureThreshold:30}];},
  async query(sql,params){
    if(sql.includes('SELECT DurationSeconds'))return [{DurationSeconds:1}];
    if (sql.includes('DeviceKeyHash')) return [{DeviceID:5,DeviceKeyHash:hash,IsActive:true}];
    if (sql.includes('FROM UserPlants WHERE DeviceID')) return [{PlantID:10}];
    if (sql.includes('UPDATE nextCmd')) return nextCommand ? [nextCommand] : [];
    return [];
  },
  async updateDeviceLastSeen(id){assert.equal(id,5);},
  async saveSensorMeasurement(v){latestMeasurements.push(v);},
  async acknowledgeDeviceCommand(id,cmd,status,seconds){assert.equal(id,5);ackCount++;return String(cmd)==='50';}
};
mount(app,db);
function match(rule,url,prefix){const a=rule.split('/').filter(Boolean),b=url.split('/').filter(Boolean);if(prefix?b.length<a.length:b.length!==a.length)return null;const params={};for(let i=0;i<a.length;i++){if(a[i][0]===':')params[a[i].slice(1)]=b[i];else if(a[i]!==b[i])return null;}return params;}
async function request(method,path,{secret=key,id=5,tls=true,body={}}={}){
  let finished=false,status=200,result={};
  const req={method,path,params:{},headers:{'x-device-id':String(id),'x-device-key':secret},secure:tls,body};
  const res={status(v){status=v;return this;},json(v){finished=true;result=v;return this;}};
  for(const layer of layers){
    if(finished)break;
    if(layer.method!=='USE'&&layer.method!==method)continue;
    const params=match(layer.path,path,layer.method==='USE');if(!params)continue;
    Object.assign(req.params,params);
    await new Promise((resolve,reject)=>{
      let nextCalled=false;
      const next=(err)=>{nextCalled=true;err?reject(err):resolve();};
      try {Promise.resolve(layer.fn(req,res,next)).then(()=>{if(!nextCalled)resolve();},reject);}catch(e){reject(e);}
    });
  }
  return {status,result};
}
const old={...process.env};
(async()=>{
  let count=0;
  async function test(name,fn){await fn();count++;console.log('PASS',name)}
  process.env.ENABLE_DEVICE_API='false'; process.env.DEVICE_API_REQUIRE_HTTPS='true';
  await test('disabled by default',async()=>assert.equal((await request('GET','/api/device/config')).status,503));
  process.env.ENABLE_DEVICE_API='true';
  await test('HTTPS required',async()=>assert.equal((await request('GET','/api/device/config',{tls:false})).status,403));
  await test('incorrect key rejected',async()=>assert.equal((await request('GET','/api/device/config',{secret:otherKey})).status,401));
  await test('bad device ID rejected',async()=>assert.equal((await request('GET','/api/device/config',{id:0})).status,401));
  await test('linked device config returned',async()=>{const r=await request('GET','/api/device/config');assert.equal(r.result.plantID,10)});
  await test('empty telemetry blocked',async()=>assert.equal((await request('POST','/api/device/telemetry')).status,400));
  await test('settings included in device config',async()=>assert.equal((await request('GET','/api/device/config')).result.settings.SoilMoistureThreshold,30));
  await test('excessive actual duration blocked',async()=>assert.equal((await request('POST','/api/device/commands/50/ack',{body:{status:'Completed',actualSeconds:2}})).status,400));
  await test('bad telemetry blocked',async()=>assert.equal((await request('POST','/api/device/telemetry',{body:{SoilMoisture:200}})).status,400));
  await test('invalid FanStatus blocked',async()=>assert.equal((await request('POST','/api/device/telemetry',{body:{FanStatus:1}})).status,400));
  await test('telemetry saved to assigned plant',async()=>{
    const r=await request('POST','/api/device/telemetry',{body:{SoilMoisture:50,AirTemperature:25,AirHumidity:52,LightLevel:66,FanStatus:false}});
    assert.equal(r.status,201);assert.equal(latestMeasurements.at(-1).plantID,10);
  });
  await test('no command yields null',async()=>assert.equal((await request('GET','/api/device/commands/next')).result.command,null));
  nextCommand={CommandID:50,CommandType:'Water',DurationSeconds:1};
  await test('claimed command returned',async()=>assert.equal((await request('GET','/api/device/commands/next')).result.command.CommandID,50));
  await test('invalid ack blocked',async()=>assert.equal((await request('POST','/api/device/commands/50/ack',{body:{status:'Completed',actualSeconds:0}})).status,400));
  await test('wrong command ID rejected',async()=>assert.equal((await request('POST','/api/device/commands/99/ack',{body:{status:'Failed'}})).status,409));
  await test('failed command acknowledged',async()=>assert.equal((await request('POST','/api/device/commands/50/ack',{body:{status:'Failed'}})).status,200));
  await test('completed command acknowledged',async()=>assert.equal((await request('POST','/api/device/commands/50/ack',{body:{status:'Completed',actualSeconds:1}})).status,200));
  assert.equal(ackCount,3);
  console.log('DEVICE ROUTE:',count,'/',count,'PASS');
})().catch(e=>{console.error('FAIL',e);process.exitCode=1}).finally(()=>{process.env=old});
