import React, { useCallback, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useLiveRefresh } from '../useLiveRefresh';
import { useAuth } from '../auth';
import { useData } from '../appdata';
import { api, USE_MOCK } from '../api';

import { colors, createStyles } from '../theme';
import { Loading, LoadFailure, Btn, Screen, Icon, IconBadge } from '../ui';
import {AdSlot} from '../deviceNudge';
import { TourTarget } from '../tour';
import { PlantTile, FilterChip } from '../plantCards';
import { describePlant } from './HomeScreen';

// Filters: everything, plants that need care, healthy plants, plants without a linked device.
const FILTERS = [
  { id: 'all', label: 'All', icon: 'sprout', test: () => true },
  { id: 'care', label: 'Needs care', icon: 'alert-circle-outline', tone: 'warning', test: (p, d) => !!p.device && d.mood.tone !== 'good' },
  { id: 'good', label: 'Healthy', icon: 'emoticon-happy-outline', tone: 'success', test: (p, d) => d.mood.tone === 'good' },
  { id: 'nodevice', label: 'No device', icon: 'link-variant-off', tone: 'muted', test: (p) => !p.device },
];

export default function PlantsScreen({ navigation }) {
  const { user } = useAuth();
  const { getLook } = useData();
  const [plants, setPlants] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState('all');

  const load = useCallback((isActive = () => true) => {
    if (typeof isActive !== 'function') isActive = () => true;
    setLoadError('');
    return api.getPlants(user.UserID).then((data) => { if (isActive()) setPlants(data); }).catch((e) => { if (isActive()) setLoadError(e.message); });
  }, [user.UserID]);
  useLiveRefresh(load);

  if (loadError) return <LoadFailure message={loadError} onRetry={load} />;
  if (!plants) return <Loading />;

  const rows = plants.map((p) => ({ p, d: describePlant(p) }));
  const count = (f) => rows.filter(({ p, d }) => f.test(p, d)).length;
  const active = FILTERS.find((f) => f.id === filter) || FILTERS[0];
  const shown = rows.filter(({ p, d }) => active.test(p, d));
  const healthy = count(FILTERS[2]), care = count(FILTERS[1]);

  return (
    <Screen>
      {USE_MOCK && <Text style={{ color: colors.muted, fontSize: 11, letterSpacing: 1 }}>DEMONSTRATION DATA · NOT LIVE SENSOR MEASUREMENTS</Text>}
      <View style={s.top}>
        <IconBadge name="sprout" color={colors.section.plants} size={44} />
        <View style={{ flex: 1, minWidth: 160 }}>
          <Text style={s.h}>My plants</Text>
          <Text style={{ color: colors.muted }}>{plants.length} plant{plants.length === 1 ? '' : 's'}{plants.length ? ` · ${healthy} healthy · ${care} need care` : ''}</Text>
        </View>
        <TourTarget id="plants.add"><Btn icon="plus" title="Add plant" tone="plants" onPress={() => navigation.navigate('AddPlant')} /></TourTarget>
      </View>

      {plants.length > 0 && <View style={s.health}>
        {/* one bar showing how the whole collection is doing */}
        <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: colors.mist }}>
          {healthy > 0 && <View style={{ flex: healthy, backgroundColor: colors.success }} />}
          {care > 0 && <View style={{ flex: care, backgroundColor: colors.warning }} />}
          {plants.length - healthy - care > 0 && <View style={{ flex: plants.length - healthy - care, backgroundColor: colors.line }} />}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {FILTERS.map((f) => <FilterChip key={f.id} label={f.label} icon={f.icon} count={count(f)} active={filter === f.id} color={f.tone ? (f.tone === 'muted' ? colors.muted : colors[f.tone]) : colors.section.plants} onPress={() => setFilter(f.id)} />)}
        </View>
      </View>}

 <AdSlot user={user} index={1} navigate={to=>navigation.navigate(to)}/>
      {plants.length === 0 ? (
        <TourTarget id="plants.grid"><Pressable accessibilityRole="button" onPress={() => navigation.navigate('AddPlant')}><View style={s.empty}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.section.plants + '22', alignItems: 'center', justifyContent: 'center' }}><Icon name="sprout-outline" size={38} color={colors.section.plants} /></View>
          <Text style={{ color: colors.soil, fontWeight: '800', fontSize: 17 }}>Your garden starts here</Text>
          <Text style={{ color: colors.muted, textAlign: 'center' }}>Add as many plants as you like, and optionally link a smart device.</Text>
        </View></Pressable></TourTarget>
      ) : (
        <TourTarget id="plants.grid"><View style={s.grid}>
          {shown.length === 0 ? <View style={[s.empty, { flex: 1 }]}><Icon name={active.icon} size={30} color={colors.muted} /><Text style={{ color: colors.muted }}>No plants in “{active.label}”.</Text></View>
            : shown.map(({ p, d }) => <PlantTile key={p.PlantID} plant={p} look={getLook(p)} mood={d.mood} soil={d.soil} onPress={() => navigation.navigate('PlantDetail', { plantId: p.PlantID })} />)}
        </View></TourTarget>
      )}
    </Screen>
  );
}

const s = createStyles(() => ({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  h: { fontSize: 28, fontWeight: '800', color: colors.soil, letterSpacing: -0.5 },
  health: { gap: 12, backgroundColor: colors.paper, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: colors.line },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  empty: { alignItems: 'center', gap: 10, padding: 28, borderRadius: 22, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.line, backgroundColor: colors.paper },
}));
