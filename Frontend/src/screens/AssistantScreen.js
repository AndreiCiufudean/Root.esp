import React,{useEffect,useRef,useState} from 'react';
import {View,Text,TextInput,Pressable,ScrollView,KeyboardAvoidingView,Platform,Animated} from 'react-native';
import {useAuth} from '../auth';
import {api,USE_MOCK} from '../api';
import {kvGet,kvSet} from '../store';
import {colors,MAX_WIDTH,onColor} from '../theme';
import {GradientBg,Icon,Chip} from '../ui';
import {TourTarget,useTourScroll} from '../tour';
import {SUGGESTIONS} from '../assistant';

const key=user=>`rootesp.assistant.v1.${USE_MOCK?'demo':'real'}.${user.UserID}`;
const MAX_KEEP=60;

function Avatar({size=34}){
 return <View style={{width:size,height:size,borderRadius:size/2,backgroundColor:colors.section.assistant,alignItems:'center',justifyContent:'center'}}><Icon name="robot-happy-outline" size={size*0.58} color={onColor(colors.section.assistant)}/></View>;
}
function Typing(){
 const dots=useRef([0,1,2].map(()=>new Animated.Value(0.3))).current;
 useEffect(()=>{const loops=dots.map((d,i)=>Animated.loop(Animated.sequence([Animated.delay(i*160),Animated.timing(d,{toValue:1,duration:320,useNativeDriver:true}),Animated.timing(d,{toValue:0.3,duration:320,useNativeDriver:true}),Animated.delay((2-i)*160)])));loops.forEach(l=>l.start());return()=>loops.forEach(l=>l.stop());},[]);
 return <View style={{flexDirection:'row',gap:5,paddingVertical:6}}>{dots.map((d,i)=><Animated.View key={i} style={{width:8,height:8,borderRadius:4,backgroundColor:colors.section.assistant,opacity:d}}/>)}</View>;
}
function Bubble({m}){
 const mine=m.role==='user';
 return <View style={{flexDirection:'row',justifyContent:mine?'flex-end':'flex-start',alignItems:'flex-end',gap:8}}>
  {!mine&&<Avatar size={28}/>}
  <View style={{maxWidth:'82%',backgroundColor:mine?colors.fern:colors.paper,borderWidth:mine?0:1,borderColor:m.error?colors.danger:colors.line,borderRadius:16,borderBottomRightRadius:mine?4:16,borderBottomLeftRadius:mine?16:4,paddingHorizontal:14,paddingVertical:10}}>
   <Text selectable style={{color:mine?colors.onFern:(m.error?colors.danger:colors.soil),lineHeight:21}}>{m.content}</Text>
  </View>
 </View>;
}

