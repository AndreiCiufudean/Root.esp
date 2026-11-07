import React,{useEffect,useRef,useState} from 'react';
import {View,Text,Pressable,useWindowDimensions} from 'react-native';
import {kvGet,kvSet} from './store';
import {colors} from './theme';
import {Btn} from './ui';
import Icon from './Icon';
import {useTour,measure} from './tour';
import {subscribeTourChanges,skipAllTours,tourPageKey,tourSkipAllKey} from './tourControl';

// Each step points at a <TourTarget id>. The overlay scrolls that part to the centre of the screen,
// dims everything else and puts the explanation right beside the highlighted part.
export const TOURS={
 Home:[
  {target:'home.stats',icon:'view-dashboard-outline',title:'Your dashboard',body:'These four numbers summarise your plants and Root.esp devices at a glance.'},
  {target:'home.plants',icon:'sprout',title:'Your plants, on the front page',body:'Every plant is listed here with its health status. Tap one to open its readings and care settings.'},
  {target:'home.attention',icon:'alert-circle-outline',title:'Needs attention',body:'Anything that needs you right now appears here: amber means check soon, red means act now.'},
  {target:'home.actions',icon:'gesture-tap',title:'Quick actions',body:'Jump straight to devices or notifications from here.'},
 ],
 Plants:[
  {target:'plants.add',icon:'plus-circle-outline',title:'Add a plant',body:'Add as many plants as you like and optionally link a Root.esp device.'},
  {target:'plants.grid',icon:'sprout',title:'Your plants',body:'Open a plant to inspect readings, control watering and change care settings.'},
 ],
 Design:[
  {target:'design.workflow',icon:'palette-outline',title:'Design studio',body:'Choose an interior visualisation or a custom planter design.'},
  {target:'design.photo',icon:'image-outline',title:'Upload your space',body:'Upload a photo of your room or plant. It is only sent to the AI when you choose Generate.'},
  {target:'design.history',icon:'history',title:'Design history',body:'Saved concepts live here, including two example designs you can open right away.'},
 ],
 Assistant:[
  {target:'assistant.suggestions',icon:'lightbulb-on-outline',title:'Ask anything about plants',body:'Start from a suggestion, or write your own question about care, pests or design.'},
  {target:'assistant.input',icon:'message-text-outline',title:'Chat with the assistant',body:'Type here and press Send. The assistant knows which plants you have added.'},
 ],
 Profile:[
  {target:'profile.devices',icon:'chip',title:'Account and hardware',body:'Manage your Root.esp devices here.'},
  {target:'profile.kids',icon:'account-child-outline',title:'Kids accounts',body:'Create a colourful kids account so children can look after the plants too.'},
  {target:'profile.appearance',icon:'palette-swatch-outline',title:'Themes',body:'Pick a colour theme and light or dark mode.'},
  {target:'profile.tours',icon:'map-marker-path',title:'Replay tours',body:'Restart these walkthroughs whenever you need them.'},
 ],
};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const PAD=8,GAP=14;

