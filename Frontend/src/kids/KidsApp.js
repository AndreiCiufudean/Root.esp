// The kids interface: bright colours, big buttons, no Design tab and no AI chat.
// Tabs: Home, My Plants (animated plant buddies with mini games), Me.
import React,{useCallback,useEffect,useRef,useState} from 'react';
import {View,Text,Pressable,ScrollView,Animated,Easing,TextInput,Modal,useWindowDimensions} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useIsFocused} from '@react-navigation/native';
import {useAuth} from '../auth';
import {api,USE_MOCK} from '../api';
import {kvGet,kvSet} from '../store';
import {useLiveRefresh} from '../useLiveRefresh';
import {KID} from '../theme';
import Icon from '../Icon';
import PlantBuddy from './PlantBuddy';
import {GameView,GAMES} from './games';
import {KidsMusicProvider,MusicButton} from './music';
import {buddyLines,buddyMood,speak,stopSpeaking,canSpeak} from './talk';

const Tabs=createBottomTabNavigator();
const kidName=u=>u?.DisplayName||u?.Username||'friend';
const progressKey=u=>`rootesp.kids.v1.${USE_MOCK?'demo':'real'}.${u.UserID}`;
// Badges need real play: one perfect game (3 stars) is not enough for the first one.
export const BADGES=[[6,'sprout','Seedling'],[15,'leaf','Leaf helper'],[30,'flower','Bloom buddy'],[60,'tree','Garden hero']];
export const newlyEarned=(before,after)=>BADGES.filter(([need])=>before<need&&after>=need).pop()||null;

// Shared star counter for the kid (stored on this device per kids account).
function useProgress(user){
 const [p,setP]=useState({stars:0,plants:{}});const focused=useIsFocused();
 useEffect(()=>{if(!focused)return undefined;let on=true;kvGet(progressKey(user),{stars:0,plants:{}}).then(x=>{if(on)setP({stars:0,plants:{},...x});});return()=>{on=false;};},[user.UserID,focused]);
 const [badge,setBadge]=useState(null);
 // Always add to the stored total (another tab may have changed it), then say clearly when a badge is earned and why.
 const add=useCallback(async(plantId,stars)=>{const old={stars:0,plants:{},...(await kvGet(progressKey(user),{stars:0,plants:{}}))};const cur=old.plants[plantId]||{stars:0,games:0};const next={...old,stars:old.stars+stars,plants:{...old.plants,[plantId]:{stars:cur.stars+stars,games:cur.games+1}}};await kvSet(progressKey(user),next);setP(next);const b=newlyEarned(old.stars,next.stars);if(b)setBadge(b);},[user.UserID]);
 return [p,add,badge,()=>setBadge(null)];
}
function useHousehold(user){
 const [plants,setPlants]=useState(null),[err,setErr]=useState('');
 const load=useCallback((active=()=>true)=>{if(typeof active!=='function')active=()=>true;return api.getHouseholdPlants(user).then(x=>{if(active()){setPlants(x);setErr('');}}).catch(e=>{if(active())setErr(e.message);});},[user.UserID]);
 useLiveRefresh(load);
 return {plants,err,load};
}

