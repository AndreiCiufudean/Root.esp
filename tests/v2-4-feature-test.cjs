// v2.4: one-tap kids switch, safe areas, plant cards, Flower 2048, eg pot custom, history as designer, logo back.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=path.resolve(__dirname,'..');const F=p=>path.join(root,'Frontend',p);const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let passed=0;const ok=(name)=>{passed++;console.log('PASS '+name);};

const app=read('Frontend/App.js'),ui=read('Frontend/src/ui.js'),menu=read('Frontend/src/screens/MenuScreen.js'),kids=read('Frontend/src/kids/KidsApp.js');
const games=read('Frontend/src/kids/games.js'),hist=read('Frontend/src/designHistory.js'),design=read('Frontend/src/screens/DesignScreen.js');
const home=read('Frontend/src/screens/HomeScreen.js'),plants=read('Frontend/src/screens/PlantsScreen.js'),cards=read('Frontend/src/plantCards.js'),side=read('Frontend/src/Sidebar.js');
const server=read('Backend/Database_interface/index.js');

assert.match(menu,/KidRow/);assert.match(menu,/openKidSession/);assert.doesNotMatch(menu,/title="Switch"/);ok('Profile: tapping a child opens the kids account');
assert.match(server,/\/api\/users\/:userID\/kids\/:kidID\/session/);assert.match(server,/ParentUserID=\? AND IsKid=1/);ok('backend: parent-only kids session route');
assert.match(app,/SafeAreaProvider/);assert.match(app,/insets\.bottom/);assert.match(kids,/useSafeAreaInsets/);assert.match(ui,/SafeBottom/);ok('tab bars and pages respect the phone navigation buttons');
assert.match(home,/PlantTile/);assert.match(home,/AttentionCard/);assert.match(plants,/FilterChip/);assert.match(cards,/SoilTank/);ok('new My plants and Needs attention cards');
assert.match(games,/id:'bloom'/);assert.match(kids,/Flower 2048/);assert.match(games,/PanResponder/);ok('Flower 2048 in the kids games and on kids Home');
assert.match(hist,/outcome:'potCustom'/);assert.match(hist,/uploaded:'roomDesigned'/);assert.match(hist,/Design the Monstera's pot/);assert.ok(fs.existsSync(F('assets/design/eg-pot-custom.jpg')));assert.doesNotMatch(hist,/pending:true/);ok('eg pot custom: room outcome in, pot render out');
assert.match(design,/const ro=!!viewing/);assert.doesNotMatch(design,/<Sheet/);assert.match(design,/Start from these answers/);ok('history opens in the designer with prefilled, locked answers');
assert.match(ui,/LogoBack/);assert.match(app,/backBehavior="history"/);assert.match(app,/headerLeft: \(\) => <LogoBack/);assert.match(side,/LogoBack/);ok('Root.esp logo works as the back button');

(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rootesp24-'));
 for(const [src,dst] of [['src/api.js','api.mjs'],['src/mock.js','mock.mjs'],['src/logic.js','logic.mjs'],['src/assistant.js','assistant.mjs'],['src/kids/bloom2048.js','bloom.mjs']]){
  const code=fs.readFileSync(F(src),'utf8').replace(/from '\.\/(mock|logic|assistant)'/g,"from './$1.mjs'");fs.writeFileSync(path.join(dir,dst),code);
 }
 const {api}=await import(path.join(dir,'api.mjs'));
 const parent=await api.login('user@sera.app','demopassword');
 const [maya]=await api.getKidAccounts(parent.UserID);
 const opened=await api.openKidSession(parent.UserID,maya.UserID);assert.equal(opened.UserID,maya.UserID);assert.equal(opened.IsKid,true);assert.equal(opened.Password,undefined);ok('parent opens a kids account without its password');
 await assert.rejects(api.openKidSession(maya.UserID,maya.UserID),/grown-up/);ok('a kids account cannot open accounts');
 const other=await api.login('admin@sera.app','demopassword').catch(()=>null);
 if(other&&!other.IsKid){await assert.rejects(api.openKidSession(other.UserID,maya.UserID),/does not belong/);ok('another adult cannot open someone else\'s child');}

 const b=await import(path.join(dir,'bloom.mjs'));
 const r=b.slideBoard([[2,2,4,0],[0,0,0,0],[4,0,4,8],[2,2,2,2]],'left');
 assert.deepEqual(r.board,[[4,4,0,0],[0,0,0,0],[8,8,0,0],[4,4,0,0]]);assert.equal(r.moved,true);assert.equal(r.gained,4+8+4+4);ok('2048: merges once per pair, slides left');
 assert.deepEqual(b.slideBoard([[2,0,0,0],[2,0,0,0],[4,0,0,0],[4,0,0,0]],'up').board.map(x=>x[0]),[4,8,0,0]);
 assert.deepEqual(b.slideBoard([[2,0,0,0],[2,0,0,0],[4,0,0,0],[4,0,0,0]],'down').board.map(x=>x[0]),[0,0,4,8]);
 assert.deepEqual(b.slideBoard([[0,2,2,2],[0,0,0,0],[0,0,0,0],[0,0,0,0]],'right').board[0],[0,0,2,4]);ok('2048: up, down and right');
 assert.equal(b.slideBoard([[2,4,2,4],[4,2,4,2],[2,4,2,4],[4,2,4,2]],'left').moved,false);assert.equal(b.canMove([[2,4,2,4],[4,2,4,2],[2,4,2,4],[4,2,4,2]]),false);ok('2048: detects a stuck garden');
 const seeded=b.addSeed([[0,0],[0,0]].map(()=>[0,0,0,0]).concat([[0,0,0,0],[0,0,0,0]]),()=>0);assert.equal(seeded.flat().filter(Boolean).length,1);
 assert.equal(b.bloomStars(16),0);assert.equal(b.bloomStars(32),1);assert.equal(b.bloomStars(64),2);assert.equal(b.bloomStars(128),3);assert.equal(b.stageOf(32)[2],'Tulip');ok('2048: seeds, stars and stage names');
 console.log(`v2.4 FEATURES: ${passed} PASS`);
})().catch(e=>{console.error(e);process.exit(1);});
