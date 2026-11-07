// Shared units: sensor percentages are 0-100 (not raw ESP32 ADC values).
export const SOIL_DRY_DEFAULT = 30;
export const SOIL_IDEAL = 45;
export const SOIL_WET = 70;
export const LIGHT_DARK = 10;
export const LIGHT_LOW = 40;
export const LIGHT_IDEAL = 75;
export const TEMP_MAX_DEFAULT = 26;
export const TEMP_MARGIN = 2;
export const ONLINE_WINDOW_MIN = 5;
export const FUTURE_CLOCK_SKEW_MS = 30 * 1000;

// Invalid strings, NaN, Infinity and out-of-range values are missing data.
export const readingNumber = (value, min, max) => {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim() || !/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value.trim()))) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};
export const percentage = (value) => readingNumber(value, 0, 100);
export const displayReading = (value, unit = '', min = -50, max = 100) => {
  const n = readingNumber(value, min, max);
  return n === null ? '—' : `${n}${unit}`;
};

export const soilStatus = (v, threshold = SOIL_DRY_DEFAULT) => {
  const n = percentage(v);
  if (n === null) return { label: 'No data', tone: 'muted' };
  const limit = percentage(threshold) ?? SOIL_DRY_DEFAULT;
  if (n < limit) return { label: 'Dry', tone: 'warn' };
  if (n > SOIL_WET) return { label: 'Too wet', tone: 'water' };
  return { label: 'Good', tone: 'good' };
};

export const lightStatus = (v) => {
  const n = percentage(v);
  if (n === null) return { label: 'No data', tone: 'muted' };
  if (n <= LIGHT_DARK) return { label: 'No light', tone: 'bad' };
  if (n <= LIGHT_LOW) return { label: 'Too little', tone: 'warn' };
  if (n <= LIGHT_IDEAL) return { label: 'Ideal', tone: 'good' };
  return { label: 'Very strong', tone: 'warn' };
};

export const tempStatus = (t, settings) => {
  const n = readingNumber(t, -50, 100);
  if (n === null) return { label: 'No data', tone: 'muted' };
  const start = readingNumber(settings?.FanStartTemperature, -50, 100) ?? TEMP_MAX_DEFAULT + TEMP_MARGIN;
  const stop = readingNumber(settings?.FanStopTemperature, -50, 100) ?? TEMP_MAX_DEFAULT - TEMP_MARGIN;
  if (n > start) return { label: 'Too hot', tone: 'bad' };
  if (n <= stop) return { label: 'Perfect', tone: 'good' };
  return { label: 'OK', tone: 'good' };
};

const validTimestamp = (iso) => {
  if (typeof iso !== 'string' || !iso.trim()) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
};
export const isOnline = (iso) => {
  const t = validTimestamp(iso);
  if (t === null) return false;
  const delta = Date.now() - t;
  return delta >= -FUTURE_CLOCK_SKEW_MS && delta <= ONLINE_WINDOW_MIN * 60000;
};
export const timeAgo = (iso) => {
  const t = validTimestamp(iso);
  if (t === null) return 'unknown';
  const diff = Date.now() - t;
  if (diff < -FUTURE_CLOCK_SKEW_MS) return 'invalid timestamp';
  if (diff < 60000) return 'just now';
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min} min ago`;
  if (min < 2880) return `${Math.floor(min / 60)} h ago`;
  return `${Math.floor(min / 1440)} days ago`;
};

// Validation mirrors CHECK constraints on PlantCareSettings.
export const validateSettings = (s) => {
  if (percentage(s.SoilMoistureThreshold) === null) return 'Soil moisture threshold must be between 0 and 100.';
  if (!Number.isInteger(s.WateringDurationSeconds) || s.WateringDurationSeconds < 1 || s.WateringDurationSeconds > 60)
    return 'Watering duration must be between 1 and 60 seconds.';
  if (readingNumber(s.FanStartTemperature, -50, 100) === null || readingNumber(s.FanStopTemperature, -50, 100) === null)
    return 'Enter fan temperatures between -50 and 100°C.';
  if (s.FanStartTemperature <= s.FanStopTemperature)
    return 'Fan start temperature must be higher than the stop temperature.';
  if (typeof s.AutomaticWateringEnabled !== 'boolean' || typeof s.FanAutomaticEnabled !== 'boolean')
    return 'Choose valid automatic watering and fan settings.';
  return null;
};

export const parseNumericInput=value=>typeof value==='string'&&/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value.trim())?Number(value):NaN;

// ---- Friendly "how is my plant feeling" summary used by cards and the detail screen ----
export const plantMood = (latest, settings, online) => {
  if (online === null || online === undefined) return { emoji: '🪴', label: 'No device', tone: 'muted', hint: 'Link a Root.esp device to see how this plant feels.' };
  if (!latest) return { emoji: '⏳', label: 'Waiting', tone: 'muted', hint: 'Waiting for the first measurement.' };
  if (!online) return { emoji: '📡', label: 'Device offline', tone: 'bad', hint: 'The Root.esp device has not reported recently.' };
  const soil = soilStatus(latest.SoilMoisture, settings?.SoilMoistureThreshold);
  const temp = tempStatus(latest.AirTemperature, settings);
  const light = lightStatus(latest.LightLevel);
  if (soil.label === 'Dry') return { emoji: '🥺', label: 'Thirsty', tone: 'warn', hint: 'Soil is below your watering threshold.' };
  if (soil.label === 'Too wet') return { emoji: '😰', label: 'Too wet', tone: 'water', hint: 'Let the soil dry out a little before watering again.' };
  if (temp.label === 'Too hot') return { emoji: '🥵', label: 'Too hot', tone: 'bad', hint: 'Air temperature is above the fan limit.' };
  if (light.label === 'No light' || light.label === 'Too little') return { emoji: '😴', label: 'Needs light', tone: 'warn', hint: 'Light level is low.' };
  if (soil.label === 'No data') return { emoji: '❔', label: 'No soil data', tone: 'muted', hint: 'No valid soil reading yet.' };
  return { emoji: '😊', label: 'Happy', tone: 'good', hint: 'Everything looks fine right now.' };
};

export const greeting = (date = new Date()) => {
  const h = date.getHours();
  if (h < 5) return { text: 'Good night', emoji: '🌙' };
  if (h < 12) return { text: 'Good morning', emoji: '☀️' };
  if (h < 18) return { text: 'Good afternoon', emoji: '🌤️' };
  return { text: 'Good evening', emoji: '🌆' };
};
