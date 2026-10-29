import React from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { plants, dailyTip, communityPosts } from '../data';
import { useAuth } from '../../App';
import { colors, card } from '../theme';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const thirsty = plants.filter((p) => p.lastWatered >= p.waterDays).length;
  const avgHealth = Math.round(plants.reduce((a, p) => a + p.health, 0) / plants.length);

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text style={s.hello}>Hi, {user.name}</Text>

      <View style={s.statsRow}>
        <Stat label="Plants" value={plants.length} />
        <Stat label="Need water" value={thirsty} color={thirsty ? colors.water : colors.fern} />
        <Stat label="Avg health" value={`${avgHealth}%`} />
      </View>

      <View style={[card, { backgroundColor: colors.fern }]}>
        <Text style={s.tipLabel}>Today's tip</Text>
        <Text style={s.tip}>{dailyTip}</Text>
      </View>

      <Text style={s.h2}>Your plants</Text>
      {plants.map((p) => (
        <Pressable key={p.id} style={card} onPress={() => navigation.navigate('PlantDetail', { plant: p })}>
          <Text style={s.plantName}>{p.name}</Text>
          <Text style={s.muted}>{p.species}</Text>
          <Text style={s.muted}>Last watered {p.lastWatered} days ago</Text>
        </Pressable>
      ))}

      <Text style={s.h2}>Community</Text>
      {communityPosts.map((c) => (
        <View key={c.id} style={card}>
          <Text style={s.author}>{c.author}</Text>
          <Text>{c.text}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const Stat = ({ label, value, color = colors.soil }) => (
  <View style={[card, { flex: 1, alignItems: 'center', padding: 12 }]}>
    <Text style={{ fontSize: 24, fontWeight: '700', color }}>{value}</Text>
    <Text style={{ color: colors.muted, fontSize: 13 }}>{label}</Text>
  </View>
);

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
  hello: { fontSize: 26, fontWeight: '700', color: colors.soil },
  statsRow: { flexDirection: 'row', gap: 10 },
  tipLabel: { color: '#cfe3d2', marginBottom: 6, fontSize: 13 },
  tip: { color: '#fff', fontSize: 16, lineHeight: 22 },
  h2: { fontSize: 18, fontWeight: '600', color: colors.soil },
  plantName: { fontSize: 18, fontWeight: '600', color: colors.soil },
  muted: { color: colors.muted, marginTop: 2 },
  author: { fontWeight: '600', marginBottom: 4, color: colors.fern },
});
