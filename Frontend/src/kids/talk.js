// What a plant buddy says. Lines depend on the plant's real status, so kids learn what plants need.
import { Platform } from 'react-native';
import { isOnline, plantMood } from '../logic';

export function buddyMood(p) {
  const online = p.device ? isOnline(p.device.LastSeenAt) : null;
  const m = plantMood(p.latest, p.settings, online);
  if (m.label === 'Thirsty') return 'thirsty';
  if (m.label === 'Needs light') return 'sleepy';
  return 'happy';
}

const FACTS = [
  'Did you know? I drink water through my roots, like sipping with a straw!',
  'I make my own food from sunlight. It is called photosynthesis. Try saying that fast!',
  'Ladybugs are my friends. They eat the tiny bugs that nibble my leaves.',
  'I breathe out oxygen, the air you breathe in. We make a great team!',
  'Too much water is not good for me either. My roots need a little air.',
  'If you turn my pot a little every week, I grow nice and straight.',
  'Some plants close their leaves at night, a bit like going to sleep.',
  'Bees visit flowers to collect nectar, and they help new seeds grow.',
];

export function buddyLines(p, kidName) {
  const name = p.PlantName;
  const kind = p.species?.CommonName;
  const mood = buddyMood(p);
  const hello = `Hi ${kidName || 'friend'}! I am ${name}${kind ? `, a ${kind.toLowerCase()}` : ''}. Thanks for visiting me!`;
  const status = mood === 'thirsty'
    ? 'My soil feels a bit dry. Could you ask a grown-up to give me a drink, please?'
    : mood === 'sleepy'
      ? 'It is a little dark here. I love sunshine. Maybe I could sit closer to the window?'
      : 'I feel great today! My soil is just right.';
  const care = p.species?.LightRequirements ? `I like ${p.species.LightRequirements.toLowerCase()}.` : null;
  return [hello, status, ...(care ? [care] : []), ...FACTS];
}

export const canSpeak = () => Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window;
export function speak(text, onEnd) {
  if (!canSpeak()) return false;
  try {
    window.speechSynthesis.cancel();
    const u = new window.SpeechSynthesisUtterance(text);
    u.rate = 1.02; u.pitch = 1.5;
    u.onend = onEnd; u.onerror = onEnd;
    window.speechSynthesis.speak(u);
    return true;
  } catch (e) { return false; }
}
export function stopSpeaking() { try { if (canSpeak()) window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
