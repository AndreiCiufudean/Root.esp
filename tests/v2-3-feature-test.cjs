// v2.3: tour spotlight, demo designs, themes, assistant, kids accounts and kids interface.
// Static wiring checks plus behavioural checks of the demo data layer (no npm install needed).
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=path.resolve(__dirname,'..');const F=p=>path.join(root,'Frontend',p);const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let passed=0;const ok=(name)=>{passed++;console.log('PASS '+name);};

// ---- static wiring ----
const app=read('Frontend/App.js'),ui=read('Frontend/src/ui.js'),tour=read('Frontend/src/TourOverlay.js'),hist=read('Frontend/src/designHistory.js'),theme=read('Frontend/src/theme.js');
const kids=read('Frontend/src/kids/KidsApp.js'),login=read('Frontend/src/screens/LoginScreen.js'),sheet=read('Frontend/src/KidsAccountSheet.js'),home=read('Frontend/src/screens/HomeScreen.js');
const server=read('Backend/Database_interface/index.js'),dbi=read('Backend/Database_interface/database_interface.js');

assert.match(ui,/LOGO_O/);assert.match(ui,/<Text style=\{t\}>R<\/Text>/);assert.match(ui,/<Text style=\{t\}>ot\.esp<\/Text>/);ok('wordmark uses the logo as the first "o"');
assert.match(tour,/scrollTo\(/);assert.match(tour,/measure\(/);assert.match(tour,/borderColor:colors\.sun/);ok('tour scrolls the target to the centre and spotlights it');
const screens=['Frontend/src/screens/HomeScreen.js','Frontend/src/screens/PlantsScreen.js','Frontend/src/screens/DesignScreen.js','Frontend/src/screens/AssistantScreen.js','Frontend/src/screens/MenuScreen.js'].map(read).join('\n');
const targets=[...tour.matchAll(/target:'([^']+)'/g)].map(m=>m[1]);assert.ok(targets.length>=12);
for(const t of targets)assert.ok(screens.includes(`TourTarget id="${t}"`),'missing tour target '+t);ok(`all ${targets.length} tour steps point at a real part of a page`);
assert.match(home,/TourTarget id="home.plants"/);assert.match(home,/PlantTile/);ok('plants are shown on the front page');
assert.match(hist,/title:'eg design'/);assert.match(hist,/title:'eg pot custom'/);for(const w of ['Lavandă','Măslin','Epipremnum','Lavandula angustifolia','Olea europaea','Epipremnum aureum','Full sun, very well-drained soil'])assert.ok(hist.includes(w),w);
assert.match(hist,/Recommend plants for the Romanian environment/);for(const f of ['eg-room-uploaded.jpg','eg-room-designed.jpg'])assert.ok(fs.existsSync(F('assets/design/'+f)),f);ok('two demo designs with uploaded image, designer outcome and plant needs');
const themeCount=(theme.match(/^\s{2}[a-z]+: theme\(/gm)||[]).length;assert.ok(themeCount>=8,'themes '+themeCount);assert.match(theme,/success:/);assert.match(theme,/section:/);ok(`${themeCount} colour themes with consistent status colours`);
const emoji=/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}]/u;
for(const f of ['App.js','src/ui.js','src/Sidebar.js','src/screens/HomeScreen.js','src/screens/PlantsScreen.js','src/screens/DesignScreen.js','src/screens/AssistantScreen.js','src/screens/MenuScreen.js','src/screens/PlantDetailScreen.js','src/screens/AddPlantScreen.js','src/screens/DevicesScreen.js','src/screens/LoginScreen.js','src/kids/KidsApp.js','src/kids/games.js'])assert.doesNotMatch(fs.readFileSync(F(f),'utf8'),emoji,f+' contains emoji');ok('no emoji in the interface; icons are used instead');
assert.match(app,/Tabs.Screen name="Assistant" component=\{GuidedAssistant\}/);ok('AI assistant tab');
assert.match(login,/Do you have kids\?/);assert.match(app,/hasKids/);assert.match(sheet,/Do not reuse your adult password/);ok('sign-up asks about kids and the kids sheet warns about passwords');
assert.match(app,/user\?\.IsKid \? \(/);assert.doesNotMatch(kids,/name="(Design|Assistant)"/);assert.match(kids,/name="KidPlants"/);assert.match(kids,/GameView/);ok('kids interface has My Plants and games, without Design or AI chat');
assert.match(server,/kidMayUse/);assert.match(server,/\/api\/household\/plants/);assert.match(server,/\/api\/assistant\/chat/);assert.match(server,/getUsersByEmail/);assert.match(dbi,/createKidUser/);
assert.ok(fs.existsSync(path.join(root,'Backend/Database/migrate-kids-accounts.sql')));ok('backend: kids login, read-only kids, household plants, assistant route, migration');

// ---- behaviour of the demo data layer ----
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rootesp-'));
 for(const [src,dst] of [['src/api.js','api.mjs'],['src/mock.js','mock.mjs'],['src/logic.js','logic.mjs'],['src/assistant.js','assistant.mjs']]){
  const code=fs.readFileSync(F(src),'utf8').replace(/from '\.\/(mock|logic|assistant)'/g,"from './$1.mjs'");fs.writeFileSync(path.join(dir,dst),code);
 }
 const {api}=await import(path.join(dir,'api.mjs'));
 const parent=await api.login('user@sera.app','demopassword');assert.ok(!parent.IsKid);
 const maya=await api.login('user@sera.app','kidspassword');assert.equal(maya.IsKid,true);assert.equal(maya.ParentUserID,parent.UserID);ok('same email, the password decides between adult and kids account');
 await assert.rejects(api.createKidAccount(parent.UserID,{name:'Ana',password:'demopassword'}),/already used/);ok('kids password cannot match the adult password');
 const ana=await api.createKidAccount(parent.UserID,{name:'Ana',password:'ana-garden'});assert.equal(ana.Email,parent.Email);assert.equal(ana.DisplayName,'Ana');
 assert.equal((await api.login('user@sera.app','ana-garden')).UserID,ana.UserID);ok('new kids account signs in with the shared email');
 await assert.rejects(api.createKidAccount(maya.UserID,{name:'X',password:'xxxxxxx'}),/adult account/);ok('kids cannot create kids accounts');
 const mine=await api.getPlants(parent.UserID),seen=await api.getHouseholdPlants(maya);assert.deepEqual(seen.map(p=>p.PlantID),mine.map(p=>p.PlantID));ok('kids see the household plants');
 assert.equal((await api.getKidAccounts(parent.UserID)).length,2);
 const r=await api.assistantChat(parent.UserID,[{role:'user',content:'How are my plants doing?'}]);assert.match(r.reply,new RegExp(mine[0].PlantName));ok('demo assistant answers with the user\'s own plants');
 fs.rmSync(dir,{recursive:true,force:true});
 console.log(`v2.3 FEATURES: ${passed} PASS`);
})().catch(e=>{console.error(e);process.exitCode=1;});
