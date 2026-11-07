// Lets a parent create a kids account: same email as the adult account, the child's name and a
// different password. The password is what tells Root.esp which account to open at sign-in.
import React,{useEffect,useState} from 'react';
import {View,Text,TextInput} from 'react-native';
import {useAuth} from './auth';
import {api} from './api';
import {colors,inputStyle} from './theme';
import {Sheet,Btn,Icon} from './ui';

export default function KidsAccountSheet({visible,reason,onClose}){
 const {user,signIn}=useAuth();
 const [name,setName]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState('');
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[created,setCreated]=useState(null);
 useEffect(()=>{if(visible){setName('');setPassword('');setConfirm('');setError('');setCreated(null);}},[visible]);
 if(!user)return null;
 const submit=async()=>{
  setError('');
  if(!name.trim())return setError("Enter your child's name.");
  if(password.length<6)return setError('Use a kids password of at least 6 characters.');
  if(password!==confirm)return setError('The two passwords do not match.');
  setBusy(true);
  try{const kid=await api.createKidAccount(user.UserID,{name:name.trim(),password});setCreated({kid,password});}
  catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const openKid=async()=>{setBusy(true);try{const u=await api.login(user.Email,created.password);onClose();signIn(u);}catch(e){setError(e.message);}finally{setBusy(false);}};
 return <Sheet visible={visible} title={created?'Kids account ready':'Create a kids account'} onClose={onClose}>
  {created?<View style={{gap:14}}>
   <View style={{alignItems:'center',gap:8,paddingVertical:8}}><View style={{width:64,height:64,borderRadius:32,backgroundColor:colors.successBg,alignItems:'center',justifyContent:'center'}}><Icon name="check-bold" size={34} color={colors.success}/></View><Text style={{fontSize:18,fontWeight:'700',color:colors.soil}}>{created.kid.DisplayName}'s account is ready</Text></View>
   <View style={{backgroundColor:colors.mist,borderRadius:12,padding:14,gap:6}}>
    <Text style={{color:colors.soil,fontWeight:'700'}}>How {created.kid.DisplayName} signs in</Text>
    <Text style={{color:colors.soil}}>Email: {user.Email}</Text>
    <Text style={{color:colors.soil}}>Password: the kids password you just chose</Text>
   </View>
   {!!error&&<Text style={{color:colors.danger}}>{error}</Text>}
   <Btn icon="account-switch" title={`Open ${created.kid.DisplayName}'s account now`} busy={busy} onPress={openKid}/>
   <Btn outline title="Done" onPress={onClose}/>
  </View>:<View style={{gap:12}}>
   {reason==='welcome'&&<Text style={{color:colors.soil,lineHeight:21}}>You told us you have kids. Create a kids account so they get the full Root.esp kids experience: a colourful world with talking plant buddies and mini games, without design tools or the AI chat.</Text>}
   {reason!=='welcome'&&<Text style={{color:colors.muted,lineHeight:21}}>Kids accounts get a colourful interface with talking plant buddies and mini games. They can see the household plants but cannot change settings or water them.</Text>}
   <Text style={{color:colors.muted,fontSize:13}}>Email (shared with your account)</Text>
   <View style={[inputStyle,{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:colors.mist}]}><Icon name="email-outline" size={18} color={colors.muted}/><Text style={{color:colors.soil}}>{user.Email}</Text></View>
   <TextInput style={inputStyle} placeholder="Child's name" placeholderTextColor={colors.muted} value={name} onChangeText={setName} maxLength={30}/>
   <TextInput style={inputStyle} placeholder="Kids password" placeholderTextColor={colors.muted} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none"/>
   <TextInput style={inputStyle} placeholder="Repeat kids password" placeholderTextColor={colors.muted} value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" onSubmitEditing={submit}/>
   <View accessibilityRole="alert" style={{flexDirection:'row',gap:10,backgroundColor:colors.warningBg,borderColor:colors.warning,borderWidth:1,borderRadius:12,padding:12}}>
    <Icon name="alert" size={20} color={colors.warning}/>
    <Text style={{color:colors.soil,flex:1,lineHeight:20}}><Text style={{fontWeight:'700'}}>Do not reuse your adult password. </Text>The kids account uses the same email as your account, so the password is the only thing that tells Root.esp which account to open. If it matched yours, your child could end up in your adult account.</Text>
   </View>
   {!!error&&<Text accessibilityRole="alert" style={{color:colors.danger}}>{error}</Text>}
   <Btn icon="account-child" title="Create kids account" busy={busy} onPress={submit}/>
   <Btn outline title={reason==='welcome'?'Maybe later':'Cancel'} onPress={onClose}/>
   {reason==='welcome'&&<Text style={{color:colors.muted,fontSize:12,textAlign:'center'}}>You can also do this later from Profile, Kids accounts.</Text>}
  </View>}
 </Sheet>;
}
