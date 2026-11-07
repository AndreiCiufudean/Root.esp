import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, Image, StyleSheet, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useAuth } from '../auth';
import { api, USE_MOCK } from '../api';
import { colors, createStyles } from '../theme';
import { Btn, Msg, Wordmark, GradientBg, inputStyle, Icon, SafeTop, SafeBottom } from '../ui';

// Used for the first sign-in and also (inside the app) to add another account.
export default function LoginScreen() {
  const { signIn, user: current } = useAuth();
  const adding = !!current;
  const [mode, setMode] = useState('signin');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deviceCode,setDeviceCode]=useState('');
  const [deviceKey,setDeviceKey]=useState('');
  const [pairing,setPairing]=useState(null);
  const [hasKids,setHasKids]=useState(null); // asked at sign-up: offers a kids account afterwards
  useEffect(()=>{
    if(!pairing)return undefined;
    const ms=Math.max(0,pairing.expiresAt-Date.now());
    const timer=setTimeout(()=>{setPairing(null);setError('Device verification expired. Enter your setup key and verify again.');},ms);
    return()=>clearTimeout(timer);
  },[pairing]);
  const verifyDevice=async()=>{
    setBusy(true);setError('');setPairing(null);
    try {const verified=await api.pairDevice(deviceCode.trim(),deviceKey.trim());setPairing({...verified,expiresAt:Date.now()+1000*(verified.expiresInSeconds||300)});setDeviceKey('');}
    catch(e){setError(e.message);}finally{setBusy(false);}
  };

  const submit = async () => {
    setError('');
    if (!email.trim() || !password) return setError('Enter your email and password.');
    if (busy) return;
    if (mode === 'signup') {
      if (!pairing?.pairingToken) return setError('Verify your Root.esp device before registration.');
      if (!username.trim()) return setError('Choose a username.');
      if (password.length < 8) return setError('Use a password of at least 8 characters.');
      if (password !== confirm) return setError('The two passwords do not match.');
      if (hasKids === null) return setError('Tell us whether you have kids, so we can set up the right experience.');
    }
    setBusy(true);
    try {
      const user = mode === 'signin' ? await api.login(email.trim(), password) : await api.register(username, email.trim(), password, pairing?.pairingToken);
      // The app switches to this account. New accounts already have their two starter notifications
      // (created by register(), once, in demo mode and on the real backend).
      signIn(user, { justRegistered: mode === 'signup', hasKids: mode === 'signup' && hasKids === true });
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };

  const switchMode = () => { setMode(mode === 'signin' ? 'signup' : 'signin'); setPairing(null);setDeviceKey('');setError('');setHasKids(null); };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <GradientBg />
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <SafeTop />
        <View style={s.box}>
          <View style={{ alignItems: 'center', marginBottom: 4, marginTop: 10 }}><Wordmark size={44} /></View>
          <Text style={{ color: colors.muted, fontSize: 11, letterSpacing: 2, textAlign: 'center' }}>TAKE YOUR LIFE SLOW.</Text>
          <Text style={s.sub}>
            {adding ? 'Sign in with another account.' : mode === 'signin' ? 'Sign in to manage your plants.' : 'Create an account to monitor your plants.'}
          </Text>

          {mode === 'signup' && <TextInput style={s.input} placeholder="Username" placeholderTextColor={colors.muted} autoCapitalize="none" value={username} onChangeText={setUsername} />}
          <TextInput style={s.input} placeholder="Email" placeholderTextColor={colors.muted} autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <View>
            <TextInput style={s.input} placeholder="Password" placeholderTextColor={colors.muted} secureTextEntry={!show} autoCapitalize="none" value={password} onChangeText={setPassword} onSubmitEditing={mode === 'signin' ? submit : undefined} />
            <Pressable style={s.eye} onPress={() => setShow(!show)} hitSlop={8} accessibilityRole="button" accessibilityLabel={show ? 'Hide password' : 'Show password'}><Icon name={show ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.muted} /></Pressable>
          </View>
          {mode === 'signup' && <TextInput style={s.input} placeholder="Repeat password" placeholderTextColor={colors.muted} secureTextEntry={!show} autoCapitalize="none" value={confirm} onChangeText={setConfirm} onSubmitEditing={submit} />}
          {mode==='signup'&&<View style={{backgroundColor:colors.paper,borderColor:colors.line,borderWidth:1,borderRadius:12,padding:16,marginBottom:12,gap:10}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:8}}><Icon name="human-male-child" size={20} color={colors.section.plants}/><Text style={{color:colors.soil,fontWeight:'700'}}>Do you have kids?</Text></View>
            <Text style={{color:colors.muted}}>If you do, we will help you create a kids account right after sign-up, with a colourful, playful interface made just for them.</Text>
            <View style={{flexDirection:'row',gap:10}}>{[[true,'Yes','check'],[false,'No','close']].map(([v,label,icon])=>{const on=hasKids===v;return <Pressable key={label} accessibilityRole="radio" accessibilityState={{checked:on}} onPress={()=>{setHasKids(v);setError('');}} style={{flex:1,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:6,padding:12,borderRadius:10,borderWidth:1.5,borderColor:on?colors.fern:colors.line,backgroundColor:on?colors.mist:'transparent'}}><Icon name={icon} size={18} color={on?colors.fern:colors.muted}/><Text style={{color:colors.soil,fontWeight:on?'700':'400'}}>{label}</Text></Pressable>;})}</View>
            {hasKids&&<Text style={{color:colors.info,fontSize:13}}>Great. After creating your account you can add a kids account that uses this same email with its own, different password.</Text>}
          </View>}
          {mode==='signup'&&<View style={{backgroundColor:colors.paper,borderColor:colors.line,borderWidth:1,borderRadius:12,padding:16,marginBottom:12,gap:10}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:8}}><Icon name="chip" size={20} color={colors.info}/><Text style={{color:colors.soil,fontWeight:'700'}}>Verify your Root.esp hardware</Text></View>
            <Text style={{color:colors.muted}}>Connect and power your provisioned device. Enter the device code and private setup key supplied with it. Server verification is required before registration.</Text>
            <TextInput style={s.input} placeholder={USE_MOCK?'ROOT-DEMO-01':'Device code'} placeholderTextColor={colors.muted} autoCapitalize="characters" value={deviceCode} onChangeText={v=>{setDeviceCode(v);setPairing(null);}} />
            <TextInput style={s.input} placeholder={USE_MOCK?'DEMO-SETUP-KEY':'64-character device setup key'} placeholderTextColor={colors.muted} autoCapitalize="none" secureTextEntry value={deviceKey} onChangeText={v=>{setDeviceKey(v);setPairing(null);}} />
            <Btn title={pairing?'Device verified':'Verify device'} onPress={verifyDevice} busy={busy} disabled={!!pairing}/>
            {pairing&&<Text accessibilityRole="alert" style={{color:colors.success}}>Device verified{pairing.simulated?' (demo only)':''}. You can now create an account.</Text>}
            {USE_MOCK&&<Text style={{color:colors.muted,fontSize:12}}>Demo-only simulated pairing: ROOT-DEMO-01 / DEMO-SETUP-KEY. No physical hardware is verified.</Text>}
          </View>}
          <Msg text={error} error />

          <View style={{ marginTop: 10 }}>
            <Btn title={mode === 'signin' ? 'Sign in' : 'Create account'} onPress={submit} disabled={mode==='signup'&&!pairing} busy={busy} />
          </View>

          <Pressable onPress={switchMode}>
            <Text style={s.link}>{mode === 'signin' ? 'New here? Create an account' : 'Have an account? Sign in'}</Text>
          </Pressable>

          {USE_MOCK && mode === 'signin' && (<>
            <Pressable style={s.demo} onPress={() => { setEmail('user@sera.app'); setPassword('demopassword'); setError(''); }}>
              <Text style={s.hint}>Demo mode · tap to fill in the demo account{'\n'}user@sera.app · demopassword</Text>
            </Pressable>
            <Pressable style={[s.demo,{marginTop:10}]} onPress={() => { setEmail('user@sera.app'); setPassword('kidspassword'); setError(''); }}>
              <Text style={s.hint}>Demo kids account (Maya) · same email, different password{'\n'}user@sera.app · kidspassword</Text>
            </Pressable>
          </>)}
        </View>
      <SafeBottom /></ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = createStyles(() => ({
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  box: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  logo: { width: 120, height: 90, alignSelf: 'center' },
  title: { fontSize: 36, fontWeight: '800', color: colors.fern, textAlign: 'center' },
  sub: { color: colors.muted, marginBottom: 22, fontSize: 16, textAlign: 'center', marginTop: 4 },
  input: { ...inputStyle, backgroundColor: colors.paper, marginBottom: 12, padding: 14 },
  eye: { position: 'absolute', right: 14, top: 14 },
  link: { color: colors.water, textAlign: 'center', marginTop: 18, fontSize: 15 },
  demo: { marginTop: 24, padding: 10, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.line },
  hint: { color: colors.muted, textAlign: 'center', fontSize: 12, lineHeight: 18 },
}));
