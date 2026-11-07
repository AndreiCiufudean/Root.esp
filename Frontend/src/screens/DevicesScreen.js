import React, { useCallback, useState } from 'react';
import { ScrollView, View, Text, TextInput, StyleSheet } from 'react-native';
import { useLiveRefresh } from '../useLiveRefresh';
import { useAuth } from '../auth';
import { api, USE_MOCK } from '../api';
import { colors, createStyles } from '../theme';
import { Card, Pill, Btn, Loading, LoadFailure, Empty, Msg, Sheet, Chip, SafeTop, SafeBottom } from '../ui';
import { isOnline, timeAgo } from '../logic';

export default function DevicesScreen() {
  const { user } = useAuth();
  const [devices, setDevices] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [provisioning, setProvisioning] = useState(null);
  const [linking, setLinking] = useState(null); // device being linked
  const [plants, setPlants] = useState([]);

  const load = useCallback(async (isActive=()=>true) => {
    if(typeof isActive!=='function')isActive=()=>true;
    setLoadError('');
    try { const rows=await api.getDevices(user.UserID); if(isActive())setDevices(rows); }
    catch (e) { if(isActive())setLoadError(e.message); }
  }, [user.UserID]);
  useLiveRefresh(load);

  if (loadError) return <LoadFailure message={loadError} onRetry={load} />;
  if (!devices) return <Loading />;

  const add = async () => {
    setError('');
    setBusy(true);
    try {
      const device = await api.addDevice(user.UserID, name, code);
      setProvisioning(device.DeviceKey ? { id: device.DeviceID, key: device.DeviceKey } : null);
      setName('');
      setCode('');
      await load();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };

  const openLink = async (device) => {
    setError('');
    try { setPlants(await api.getPlants(user.UserID)); setLinking(device); } catch (e) { setError(e.message); }
  };
  const linkTo = async (plantId) => {
    setBusy(true);
    try { await api.linkDevice(plantId, linking.DeviceID); setLinking(null); await load(); } catch (e) { setError(e.message); }
    setBusy(false);
  };

  const rotateKey = async (id) => {
    setError(''); setBusy(true);
    try {
      const result = await api.rotateDeviceKey(user.UserID, id);
      setProvisioning({ id: result.DeviceID, key: result.DeviceKey });
    } catch(e) { setError(e.message); }
    setBusy(false);
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12, width: '100%', maxWidth: 760, alignSelf: 'center' }}>
      {devices.length === 0 && <Empty text="No devices yet. Register your Root.esp device below." />}
      {devices.map((d) => (
        <Card key={d.DeviceID} style={{ gap: 4 }}>
          <View style={s.between}>
            <Text style={s.name}>{d.DeviceName}</Text>
            <Pill text={isOnline(d.LastSeenAt) ? 'Online' : 'Offline'} tone={isOnline(d.LastSeenAt) ? 'good' : 'bad'} />
          </View>
          <Text style={s.muted}>Code {d.DeviceCode} · last seen {timeAgo(d.LastSeenAt)}</Text>
          <Text style={s.muted}>{d.plant ? `Linked to ${d.plant}` : 'Not linked to a plant'}</Text>
          {!d.plant && <Btn icon="link-variant" title="Link to a plant" small onPress={() => openLink(d)} />}
          {!USE_MOCK && <Btn title="Generate new device key" onPress={() => rotateKey(d.DeviceID)} disabled={busy} />}
        </Card>
      ))}

      {provisioning && (
        <Card style={{ gap: 6 }}>
          <Text style={s.name}>One-time device key for ID {provisioning.id}</Text>
          <Text style={s.muted}>Copy this private key into your Root.esp device’s DeviceConfig.h. It will not be shown again. Generating another key disables the previous one.</Text>
          <Text selectable style={{ color: colors.soil, fontFamily: 'monospace' }}>{provisioning.key}</Text>
          <Btn title="I saved my key — hide it" onPress={() => setProvisioning(null)} />
        </Card>
      )}
      <Sheet visible={!!linking} title={linking ? `Link ${linking.DeviceName} to…` : ''} onClose={() => setLinking(null)}>
        {plants.length === 0 && <Text style={s.muted}>You have no plants yet. Add a plant first.</Text>}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {plants.map((p) => <Chip key={p.PlantID} icon={p.DeviceID ? 'swap-horizontal' : 'sprout'} text={p.PlantName + (p.device ? ` (replaces ${p.device.DeviceName})` : '')} onPress={() => !busy && linkTo(p.PlantID)} />)}
        </View>
        <Msg text={error} error />
      </Sheet>
      <Card style={{ gap: 10 }}>
        <Text style={s.name}>Register a Root.esp device</Text>
        <TextInput style={s.input} placeholder="Device name, e.g. Balcony" value={name} onChangeText={setName} />
        <TextInput style={s.input} placeholder="Device code (your device label)" autoCapitalize="characters" value={code} onChangeText={setCode} />
        <Msg text={error} error />
        <Btn title="Register device" onPress={add} busy={busy} />
      </Card>
    <SafeBottom /></ScrollView>
  );
}

const s = createStyles(() => ({
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '600', color: colors.soil },
  muted: { color: colors.muted },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10, fontSize: 16, backgroundColor: colors.field, color: colors.soil },
}));
