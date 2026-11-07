// "Link a device?" prompt and Root.esp prototype ads.
// Once someone has tried every main feature (Home, My Plants, Design, Assistant, Profile) without any plant
// linked to a Root.esp device, we ask once whether they want to link one now:
//   Yes -> straight to device management.   No -> Root.esp's own prototype ads appear in the app.
// Ads stop as soon as a plant is linked to a device. No third-party ads, no tracking: everything stays on this device.
import React,{useCallback,useEffect,useRef,useState} from 'react';
import {View,Text,Pressable,Modal,Animated,Easing} from 'react-native';
import {colors} from './theme';
import {kvGet,kvSet} from './store';
import {api,USE_MOCK} from './api';
import {Btn,Icon} from './ui';

export const FEATURES=['Home','Plants','Design','Assistant','Profile'];
const mode=USE_MOCK?'demo':'real';
const K={seen:u=>`rootesp.features.v1.${mode}.${u.UserID}`,asked:u=>`rootesp.devicenudge.asked.v1.${mode}.${u.UserID}`,ads:u=>`rootesp.ads.v1.${mode}.${u.UserID}`};

// Tiny event bus so pages, the prompt and the ad slots stay in sync.
const listeners=new Set();
const emit=()=>listeners.forEach(fn=>{try{fn();}catch(e){/* ignore */}});
const useBus=fn=>useEffect(()=>{listeners.add(fn);return()=>{listeners.delete(fn);};},[fn]);

export async function recordFeature(user,name){
 if(!user||user.IsKid||!FEATURES.includes(name))return;
 const seen=await kvGet(K.seen(user),[]);if(seen.includes(name))return;
 await kvSet(K.seen(user),[...seen,name]);emit();
}
export const hasLinkedDevice=plants=>(plants||[]).some(p=>!!p.device);
export const triedEverything=seen=>FEATURES.every(f=>(seen||[]).includes(f));
export async function setAds(user,on){await kvSet(K.ads(user),!!on);emit();}

// Root.esp-only prototype ads.
export const ADS=[
 {id:'pot',icon:'flower-tulip-outline',tag:'Root.esp Smart Pot',title:'A pot that waters itself',body:'Soil, light and temperature sensors built in, plus a hidden water tank. Your plant tells Root.esp when it is thirsty.',cta:'Link a Root.esp device',to:'Devices',color:'#2E7D4F'},
 {id:'kit',icon:'chip',tag:'Root.esp Sensor Kit',title:'Make any pot smart in 2 minutes',body:'Clip the sensor into the soil, pair it in the app and watch live moisture readings appear.',cta:'Pair a sensor kit',to:'Devices',color:'#1F6FB2'},
 {id:'design',icon:'palette-outline',tag:'Root.esp Design',title:'A pot designed for your room',body:'Upload a photo, describe your plant and get a custom pot with the Root.esp module built in.',cta:'Open the Design studio',to:'Design',color:'#7B4FB8'},
];

// Inline ad slot for pages (Home, My Plants, Design). Renders nothing unless ads are switched on.
export function AdSlot({user,navigate,index=0}){
 const [on,setOn]=useState(false),[hidden,setHidden]=useState(false);
 const refresh=useCallback(()=>{if(user)kvGet(K.ads(user),false).then(setOn);},[user?.UserID]);
 useEffect(refresh,[refresh]);useBus(refresh);
 if(!on||hidden||!user||user.IsKid)return null;
 const ad=ADS[(index+new Date().getDate())%ADS.length];
 return <AdCard ad={ad} onPress={()=>navigate(ad.to)} onClose={()=>setHidden(true)}/>;
}
export function AdCard({ad,onPress,onClose,big}){
 return <View style={{borderRadius:20,overflow:'hidden',borderWidth:1,borderColor:colors.line,backgroundColor:colors.paper}}>
  <View style={{backgroundColor:ad.color,padding:big?22:16,flexDirection:'row',alignItems:'center',gap:14}}>
   <View style={{width:big?64:48,height:big?64:48,borderRadius:big?20:16,backgroundColor:'#FFFFFF2E',alignItems:'center',justifyContent:'center'}}><Icon name={ad.icon} size={big?36:26} color="#FFFFFF"/></View>
   <View style={{flex:1}}><Text style={{color:'#FFFFFFCC',fontSize:11,fontWeight:'800',letterSpacing:1}}>{ad.tag.toUpperCase()}</Text><Text style={{color:'#FFFFFF',fontSize:big?22:18,fontWeight:'800'}}>{ad.title}</Text></View>
   {onClose&&<Pressable accessibilityRole="button" accessibilityLabel="Hide ad" onPress={onClose} hitSlop={10} style={{alignSelf:'flex-start'}}><Icon name="close" size={20} color="#FFFFFFCC"/></Pressable>}
  </View>
  <View style={{padding:16,gap:12}}>
   <Text style={{color:colors.soil,lineHeight:21}}>{ad.body}</Text>
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
    <Text style={{color:colors.muted,fontSize:11}}>Prototype ad · Root.esp</Text>
    <Btn small icon="arrow-right" title={ad.cta} onPress={onPress}/>
   </View>
  </View>
 </View>;
}

