const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
// TypeScript is an optional development-time parser for JSX. Do not require
// a machine-specific globally installed path when running these offline checks.
let ts;
for (const location of ['typescript', '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js', '/opt/npm-tools/node_modules/typescript/lib/typescript.js']) {
  try { ts=require(location);break; } catch (_) {}
}
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const m=require('../Frontend/src/discoveryModel.cjs');
const paths=[
 'Frontend/App.js','Frontend/src/Intro.js','Frontend/src/screens/DiscoverScreen.js',
 'Frontend/src/screens/GameScreen.js','Frontend/src/screens/HomeScreen.js','Frontend/src/screens/NotificationsScreen.js',
 'Frontend/src/screens/MenuScreen.js','Frontend/src/RootPromo.js','Frontend/src/Sidebar.js',
 'Frontend/src/naturePhotos.js','Frontend/src/natureQueue.js','Frontend/src/api.js',
 'Frontend/src/tourDefinitions.js','Frontend/src/SettingsModal.js',
 'Frontend/src/WelcomeOffer.js','Frontend/src/Tour.js','Frontend/src/prefs.js','Frontend/src/theme.js','Frontend/src/ui.js',
 'Frontend/src/screens/PlantDetailScreen.js','Frontend/src/screens/LoginScreen.js',
 'Backend/Database_interface/discovery_routes.js','Backend/Database_interface/index.js'
];
if (ts) for(const p of paths){const src=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,p.endsWith('.js')?ts.ScriptKind.JSX:ts.ScriptKind.JS);const errs=src.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' '));assert(!errs.length,`${p}: ${errs.join(', ')}`);console.log('syntax:',p);}
else console.log('SKIP JSX parse check (install typescript to enable); other regression checks still run.');
const r=[{id:'a',commonName:'Daisy',scientificName:'Bellis perennis',category:'flower',createdAt:'2026-01-01T01:00:00Z'}, {id:'b',commonName:'Daisy again',scientificName:'Bellis perennis',category:'flower',createdAt:'2026-01-02T01:00:00Z'}];
assert.equal(m.summarize(r).points,50);
assert.equal(m.summarize(r).uniqueSpecies,1);
assert.equal(m.summarize(r).discoveryCount,2);
const extra=['Cactus','Basil','Fern','Pansy'].map((name,i)=>({id:String(i),commonName:name,category:'other',createdAt:`2026-01-03T0${i}:00:00Z`}));
assert.equal(m.summarize([...r,...extra]).uniqueSpecies,5);
assert.deepEqual(m.summarize([...r,...extra]).rewards.map(x=>x.id),['butterfly','flower_pot']);
const game=read('Frontend/src/screens/GameScreen.js'),notifs=read('Frontend/src/screens/NotificationsScreen.js'),app=read('Frontend/App.js');
assert(game.includes('THIS GAME DOES NOT WATER REAL PLANTS') && game.includes('I understand — continue'));
assert(game.includes("scene==='tutorial'") && game.includes('completeTutorial'));
assert(notifs.includes('Starter alert is ONLY acknowledged'));
assert(!notifs.includes('startTutorial()'));
assert(app.includes('name="Discover"') && !app.includes('name="Community"'));
assert(read('Backend/Database_interface/discovery_routes.js').includes('await conn.beginTransaction()'));
assert(read('Backend/Database/migrate-nature-discovery.sql').includes('CONSTRAINT UQ_NatureDiscoveryClient UNIQUE(UserID,ClientID)'));
console.log('Nature/discovery regression checks passed');