// Kids screens have no header, so the sky keeps the content clear of the status bar and the phone's
// own navigation buttons at the bottom (edge-to-edge Android).
function Sky({children}){
 const insets=useSafeAreaInsets();
 return <View style={{flex:1,paddingTop:insets.top,paddingLeft:insets.left,paddingRight:insets.right}}>
  <LinearGradient colors={KID.sky} start={{x:0,y:0}} end={{x:0,y:1}} style={{position:'absolute',left:0,right:0,top:0,bottom:0}}/>
  <View style={{position:'absolute',left:-40,right:-40,bottom:-60,height:140,borderTopLeftRadius:400,borderTopRightRadius:400,backgroundColor:KID.grass}}/>
  {children}
 </View>;
}
function Sun({size=90}){
 const spin=useRef(new Animated.Value(0)).current;
 useEffect(()=>{const a=Animated.loop(Animated.timing(spin,{toValue:1,duration:12000,easing:Easing.linear,useNativeDriver:true}));a.start();return()=>a.stop();},[]);
 return <View style={{width:size,height:size,alignItems:'center',justifyContent:'center'}}>
  <Animated.View style={{position:'absolute',transform:[{rotate:spin.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']})}]}}><Icon name="white-balance-sunny" size={size} color={KID.sun}/></Animated.View>
 </View>;
}
const StarPill=({stars})=><View accessibilityLabel={`${stars} stars`} style={{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'#FFFFFFE6',borderRadius:20,paddingHorizontal:14,paddingVertical:8,borderWidth:3,borderColor:KID.sun}}><Icon name="star" size={22} color={KID.sun}/><Text style={{fontWeight:'800',fontSize:18,color:KID.ink}}>{stars}</Text></View>;
const H1=({children,color=KID.ink})=><Text style={{fontSize:32,fontWeight:'900',color,letterSpacing:-0.5}}>{children}</Text>;
const KCard=({children,i=0,style,onPress,label})=>{const body=<View style={[{backgroundColor:KID.cards[i%KID.cards.length],borderRadius:26,padding:18,borderWidth:3,borderColor:KID.cardInk[i%KID.cardInk.length]+'55',borderBottomWidth:6},style]}>{children}</View>;return onPress?<Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({pressed})=>({transform:[{scale:pressed?0.97:1}]})}>{body}</Pressable>:body;};

// Shown only when a badge is really earned, with the reason (how many stars were collected).
function BadgePopup({badge,onClose}){
 const pop=useRef(new Animated.Value(0.6)).current;
 useEffect(()=>{if(badge){pop.setValue(0.6);Animated.spring(pop,{toValue:1,friction:4,useNativeDriver:true}).start();}},[badge]);
 if(!badge)return null;const [need,icon,label]=badge;
 return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View style={{flex:1,backgroundColor:'#24324ACC',alignItems:'center',justifyContent:'center',padding:24}}>
  <Animated.View style={{backgroundColor:'#fff',borderRadius:30,padding:24,alignItems:'center',gap:10,width:'100%',maxWidth:360,borderWidth:4,borderColor:KID.sun,transform:[{scale:pop}]}}>
   <Text style={{fontSize:14,fontWeight:'900',color:KID.orange,letterSpacing:1}}>NEW BADGE</Text>
   <View style={{width:96,height:96,borderRadius:48,backgroundColor:KID.sun,alignItems:'center',justifyContent:'center',borderWidth:5,borderColor:'#FFF4C2'}}><Icon name={icon} size={50} color="#fff"/></View>
   <Text style={{fontSize:26,fontWeight:'900',color:KID.ink}}>{label}</Text>
   <Text style={{fontSize:16,color:KID.ink,textAlign:'center'}}>You collected {need} stars playing with your plant buddies. Well done!</Text>
   <Pressable accessibilityRole="button" onPress={onClose} style={{marginTop:6,backgroundColor:KID.grassDark,borderRadius:18,paddingHorizontal:28,paddingVertical:12}}><Text style={{color:'#fff',fontWeight:'900',fontSize:17}}>Yay!</Text></Pressable>
  </Animated.View>
 </View></Modal>;
}

// ---------------------------------------------------------------------------- Home
function KidHome({navigation}){
 const pb=120+useSafeAreaInsets().bottom;
 const {user}=useAuth();const [progress,addStars,badge,clearBadge]=useProgress(user);const {plants}=useHousehold(user);const [bloom,setBloom]=useState(false);
 const needHelp=(plants||[]).filter(p=>buddyMood(p)!=='happy');
 const fact=['Plants drink through their roots.','Sunlight is plant food.','Ladybugs protect leaves.','Turn pots so plants grow straight.'][new Date().getDate()%4];
 return <Sky><ScrollView contentContainerStyle={{padding:20,gap:16,paddingBottom:pb,maxWidth:760,width:'100%',alignSelf:'center'}}>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Sun size={74}/><View style={{flexDirection:'row',alignItems:'center',gap:10}}><MusicButton/><StarPill stars={progress.stars}/></View></View>
  <View><H1>Hi {kidName(user)}!</H1><Text style={{fontSize:18,color:KID.ink,fontWeight:'600'}}>Your plant buddies missed you.</Text></View>
  <KCard i={2} label="Visit my plants" onPress={()=>navigation.navigate('KidPlants')}>
   <View style={{flexDirection:'row',alignItems:'center',gap:14}}>
    <PlantBuddy size={110} kind={plants?.[0]?.species?.Category} mood={plants?.[0]?buddyMood(plants[0]):'happy'}/>
    <View style={{flex:1,gap:8}}><Text style={{fontSize:22,fontWeight:'900',color:KID.cardInk[2]}}>Visit my plants</Text><Text style={{color:KID.ink,fontSize:16}}>{plants?`${plants.length} buddies want to talk and play`:'Loading your buddies…'}</Text>
     <View style={{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:6,backgroundColor:KID.grassDark,borderRadius:16,paddingHorizontal:14,paddingVertical:8}}><Text style={{color:'#fff',fontWeight:'800'}}>Let's go</Text><Icon name="arrow-right" size={18} color="#fff"/></View></View>
   </View>
  </KCard>
  {/* Flower 2048: the garden puzzle, playable straight from Home */}
  <Pressable accessibilityRole="button" accessibilityLabel="Play Flower 2048" onPress={()=>setBloom(true)} style={({pressed})=>({borderRadius:26,overflow:'hidden',borderBottomWidth:6,borderColor:'#00000025',transform:[{scale:pressed?0.97:1}]})}>
   <LinearGradient colors={[KID.grape,KID.berry]} start={{x:0,y:0}} end={{x:1,y:1}} style={{padding:18,flexDirection:'row',alignItems:'center',gap:14}}>
    <View style={{width:96,height:96,borderRadius:20,backgroundColor:'#8D6E63',padding:6,gap:4}}>
     {[[['seed','#F3E3C8','#8D6E63'],['sprout','#E3F6D5','#558B2F']],[['flower-tulip','#FFD6E4','#C2185B'],['flower','#FFF1B8','#E65100']]].map((row,r)=><View key={r} style={{flex:1,flexDirection:'row',gap:4}}>{row.map(([ic,bg,ink])=><View key={ic} style={{flex:1,borderRadius:10,backgroundColor:bg,alignItems:'center',justifyContent:'center'}}><Icon name={ic} size={22} color={ink}/></View>)}</View>)}
    </View>
    <View style={{flex:1,gap:6}}>
     <Text style={{fontSize:13,fontWeight:'900',color:'#FFFFFFD9',letterSpacing:1}}>NEW GAME</Text>
     <Text style={{fontSize:24,fontWeight:'900',color:'#fff'}}>Flower 2048</Text>
     <Text style={{color:'#fff',fontSize:15}}>Swipe the garden. Two seeds make a sprout, two sprouts make a leaf… grow a flower!</Text>
    </View>
   </LinearGradient>
  </Pressable>
  {needHelp.length>0&&<KCard i={3}><View style={{flexDirection:'row',alignItems:'center',gap:10,marginBottom:6}}><Icon name="hand-heart" size={28} color={KID.cardInk[3]}/><Text style={{fontSize:20,fontWeight:'900',color:KID.cardInk[3]}}>Who needs a hug?</Text></View>
   {needHelp.map(p=><Pressable key={p.PlantID} accessibilityRole="button" onPress={()=>navigation.navigate('KidPlant',{plantId:p.PlantID})} style={{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:8}}><Icon name={buddyMood(p)==='thirsty'?'water-alert':'weather-sunny-alert'} size={26} color={buddyMood(p)==='thirsty'?KID.ocean:KID.orange}/><Text style={{fontSize:17,color:KID.ink,flex:1}}><Text style={{fontWeight:'800'}}>{p.PlantName}</Text> {buddyMood(p)==='thirsty'?'is thirsty. Tell a grown-up!':'wants more sunshine.'}</Text><Icon name="chevron-right" size={24} color={KID.ink}/></Pressable>)}
  </KCard>}
  <Modal visible={bloom} transparent animationType="fade" onRequestClose={()=>setBloom(false)}><View style={{flex:1,backgroundColor:'#24324ACC',justifyContent:'center',padding:16}}><View style={{width:'100%',maxWidth:560,alignSelf:'center'}}>
   {bloom&&<GameView id="bloom" onClose={()=>setBloom(false)} onFinish={stars=>{if(stars>0)addStars('garden',stars);setBloom(false);}}/>}
  </View></View></Modal>
  <BadgePopup badge={badge} onClose={clearBadge}/>
  <KCard i={4}><View style={{flexDirection:'row',alignItems:'center',gap:12}}><Icon name="lightbulb-on" size={34} color={KID.cardInk[4]}/><View style={{flex:1}}><Text style={{fontSize:14,fontWeight:'800',color:KID.cardInk[4]}}>PLANT FACT OF THE DAY</Text><Text style={{fontSize:18,color:KID.ink,fontWeight:'600'}}>{fact}</Text></View></View></KCard>
 </ScrollView></Sky>;
}

// ---------------------------------------------------------------------------- My Plants
function KidPlants({navigation}){
 const pb=120+useSafeAreaInsets().bottom;
 const {user}=useAuth();const {plants,err,load}=useHousehold(user);const [progress]=useProgress(user);
 const {width}=useWindowDimensions();const cols=width>=900?3:width>=560?2:1;
 return <Sky><ScrollView contentContainerStyle={{padding:20,gap:16,paddingBottom:pb,maxWidth:1000,width:'100%',alignSelf:'center'}}>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><H1>My Plants</H1><View style={{flexDirection:'row',alignItems:'center',gap:10}}><MusicButton/><StarPill stars={progress.stars}/></View></View>
  <Text style={{fontSize:17,color:KID.ink,fontWeight:'600',marginTop:-8}}>Tap a buddy to talk and play games!</Text>
  {err?<KCard i={0}><Text style={{fontSize:17,color:KID.ink}}>Oh no, the plants are hiding. </Text><Pressable onPress={load} accessibilityRole="button"><Text style={{fontWeight:'800',color:KID.cardInk[0],fontSize:17}}>Try again</Text></Pressable></KCard>
  :!plants?<Text style={{fontSize:18,color:KID.ink}}>Finding your buddies…</Text>
  :plants.length===0?<KCard i={1}><Text style={{fontSize:18,color:KID.ink}}>No plants yet! Ask a grown-up to add one in Root.esp.</Text></KCard>
  :<View style={{flexDirection:'row',flexWrap:'wrap',gap:16}}>{plants.map((p,i)=>{const mood=buddyMood(p);const st=progress.plants[p.PlantID]?.stars||0;return <View key={p.PlantID} style={{width:cols===1?'100%':`${100/cols-3}%`,flexGrow:1}}>
   <KCard i={i} label={`Open ${p.PlantName}`} onPress={()=>navigation.navigate('KidPlant',{plantId:p.PlantID})} style={{alignItems:'center',gap:6}}>
    <PlantBuddy size={170} kind={p.species?.Category} mood={mood} colorIndex={i}/>
    <Text style={{fontSize:24,fontWeight:'900',color:KID.cardInk[i%KID.cardInk.length]}}>{p.PlantName}</Text>
    <Text style={{fontSize:15,color:KID.ink}}>{p.species?.CommonName||'Plant buddy'}</Text>
    <View style={{flexDirection:'row',gap:8,alignItems:'center',flexWrap:'wrap',justifyContent:'center'}}>
     <View style={{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:'#FFFFFFCC',borderRadius:14,paddingHorizontal:10,paddingVertical:5}}><Icon name={mood==='thirsty'?'water-alert':mood==='sleepy'?'weather-night':'emoticon-happy-outline'} size={18} color={mood==='thirsty'?KID.ocean:mood==='sleepy'?KID.grape:KID.grassDark}/><Text style={{fontWeight:'700',color:KID.ink}}>{mood==='thirsty'?'Thirsty':mood==='sleepy'?'Sleepy':'Happy'}</Text></View>
     <View style={{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:'#FFFFFFCC',borderRadius:14,paddingHorizontal:10,paddingVertical:5}}><Icon name="star" size={18} color={KID.sun}/><Text style={{fontWeight:'700',color:KID.ink}}>{st}</Text></View>
    </View>
   </KCard></View>;})}</View>}
 </ScrollView></Sky>;
}

// ---------------------------------------------------------------------------- One plant buddy
export function KidPlantScreen({route,navigation}){
 const pb=120+useSafeAreaInsets().bottom;
 const {user}=useAuth();const {plants}=useHousehold(user);const [progress,addStars,badge,clearBadge]=useProgress(user);
 const plant=plants?.find(p=>p.PlantID===route.params?.plantId);
 const [line,setLine]=useState(0),[shown,setShown]=useState(''),[talking,setTalking]=useState(false),[cheer,setCheer]=useState(0),[game,setGame]=useState(null),[voice,setVoice]=useState(false);
 const lines=plant?buddyLines(plant,kidName(user)):[];
 const text=lines[line%Math.max(1,lines.length)]||'';
 // Typewriter: the mouth moves while the words appear (and while the voice speaks, on web).
 useEffect(()=>{if(!text)return undefined;setShown('');setTalking(true);let i=0;const id=setInterval(()=>{i+=2;setShown(text.slice(0,i));if(i>=text.length){clearInterval(id);if(!voice)setTalking(false);}},45);
  if(voice)speak(text,()=>setTalking(false));
  return()=>clearInterval(id);},[text,voice]);
 useEffect(()=>()=>stopSpeaking(),[]);
 if(!plants)return <Sky><View style={{flex:1,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:20,color:KID.ink}}>Waking up your buddy…</Text></View></Sky>;
 if(!plant)return <Sky><View style={{flex:1,alignItems:'center',justifyContent:'center',gap:12}}><Text style={{fontSize:20,color:KID.ink}}>This buddy moved away.</Text><Pressable onPress={()=>navigation.goBack()}><Text style={{fontWeight:'800',fontSize:18,color:KID.grassDark}}>Go back</Text></Pressable></View></Sky>;
 const idx=plants.indexOf(plant);const mood=buddyMood(plant);const mine=progress.plants[plant.PlantID]||{stars:0,games:0};
 const talk=()=>{setCheer(c=>c+1);setLine(l=>l+1);};
 return <Sky><ScrollView contentContainerStyle={{padding:20,gap:14,paddingBottom:pb,maxWidth:760,width:'100%',alignSelf:'center'}}>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
   <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={()=>{stopSpeaking();navigation.goBack();}} style={{width:52,height:52,borderRadius:26,backgroundColor:'#FFFFFFE6',alignItems:'center',justifyContent:'center',borderWidth:3,borderColor:KID.grape}}><Icon name="arrow-left" size={28} color={KID.grape}/></Pressable>
   <StarPill stars={progress.stars}/>
  </View>
  <View style={{alignItems:'center'}}><H1 color={KID.cardInk[idx%KID.cardInk.length]}>{plant.PlantName}</H1><Text style={{fontSize:16,color:KID.ink,fontWeight:'600'}}>{plant.species?.CommonName||'Plant buddy'} · {mine.stars} stars together</Text></View>
  {/* speech bubble */}
  <View accessibilityLiveRegion="polite" style={{backgroundColor:'#fff',borderRadius:24,padding:16,borderWidth:3,borderColor:KID.grape,minHeight:84}}>
   <Text style={{fontSize:19,color:KID.ink,fontWeight:'600',lineHeight:26}}>{shown}</Text>
   <View style={{position:'absolute',bottom:-14,alignSelf:'center',width:24,height:24,backgroundColor:'#fff',borderRightWidth:3,borderBottomWidth:3,borderColor:KID.grape,transform:[{rotate:'45deg'}]}}/>
  </View>
  <View style={{alignItems:'center',marginTop:6}}><PlantBuddy size={260} kind={plant.species?.Category} mood={mood} colorIndex={idx} talking={talking} cheer={cheer} onPress={talk}/></View>
  <View style={{flexDirection:'row',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
   <Pressable accessibilityRole="button" onPress={talk} style={({pressed})=>({flexDirection:'row',alignItems:'center',gap:8,backgroundColor:KID.grape,borderRadius:22,paddingHorizontal:22,paddingVertical:14,borderBottomWidth:5,borderColor:'#00000025',transform:[{scale:pressed?0.96:1}]})}><Icon name="chat-processing" size={24} color="#fff"/><Text style={{color:'#fff',fontWeight:'900',fontSize:18}}>Talk to me</Text></Pressable>
   {canSpeak()&&<Pressable accessibilityRole="switch" accessibilityState={{checked:voice}} onPress={()=>{if(voice)stopSpeaking();setVoice(!voice);}} style={{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:voice?KID.ocean:'#FFFFFFE6',borderRadius:22,paddingHorizontal:18,paddingVertical:14,borderWidth:3,borderColor:KID.ocean}}><Icon name={voice?'volume-high':'volume-off'} size={24} color={voice?'#fff':KID.ocean}/><Text style={{color:voice?'#fff':KID.ocean,fontWeight:'900',fontSize:16}}>{voice?'Voice on':'Hear me'}</Text></Pressable>}
  </View>
  {/* mood meters */}
  <KCard i={1}><View style={{flexDirection:'row',justifyContent:'space-around'}}>
   {[['water',mood==='thirsty'?0.25:0.8,KID.ocean,'Water'],['white-balance-sunny',mood==='sleepy'?0.3:0.85,KID.orange,'Sun'],['heart',Math.min(1,0.4+mine.games*0.1),KID.berry,'Fun']].map(([ic,v,c,l])=><View key={l} style={{alignItems:'center',gap:6}}><Icon name={ic} size={30} color={c}/><View style={{width:70,height:12,borderRadius:6,backgroundColor:'#ffffffaa',overflow:'hidden'}}><View style={{width:`${v*100}%`,height:12,backgroundColor:c}}/></View><Text style={{fontWeight:'800',color:KID.ink}}>{l}</Text></View>)}
  </View></KCard>
  <Text style={{fontSize:24,fontWeight:'900',color:KID.ink,marginTop:4}}>Play with {plant.PlantName}</Text>
  <View style={{flexDirection:'row',gap:12,flexWrap:'wrap'}}>{GAMES.map(g=><Pressable key={g.id} accessibilityRole="button" accessibilityLabel={`Play ${g.title}`} onPress={()=>{stopSpeaking();setGame(g.id);}} style={({pressed})=>({flexGrow:1,flexBasis:180,backgroundColor:g.color,borderRadius:24,padding:16,gap:6,borderBottomWidth:6,borderColor:'#00000025',transform:[{scale:pressed?0.97:1}]})}><Icon name={g.icon} size={40} color="#fff"/><Text style={{color:'#fff',fontWeight:'900',fontSize:19}}>{g.title}</Text><Text style={{color:'#fff',opacity:0.95}}>{g.lesson}</Text></Pressable>)}</View>
  <Modal visible={!!game} transparent animationType="fade" onRequestClose={()=>setGame(null)}><View style={{flex:1,backgroundColor:'#24324ACC',justifyContent:'center',padding:16}}><View style={{width:'100%',maxWidth:560,alignSelf:'center'}}>
   {game&&<GameView id={game} onClose={()=>setGame(null)} onFinish={stars=>{if(stars>0)addStars(plant.PlantID,stars);setGame(null);setCheer(c=>c+1);setLine(0);}}/>}
  </View></View></Modal>
  <BadgePopup badge={badge} onClose={clearBadge}/>
 </ScrollView></Sky>;
}

// ---------------------------------------------------------------------------- Me
function KidMe(){
 const pb=120+useSafeAreaInsets().bottom;
 const {user,signIn,signOut}=useAuth();const [progress]=useProgress(user);const [ask,setAsk]=useState(false),[pw,setPw]=useState(''),[err,setErr]=useState(''),[busy,setBusy]=useState(false);
 // Going to the grown-up account always needs the grown-up password.
 const grownUp=async()=>{setBusy(true);setErr('');try{const u=await api.login(user.Email,pw);if(u.IsKid)throw new Error('That is a kids password. Ask a grown-up to type theirs.');setAsk(false);setPw('');signIn(u);}catch(e){setErr(e.message);}finally{setBusy(false);}};
 return <Sky><ScrollView contentContainerStyle={{padding:20,gap:16,paddingBottom:pb,maxWidth:760,width:'100%',alignSelf:'center'}}>
  <View style={{alignItems:'center',gap:10}}>
   <View style={{width:110,height:110,borderRadius:55,backgroundColor:KID.grape,alignItems:'center',justifyContent:'center',borderWidth:5,borderColor:'#fff'}}><Text style={{fontSize:52,fontWeight:'900',color:'#fff'}}>{kidName(user)[0].toUpperCase()}</Text></View>
   <H1>{kidName(user)}</H1><StarPill stars={progress.stars}/>
  </View>
  <KCard i={4}><Text style={{fontSize:22,fontWeight:'900',color:KID.cardInk[4],marginBottom:10}}>My badges</Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>{BADGES.map(([need,icon,label])=>{const got=progress.stars>=need;return <View key={label} style={{alignItems:'center',width:110,gap:4,opacity:got?1:0.45}}>
    <View style={{width:70,height:70,borderRadius:35,backgroundColor:got?KID.sun:'#E0E0E0',alignItems:'center',justifyContent:'center',borderWidth:4,borderColor:'#fff'}}><Icon name={got?icon:'lock'} size={34} color={got?'#fff':'#9E9E9E'}/></View>
    <Text style={{fontWeight:'800',color:KID.ink,textAlign:'center'}}>{label}</Text><Text style={{fontSize:12,color:KID.ink}}>{got?'Earned!':`${need} stars`}</Text></View>;})}</View>
  </KCard>
  <KCard i={1}>
   <Text style={{fontSize:18,fontWeight:'800',color:KID.cardInk[1],marginBottom:8}}>For grown-ups</Text>
   {!ask?<View style={{gap:10}}>
    <Pressable accessibilityRole="button" onPress={()=>setAsk(true)} style={{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#fff',borderRadius:16,padding:14}}><Icon name="account-lock-outline" size={22} color={KID.cardInk[1]}/><Text style={{fontWeight:'700',color:KID.ink,fontSize:16}}>Switch to the grown-up account</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={signOut} style={{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#fff',borderRadius:16,padding:14}}><Icon name="logout" size={22} color={KID.cardInk[1]}/><Text style={{fontWeight:'700',color:KID.ink,fontSize:16}}>Sign out</Text></Pressable>
   </View>:<View style={{gap:10}}>
    <Text style={{color:KID.ink}}>Grown-up password for {user.Email}</Text>
    <TextInput value={pw} onChangeText={setPw} secureTextEntry autoCapitalize="none" placeholder="Password" placeholderTextColor="#90A4AE" onSubmitEditing={grownUp} style={{backgroundColor:'#fff',borderRadius:14,padding:14,fontSize:16,color:KID.ink,borderWidth:2,borderColor:KID.cardInk[1]+'55'}}/>
    {!!err&&<Text accessibilityRole="alert" style={{color:'#C62828',fontWeight:'600'}}>{err}</Text>}
    <View style={{flexDirection:'row',gap:10}}><Pressable accessibilityRole="button" disabled={busy||!pw} onPress={grownUp} style={{flex:1,backgroundColor:KID.cardInk[1],borderRadius:14,padding:14,alignItems:'center',opacity:busy||!pw?0.6:1}}><Text style={{color:'#fff',fontWeight:'800'}}>{busy?'Checking…':'Continue'}</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>{setAsk(false);setPw('');setErr('');}} style={{flex:1,backgroundColor:'#fff',borderRadius:14,padding:14,alignItems:'center'}}><Text style={{color:KID.ink,fontWeight:'700'}}>Cancel</Text></Pressable></View>
   </View>}
  </KCard>
 </ScrollView></Sky>;
}

// ---------------------------------------------------------------------------- Tab bar
const KID_NAV={KidHome:['Home','home-heart',KID.orange],KidPlants:['My Plants','sprout',KID.grassDark],KidMe:['Me','emoticon-cool-outline',KID.grape]};
function KidTabBar({state,navigation}){
 const insets=useSafeAreaInsets();
 return <View pointerEvents="box-none" style={{position:'absolute',left:0,right:0,bottom:12+insets.bottom,paddingHorizontal:12,alignItems:'center'}}><View style={{width:'100%',maxWidth:560,flexDirection:'row',backgroundColor:'#fff',borderRadius:30,padding:8,gap:8,shadowColor:'#000',shadowOpacity:0.15,shadowRadius:12,elevation:8}}>
  {state.routes.map((r,i)=>{const on=state.index===i;const [label,icon,color]=KID_NAV[r.name];return <Pressable key={r.key} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{selected:on}} onPress={()=>navigation.navigate(r.name)} style={{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingVertical:12,borderRadius:24,backgroundColor:on?color:'transparent'}}>
   <Icon name={icon} size={26} color={on?'#fff':color}/>{on&&<Text style={{color:'#fff',fontWeight:'900',fontSize:15}}>{label}</Text>}
  </Pressable>;})}
 </View></View>;
}
export function KidsTabs(){
 const {user}=useAuth();
 return <KidsMusicProvider user={user}><Tabs.Navigator tabBar={p=><KidTabBar {...p}/>} screenOptions={{headerShown:false,animation:'none',sceneStyle:{backgroundColor:KID.sky[1]}}}>
  <Tabs.Screen name="KidHome" component={KidHome}/>
  <Tabs.Screen name="KidPlants" component={KidPlants}/>
  <Tabs.Screen name="KidMe" component={KidMe}/>
 </Tabs.Navigator></KidsMusicProvider>;
}
