// Tiny synthesized sound effects for the kids games (web only; silent elsewhere). No audio files needed.
import { Platform } from 'react-native';
let ctx = null;
const NOTES = { pop: [[660, 0.06]], success: [[523, 0.1], [659, 0.1], [784, 0.18]], error: [[220, 0.14]] };
export function kidSound(name) {
  try {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = ctx || new AC();
    let t = ctx.currentTime;
    for (const [f, d] of NOTES[name] || []) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = name === 'error' ? 'triangle' : 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + d + 0.02); t += d;
    }
  } catch (e) { /* sound is optional */ }
}
