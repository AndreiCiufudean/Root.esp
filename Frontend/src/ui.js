import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator, Image, Modal, ScrollView, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { colors, card, PASTELS, PLANT_ICONS, MAX_WIDTH, tint, glass, toneColor, toneBg, inputStyle, createStyles, onColor } from './theme';
import Icon from './Icon';
import { useTourScroll } from './tour';
export { Icon };
import { percentage } from './logic';
import { playSound } from './sound';


export { inputStyle };
export const LOGO = require('../assets/logo.png');
export const LOGO_O = require('../assets/logo-o.png');

// Spacers that keep scrolling content clear of the status bar and the phone's navigation buttons.
export const SafeTop = () => { const i = useSafeAreaInsets(); return <View style={{ height: i.top }} />; };
export const SafeBottom = () => { const i = useSafeAreaInsets(); return <View style={{ height: i.bottom }} />; };

export const Card = ({ children, style }) => <View style={[card, { shadowColor: '#000', shadowOpacity: colors.isDark ? 0 : 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } }, style]}>{children}</View>;

// Full-bleed green gradient behind the app.
export const GradientBg = () => (
  <LinearGradient colors={colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
);

// "Root.esp" with the logo standing in for the first "o".
export const Wordmark = ({size=22,color}) => {
  const c=color||colors.soil, t={fontSize:size,fontWeight:'700',color:c,letterSpacing:-1,lineHeight:size*1.2};
  return <View accessible accessibilityRole="header" accessibilityLabel="Root.esp" style={{flexDirection:'row',alignItems:'center'}}>
    <Text style={t}>R</Text>
    <Image source={LOGO_O} resizeMode="contain" style={{width:size*0.92,height:size*0.92,marginHorizontal:size*0.02,marginTop:size*0.12}}/>
    <Text style={t}>ot.esp</Text>
  </View>;
};

// The wordmark doubles as the back button: away from Home, a small arrow appears before it and
// tapping the logo returns to the previous page.
export const LogoBack = ({ size = 22, back, onPress }) => (
  <Pressable onPress={() => { if (back && onPress) { playSound('click'); onPress(); } }} disabled={!back} hitSlop={8}
    accessibilityRole={back ? 'button' : 'header'} accessibilityLabel={back ? 'Back' : 'Root.esp'}
    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 4, paddingRight: 6, borderRadius: 10, opacity: pressed ? 0.6 : 1 })}>
    {back ? <Icon name="chevron-left" size={size * 1.15} color={colors.soil} style={{ marginLeft: -4 }} /> : null}
    <Wordmark size={size} />
  </Pressable>
);

