import React,{useEffect,useState} from 'react';
import {Text,View,Pressable} from 'react-native';
import {useAuth} from '../auth';
import {usePrefs} from '../prefs';
import {api} from '../api';
import {Screen,Card,Btn,IconBadge,Icon} from '../ui';
import {TourTarget} from '../tour';
import {colors,THEMES} from '../theme';
import {replayAllTours} from '../tourControl';
const Row=({icon,color,title,body,children})=><Card style={{gap:12}}><View style={{flexDirection:'row',alignItems:'center',gap:12}}><IconBadge name={icon} color={color}/><View style={{flex:1}}><Text style={{fontWeight:'700',color:colors.soil,fontSize:16}}>{title}</Text>{!!body&&<Text style={{color:colors.muted}}>{body}</Text>}</View></View>{children}</Card>;
function KidRow({kid,busy,onPress}){
 const name=kid.DisplayName||kid.Username;
 return <Pressable accessibilityRole="button" accessibilityLabel={`Switch to ${name}'s kids account`} disabled={busy} onPress={onPress} style={({pressed})=>({flexDirection:'row',alignItems:'center',gap:12,padding:12,borderRadius:14,backgroundColor:pressed?colors.section.plants+'26':colors.mist,borderWidth:1,borderColor:pressed?colors.section.plants:'transparent',opacity:busy?0.6:1})}>
  <View style={{width:40,height:40,borderRadius:20,backgroundColor:colors.section.plants,alignItems:'center',justifyContent:'center'}}><Text style={{color:colors.isDark?'#10281B':'#FFFFFF',fontWeight:'800',fontSize:17}}>{name[0].toUpperCase()}</Text></View>
  <View style={{flex:1}}><Text style={{color:colors.soil,fontWeight:'700',fontSize:15}}>{name}</Text><Text style={{color:colors.muted,fontSize:12}}>{busy?'Opening…':'Kids account · tap to switch'}</Text></View>
  <Icon name="account-switch-outline" size={22} color={colors.section.plants}/>
 </Pressable>;
}
export default function MenuScreen({navigation}){
 const {user,accounts,switchAccount,signIn,signOut,openSettings,beginAddAccount,openKidsSetup}=useAuth();const prefs=usePrefs();const [tourMessage,setTourMessage]=useState('');const [kids,setKids]=useState([]);const [opening,setOpening]=useState(null),[kidError,setKidError]=useState('');
 useEffect(()=>{api.getKidAccounts(user.UserID).then(setKids).catch(()=>setKids([]));},[user.UserID,accounts.length]);
 const kidSession=id=>accounts.find(a=>a.user.UserID===id);
 // One tap on a child opens their account: reuse a session already on this device, otherwise the
 // signed-in parent opens one (no kids password needed). Returning to the parent still needs the parent password.
 const openKid=async k=>{if(opening)return;setKidError('');const existing=kidSession(k.UserID);if(existing)return switchAccount(existing);setOpening(k.UserID);try{const u=await api.openKidSession(user.UserID,k.UserID);signIn(u);}catch(e){setKidError(e.message);setOpening(null);}};
 return <Screen>
 <View style={{flexDirection:'row',alignItems:'center',gap:12}}><IconBadge name="account-circle-outline" color={colors.section.profile} size={44}/><View><Text style={{fontSize:30,color:colors.soil,fontWeight:'700'}}>Profile</Text><Text style={{color:colors.muted}}>Account, hardware and preferences</Text></View></View>
 <Card style={{flexDirection:'row',alignItems:'center',gap:14}}><View style={{width:52,height:52,borderRadius:26,backgroundColor:colors.fern,alignItems:'center',justifyContent:'center'}}><Text style={{color:colors.onFern,fontSize:22,fontWeight:'700'}}>{(user.Username||'?')[0].toUpperCase()}</Text></View><View style={{flex:1}}><Text style={{fontSize:18,fontWeight:'700',color:colors.soil}}>{user.Username}</Text><Text style={{color:colors.muted}}>{user.Email}</Text></View></Card>
 <TourTarget id="profile.devices"><Row icon="chip" color={colors.info} title="Device management" body="Register, link or replace Root.esp hardware."><Btn icon="chip" title="View, register or replace devices" onPress={()=>navigation.navigate('Devices')}/></Row></TourTarget>
 <Row icon="bell-outline" color={colors.warning} title="Notifications" body="Watering, device and plant alerts."><Btn icon="bell-outline" title="Review alerts" outline onPress={()=>navigation.navigate('Alerts')}/></Row>
 <TourTarget id="profile.kids"><Row icon="account-child-outline" color={colors.section.plants} title="Kids accounts" body="Same email as yours, each with its own password. Kids get a colourful interface without Design or the AI chat.">
  {kids.length>0&&<Text style={{color:colors.muted,fontSize:12}}>Tap a child to open their account. Coming back to yours needs your password.</Text>}
  {kids.map(k=><KidRow key={k.UserID} kid={k} busy={opening===k.UserID} onPress={()=>openKid(k)}/>)}
  {!!kidError&&<Text accessibilityRole="alert" style={{color:colors.danger}}>{kidError}</Text>}
  {kids.length===0&&<Text style={{color:colors.muted}}>No kids accounts yet.</Text>}
  <Btn icon="plus" title="Create a kids account" tone="plants" onPress={openKidsSetup}/>
 </Row></TourTarget>
 <TourTarget id="profile.appearance"><Row icon="palette-swatch-outline" color={colors.section.design} title="Appearance" body={`${THEMES[colors.themeId]?.label||'Forest'} theme · ${prefs.appearance==='system'?'follows system':prefs.appearance} mode`}>
  <View style={{flexDirection:'row',gap:6}}>{[colors.fern,colors.accent,colors.success,colors.warning,colors.danger,colors.info].map((c,i)=><View key={i} style={{width:22,height:22,borderRadius:11,backgroundColor:c,borderWidth:1,borderColor:colors.line}}/>)}</View>
  <Btn icon="palette-outline" title="Themes and appearance" outline onPress={()=>openSettings('appearance')}/>
 </Row></TourTarget>
 <TourTarget id="profile.tours"><Row icon="map-marker-path" color={colors.accent} title="Guided walkthroughs" body="Restart all page tutorials whenever you need them."><Btn icon="replay" title="Replay guided tours" outline onPress={()=>replayAllTours(user).then(()=>setTourMessage('Tours reset. The walkthrough starts on this page.')).catch(e=>setTourMessage(e.message))}/>{!!tourMessage&&<Text accessibilityRole="alert" style={{color:colors.muted}}>{tourMessage}</Text>}</Row></TourTarget>
 {user.IsAdmin&&<Btn icon="shield-account-outline" title="Administration" outline onPress={()=>navigation.navigate('Admin')}/>}
 {accounts.length>1&&<Card><Text style={{color:colors.soil,fontWeight:'700',marginBottom:10}}>Switch account</Text>{accounts.filter(x=>x.user.UserID!==user.UserID).map(x=><Pressable key={x.user.UserID} accessibilityRole="button" onPress={()=>switchAccount(x)} style={{padding:10,flexDirection:'row',alignItems:'center',gap:8}}><Icon name={x.user.IsKid?'account-child-outline':'account-outline'} size={20} color={colors.fern}/><Text style={{color:colors.fern}}>{x.user.IsKid?`${x.user.DisplayName} (kids)`:x.user.Username}</Text></Pressable>)}</Card>}
 <Btn icon="account-plus-outline" title="Add another account" outline onPress={beginAddAccount}/>
 <Btn icon="logout" title="Sign out" outline tone="muted" onPress={signOut}/>
 </Screen>;
}
