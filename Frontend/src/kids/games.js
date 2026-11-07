// Four short mini games. Each one teaches something real about plant care and awards stars.
import React,{useEffect,useRef,useState} from 'react';
import {View,Text,Pressable,Animated,Easing,PanResponder,Platform,useWindowDimensions} from 'react-native';
import Icon from '../Icon';
import {KID} from '../theme';
import {kidSound as playSound} from './kidSound';
import {BLOOM_STAGES,stageOf,N,slideBoard,addSeed,canMove,bestTile,bloomStars,newGame} from './bloom2048';

export const GAMES=[
 {id:'water',title:'Just-right water',icon:'watering-can',color:KID.ocean,lesson:'Plants need water, but not too much!'},
 {id:'sun',title:'Sunshine catcher',icon:'white-balance-sunny',color:KID.orange,lesson:'Catch the sun, skip the clouds.'},
 {id:'bugs',title:'Bug patrol',icon:'bug',color:KID.berry,lesson:'Shoo the leaf nibblers. Ladybugs are friends!'},
 {id:'bloom',title:'Flower 2048',icon:'flower-tulip',color:KID.grape,lesson:'Swipe to match two the same. Seeds grow into flowers!'},
];

function Frame({game,children,status,onClose}){
 return <View style={{backgroundColor:KID.paper,borderRadius:28,padding:18,gap:12,borderWidth:4,borderColor:game.color}}>
  <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
   <View style={{width:44,height:44,borderRadius:22,backgroundColor:game.color,alignItems:'center',justifyContent:'center'}}><Icon name={game.icon} size={26} color="#fff"/></View>
   <View style={{flex:1}}><Text style={{fontSize:20,fontWeight:'800',color:KID.ink}}>{game.title}</Text><Text style={{color:KID.ink,opacity:0.7}}>{game.lesson}</Text></View>
   <Pressable accessibilityRole="button" accessibilityLabel="Close game" onPress={onClose} style={{width:40,height:40,borderRadius:20,backgroundColor:'#F1F1F1',alignItems:'center',justifyContent:'center'}}><Icon name="close" size={22} color={KID.ink}/></Pressable>
  </View>
  {status}
  {children}
 </View>;
}
const Big=({title,color,onPress,icon})=><Pressable accessibilityRole="button" onPress={onPress} style={({pressed})=>({flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center',backgroundColor:color,borderRadius:20,paddingVertical:14,paddingHorizontal:22,transform:[{scale:pressed?0.96:1}],borderBottomWidth:4,borderColor:'#00000025'})}>{icon&&<Icon name={icon} size={22} color="#fff"/>}<Text style={{color:'#fff',fontWeight:'800',fontSize:18}}>{title}</Text></Pressable>;

function Result({stars,text,color,onAgain,onDone}){
 return <View style={{alignItems:'center',gap:12,paddingVertical:10}}>
  <View style={{flexDirection:'row',gap:6}}>{[1,2,3].map(i=><Icon key={i} name={i<=stars?'star':'star-outline'} size={44} color={i<=stars?KID.sun:'#D0D0D0'}/>)}</View>
  <Text style={{fontSize:18,fontWeight:'700',color:KID.ink,textAlign:'center'}}>{text}</Text>
  <View style={{flexDirection:'row',gap:10,flexWrap:'wrap',justifyContent:'center'}}><Big title="Play again" icon="replay" color={color} onPress={onAgain}/><Big title="Done" icon="check" color={KID.grassDark} onPress={onDone}/></View>
 </View>;
}

// --- 1. Keep the water level inside the green "just right" band for 5 seconds. -----------------
function WaterGame({game,onFinish,onClose}){
 const [level,setLevel]=useState(30),[good,setGood]=useState(0),[state,setState]=useState('play'),[splash,setSplash]=useState(0);
 const lvl=useRef(30);
 useEffect(()=>{if(state!=='play')return undefined;const id=setInterval(()=>{
  lvl.current=Math.max(0,lvl.current-1.2);setLevel(lvl.current);
  if(lvl.current>=55&&lvl.current<=78)setGood(g=>{const n=g+0.2;if(n>=5){setState('won');playSound('success');}return n;});
 },200);return()=>clearInterval(id);},[state]);
 const pour=()=>{if(state!=='play')return;lvl.current=Math.min(100,lvl.current+9);setLevel(lvl.current);setSplash(s=>s+1);playSound('pop');if(lvl.current>=96){setState('flood');playSound('error');}};
 const again=()=>{lvl.current=30;setLevel(30);setGood(0);setState('play');};
 // Overflowing the pot is a miss: no star for drowning the roots.
 const stars=state==='won'?3:0;
 return <Frame game={game} onClose={onClose} status={state==='play'&&<Text style={{color:KID.ink,fontWeight:'600'}}>Tap the watering can. Keep the water in the green zone until the bar is full.</Text>}>
  {state==='play'?<View style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:24}}>
   <View style={{width:80,height:220,borderRadius:20,borderWidth:4,borderColor:'#8D6E63',backgroundColor:'#EFEBE9',overflow:'hidden',justifyContent:'flex-end'}}>
    <View style={{position:'absolute',left:0,right:0,bottom:'55%',height:'23%',backgroundColor:'#A5D6A7',opacity:0.9}}/>
    <View style={{height:`${level}%`,backgroundColor:level>78?'#1E88E5':'#4FC3F7',opacity:0.85}}/>
    <Text style={{position:'absolute',top:6,alignSelf:'center',fontWeight:'800',color:'#5D4037'}}>{Math.round(level)}%</Text>
   </View>
   <View style={{alignItems:'center',gap:12}}>
    <Pressable accessibilityRole="button" accessibilityLabel="Pour water" onPress={pour} style={({pressed})=>({width:110,height:110,borderRadius:55,backgroundColor:game.color,alignItems:'center',justifyContent:'center',transform:[{rotate:pressed?'-20deg':'0deg'},{scale:pressed?0.95:1}],borderBottomWidth:6,borderColor:'#00000025'})}><Icon name="watering-can" size={60} color="#fff"/></Pressable>
    <View style={{width:130,height:16,borderRadius:8,backgroundColor:'#E0E0E0',overflow:'hidden'}}><View style={{width:`${Math.min(100,good/5*100)}%`,height:16,backgroundColor:KID.grass}}/></View>
    <Text style={{color:KID.ink,fontSize:12}}>Just right: {Math.min(5,good).toFixed(1)} / 5 s</Text>
   </View>
  </View>:<Result stars={stars} color={game.color} text={state==='won'?'Perfect! Your plant has just the right amount of water.':'Oops, too much water! Roots need air too. Try smaller sips.'} onAgain={again} onDone={()=>onFinish(stars)}/>}
 </Frame>;
}

// --- 2. Tap suns, avoid clouds, 20 seconds. -------------------------------------------------------
function SunGame({game,onFinish,onClose}){
 const [cells,setCells]=useState(Array(9).fill(null)),[score,setScore]=useState(0),[time,setTime]=useState(20),[state,setState]=useState('play');
 useEffect(()=>{if(state!=='play')return undefined;
  const spawn=setInterval(()=>setCells(c=>{const n=[...c];const i=Math.floor(Math.random()*9);n[i]=Math.random()<0.7?'sun':'cloud';const j=Math.floor(Math.random()*9);if(j!==i)n[j]=null;return n;}),650);
  const tick=setInterval(()=>setTime(t=>{if(t<=1){setState('done');playSound('success');return 0;}return t-1;}),1000);
  return()=>{clearInterval(spawn);clearInterval(tick);};},[state]);
 const tap=i=>{if(state!=='play'||!cells[i])return;if(cells[i]==='sun'){setScore(s=>s+1);playSound('pop');}else{setScore(s=>Math.max(0,s-1));playSound('error');}setCells(c=>{const n=[...c];n[i]=null;return n;});};
 const again=()=>{setCells(Array(9).fill(null));setScore(0);setTime(20);setState('play');};
 const stars=score>=15?3:score>=8?2:score>=3?1:0;
 return <Frame game={game} onClose={onClose} status={state==='play'&&<View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={{fontWeight:'800',color:KID.ink,fontSize:18}}>Suns: {score}</Text><Text style={{fontWeight:'800',color:game.color,fontSize:18}}>{time}s</Text></View>}>
  {state==='play'?<View style={{flexDirection:'row',flexWrap:'wrap',gap:10,justifyContent:'center',alignSelf:'center',width:300}}>
   {cells.map((c,i)=><Pressable key={i} accessibilityRole="button" accessibilityLabel={c||'empty sky'} onPress={()=>tap(i)} style={{width:88,height:88,borderRadius:22,backgroundColor:'#E3F4FF',alignItems:'center',justifyContent:'center'}}>
    {c==='sun'&&<Icon name="white-balance-sunny" size={56} color={KID.sun}/>}{c==='cloud'&&<Icon name="weather-cloudy" size={56} color="#90A4AE"/>}
   </Pressable>)}
  </View>:<Result stars={stars} color={game.color} text={`You caught ${score} sunbeams! Plants turn sunlight into food.`} onAgain={again} onDone={()=>onFinish(stars)}/>}
 </Frame>;
}

// --- 3. Shoo the aphids, leave the ladybugs, 20 seconds. -----------------------------------------
function Critter({type,onPress}){
 const pop=useRef(new Animated.Value(0)).current;
 useEffect(()=>{Animated.spring(pop,{toValue:1,friction:4,useNativeDriver:true}).start();},[]);
 return <Animated.View style={{transform:[{scale:pop}]}}><Pressable accessibilityRole="button" accessibilityLabel={type==='bug'?'leaf nibbler':'ladybug'} onPress={onPress} hitSlop={6}><View style={{width:58,height:58,borderRadius:29,backgroundColor:'#FFFFFFE6',alignItems:'center',justifyContent:'center',borderWidth:3,borderColor:type==='bug'?'#558B2F':'#E53935'}}><Icon name={type==='bug'?'bug':'ladybug'} size={38} color={type==='bug'?'#33691E':'#E53935'}/></View></Pressable></Animated.View>;
}
function BugGame({game,onFinish,onClose}){
 const [spots,setSpots]=useState({}),[score,setScore]=useState(0),[oops,setOops]=useState(0),[time,setTime]=useState(20),[state,setState]=useState('play');
 const POS=[[8,10],[60,6],[34,30],[74,40],[10,52],[46,62],[78,72],[22,78]];
 useEffect(()=>{if(state!=='play')return undefined;
  const spawn=setInterval(()=>setSpots(sp=>{const n={...sp};const i=Math.floor(Math.random()*POS.length);n[i]=Math.random()<0.72?'bug':'lady';const keys=Object.keys(n);if(keys.length>4)delete n[keys[0]];return n;}),700);
  const tick=setInterval(()=>setTime(t=>{if(t<=1){setState('done');playSound('success');return 0;}return t-1;}),1000);
  return()=>{clearInterval(spawn);clearInterval(tick);};},[state]);
 const tap=i=>{const t=spots[i];if(!t)return;if(t==='bug'){setScore(s=>s+1);playSound('pop');}else{setOops(o=>o+1);playSound('error');}setSpots(sp=>{const n={...sp};delete n[i];return n;});};
 const again=()=>{setSpots({});setScore(0);setOops(0);setTime(20);setState('play');};
 const total=score-oops*2;const stars=total>=14?3:total>=7?2:total>=2?1:0;
 return <Frame game={game} onClose={onClose} status={state==='play'&&<View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{fontWeight:'800',color:KID.ink,fontSize:18}}>Shooed: {score}</Text><View style={{flexDirection:'row',alignItems:'center',gap:4}}><Icon name="ladybug" size={20} color="#E53935"/><Text style={{color:KID.ink}}>Friends tapped: {oops}</Text></View><Text style={{fontWeight:'800',color:game.color,fontSize:18}}>{time}s</Text></View>}>
  {state==='play'?<View style={{height:300,borderRadius:24,backgroundColor:'#E8F5E9',overflow:'hidden'}}>
   {[[-30,40,-30],[50,10,25],[20,150,-15],[60,170,30]].map(([l,t,r],i)=><View key={i} style={{position:'absolute',left:`${Math.max(0,l)}%`,top:t,width:'55%',height:110,borderRadius:120,backgroundColor:i%2?'#81C784':'#66BB6A',transform:[{rotate:`${r}deg`}]}}/>)}
   {Object.entries(spots).map(([i,t])=><View key={`${i}${t}`} style={{position:'absolute',left:`${POS[i][0]}%`,top:`${POS[i][1]}%`}}><Critter type={t} onPress={()=>tap(i)}/></View>)}
  </View>:<Result stars={stars} color={game.color} text={`You shooed ${score} leaf nibblers${oops?` (and bumped ${oops} ladybug friend${oops>1?'s':''})`:''}. Ladybugs protect plants by eating pests!`} onAgain={again} onDone={()=>onFinish(stars)}/>}
 </Frame>;
}


