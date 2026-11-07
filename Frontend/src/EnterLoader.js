// "Preparing your garden" page shown before entering the app (after sign-in, account switch or
// when a saved session is restored). A sprout grows, the progress line fills, then it fades away.
import React,{useEffect,useRef,useState} from 'react';
import {View,Text,Animated,Easing} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {colors,KID} from './theme';
import {Wordmark,Icon} from './ui';

const ADULT_STEPS=['Waking up your plants','Reading the soil sensors','Arranging your garden'];
const KID_STEPS=['Waking up your plant buddies','Filling the watering can','Getting the games ready'];
export const ENTER_MS=1700;

function Sprout({color,size=64,grow}){
 return <View style={{width:size*1.6,height:size*1.5,alignItems:'center',justifyContent:'flex-end'}}>
  <Animated.View style={{alignItems:'center',transform:[{scale:grow.interpolate({inputRange:[0,1],outputRange:[0.2,1]})},{translateY:grow.interpolate({inputRange:[0,1],outputRange:[size*0.4,0]})}],opacity:grow.interpolate({inputRange:[0,0.15,1],outputRange:[0,1,1]})}}>
   <Icon name="sprout" size={size} color={color}/>
  </Animated.View>
  <View style={{width:size*1.1,height:size*0.32,borderTopLeftRadius:6,borderTopRightRadius:6,borderBottomLeftRadius:size*0.2,borderBottomRightRadius:size*0.2,backgroundColor:'#B9734A',marginTop:-4}}/>
 </View>;
}

export default function EnterLoader({kid,name,onDone}){
 const grow=useRef(new Animated.Value(0)).current,bar=useRef(new Animated.Value(0)).current,out=useRef(new Animated.Value(1)).current;
 const [step,setStep]=useState(0);const steps=kid?KID_STEPS:ADULT_STEPS;
 useEffect(()=>{
  Animated.timing(grow,{toValue:1,duration:900,easing:Easing.out(Easing.back(1.4)),useNativeDriver:true}).start();
  Animated.timing(bar,{toValue:1,duration:ENTER_MS-150,easing:Easing.inOut(Easing.cubic),useNativeDriver:false}).start();
  const tick=setInterval(()=>setStep(s=>Math.min(s+1,steps.length-1)),ENTER_MS/steps.length);
  const t=setTimeout(()=>Animated.timing(out,{toValue:0,duration:380,easing:Easing.in(Easing.quad),useNativeDriver:true}).start(()=>onDone&&onDone()),ENTER_MS);
  // Never get stuck on the loading page, even if an animation callback is skipped.
  const safety=setTimeout(()=>onDone&&onDone(),ENTER_MS+1200);
  return()=>{clearInterval(tick);clearTimeout(t);clearTimeout(safety);};
 },[]);
 const ink=kid?KID.ink:colors.soil,muted=kid?KID.ink:colors.muted,accent=kid?KID.grassDark:colors.fern;
 return <Animated.View accessibilityLiveRegion="polite" style={{position:'absolute',left:0,right:0,top:0,bottom:0,zIndex:200,opacity:out}}>
  <LinearGradient colors={kid?KID.sky:colors.gradient} start={{x:0,y:0}} end={{x:kid?0:1,y:1}} style={{position:'absolute',left:0,right:0,top:0,bottom:0}}/>
  <View style={{flex:1,alignItems:'center',justifyContent:'center',padding:30,gap:14}}>
   <Sprout color={accent} grow={grow}/>
   {kid?<Text style={{fontSize:30,fontWeight:'900',color:ink}}>Hi {name||'friend'}!</Text>:<Wordmark size={34}/>}
   <Text style={{color:muted,fontSize:15,opacity:0.85}}>{steps[step]}…</Text>
   <View style={{width:200,height:6,borderRadius:3,backgroundColor:kid?'#FFFFFFAA':colors.line,overflow:'hidden',marginTop:6}}>
    <Animated.View style={{height:6,borderRadius:3,backgroundColor:accent,width:bar.interpolate({inputRange:[0,1],outputRange:['0%','100%']})}}/>
   </View>
   {!kid&&<Text style={{color:colors.muted,fontSize:11,letterSpacing:2,marginTop:18}}>TAKE YOUR LIFE SLOW.</Text>}
  </View>
 </Animated.View>;
}