// Scrollable page that stays readable on wide web windows. Scenes are opaque (colors.bg) and paint their own gradient.
export const Screen = ({ children, style, contentStyle }) => {
  const ref=useRef(null);
  const onScroll=useTourScroll(ref);
  const insets=useSafeAreaInsets();
  // Pages ease in (fade + slight rise) so moving between features feels continuous.
  // Starts mostly visible and always ends fully visible, even if the animation is interrupted
  // (fast tab changes, app going to background), so a page can never stay half-faded.
  const enter=useRef(new Animated.Value(0.35)).current;
  // Replays each time the page comes into view (switching tabs), so features change with one smooth motion.
  const focused=useIsFocused();
  useEffect(()=>{if(!focused)return undefined;enter.setValue(0.35);const a=Animated.timing(enter,{toValue:1,duration:240,useNativeDriver:Platform.OS!=='web'});a.start(()=>enter.setValue(1));const t=setTimeout(()=>enter.setValue(1),600);return()=>{a.stop();clearTimeout(t);enter.setValue(1);};},[focused]);
  return <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <GradientBg />
    <Animated.View style={{flex:1,opacity:enter,transform:[{translateY:enter.interpolate({inputRange:[0.35,1],outputRange:[8,0]})}]}}>
    <ScrollView ref={ref} onScroll={onScroll} scrollEventThrottle={32} style={[{ flex: 1 }, style]} contentContainerStyle={[{ padding: 16, gap: 16, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingBottom: 40 + insets.bottom }, contentStyle]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
    </Animated.View>
  </View>;
};

// Status pill: the colour always carries the same meaning (see theme.js), and an icon repeats it
// so the status is readable without relying on colour alone.
const TONE_ICON = { good: 'check-circle', warn: 'alert', water: 'water', bad: 'alert-octagon', info: 'information', muted: 'circle-outline' };
export const Pill = ({ text, tone = 'muted', icon }) => (
  <View style={[u.pill, { borderColor: toneColor[tone], backgroundColor: toneBg[tone] || glass() }]}>
    <Icon name={icon || TONE_ICON[tone] || 'circle-outline'} size={13} color={toneColor[tone]} />
    <Text style={{ color: toneColor[tone], fontSize: 12, fontWeight: '700' }}>{text}</Text>
  </View>
);

export const Btn = ({ title, onPress, tone = 'fern', disabled, busy, outline, small, style, sound = 'click', icon, accessibilityLabel }) => (
  <Pressable
    onPress={(e) => { if (sound) playSound(sound); onPress && onPress(e); }}
    disabled={disabled || busy} accessibilityRole="button" accessibilityLabel={accessibilityLabel || title}
    style={({ pressed }) => [
      u.btn, small && { padding: 8, paddingHorizontal: 14, borderRadius: 10 },
      outline ? { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors[tone] } : { backgroundColor: colors[tone] },
      (disabled || busy) && { opacity: 0.5 }, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }, style,
    ]}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {icon && !busy ? <Icon name={icon} size={small ? 16 : 18} color={outline ? colors[tone] : (tone === 'fern' ? colors.onFern : onColor(colors[tone]))} /> : null}
      <Text style={[u.btnText, tone !== 'fern' && !outline && { color: onColor(colors[tone]) }, outline && { color: colors[tone] }, small && { fontSize: 13 }]}>{busy ? 'Please wait…' : title}</Text>
    </View>
  </Pressable>
);

export const SectionTitle = ({ icon, title, right, color }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
      {icon ? <IconBadge name={icon} color={color || colors.fern} size={30} /> : null}
      <Text style={{ fontSize: 19, fontWeight: '700', color: colors.soil }}>{title}</Text>
    </View>
    {right}
  </View>
);

export const Loading = ({label='Loading…'}) => <View style={{flex:1,alignItems:'center',justifyContent:'center',padding:24}}><Text style={{color:colors.muted}}>{label}</Text></View>;

export const LoadFailure = ({ message, onRetry }) => (
  <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
    <Text style={{ color: colors.bloom, textAlign: 'center' }}>Could not load data: {message}</Text>
    <Btn title="Retry" onPress={onRetry} />
  </View>
);

export const Empty = ({ text, icon }) => (
  <View style={{ alignItems: 'center', padding: 20, gap: 6 }}>
    {icon ? <Icon name={icon} size={40} color={colors.muted} /> : null}
    <Text style={{ color: colors.muted, textAlign: 'center' }}>{text}</Text>
  </View>
);

export const Msg = ({ text, error }) =>
  text ? <Text style={{ color: error ? colors.bloom : colors.fern, marginTop: 8 }}>{text}</Text> : null;

export const Reading = ({ label, value, status, icon, color }) => (
  <View style={u.reading}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {icon ? <Icon name={icon} size={16} color={color || colors.muted} /> : null}
      <Text style={{ color: colors.muted, fontSize: 13 }}>{label}</Text>
    </View>
    <Text style={{ fontSize: 20, fontWeight: '700', color: colors.soil, marginVertical: 2 }}>{value}</Text>
    {status && <Pill text={status.label} tone={status.tone} />}
  </View>
);

