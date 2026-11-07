const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const serverSource=fs.readFileSync(path.join(__dirname,'..','Backend','Database_interface','index.js'),'utf8');
const stack=[];
const app={set(){},use(p,...hs){if(typeof p==='function'){hs.unshift(p);p='/';}stack.push({kind:'use',method:null,path:p,hs});},get(p,...hs){stack.push({kind:'route',method:'GET',path:p,hs});},post(p,...hs){stack.push({kind:'route',method:'POST',path:p,hs});},put(p,...hs){stack.push({kind:'route',method:'PUT',path:p,hs});},delete(p,...hs){stack.push({kind:'route',method:'DELETE',path:p,hs});},listen(port,fn){fn();}};
const express=()=>app;express.json=()=> (req,res,next)=>next();
const deleted=[];
const data={
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
 deleteUserPlant:async(plantID,userID)=>{deleted.push([plantID,userID]);return true;},
 addDevice:async()=>({deviceID:4,deviceKey:'mock-key'}),
 createUser:async()=>10
};
const fakeJwt={sign:(obj)=>`${obj.isAdmin?'admin':'user'}:${obj.userID}`, verify:(t)=>{const m=/^(user|admin):(\d+)$/.exec(t);if(!m)throw Error('bad token');return {isAdmin:m[1]==='admin',userID:Number(m[2])}}};
const context={require:(name)=>{
 if(name==='./db_types')return require('../Backend/Database_interface/db_types');
 if(name==='dotenv')return {config:()=>{}};
 if(name==='express')return express;
 if(name==='./database_interface')return data;
 if(name==='./device_routes')return ()=>{};
 if(name==='./discovery_routes')return ()=>{};
 if(name==='bcrypt')return {hash:async()=> 'hash',compare:async(v)=>v==='correct'};
 if(name==='jsonwebtoken')return fakeJwt;
 throw new Error('unknown module '+name);
},process:{env:{JWT_SECRET:'a-test-secret-that-is-longer-than-32-characters',PORT:'3000'}},console:{log(){},error(){}},module:{exports:{}},Buffer, setTimeout};
vm.runInNewContext(serverSource,context,{filename:'index.js'});
function match(pattern,path,prefix){const patternParts=pattern.split('/').filter(Boolean);const parts=path.split('/').filter(Boolean);if(prefix?parts.length<patternParts.length:parts.length!==patternParts.length)return null;const params={};for(let i=0;i<patternParts.length;i++){if(patternParts[i].startsWith(':'))params[patternParts[i].slice(1)]=parts[i];else if(patternParts[i]!==parts[i])return null;}return params;}
async function request(method,path,{token,body={},origin}={}){
 const req={method,path,params:{},body,session:null,headers:{...(token?{authorization:'Bearer '+token}:{}),...(origin?{origin}:{})}};
 let status=200,result=undefined;let finished=false;
 const headers={};
 const res={setHeader(k,v){headers[k]=v;},status(v){status=v;return res;},json(v){result=v;finished=true;return res;},sendStatus(v){status=v;finished=true;return res;}};
 for(const layer of stack){if(finished)break;if(layer.method&&layer.method!==method)continue;const params=match(layer.path,path,layer.kind==='use');if(!params)continue;Object.assign(req.params,params);
  for(const h of layer.hs){if(finished)break;let continued=false;const next=(err)=>{if(err){status=500;result={error:err.message};finished=true;}else continued=true;};const returned=h(req,res,next);if(returned&&typeof returned.then==='function')await returned;if(!continued&&!finished){status=500;result={error:'handler did not finish'};finished=true;}}
 }
 return {status,result,headers};
}
(async()=>{
 const tests=[
 ['healthcheck',()=>request('GET','/'),x=>x.status===200],
 ['login rejects absent user',()=>request('POST','/api/auth/login',{body:{email:'ghost@example.com',password:'a'}}),x=>x.status===401],
 ['login rejects wrong password',()=>request('POST','/api/auth/login',{body:{email:'user@example.com',password:'wrong'}}),x=>x.status===401],
 ['login accepts valid password',()=>request('POST','/api/auth/login',{body:{email:'user@example.com',password:'correct'}}),x=>x.status===200&&x.result.user.UserID===1],
 ['plant list no token',()=>request('GET','/api/users/1/plants'),x=>x.status===401],
 ['plant list someone else',()=>request('GET','/api/users/2/plants',{token:'user:1'}),x=>x.status===403],
 ['plant list owner',()=>request('GET','/api/users/1/plants',{token:'user:1'}),x=>x.status===200],
 ['plant detail no token',()=>request('GET','/api/plants/3'),x=>x.status===401],
 ['plant detail other user',()=>request('GET','/api/plants/3',{token:'user:2'}),x=>x.status===404],
 ['plant detail owner',()=>request('GET','/api/plants/3',{token:'user:1'}),x=>x.status===200&&x.result.PlantName==='My basil'],
 ['water disabled without token',()=>request('POST','/api/plants/3/water'),x=>x.status===401],
 ['water queued valid',()=>request('POST','/api/plants/3/water',{token:'user:1'}),x=>x.status===202&&x.result.status==='Pending'],
 ['settings reject invalid threshold',()=>request('PUT','/api/plants/3/settings',{token:'user:1',body:{SoilMoistureThreshold:120,WateringDurationSeconds:5,FanStartTemperature:28,FanStopTemperature:24}}),x=>x.status===400],
 ['settings reject empty',()=>request('PUT','/api/plants/3/settings',{token:'user:1',body:{}}),x=>x.status===400],
 ['assistant requires login',()=>request('POST','/api/assistant',{body:{question:'x',plants:[]}}),x=>x.status===401],
 ['assistant responds',()=>request('POST','/api/assistant',{token:'user:1',body:{question:'x',plants:[]}}),x=>x.status===200&&x.result.mode==='basic'],
 ['admin rejects normal user',()=>request('GET','/api/admin/users',{token:'user:1'}),x=>x.status===403],
 ['admin does not trust stale role claim',()=>request('GET','/api/admin/users',{token:'admin:1'}),x=>x.status===403],
 ['admin accepts actual SQL admin',()=>request('GET','/api/admin/users',{token:'user:3'}),x=>x.status===200],
 ['disabled user token rejected',()=>request('GET','/api/users/4/plants',{token:'user:4'}),x=>x.status===401],
 ['notification read scoped',()=>request('POST','/api/notifications/8/read',{token:'user:1'}),x=>x.status===200],
 ['plant delete requires login',()=>request('DELETE','/api/plants/3'),x=>x.status===401&&deleted.length===0],
 ['plant delete refuses someone else\'s plant',()=>request('DELETE','/api/plants/3',{token:'user:2'}),x=>x.status===404&&deleted.length===0],
 ['plant delete removes own plant (scoped to the signed-in user)',()=>request('DELETE','/api/plants/3',{token:'user:1'}),x=>x.status===200&&x.result.ok===true&&deleted.length===1&&deleted[0][0]===3&&deleted[0][1]===1],
 ['preflight advertises DELETE',()=>request('OPTIONS','/api/plants/3',{origin:'http://localhost:8081'}),x=>/DELETE/.test(x.headers['Access-Control-Allow-Methods']||'')],
 ['preflight allowed',()=>request('OPTIONS','/api/plants/3',{origin:'http://localhost:8081'}),x=>x.status===204&&!!x.headers['Access-Control-Allow-Origin']],
 ['preflight forbidden',()=>request('OPTIONS','/api/plants/3',{origin:'http://some-bad-host'}),x=>x.status===403],
 ];
 let passed=0;for(const [name,fn,check] of tests){const result=await fn();let good=check(result);console.log(`${good?'PASS':'FAIL'} ${name}: ${result.status}`);if(!good)console.log(JSON.stringify(result));passed+=good?1:0;}
 console.log(`RESULT: ${passed}/${tests.length}`);if(passed!==tests.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