export default function AssistantScreen(){
 const {user}=useAuth();
 const [messages,setMessages]=useState([]);const [text,setText]=useState('');const [busy,setBusy]=useState(false);
 const scroll=useRef(null);const onScroll=useTourScroll(scroll);
 useEffect(()=>{kvGet(key(user),[]).then(x=>setMessages(Array.isArray(x)?x:[]));},[user.UserID]);
 useEffect(()=>{const t=setTimeout(()=>scroll.current?.scrollToEnd?.({animated:true}),60);return()=>clearTimeout(t);},[messages.length,busy]);
 const persist=list=>{const kept=list.slice(-MAX_KEEP);kvSet(key(user),kept.filter(m=>!m.error));return kept;};
 const send=async(raw)=>{
  const content=(raw??text).trim();if(!content||busy)return;
  const next=[...messages,{role:'user',content,at:Date.now()}];setMessages(persist(next));setText('');setBusy(true);
  try{
   const r=await api.assistantChat(user.UserID,next.filter(m=>!m.error).slice(-12).map(({role,content})=>({role,content})));
   setMessages(old=>persist([...old,{role:'assistant',content:r.reply,at:Date.now()}]));
  }catch(e){setMessages(old=>[...old,{role:'assistant',content:`Sorry, I could not answer right now: ${e.message}`,error:true,at:Date.now()}]);}
  finally{setBusy(false);}
 };
 const clear=()=>{setMessages([]);kvSet(key(user),[]);};
 const accent=colors.section.assistant;
 return <KeyboardAvoidingView style={{flex:1,backgroundColor:colors.bg}} behavior={Platform.OS==='ios'?'padding':undefined} keyboardVerticalOffset={90}>
  <GradientBg/>
  <View style={{flex:1,width:'100%',maxWidth:MAX_WIDTH,alignSelf:'center'}}>
   <View style={{flexDirection:'row',alignItems:'center',gap:12,padding:16,paddingBottom:10,borderBottomWidth:1,borderColor:colors.line}}>
    <Avatar size={44}/>
    <View style={{flex:1}}>
     <Text style={{fontSize:22,fontWeight:'700',color:colors.soil}}>Root.esp Assistant</Text>
     <View style={{flexDirection:'row',alignItems:'center',gap:6}}><View style={{width:8,height:8,borderRadius:4,backgroundColor:USE_MOCK?colors.warning:colors.success}}/><Text style={{color:colors.muted,fontSize:12}}>{USE_MOCK?'Demo mode · offline answers until the AI API is connected':'AI plant-care assistant · answers can be wrong, check important advice'}</Text></View>
    </View>
    {messages.length>0&&<Pressable accessibilityRole="button" accessibilityLabel="Clear conversation" onPress={clear} hitSlop={8} style={{padding:8,borderRadius:8,borderWidth:1,borderColor:colors.line}}><Icon name="broom" size={18} color={colors.muted}/></Pressable>}
   </View>
   <ScrollView ref={scroll} onScroll={onScroll} scrollEventThrottle={32} style={{flex:1}} contentContainerStyle={{padding:16,gap:12,flexGrow:1}} keyboardShouldPersistTaps="handled">
    {messages.length===0&&<View style={{alignItems:'center',gap:12,paddingVertical:24}}>
     <View style={{width:72,height:72,borderRadius:36,backgroundColor:accent+'22',alignItems:'center',justifyContent:'center'}}><Icon name="chat-processing-outline" size={36} color={accent}/></View>
     <Text style={{fontSize:20,fontWeight:'700',color:colors.soil,textAlign:'center'}}>How can I help your plants today?</Text>
     <Text style={{color:colors.muted,textAlign:'center',maxWidth:420}}>Ask about watering, light, pests, repotting, plant choices for your home, or any of your own plants by name.</Text>
     <TourTarget id="assistant.suggestions"><View style={{flexDirection:'row',flexWrap:'wrap',gap:8,justifyContent:'center',marginTop:6}}>{SUGGESTIONS.map(q=><Chip key={q} icon="lightbulb-on-outline" text={q} onPress={()=>send(q)}/>)}</View></TourTarget>
    </View>}
    {messages.map((m,i)=><Bubble key={i} m={m}/>)}
    {busy&&<View style={{flexDirection:'row',alignItems:'flex-end',gap:8}}><Avatar size={28}/><View style={{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:16,borderBottomLeftRadius:4,paddingHorizontal:14,paddingVertical:6}}><Typing/></View></View>}
   </ScrollView>
   <TourTarget id="assistant.input"><View style={{flexDirection:'row',alignItems:'flex-end',gap:10,padding:12,borderTopWidth:1,borderColor:colors.line,backgroundColor:colors.paper}}>
    <TextInput value={text} onChangeText={setText} placeholder="Message the assistant…" placeholderTextColor={colors.muted} multiline maxLength={1500} accessibilityLabel="Message"
     onKeyPress={e=>{if(Platform.OS==='web'&&e.nativeEvent.key==='Enter'&&!e.nativeEvent.shiftKey){e.preventDefault?.();send();}}}
     style={{flex:1,minHeight:44,maxHeight:140,borderWidth:1,borderColor:colors.line,borderRadius:22,paddingHorizontal:16,paddingTop:11,paddingBottom:11,fontSize:16,color:colors.soil,backgroundColor:colors.field}}/>
    <Pressable accessibilityRole="button" accessibilityLabel="Send message" disabled={!text.trim()||busy} onPress={()=>send()} style={({pressed})=>({width:44,height:44,borderRadius:22,backgroundColor:text.trim()&&!busy?accent:colors.line,alignItems:'center',justifyContent:'center',opacity:pressed?0.8:1})}>
     <Icon name="send" size={20} color={text.trim()&&!busy?onColor(accent):colors.muted}/>
    </Pressable>
   </View></TourTarget>
  </View>
 </KeyboardAvoidingView>;
}
