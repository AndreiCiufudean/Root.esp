import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, card } from '../theme';

export default function PlantDetailScreen({ route }) {
  const { plant } = route.params;
  const [lastWatered, setLastWatered] = useState(plant.lastWatered);
  const dueIn = plant.waterDays - lastWatered;

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 14 }}>
      <Text style={s.species}>{plant.species}</Text>

      <View style={card}>
        <Text style={s.label}>Health</Text>
        <View style={s.barBg}><View style={[s.bar, { width: `${plant.health}%` }]} /></View>
        <Text style={s.value}>{plant.health}%</Text>
      </View>

      <View style={card}>
        <Text style={s.label}>Watering</Text>
        <Text style={s.value}>
          {dueIn <= 0 ? 'Water today' : `Next watering in ${dueIn} day${dueIn === 1 ? '' : 's'}`}
        </Text>
        <Text style={s.muted}>Every {plant.waterDays} days · last watered {lastWatered} days ago</Text>
        <Pressable style={s.button} onPress={() => setLastWatered(0)}>
          <Text style={s.buttonText}>Mark as watered</Text>
        </Pressable>
      </View>

      <View style={card}>
        <Text style={s.label}>Light</Text>
        <Text style={s.value}>{plant.light}</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
  species: { color: colors.muted, fontStyle: 'italic', fontSize: 16 },
  label: { color: colors.muted, marginBottom: 6 },
  value: { fontSize: 18, fontWeight: '600', color: colors.soil },
  muted: { color: colors.muted, marginTop: 4 },
  barBg: { height: 10, borderRadius: 5, backgroundColor: colors.line, marginBottom: 8 },
  bar: { height: 10, borderRadius: 5, backgroundColor: colors.fern },
  button: { backgroundColor: colors.water, padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
