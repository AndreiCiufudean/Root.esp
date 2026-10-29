import React from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, card } from './theme';

const toneColor = { good: colors.fern, warn: colors.amber, water: colors.water, bad: colors.bloom, muted: colors.muted };

export const Card = ({ children, style }) => <View style={[card, style]}>{children}</View>;

export const Pill = ({ text, tone = 'muted' }) => (
  <View style={[u.pill, { borderColor: toneColor[tone] }]}>
    <Text style={{ color: toneColor[tone], fontSize: 12, fontWeight: '600' }}>{text}</Text>
  </View>
);

export const Btn = ({ title, onPress, tone = 'fern', disabled, busy }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled || busy}
    style={[u.btn, { backgroundColor: colors[tone] }, (disabled || busy) && { opacity: 0.5 }]}
  >
    <Text style={u.btnText}>{busy ? 'Please wait...' : title}</Text>
  </Pressable>
);

export const Loading = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.mist }}>
    <ActivityIndicator color={colors.fern} />
  </View>
);

export const Empty = ({ text }) => <Text style={{ color: colors.muted, textAlign: 'center', padding: 24 }}>{text}</Text>;

export const Msg = ({ text, error }) =>
  text ? <Text style={{ color: error ? colors.bloom : colors.fern, marginTop: 8 }}>{text}</Text> : null;

export const Reading = ({ label, value, status }) => (
  <View style={u.reading}>
    <Text style={{ color: colors.muted, fontSize: 13 }}>{label}</Text>
    <Text style={{ fontSize: 20, fontWeight: '700', color: colors.soil, marginVertical: 2 }}>{value}</Text>
    {status && <Pill text={status.label} tone={status.tone} />}
  </View>
);

const u = StyleSheet.create({
  pill: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  btn: { padding: 13, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  reading: { width: '48%', backgroundColor: colors.mist, borderRadius: 10, padding: 10 },
});