// Watches feature use and shows the prompt (then, after "No", one full ad) for adult accounts.
export function DeviceNudge({user,navigate}){
 const [step,setStep]=useState(null);// null | 'ask' | 'ad'
 const busy=useRef(false);
 const check=useCallback(async()=>{
  if(!user||user.IsKid||busy.current||step)return;busy.current=true;
  try{
   const [seen,asked]=await Promise.all([kvGet(K.seen(user),[]),kvGet(K.asked(user),false)]);
   const plants=await api.getPlants(user.UserID).catch(()=>null);
   // A linked device ends the ads for good.
   if(plants&&hasLinkedDevice(plants)){if(await kvGet(K.ads(user),false))await setAds(user,false);return;}
   if(!asked&&triedEverything(seen)&&plants)setStep('ask');
  }finally{busy.current=false;}
 },[user?.UserID,step]);
 useEffect(()=>{check();},[check]);useBus(check);
 const answer=async yes=>{await kvSet(K.asked(user),true);if(yes){setStep(null);navigate('Devices');}else{await setAds(user,true);setStep('ad');}};
 const fade=useRef(new Animated.Value(0)).current;
 useEffect(()=>{if(step){fade.setValue(0.3);Animated.timing(fade,{toValue:1,duration:240,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start(()=>fade.setValue(1));const t=setTimeout(()=>fade.setValue(1),700);return()=>clearTimeout(t);}return undefined;},[step]);
 if(!step)return null;
 const ad=ADS[0];
 return <Modal visible transparent animationType="fade" onRequestClose={()=>step==='ask'?answer(false):setStep(null)}>
  <View style={{flex:1,backgroundColor:'#0009',alignItems:'center',justifyContent:'center',padding:20}}>
   <Animated.View style={{width:'100%',maxWidth:420,opacity:fade,transform:[{scale:fade.interpolate({inputRange:[0,1],outputRange:[0.94,1]})}]}}>
    {step==='ask'?<View style={{backgroundColor:colors.paper,borderRadius:22,padding:22,gap:14}}>
     <View style={{width:60,height:60,borderRadius:20,backgroundColor:colors.fern+'1F',alignItems:'center',justifyContent:'center',alignSelf:'center'}}><Icon name="chip" size={32} color={colors.fern}/></View>
     <Text style={{fontSize:21,fontWeight:'800',color:colors.soil,textAlign:'center'}}>You have tried every feature</Text>
     <Text style={{color:colors.muted,lineHeight:21,textAlign:'center'}}>None of your plants is linked to a Root.esp device yet. Link one now to get live soil readings and automatic watering?</Text>
     <Btn icon="link-variant" title="Yes, link a device now" onPress={()=>answer(true)}/>
     <Btn outline tone="muted" title="No, not now" onPress={()=>answer(false)}/>
    </View>
    :<View style={{gap:10}}>
     <AdCard big ad={ad} onPress={()=>{setStep(null);navigate(ad.to);}}/>
     <Pressable accessibilityRole="button" onPress={()=>setStep(null)} style={{alignSelf:'center',padding:12}}><Text style={{color:'#FFFFFF',fontWeight:'700'}}>Continue to Root.esp</Text></Pressable>
    </View>}
   </Animated.View>
  </View>
 </Modal>;
}
