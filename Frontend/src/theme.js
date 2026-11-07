import { StyleSheet } from 'react-native';

// ---------------------------------------------------------------------------------------------
// Root.esp colour system (v2.3)
//
// Every theme supplies the same semantic roles, so screens never hard-code colours:
//   soil      – primary text            muted  – secondary text
//   fern      – brand / primary action  onFern – text on the primary colour
//   paper     – cards                    field  – inputs          mist – subtle tinted surface
//   line      – borders                  gradient – page background
//
// Status colours are deliberately consistent across every theme (only tuned for light/dark), so
// meaning is learnt once: green = healthy, amber = needs attention, red = problem, blue = water/info.
// Each main section also has its own accent so people always know where they are:
//   Home – brand colour, My Plants – green, Design – violet, Assistant – blue, Profile – slate.
// ---------------------------------------------------------------------------------------------

const STATUS = {
  light: { success: '#2E7D4F', warning: '#B26A00', danger: '#C2413A', info: '#1F6FB2', successBg: '#E3F3E8', warningBg: '#FFF1D6', dangerBg: '#FCE4E1', infoBg: '#E1EEFA' },
  dark:  { success: '#7FD39A', warning: '#F2B65A', danger: '#FF8A80', info: '#86BFF2', successBg: '#1F3A2A', warningBg: '#3D2F17', dangerBg: '#43211F', infoBg: '#1B3247' },
};
const SECTIONS = {
  light: { plants: '#2E7D4F', design: '#7B4FB8', assistant: '#1F6FB2', profile: '#55606B' },
  dark:  { plants: '#7FD39A', design: '#C3A2F0', assistant: '#86BFF2', profile: '#B8C2CC' },
};

// Builds a full palette from a small set of hand-picked colours.
const mk = (o) => ({
  leaf: o.leaf, water: o.water, bloom: o.bloom, amber: o.amber, sun: o.sun,
  soil: o.soil, fern: o.fern, onFern: o.onFern, accent: o.accent || o.fern,
  mist: o.mist, paper: o.paper, field: o.field, line: o.line, muted: o.muted,
  rail: o.rail, railText: o.soil, railMuted: o.muted, railActive: o.mist, railGlass: o.mist, railGame: o.mist,
  gradient: o.gradient,
});

const theme = (label, description, swatch, light, dark) => ({ label, description, swatch, light: mk(light), dark: mk(dark), preview: swatch });

