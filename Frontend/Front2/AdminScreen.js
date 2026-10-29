import React, { useCallback, useState } from 'react';
import { ScrollView, View, Text, Switch, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../auth';
import { api } from '../api';
import { colors } from '../theme';
import { Card, Pill, Loading } from '../ui';

const TABS = ['Users', 'Plants', 'Diseases'];

export default function AdminScreen() {
  const { user: me } = useAuth();
  const [tab, setTab] = useState('Users');
  const [users, setUsers] = useState(null);
  const [catalog, setCatalog] = useState(null);

  useFocusEffect(useCallback(() => {
    api.getUsers().then(setUsers);
    api.getCatalog().then(setCatalog);
  }, []));

  if (!users || !catalog) return <Loading />;

  const toggle = async (u, value) => {
    setUsers((list) => list.map((x) => (x.UserID === u.UserID ? { ...x, IsActive: value } : x)));
    await api.setUserActive(u.UserID, value);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.mist }} contentContainerStyle={{ padding: 16, gap: 10 }}>
      <View style={s.tabs}>
        {TABS.map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[s.tab, tab === t && s.tabOn]}>
            <Text style={{ color: tab === t ? '#fff' : colors.soil, fontWeight: '600' }}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'Users' &&
        users.map((u) => (
          <Card key={u.UserID} style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{u.Username}</Text>
              <Text style={{ color: colors.muted }}>{u.Email}</Text>
              {u.IsAdmin && <View style={{ marginTop: 4 }}><Pill text="Admin" tone="good" /></View>}
            </View>
            <View style={{ alignItems: 'center' }}>
              <Switch value={u.IsActive} disabled={u.UserID === me.UserID} onValueChange={(v) => toggle(u, v)} trackColor={{ true: colors.fern }} />
              <Text style={{ color: colors.muted, fontSize: 11 }}>{u.IsActive ? 'Active' : 'Disabled'}</Text>
            </View>
          </Card>
        ))}

      {tab === 'Plants' &&
        catalog.species.map((sp) => (
          <Card key={sp.SpeciesID} style={{ gap: 3 }}>
            <Text style={s.name}>{sp.CommonName}</Text>
            <Text style={{ color: colors.muted, fontStyle: 'italic' }}>{sp.ScientificName} · {sp.Category}</Text>
            <Text style={{ color: colors.soil }}>Soil {sp.MinSoilMoisture}-{sp.MaxSoilMoisture}% · {sp.MinTemperature}-{sp.MaxTemperature}°C · {sp.LightRequirements}</Text>
          </Card>
        ))}

      {tab === 'Diseases' &&
        catalog.diseases.map((d) => (
          <Card key={d.DiseaseID} style={{ gap: 3 }}>
            <Text style={s.name}>{d.DiseaseName}</Text>
            <Text style={{ color: colors.soil }}>{d.Symptoms}</Text>
            <Text style={{ color: colors.muted }}>Treatment: {d.Treatment}</Text>
          </Card>
        ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  tabs: { flexDirection: 'row', backgroundColor: colors.line, borderRadius: 12, padding: 3 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  tabOn: { backgroundColor: colors.fern },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 16, fontWeight: '600', color: colors.soil },
});
