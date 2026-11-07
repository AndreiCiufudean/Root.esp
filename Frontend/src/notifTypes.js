// Notification classes:
//   urgent     -> red dot: real alerts from the plants / devices (dry soil, offline device, ...)
//   onboarding -> the friendly, playful starter alert. Listed under "Alerts" but never a red dot,
//                 because it does not describe a real fault or measurement.
//   social     -> likes, comments, follows
//   info       -> welcome messages, tips, news
export const URGENT_TYPES = ['SoilDry', 'DeviceOffline', 'HardwareWarning', 'TempHigh', 'WateringFailed'];
export const SOCIAL_TYPES = ['Like', 'Comment', 'Follow'];
export const NATURE_TYPES = ['NatureDiscovery','NatureAchievement'];
export const WELCOME_TYPE = 'Welcome';
export const ONBOARDING_TYPE = 'OnboardingAlert';
export const kindOf = (type) => (URGENT_TYPES.includes(type) ? 'urgent' : type === ONBOARDING_TYPE ? 'onboarding' : SOCIAL_TYPES.includes(type) ? 'social' : 'info');
// Shown in the "Alerts" list of the notifications screen.
export const isAlertKind = (kind) => kind === 'urgent' || kind === 'onboarding';
export const TYPE_EMOJI = { SoilDry: '🥺', DeviceOffline: '📡', HardwareWarning: '⚠️', TempHigh: '🥵', WateringFailed: '🚱', Watered: '💧', Like: '❤️', Comment: '💬', Follow: '👤', Welcome: '🌱', Tip: '💡', OnboardingAlert: '✨', NatureDiscovery:'🌿', NatureAchievement:'🏅' };
