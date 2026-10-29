import React, { useState } from 'react';
import { Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../auth';
import { api } from '../api';
import { colors } from '../theme';
import { Btn, Msg } from '../ui';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [mode, setMode] = useState('signin');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      const user = mode === 'signin' ? await api.login(email.trim(), password) : await api.register(username, email.trim(), password);
      signIn(user);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={s.title}>SeraSmart</Text>
      <Text style={s.sub}>{mode === 'signin' ? 'Sign in to see your plants.' : 'Create an account to start tracking plants.'}</Text>

      {mode === 'signup' && <TextInput style={s.input} placeholder="Username" autoCapitalize="none" value={username} onChangeText={setUsername} />}
      <TextInput style={s.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={s.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <Msg text={error} error />

      <Btn title={mode === 'signin' ? 'Sign in' : 'Create account'} onPress={submit} busy={busy} />

      <Pressable onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}>
        <Text style={s.link}>{mode === 'signin' ? 'New here? Create an account' : 'Have an account? Sign in'}</Text>
      </Pressable>

      <Text style={s.hint}>Demo: admin@sera.app (admin) or user@sera.app (has plants). Any password of 6+ characters.</Text>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.mist },
  title: { fontSize: 34, fontWeight: '700', color: colors.fern, marginBottom: 6 },
  sub: { color: colors.muted, marginBottom: 24, fontSize: 16 },
  input: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 16 },
  link: { color: colors.water, textAlign: 'center', marginTop: 18, fontSize: 15 },
  hint: { color: colors.muted, textAlign: 'center', marginTop: 28, fontSize: 12 },
});
