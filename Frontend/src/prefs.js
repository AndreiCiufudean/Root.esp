// Device-wide theme/audio, with account-scoped pledges and introductions.
// v1 data is read and migrated without deleting the original storage key.
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppState, useColorScheme } from 'react-native';
import { kvGet, kvSet } from './store';
import { applyTheme, THEMES, LEGACY_THEMES } from './theme';
import { updateSoundSettings, stopAllAudio } from './sound';
import { USE_MOCK } from './api';

export const PREFS_KEY = 'rootesp.prefs.v2';
const OLD_KEY = 'rootesp.prefs.v1';
export const DEFAULT_SOUND = { masterMute:false, ui:true, gameMusic:true, gameMusicVolume:0.35, gameEffects:true, gameEffectsVolume:0.65 };
const DEFAULTS = { theme:'forest', appearance:'system', soundSettings:DEFAULT_SOUND, introDone:false, pledges:{}, introAccounts:{}, skipTours:{}, welcomePending:{}, legacyPledge:null, legacyOwner:null };
const Ctx=createContext(null);
export const usePrefs=()=>useContext(Ctx);
export const accountKey=(user)=> user?.UserID == null ? null : `${USE_MOCK?'m':'r'}u${user.UserID}`;
export function PrefsProvider({children}) {
  const system=useColorScheme();
  const [p,setP]=useState(DEFAULTS);
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>{let alive=true;(async()=>{
    const old=await kvGet(OLD_KEY, null);
    const oldAccounts=await kvGet('rootesp.accounts.v1',null);
    const saved=await kvGet(PREFS_KEY, null);
    if(!alive)return;
    if(saved) setP({...DEFAULTS,...saved,soundSettings:{...DEFAULT_SOUND,...saved.soundSettings}});
    else if(old) {
      const legacyTheme=old.theme==='auto'?'forest':(LEGACY_THEMES[old.theme] || old.theme);
      const migrated={...DEFAULTS, theme:THEMES[legacyTheme]?legacyTheme:'forest', appearance:old.theme==='auto'?'system':(['forest','midnight'].includes(old.theme)?'dark':'light'), soundSettings:{...DEFAULT_SOUND,masterMute:old.sound===false},introDone:!!old.introDone,legacyPledge:old.pledge||null,legacyOwner:oldAccounts?.current??null};
      setP(migrated); await kvSet(PREFS_KEY,migrated);
    }
    setLoaded(true);
  })();return()=>{alive=false;};},[]);
  const resolvedAppearance=p.appearance==='system'?(system==='dark'?'dark':'light'):p.appearance;
  applyTheme(p.theme,resolvedAppearance);
  updateSoundSettings(p.soundSettings);
  useEffect(()=>{ const sub=AppState.addEventListener('change',state=>{if(state!=='active')stopAllAudio();});return()=>sub.remove(); },[]);
  const update=useCallback((patch)=>setP(old=>{const next={...old,...patch};kvSet(PREFS_KEY,next);return next;}),[]);
  const updateSound=useCallback((patch)=>setP(old=>{const next={...old,soundSettings:{...old.soundSettings,...patch}};kvSet(PREFS_KEY,next);return next;}),[]);
  const setPledge=useCallback((user,pledge)=>{const key=accountKey(user);if(!key)return;setP(old=>{const next={...old,pledges:{...old.pledges,[key]:pledge||null},introAccounts:{...old.introAccounts,[key]:true}};kvSet(PREFS_KEY,next);return next;});},[]);
  const setToursSkippedFor=useCallback((user,skipped=true)=>{const k=accountKey(user);if(!k)return;setP(old=>{const next={...old,skipTours:{...(old.skipTours||{}),[k]:!!skipped}};kvSet(PREFS_KEY,next);return next;});},[]);
  const setWelcomePendingFor=useCallback((user,pending=true)=>{const k=accountKey(user);if(!k)return;setP(old=>{const next={...old,welcomePending:{...(old.welcomePending||{}),[k]:!!pending}};kvSet(PREFS_KEY,next);return next;});},[]);
  const migrateLegacy=useCallback((user)=>{const key=accountKey(user);if(!key)return;setP(old=>{if(!old.legacyPledge || (!USE_MOCK || old.legacyOwner!==user.UserID) || Object.prototype.hasOwnProperty.call(old.pledges,key))return old;const next={...old,legacyPledge:null,pledges:{...old.pledges,[key]:old.legacyPledge},introAccounts:{...old.introAccounts,[key]:true}};kvSet(PREFS_KEY,next);return next;});},[]);
  return <Ctx.Provider value={{loaded,themeId:p.theme,theme:p.theme,appearance:p.appearance,resolvedAppearance,setTheme:t=>update({theme:t}),setAppearance:a=>update({appearance:a}),soundSettings:p.soundSettings,setSoundSettings:updateSound,
    // legacy compatibility for components still reading prefs.sound
    sound:!p.soundSettings.masterMute,setSound:v=>updateSound({masterMute:!v}),
    introDone:p.introDone,finishIntro:()=>update({introDone:true}),pledgeFor:u=>p.pledges[accountKey(u)]||null,setPledge,clearPledgeFor:u=>setPledge(u,null),introAccounts:p.introAccounts,toursSkippedFor:u=>!!p.skipTours?.[accountKey(u)],setToursSkippedFor,welcomePendingFor:u=>!!p.welcomePending?.[accountKey(u)],setWelcomePendingFor,migrateLegacy
  }}>{children}</Ctx.Provider>;
}