export const THEMES = {
  forest: theme('Forest', 'Calm greens, the Root.esp classic', ['#2F6B4F', '#DDEFD9', '#C98B3C'],
    { soil:'#1F3328', muted:'#5C6F63', fern:'#2F6B4F', onFern:'#FFFFFF', accent:'#C98B3C', leaf:'#6FAF88', water:'#2F7FA8', bloom:'#C2413A', amber:'#B26A00', sun:'#D7A852',
      mist:'#E4F1E4', paper:'#FFFFFF', field:'#FAFCF8', line:'#D3E2D4', rail:['#FFFFFF','#FFFFFF','#FFFFFF'], gradient:['#EEF6EC','#F7FAF4','#EAF3EE'] },
    { soil:'#E8F3EA', muted:'#A9C0B0', fern:'#7FCB9C', onFern:'#10281B', accent:'#E3B46B', leaf:'#83C99F', water:'#86BFF2', bloom:'#FF8A80', amber:'#F2B65A', sun:'#E6C88B',
      mist:'#243A2F', paper:'#1A2B22', field:'#22362B', line:'#35503F', rail:['#15241C','#15241C','#15241C'], gradient:['#111E18','#16251D','#132420'] }),
  ocean: theme('Sea Glass', 'Fresh teal and sand', ['#1F6F7F', '#D9F0EC', '#D39A5B'],
    { soil:'#183B44', muted:'#557178', fern:'#1F6F7F', onFern:'#FFFFFF', accent:'#D39A5B', leaf:'#5FA89C', water:'#1F6FB2', bloom:'#C2413A', amber:'#B26A00', sun:'#D0B477',
      mist:'#DDF1EF', paper:'#FFFFFF', field:'#F8FDFC', line:'#C6DFDC', rail:['#FFFFFF','#FFFFFF','#FFFFFF'], gradient:['#E8F6F4','#F6FCFB','#E5EFF7'] },
    { soil:'#E2F4F4', muted:'#A6C6CA', fern:'#6FCAD6', onFern:'#0F2D33', accent:'#E8B27A', leaf:'#8DCCC2', water:'#86BFF2', bloom:'#FF8A80', amber:'#F2B65A', sun:'#E0D19C',
      mist:'#21404A', paper:'#172E36', field:'#1F3942', line:'#335660', rail:['#122730','#122730','#122730'], gradient:['#0F2129','#152B33','#132838'] }),
  sakura: theme('Sakura', 'Soft rose with plum accents', ['#A3456F', '#F9DDE9', '#6E8F5A'],
    { soil:'#45273A', muted:'#7A5B6C', fern:'#A3456F', onFern:'#FFFFFF', accent:'#6E8F5A', leaf:'#8FAE7A', water:'#5E6FB0', bloom:'#C2413A', amber:'#B26A00', sun:'#C49B65',
      mist:'#FBE6EF', paper:'#FFFFFF', field:'#FFFBFC', line:'#EED0DD', rail:['#FFFFFF','#FFFFFF','#FFFFFF'], gradient:['#FCEEF3','#FFF9FA','#F8EFEA'] },
    { soil:'#F8E6EC', muted:'#D2AFC2', fern:'#F09AC0', onFern:'#331B28', accent:'#A9C98F', leaf:'#B5C1A0', water:'#B3BEF5', bloom:'#FF8A80', amber:'#F2B65A', sun:'#E9C39D',
      mist:'#45283A', paper:'#2B1D29', field:'#352433', line:'#5C3F52', rail:['#241823','#241823','#241823'], gradient:['#201720','#2A1E29','#2E2128'] }),
  terracotta: theme('Terracotta', 'Warm clay and olive, like real pots', ['#B3542D', '#F8E3D6', '#5F7A3A'],
    { soil:'#3D2418', muted:'#7A5E50', fern:'#B3542D', onFern:'#FFFFFF', accent:'#5F7A3A', leaf:'#7E9A55', water:'#2F7FA8', bloom:'#C2413A', amber:'#B26A00', sun:'#D9A15A',
      mist:'#F8E7DC', paper:'#FFFFFF', field:'#FFFAF6', line:'#EBD3C4', rail:['#FFFFFF','#FFFFFF','#FFFFFF'], gradient:['#FBEFE7','#FFF9F4','#F3EDE1'] },
    { soil:'#F7E7DD', muted:'#CFB2A2', fern:'#F0956A', onFern:'#33170B', accent:'#B6CC8A', leaf:'#A9C27F', water:'#86BFF2', bloom:'#FF8A80', amber:'#F2B65A', sun:'#EBC08A',
      mist:'#432A1F', paper:'#2A1C16', field:'#35241C', line:'#5A3C2F', rail:['#221611','#221611','#221611'], gradient:['#1E1511','#291C16','#262017'] }),
  lavender: theme('Lavender', 'Gentle violet and sage', ['#6B4FA8', '#ECE4F8', '#6E9A7A'],
    { soil:'#2E2442', muted:'#665C7A', fern:'#6B4FA8', onFern:'#FFFFFF', accent:'#6E9A7A', leaf:'#86AE92', water:'#3F6FC0', bloom:'#C2413A', amber:'#B26A00', sun:'#CDAE6A',
      mist:'#EEE7F9', paper:'#FFFFFF', field:'#FCFBFF', line:'#DDD3EE', rail:['#FFFFFF','#FFFFFF','#FFFFFF'], gradient:['#F3EEFB','#FBF9FE','#EEF3F0'] },
    { soil:'#EEE8F9', muted:'#BDB1D6', fern:'#B9A0F0', onFern:'#21153A', accent:'#A6D2B2', leaf:'#A6D2B2', water:'#9DB8F5', bloom:'#FF8A80', amber:'#F2B65A', sun:'#E3CB91',
      mist:'#332A4A', paper:'#211B31', field:'#2A223C', line:'#463C61', rail:['#1B162A','#1B162A','#1B162A'], gradient:['#18142A','#1F1A31','#1A2228'] }),
  sunflower: theme('Sunflower', 'Bright honey and leaf green', ['#8A6A00', '#FFF1C2', '#3F7D3A'],
    { soil:'#3A2F0E', muted:'#6F6440', fern:'#8A6A00', onFern:'#FFFFFF', accent:'#3F7D3A', leaf:'#6DA45F', water:'#2F7FA8', bloom:'#C2413A', amber:'#B26A00', sun:'#E1B12C',
      mist:'#FFF3CC', paper:'#FFFFFF', field:'#FFFDF5', line:'#EEDFAE', rail:['#FFFFFF','#FFFFFF','#FFFFFF'], gradient:['#FFF8E1','#FFFDF6','#EFF6E6'] },
    { soil:'#FBF2D5', muted:'#D8C995', fern:'#F2C94C', onFern:'#2E2300', accent:'#9DD18F', leaf:'#9DD18F', water:'#86BFF2', bloom:'#FF8A80', amber:'#F2B65A', sun:'#F2C94C',
      mist:'#3D3415', paper:'#26210F', field:'#302915', line:'#554922', rail:['#1F1B0C','#1F1B0C','#1F1B0C'], gradient:['#1C180B','#24200F','#1B2213'] }),
  studio: theme('Studio neutral', 'Quiet greys for a minimal look', ['#354C40', '#E8ECE8', '#53788E'],
    { soil:'#242B28', muted:'#68736D', fern:'#354C40', onFern:'#FFFFFF', accent:'#53788E', leaf:'#73847A', water:'#53788E', bloom:'#B4473F', amber:'#937957', sun:'#C2A46A',
      mist:'#E8ECE8', paper:'#FFFFFF', field:'#FAFBF9', line:'#DFE4DF', rail:['#FFFFFF','#FFFFFF','#FFFFFF'], gradient:['#F5F7F4','#F5F7F4','#F5F7F4'] },
    { soil:'#ECEDE9', muted:'#ABB4AF', fern:'#B7C1B8', onFern:'#202522', accent:'#9DB7C6', leaf:'#9DA9A0', water:'#9DB7C6', bloom:'#E59A92', amber:'#D8B98B', sun:'#D8C08B',
      mist:'#303735', paper:'#222825', field:'#292F2C', line:'#424C46', rail:['#202522','#202522','#202522'], gradient:['#1A201E','#1A201E','#1A201E'] }),
  contrast: theme('High contrast', 'Maximum legibility', ['#000000', '#FFFFFF', '#0047AB'],
    { soil:'#000000', muted:'#2B2B2B', fern:'#0B5D1E', onFern:'#FFFFFF', accent:'#0047AB', leaf:'#0B5D1E', water:'#0047AB', bloom:'#B00020', amber:'#8A4B00', sun:'#8A6A00',
      mist:'#EDEDED', paper:'#FFFFFF', field:'#FFFFFF', line:'#000000', rail:['#FFFFFF','#FFFFFF','#FFFFFF'], gradient:['#FFFFFF','#FFFFFF','#FFFFFF'] },
    { soil:'#FFFFFF', muted:'#E0E0E0', fern:'#7CFF9B', onFern:'#000000', accent:'#8AB4FF', leaf:'#7CFF9B', water:'#8AB4FF', bloom:'#FF6B6B', amber:'#FFC24B', sun:'#FFE066',
      mist:'#1A1A1A', paper:'#000000', field:'#0A0A0A', line:'#FFFFFF', rail:['#000000','#000000','#000000'], gradient:['#000000','#000000','#000000'] }),
};

