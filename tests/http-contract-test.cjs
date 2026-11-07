const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const serverSource=fs.readFileSync(path.join(__dirname,'../Backend/Database_interface/index.js'),'utf8');
const backendRequire=require('node:module').createRequire(path.join(__dirname,'../Backend/Database_interface/index.js'));
const express=backendRequire('express'); const app=express(); let server; const listen=app.listen.bind(app); app.listen=(port,cb)=>{server=listen(0,'127.0.0.1',cb);return server};
const data={generateOfflineAlerts:async()=>{},
 getUserById:async(id)=>id===1?{UserID:1,IsActive:true,IsAdmin:false}:id===2?{UserID:2,IsActive:true,IsAdmin:false}:id===3?{UserID:3,IsActive:true,IsAdmin:true}:id===4?{UserID:4,IsActive:false,IsAdmin:false}:null,
 getUserByEmail:async(email)=>email==='user@example.com'?{UserID:1,Username:'User',Email:email,PasswordHash:'hash',IsActive:true,IsAdmin:false}:null,
 getPlantCatalog:async()=>[{SpeciesID:1,CommonName:'Basil'}],getDiseaseCatalog:async()=>[],getPlantCareSettings:async()=>[{PlantID:3,SoilMoistureThreshold:30,WateringDurationSeconds:5}],
 getPlantCareActivities:async()=>[],getPlantDiseaseReports:async()=>[],getDiseasesForSpecies:async()=>[],getUserDevices:async()=>[{DeviceID:2,UserID:1,DeviceCode:'A'}],getUserNotifications:async()=>[],
 query:async(sql,params)=>{if(sql.includes('FROM UserPlants WHERE PlantID=? AND UserID=?'))return params[0]===3&&params[1]===1?[{PlantID:3,UserID:1,DeviceID:2,SpeciesID:1,PlantName:'My basil'}]:[];
 if(sql.includes('FROM EspDevices WHERE DeviceID=? AND UserID=?'))return [{IsActive:true,DeviceID:2}];
 if(sql.includes('FROM UserPlants WHERE DeviceID=?'))return [];
 if(sql.includes('SELECT TOP 24'))return [];
 if(sql.includes('SELECT TOP 5'))return [];
 if(sql.includes('FROM PlantCatalog WHERE'))return [{SpeciesID:1,CommonName:'Basil'}];
 if(sql.includes('FROM EspDevices WHERE DeviceID'))return [{DeviceID:2,DeviceName:'ESP32'}];
 if(sql.includes('SELECT PlantName FROM'))return [];
 if(sql.includes('FROM Users'))return [{UserID:1}];
 return [];
 },
 enqueueWaterCommand:async()=>8,
 updatePlantCareSettings:async()=>{},
 addUserPlant:async()=>9,
 addDevice:async()=>({deviceID:4,deviceKey:'mock-key'}),
 createUser:async()=>10
};
const fakeJwt={sign:(obj)=>`${obj.isAdmin?'admin':'user'}:${obj.userID}`, verify:(t)=>{const m=/^(user|admin):(\d+)$/.exec(t);if(!m)throw Error('bad token');return {isAdmin:m[1]==='admin',userID:Number(m[2])}}};
const context={require:(name)=>{
 if(name==='./db_types')return require('../Backend/Database_interface/db_types');
 if(name==='dotenv')return {config:()=>{}};
 if(name==='express'){const factory=()=>app;factory.json=express.json;return factory;}
 if(name==='./database_interface')return data;
 if(name==='./device_routes')return ()=>{};
 if(name==='bcrypt')return backendRequire('bcrypt');
 if(name==='jsonwebtoken')return backendRequire('jsonwebtoken');
 throw new Error('unknown module '+name);
},process:{env:{JWT_SECRET:'a-test-secret-that-is-longer-than-32-characters',PORT:'3000'}},console:{log(){},error(){}},module:{exports:{}},Buffer, setTimeout};
vm.runInNewContext(serverSource,context,{filename:'index.js'});

