import React,{useEffect,useRef} from 'react';
import {View,Text,Animated,Easing} from 'react-native';
import {colors} from './theme';
import {Wordmark,GradientBg,Icon} from './ui';
// Shown while preferences load; matches the 'preparing your garden' page so the start feels like one motion.
export default function Splash(){
 const pulse=useRef(new Animated.Value(0)).current;
 useEffect(()=>{const a=Animated.loop(Animated.sequence([Animated.timing(pulse,{toValue:1,duration:800,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),Animated.timing(pulse,{toValue:0,duration:800,easing:Easing.inOut(Easing.sin),useNativeDriver:true})]));a.start();return()=>a.stop();},[]);
 return <View style={{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:colors.bg,gap:12}}>
  <GradientBg/>
  <Animated.View style={{opacity:pulse.interpolate({inputRange:[0,1],outputRange:[0.5,1]}),transform:[{scale:pulse.interpolate({inputRange:[0,1],outputRange:[0.94,1.04]})}]}}><Icon name="sprout" size={56} color={colors.fern}/></Animated.View>
  <Wordmark size={38}/><Text style={{color:colors.muted,fontSize:12,letterSpacing:2}}>TAKE YOUR LIFE SLOW.</Text>
 </View>;
}