// --- 4. Flower 2048: swipe to slide the garden; two equal plants grow into the next stage. ------------
// Seed -> Sprout -> Leaf -> Clover -> Tulip -> Daisy -> Poppy -> Big bloom -> Tree -> Palm -> Sunny garden.
function BloomTile({value,size}){
 const pop=useRef(new Animated.Value(1)).current;
 useEffect(()=>{if(!value)return;pop.setValue(0.6);Animated.spring(pop,{toValue:1,friction:4,tension:160,useNativeDriver:true}).start();},[value]);
 if(!value)return <View style={{width:size,height:size,borderRadius:size*0.22,backgroundColor:'#00000014'}}/>;
 const [,icon,label,bg,ink]=stageOf(value);
 return <Animated.View accessibilityLabel={`${label}, ${value}`} style={{width:size,height:size,borderRadius:size*0.22,backgroundColor:bg,alignItems:'center',justifyContent:'center',borderBottomWidth:4,borderColor:'#00000018',transform:[{scale:pop}]}}>
  <Icon name={icon} size={size*0.46} color={ink}/>
  <Text numberOfLines={1} style={{fontSize:Math.max(9,size*0.14),fontWeight:'900',color:ink,marginTop:1}}>{label}</Text>
 </Animated.View>;
}
const Arrow=({icon,onPress,label,color})=><Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({pressed})=>({flex:1,maxWidth:72,height:54,borderRadius:18,backgroundColor:color,alignItems:'center',justifyContent:'center',borderBottomWidth:4,borderColor:'#00000025',transform:[{scale:pressed?0.92:1}]})}><Icon name={icon} size={34} color="#fff"/></Pressable>;