const jwt=backendRequire('jsonwebtoken');
const secret=context.process.env.JWT_SECRET;
const token=jwt.sign({userID:1},secret);
const results=[];
async function call(method,url,body,auth=true,headers={}){
 const r=await fetch(`http://127.0.0.1:${server.address().port}${url}`,{method,headers:{...(auth?{Authorization:'Bearer '+token}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},body:body===undefined?undefined:typeof body==='string'?body:JSON.stringify(body)});
 const text=await r.text();let json;try{json=JSON.parse(text)}catch{};return {status:r.status,json,text};
}
function record(name,r,expected){const pass=expected(r);results.push({name,pass,observed:r});console.log(pass?'PASS':'FAIL',name,JSON.stringify(r));}
(async()=>{
 if(!server.listening)await new Promise(r=>server.once('listening',r));
 record('real Express ownership rejects different user',await call('GET','/api/users/2/plants'),r=>r.status===403);
 record('real Express valid detail contract',await call('GET','/api/plants/3'),r=>r.status===200&&Array.isArray(r.json.history));
 record('malformed JSON returns 400',await call('POST','/api/auth/login','{bad'),r=>r.status===400);
 record('oversized JSON returns 413',await call('POST','/api/auth/login',{email:'a'.repeat(110000)}),r=>r.status===413);
 record('missing plant body returns 400',await call('POST','/api/users/1/plants'),r=>r.status===400);
 record('numeric location rejected',await call('POST','/api/users/1/plants',{PlantName:'Test',Location:123}),r=>r.status===400);
 record('invalid planted date rejected',await call('POST','/api/users/1/plants',{PlantName:'Test',PlantedAt:'not-a-date'}),r=>r.status===400);
 record('assistant retains plant name',await call('POST','/api/assistant',{question:'dry?',plants:[{PlantName:'Basil',latest:{SoilMoisture:0}}]}),r=>r.status===200&&r.json.answer.includes('Basil'));
 record('assistant ignores boolean sensor',await call('POST','/api/assistant',{question:'dry?',plants:[{name:'Basil',latest:{SoilMoisture:false}}]}),r=>!r.json.answer.includes('potentially dry'));
 let creates=0,reads=0,release;const barrier=new Promise(r=>release=r);const oldQuery=data.query;
 data.query=async(sql,params)=>{if(sql.includes("Status IN ('Pending','Processing')")){reads++;if(reads===2)release();await barrier;return [];}return oldQuery(sql,params)};
 data.enqueueWaterCommand=async()=>{if(creates)return null;return ++creates;};
 const pair=await Promise.all([call('POST','/api/plants/3/water'),call('POST','/api/plants/3/water')]);
 record('concurrent water requests queue at most one',{statuses:pair.map(r=>r.status),creates},r=>r.creates<=1);
 data.query=oldQuery;

 data.getUserByEmail=async(email)=>email==='real@example.com'?{UserID:1,Username:'Real',Email:email,PasswordHash:backendRequire('bcrypt').hashSync('correct-password',4),IsActive:true,IsAdmin:false}:null;
 record('real bcrypt valid login',await call('POST','/api/auth/login',{email:'real@example.com',password:'correct-password'},false),r=>r.status===200&&!!r.json.token);
 record('real bcrypt wrong password',await call('POST','/api/auth/login',{email:'real@example.com',password:'wrong'},false),r=>r.status===401);
 record('expired JWT denied',await call('GET','/api/plants/3',undefined,true,{Authorization:'Bearer '+jwt.sign({userID:1},secret,{expiresIn:-1})}),r=>r.status===401);
 record('wrong JWT secret denied',await call('GET','/api/plants/3',undefined,true,{Authorization:'Bearer '+jwt.sign({userID:1},'wrong-secret')}),r=>r.status===401);
 record('string JWT userID denied',await call('GET','/api/plants/3',undefined,true,{Authorization:'Bearer '+jwt.sign({userID:'1'},secret)}),r=>r.status===401);
 record('inactive account denied with real JWT',await call('GET','/api/users/4/plants',undefined,true,{Authorization:'Bearer '+jwt.sign({userID:4},secret)}),r=>r.status===401);
 record('Unicode password over 72 bytes denied',await call('POST','/api/auth/register',{username:'unicode',email:'unicode@example.com',password:'😀'.repeat(30)},false),r=>r.status===400);
 record('unknown URL returns 404',await call('GET','/not-a-route'),r=>r.status===404);
 const valid={SoilMoistureThreshold:30,AutomaticWateringEnabled:false,WateringDurationSeconds:5,FanAutomaticEnabled:false,FanStartTemperature:28,FanStopTemperature:24};
 record('valid settings accepted',await call('PUT','/api/plants/3/settings',valid),r=>r.status===200);
 for(const [k,v] of [['SoilMoistureThreshold',-1],['WateringDurationSeconds',1.5],['FanAutomaticEnabled',1],['FanStartTemperature',24]])record('invalid setting '+k,await call('PUT','/api/plants/3/settings',{...valid,[k]:v}),r=>r.status===400);


 const oldUser=data.getUserById;
 data.getUserById=async(id)=>({UserID:id,IsActive:'1',IsAdmin:'0'});
 record('ODBC BIT zero never grants admin',await call('GET','/api/admin/users'),r=>r.status===403);
 data.getUserById=async(id)=>({UserID:id,IsActive:'0',IsAdmin:'0'});
 record('ODBC BIT zero inactive account denied',await call('GET','/api/plants/3'),r=>r.status===401);
 data.getUserByEmail=async(email)=>({UserID:1,Username:'Inactive',Email:email,PasswordHash:backendRequire('bcrypt').hashSync('correct-password',4),IsActive:'0',IsAdmin:'0'});
 record('ODBC BIT zero disabled login denied',await call('POST','/api/auth/login',{email:'inactive@example.com',password:'correct-password'},false),r=>r.status===401);
 data.getUserById=oldUser;
 data.enqueueWaterCommand=async()=>8n;
 record('ODBC BIGINT command serializes',await call('POST','/api/plants/3/water'),r=>r.status===202);
 const origQuery=data.query;
 data.query=async(sql,args)=>sql.includes('SELECT TOP 24')?[{MeasurementID:1n,PlantID:3,SoilMoisture:50}]:origQuery(sql,args);
 record('ODBC BIGINT measurement serializes',await call('GET','/api/plants/3'),r=>r.status===200);
 data.query=origQuery;
 data.getUserNotifications=async()=>[{NotificationID:1n,UserID:1,IsRead:'0'}];
 record('ODBC BIGINT notification serializes',await call('GET','/api/users/1/notifications'),r=>r.status===200);
 data.query=async(sql,args)=>{if(sql.includes('FROM UserPlants WHERE PlantID=? AND UserID=?') && !Number.isFinite(args[0]))throw Error('ODBC invalid numeric parameter');return origQuery(sql,args);};
 record('malformed plant ID returns client error',await call('GET','/api/plants/not-an-id'),r=>r.status>=400&&r.status<500);

 data.query=origQuery;
 data.getUserByEmail=async()=>({UserID:1,Username:'Long',Email:'long@example.com',PasswordHash:backendRequire('bcrypt').hashSync('a'.repeat(72),4),IsActive:true,IsAdmin:false});
 record('bcrypt suffix beyond 72 bytes rejected at login',await call('POST','/api/auth/login',{email:'long@example.com',password:'a'.repeat(72)+'wrong-suffix'},false),r=>r.status===400||r.status===401);

 data.getUserById=oldUser;data.query=origQuery;
 record('command history requires authentication',await call('GET','/api/plants/3/commands',undefined,false),r=>r.status===401);
 record('command history denies nonowner',await call('GET','/api/plants/3/commands',undefined,true,{Authorization:'Bearer '+jwt.sign({userID:2},secret)}),r=>r.status===404);
 record('reconciliation requires pump confirmation',await call('POST','/api/plants/3/commands/8/reconcile',{}),r=>r.status===400);
 record('reconciliation rejects malformed ID',await call('POST','/api/plants/3/commands/nope/reconcile',{confirmedPumpOff:true}),r=>r.status===400);
 record('reconciliation rejects ineligible command',await call('POST','/api/plants/3/commands/8/reconcile',{confirmedPumpOff:true}),r=>r.status===409);
 data.query=async(sql,args)=>{if(sql.includes('UPDATE DeviceCommands')){assert.ok(sql.includes("Status='Processing'"));assert.ok(sql.includes('DATEADD(MINUTE,-10'));assert.equal(args[1],2);return [{CommandID:8}];}return origQuery(sql,args);};
 record('reconciliation closes eligible owned command only',await call('POST','/api/plants/3/commands/8/reconcile',{confirmedPumpOff:true}),r=>r.status===200&&r.json.outcome.includes('Unknown'));

 data.updatePlantCareSettings=async(settings,expected)=>{assert.equal(expected.threshold,'30');return false;};
 record('settings snapshot conflict returns 409',await call('PUT','/api/plants/3/settings',{...valid,ExpectedSettings:{threshold:'30',auto:false,duration:'5',fanAuto:false,fanStart:'28',fanStop:'24'}}),r=>r.status===409);
 fs.writeFileSync(path.join(require('node:os').tmpdir(),'root-esp-contract-results.json'),JSON.stringify(results,null,2));
 assert.ok(results.every(r=>r.pass),'HTTP contract regression failed');
 console.log('TOTAL',results.filter(x=>x.pass).length,'/',results.length);
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
