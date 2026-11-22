// Tidecallers — sounds: tiny WebAudio bleeps generated in code, no assets.
// The audio context is created on the first user gesture (browsers require
// it); every sound is one or two short oscillator notes. M toggles mute.

let ctx = null;
let muted = false;

export function unlockAudio() {
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    } catch (e) {
      ctx = null;
    }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(freq, dur, type, gain, when = 0) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

// Named game sounds. Each is a small phrase of tones.
export function sfx(name) {
  if (!ctx || muted) return;
  switch (name) {
    case 'click': tone(660, 0.06, 'triangle', 0.12); break;
    case 'deal': tone(520, 0.07, 'triangle', 0.10); tone(780, 0.07, 'triangle', 0.08, 0.06); break;
    case 'play': tone(440, 0.09, 'square', 0.07); tone(660, 0.12, 'square', 0.07, 0.07); break;
    case 'hit': tone(180, 0.16, 'sawtooth', 0.14); tone(120, 0.18, 'sawtooth', 0.12, 0.05); break;
    case 'block': tone(300, 0.12, 'triangle', 0.12); tone(240, 0.14, 'triangle', 0.10, 0.06); break;
    case 'heal': tone(523, 0.12, 'sine', 0.12); tone(784, 0.16, 'sine', 0.10, 0.09); break;
    case 'draw': tone(880, 0.05, 'triangle', 0.08); break;
    case 'tide': tone(587, 0.10, 'sine', 0.12); tone(880, 0.14, 'sine', 0.12, 0.08); break;
    case 'turn': tone(392, 0.08, 'triangle', 0.10); break;
    case 'win':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.14, i * 0.12));
      break;
    case 'lose':
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.24, 'triangle', 0.12, i * 0.14));
      break;
    default: break;
  }
}