// Round picture: photo if there is one, otherwise a plant icon on a soft colour.
export const Avatar = ({ look, size = 52, onPress, badge }) => {
  const inner = (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tint(look.color), alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {look.photo ? <Image source={{ uri: look.photo }} style={{ width: size, height: size }} /> : <Icon name={look.icon || 'sprout'} size={size * 0.52} color={colors.isDark ? colors.soil : colors.fern} />}
    </View>
  );
  // the badge sits outside the round (clipped) picture so it stays fully visible
  const withBadge = badge ? (
    <View style={{ width: size, height: size }}>
      {inner}
      <View style={[u.badge, { minWidth: Math.max(22, size * 0.34), height: Math.max(22, size * 0.34) }]}><Icon name={badge} size={Math.max(13, size * 0.2)} color={colors.fern} /></View>
    </View>
  ) : inner;
  return onPress ? <Pressable onPress={() => { playSound('click'); onPress(); }}>{withBadge}</Pressable> : withBadge;
};

export const Chip = ({ text, icon, active, onPress, color }) => (
  <Pressable accessibilityRole="button" accessibilityState={{ selected: !!active }} onPress={() => { playSound('click'); onPress && onPress(); }} style={[u.chip, color && { backgroundColor: tint(color) }, active && { backgroundColor: colors.fern, borderColor: colors.fern }]}>
    {icon ? <Icon name={icon} size={16} color={active ? colors.onFern : colors.fern} /> : null}
    <Text style={{ color: active ? colors.onFern : colors.soil, fontWeight: active ? '600' : '400' }}>{text}</Text>
  </Pressable>
);

// Icon on a soft tinted square, used for section headings and list rows.
export const IconBadge = ({ name, color, size = 36 }) => (
  <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: (color || colors.fern) + (colors.isDark ? '33' : '1F'), alignItems: 'center', justifyContent: 'center' }}>
    <Icon name={name} size={size * 0.56} color={color || colors.fern} />
  </View>
);

export const IconPicker = ({ value, onChange, list = PLANT_ICONS }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
    {list.map((e) => (
      <Pressable key={e} accessibilityRole="button" accessibilityLabel={e.replace(/-/g, ' ')} onPress={() => { playSound('pop'); onChange(value === e ? null : e); }} style={[u.emojiBtn, value === e && { backgroundColor: colors.fern, borderColor: colors.fern }]}>
        <Icon name={e} size={22} color={value === e ? colors.onFern : colors.fern} />
      </Pressable>
    ))}
  </View>
);
export const EmojiPicker = IconPicker;

export const ColorPicker = ({ value, onChange, list }) => {
  const light = ['#DDEFD9', '#FCE7D0', '#E3EEF8', '#F7DDE6', '#EDE3F7', '#FFF4C7', '#D9F0EC', '#EADFD3'];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {(list || light).map((c) => (
        <Pressable key={c} onPress={() => { playSound('pop'); onChange(c); }} style={[u.swatch, { backgroundColor: tint(c) }, value === c && { borderColor: colors.fern, borderWidth: 3 }]} />
      ))}
    </View>
  );
};

// Works on web too (Alert.alert with buttons does not).
export const ConfirmModal = ({ visible, title, message, confirmText = 'OK', cancelText = 'Cancel', onConfirm, onCancel, tone = 'fern' }) => (
  <Modal visible={!!visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={u.overlay}>
      <View style={u.dialog}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.soil }}>{title}</Text>
        <Text style={{ color: colors.muted, lineHeight: 21 }}>{message}</Text>
        <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {cancelText ? <Btn title={cancelText} outline tone="muted" small onPress={onCancel} /> : null}
          <Btn title={confirmText} tone={tone} small onPress={onConfirm} sound={tone === 'bloom' ? 'error' : 'click'} />
        </View>
      </View>
    </View>
  </Modal>
);

// Bottom sheet / centered dialog holding any content.
export const Sheet = ({ visible, title, onClose, children, wide }) => {
  const insets = useSafeAreaInsets();
  return (
  <Modal visible={!!visible} transparent statusBarTranslucent navigationBarTranslucent animationType="slide" onRequestClose={onClose}>
    <View style={[u.overlay, { justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 0, paddingTop: 20 + insets.top }]}>
      <View style={[u.dialog, { maxWidth: wide ? 720 : 560, maxHeight: '90%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: 20 + insets.bottom }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.soil, flex: 1 }}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close"><Icon name="close" size={22} color={colors.muted} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 12 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      </View>
    </View>
  </Modal>
  );
};

// Soil moisture bar with a tick at the watering threshold.
export const SoilBar = ({ value, threshold = 30, tone }) => {
  const n = percentage(value);
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.line, overflow: 'visible' }}>
      {n !== null && <View style={{ width: `${n}%`, height: 8, borderRadius: 4, backgroundColor: toneColor[tone] || colors.info }} />}
      <View style={{ position: 'absolute', left: `${percentage(threshold) ?? 30}%`, top: -3, width: 2, height: 14, backgroundColor: colors.soil }} />
    </View>
  );
};

