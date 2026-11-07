import React from 'react';
import {Modal,View,Text,Pressable,ScrollView} from 'react-native';
import {usePrefs} from './prefs';
import {colors,THEMES,THEME_IDS} from './theme';
import Icon from './Icon';
// Theme picker: each option previews its real colours (brand, surface, accent) before it is applied.
export default function SettingsModal({visible,onClose}){
 const prefs=usePrefs();
 return <Modal visible={!!visible} transparent animationType="fade" onRequestClose={onClose}><View style={{flex:1,backgroundColor:'#0008',justifyContent:'center',padding:16}}>
  <View style={{maxWidth:620,width:'100%',maxHeight:'92%',alignSelf:'center',backgroundColor:colors.paper,borderRadius:16,borderWidth:1,borderColor:colors.line}}>
   <ScrollView contentContainerStyle={{padding:22,gap:14}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:10}}><Icon name="palette-swatch-outline" size={26} color={colors.fern}/><Text style={{color:colors.soil,fontSize:24,fontWeight:'700',flex:1}}>Appearance</Text><Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={8}><Icon name="close" size={24} color={colors.muted}/></Pressable></View>
    <Text style={{color:colors.soil,fontWeight:'700'}}>Mode</Text>
    <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{[['light','Light','white-balance-sunny'],['dark','Dark','weather-night'],['system','Use system','cellphone-cog']].map(([v,label,icon])=>{const on=prefs.appearance===v;return <Pressable key={v} accessibilityRole="button" accessibilityState={{selected:on}} onPress={()=>prefs.setAppearance(v)} style={{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:10,paddingHorizontal:14,borderColor:on?colors.fern:colors.line,borderWidth:1.5,borderRadius:10,backgroundColor:on?colors.mist:'transparent'}}><Icon name={icon} size={18} color={on?colors.fern:colors.muted}/><Text style={{color:colors.soil,fontWeight:on?'700':'400'}}>{label}</Text></Pressable>;})}</View>
    <Text style={{color:colors.soil,fontWeight:'700',marginTop:6}}>Colour theme</Text>
    <Text style={{color:colors.muted,marginTop:-8}}>Status colours keep the same meaning in every theme: green healthy, amber attention, red problem, blue water.</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>{THEME_IDS.map(id=>{const t=THEMES[id];const on=colors.themeId===id;const pv=prefs.resolvedAppearance==='dark'?t.dark:t.light;return <Pressable key={id} accessibilityRole="button" accessibilityLabel={`${t.label} theme`} accessibilityState={{selected:on}} onPress={()=>prefs.setTheme(id)} style={{flexGrow:1,flexBasis:170,borderWidth:on?2:1,borderColor:on?colors.fern:colors.line,borderRadius:12,overflow:'hidden'}}>
     <View style={{flexDirection:'row',height:40,backgroundColor:pv.gradient[0],padding:8,gap:6,alignItems:'center'}}>
      <View style={{width:24,height:24,borderRadius:12,backgroundColor:pv.fern}}/><View style={{width:24,height:24,borderRadius:12,backgroundColor:pv.accent}}/><View style={{flex:1,height:12,borderRadius:6,backgroundColor:pv.paper,borderWidth:1,borderColor:pv.line}}/>
     </View>
     <View style={{padding:10,backgroundColor:colors.paper,flexDirection:'row',alignItems:'center',gap:6}}>
      <View style={{flex:1}}><Text style={{color:colors.soil,fontWeight:'700'}}>{t.label}</Text><Text style={{color:colors.muted,fontSize:12}} numberOfLines={1}>{t.description}</Text></View>
      {on&&<Icon name="check-circle" size={20} color={colors.fern}/>}
     </View>
    </Pressable>;})}</View>
    <Pressable accessibilityRole="button" onPress={onClose} style={{padding:15,marginTop:6,backgroundColor:colors.fern,borderRadius:10,alignItems:'center'}}><Text style={{color:colors.onFern,fontWeight:'700'}}>Done</Text></Pressable>
   </ScrollView>
  </View>
 </View></Modal>;
}