// Bright, friendly palette for the kids interface (independent of the adult theme).
export const KID = {
  sky: ['#7FD3FF', '#BDEBFF', '#FFF4C2'], grass: '#5CC46B', grassDark: '#2F9E44', sun: '#FFC93C', berry: '#FF6B9A',
  grape: '#9B6BFF', orange: '#FF9F43', ocean: '#3FA9F5', ink: '#24324A', paper: '#FFFFFF', cream: '#FFF9EC',
  cards: ['#FFE3EC', '#E3F4FF', '#E8FFE1', '#FFF2D1', '#EFE6FF', '#E0FFF7'], cardInk: ['#C2185B', '#1565C0', '#2E7D32', '#E65100', '#5E35B1', '#00796B'],
};

// Backward-compatible names from earlier releases; keep saved choices readable.
export const LEGACY_THEMES = { meadow:'forest', midnight:'ocean', sunrise:'sakura' };
export const THEME_IDS = Object.keys(THEMES);
export const DEFAULT_THEME = 'forest';
export const colors = {};
export const toneColor = {};
export const toneBg = {};
// Style objects are replaced (never mutated) on theme change: React Native freezes style objects
// once they are rendered, so mutating them throws in development. ES live bindings keep imports current.
export let card = {};
export let inputStyle = {};

