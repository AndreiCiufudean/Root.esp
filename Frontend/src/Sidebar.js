import React from 'react';
import {View,Text,Pressable} from 'react-native';
import {colors} from './theme';
import {LogoBack,Icon,Dot} from './ui';
import {useAuth} from './auth';
export const SIDEBAR_WIDTH=216;
// Each destination keeps the same icon and accent colour on every screen size, so it is recognisable at a glance.
export const NAV_ITEMS={
 Home:{label:'Home',icon:'home-variant',iconOff:'home-variant-outline',color:()=>colors.section.home},
 Plants:{label:'My Plants',icon:'sprout',iconOff:'sprout-outline',color:()=>colors.section.plants},
 Design:{label:'Design',icon:'palette',iconOff:'palette-outline',color:()=>colors.section.design},
 Assistant:{label:'Assistant',icon:'robot-happy',iconOff:'robot-happy-outline',color:()=>colors.section.assistant},
 Profile:{label:'Profile',icon:'account-circle',iconOff:'account-circle-outline',color:()=>colors.section.profile},
};
export default function Sidebar({state,navigation}){
 const {counts}=useAuth()||{counts:{}};
 return <View style={{width:SIDEBAR_WIDTH,flexShrink:0,backgroundColor:colors.paper,borderRightWidth:1,borderColor:colors.line,paddingHorizontal:14,paddingTop:34}}>
  <View style={{paddingHorizontal:4,marginLeft:state.index!==0?-6:0}}><LogoBack size={27} back={state.index!==0} onPress={()=>{if(navigation.canGoBack())navigation.goBack();else navigation.navigate('Home');}}/></View>
  <Text style={{fontSize:11,color:colors.muted,marginTop:6,marginBottom:38,letterSpacing:1,paddingHorizontal:4}}>TAKE YOUR LIFE SLOW.</Text>
  {state.routes.map((r,i)=>{const active=state.index===i;const item=NAV_ITEMS[r.name];const accent=item.color();return <Pressable key={r.key} onPress={()=>navigation.navigate(r.name)} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{selected:active}} style={({pressed})=>({flexDirection:'row',alignItems:'center',gap:12,paddingVertical:12,paddingHorizontal:12,marginBottom:4,borderRadius:10,backgroundColor:active?accent+(colors.isDark?'2E':'1A'):pressed?colors.mist:'transparent'})}>
   <View style={{width:4,height:22,borderRadius:2,backgroundColor:active?accent:'transparent',marginLeft:-8}}/>
   <Icon name={active?item.icon:item.iconOff} size={22} color={active?accent:colors.muted}/>
   <Text style={{fontWeight:active?'700':'500',color:active?colors.soil:colors.muted,fontSize:14}}>{item.label}</Text>
  </Pressable>;})}
  <View style={{flex:1}}/>
  <Pressable accessibilityRole="button" onPress={()=>navigation.getParent()?.navigate('Alerts')} style={{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderRadius:10,borderWidth:1,borderColor:colors.line,marginBottom:14}}>
   <Icon name="bell-outline" size={20} color={colors.soil}/><Text style={{color:colors.soil,flex:1}}>Notifications</Text>
   {counts?.urgent>0?<Dot color={colors.danger}/>:counts?.green>0?<Dot color={colors.success}/>:null}
  </Pressable>
  <Text style={{color:colors.muted,fontSize:11,marginBottom:24,paddingHorizontal:4}}>SMART CARE  /  DESIGN</Text>
 </View>;
}
