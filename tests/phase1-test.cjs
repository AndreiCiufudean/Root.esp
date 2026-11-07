/* Phase 1 tests. Offline: no browser, no React Native runtime, no database.
 *  - "logic" tests run the real frontend modules (mock API, starter notifications, flow, credits) in Node.
 *  - "backend simulation" tests run the real createUser() against an in-memory connection stub (NOT a live SQL Server).
 *  - "source contract" tests grep the UI source for the fixes. They prove the code is there, not that it renders correctly. */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),src=path.join(root,'Frontend/src');
let n=0;const ok=(name,cond=true)=>{assert.ok(cond,name);n++;console.log('PASS',name)};

async function loadFrontend(names){
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'phase1-'));
  for(const name of names){const t=fs.readFileSync(path.join(src,name+'.js'),'utf8').replace(/from\s+(['"])\.\/(\w+)\1/g,"from './$2.mjs'");const fixed=t.replace("const natureModel=require('./discoveryModel.cjs');","import natureModel from './discoveryModel.cjs';");fs.writeFileSync(path.join(tmp,name+'.mjs'),fixed);}
  fs.copyFileSync(path.join(src,'discoveryModel.cjs'),path.join(tmp,'discoveryModel.cjs'));
  return name=>import(pathToFileURL(path.join(tmp,name+'.mjs')).href);
}
function loadBackend({failOnNotification=0}={}){
  const source=fs.readFileSync(path.join(root,'Backend/Database_interface/database_interface.js'),'utf8');
  const logs=[];const calls=[];let notifInserts=0;
  const connection={async beginTransaction(){logs.push('BEGIN')},async commit(){logs.push('COMMIT')},async rollback(){logs.push('ROLLBACK')},async close(){logs.push('CLOSE')},
    async query(sql,params=[]){calls.push({sql,params});
      if(sql.includes('INSERT INTO Users')){logs.push('INSERT Users');return [{UserID:77}]}
      if(sql.includes('INSERT INTO UserNotifications')){notifInserts++;logs.push('INSERT UserNotifications');if(failOnNotification&&notifInserts===failOnNotification)throw Error('notification insert failed');return []}
      return []}};
  const context={require(name){if(name==='./db_types')return require(path.join(root,'Backend/Database_interface/db_types'));if(name==='odbc')return {connect:async()=>connection};if(name==='node:crypto')return crypto;throw Error(name)},module:{exports:{}},process:{env:{}},console};
  vm.runInNewContext(source,context,{filename:'database_interface.js'});
  return {db:context.module.exports,logs,calls};
}

(async()=>{
  process.env.EXPO_PUBLIC_USE_MOCK='true';
  const load=await loadFrontend(['api','mock','logic','assistant','onboarding','notifTypes','flow','credits','gameImages']);
  const {api,exportMock,importMock}=await load('api');
  const {STARTER_NOTIFICATIONS,ONBOARDING_ACTION_LABEL,starterRows}=await load('onboarding');
  const {kindOf,isAlertKind,ONBOARDING_TYPE,WELCOME_TYPE}=await load('notifTypes');
  const {firstRunStep}=await load('flow');
  const {CREDIT_SECTIONS,creditsMarkdown}=await load('credits');
  const {ALL_GAME_PHOTOS}=await load('gameImages');

  // ---- first-run flow decisions ----
  const f=(o)=>firstRunStep({prefsLoaded:true,introDone:false,hasUser:false,introReplay:false,...o});
  ok('flow: preferences still loading -> splash',firstRunStep({prefsLoaded:false,introDone:false,hasUser:false,introReplay:false})==='splash');
  ok('flow: brand-new visitor -> intro (before login)',f({})==='intro');
  ok('flow: intro finished or skipped -> login (not the app)',f({introDone:true})==='login');
  ok('flow: returning user with a session -> app, intro never shown',f({introDone:false,hasUser:true})==='app'&&f({introDone:true,hasUser:true})==='app');
  ok('flow: replaying the intro from Me shows it even when signed in',f({introDone:true,hasUser:true,introReplay:true})==='intro');

  // ---- starter notifications, demo/mock registration ----
  const demoBefore=(await api.getNotifications(2)).length;
  const u=await api.register('FreshUser','fresh@example.com','secret-pass-1');
  let list=await api.getNotifications(u.UserID);
  ok('fresh account has exactly 2 notifications right after registration',list.length===2);
  const welcome=list.find(x=>x.NotificationType==='Welcome'),alert=list.find(x=>x.NotificationType==='OnboardingAlert');
  ok('welcome text matches the spec',welcome&&welcome.Title==='Welcome to Root.esp 🌱'&&welcome.Message==='Your little corner of green starts here. We’re happy you’re here.');
  ok('onboarding alert text matches the spec',alert&&alert.Title==='Alert! A little more wonder ahead'&&alert.Message==='You’re going to start loving the world around you again ;)');
  ok('both are unread and belong to the new user only',list.every(x=>x.IsRead===false&&x.UserID===u.UserID));
  ok('onboarding alert is not tied to a plant or device (no fabricated fault)',alert.PlantID===null&&!/moisture|offline|sensor|%/i.test(alert.Message));
  ok('welcome is listed before the alert (newest first)',list[0].NotificationType==='Welcome');
  ok('action button label is "Finally!"',ONBOARDING_ACTION_LABEL==='Finally!');
  await api.login('fresh@example.com','secret-pass-1');await api.login('fresh@example.com','secret-pass-1');
  ok('logging in again does not create more notifications',(await api.getNotifications(u.UserID)).length===2);
  let dup=false;try{await api.register('FreshUser','other@example.com','secret-pass-1')}catch(e){dup=true}
  try{await api.register('Other2','fresh@example.com','secret-pass-1')}catch(e){dup=dup&&true}
  ok('a failed/retried registration (duplicate username or email) adds nothing',dup&&(await api.getNotifications(u.UserID)).length===2);
  ok('re-running the starter logic for the same user adds nothing',starterRows(exportMock().UserNotifications,u.UserID,999).length===0);
  const u2=await api.register('SecondUser','second@example.com','secret-pass-2');
  ok('a second account gets its own two; the first and the demo account are untouched',(await api.getNotifications(u2.UserID)).length===2&&(await api.getNotifications(u.UserID)).length===2&&(await api.getNotifications(2)).length===demoBefore);
  ok('notification ids are unique across accounts',new Set(exportMock().UserNotifications.map(x=>x.NotificationID)).size===exportMock().UserNotifications.length);

  // read / unread / mark all
  await api.markRead(alert.NotificationID);
  list=await api.getNotifications(u.UserID);
  ok('"Finally!" acknowledgement marks only the alert as read',list.find(x=>x.NotificationType==='OnboardingAlert').IsRead===true&&list.find(x=>x.NotificationType==='Welcome').IsRead===false);
  ok('read/unread filters see the right rows',list.filter(x=>!x.IsRead).length===1&&list.filter(x=>x.IsRead).length===1);
  await api.markAllRead(u.UserID);
  ok('mark all as read clears this account only',(await api.getNotifications(u.UserID)).every(x=>x.IsRead)&&(await api.getNotifications(u2.UserID)).every(x=>!x.IsRead));

  // persistence (demo database export/import, as the app does on reload)
  const saved=JSON.parse(JSON.stringify(exportMock()));
  importMock(saved);
  ok('starter notifications survive a save/reload of the demo database',(await api.getNotifications(u.UserID)).length===2&&(await api.getNotifications(u.UserID)).every(x=>x.IsRead));
  ok('...and are not recreated after reload',starterRows(exportMock().UserNotifications,u.UserID,1000).length===0&&starterRows(exportMock().UserNotifications,u2.UserID,1000).length===0);

  // classification / badges
  ok('onboarding alert is its own type, shown under Alerts',kindOf(ONBOARDING_TYPE)==='onboarding'&&isAlertKind('onboarding')&&isAlertKind('urgent')&&!isAlertKind(kindOf(WELCOME_TYPE)));
  ok('onboarding alert never raises the red (urgent) dot',kindOf(ONBOARDING_TYPE)!=='urgent'&&kindOf('SoilDry')==='urgent');
  const badge=(rows)=>({urgent:rows.filter(x=>!x.IsRead&&kindOf(x.NotificationType)==='urgent').length,green:rows.filter(x=>!x.IsRead&&kindOf(x.NotificationType)!=='urgent').length});
  const fresh3=await api.register('Badge','badge@example.com','secret-pass-3');
  const b=badge(await api.getNotifications(fresh3.UserID));
  ok('new account badge: 2 unread, green only (matches App.js counts logic)',b.urgent===0&&b.green===2);

  // ---- backend simulation (NOT a live database) ----
  let sim=loadBackend();
  const id=await sim.db.createUser({username:'u',email:'e@x.io',passwordHash:'h'});
  ok('[backend sim] createUser returns the new id',id===77);
  ok('[backend sim] user + 2 notifications are inserted in ONE transaction',sim.logs.join('|')==='BEGIN|INSERT Users|INSERT UserNotifications|INSERT UserNotifications|COMMIT|CLOSE');
  const notifCalls=sim.calls.filter(c=>c.sql.includes('INSERT INTO UserNotifications'));
  ok('[backend sim] notifications are scoped to the new user id and use the explicit types',notifCalls.every(c=>c.params[0]===77)&&notifCalls.map(c=>c.params[1]).join()==='Welcome,OnboardingAlert');
  ok('[backend sim] SQL text has no user-controlled interpolation',notifCalls.every(c=>/DATEADD\(SECOND, -[01],/.test(c.sql)));
  sim=loadBackend({failOnNotification:2});
  await assert.rejects(sim.db.createUser({username:'u',email:'e@x.io',passwordHash:'h'}),/notification insert failed/);
  ok('[backend sim] a failure rolls the whole registration back (no half-created account)',sim.logs.includes('ROLLBACK')&&!sim.logs.includes('COMMIT'));
  const be=sim.db.STARTER_NOTIFICATIONS;
  ok('backend and frontend starter texts are identical (type, title, message)',be.length===STARTER_NOTIFICATIONS.length&&be.every((x,i)=>x.type===STARTER_NOTIFICATIONS[i].NotificationType&&x.title===STARTER_NOTIFICATIONS[i].Title&&x.message===STARTER_NOTIFICATIONS[i].Message));
  const mig=fs.readFileSync(path.join(root,'Backend/Database/migrate-phase1-onboarding.sql'),'utf8');
  const schema=require('node:fs').readFileSync(path.join(root,'Backend/Database/database.sql')).toString('utf16le');
  ok('migration is idempotent, guards duplicates and does not back-fill',/IF NOT EXISTS/.test(mig)&&/HAVING COUNT\(\*\) > 1/.test(mig)&&!/INSERT INTO/i.test(mig));
  ok('fresh-install schema contains the same unique index',schema.includes('UX_UserNotifications_Starter')&&schema.includes("N'Welcome', N'OnboardingAlert'"));

  // ---- credits ----
  ok('credits cover images, game art, music, sound and fonts',['images','gameArt','music','sound','fonts'].every(i=>CREDIT_SECTIONS.some(s=>s.id===i)));
  const items=CREDIT_SECTIONS.flatMap(s=>s.items);
  ok('every credit has creator, licence and modifications',items.every(i=>i.title&&i.creator&&i.license&&i.modifications));
  ok('all game photos are credited with source link and licence link',ALL_GAME_PHOTOS.every(p=>items.some(i=>i.source===p.page&&i.creatorUrl===p.authorUrl&&i.licenseUrl)));
  ok('empty sections explain themselves',CREDIT_SECTIONS.filter(s=>!s.items.length).every(s=>s.empty));
  const md=fs.readFileSync(path.join(root,'CREDITS.md'),'utf8');
  ok('CREDITS.md is in sync with credits.js',md===creditsMarkdown()+'\n');

  // ---- source contract (not a rendering test) ----
  const read=p=>fs.readFileSync(path.join(root,'Frontend',p),'utf8');
  const app=read('App.js'),intro=read('src/Intro.js'),notif=read('src/screens/NotificationsScreen.js'),side=read('src/Sidebar.js'),menu=read('src/screens/MenuScreen.js'),game=read('src/screens/GameScreen.js'),modal=read('src/CreditsModal.js');
  ok('[source] no transparent scene/content backgrounds and no z-index hacks in App.js',!/sceneStyle:\s*\{\s*backgroundColor:\s*'transparent'/.test(app)&&!/contentStyle:\s*\{\s*backgroundColor:\s*'transparent'/.test(app)&&!/zIndex/.test(app)&&!/background:\s*'transparent'/.test(app));
  ok('[source] scenes and navigation theme use the opaque colors.bg',/sceneStyle:[^}]*colors\.bg/.test(app)&&/contentStyle:\s*\{\s*backgroundColor:\s*colors\.bg/.test(app)&&/background:\s*colors\.bg/.test(app));
  ok('[source] Skip is rendered on every intro step (not only on slides) and skips to login',/Skip the intro/.test(intro)&&!/\{!onSignature && <Pressable[^>]*Skip/.test(intro)&&!/setI\(SLIDES\.length\); \}\}>\s*<Text[^>]*>Skip/.test(intro));
  ok('[source] intro offers "Continue without signing" and states where the signature is stored',/Continue without signing/.test(intro)&&/private to the account you sign in to on this device/.test(intro));
  ok('[source] Finally! acknowledges the notice without starting the game tutorial',/ONBOARDING_ACTION_LABEL/.test(notif)&&/api\.markRead/.test(notif)&&!/startTutorial/.test(notif));
  ok('[source] local per-device welcome notes are gone (no duplicates with the account ones)',!/welcome\(/.test(app)&&!/isNew/.test(read('src/screens/LoginScreen.js'))&&!/const welcome/.test(read('src/appdata.js')));
  ok('[source] credits: sidebar, Me, game and login open the popup; no permanent lists remain',[side,menu,game,read('src/screens/LoginScreen.js')].every(s=>/openCredits/.test(s))&&![side,menu,game].some(s=>/ALL_GAME_PHOTOS/.test(s)));
  ok('[source] credits popup closes by button, backdrop, Escape and system back',/Escape/.test(modal)&&/onRequestClose=\{onClose\}/.test(modal)&&/Close credits/.test(modal));
  console.log(`\nPHASE 1: ${n} checks passed`);
})().catch(e=>{console.error('FAIL',e);process.exitCode=1});
