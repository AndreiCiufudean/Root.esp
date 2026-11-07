// First-run welcome. The design questionnaire is no longer asked here: it is optional and offered
// in the Design studio after the person has looked around (see src/questionnaire.js).
import React,{useEffect,useRef} from 'react';
import {View,Text,Pressable,ScrollView,Animated,Easing} from 'react-native';
import {colors} from './theme';
import {Wordmark, SafeTop, SafeBottom, Icon } from './ui';
const POINTS=[['water-check-outline','Automatic, sensor-led watering'],['palette-outline','Pots and rooms designed around you'],['robot-happy-outline','An assistant that knows your plants']];
export default function Intro({onDone}){
 const fade=useRef(new Animated.Value(0)).current;
 useEffect(()=>{Animated.timing(fade,{toValue:1,duration:600,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start(()=>fade.setValue(1));const t=setTimeout(()=>fade.setValue(1),1000);return()=>clearTimeout(t);},[]);
 return <ScrollView contentContainerStyle={{flexGrow:1,backgroundColor:colors.bg,justifyContent:'center',padding:30}}>
   <SafeTop/>
   <Animated.View style={{width:'100%',maxWidth:590,alignSelf:'center',gap:18,opacity:fade,transform:[{translateY:fade.interpolate({inputRange:[0,1],outputRange:[16,0]})}]}}>
     <Wordmark size={28}/><Text style={{fontSize:12,color:colors.muted,letterSpacing:2}}>TAKE YOUR LIFE SLOW.</Text>
     <Text style={{fontSize:36,color:colors.soil,fontWeight:'600',marginTop:34}}>Life can be stressful.</Text>
     <Text style={{color:colors.muted,fontSize:16,lineHeight:25}}>Let Root.esp handle everyday plant care, while you enjoy a thoughtfully designed space.</Text>
     <View style={{gap:12,marginVertical:6}}>{POINTS.map(([ic,t])=><View key={t} style={{flexDirection:'row',alignItems:'center',gap:12}}><View style={{width:36,height:36,borderRadius:12,backgroundColor:colors.fern+'1F',alignItems:'center',justifyContent:'center'}}><Icon name={ic} size={20} color={colors.fern}/></View><Text style={{color:colors.soil,fontSize:15}}>{t}</Text></View>)}</View>
     <Pressable accessibilityRole="button" onPress={()=>onDone(null,true)} style={({pressed})=>({backgroundColor:colors.fern,padding:17,borderRadius:12,alignItems:'center',opacity:pressed?0.85:1})}><Text style={{color:colors.onFern,fontWeight:'700',fontSize:16}}>Get started</Text></Pressable>
   </Animated.View>
 <SafeBottom/></ScrollView>;
}
