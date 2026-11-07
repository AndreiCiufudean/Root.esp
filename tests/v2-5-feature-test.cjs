// v2.5: fair kids badges, kids music, uncropped design photos, optional questionnaire in Design,
// transitions and entering page, link-a-device prompt with Root.esp ads, APK build config.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');const F=p=>path.join(root,'Frontend',p);const read=p=>fs.readFileSync(F(p),'utf8');
let n=0;const ok=s=>{n++;console.log('PASS '+s);};
const games=read('src/kids/games.js'),kids=read('src/kids/KidsApp.js'),music=read('src/kids/music.js'),design=read('src/screens/DesignScreen.js'),intro=read('src/Intro.js');
const app=read('App.js'),ui=read('src/ui.js'),nudge=read('src/deviceNudge.js'),pkg=JSON.parse(read('package.json')),appj=JSON.parse(read('app.json')),eas=JSON.parse(read('eas.json'));
assert.doesNotMatch(games,/state==='flood'\?1/);assert.match(kids,/BADGES=\[\[6,/);assert.match(kids,/BadgePopup/);assert.match(kids,/newlyEarned/);ok('no star for overwatering; badges need real play and are announced with the reason');
assert.ok(fs.existsSync(F('assets/sound/kids-calm-loop.mp3')));assert.match(music,/isLooping:true/);assert.match(kids,/KidsMusicProvider/);assert.match(kids,/MusicButton/);assert.ok(pkg.dependencies['expo-av']);ok('calm looping music in the kids app with an on/off button');
assert.doesNotMatch(design,/resizeMode="cover"/);assert.match(design,/PhotoFrame/);ok('design photos are never cropped and share one frame');
assert.doesNotMatch(intro,/QUESTIONS/);assert.match(design,/QuestionnaireSheet/);assert.match(design,/wasOffered/);ok('questionnaire moved out of the intro into the Design studio, optional');
assert.match(app,/EnterLoader/);assert.match(read('src/Icon.js'),/react-native-svg/);assert.match(app,/slide_from_right/);assert.match(ui,/Pages ease in/);ok('loading page before the app and transitions between features');
assert.match(nudge,/triedEverything/);assert.match(nudge,/navigate\('Devices'\)/);assert.match(nudge,/Prototype ad · Root\.esp/);assert.match(app,/recordFeature/);for(const s of ['HomeScreen','PlantsScreen','DesignScreen'])assert.match(read(`src/screens/${s}.js`),/AdSlot/);ok('link-a-device prompt, Yes -> devices, No -> Root.esp prototype ads');
assert.equal(eas.build.apk.android.buildType,'apk');assert.equal(appj.expo.android.package,'com.rootesp.app');assert.ok(appj.expo.android.versionCode>=25);assert.ok(fs.existsSync(path.join(root,'Frontend/BUILD_APK.md')));assert.match(pkg.scripts.apk,/--profile apk/);ok('APK build with Expo EAS is configured');
console.log(`v2.5 FEATURES: ${n} PASS`);
