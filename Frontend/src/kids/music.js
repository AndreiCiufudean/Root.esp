// Calm background music for the kids interface: a soft, looping music-box lullaby
// (assets/sound/kids-calm-loop.mp3, made for Root.esp). Plays through expo-av on phones and web.
// Kids (or grown-ups) can switch it off with the music button; the choice is remembered per kids account.
import React,{createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {AppState,Pressable,View} from 'react-native';
import {Audio} from 'expo-av';
import Icon from '../Icon';
import {KID} from '../theme';
import {kvGet,kvSet} from '../store';
import {USE_MOCK} from '../api';

const TRACK=require('../../assets/sound/kids-calm-loop.mp3');
const VOLUME=0.32;
let sound=null,loading=null,wanted=false;

async function load(){
 if(sound)return sound;
 if(!loading)loading=(async()=>{
  try{await Audio.setAudioModeAsync({playsInSilentModeIOS:false,staysActiveInBackground:false,shouldDuckAndroid:true});}catch(e){/* optional */}
  const {sound:s}=await Audio.Sound.createAsync(TRACK,{isLooping:true,volume:0,shouldPlay:false});
  sound=s;return s;
 })();
 return loading;
}
// Gentle fade so the music never starts or stops abruptly.
async function fade(s,from,to,ms=900){const steps=12;for(let i=1;i<=steps;i++){try{await s.setVolumeAsync(from+(to-from)*i/steps);}catch(e){return;}await new Promise(r=>setTimeout(r,ms/steps));}}
export async function playMusic(){wanted=true;try{const s=await load();if(!wanted)return;const st=await s.getStatusAsync();if(st.isLoaded&&!st.isPlaying){await s.setVolumeAsync(0);await s.playAsync();fade(s,0,VOLUME);}}catch(e){/* browsers block sound until the first tap; we retry then */}}
export async function pauseMusic(){wanted=false;try{if(sound){await fade(sound,VOLUME,0,400);await sound.pauseAsync();}}catch(e){/* ignore */}}
export async function unloadMusic(){wanted=false;const s=sound||(loading&&await loading.catch(()=>null));sound=null;loading=null;try{await s?.unloadAsync();}catch(e){/* ignore */}}

const MusicCtx=createContext({on:false,toggle:()=>{},nudge:()=>{}});
export const useMusic=()=>useContext(MusicCtx);
const key=u=>`rootesp.kids.music.v1.${USE_MOCK?'demo':'real'}.${u.UserID}`;

// Wrap the kids interface: starts the music (if switched on), pauses in the background, stops on sign-out.
export function KidsMusicProvider({user,children}){
 const [on,setOn]=useState(false);const onRef=useRef(false);onRef.current=on;
 useEffect(()=>{let live=true;kvGet(key(user),true).then(v=>{if(!live)return;setOn(v!==false);if(v!==false)playMusic();});
  const sub=AppState.addEventListener('change',st=>{if(st==='active'){if(onRef.current)playMusic();}else pauseMusic();});
  return()=>{live=false;sub.remove();unloadMusic();};},[user.UserID]);
 const toggle=useCallback(()=>{setOn(v=>{const n=!v;kvSet(key(user),n);if(n)playMusic();else pauseMusic();return n;});},[user.UserID]);
 // Web browsers only allow sound after a tap: the first touch anywhere starts it.
 const nudge=useCallback(()=>{if(onRef.current)playMusic();},[]);
 return <MusicCtx.Provider value={{on,toggle,nudge}}><View style={{flex:1}} onTouchStart={nudge} onClick={nudge}>{children}</View></MusicCtx.Provider>;
}

export function MusicButton(){
 const {on,toggle}=useMusic();
 return <Pressable accessibilityRole="switch" accessibilityLabel="Calm music" accessibilityState={{checked:on}} onPress={toggle} hitSlop={6}
  style={({pressed})=>({width:48,height:48,borderRadius:24,backgroundColor:on?KID.grape:'#FFFFFFE6',alignItems:'center',justifyContent:'center',borderWidth:3,borderColor:KID.grape,transform:[{scale:pressed?0.92:1}]})}>
  <Icon name={on?'music':'music-off'} size={24} color={on?'#fff':KID.grape}/>
 </Pressable>;
}
