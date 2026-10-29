import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAuth } from '../auth';
import { colors } from '../theme';
import { Card, Btn } from '../ui';

export default function MenuScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const items = [
    { label: 'Add plant', go: () => navigation.navigate('AddPlant') },
    { label: 'My devices', go: () => navigation.navigate('Devices') },
    { label: 'Alerts', go: () => navigation.navigate('Alerts') },
    { label: 'Plant assistant', go: () => navigation.navigate('Assistant') },
  ];

  return (
    <View style={s.screen}>
      <Card>
        <Text style={s.name}>{user.Username}</Text>
        <Text style={{ color: colors.muted }}>{user.Email}{user.IsAdmin ? ' · Admin' : ''}</Text>
      </Card>
      {items.map((i) => (
        <Pressable key={i.label} onPress={i.go}>
          <Card><Text style={s.item}>{i.label}</Text></Card>
        </Pressable>
      ))}
      <View style={{ marginTop: 'auto' }}>
        <Btn title="Sign out" tone="soil" onPress={signOut} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12, backgroundColor: colors.mist },
  name: { fontSize: 20, fontWeight: '700', color: colors.soil },
  item: { fontSize: 16, color: colors.soil },
});
