// A cute, animated plant character drawn only with Views (no image assets needed).
// The look follows the plant's category, and its mood changes the face and posture:
//   happy -> big smile and lively sway, thirsty -> droopy leaves and a small "o" mouth, sleepy -> closed eyes.
import React,{useEffect,useRef} from 'react';
import {View,Animated,Easing,Pressable} from 'react-native';

const POTS=['#FF8A65','#4FC3F7','#BA68C8','#FFB74D','#4DB6AC','#F06292'];
const GREENS={fresh:['#43A047','#66BB6A','#2E7D32'],droopy:['#9CCC65','#AED581','#7CB342']};

function Leaf({w,h,color,rotate,x,y,vein='#ffffff55'}){
 return <View style={{position:'absolute',left:x-w/2,top:y-h/2,width:w,height:h,borderRadius:w,backgroundColor:color,transform:[{rotate:`${rotate}deg`}],alignItems:'center',justifyContent:'center'}}>
  <View style={{width:2,height:h*0.7,backgroundColor:vein,borderRadius:1}}/>
 </View>;
}

// Foliage for each category, drawn in a box of size S (the stem base is the bottom centre).
function Foliage({kind,S,mood}){
 const g=GREENS[mood==='thirsty'?'droopy':'fresh'];const droop=mood==='thirsty'?18:0;const c=S/2;
 const stem=(h,col=g[2])=><View style={{position:'absolute',left:c-3,bottom:0,width:6,height:h,borderRadius:3,backgroundColor:col}}/>;
 if(kind==='Flower'){
  const r=S*0.12,cy=S*0.3,petals=[0,60,120,180,240,300];
  return <>{stem(S*0.62)}<Leaf w={S*0.18} h={S*0.36} color={g[1]} rotate={-55-droop} x={c-S*0.14} y={S*0.72}/><Leaf w={S*0.18} h={S*0.36} color={g[0]} rotate={55+droop} x={c+S*0.14} y={S*0.76}/>
   {petals.map(a=><View key={a} style={{position:'absolute',left:c+Math.cos(a*Math.PI/180)*r*1.3-r,top:cy+Math.sin(a*Math.PI/180)*r*1.3-r,width:r*2,height:r*2,borderRadius:r,backgroundColor:mood==='thirsty'?'#F8BBD0':'#FF6B9A'}}/>)}
   <View style={{position:'absolute',left:c-r*0.9,top:cy-r*0.9,width:r*1.8,height:r*1.8,borderRadius:r,backgroundColor:'#FFC93C'}}/></>;
 }
 if(kind==='Succulent'){
  const w=S*0.34,h=S*0.62;
  return <>
   <View style={{position:'absolute',left:c-w/2,bottom:0,width:w,height:h,borderTopLeftRadius:w/2,borderTopRightRadius:w/2,backgroundColor:g[0]}}/>
   <View style={{position:'absolute',left:c-w/2-S*0.16,bottom:h*0.35,width:S*0.16,height:S*0.08,backgroundColor:g[0]}}/>
   <View style={{position:'absolute',left:c-w/2-S*0.2,bottom:h*0.35,width:S*0.1,height:S*0.26,borderTopLeftRadius:S*0.05,borderTopRightRadius:S*0.05,backgroundColor:g[1]}}/>
   <View style={{position:'absolute',left:c+w/2,bottom:h*0.5,width:S*0.14,height:S*0.08,backgroundColor:g[0]}}/>
   <View style={{position:'absolute',left:c+w/2+S*0.08,bottom:h*0.5,width:S*0.1,height:S*0.22,borderTopLeftRadius:S*0.05,borderTopRightRadius:S*0.05,backgroundColor:g[1]}}/>
   {[[0.3,0.2],[0.6,0.35],[0.4,0.55],[0.7,0.7],[0.25,0.75]].map(([fx,fy],i)=><View key={i} style={{position:'absolute',left:c-w/2+w*fx,bottom:h*fy,width:3,height:3,borderRadius:2,backgroundColor:'#E8F5E9'}}/>)}
   <View style={{position:'absolute',left:c-6,bottom:h-6,width:12,height:12,borderRadius:6,backgroundColor:'#FF6B9A'}}/>
  </>;
 }
 if(kind==='Herb'){
  const pairs=[0.25,0.42,0.58,0.74];
  return <>{[-0.14,0,0.14].map((dx,k)=><View key={k} style={{position:'absolute',left:c+dx*S-2,bottom:0,width:4,height:S*(0.8-Math.abs(dx)),borderRadius:2,backgroundColor:g[2],transform:[{rotate:`${dx*60}deg`}]}}/>)}
   {pairs.map((p,i)=>[-1,1].map(sd=><Leaf key={`${i}${sd}`} w={S*0.1} h={S*0.18} color={i%2?g[0]:g[1]} rotate={sd*(60+droop)} x={c+sd*S*(0.08+0.02*i)} y={S*(1-p)}/>))}
   <Leaf w={S*0.12} h={S*0.2} color={g[1]} rotate={0} x={c} y={S*0.12}/></>;
 }
 if(kind==='Vegetable'||kind==='Fruit'){
  return <>{stem(S*0.7)}
   <Leaf w={S*0.24} h={S*0.44} color={g[0]} rotate={-50-droop} x={c-S*0.2} y={S*0.5}/><Leaf w={S*0.24} h={S*0.44} color={g[1]} rotate={50+droop} x={c+S*0.2} y={S*0.46}/><Leaf w={S*0.2} h={S*0.36} color={g[1]} rotate={-8} x={c} y={S*0.24}/>
   {[[-0.24,0.62],[0.22,0.66],[0.05,0.48]].map(([dx,fy],i)=><View key={i} style={{position:'absolute',left:c+dx*S-S*0.07,top:S*fy,width:S*0.14,height:S*0.14,borderRadius:S*0.07,backgroundColor:kind==='Fruit'?'#E53935':'#FF7043',borderWidth:2,borderColor:'#ffffff66'}}/>)}
  </>;
 }
 // Houseplant / other: big rounded leaves.
 return <>{stem(S*0.55)}
  <Leaf w={S*0.3} h={S*0.56} color={g[0]} rotate={-48-droop} x={c-S*0.22} y={S*0.5}/>
  <Leaf w={S*0.3} h={S*0.56} color={g[1]} rotate={48+droop} x={c+S*0.22} y={S*0.5}/>
  <Leaf w={S*0.28} h={S*0.5} color={g[1]} rotate={-14-droop/2} x={c-S*0.08} y={S*0.28}/>
  <Leaf w={S*0.28} h={S*0.5} color={g[0]} rotate={16+droop/2} x={c+S*0.1} y={S*0.26}/>
 </>;
}

