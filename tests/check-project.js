/* Offline project checks. No npm packages or database are required. */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const fe = path.join(root, 'Frontend');
let checks = 0;
const ok = (description, condition = true) => { assert.ok(condition, description); checks++; console.log(`PASS ${description}`); };

function listFiles(dir, ext) {
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => {
    const f=path.join(dir,e.name);
    if(e.isDirectory()) return ['node_modules','dist','.git'].includes(e.name) ? [] : listFiles(f,ext);
    return f.endsWith(ext) ? [f] : [];
  });
}

function checkStructure() {
  ok('one unified frontend at Frontend/', fs.existsSync(path.join(fe,'App.js')) && !fs.existsSync(path.join(fe,'Front1')) && !fs.existsSync(path.join(fe,'Front2')));
  const pkg = JSON.parse(fs.readFileSync(path.join(fe,'package.json')));
  const lock = JSON.parse(fs.readFileSync(path.join(fe,'package-lock.json')));
  ok('package and lock agree on dependencies', JSON.stringify(pkg.dependencies) === JSON.stringify(lock.packages[''].dependencies));
  ok('Expo 52 and React Native 0.76 use the same SDK generation', pkg.dependencies.expo.startsWith('~52.') && pkg.dependencies['react-native'].startsWith('0.76.'));
  ok('react and react-dom versions match',pkg.dependencies.react === pkg.dependencies['react-dom']);
  const js = listFiles(fe, '.js');
  let resolved = 0;
  for (const file of js) {
    const content = fs.readFileSync(file,'utf8');
    for (const m of content.matchAll(/\b(?:import|export)\s+(?:[^'"\n]*?\s+from\s+)?['"](\.[^'"]+)['"]/g)) {
      const relative = path.resolve(path.dirname(file), m[1]);
      assert.ok([relative,relative+'.js',path.join(relative,'index.js')].some(fs.existsSync), `Unresolved import ${m[1]} from ${file}`);
      resolved++;
    }
  }
  ok(`all ${resolved} relative imports in ${js.length} frontend JS files resolve`);
  // Expo/Metro also resolves static require() calls. Check these independently of
  // ESM imports: a broken image require can pass syntax checks but fail web bundling.
  let relativeRequires = 0;
  let localGameAssets = 0;
  for (const file of [...js, ...listFiles(fe, '.cjs')]) {
    const content = fs.readFileSync(file, 'utf8');
    for (const match of content.matchAll(/\brequire\s*\(\s*(['"])(\.[^'"]+)\1\s*\)/g)) {
      const specifier = match[2];
      const target = path.resolve(path.dirname(file), specifier);
      const candidates = [target, target + '.js', target + '.cjs', path.join(target, 'index.js')];
      assert.ok(candidates.some(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile()),
        `Unresolved Metro require ${specifier} in ${path.relative(root, file)}`);
      if (/\.(?:png|jpg|jpeg|wav)$/.test(specifier)) {
        const bytes = fs.readFileSync(target);
        const ext = path.extname(target).toLowerCase();
        if (ext === '.png') assert.ok(bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')), `Invalid PNG ${target}`);
        if (ext === '.wav') assert.ok(bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WAVE', `Invalid WAV ${target}`);
        if (specifier.includes('assets/game/')) localGameAssets++;
      }
      relativeRequires++;
    }
  }
  ok(`all ${relativeRequires} static relative require() references resolve and local media files have valid headers`);
  ok('game sprite references are included in Metro asset graph', localGameAssets >= 12);
  const main = fs.readFileSync(path.join(fe,'App.js'),'utf8');
  for(const screen of ['Home','Plants','Discover','Assistant','Alerts','Admin','Menu','PlantDetail','AddPlant','Devices','Game'])
    assert.ok(main.includes(`name="${screen}"`),`Missing screen ${screen}`);
  ok('all active app screens including Discover registered');
  for (const file of listFiles(path.join(root,'Backend'),' .js'.trim())) {
    const result = spawnSync(process.execPath, ['--check',file],{encoding:'utf8'});
    assert.equal(result.status,0,`${file}: ${result.stderr}`);
  }
  ok('backend JavaScript parses');
  const schema = fs.readFileSync(path.join(root,'Backend','Database','database.sql'),'utf16le');
  const server = fs.readFileSync(path.join(root,'Backend','Database_interface','index.js'),'utf8');
  ok('watering command agrees with SQL CHECK constraint', schema.includes("[CommandType]=N'Water'") && server.includes("db.enqueueWaterCommand("));
  ok('browser CORS middleware and assistant endpoint exist', server.includes('Access-Control-Allow-Origin') && server.includes("app.post('/api/assistant'"));
  ok('sound effects and wordmark assets exist', ['click','pop','success','error','bell','water'].every(n=>fs.existsSync(path.join(fe,'assets','sounds',n+'.wav'))) && fs.existsSync(path.join(fe,'assets','logo-o.png')));
  const prefsSrc=fs.readFileSync(path.join(fe,'src','theme.js'),'utf8');
  ok('Sakura, Forest and Sea Glass each provide full light and dark palettes', ['sakura','forest','ocean'].every(t=>prefsSrc.includes(t+':')) && prefsSrc.includes('rail:') && prefsSrc.includes('palette(') && prefsSrc.includes('dark'));
  ok('logo and icon assets exist', fs.existsSync(path.join(fe,'assets','logo.png')) && fs.existsSync(path.join(fe,'assets','icon.png')));
  ok('assistant has no hardcoded LAN address', !fs.readFileSync(path.join(fe,'src','screens','ChatScreen.js'),'utf8').includes('192.168.'));
}
async function makeModules() {
  // Node does not run Expo JSX. Only portable, JSX-free data modules are copied as .mjs for live smoke tests.
  const temp = fs.mkdtempSync(path.join(os.tmpdir(),'root-esp-test-'));
  for(const name of ['api','logic','mock','assistant','onboarding','notifTypes']) {
    let source = fs.readFileSync(path.join(fe,'src',`${name}.js`),'utf8');
    source = source.replace(/from\s+(['"])\.\/(mock|logic|assistant|onboarding|notifTypes)\1/g, "from './$2.mjs'");
    source = source.replace("const natureModel=require('./discoveryModel.cjs');", "import natureModel from './discoveryModel.cjs';");
    fs.writeFileSync(path.join(temp,`${name}.mjs`),source);
  }
  fs.copyFileSync(path.join(fe,'src','discoveryModel.cjs'),path.join(temp,'discoveryModel.cjs'));
  return { temp, load: async name => import(pathToFileURL(path.join(temp,`${name}.mjs`)).href) };
}
async function checkMocks() {
  const {temp,load}=await makeModules();
  try {
    process.env.EXPO_PUBLIC_USE_MOCK='true';
    const {api,USE_MOCK,exportMock}=await load('api');
    ok('app runs in offline mock mode',USE_MOCK);
    const user=await api.login('user@sera.app','demopassword');
    ok('login returns standard user shape',user.UserID===2 && !!user.Username);
    const catalog=await api.getCatalog();
    ok('plant catalog populated',catalog.species.length>0);
    const before=await api.getPlants(user.UserID);
    ok('user plant list loads',before.length>=3);
    const added=await api.addDevice(user.UserID,'Test rig','TEST-CHECK-100');
    ok('device registration',added.DeviceID>0);
    const plant=await api.addPlant(user.UserID,{PlantName:'Check Plant',Location:'Window',SpeciesID:2,DeviceID:added.DeviceID});
    const detail=await api.getPlantDetail(plant.PlantID);
    ok('add plant and detail settings',detail.PlantName==='Check Plant' && !!detail.settings);
    await api.saveSettings(plant.PlantID,{...detail.settings,SoilMoistureThreshold:32});
    ok('edit care settings', (await api.getPlantDetail(plant.PlantID)).settings.SoilMoistureThreshold===32);
    const watering=await api.waterNow(plant.PlantID);
    ok('mock watering operation',watering.seconds>0);
    const alerts=await api.getNotifications(user.UserID);
    ok('user notifications load',alerts.length>0);
    await api.markRead(alerts[0].NotificationID);
    ok('mark notification read',(await api.getNotifications(user.UserID)).find(x=>x.NotificationID===alerts[0].NotificationID).IsRead);
    const reply=await api.askAssistant('How is the soil?',before.map(x=>({name:x.PlantName,latest:x.latest,settings:x.settings})));
    ok('mock assistant replies',typeof reply==='string' && reply.length>0);
    // --- v1.4 checks: link / replace / unlink a device after the plant exists ---
    const dA=await api.addDevice(user.UserID,'Late device A','LATE-A-1');
    const dB=await api.addDevice(user.UserID,'Late device B','LATE-B-1');
    const late=await api.addPlant(user.UserID,{PlantName:'Linked later'});
    ok('plant created without a device',(await api.getPlantDetail(late.PlantID)).device===null);
    await api.linkDevice(late.PlantID,dA.DeviceID);
    ok('a device can be linked after the plant was created',(await api.getPlantDetail(late.PlantID)).device?.DeviceID===dA.DeviceID);
    await api.linkDevice(late.PlantID,dB.DeviceID);
    ok('a linked device can be replaced by another one',(await api.getPlantDetail(late.PlantID)).device?.DeviceID===dB.DeviceID);
    const other=await api.addPlant(user.UserID,{PlantName:'Other plant'});
    let taken=false; try{await api.linkDevice(other.PlantID,dB.DeviceID);}catch(e){taken=true;}
    ok('a device used by another plant cannot be linked twice',taken);
    await api.linkDevice(late.PlantID,null);
    ok('a device can be unlinked',(await api.getPlantDetail(late.PlantID)).device===null);
    await api.linkDevice(other.PlantID,dB.DeviceID);
    ok('an unlinked device becomes available again',(await api.getPlantDetail(other.PlantID)).device?.DeviceID===dB.DeviceID);
    let slow=false; const {subscribeBusy}=await load('api'); const off=subscribeBusy(()=>{slow=true;}); off();
    ok('slow-request tracker is exported',typeof subscribeBusy==='function' && slow===false);

    // --- v1.3 checks: passwords, custom plant types, assistant, persistence ---
    let wrongPassword=false; try{await api.login('user@sera.app','wrongpassword');}catch(e){wrongPassword=true;}
    ok('wrong password is rejected for a registered email',wrongPassword);
    const fresh=await api.register('Tester','tester@example.com','secret-pass-1');
    ok('registered user has no password in the returned object',!('Password' in fresh));
    let wrongNew=false; try{await api.login('tester@example.com','secret-pass-2');}catch(e){wrongNew=true;}
    ok('a new account only signs in with its own password',wrongNew && (await api.login('tester@example.com','secret-pass-1')).UserID===fresh.UserID);
    const second=await api.addPlant(user.UserID,{PlantName:'Second plant'});
    const third=await api.addPlant(user.UserID,{PlantName:'Third plant'});
    ok('several plants can be added',(await api.getPlants(user.UserID)).length>=before.length+3 && second.PlantID!==third.PlantID);
    const custom=await api.addPlant(user.UserID,{PlantName:'Peace lily',CustomSpecies:{CommonName:'Peace lily',Category:'Houseplant',Emoji:'🪷',MinSoilMoisture:35,MaxSoilMoisture:60}});
    const customDetail=await api.getPlantDetail(custom.PlantID);
    ok('custom plant type is created and linked',customDetail.species?.CommonName==='Peace lily' && (await api.getCatalog()).species.some(x=>x.CommonName==='Peace lily'));
    let badCustom=false; try{await api.addPlant(user.UserID,{PlantName:'x',CustomSpecies:{CommonName:'x',MinSoilMoisture:80,MaxSoilMoisture:20}});}catch(e){badCustom=true;}
    ok('invalid custom moisture range is rejected',badCustom);
    const saved=JSON.parse(JSON.stringify(exportMock()));
    ok('demo database export contains users and plants',Array.isArray(saved.Users) && Array.isArray(saved.UserPlants));
    const snap=before.map(x=>({name:x.PlantName,PlantName:x.PlantName,species:x.species,device:x.device,latest:x.latest,settings:x.settings}));
    const dry=await api.askAssistant('Which plant needs water?',snap);
    ok('assistant names the dry plant (Basil soil is 24%)',/Basil/.test(dry));
    const light=await api.askAssistant('How much light does basil need?',snap);
    ok('assistant answers a species light question',/sun/i.test(light));
    const unknown=await api.askAssistant('zzz qqq',snap);
    ok('assistant fallback is not a "Demo reply"',!/demo reply/i.test(unknown) && unknown.length>20);
  } finally { fs.rmSync(temp,{recursive:true,force:true}); }
}
async function checkRealApiShape() {
  const {temp,load}=await makeModules();
  const savedFetch=global.fetch;
  const calls=[];
  try {
    process.env.EXPO_PUBLIC_USE_MOCK='false';
    process.env.EXPO_PUBLIC_API_URL='http://localhost:3000/api';
    global.fetch=async (url, options)=> {
      calls.push({url,options});
      let data={ok:true};
      if(url.endsWith('/auth/login')) data={token:'test-token',user:{UserID:7,Username:'Tester',Email:'tester@example.com',IsAdmin:false}};
      if(url.endsWith('/assistant')) data={answer:'Backend basic care helper'};
      return {ok:true,json:async()=>data};
    };
    const {api,clearSession,USE_MOCK}=await load('api');
    ok('real API mode selectable', !USE_MOCK);
    await api.login('tester@example.com','password');
    await api.getPlants(7);
    ok('real API requests use Bearer token',calls[1].options.headers.Authorization === 'Bearer test-token');
    ok('API uses configured base URL', calls[1].url==='http://localhost:3000/api/users/7/plants');
    const response=await api.askAssistant('Hello',[]);
    ok('assistant uses authenticated shared API',response==='Backend basic care helper' && calls[2].options.headers.Authorization==='Bearer test-token');
    await api.linkDevice(5,9);
    ok('real API links a device with PUT /plants/:id/device',calls[3].url.endsWith('/plants/5/device') && calls[3].options.method==='PUT' && JSON.parse(calls[3].options.body).DeviceID===9);
    clearSession();
    await api.getCatalog();
    ok('logout clears token', !calls[4].options.headers.Authorization);
  } finally {global.fetch=savedFetch;fs.rmSync(temp,{recursive:true,force:true});}
}
(async()=> {
  checkStructure();await checkMocks();await checkRealApiShape();
  console.log(`\nALL ${checks} OFFLINE CHECKS PASSED`);
})().catch(e=>{console.error('\nFAILED:',e.stack || e);process.exitCode=1;});
