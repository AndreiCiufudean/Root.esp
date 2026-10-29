import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useAuth } from '../auth';
import { api } from '../api';
import { colors } from '../theme';
import { Card, Btn, Loading, Msg } from '../ui';

export default function AddPlantScreen({ navigation }) {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState(null);
  const [freeDevices, setFreeDevices] = useState([]);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [speciesId, setSpeciesId] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [c, devices, plants] = await Promise.all([api.getCatalog(), api.getDevices(user.UserID), api.getPlants(user.UserID)]);
      const used = plants.map((p) => p.DeviceID).filter(Boolean);
      setFreeDevices(devices.filter((d) => d.IsActive && !used.includes(d.DeviceID)));
      setCatalog(c);
    })();
  }, [user.UserID]);

  if (!catalog) return <Loading />;

  const save = async () => {
    setError('');
    setBusy(true);
    try {
      await api.addPlant(user.UserID, { PlantName: name, Location: location, SpeciesID: speciesId, DeviceID: deviceId });
      navigation.goBack();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.mist }} contentContainerStyle={{ padding: 16, gap: 14 }}>
      <Card style={{ gap: 10 }}>
        <Text style={s.label}>Plant name</Text>
        <TextInput style={s.input} value={name} onChangeText={setName} placeholder="e.g. Tomatoes" />
        <Text style={s.label}>Location (optional)</Text>
        <TextInput style={s.input} value={location} onChangeText={setLocation} placeholder="e.g. Greenhouse" />
      </Card>

      <Card style={{ gap: 10 }}>
        <Text style={s.label}>Species</Text>
        <View style={s.chips}>
          {catalog.species.map((sp) => (
            <Chip key={sp.SpeciesID} text={sp.CommonName} active={speciesId === sp.SpeciesID} onPress={() => setSpeciesId(speciesId === sp.SpeciesID ? null : sp.SpeciesID)} />
          ))}
        </View>
      </Card>

      <Card style={{ gap: 10 }}>
        <Text style={s.label}>Link a device</Text>
        {freeDevices.length === 0 ? (
          <Text style={{ color: colors.muted }}>No free devices. Register one from Menu → My devices.</Text>
        ) : (
          <View style={s.chips}>
            {freeDevices.map((d) => (
              <Chip key={d.DeviceID} text={d.DeviceName} active={deviceId === d.DeviceID} onPress={() => setDeviceId(deviceId === d.DeviceID ? null : d.DeviceID)} />
            ))}
          </View>
        )}
      </Card>

      <Msg text={error} error />
      <Btn title="Add plant" onPress={save} busy={busy} />
    </ScrollView>
  );
}

const Chip = ({ text, active, onPress }) => (
  <Pressable onPress={onPress} style={[s.chip, active && { backgroundColor: colors.fern, borderColor: colors.fern }]}>
    <Text style={{ color: active ? '#fff' : colors.soil }}>{text}</Text>
  </Pressable>
);

const s = StyleSheet.create({
  label: { color: colors.muted, fontSize: 13 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10, fontSize: 16, backgroundColor: '#fff' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
});