export default function PlantBuddy({kind='Houseplant',mood='happy',size=220,colorIndex=0,talking=false,cheer=0,onPress,still=false}){
 const sway=useRef(new Animated.Value(0)).current,bob=useRef(new Animated.Value(0)).current,blink=useRef(new Animated.Value(1)).current,mouth=useRef(new Animated.Value(0)).current,jump=useRef(new Animated.Value(0)).current;
 useEffect(()=>{
  if(still)return undefined;
  const speed=mood==='happy'?1400:2200;
  const a=Animated.loop(Animated.sequence([Animated.timing(sway,{toValue:1,duration:speed,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),Animated.timing(sway,{toValue:-1,duration:speed,easing:Easing.inOut(Easing.sin),useNativeDriver:true})]));
  const b=Animated.loop(Animated.sequence([Animated.timing(bob,{toValue:1,duration:900,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),Animated.timing(bob,{toValue:0,duration:900,easing:Easing.inOut(Easing.quad),useNativeDriver:true})]));
  const c=Animated.loop(Animated.sequence([Animated.delay(2600),Animated.timing(blink,{toValue:0.1,duration:90,useNativeDriver:true}),Animated.timing(blink,{toValue:1,duration:110,useNativeDriver:true})]));
  a.start();b.start();if(mood!=='sleepy')c.start();
  return()=>{a.stop();b.stop();c.stop();};
 },[mood,still]);
 useEffect(()=>{
  if(!talking){mouth.stopAnimation();Animated.timing(mouth,{toValue:0,duration:120,useNativeDriver:true}).start();return undefined;}
  const t=Animated.loop(Animated.sequence([Animated.timing(mouth,{toValue:1,duration:130,useNativeDriver:true}),Animated.timing(mouth,{toValue:0.2,duration:130,useNativeDriver:true})]));t.start();return()=>t.stop();
 },[talking]);
 useEffect(()=>{if(!cheer)return;Animated.sequence([Animated.timing(jump,{toValue:1,duration:180,easing:Easing.out(Easing.quad),useNativeDriver:true}),Animated.spring(jump,{toValue:0,friction:3,useNativeDriver:true})]).start();},[cheer]);
 const S=size*0.54,potW=size*0.5,potH=size*0.36,rimH=size*0.07,pot=POTS[colorIndex%POTS.length];
 const rot=sway.interpolate({inputRange:[-1,1],outputRange:mood==='thirsty'?['-2deg','2deg']:['-6deg','6deg']});
 const y=Animated.add(bob.interpolate({inputRange:[0,1],outputRange:[0,-size*0.02]}),jump.interpolate({inputRange:[0,1],outputRange:[0,-size*0.16]}));
 const eye=size*0.075;
 const body=<Animated.View style={{width:size,height:size,alignItems:'center',justifyContent:'flex-end',transform:[{translateY:y}]}}>
  {/* shadow */}
  <View style={{position:'absolute',bottom:0,width:potW*1.1,height:size*0.05,borderRadius:size,backgroundColor:'#00000022'}}/>
  {/* plant: rotated around its base by doubling the box height */}
  <View style={{position:'absolute',left:(size-S)/2,bottom:potH+rimH+size*0.02-S-2,width:S,height:S*2,alignItems:'center'}} pointerEvents="none">
   <Animated.View style={{width:S,height:S*2,transform:[{rotate:rot}]}}><View style={{width:S,height:S}}><Foliage kind={kind} S={S} mood={mood}/></View></Animated.View>
  </View>
  {/* pot with face */}
  <View style={{width:potW*1.12,height:rimH,borderRadius:rimH/2,backgroundColor:pot,borderBottomWidth:3,borderColor:'#00000018',zIndex:2}}/>
  <View style={{width:potW,height:potH,marginBottom:size*0.02,borderBottomLeftRadius:potW*0.32,borderBottomRightRadius:potW*0.32,backgroundColor:pot,alignItems:'center',paddingTop:potH*0.18,overflow:'hidden'}}>
   <View style={{position:'absolute',left:potW*0.1,top:potH*0.1,width:potW*0.12,height:potH*0.6,borderRadius:potW,backgroundColor:'#FFFFFF33'}}/>
   <View style={{flexDirection:'row',gap:potW*0.2}}>
    {[0,1].map(i=><Animated.View key={i} style={{width:eye,height:mood==='sleepy'?eye*0.25:eye*1.15,borderRadius:eye,backgroundColor:'#24324A',transform:[{scaleY:blink}],alignItems:'center'}}>{mood!=='sleepy'&&<View style={{width:eye*0.38,height:eye*0.38,borderRadius:eye,backgroundColor:'#fff',marginTop:eye*0.15,marginLeft:eye*0.25}}/>}</Animated.View>)}
   </View>
   <View style={{flexDirection:'row',width:potW*0.78,justifyContent:'space-between',marginTop:-eye*0.1}}>
    <View style={{width:eye*1.2,height:eye*0.6,borderRadius:eye,backgroundColor:'#FF6B9A66'}}/><View style={{width:eye*1.2,height:eye*0.6,borderRadius:eye,backgroundColor:'#FF6B9A66'}}/>
   </View>
   {talking||mood==='thirsty'
    ?<Animated.View style={{width:eye*1.2,height:eye*1.1,borderRadius:eye,backgroundColor:'#8E2442',marginTop:2,transform:[{scaleY:talking?mouth.interpolate({inputRange:[0,1],outputRange:[0.35,1]}):0.55}]}}/>
    :<View style={{width:eye*2,height:eye,borderBottomLeftRadius:eye,borderBottomRightRadius:eye,backgroundColor:'#8E2442',marginTop:2,alignItems:'center',justifyContent:'flex-end',overflow:'hidden'}}><View style={{width:eye*1.1,height:eye*0.45,borderRadius:eye,backgroundColor:'#FF8FAB'}}/></View>}
  </View>
 </Animated.View>;
 return onPress?<Pressable accessibilityRole="button" accessibilityLabel="Plant buddy" onPress={onPress}>{body}</Pressable>:body;
}
