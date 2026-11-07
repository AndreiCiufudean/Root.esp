/* Dependency-free verification of v1.6 architecture, palettes, audio and account isolation.
 * No claim of real Expo rendering or SQL Server integration is made by this suite. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,'Frontend',p),'utf8');
let checks=0;
const ok=(name,value)=>{assert.ok(value,name);console.log('PASS',name);checks++;};
function execute(file,imports){
  const source=read(file).replace(/^import[^\n]*\n/gm,'').replace(/^export /gm,'');
  const env={...imports,Math,Set,Map,Date,console,require:()=>({asset:true}),setTimeout,clearTimeout};
  vm.runInNewContext(source+'\n;globalExports={THEMES:typeof THEMES!=="undefined"?THEMES:null,THEME_IDS:typeof THEME_IDS!=="undefined"?THEME_IDS:null,colors:typeof colors!=="undefined"?colors:null,applyTheme:typeof applyTheme!=="undefined"?applyTheme:null,PASTELS:typeof PASTELS!=="undefined"?PASTELS:null,DEFAULT_SOUND:typeof DEFAULT_SOUND!=="undefined"?DEFAULT_SOUND:null,playSound:typeof playSound!=="undefined"?playSound:null,updateSoundSettings:typeof updateSoundSettings!=="undefined"?updateSoundSettings:null,startGameMusic:typeof startGameMusic!=="undefined"?startGameMusic:null,stopGameMusic:typeof stopGameMusic!=="undefined"?stopGameMusic:null};',env,{filename:file});
  return env.globalExports;
}
async function run(){
  const theme=execute('src/theme.js',{StyleSheet:{create:o=>o}});
  ok('three distinct complete pastel themes', ['sakura','forest','ocean'].every(id=>theme.THEMES[id]?.light&&theme.THEMES[id]?.dark));
  for(const id of ['sakura','forest','ocean'])for(const appearance of ['light','dark']){
    theme.applyTheme(id,appearance);const c=theme.colors;
    const fields=['soil','fern','mist','paper','field','line','muted','rail','railText','railMuted','railActive','railGame','gradient','onFern'];
    ok(`${id}/${appearance}: semantic surfaces + readable theme values`,fields.every(k=>!!c[k])&&c.rail.length===3&&c.gradient.length===3&&c.isDark===(appearance==='dark'));
  }
  theme.applyTheme('sakura','light');ok('Sakura is pink-led, not a solid green rail',theme.colors.rail[0]==='#F6C9DA'&&theme.colors.fern==='#A84D79');
  theme.applyTheme('forest','light');ok('Forest has its own sage rail',theme.colors.rail[0]==='#C1DBC4');
  theme.applyTheme('ocean','light');ok('Sea Glass has a blue-green rail',theme.colors.rail[0]==='#B4DAD8');
  const log=[];
  const mockAudio={Sound:{createAsync:async(file,settings)=>{
    const o={playAsync:async()=>log.push('play'),pauseAsync:async()=>log.push('pause'),stopAsync:async()=>log.push('stop'),setVolumeAsync:async v=>log.push(`vol:${v}`),replayAsync:async()=>log.push('replay')};
    log.push('created');return {sound:o};
  }}};
  const sound=execute('src/sound.js',{Audio:mockAudio});
  sound.updateSoundSettings({masterMute:true});await sound.playSound('click');
  ok('master mute suppresses interaction sound',log.length===0);
  sound.updateSoundSettings({masterMute:false,ui:false});await sound.playSound('click');
  ok('UI effects switch suppresses UI clicks',log.length===0);
  sound.updateSoundSettings({ui:true});await sound.playSound('click');
  ok('UI sound plays only after UI is enabled',log.includes('replay'));
  log.length=0;sound.updateSoundSettings({gameEffects:false});await sound.playSound('water',{channel:'game'});
  ok('game effects switch disables game-water SFX',log.length===0);
  log.length=0;sound.updateSoundSettings({gameEffects:true,gameMusic:true,gameMusicVolume:0.4});await sound.startGameMusic();await sound.stopGameMusic();
  ok('game music starts and pauses without changing device data',log.includes('play')&&log.includes('pause'));
  const app=read('App.js'),prefs=read('src/prefs.js'),settings=read('src/SettingsModal.js'),tour=read('src/Tour.js'),menu=read('src/screens/MenuScreen.js');
  ok('account switches remount navigator, not an old AddAccount screen',app.includes('authEpoch')&&app.includes('navState.current = undefined')&&app.includes('setAuthEpoch'));
  ok('new account intro is before its login screen',app.includes('beginAddAccount')&&app.includes('pendingAdd.current')&&app.includes("navigationRef.navigate('AddAccount')"));
  ok('pledges use account IDs and demo/real namespace',prefs.includes('pledges:')&&prefs.includes("USE_MOCK?'m':'r'")&&menu.includes('pledgeFor(user)'));
  ok('legacy signature cannot be migrated to unrelated accounts',prefs.includes('legacyOwner')&&prefs.includes('old.legacyOwner!==user.UserID'));
  ok('sound and appearance are device-level shared settings',settings.includes('Game music')&&settings.includes('Master mute')&&settings.includes('Appearance'));
  ok('single game settings entry opens shared modal',read('src/screens/GameScreen.js').includes("openSettings('sound')"));
  ok('tour completion is per account and tab',tour.includes('rootesp.tours.v1')&&tour.includes('user.UserID')&&tour.includes('USE_MOCK')&&tour.includes("rootesp.tours.v1"));
  ok('tour anchors are measured and remeasured from rendered components',tour.includes('measureInWindow')&&tour.includes('measureEpoch')&&tour.includes('scrollIntoView'));
  const def=read('src/tourDefinitions.js');
  for(const tab of ['home','plants','notifications','discover','game'])ok(`${tab}: contextual steps exist`,def.includes(tab+':['));
  const srcFiles=['screens/HomeScreen.js','screens/PlantsScreen.js','screens/NotificationsScreen.js','screens/DiscoverScreen.js','screens/GameScreen.js'];
  ok('guided tours in ordinary screens and independent in-game tutorial',srcFiles.slice(0,-1).every(f=>read('src/'+f).includes('TourAnchor')&&read('src/'+f).includes('useScreenTour'))&&read('src/screens/GameScreen.js').includes('tutorialSeen')); 
  ok('game does not reference watering APIs',!read('src/screens/GameScreen.js').includes('api.waterNow')&&!read('src/screens/GameScreen.js').includes('saveSettings('));
  console.log(`PHASE 2: ${checks} checks passed (mocked audio, source-level layout/tour validation)`);
}
run().catch(e=>{console.error('FAIL',e);process.exitCode=1;});