export default function TourOverlay({user,page}){
 const tour=useTour();
 const root=useRef(null);
 const {width,height}=useWindowDimensions();
 const [step,setStep]=useState(-1);
 const [rect,setRect]=useState(null);       // highlighted area, relative to the overlay
 const [box,setBox]=useState(null);         // overlay size
 const [cardH,setCardH]=useState(190);
 const [error,setError]=useState('');
 const [revision,setRevision]=useState(0);
 useEffect(()=>subscribeTourChanges(()=>setRevision(x=>x+1)),[]);
 useEffect(()=>{
  let active=true;setStep(-1);
  Promise.all([kvGet(tourSkipAllKey(user),false),kvGet(tourPageKey(user,page),false)])
    .then(([skipAll,completed])=>{if(active)setStep(!skipAll&&!completed&&TOURS[page]?0:-1);});
  return()=>{active=false;};
 },[user.UserID,page,revision]);

 // Locate the current target, scroll it to the centre, then measure it again for the spotlight.
 useEffect(()=>{
  if(step<0||!TOURS[page])return undefined;
  let cancelled=false;setRect(null);
  (async()=>{
   await sleep(80);
   const wrap=await measure(root.current);
   if(cancelled||!wrap)return;
   setBox(wrap);
   // The page may still be loading its data; wait up to ~2.5 s for the highlighted part to appear.
   let node=null,r=null;
   for(let i=0;i<16&&!cancelled;i++){
    node=tour?.targets?.[TOURS[page][step].target]?.current;r=await measure(node);
    if(r&&r.h>0)break;await sleep(150);
   }
   if(cancelled)return;
   if(!r||r.h===0){setRect('none');return;}
   const sc=tour?.scroll;
   const relY=r.y-wrap.y;
   // Tall parts are aligned near the top; everything else is centred.
   const want=r.h>wrap.h*0.6?wrap.h*0.12:(wrap.h-r.h)/2;
   const delta=relY-want;
   if(sc?.ref?.current&&Math.abs(delta)>6){
    sc.ref.current.scrollTo({y:Math.max(0,sc.offset()+delta),animated:true});
    await sleep(420);
    r=await measure(node)||r;
   }
   if(!cancelled)setRect({x:r.x-wrap.x,y:r.y-wrap.y,w:r.w,h:r.h});
  })();
  return()=>{cancelled=true;};
 },[step,page,width,height,tour]);

 const finish=async()=>{
  if(!await kvSet(tourPageKey(user,page),true)){setError('Could not save tour progress.');return;}
  setError('');setStep(-1);
 };
 const skipAll=async()=>{try{await skipAllTours(user);setError('');setStep(-1);}catch(e){setError(e.message);}};
 if(step<0||!TOURS[page])return null;
 const steps=TOURS[page];const s=steps[step];const last=step===steps.length-1;
 const W=box?.w||width,H=box?.h||height;
 const cardW=Math.min(420,W-32);
 const hole=rect&&rect!=='none'?{x:Math.max(4,rect.x-PAD),y:Math.max(4,rect.y-PAD),w:Math.min(W-8,rect.w+PAD*2),h:rect.h+PAD*2}:null;
 // Card goes below the highlight if it fits, otherwise above, otherwise it is centred.
 let cardTop=(H-cardH)/2,cardLeft=(W-cardW)/2,caret=null;
 if(hole){
  const cx=hole.x+hole.w/2;
  cardLeft=Math.min(Math.max(16,cx-cardW/2),W-cardW-16);
  if(hole.y+hole.h+GAP+cardH<=H-8){cardTop=hole.y+hole.h+GAP;caret='up';}
  else if(hole.y-GAP-cardH>=8){cardTop=hole.y-GAP-cardH;caret='down';}
  else {cardTop=Math.max(8,H-cardH-16);}
  caret=caret&&{dir:caret,left:Math.min(Math.max(18,cx-cardLeft-9),cardW-36)};
 }
 const dim='#0B1410B8';
 return <View ref={root} collapsable={false} pointerEvents="box-none" style={{position:'absolute',left:0,right:0,top:0,bottom:0,zIndex:100}}>
  {hole?<>
   <View style={{position:'absolute',left:0,right:0,top:0,height:hole.y,backgroundColor:dim}}/>
   <View style={{position:'absolute',left:0,right:0,top:hole.y+hole.h,bottom:0,backgroundColor:dim}}/>
   <View style={{position:'absolute',left:0,width:hole.x,top:hole.y,height:hole.h,backgroundColor:dim}}/>
   <View style={{position:'absolute',left:hole.x+hole.w,right:0,top:hole.y,height:hole.h,backgroundColor:dim}}/>
   <View pointerEvents="none" style={{position:'absolute',left:hole.x,top:hole.y,width:hole.w,height:hole.h,borderRadius:16,borderWidth:3,borderColor:colors.sun,shadowColor:colors.sun,shadowOpacity:0.8,shadowRadius:14}}/>
  </>:<View style={{position:'absolute',left:0,right:0,top:0,bottom:0,backgroundColor:rect?dim:'transparent'}}/>}
  {rect&&<View onLayout={e=>setCardH(e.nativeEvent.layout.height)} accessibilityRole="alert" style={{position:'absolute',top:cardTop,left:cardLeft,width:cardW,backgroundColor:colors.paper,borderColor:colors.line,borderWidth:1,borderRadius:16,padding:18,shadowColor:'#000',shadowOpacity:0.25,shadowRadius:18,elevation:8,gap:10}}>
   {caret&&<View style={{position:'absolute',left:caret.left,[caret.dir==='up'?'top':'bottom']:-9,width:18,height:18,backgroundColor:colors.paper,borderColor:colors.line,borderLeftWidth:caret.dir==='up'?1:0,borderTopWidth:caret.dir==='up'?1:0,borderRightWidth:caret.dir==='down'?1:0,borderBottomWidth:caret.dir==='down'?1:0,transform:[{rotate:'45deg'}]}}/>}
   <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
    <View style={{width:36,height:36,borderRadius:10,backgroundColor:colors.mist,alignItems:'center',justifyContent:'center'}}><Icon name={s.icon||'information-outline'} size={20} color={colors.fern}/></View>
    <View style={{flex:1}}><Text style={{fontSize:11,color:colors.muted,letterSpacing:1}}>GUIDED TOUR · {page.toUpperCase()}</Text><Text style={{fontSize:18,fontWeight:'700',color:colors.soil}}>{s.title}</Text></View>
   </View>
   <Text style={{color:colors.soil,lineHeight:21}}>{s.body}</Text>
   <View style={{flexDirection:'row',gap:5,alignItems:'center'}}>{steps.map((_,i)=><View key={i} style={{width:i===step?18:7,height:7,borderRadius:4,backgroundColor:i===step?colors.fern:colors.line}}/>)}</View>
   {!!error&&<Text accessibilityRole="alert" style={{color:colors.danger}}>{error}</Text>}
   <View style={{flexDirection:'row',gap:12,alignItems:'center',flexWrap:'wrap'}}>
    <Pressable onPress={finish} accessibilityRole="button"><Text style={{color:colors.muted}}>Skip this page</Text></Pressable>
    <Pressable onPress={skipAll} accessibilityRole="button"><Text style={{color:colors.muted}}>Skip all tours</Text></Pressable>
    <View style={{flex:1}}/>
    {step>0&&<Btn small outline title="Back" onPress={()=>setStep(step-1)}/>}
    <Btn small title={last?'Finish':'Next'} onPress={()=>last?finish():setStep(step+1)}/>
   </View>
  </View>}
 </View>;
}
