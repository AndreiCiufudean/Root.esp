// v2.4 plant cards for Home ("My plants", "Needs attention") and the My Plants tab.
// Same colour meanings as everywhere else (green healthy, amber attention, red problem, blue water),
// always repeated with an icon and a word so nothing relies on colour alone.
import React from 'react';
import {View,Text,Pressable,Image} from 'react-native';
import {colors,toneColor,toneBg,tint,PASTELS} from './theme';
import Icon from './Icon';
import {playSound} from './sound';
import {percentage,displayReading} from './logic';

// One icon per status, used by the tiles, the attention cards and the filter chips.
export const MOOD_ICON={
 Happy:'emoticon-happy-outline',Thirsty:'water-alert','Too wet':'water-off','Too hot':'thermometer-alert',
 'Needs light':'weather-sunny-alert','Device offline':'wifi-off',Waiting:'timer-sand','No device':'link-variant-off','No soil data':'help-circle-outline',
};
export const moodIcon=m=>MOOD_ICON[m?.label]||'leaf';

// What to do next, in plain words, for each status.
const NEXT_STEP={
 Thirsty:'Water now or turn on automatic watering.',
 'Too wet':'Skip the next watering and check drainage.',
 'Too hot':'Move it out of direct heat or let the fan run.',
 'Needs light':'Move it closer to a bright window.',
 'Device offline':'Check the device power and Wi-Fi.',
};

const press=(onPress)=>()=>{playSound('click');onPress&&onPress();};

// Round plant picture: photo when there is one, otherwise the chosen plant icon.
function PlantFace({look,size}){
 return <View style={{width:size,height:size,borderRadius:size/2,backgroundColor:colors.paper,alignItems:'center',justifyContent:'center',overflow:'hidden',borderWidth:3,borderColor:colors.paper,shadowColor:'#000',shadowOpacity:colors.isDark?0:0.08,shadowRadius:8,shadowOffset:{width:0,height:3},elevation:2}}>
  {look?.photo?<Image source={{uri:look.photo}} style={{width:size,height:size}}/>:<Icon name={look?.icon||'sprout'} size={size*0.54} color={colors.section.plants}/>}
 </View>;
}

// Vertical "soil tank": fill level is the soil moisture, the dark tick is the watering threshold.
export function SoilTank({value,threshold=30,tone,height=74}){
 const n=percentage(value);const t=percentage(threshold)??30;
 return <View accessibilityLabel={n===null?'No soil reading':`Soil moisture ${n} percent`} style={{alignItems:'center',gap:4}}>
  <View style={{width:18,height,borderRadius:9,backgroundColor:colors.isDark?'#FFFFFF1A':'#FFFFFFB3',overflow:'hidden',justifyContent:'flex-end',borderWidth:1,borderColor:colors.isDark?'#FFFFFF22':'#00000012'}}>
   {n!==null&&<View style={{height:`${n}%`,backgroundColor:toneColor[tone]||colors.info,borderRadius:9}}/>}
   <View style={{position:'absolute',left:2,right:2,bottom:`${t}%`,height:2,borderRadius:1,backgroundColor:colors.soil,opacity:0.55}}/>
  </View>
  <Text style={{fontSize:11,fontWeight:'700',color:colors.soil}}>{n===null?'—':`${n}%`}</Text>
 </View>;
}

const Metric=({icon,color,text})=><View style={{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:colors.mist,borderRadius:20,paddingHorizontal:9,paddingVertical:5}}>
 <Icon name={icon} size={14} color={color}/><Text style={{fontSize:12,fontWeight:'600',color:colors.soil}}>{text}</Text>
</View>;

export function StatusChip({mood,small}){
 const c=toneColor[mood.tone]||colors.muted;
 return <View style={{flexDirection:'row',alignItems:'center',gap:5,alignSelf:'flex-start',backgroundColor:toneBg[mood.tone]||colors.mist,borderRadius:20,paddingHorizontal:small?8:10,paddingVertical:small?3:5}}>
  <Icon name={moodIcon(mood)} size={small?13:15} color={c}/><Text style={{color:c,fontWeight:'700',fontSize:small?11:12}}>{mood.label}</Text>
 </View>;
}

