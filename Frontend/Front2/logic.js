// Thresholds copied from SeraSmart.ino so the app and the ESP32 agree.
export const SOIL_DRY_DEFAULT = 30; // uscat: soil < 30 -> dry
export const SOIL_IDEAL = 45;       // ideal: pump stops at 45
export const SOIL_WET = 70;         // ud: soil > 70 -> too wet
export const LIGHT_DARK = 50;       // <= 50 no light
export const LIGHT_LOW = 500;       // <= 500 not enough
export const LIGHT_IDEAL = 2000;    // <= 2000 ideal, above: very strong (raw ADC 0-4095)
export const TEMP_MAX_DEFAULT = 26; // temp_max
export const TEMP_MARGIN = 2;       // threshold_temp -> fan on above 28, off at or below 24
export const ONLINE_WINDOW_MIN = 5;

export const soilStatus = (v, threshold = SOIL_DRY_DEFAULT) => {
  if (v == null) return { label: 'No data', tone: 'muted' };
  if (v < threshold) return { label: 'Dry', tone: 'warn' };
  if (v > SOIL_WET) return { label: 'Too wet', tone: 'water' };
  return { label: 'Good', tone: 'good' };
};

export const lightStatus = (v) => {
  if (v == null) return { label: 'No data', tone: 'muted' };
  if (v <= LIGHT_DARK) return { label: 'No light', tone: 'bad' };
  if (v <= LIGHT_LOW) return { label: 'Too little', tone: 'warn' };
  if (v <= LIGHT_IDEAL) return { label: 'Ideal', tone: 'good' };
  return { label: 'Very strong', tone: 'warn' };
};

export const tempStatus = (t, settings) => {
  if (t == null) return { label: 'No data', tone: 'muted' };
  const start = settings?.FanStartTemperature ?? TEMP_MAX_DEFAULT + TEMP_MARGIN;
  const stop = settings?.FanStopTemperature ?? TEMP_MAX_DEFAULT - TEMP_MARGIN;
  if (t > start) return { label: 'Too hot', tone: 'bad' };
  if (t <= stop) return { label: 'Perfect', tone: 'good' };
  return { label: 'OK', tone: 'good' };
};

export const isOnline = (iso) =>
  !!iso && Date.now() - new Date(iso).getTime() < ONLINE_WINDOW_MIN * 60000;

export const timeAgo = (iso) => {
  if (!iso) return 'never';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
};

// Validation mirrors the CHECK constraints on PlantCareSettings.
export const validateSettings = (s) => {
  if (!(s.SoilMoistureThreshold >= 0 && s.SoilMoistureThreshold <= 100))
    return 'Soil moisture threshold must be between 0 and 100.';
  if (!(Number.isInteger(s.WateringDurationSeconds) && s.WateringDurationSeconds > 0))
    return 'Watering duration must be a whole number above 0.';
  if (Number.isNaN(s.FanStartTemperature) || Number.isNaN(s.FanStopTemperature))
    return 'Enter both fan temperatures.';
  if (!(s.FanStartTemperature > s.FanStopTemperature))
    return 'Fan start temperature must be higher than the stop temperature.';
  return null;
};
