import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAuth } from '../../App';
import { colors, card } from '../theme';

export default function MenuScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const items = [
    { label: 'My plants', go: () => navigation.navigate('Home') },
    { label: 'Plant assistant', go: () => navigation.navigate('Assistant') },
  ];

  return (
    <View style={s.screen}>
      <View style={card}>
        <Text style={s.name}>{user.name}</Text>
        <Text style={{ color: colors.muted }}>{user.email}</Text>
      </View>
      {items.map((i) => (
        <Pressable key={i.label} style={card} onPress={i.go}>
          <Text style={s.item}>{i.label}</Text>
        </Pressable>
      ))}
      <Pressable style={s.out} onPress={signOut}>
        <Text style={{ color: '#fff', fontWeight: '600' }}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12, backgroundColor: colors.mist },
  name: { fontSize: 20, fontWeight: '700', color: colors.soil },
  item: { fontSize: 16, color: colors.soil },
  out: { backgroundColor: colors.soil, padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 'auto' },
});
