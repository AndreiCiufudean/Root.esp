import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../../App';
import { colors } from '../theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (!email.includes('@') || password.length < 6) {
      setError('Enter a valid email and a password of at least 6 characters.');
      return;
    }
    // Mock auth: replace with a call to your backend.
    // Emails starting with "admin" get the admin role.
    const role = email.toLowerCase().startsWith('admin') ? 'admin' : 'user';
    signIn({ name: name || email.split('@')[0], email, role });
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={s.title}>Plant App</Text>
      <Text style={s.sub}>{mode === 'signin' ? 'Sign in to see your plants.' : 'Create an account to start tracking plants.'}</Text>

      {mode === 'signup' && (
        <TextInput style={s.input} placeholder="Name" value={name} onChangeText={setName} />
      )}
      <TextInput style={s.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={s.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      {!!error && <Text style={s.error}>{error}</Text>}

      <Pressable style={s.button} onPress={submit}>
        <Text style={s.buttonText}>{mode === 'signin' ? 'Sign in' : 'Create account'}</Text>
      </Pressable>

      <Pressable onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}>
        <Text style={s.link}>{mode === 'signin' ? 'New here? Create an account' : 'Have an account? Sign in'}</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.mist },
  title: { fontSize: 34, fontWeight: '700', color: colors.fern, marginBottom: 6 },
  sub: { color: colors.muted, marginBottom: 24, fontSize: 16 },
  input: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 16 },
  error: { color: colors.bloom, marginBottom: 12 },
  button: { backgroundColor: colors.fern, padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { color: colors.water, textAlign: 'center', marginTop: 18, fontSize: 15 },
});
