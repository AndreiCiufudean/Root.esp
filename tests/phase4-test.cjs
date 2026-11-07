/* Phase 4 tests (v1.9): first-login tour offer, delete plant, slim sidebar, see-through header.
 * Offline. "logic" tests run the real mock API in Node; "source contract" tests check the UI wiring.
 * They do NOT prove rendering: nothing here launches Expo or a browser. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),src=path.join(root,'Frontend/src');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let n=0;const ok=(name,cond=true)=>{assert.ok(cond,name);n++;console.log('PASS',name)};

async function loadFrontend(names){
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'phase4-'));
  for(const name of names){const t=fs.readFileSync(path.join(src,name+'.js'),'utf8').replace(/from\s+(['"])\.\/(\w+)\1/g,"from './$2.mjs'").replace("const natureModel=require('./discoveryModel.cjs');","import natureModel from './discoveryModel.cjs';");fs.writeFileSync(path.join(tmp,name+'.mjs'),t);}
  fs.copyFileSync(path.join(src,'discoveryModel.cjs'),path.join(tmp,'discoveryModel.cjs'));
  return name=>import(pathToFileURL(path.join(tmp,name+'.mjs')).href);
}

(async()=>{
  process.env.EXPO_PUBLIC_USE_MOCK='true';
  const load=await loadFrontend(['api','mock','logic','assistant','onboarding','notifTypes']);
  const {api}=await load('api');const {db}=await load('mock');

  // ---- delete plant (demo API) ----
  const before=db.UserPlants.filter(p=>p.UserID===2).length;
  const victim=db.UserPlants.find(p=>p.UserID===2&&p.DeviceID===1);           // Tomatoes, linked to device 1
  const otherSensor=db.SensorMeasurements.filter(m=>m.PlantID===2).length;      // Basil readings must survive
  const otherNotifs=db.UserNotifications.filter(x=>x.PlantID===2).length;
  await assert.rejects(api.deletePlant(victim.PlantID,3),/not found/i);
  ok("deleting someone else's plant is refused and removes nothing",db.UserPlants.some(p=>p.PlantID===victim.PlantID));
  await api.deletePlant(victim.PlantID,2);
  ok('deleted plant disappears from the plant list',!(await api.getPlants(2)).some(p=>p.PlantID===victim.PlantID)&&(await api.getPlants(2)).length===before-1);
  ok('its settings, readings, watering history, care notes and notifications are gone',
    !db.PlantCareSettings.some(x=>x.PlantID===victim.PlantID)&&!db.SensorMeasurements.some(x=>x.PlantID===victim.PlantID)&&!db.WateringHistory.some(x=>x.PlantID===victim.PlantID)&&
    !db.PlantCareActivities.some(x=>x.PlantID===victim.PlantID)&&!db.UserNotifications.some(x=>x.PlantID===victim.PlantID)&&db.latest[victim.PlantID]===undefined);
  ok('other plants keep their readings and notifications',db.SensorMeasurements.filter(m=>m.PlantID===2).length===otherSensor&&db.UserNotifications.filter(x=>x.PlantID===2).length===otherNotifs);
  ok('the Root.esp device stays registered and becomes free',db.EspDevices.some(d=>d.DeviceID===1)&&!db.UserPlants.some(p=>p.DeviceID===1)&&(await api.getDevices(2)).find(d=>d.DeviceID===1).plant===null);
  await assert.rejects(api.waterNow(victim.PlantID),/not found/i);
  ok('a deleted plant can no longer be watered, not even in demo mode',true);
  await assert.rejects(api.deletePlant(victim.PlantID,2),/not found/i);
  ok('deleting twice is a clean error, not a crash',true);
  const back=await api.addPlant(2,{PlantName:'Fresh start',DeviceID:1});
  ok('the freed device can be linked to a new plant',back.DeviceID===1);

  // ---- source contracts ----
  const app=read('Frontend/App.js'),side=read('Frontend/src/Sidebar.js'),detail=read('Frontend/src/screens/PlantDetailScreen.js'),login=read('Frontend/src/screens/LoginScreen.js'),prefs=read('Frontend/src/prefs.js'),welcome=read('Frontend/src/WelcomeOffer.js'),apiSrc=read('Frontend/src/api.js'),ui=read('Frontend/src/ui.js');
  ok('sidebar wrapper no longer uses flex:1 (that stretched the rail to half the window) and has a fixed 176px basis',
    /SIDEBAR_WIDTH = 176/.test(side)&&/flexGrow: 0, flexShrink: 0, flexBasis: SIDEBAR_WIDTH/.test(side)&&!/TourAnchor id="main-nav" style=\{\{[^}]*flex: 1/.test(side));
  ok('sidebar is label-only (no hint lines) and the tab bar style reuses the same width constant',!/hint: '/.test(side)&&app.includes('width: SIDEBAR_WIDTH, maxWidth: SIDEBAR_WIDTH'));
  ok('tab header is see-through with a gradient backdrop; the nav theme background is untouched',app.includes("headerStyle: { backgroundColor: 'transparent' }")&&app.includes('headerBackground')&&app.includes('background: colors.bg')&&!/background:\s*'transparent'/.test(app));
  ok('wordmark logo image has an explicit transparent background',/LOGO_O\} style=\{\{[^}]*backgroundColor: 'transparent'/.test(ui));
  ok('registering (and only registering) marks the welcome offer as pending',login.includes("justRegistered: mode === 'signup'")&&app.includes('if (opts?.justRegistered) prefs.setWelcomePendingFor(u,true)'));
  ok('the pending offer is persisted per account and merged with older saved preferences',/welcomePending:\{\}/.test(prefs)&&prefs.includes('welcomePendingFor')&&prefs.includes('setWelcomePendingFor'));
  ok('automatic tours wait while the offer is open, so two dialogs never stack',app.includes('disabled={prefs.toursSkippedFor(user)||prefs.welcomePendingFor(user)}'));
  ok('"Show me around" clears an intro Skip, closes the offer and starts the Home tour; "Maybe later" records the choice',
    /onStart=\{\(\)=>\{prefs\.setToursSkippedFor\(user,false\);prefs\.setWelcomePendingFor\(user,false\);replayTour\('home'\);\}\}/.test(app)&&/onLater=\{\(\)=>\{prefs\.setToursSkippedFor\(user,true\);prefs\.setWelcomePendingFor\(user,false\);\}\}/.test(app));
  ok('intro Skip still only silences AUTOMATIC tours (explicit replay and the offer still work)',app.includes('prefs.setToursSkippedFor(u,true)')&&read('Frontend/src/Tour.js').includes('disabled&&!force'));
  ok('welcome dialog tells people the tour is replayable and has a visible opt-out',/Guided tours/.test(welcome)&&/Maybe later/.test(welcome));
  ok('plant detail offers a confirmed delete that names what is lost and keeps the device',/api\.deletePlant\(plantId, user\.UserID\)/.test(detail)&&/ConfirmModal visible=\{confirmDelete\}/.test(detail)&&/stays registered/.test(detail)&&/This cannot be undone/.test(detail));
  ok('real API exposes DELETE /plants/:id',/deletePlant: \(plantId\) => http\('DELETE', `\/plants\/\$\{plantId\}`\)/.test(apiSrc));
  ok('backend route and data function exist',read('Backend/Database_interface/index.js').includes("app.delete('/api/plants/:plantID'")&&read('Backend/Database_interface/database_interface.js').includes('deleteUserPlant,'));

  // ---- JSX/JS syntax of everything touched ----
  let ts=null;for(const loc of ['typescript','/opt/npm-tools/node_modules/typescript/lib/typescript.js','/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js']){try{ts=require(loc);break;}catch(e){}}
  if(ts){
    for(const p of ['Frontend/App.js','Frontend/src/Sidebar.js','Frontend/src/WelcomeOffer.js','Frontend/src/prefs.js','Frontend/src/ui.js','Frontend/src/Tour.js','Frontend/src/tourDefinitions.js','Frontend/src/theme.js','Frontend/src/api.js','Frontend/src/screens/HomeScreen.js','Frontend/src/screens/PlantDetailScreen.js','Frontend/src/screens/LoginScreen.js','Backend/Database_interface/index.js','Backend/Database_interface/database_interface.js']){
      const sf=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,p.endsWith('.js')?ts.ScriptKind.JSX:ts.ScriptKind.JS);
      const errs=sf.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' '));assert(!errs.length,p+': '+errs.join('; '));
    }
    ok('all touched files parse (JSX/JS)');
  } else console.log('SKIP syntax parse (typescript not installed)');
  console.log(`PHASE 4: ${n} checks passed`);
})().catch(e=>{console.error('FAIL',e);process.exitCode=1});
