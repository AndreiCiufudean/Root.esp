import React, { useCallback, useState } from 'react';
import { ScrollView, View, Text, TextInput, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../auth';
import { api } from '../api';
import { colors } from '../theme';
import { Card, Pill, Btn, Loading, Empty, Msg } from '../ui';
import { isOnline, timeAgo } from '../logic';

export default function DevicesScreen() {
  const { user } = useAuth();
  const [devices, setDevices] = useState(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.getDevices(user.UserID).then(setDevices), [user.UserID]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!devices) return <Loading />;

  const add = async () => {
    setError('');
    setBusy(true);
    try {
      await api.addDevice(user.UserID, name, code);
      setName('');
      setCode('');
      await load();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.mist }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      {devices.length === 0 && <Empty text="No devices yet. Register your ESP32 below." />}
      {devices.map((d) => (
        <Card key={d.DeviceID} style={{ gap: 4 }}>
          <View style={s.between}>
            <Text style={s.name}>{d.DeviceName}</Text>
            <Pill text={isOnline(d.LastSeenAt) ? 'Online' : 'Offline'} tone={isOnline(d.LastSeenAt) ? 'good' : 'bad'} />
          </View>
          <Text style={s.muted}>Code {d.DeviceCode} · last seen {timeAgo(d.LastSeenAt)}</Text>
          <Text style={s.muted}>{d.plant ? `Linked to ${d.plant}` : 'Not linked to a plant'}</Text>
        </Card>
      ))}

      <Card style={{ gap: 10 }}>
        <Text style={s.name}>Register a device</Text>
        <TextInput style={s.input} placeholder="Device name" value={name} onChangeText={setName} />
        <TextInput style={s.input} placeholder="Device code (printed in the ESP32 firmware)" autoCapitalize="characters" value={code} onChangeText={setCode} />
        <Msg text={error} error />
        <Btn title="Register device" onPress={add} busy={busy} />
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '600', color: colors.soil },
  muted: { color: colors.muted },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10, fontSize: 16, backgroundColor: '#fff' },
});