function BloomGame({game,onFinish,onClose}){
 const [board,setBoard]=useState(newGame),[score,setScore]=useState(0),[state,setState]=useState('play'),[boardW,setBoardW]=useState(300);
 const boardRef=useRef(board);boardRef.current=board;
 const stateRef=useRef(state);stateRef.current=state;
 const move=dir=>{
  if(stateRef.current!=='play')return;
  const r=slideBoard(boardRef.current,dir);if(!r.moved)return;
  const next=addSeed(r.board);boardRef.current=next;setBoard(next);
  if(r.gained){setScore(s=>s+r.gained);playSound(r.best>=32?'success':'pop');}else playSound('pop');
  if(bestTile(next)>=2048){setState('won');}else if(!canMove(next)){setState('over');playSound('error');}
 };
 const moveRef=useRef(move);moveRef.current=move;
 // Swipe anywhere on the garden.
 const pan=useRef(PanResponder.create({
  onStartShouldSetPanResponder:()=>true,onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dx)+Math.abs(g.dy)>8,
  onPanResponderTerminationRequest:()=>false,
  onPanResponderRelease:(_,g)=>{const ax=Math.abs(g.dx),ay=Math.abs(g.dy);if(Math.max(ax,ay)<24)return;moveRef.current(ax>ay?(g.dx>0?'right':'left'):(g.dy>0?'down':'up'));},
 })).current;
 // Arrow keys / WASD on the web.
 useEffect(()=>{if(Platform.OS!=='web'||typeof document==='undefined')return undefined;
  const map={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',a:'left',d:'right',w:'up',s:'down'};
  const h=e=>{const d=map[e.key];if(d){e.preventDefault();moveRef.current(d);}};document.addEventListener('keydown',h);return()=>document.removeEventListener('keydown',h);},[]);
 const again=()=>{const b=newGame();boardRef.current=b;setBoard(b);setScore(0);setState('play');};
 const best=bestTile(board);const stars=bloomStars(best);const [,bestIcon,bestLabel,,bestInk]=stageOf(best);
 const {height:winH}=useWindowDimensions();
 // The garden fits the screen: never wider than the card, never so tall that the buttons fall off a small phone.
 const gap=8;const side=Math.max(220,Math.min(boardW,360,winH-340));const cell=Math.floor((side-gap*(N+1))/N);
 const reached=BLOOM_STAGES.filter(s=>s[0]<=Math.max(best,2));
 if(state!=='play')return <Frame game={game} onClose={onClose}><Result stars={state==='won'?3:stars} color={game.color} onAgain={again} onDone={()=>onFinish(state==='won'?3:stars)}
  text={state==='won'?'WOW! You grew a whole sunny garden!':`Your garden grew all the way to a ${bestLabel}! ${stars<3?'Grow a Poppy for 3 stars.':'Amazing gardening!'}`}/></Frame>;
 return <Frame game={game} onClose={onClose} status={<View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8}}>
   <View style={{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'#F5F0FF',borderRadius:14,paddingHorizontal:10,paddingVertical:6}}><Icon name={bestIcon} size={20} color={bestInk}/><Text style={{fontWeight:'800',color:KID.ink}}>Best: {bestLabel}</Text></View>
   <View style={{flexDirection:'row',gap:2}}>{[1,2,3].map(i=><Icon key={i} name={i<=stars?'star':'star-outline'} size={22} color={i<=stars?KID.sun:'#D0D0D0'}/>)}</View>
   <Text style={{fontWeight:'800',color:game.color,fontSize:16}}>{score} pts</Text>
  </View>}>
  <View onLayout={e=>setBoardW(e.nativeEvent.layout.width)} style={{alignItems:'center'}}>
   <View {...pan.panHandlers} accessibilityLabel="Garden. Swipe to move the plants." style={{padding:gap,gap,borderRadius:22,backgroundColor:'#8D6E63',borderBottomWidth:6,borderColor:'#5D4037'}}>
    {board.map((row,r)=><View key={r} style={{flexDirection:'row',gap}}>{row.map((v,c)=><BloomTile key={c} value={v} size={cell}/>)}</View>)}
   </View>
  </View>
  <View style={{flexDirection:'row',justifyContent:'center',gap:10}}>
   <Arrow icon="arrow-left-bold" label="Slide left" color={game.color} onPress={()=>move('left')}/>
   <Arrow icon="arrow-up-bold" label="Slide up" color={game.color} onPress={()=>move('up')}/>
   <Arrow icon="arrow-down-bold" label="Slide down" color={game.color} onPress={()=>move('down')}/>
   <Arrow icon="arrow-right-bold" label="Slide right" color={game.color} onPress={()=>move('right')}/>
  </View>
  {/* growth path: which stages have bloomed so far, and a calm way to stop */}
  <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
   <View style={{flex:1,flexDirection:'row',flexWrap:'wrap',gap:3}}>{BLOOM_STAGES.slice(0,8).map(([v,icon,label,bg,ink])=>{const got=reached.some(s=>s[0]===v);return <View key={v} accessibilityLabel={`${label}${got?' grown':' not yet'}`} style={{width:24,height:24,borderRadius:8,backgroundColor:got?bg:'#F0F0F0',alignItems:'center',justifyContent:'center',opacity:got?1:0.5}}><Icon name={got?icon:'lock-outline'} size={14} color={got?ink:'#9E9E9E'}/></View>;})}</View>
   <Pressable accessibilityRole="button" onPress={()=>setState('over')} style={({pressed})=>({flexDirection:'row',alignItems:'center',gap:4,backgroundColor:KID.grassDark,borderRadius:14,paddingHorizontal:12,paddingVertical:8,transform:[{scale:pressed?0.95:1}]})}><Icon name="check" size={18} color="#fff"/><Text style={{color:'#fff',fontWeight:'800'}}>Done</Text></Pressable>
  </View>
 </Frame>;
}

export function GameView({id,onFinish,onClose}){
 const game=GAMES.find(g=>g.id===id);if(!game)return null;
 const C=id==='water'?WaterGame:id==='sun'?SunGame:id==='bloom'?BloomGame:BugGame;
 return <C game={game} onFinish={onFinish} onClose={onClose}/>;
}
