// Optional design questionnaire. No longer part of the intro: the Design studio offers it once the
// person has had a look at the designer, and it can be opened (or redone) at any time from there.
import React,{useEffect,useState} from 'react';
import {View,Text,Pressable} from 'react-native';
import {colors} from './theme';
import {kvGet,kvSet} from './store';
import {USE_MOCK} from './api';
import {Sheet,Btn,Icon} from './ui';

export const QUESTIONS=[
 ['Interior style',['Minimalist','Modern','Scandinavian','Classic','Industrial','Other'],'sofa-outline'],
 ['Dominant home colors',['White / cream','Earth tones','Grey / black','Natural wood','Colorful','Other'],'palette-outline'],
 ['How many plants do you own?',['None yet','1–3','4–10','More than 10'],'sprout-outline'],
 ['Types of plants',['Indoor foliage','Flowers','Succulents','Herbs','Mixed collection'],'leaf'],
 ['Electronic module preference',['Integrated in the pot','Attached separately','No preference'],'chip'],
 ['What matters most?',['Automated care','Premium design','Both'],'star-outline'],
];
const mode=USE_MOCK?'demo':'real';
export const answersKey=user=>`rootesp.personalization.account.${mode}.${user.UserID}`;
const offeredKey=user=>`rootesp.questionnaire.offered.v1.${mode}.${user.UserID}`;
export const loadAnswers=user=>kvGet(answersKey(user),null).then(x=>x||{});
export const saveAnswers=(user,a)=>kvSet(answersKey(user),a);
export const wasOffered=user=>kvGet(offeredKey(user),false);
export const markOffered=user=>kvSet(offeredKey(user),true);

export function QuestionnaireSheet({visible,initial,onClose,onSave}){
 const [step,setStep]=useState(0),[answers,setAnswers]=useState({});
 useEffect(()=>{if(visible){setStep(0);setAnswers(initial||{});}},[visible]);
 const accent=colors.section.design;
 const done=step>=QUESTIONS.length;
 const choose=v=>{const [q]=QUESTIONS[step];setAnswers(a=>({...a,[q]:v}));setStep(s=>s+1);};
 const [q,options,icon]=QUESTIONS[Math.min(step,QUESTIONS.length-1)];
 return <Sheet visible={visible} title="Personalise your designs" onClose={onClose}>
  <View style={{flexDirection:'row',gap:4}}>{QUESTIONS.map((_,i)=><View key={i} style={{flex:1,height:5,borderRadius:3,backgroundColor:i<step?accent:colors.line}}/>)}</View>
  {!done?<View style={{gap:10}}>
   <View style={{flexDirection:'row',alignItems:'center',gap:10}}><Icon name={icon} size={22} color={accent}/><Text style={{flex:1,fontSize:20,fontWeight:'700',color:colors.soil}}>{q}</Text></View>
   <Text style={{color:colors.muted,fontSize:12}}>Question {step+1} of {QUESTIONS.length} · optional</Text>
   {options.map(o=>{const on=answers[q]===o;return <Pressable key={o} accessibilityRole="button" accessibilityState={{selected:on}} onPress={()=>choose(o)} style={({pressed})=>({flexDirection:'row',alignItems:'center',gap:10,padding:15,borderRadius:12,borderWidth:1.5,borderColor:on?accent:colors.line,backgroundColor:on?accent+'1A':pressed?colors.mist:colors.paper})}>
    <View style={{width:20,height:20,borderRadius:10,borderWidth:2,borderColor:on?accent:colors.line,alignItems:'center',justifyContent:'center'}}>{on&&<View style={{width:10,height:10,borderRadius:5,backgroundColor:accent}}/>}</View>
    <Text style={{color:colors.soil,fontWeight:on?'700':'400'}}>{o}</Text></Pressable>;})}
   <View style={{flexDirection:'row',justifyContent:'space-between'}}>
    <Pressable accessibilityRole="button" disabled={step===0} onPress={()=>setStep(s=>s-1)} style={{padding:10,opacity:step===0?0.3:1}}><Text style={{color:colors.muted}}>Back</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={()=>setStep(s=>s+1)} style={{padding:10}}><Text style={{color:colors.muted}}>Skip this question</Text></Pressable>
   </View>
  </View>:<View style={{gap:12,alignItems:'center',paddingVertical:8}}>
   <View style={{width:64,height:64,borderRadius:32,backgroundColor:accent,alignItems:'center',justifyContent:'center'}}><Icon name="check-bold" size={32} color={colors.isDark?'#1F1433':'#FFFFFF'}/></View>
   <Text style={{fontSize:18,fontWeight:'700',color:colors.soil}}>Thanks, that helps</Text>
   <Text style={{color:colors.muted,textAlign:'center'}}>New designs will use these answers. You can change them any time in the Design studio.</Text>
   <Btn tone="design" icon="content-save-outline" title="Save answers" style={{alignSelf:'stretch'}} onPress={()=>onSave(answers)}/>
  </View>}
 </Sheet>;
}
