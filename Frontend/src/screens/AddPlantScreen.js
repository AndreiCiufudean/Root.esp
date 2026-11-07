import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useAuth } from '../auth';
import { useData } from '../appdata';
import { api } from '../api';
import { pickImage } from '../image';
import { colors, PASTELS, CATEGORIES, CATEGORY_EMOJI, CATEGORY_ICON, createStyles } from '../theme';
import { Card, Btn, Loading, LoadFailure, Msg, Screen, Avatar, Chip, IconPicker, ColorPicker, ConfirmModal, SectionTitle, inputStyle } from '../ui';

const Step = ({ n, title, children }) => (
  <Card style={{ gap: 12 }}>
    <Text style={s.step}><Text style={{ color: colors.fern }}>{n}</Text>  {title}</Text>
    {children}
  </Card>
);

export default function AddPlantScreen({ navigation }) {
  const { user } = useAuth();
  const { setLook } = useData();
  const [catalog, setCatalog] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [freeDevices, setFreeDevices] = useState([]);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [search, setSearch] = useState('');
  const [speciesId, setSpeciesId] = useState(null);
  const [custom, setCustom] = useState(false);
  const [cName, setCName] = useState('');
  const [cCategory, setCCategory] = useState('Houseplant');
  const [cMin, setCMin] = useState('30');
  const [cMax, setCMax] = useState('65');
  const [cLight, setCLight] = useState('');
  const [emoji, setEmoji] = useState(null);
  const [color, setColor] = useState(PASTELS[0]);
  const [photo, setPhoto] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [warn, setWarn] = useState(false);
  const [added, setAdded] = useState(null);

  const load = async () => {
    setLoadError('');
    try {
      const [c, devices, plants] = await Promise.all([api.getCatalog(), api.getDevices(user.UserID), api.getPlants(user.UserID)]);
      const used = plants.map((p) => p.DeviceID).filter(Boolean);
      setFreeDevices(devices.filter((d) => d.IsActive && !used.includes(d.DeviceID)));
      setCatalog(c);
    } catch (e) { setLoadError(e.message); }
  };
  useEffect(() => { load(); }, [user.UserID]);

  if (loadError) return <LoadFailure message={loadError} onRetry={load} />;
  if (!catalog) return <Loading />;

  const species = catalog.species.find((x) => x.SpeciesID === speciesId);
  const previewEmoji = emoji || (custom ? CATEGORY_ICON[cCategory] : CATEGORY_ICON[species?.Category]) || 'sprout';
  const shown = catalog.species.filter((x) => x.CommonName.toLowerCase().includes(search.trim().toLowerCase()));

  const reset = () => {
    setName(''); setLocation(''); setSearch(''); setSpeciesId(null); setCustom(false); setCName(''); setCCategory('Houseplant');
    setCMin('30'); setCMax('65'); setCLight(''); setEmoji(null); setColor(PASTELS[0]); setPhoto(null); setDeviceId(null); setError(''); setAdded(null);
  };

  const choosePhoto = async () => {
    try { const uri = await pickImage({ square: true }); if (uri) setPhoto(uri); }
    catch (e) { setError('Could not open the gallery: ' + e.message); }
  };

  const submit = () => {
    setError('');
    if (!name.trim()) return setError('Give your plant a name first.');
    if (custom && !cName.trim()) return setError('Name your custom plant type (for example "Peace lily").');
    if (!deviceId) return setWarn(true);
    save();
  };

  const save = async () => {
    setWarn(false);
    setBusy(true);
    setError('');
    try {
      const payload = { PlantName: name, Location: location, SpeciesID: custom ? null : speciesId, DeviceID: deviceId };
      if (custom) payload.CustomSpecies = { CommonName: cName, Category: cCategory, Emoji: emoji || CATEGORY_EMOJI[cCategory], MinSoilMoisture: Number(cMin), MaxSoilMoisture: Number(cMax), LightRequirements: cLight };
      const plant = await api.addPlant(user.UserID, payload);
      const id = plant.PlantID ?? plant.plantID;
      if (id) setLook(id, { emoji: emoji || previewEmoji, color, photo });
      setAdded({ name: name.trim(), id });
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };

  if (added) {
    return (
      <Screen>
        <Card style={{ alignItems: 'center', gap: 12, paddingVertical: 30 }}>
          <Avatar look={{ icon: emoji || previewEmoji, color, photo }} size={90} badge="check-bold" />
          <Text style={s.big}>{added.name} was added!</Text>
          <Text style={{ color: colors.muted, textAlign: 'center' }}>You can add as many plants as you want.</Text>
          <View style={{ gap: 10, width: '100%', maxWidth: 320 }}>
            {added.id ? <Btn title="Open this plant" onPress={() => { const id = added.id; reset(); navigation.replace('PlantDetail', { plantId: id }); }} /> : null}
            <Btn icon="plus" title="Add another plant" tone="water" onPress={reset} />
            <Btn title="See all my plants" outline onPress={() => navigation.navigate('Main', { screen: 'Plants' })} />
          </View>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={s.preview}>
        <Avatar look={{ icon: previewEmoji, color, photo }} size={84} onPress={choosePhoto} badge="camera-outline" />
        <View style={{ flex: 1, gap: 8 }}>
          <TextInput style={[inputStyle, { fontSize: 18, fontWeight: '600' }]} value={name} onChangeText={setName} placeholder="Plant name, e.g. Tomatoes" />
          <TextInput style={inputStyle} value={location} onChangeText={setLocation} placeholder="Where is it? (optional)" />
        </View>
      </View>

      <Step n="1" title="What kind of plant is it?">
        <TextInput style={inputStyle} value={search} onChangeText={setSearch} placeholder="Search plant types" />
        <View style={s.chips}>
          {shown.map((sp) => (
            <Chip key={sp.SpeciesID} icon={CATEGORY_ICON[sp.Category] || 'sprout'} text={sp.CommonName} active={!custom && speciesId === sp.SpeciesID}
              onPress={() => { setCustom(false); setSpeciesId(speciesId === sp.SpeciesID ? null : sp.SpeciesID); }} />
          ))}
          <Chip icon="creation" text="My own type" active={custom} color="#FFF4C7" onPress={() => { setCustom(!custom); setSpeciesId(null); }} />
        </View>
        {shown.length === 0 && !custom && <Text style={{ color: colors.muted }}>No match. Tap "My own type" to create it.</Text>}
        {species && !custom && <Text style={{ color: colors.muted }}>{species.WateringAdvice} · Ideal soil {species.MinSoilMoisture}-{species.MaxSoilMoisture}%</Text>}
        {custom && (
          <View style={{ gap: 10, backgroundColor: '#FFF9DD', padding: 12, borderRadius: 12 }}>
            <Text style={{ fontWeight: '700', color: colors.soil }}>Create your own plant type</Text>
            <TextInput style={inputStyle} value={cName} onChangeText={setCName} placeholder="Type name, e.g. Peace lily" />
            <View style={s.chips}>{CATEGORIES.map((c) => <Chip key={c} icon={CATEGORY_ICON[c]} text={c} active={cCategory === c} onPress={() => setCCategory(c)} />)}</View>
            <Text style={s.label}>Ideal soil moisture (%)</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput style={[inputStyle, { flex: 1 }]} value={cMin} onChangeText={setCMin} keyboardType="numeric" placeholder="min" />
              <TextInput style={[inputStyle, { flex: 1 }]} value={cMax} onChangeText={setCMax} keyboardType="numeric" placeholder="max" />
            </View>
            <TextInput style={inputStyle} value={cLight} onChangeText={setCLight} placeholder="Light needs (optional), e.g. Bright, indirect" />
          </View>
        )}
      </Step>

      <Step n="2" title="Make it yours">
        <Text style={s.label}>Emoji</Text>
        <IconPicker value={emoji} onChange={setEmoji} />
        <Text style={s.label}>Colour</Text>
        <ColorPicker value={color} onChange={setColor} />
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <Btn icon="camera-outline" title={photo ? 'Change photo' : 'Add a photo'} outline small onPress={choosePhoto} />
          {photo ? <Btn title="Remove photo" outline tone="bloom" small onPress={() => setPhoto(null)} /> : null}
        </View>
      </Step>

      <Step n="3" title="Link a Root.esp device">
        {freeDevices.length === 0 ? (
          <View style={{ gap: 10 }}>
            <Text style={{ color: colors.muted }}>You have no free Root.esp device. You can still add the plant and link one later.</Text>
            <Btn icon="chip" title="Register a Root.esp device" outline small onPress={() => navigation.navigate('Devices')} />
          </View>
        ) : (
          <View style={s.chips}>
            {freeDevices.map((d) => <Chip key={d.DeviceID} icon="chip" text={d.DeviceName} active={deviceId === d.DeviceID} onPress={() => setDeviceId(deviceId === d.DeviceID ? null : d.DeviceID)} />)}
          </View>
        )}
      </Step>

      <Msg text={error} error />
      <Btn icon="sprout" title="Add plant" onPress={submit} busy={busy} />

      <ConfirmModal
        visible={warn}
        title="No Root.esp device linked"
        message="Without a Root.esp device this plant will not show live readings and you won't be able to water it from the app. You can link a device later. Add the plant anyway?"
        confirmText="Add anyway"
        cancelText="Go back"
        onCancel={() => setWarn(false)}
        onConfirm={save}
      />
    </Screen>
  );
}

const s = createStyles(() => ({
  step: { fontSize: 17, fontWeight: '700', color: colors.soil },
  big: { fontSize: 22, fontWeight: '800', color: colors.soil, textAlign: 'center' },
  label: { color: colors.muted, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preview: { flexDirection: 'row', gap: 14, alignItems: 'center' },
}));
