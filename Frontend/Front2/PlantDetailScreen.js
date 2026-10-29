import React, { useCallback, useState } from 'react';
import { ScrollView, View, Text, TextInput, Switch, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { colors } from '../theme';
import { Card, Pill, Btn, Loading, Msg, Reading } from '../ui';
import { soilStatus, lightStatus, tempStatus, isOnline, timeAgo, validateSettings, SOIL_WET } from '../logic';

const toForm = (s) => ({
  threshold: String(s.SoilMoistureThreshold),
  auto: !!s.AutomaticWateringEnabled,
  duration: String(s.WateringDurationSeconds),
  fanAuto: !!s.FanAutomaticEnabled,
  fanStart: String(s.FanStartTemperature),
  fanStop: String(s.FanStopTemperature),
});

export default function PlantDetailScreen({ route, navigation }) {
  const { plantId } = route.params;
  const [d, setD] = useState(null);
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState({ text: '', error: false });
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    const data = await api.getPlantDetail(plantId);
    setD(data);
    setForm(toForm(data.settings));
    navigation.setOptions({ title: data.PlantName });
  }, [plantId, navigation]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!d || !form) return <Loading />;

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const say = (text, error = false) => setMsg({ text, error });

  const save = async () => {
    const payload = {
      SoilMoistureThreshold: parseFloat(form.threshold),
      AutomaticWateringEnabled: form.auto,
      WateringDurationSeconds: Number(form.duration),
      FanAutomaticEnabled: form.fanAuto,
      FanStartTemperature: parseFloat(form.fanStart),
      FanStopTemperature: parseFloat(form.fanStop),
    };
    const err = validateSettings(payload);
    if (err) return say(err, true);
    setBusy('save');
    try {
      await api.saveSettings(plantId, payload);
      say('Settings saved.');
    } catch (e) {
      say(e.message, true);
    }
    setBusy('');
  };

  const water = async () => {
    setBusy('water');
    try {
      const r = await api.waterNow(plantId);
      say(`Watering command sent (${r.seconds} s).`);
      await load();
    } catch (e) {
      say(e.message, true);
    }
    setBusy('');
  };

  const l = d.latest;
  const threshold = d.settings.SoilMoistureThreshold;
  const online = d.device ? isOnline(d.device.LastSeenAt) : null;

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 14 }}>
      <View>
        <Text style={s.species}>{d.species ? `${d.species.CommonName} · ${d.species.ScientificName}` : 'Species not set'}</Text>
        <Text style={s.muted}>{[d.Location, d.device && `Device: ${d.device.DeviceName}`].filter(Boolean).join(' · ')}</Text>
        {online !== null && (
          <View style={{ marginTop: 6 }}>
            <Pill text={online ? 'Device online' : `Offline · seen ${timeAgo(d.device.LastSeenAt)}`} tone={online ? 'good' : 'bad'} />
          </View>
        )}
      </View>

      <Card>
        <Text style={s.h}>Live readings</Text>
        {l ? (
          <>
            <View style={s.grid}>
              <Reading label="Soil moisture" value={`${l.SoilMoisture}%`} status={soilStatus(l.SoilMoisture, threshold)} />
              <Reading label="Air temperature" value={`${l.AirTemperature}°C`} status={tempStatus(l.AirTemperature, d.settings)} />
              <Reading label="Air humidity" value={`${l.AirHumidity}%`} />
              <Reading label="Light (0-4095)" value={l.LightLevel} status={lightStatus(l.LightLevel)} />
            </View>
            <Text style={s.muted}>Fan: {l.FanStatus ? 'on' : 'off'} · updated {timeAgo(l.MeasuredAt)}</Text>
          </>
        ) : (
          <Text style={s.muted}>{d.device ? 'Waiting for the first measurement.' : 'Link a device to see live readings.'}</Text>
        )}
      </Card>

      {d.history.length > 0 && (
        <Card>
          <Text style={s.h}>Soil moisture, last 24 readings</Text>
          <View style={s.chart}>
            <View style={[s.thresholdLine, { bottom: threshold * 0.9 }]} />
            {d.history.map((m, i) => (
              <View key={i} style={[s.bar, { height: Math.max(2, m.SoilMoisture * 0.9), backgroundColor: soilStatus(m.SoilMoisture, threshold).tone === 'good' ? colors.fern : colors.amber }]} />
            ))}
          </View>
          <Text style={s.muted}>Line = your {threshold}% watering threshold. Above {SOIL_WET}% is too wet.</Text>
        </Card>
      )}

      <Card>
        <Text style={s.h}>Water now</Text>
        <Text style={s.muted}>Runs the pump for {d.settings.WateringDurationSeconds} seconds.</Text>
        <View style={{ marginTop: 10 }}>
          <Btn title="Water now" tone="water" onPress={water} busy={busy === 'water'} disabled={!d.device} />
        </View>
        {!d.device && <Text style={s.muted}>No device linked to this plant.</Text>}
      </Card>

      <Card style={{ gap: 10 }}>
        <Text style={s.h}>Care settings</Text>
        <Field label="Water when soil is below (%)" value={form.threshold} onChange={set('threshold')} />
        <SwitchRow label="Automatic watering" value={form.auto} onChange={set('auto')} />
        <Field label="Watering duration (seconds)" value={form.duration} onChange={set('duration')} />
        <SwitchRow label="Automatic fan" value={form.fanAuto} onChange={set('fanAuto')} />
        <Field label="Fan starts above (°C)" value={form.fanStart} onChange={set('fanStart')} />
        <Field label="Fan stops at or below (°C)" value={form.fanStop} onChange={set('fanStop')} />
        <Btn title="Save settings" onPress={save} busy={busy === 'save'} />
        <Msg text={msg.text} error={msg.error} />
      </Card>

      <Card style={{ gap: 6 }}>
        <Text style={s.h}>Watering history</Text>
        {d.watering.length === 0 && <Text style={s.muted}>No waterings yet.</Text>}
        {d.watering.map((w) => (
          <View key={w.WateringID} style={s.between}>
            <Text style={{ color: colors.soil }}>{timeAgo(w.StartedAt)} · {w.DurationSeconds ?? '?'} s</Text>
            <Pill text={`${w.IsAutomatic ? 'Auto' : 'Manual'} · ${w.Status}`} tone={w.Status === 'Completed' ? 'good' : 'bad'} />
          </View>
        ))}
      </Card>

      {d.reports.length > 0 && (
        <Card style={{ gap: 6 }}>
          <Text style={s.h}>Disease reports</Text>
          {d.reports.map((r) => (
            <View key={r.ReportID}>
              <View style={s.between}>
                <Text style={{ fontWeight: '600', color: colors.soil }}>{r.disease?.DiseaseName || 'Unknown disease'}</Text>
                <Pill text={r.Status} tone={r.Status === 'Resolved' ? 'good' : 'warn'} />
              </View>
              {r.SymptomsObserved && <Text style={s.muted}>{r.SymptomsObserved}</Text>}
              {r.disease?.Treatment && <Text style={s.muted}>Treatment: {r.disease.Treatment}</Text>}
            </View>
          ))}
        </Card>
      )}

      {d.species && (
        <Card style={{ gap: 6 }}>
          <Text style={s.h}>About this species</Text>
          <Text style={s.muted}>Ideal soil: {d.species.MinSoilMoisture}-{d.species.MaxSoilMoisture}% · Temperature: {d.species.MinTemperature}-{d.species.MaxTemperature}°C · {d.species.LightRequirements}</Text>
          <Text style={{ color: colors.soil }}>{d.species.WateringAdvice}</Text>
          <Text style={{ color: colors.soil }}>{d.species.CareInstructions}</Text>
          {d.possibleDiseases.length > 0 && (
            <Text style={s.muted}>Watch for: {d.possibleDiseases.map((x) => x.DiseaseName).join(', ')}</Text>
          )}
        </Card>
      )}
    </ScrollView>
  );
}

const Field = ({ label, value, onChange }) => (
  <View>
    <Text style={s.label}>{label}</Text>
    <TextInput style={s.input} value={value} onChangeText={onChange} keyboardType="numeric" />
  </View>
);

const SwitchRow = ({ label, value, onChange }) => (
  <View style={s.between}>
    <Text style={{ color: colors.soil, fontSize: 15 }}>{label}</Text>
    <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.fern }} />
  </View>
);

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
  species: { fontSize: 16, fontStyle: 'italic', color: colors.soil },
  muted: { color: colors.muted, marginTop: 2 },
  h: { fontSize: 16, fontWeight: '700', color: colors.soil, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  label: { color: colors.muted, fontSize: 13, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10, fontSize: 16, backgroundColor: '#fff' },
  chart: { height: 100, flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginVertical: 8 },
  bar: { flex: 1, borderRadius: 2 },
  thresholdLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.bloom, zIndex: 2 },
});