// Plant tile: a soft coloured "pot" header with the plant face and its soil tank, then name, status and readings.
export function PlantTile({plant,look,mood,soil,onPress,width}){
 const bg=tint(look?.color||PASTELS[0]);const accent=toneColor[mood.tone]||colors.line;
 const species=[plant.species?.CommonName,plant.Location].filter(Boolean).join(' · ')||'No location assigned';
 return <Pressable onPress={press(onPress)} accessibilityRole="button" accessibilityLabel={`${plant.PlantName}, ${mood.label}`}
  style={({pressed})=>[{width,flexGrow:width?0:1,flexBasis:width?undefined:260,maxWidth:'100%',transform:[{scale:pressed?0.98:1}]}]}>
  <View style={{backgroundColor:colors.paper,borderRadius:22,borderWidth:1,borderColor:colors.line,overflow:'hidden'}}>
   <View style={{backgroundColor:bg,height:112,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
    {/* decorative leaves */}
    <View pointerEvents="none" style={{position:'absolute',right:-18,top:-22,width:96,height:96,borderRadius:48,backgroundColor:'#FFFFFF',opacity:colors.isDark?0.05:0.35}}/>
    <View pointerEvents="none" style={{position:'absolute',left:70,bottom:-30,width:70,height:70,borderRadius:35,backgroundColor:'#FFFFFF',opacity:colors.isDark?0.04:0.25}}/>
    <PlantFace look={look} size={72}/>
    {plant.latest?<SoilTank value={plant.latest.SoilMoisture} threshold={plant.settings?.SoilMoistureThreshold} tone={soil.tone}/>
     :<View style={{alignItems:'center',gap:4,opacity:0.8}}><Icon name={plant.device?'timer-sand':'link-variant-off'} size={22} color={colors.soil}/><Text style={{fontSize:11,color:colors.soil}}>{plant.device?'Waiting':'No device'}</Text></View>}
    <View style={{position:'absolute',left:0,right:0,bottom:0,height:4,backgroundColor:accent}}/>
   </View>
   <View style={{padding:14,gap:10}}>
    <View style={{gap:2}}>
     <Text numberOfLines={1} style={{color:colors.soil,fontSize:18,fontWeight:'800',letterSpacing:-0.3}}>{plant.PlantName}</Text>
     <Text numberOfLines={1} style={{color:colors.muted,fontSize:13}}>{species}</Text>
    </View>
    <StatusChip mood={mood}/>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
     {plant.latest?<>
      <Metric icon="water-percent" color={colors.info} text={soil.text}/>
      <Metric icon="thermometer" color={colors.warning} text={soil.temp}/>
      {plant.latest.AirHumidity!=null&&<Metric icon="weather-windy" color={colors.section.plants} text={displayReading(plant.latest.AirHumidity,'%',0,100)}/>}
     </>:<Metric icon={plant.device?'timer-sand':'link-variant-plus'} color={colors.muted} text={plant.device?'Waiting for first reading':'Tap to link a device'}/>}
    </View>
   </View>
  </View>
 </Pressable>;
}

// "Needs attention": what is wrong, the reading behind it and the next step, with a clear call to action.
export function AttentionCard({plant,look,mood,soil,onPress}){
 const c=toneColor[mood.tone]||colors.warning;const bg=toneBg[mood.tone]||colors.mist;
 return <Pressable onPress={press(onPress)} accessibilityRole="button" accessibilityLabel={`${plant.PlantName}: ${mood.label}. Open plant`}
  style={({pressed})=>({transform:[{scale:pressed?0.99:1}]})}>
  <View style={{flexDirection:'row',backgroundColor:colors.paper,borderRadius:20,borderWidth:1,borderColor:colors.line,overflow:'hidden'}}>
   <View style={{width:78,backgroundColor:bg,alignItems:'center',justifyContent:'center',gap:6,paddingVertical:16}}>
    <View style={{width:46,height:46,borderRadius:23,backgroundColor:c,alignItems:'center',justifyContent:'center'}}><Icon name={moodIcon(mood)} size={26} color={colors.isDark?'#111':'#FFFFFF'}/></View>
    <Text style={{fontSize:11,fontWeight:'800',color:c,textAlign:'center'}}>{mood.label.toUpperCase()}</Text>
   </View>
   <View style={{flex:1,padding:14,gap:8}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
     <View style={{width:34,height:34,borderRadius:17,backgroundColor:tint(look?.color||PASTELS[0]),alignItems:'center',justifyContent:'center',overflow:'hidden'}}>{look?.photo?<Image source={{uri:look.photo}} style={{width:34,height:34}}/>:<Icon name={look?.icon||'sprout'} size={18} color={colors.section.plants}/>}</View>
     <View style={{flex:1}}><Text numberOfLines={1} style={{fontWeight:'800',color:colors.soil,fontSize:16}}>{plant.PlantName}</Text><Text numberOfLines={1} style={{color:colors.muted,fontSize:12}}>{plant.species?.CommonName||plant.Location||'Plant'}</Text></View>
    </View>
    <Text style={{color:colors.soil,lineHeight:20}}>{mood.hint}{NEXT_STEP[mood.label]?` ${NEXT_STEP[mood.label]}`:''}</Text>
    <View style={{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'}}>
     {plant.latest&&<Metric icon="water-percent" color={colors.info} text={`Soil ${soil.text}`}/>}
     {plant.latest&&<Metric icon="thermometer" color={colors.warning} text={soil.temp}/>}
     <View style={{flex:1}}/>
     <View style={{flexDirection:'row',alignItems:'center',gap:4}}><Text style={{color:c,fontWeight:'800',fontSize:13}}>Check plant</Text><Icon name="arrow-right" size={16} color={c}/></View>
    </View>
   </View>
  </View>
 </Pressable>;
}

// Shown when nothing needs attention.
export function AllGoodCard({text}){
 return <View style={{flexDirection:'row',alignItems:'center',gap:14,backgroundColor:colors.successBg,borderRadius:20,padding:16,borderWidth:1,borderColor:colors.success+'40'}}>
  <View style={{width:46,height:46,borderRadius:23,backgroundColor:colors.success,alignItems:'center',justifyContent:'center'}}><Icon name="check-bold" size={24} color={colors.isDark?'#111':'#FFFFFF'}/></View>
  <View style={{flex:1}}><Text style={{fontWeight:'800',color:colors.soil,fontSize:16}}>All good for now</Text><Text style={{color:colors.soil,opacity:0.8,lineHeight:20}}>{text}</Text></View>
 </View>;
}

// Filter chip with a count (My Plants tab).
export function FilterChip({label,icon,count,active,color,onPress}){
 const c=color||colors.section.plants;
 return <Pressable accessibilityRole="button" accessibilityState={{selected:!!active}} onPress={press(onPress)}
  style={{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:12,paddingVertical:8,borderRadius:20,borderWidth:1.5,borderColor:active?c:colors.line,backgroundColor:active?c:colors.paper}}>
  <Icon name={icon} size={16} color={active?(colors.isDark?'#111':'#FFFFFF'):c}/>
  <Text style={{fontWeight:'700',color:active?(colors.isDark?'#111':'#FFFFFF'):colors.soil,fontSize:13}}>{label}</Text>
  <View style={{minWidth:20,paddingHorizontal:6,height:20,borderRadius:10,backgroundColor:active?'#FFFFFF40':colors.mist,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:11,fontWeight:'800',color:active?(colors.isDark?'#111':'#FFFFFF'):colors.soil}}>{count}</Text></View>
 </Pressable>;
}