// One plant as a tile (used on Home and Plants).
export const PlantCard = ({plant,mood,soil,onPress,look,compact}) => (
  <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${plant.PlantName}, ${mood.label}`} style={({pressed})=>[{flexGrow:1,flexBasis:compact?240:300,maxWidth:'100%'},pressed&&{opacity:.8}]}>
    <View style={[card,{gap:12,borderLeftWidth:4,borderLeftColor:toneColor[mood.tone]||colors.line}]}>
      <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
        <Avatar look={look||{icon:'sprout',color:PASTELS[0]}} size={46}/>
        <View style={{flex:1}}>
          <Text style={{color:colors.soil,fontSize:18,fontWeight:'700'}}>{plant.PlantName}</Text>
          <Text style={{color:colors.muted,fontSize:13}}>{[plant.species?.CommonName,plant.Location].filter(Boolean).join(' · ')||'No location assigned'}</Text>
        </View>
      </View>
      <Pill text={mood.label} tone={mood.tone}/>
      <Text style={{color:colors.muted,fontSize:12}}>{plant.device?'Linked hardware':'No linked device'} · {plant.latest?'Latest available sensor reading':'No sensor data'}</Text>
      {plant.latest&&<><View style={{flexDirection:'row',justifyContent:'space-between'}}><View style={{flexDirection:'row',alignItems:'center',gap:4}}><Icon name="water-percent" size={16} color={colors.info}/><Text style={{color:colors.soil}}>Soil {soil.text}</Text></View><View style={{flexDirection:'row',alignItems:'center',gap:4}}><Icon name="thermometer" size={16} color={colors.warning}/><Text style={{color:colors.soil}}>Air {soil.temp}</Text></View></View><SoilBar value={plant.latest.SoilMoisture} threshold={plant.settings?.SoilMoistureThreshold} tone={soil.tone}/></>}
    </View>
  </Pressable>
);

// Big icon button for quick actions.
export const Tile = ({ icon, label, onPress, color }) => (
  <Pressable onPress={() => { playSound('click'); onPress(); }} style={({ pressed }) => [{ flexGrow: 1, flexBasis: 120, minWidth: 90 }, pressed && { opacity: 0.8 }]}>
    <View style={[card, { alignItems: 'center', gap: 4, paddingVertical: 12, backgroundColor: color ? tint(color) : colors.paper }]}>
      <Icon name={icon || 'sprout'} size={24} color={colors.fern} />
      <Text style={{ fontWeight: '600', color: colors.soil, fontSize: 13, textAlign: 'center' }}>{label}</Text>
    </View>
  </Pressable>
);

// Small red / green notification dots.
export const Dot = ({ color, size = 10 }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, borderWidth: 1.5, borderColor: colors.paper }} />
);

const u = createStyles(() => ({
  pill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  btn: { padding: 13, paddingHorizontal: 18, borderRadius: 10, alignItems: 'center' },
  btnText: { color: colors.onFern, fontWeight: '600', fontSize: 15 },
  reading: { flexGrow: 1, flexBasis: '45%', backgroundColor: colors.mist, borderRadius: 10, padding: 10 },
  badge: { position: 'absolute', right: -4, bottom: -4, backgroundColor: colors.paper, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, borderWidth: 1, borderColor: colors.line },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.line, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.field },
  emojiBtn: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.field },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.line },
  overlay: { flex: 1, backgroundColor: '#0009', justifyContent: 'center', alignItems: 'center', padding: 20 },
  dialog: { backgroundColor: colors.paper, borderRadius: 18, padding: 20, gap: 14, width: '100%', maxWidth: 420 },
}));
