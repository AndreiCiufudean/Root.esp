import React, { useCallback, useState, useEffect, useRef } from 'react';
import { ScrollView, View, Text, TextInput, Switch, Pressable, StyleSheet } from 'react-native';
import { useLiveRefresh } from '../useLiveRefresh';
import { api, USE_MOCK } from '../api';
import { useData } from '../appdata';
import { pickImage } from '../image';
import { colors, MAX_WIDTH, createStyles, tint } from '../theme';
import { Card, Pill, Btn, Loading, LoadFailure, Msg, Reading, Avatar, Sheet, IconPicker, ColorPicker, Icon, Chip, ConfirmModal, SafeTop, SafeBottom } from '../ui';
import { useAuth } from '../auth';
import { soilStatus, lightStatus, tempStatus, isOnline, timeAgo, validateSettings, parseNumericInput, plantMood, SOIL_WET, percentage, displayReading } from '../logic';

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
  const { getLook, setLook } = useData();
  const [editLook, setEditLook] = useState(false);
  const { user } = useAuth();
  const [devSheet, setDevSheet] = useState(false);
  const [freeDevices, setFreeDevices] = useState(null);
  const [devMsg, setDevMsg] = useState({ text: '', error: false });
  const [devBusy, setDevBusy] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [d, setD] = useState(null);
  const [commands,setCommands] = useState([]);
  const [pumpOff,setPumpOff] = useState(false);
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState({ text: '', error: false });
  const [busy, setBusy] = useState('');
  const [loadError, setLoadError] = useState('');
  const [commandError,setCommandError]=useState('');
  const dirty=useRef(false);
  const formVersion=useRef(0);
  const loadedSettings=useRef(null);
  const [conflict,setConflict]=useState(false);

  useEffect(()=>{dirty.current=false;loadedSettings.current=null;formVersion.current++;setConflict(false);setCommandError('');setD(null);setForm(null);setCommands([]);setPumpOff(false);},[plantId]);
  const load = useCallback(async (isActive=()=>true) => {
    if(typeof isActive!=='function')isActive=()=>true;
    setLoadError('');
    try {
      const data = await api.getPlantDetail(plantId);
      if(!isActive())return;
      setD(data);
      if (!data?.settings) throw new Error('Plant care settings are missing.');
      const signature=JSON.stringify(toForm(data.settings));
      if(dirty.current){
        if(loadedSettings.current&&signature!==loadedSettings.current)setConflict(true);
      }else{setForm(toForm(data.settings));setConflict(false);loadedSettings.current=signature;}
      try{
        const cmds=await api.getCommands(plantId);
        if(!isActive())return;
        setCommands(cmds);setCommandError('');
      }catch(e){if(isActive())setCommandError(e.message);}
      navigation.setOptions({ title: data.PlantName });
    } catch (e) { if(isActive())setLoadError(e.message); }
  }, [plantId, navigation]);

  useLiveRefresh(load);

  if (loadError) return <LoadFailure message={loadError} onRetry={load} />;
  if (!d || !form) return <Loading />;

  const set = (k) => (v) => {dirty.current=true;formVersion.current++;setForm((f) => ({ ...f, [k]: v }));};
  const say = (text, error = false) => setMsg({ text, error });

  const save = async () => {
    if(conflict)return say('Settings changed elsewhere. Reload them before saving.',true);
    const savingVersion=formVersion.current;
    const payload = {
      ExpectedSettings:loadedSettings.current?JSON.parse(loadedSettings.current):undefined,
      SoilMoistureThreshold: parseNumericInput(form.threshold),
      AutomaticWateringEnabled: form.auto,
      WateringDurationSeconds: parseNumericInput(form.duration),
      FanAutomaticEnabled: form.fanAuto,
      FanStartTemperature: parseNumericInput(form.fanStart),
      FanStopTemperature: parseNumericInput(form.fanStop),
    };
    const err = validateSettings(payload);
    if (err) return say(err, true);
    setBusy('save');
    try {
      const savedSettings = await api.saveSettings(plantId, payload);
      setD(old => ({ ...old, settings: savedSettings }));
      loadedSettings.current=JSON.stringify(toForm(savedSettings));
      if(formVersion.current===savingVersion){dirty.current=false;setForm(toForm(savedSettings));setConflict(false);}
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
      say(r.status === 'Pending' ? `Watering queued (${r.seconds} s). It is not complete until the device confirms it.` : `Demo simulation only (${r.seconds} s). No water was dispensed.`);
      await load();
    } catch (e) {
      say(e.message, true);
    }
    setBusy('');
  };

  // Link, replace or unlink the Root.esp device of this (already created) plant.
  const openDevices = async () => {
    setDevMsg({ text: '', error: false }); setFreeDevices(null); setDevSheet(true);
    try {
      const [devices, plants] = await Promise.all([api.getDevices(user.UserID), api.getPlants(user.UserID)]);
      const used = plants.filter((p) => p.PlantID !== plantId).map((p) => p.DeviceID).filter(Boolean);
      setFreeDevices(devices.filter((x) => x.IsActive && !used.includes(x.DeviceID)));
    } catch (e) { setDevMsg({ text: e.message, error: true }); setFreeDevices([]); }
  };
  const changeDevice = async (deviceId) => {
    setDevBusy(true);
    try {
      await api.linkDevice(plantId, deviceId);
      setDevSheet(false); setConfirmUnlink(false);
      say(deviceId == null ? 'Device unlinked.' : 'Device linked to this plant.');
      await load();
    } catch (e) { setDevMsg({ text: e.message, error: true }); setConfirmUnlink(false); }
    setDevBusy(false);
  };

  // Deleting removes the plant and its history. The Root.esp device stays registered and nothing is watered.
  const removePlant = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await api.deletePlant(plantId, user.UserID);
      setConfirmDelete(false);
      if (navigation.canGoBack()) navigation.goBack(); else navigation.navigate('Main', { screen: 'Plants' });
    } catch (e) {
      setConfirmDelete(false); say(e.message, true);
    }
    setDeleting(false);
  };

  const l = d.latest;
  const threshold = d.settings.SoilMoistureThreshold;
  const online = d.device ? isOnline(d.device.LastSeenAt) : null;
  const look = getLook(d);
  const mood = plantMood(d.latest, d.settings, online);

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 14, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingBottom: 40 }}>
      <View style={[s.hero, { backgroundColor: tint(look.color) + (colors.isDark ? 'AA' : '88') }]}>
        <Avatar look={look} size={84} onPress={() => setEditLook(true)} badge="pencil" />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.title}>{d.PlantName}</Text>
          <Pill text={mood.label} tone={mood.tone} />
          <Text style={s.muted}>{mood.hint}</Text>
          <Pressable onPress={() => setEditLook(true)}><Text style={{ color: colors.water, fontWeight: '600' }}>Change picture, icon & colour</Text></Pressable>
        </View>
      </View>
      <View>
        <Text style={s.species}>{d.species ? `${d.species.CommonName} · ${d.species.ScientificName}` : 'Species not set'}</Text>
        <Text style={s.muted}>{[d.Location, d.device && `Device: ${d.device.DeviceName}`].filter(Boolean).join(' · ')}</Text>
        {online !== null && (
          <View style={{ marginTop: 6 }}>
            <Pill text={online ? 'Device online' : `Offline · seen ${timeAgo(d.device.LastSeenAt)}`} tone={online ? 'good' : 'bad'} />
          </View>
        )}
      </View>

      <Card style={{ gap: 8 }}>
        <View style={s.hrow}><Icon name="chip" size={20} color={colors.info} /><Text style={s.h}>Root.esp device</Text></View>
        {d.device ? (
          <>
            <Text style={{ color: colors.soil, fontSize: 16, fontWeight: '600' }}>{d.device.DeviceName}</Text>
            <Text style={s.muted}>Code {d.device.DeviceCode} · {online ? 'online' : `offline, seen ${timeAgo(d.device.LastSeenAt)}`}</Text>
          </>
        ) : <Text style={s.muted}>No device linked yet. Link one to see live readings and water from the app.</Text>}
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
          <Btn icon={d.device ? 'swap-horizontal' : 'link-variant'} title={d.device ? 'Change device' : 'Link a device'} small onPress={openDevices} />
          {d.device ? <Btn title="Unlink" small outline tone="bloom" onPress={() => setConfirmUnlink(true)} /> : null}
        </View>
      </Card>

      <Card>
        <View style={s.hrow}><Icon name="water-pump" size={20} color={colors.info} /><Text style={s.h}>Watering commands</Text></View>
        <Msg text={commandError ? `Command status unavailable: ${commandError}` : ''} error />
        <Text>Hardware currently caps each cycle at 1 second. Saved duration is a request, not proof of execution.</Text>
        {commands.map(c=><View key={c.CommandID}>
          <Text>#{c.CommandID}: {c.Status} · requested {c.DurationSeconds}s</Text>
          {c.Status==='Processing' && <>
            <Text>Outcome uncertain if contact was lost. Check the pump physically before closing this command. Recovery is allowed after 10 minutes; it never replays watering.</Text>
            <Text>I have checked that the pump is off</Text><Switch value={pumpOff} onValueChange={setPumpOff}/>
            <Btn title="Close uncertain command" disabled={!pumpOff || !!busy} onPress={async()=>{
              if(!pumpOff)return;setBusy('reconcile');
              try{await api.reconcileCommand(plantId,c.CommandID);setPumpOff(false);await load();say('Command closed with unknown outcome.');}
              catch(e){say(e.message,true);}finally{setBusy('');}
            }}/>
          </>}
        </View>)}
      </Card>
      <Card>
        <View style={s.hrow}><Icon name="chart-line" size={20} color={colors.fern} /><Text style={s.h}>Live readings</Text></View>
        {l ? (
          <>
            <View style={s.grid}>
              <Reading icon="water-percent" color={colors.info} label="Soil moisture" value={displayReading(l.SoilMoisture, '%', 0, 100)} status={soilStatus(l.SoilMoisture, threshold)} />
              <Reading icon="thermometer" color={colors.warning} label="Air temperature" value={displayReading(l.AirTemperature, '°C')} status={tempStatus(l.AirTemperature, d.settings)} />
              <Reading icon="weather-cloudy" color={colors.info} label="Air humidity" value={displayReading(l.AirHumidity, '%', 0, 100)} />
              <Reading icon="white-balance-sunny" color={colors.sun} label="Light" value={displayReading(l.LightLevel, '%', 0, 100)} status={lightStatus(l.LightLevel)} />
            </View>
            <Text style={s.muted}>Fan: {l.FanStatus ? 'on' : 'off'} · updated {timeAgo(l.MeasuredAt)}</Text>
          </>
        ) : (
          <Text style={s.muted}>{d.device ? 'Waiting for the first measurement.' : 'Link a device to see live readings.'}</Text>
        )}
      </Card>

      {d.history.some(m => percentage(m.SoilMoisture) !== null) && (
        <Card>
          <Text style={s.h}>Soil moisture, last 24 readings</Text>
          <View style={s.chart}>
            <View style={[s.thresholdLine, { bottom: threshold * 0.9 }]} />
            {d.history.filter(m => percentage(m.SoilMoisture) !== null).map((m, i) => (
              <View key={m.MeasurementID ?? i} style={[s.bar, { height: Math.max(2, percentage(m.SoilMoisture) * 0.9), backgroundColor: soilStatus(m.SoilMoisture, threshold).tone === 'good' ? colors.fern : colors.amber }]} />
            ))}
          </View>
          <Text style={s.muted}>Line = your {threshold}% watering threshold. Above {SOIL_WET}% is too wet.</Text>
        </Card>
      )}

      <Card>
        <View style={s.hrow}><Icon name="watering-can-outline" size={20} color={colors.info} /><Text style={s.h}>Water now</Text></View>
        <Text style={s.muted}>Requests {d.settings.WateringDurationSeconds} seconds of watering. The device must be connected and confirm execution.</Text>
        <View style={{ marginTop: 10 }}>
          <Btn title="Water now" tone="water" onPress={water} busy={busy === 'water'} disabled={!d.device} />
        </View>
        {!d.device && <Text style={s.muted}>No device linked to this plant.</Text>}
      </Card>

      <Card style={{ gap: 10 }}>
        <View style={s.hrow}><Icon name="tune-variant" size={20} color={colors.fern} /><Text style={s.h}>Care settings</Text></View>
        {conflict&&<>
          <Msg text="Settings changed elsewhere. Reload the server settings before saving." error />
          <Btn title="Reload server settings" onPress={()=>{dirty.current=false;formVersion.current++;loadedSettings.current=null;setConflict(false);load();}}/>
        </>}
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

      <View style={{ alignItems: 'center', paddingTop: 6 }}>
        <Btn icon="delete-outline" title="Delete this plant" outline tone="danger" small onPress={() => setConfirmDelete(true)} style={{ minWidth: 190 }} />
      </View>

      <ConfirmModal visible={confirmDelete} title={`Delete ${d.PlantName}?`} confirmText={deleting ? 'Deleting…' : 'Yes, delete'} cancelText="Keep it" tone="bloom"
        message={`This permanently removes ${d.PlantName}, its readings, watering history, care notes and disease reports. ${d.device ? `Your Root.esp device “${d.device.DeviceName}” stays registered and becomes free to link to another plant. ` : ''}Nothing will be watered. This cannot be undone.`}
        onCancel={() => !deleting && setConfirmDelete(false)} onConfirm={removePlant} />

      <Sheet visible={devSheet} title={d.device ? 'Change device' : 'Link a device'} onClose={() => setDevSheet(false)}>
        {!freeDevices ? <Text style={s.muted}>Loading your devices…</Text> : freeDevices.length === 0 ? (
          <Text style={s.muted}>You have no free Root.esp device. Register one in Me → My Root.esp devices, then come back here.</Text>
        ) : (
          <View style={{ gap: 8 }}>
            <Text style={s.muted}>Pick the device that should measure and water this plant.</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {freeDevices.map((x) => <Chip key={x.DeviceID} icon="chip" text={x.DeviceName} active={d.DeviceID === x.DeviceID} onPress={() => !devBusy && changeDevice(x.DeviceID)} />)}
            </View>
          </View>
        )}
        <Msg text={devMsg.text} error={devMsg.error} />
        <Btn title="Register a new device" outline small onPress={() => { setDevSheet(false); navigation.navigate('Devices'); }} />
      </Sheet>

      <ConfirmModal visible={confirmUnlink} title="Unlink this device?" message="The plant keeps its history, but will stop showing new readings and you won't be able to water it from the app until you link a device again." confirmText="Unlink" tone="bloom"
        onCancel={() => setConfirmUnlink(false)} onConfirm={() => changeDevice(null)} />

      <Sheet visible={editLook} title="Customize this plant" onClose={() => setEditLook(false)}>
        <View style={{ alignItems: 'center' }}><Avatar look={look} size={96} /></View>
        <Text style={s.label}>Emoji</Text>
        <IconPicker value={look.photo ? null : look.icon} onChange={(e) => setLook(plantId, { icon: e || undefined })} />
        <Text style={s.label}>Colour</Text>
        <ColorPicker value={look.color} onChange={(c) => setLook(plantId, { color: c })} />
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <Btn icon="camera-outline" title={look.photo ? 'Change photo' : 'Add a photo'} outline small onPress={async () => { try { const uri = await pickImage({ square: true }); if (uri) setLook(plantId, { photo: uri }); } catch (e) { say('Could not open the gallery.', true); } }} />
          {look.photo ? <Btn title="Remove photo" outline tone="bloom" small onPress={() => setLook(plantId, { photo: null })} /> : null}
        </View>
        <Btn title="Done" onPress={() => setEditLook(false)} />
      </Sheet>
    <SafeBottom /></ScrollView>
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

const s = createStyles(() => ({
  screen: { flex: 1 },
  hero: { flexDirection: 'row', gap: 14, alignItems: 'center', padding: 16, borderRadius: 18 },
  title: { fontSize: 24, fontWeight: '800', color: colors.soil },
  species: { fontSize: 16, fontStyle: 'italic', color: colors.soil },
  muted: { color: colors.muted, marginTop: 2 },
  h: { fontSize: 16, fontWeight: '700', color: colors.soil },
  hrow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  label: { color: colors.muted, fontSize: 13, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10, fontSize: 16, backgroundColor: colors.field, color: colors.soil },
  chart: { height: 100, flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginVertical: 8 },
  bar: { flex: 1, borderRadius: 2 },
  thresholdLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.bloom, zIndex: 2 },
}));
