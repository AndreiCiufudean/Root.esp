import React, { useCallback, useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../auth';
import { api } from '../api';
import { community } from '../mock';
import { colors } from '../theme';
import { Card, Pill, Loading, Empty, Btn } from '../ui';
import { soilStatus, tempStatus, isOnline, timeAgo } from '../logic';

const FALLBACK_TIP = 'Check the soil with your finger before watering: if the top 2 cm are dry, it is time.';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [plants, setPlants] = useState(null);

  useFocusEffect(useCallback(() => {
    api.getPlants(user.UserID).then(setPlants);
  }, [user.UserID]));

  if (!plants) return <Loading />;

  const needWater = plants.filter((p) => p.latest && soilStatus(p.latest.SoilMoisture, p.settings?.SoilMoistureThreshold).label === 'Dry').length;
  const offline = plants.filter((p) => p.device && !isOnline(p.device.LastSeenAt)).length;
  const withData = plants.filter((p) => p.latest);
  const avgSoil = withData.length ? Math.round(withData.reduce((a, p) => a + p.latest.SoilMoisture, 0) / withData.length) : null;

  // Daily tip: rotate through the WateringAdvice of the species the user owns.
  const tips = plants.map((p) => p.species?.WateringAdvice && `${p.species.CommonName}: ${p.species.WateringAdvice}`).filter(Boolean);
  const dayIndex = Math.floor(Date.now() / 86400000);
  const tip = tips.length ? tips[dayIndex % tips.length] : FALLBACK_TIP;

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text style={s.hello}>Hi, {user.Username}</Text>

      <View style={s.row}>
        <Stat label="Plants" value={plants.length} />
        <Stat label="Need water" value={needWater} color={needWater ? colors.amber : colors.fern} />
        <Stat label="Avg soil" value={avgSoil == null ? '-' : `${avgSoil}%`} />
        <Stat label="Offline" value={offline} color={offline ? colors.bloom : colors.fern} />
      </View>

      <Card style={{ backgroundColor: colors.fern }}>
        <Text style={s.tipLabel}>Today's tip</Text>
        <Text style={s.tip}>{tip}</Text>
      </Card>

      <Text style={s.h2}>Your plants</Text>
      {plants.length === 0 && (
        <Card>
          <Empty text="You have no plants yet. Add your first plant and link an ESP32 device to it." />
          <Btn title="Add plant" onPress={() => navigation.navigate('AddPlant')} />
        </Card>
      )}
      {plants.map((p) => {
        const soil = soilStatus(p.latest?.SoilMoisture, p.settings?.SoilMoistureThreshold);
        const online = p.device ? isOnline(p.device.LastSeenAt) : null;
        return (
          <Pressable key={p.PlantID} onPress={() => navigation.navigate('PlantDetail', { plantId: p.PlantID })}>
            <Card style={{ gap: 6 }}>
              <View style={s.between}>
                <Text style={s.plantName}>{p.PlantName}</Text>
                {online === null ? <Pill text="No device" /> : <Pill text={online ? 'Online' : 'Offline'} tone={online ? 'good' : 'bad'} />}
              </View>
              <Text style={s.muted}>{[p.species?.CommonName, p.Location].filter(Boolean).join(' · ')}</Text>
              {p.latest ? (
                <>
                  <View style={s.rowWrap}>
                    <Pill text={`Soil ${p.latest.SoilMoisture}% · ${soil.label}`} tone={soil.tone} />
                    <Pill text={`${p.latest.AirTemperature}°C · ${tempStatus(p.latest.AirTemperature, p.settings).label}`} tone={tempStatus(p.latest.AirTemperature, p.settings).tone} />
                  </View>
                  <Text style={s.muted}>Updated {timeAgo(p.latest.MeasuredAt)}</Text>
                </>
              ) : (
                <Text style={s.muted}>No sensor data yet.</Text>
              )}
            </Card>
          </Pressable>
        );
      })}

      <Text style={s.h2}>Community</Text>
      {community.map((c) => (
        <Card key={c.id}>
          <Text style={s.author}>{c.author}</Text>
          <Text>{c.text}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}

const Stat = ({ label, value, color = colors.soil }) => (
  <Card style={{ flex: 1, alignItems: 'center', padding: 10 }}>
    <Text style={{ fontSize: 22, fontWeight: '700', color }}>{value}</Text>
    <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
  </Card>
);

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
  hello: { fontSize: 26, fontWeight: '700', color: colors.soil },
  row: { flexDirection: 'row', gap: 8 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tipLabel: { color: '#cfe3d2', marginBottom: 6, fontSize: 13 },
  tip: { color: '#fff', fontSize: 16, lineHeight: 22 },
  h2: { fontSize: 18, fontWeight: '600', color: colors.soil },
  plantName: { fontSize: 18, fontWeight: '600', color: colors.soil },
  muted: { color: colors.muted },
  author: { fontWeight: '600', marginBottom: 4, color: colors.fern },
});