// Soft card tints used for plant avatars / colour pickers (light values are the stored ids).
const LIGHT_PASTELS = ['#DDEFD9', '#FCE7D0', '#E3EEF8', '#F7DDE6', '#EDE3F7', '#FFF4C7', '#D9F0EC', '#EADFD3'];
const DARK_PASTELS = ['#2D4938', '#4D4034', '#2F4557', '#583947', '#423C5C', '#514735', '#294D51', '#443D36'];
export const PASTELS = [...LIGHT_PASTELS];

let version = 0;
export const themeVersion = () => version;
let applied = null;
export function applyTheme(id = DEFAULT_THEME, appearance = 'light') {
  // Called on every render of PrefsProvider: only rebuild when the theme really changes.
  const sig = `${id}|${appearance}`;
  if (sig === applied) return;
  applied = sig;
  const resolved = LEGACY_THEMES[id] || id;
  const t = THEMES[resolved] || THEMES[DEFAULT_THEME];
  const dark = appearance === 'dark';
  const p = dark ? t.dark : t.light;
  const status = STATUS[dark ? 'dark' : 'light'];
  for (const k of Object.keys(colors)) delete colors[k];
  Object.assign(colors, p, status, {
    isDark: dark, themeId: THEMES[resolved] ? resolved : DEFAULT_THEME, bg: p.gradient[1],
    section: { home: p.fern, ...SECTIONS[dark ? 'dark' : 'light'] },
  });
  // Section colours are also usable as Btn tones (tone="design", tone="assistant", ...).
  Object.assign(colors, { plants: colors.section.plants, design: colors.section.design, assistant: colors.section.assistant, profile: colors.section.profile });
  PASTELS.splice(0, PASTELS.length, ...(dark ? DARK_PASTELS : LIGHT_PASTELS));
  Object.assign(toneColor, { good: status.success, warn: status.warning, water: status.info, bad: status.danger, info: status.info, muted: colors.muted });
  Object.assign(toneBg, { good: status.successBg, warn: status.warningBg, water: status.infoBg, bad: status.dangerBg, info: status.infoBg, muted: colors.mist });
  card = Object.freeze({ backgroundColor: colors.paper, borderRadius: 14, padding: 20, borderWidth: 1, borderColor: colors.line });
  inputStyle = Object.freeze({ borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, fontSize: 16, backgroundColor: colors.field, color: colors.soil });
  version++;
}
applyTheme();
export const tint = (hex) => { const i = LIGHT_PASTELS.indexOf(hex); return i >= 0 ? PASTELS[i] : hex; };
export const glass = () => colors.isDark ? '#FFFFFF14' : '#FFFFFFAA';
export const createStyles = (factory) => {
  let cached = null, at = -1;
  return new Proxy({}, { get:(_,key)=>{ if(at !== version) { cached=StyleSheet.create(factory());at=version; }return cached[key]; } });
};

// Professional icon set (Material Community Icons names) replacing the old emoji pickers.
export const PLANT_ICONS = ['sprout','leaf','flower','flower-tulip','cactus','tree','pine-tree','palm-tree','grass','spa','seed','mushroom','fruit-cherries','fruit-grapes','carrot','chili-mild','corn','food-apple','clover','bee','butterfly','ladybug','white-balance-sunny','water'];
export const CATEGORIES = ['Houseplant','Herb','Vegetable','Fruit','Flower','Succulent','Other'];
export const CATEGORY_ICON = {Houseplant:'leaf',Herb:'spa',Vegetable:'carrot',Fruit:'fruit-cherries',Flower:'flower',Succulent:'cactus',Other:'sprout'};
// Kept for older saved data and the species catalogue; never rendered in the adult interface.
export const EMOJIS = PLANT_ICONS;
export const CATEGORY_EMOJI = CATEGORY_ICON;
export const BREAKPOINT = 900;
export const MAX_WIDTH = 1080;
// Readable text colour (near-black or white) for any solid background.
export const onColor = (hex) => {
  const m = /^#?([0-9a-f]{6})/i.exec(hex || ''); if (!m) return '#FFFFFF';
  const n = parseInt(m[1], 16), ch = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  const L = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  return L > 0.4 ? '#14201A' : '#FFFFFF';
};
