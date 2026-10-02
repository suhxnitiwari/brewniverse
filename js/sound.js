// The sound of coffee, synthesized live with the Web Audio API (no audio files).
// One global switch. Ambient "beds" crossfade as you scroll; short effects fire on interactions;
// loops run while you hold something (grinder, steam wand, roaster, pour).

const listeners = new Set();
let ctx = null, master = null, noiseBuf = null;
let on = false;
try { on = localStorage.getItem('brew-sound') === 'on'; } catch {}

function boot() {
  if (ctx) return ctx;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    const len = ctx.sampleRate * 3;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    // pink-ish noise: smoother and less harsh than white
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
    }
  } catch { ctx = null; }
  return ctx;
}

const now = () => ctx.currentTime;
function noise() { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.loopStart = Math.random(); return s; }
function filt(type, f, q = 0.7) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
function gain(v = 0) { const g = ctx.createGain(); g.gain.value = v; return g; }
function env(g, peak, a, d) {
  const t = now();
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

// ---------- one-shots ----------
function tone(freq, { type = 'sine', peak = 0.08, a = 0.004, d = 0.4, to = null, delay = 0 } = {}) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
  const g = gain(); o.connect(g).connect(master);
  const t = now() + delay;
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + a + d);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  o.start(t); o.stop(t + a + d + 0.05);
}
function burst({ type = 'bandpass', f = 1500, q = 1, peak = 0.3, a = 0.002, d = 0.05, delay = 0 } = {}) {
  const s = noise(); const b = filt(type, f, q); const g = gain();
  s.connect(b).connect(g).connect(master);
  const t = now() + delay;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  s.start(t); s.stop(t + a + d + 0.05);
}

const SFX = {
  click: () => { burst({ f: 3200, q: 4, peak: 0.12, d: 0.025 }); tone(1800, { peak: 0.02, d: 0.03 }); },
  // ceramic: a few inharmonic partials that ring briefly
  clink: () => [2637, 3951, 5274, 6900].forEach((f, i) => tone(f * (0.98 + Math.random() * 0.04), { peak: 0.05 / (i + 1), d: 0.5 - i * 0.08 })),
  drop: () => { tone(900, { peak: 0.08, d: 0.06, to: 400 }); burst({ f: 2500, q: 3, peak: 0.08, d: 0.03 }); },
  crack: () => { burst({ f: 1400 + Math.random() * 2600, q: 1.2, peak: 0.5, d: 0.04 }); },
  pick: () => { burst({ type: 'lowpass', f: 900, peak: 0.25, d: 0.08 }); tone(220, { peak: 0.05, d: 0.08, to: 140 }); },
  paper: () => burst({ type: 'highpass', f: 2500, peak: 0.08, a: 0.03, d: 0.18 }),
  puff: () => burst({ type: 'highpass', f: 2800, peak: 0.25, a: 0.01, d: 0.5 }),
  clunk: () => { tone(110, { type: 'triangle', peak: 0.25, d: 0.15, to: 70 }); burst({ type: 'lowpass', f: 600, peak: 0.2, d: 0.06 }); setTimeout(() => SFX.click(), 90); },
  tap: () => { tone(160, { type: 'triangle', peak: 0.2, d: 0.08, to: 90 }); burst({ type: 'lowpass', f: 1200, peak: 0.15, d: 0.04 }); },
  chime: () => [660, 990].forEach((f, i) => tone(f, { peak: 0.05, d: 0.9, delay: i * 0.09 })),
  wrong: () => tone(220, { type: 'triangle', peak: 0.08, d: 0.3, to: 180 }),
  bloom: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, { peak: 0.03, d: 1.4, delay: i * 0.12 })),
};

// ---------- loops (held actions) ----------
// each returns { set(x), stop() }
const LOOPS = {
  grind(level = 0.5) {
    // coarse = low growl, fine = high whine
    const s = noise(); const b = filt('bandpass', 600, 1.4); const g = gain();
    const motor = ctx.createOscillator(); motor.type = 'sawtooth'; motor.frequency.value = 95;
    const mg = gain(0.018); const lfo = ctx.createOscillator(); lfo.frequency.value = 31; const lg = gain(0.03);
    lfo.connect(lg).connect(g.gain);
    s.connect(b).connect(g).connect(master); motor.connect(mg).connect(master);
    s.start(); motor.start(); lfo.start();
    g.gain.linearRampToValueAtTime(0.09, now() + 0.15);
    const set = l => { b.frequency.setTargetAtTime(350 + l * 1600, now(), 0.05); motor.frequency.setTargetAtTime(80 + l * 70, now(), 0.05); };
    set(level);
    return { set, stop() { g.gain.setTargetAtTime(0, now(), 0.05); mg.gain.setTargetAtTime(0, now(), 0.05); setTimeout(() => { s.stop(); motor.stop(); lfo.stop(); }, 300); } };
  },
  steam(level = 1) {
    // level 1 = tip at surface (tss-tss), 0 = deep (low roar)
    const s = noise(); const hp = filt('highpass', 2600); const lp = filt('lowpass', 9000); const g = gain();
    const lfo = ctx.createOscillator(); lfo.frequency.value = 7; const lg = gain(0);
    lfo.connect(lg).connect(g.gain);
    s.connect(hp).connect(lp).connect(g).connect(master); s.start(); lfo.start();
    g.gain.linearRampToValueAtTime(0.11, now() + 0.1);
    const set = l => { hp.frequency.setTargetAtTime(700 + l * 2400, now(), 0.08); lg.gain.setTargetAtTime(l * 0.06, now(), 0.08); };
    set(level);
    return { set, stop() { g.gain.setTargetAtTime(0, now(), 0.06); lg.gain.setTargetAtTime(0, now(), 0.06); setTimeout(() => { s.stop(); lfo.stop(); }, 350); } };
  },
  pour(level = 0.5) {
    // liquid into ceramic: filtered noise + little bubbly blips; higher pour = brighter
    const s = noise(); const b = filt('bandpass', 900, 0.9); const g = gain();
    s.connect(b).connect(g).connect(master); s.start();
    g.gain.linearRampToValueAtTime(0.07, now() + 0.08);
    let alive = true;
    const blip = () => { if (!alive) return; tone(500 + Math.random() * 900, { peak: 0.012, d: 0.05, to: 900 + Math.random() * 600 }); setTimeout(blip, 40 + Math.random() * 90); };
    blip();
    const set = l => b.frequency.setTargetAtTime(500 + l * 1500, now(), 0.06);
    set(level);
    return { set, stop() { alive = false; g.gain.setTargetAtTime(0, now(), 0.05); setTimeout(() => s.stop(), 300); } };
  },
  pump() {
    // vibratory espresso pump hum + liquid trickle
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 50;
    const lp = filt('lowpass', 220); const g = gain();
    o.connect(lp).connect(g).connect(master); o.start();
    g.gain.linearRampToValueAtTime(0.08, now() + 0.2);
    const s = noise(); const b = filt('bandpass', 1300, 1.5); const g2 = gain(0.0); s.connect(b).connect(g2).connect(master); s.start();
    g2.gain.linearRampToValueAtTime(0.03, now() + 3);
    return { set() {}, stop() { g.gain.setTargetAtTime(0, now(), 0.06); g2.gain.setTargetAtTime(0, now(), 0.06); setTimeout(() => { o.stop(); s.stop(); }, 350); } };
  },
  roaster(level = 0) {
    // drum rumble + gas roar that intensifies with temperature
    const s = noise(); const lp = filt('lowpass', 300); const g = gain();
    const drum = ctx.createOscillator(); drum.type = 'triangle'; drum.frequency.value = 42; const dg = gain(0.04);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.9; const lg = gain(0.02); lfo.connect(lg).connect(dg.gain);
    s.connect(lp).connect(g).connect(master); drum.connect(dg).connect(master);
    s.start(); drum.start(); lfo.start();
    const set = l => { g.gain.setTargetAtTime(0.06 + l * 0.12, now(), 0.2); lp.frequency.setTargetAtTime(260 + l * 700, now(), 0.2); };
    set(level);
    return { set, stop() { g.gain.setTargetAtTime(0, now(), 0.15); dg.gain.setTargetAtTime(0, now(), 0.15); setTimeout(() => { s.stop(); drum.stop(); lfo.stop(); }, 600); } };
  },
};

// ---------- ambient beds ----------
const BEDS = {
  farm() {
    const s = noise(); const b = filt('bandpass', 700, 0.4); const g = gain(); // leaves
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.15; const lg = gain(0.012); lfo.connect(lg).connect(g.gain);
    s.connect(b).connect(g).connect(master); s.start(); lfo.start();
    let alive = true;
    const bird = () => {
      if (!alive) return;
      const base = 2400 + Math.random() * 1800, n = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) tone(base, { peak: 0.012, a: 0.01, d: 0.07, to: base * (1.25 + Math.random() * 0.3), delay: i * 0.11 });
      setTimeout(bird, 1800 + Math.random() * 4200);
    };
    setTimeout(bird, 800);
    return { gain: g, level: 0.025, stop() { alive = false; setTimeout(() => { s.stop(); lfo.stop(); }, 1500); } };
  },
  water() {
    const s = noise(); const b = filt('bandpass', 1100, 0.6); const g = gain();
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.4; const lg = gain(0.012); lfo.connect(lg).connect(g.gain);
    s.connect(b).connect(g).connect(master); s.start(); lfo.start();
    return { gain: g, level: 0.03, stop() { setTimeout(() => { s.stop(); lfo.stop(); }, 1500); } };
  },
  wind() {
    const s = noise(); const b = filt('lowpass', 500); const g = gain();
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.08; const lg = gain(80); lfo.connect(lg).connect(b.frequency);
    s.connect(b).connect(g).connect(master); s.start(); lfo.start();
    return { gain: g, level: 0.035, stop() { setTimeout(() => { s.stop(); lfo.stop(); }, 1500); } };
  },
  sea() {
    const s = noise(); const b = filt('lowpass', 420); const g = gain();
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11; const lg = gain(0.03); lfo.connect(lg).connect(g.gain);
    s.connect(b).connect(g).connect(master); s.start(); lfo.start();
    return { gain: g, level: 0.045, stop() { setTimeout(() => { s.stop(); lfo.stop(); }, 1500); } };
  },
  roaster() {
    const s = noise(); const b = filt('lowpass', 320); const g = gain();
    const drum = ctx.createOscillator(); drum.type = 'triangle'; drum.frequency.value = 40; const dg = gain(0.015);
    s.connect(b).connect(g).connect(master); drum.connect(dg).connect(g); s.start(); drum.start();
    return { gain: g, level: 0.05, stop() { setTimeout(() => { s.stop(); drum.stop(); }, 1500); } };
  },
  cafe() {
    const s = noise(); const b = filt('bandpass', 500, 0.5); const g = gain(); // murmur
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.3; const lg = gain(0.006); lfo.connect(lg).connect(g.gain);
    s.connect(b).connect(g).connect(master); s.start(); lfo.start();
    let alive = true;
    const clink = () => {
      if (!alive) return;
      if (on) [2637, 3951, 5274].forEach((f, i) => tone(f * (0.97 + Math.random() * 0.06), { peak: 0.012 / (i + 1), d: 0.4 }));
      setTimeout(clink, 2500 + Math.random() * 6000);
    };
    setTimeout(clink, 1500);
    return { gain: g, level: 0.02, stop() { alive = false; setTimeout(() => { s.stop(); lfo.stop(); }, 1500); } };
  },
};
let bed = null, bedName = 'none';

function setBed(name) {
  if (name === bedName) return;
  bedName = name;
  if (!on || !ctx) return;
  const old = bed;
  if (old) { old.gain.gain.setTargetAtTime(0, now(), 0.6); old.stop(); }
  bed = null;
  if (BEDS[name]) {
    bed = BEDS[name]();
    bed.gain.gain.setTargetAtTime(bed.level, now(), 0.8);
  }
}

export const Sound = {
  get on() { return on; },
  subscribe(fn) { listeners.add(fn); fn(on); },
  toggle(force) {
    on = force ?? !on;
    try { localStorage.setItem('brew-sound', on ? 'on' : 'off'); } catch {}
    if (on) {
      boot();
      ctx?.resume();
      const name = bedName; bedName = 'none'; setBed(name);
    } else if (bed) {
      bed.gain.gain.setTargetAtTime(0, now(), 0.2); bed.stop(); bed = null;
    }
    listeners.forEach(fn => fn(on));
  },
  sfx(name) {
    if (!on || !boot() || !SFX[name]) return;
    ctx.resume();
    try { SFX[name](); } catch {}
  },
  // start a held sound; returns a handle (or a harmless stub when sound is off)
  loop(name, level) {
    if (!on || !boot() || !LOOPS[name]) return { set() {}, stop() {} };
    ctx.resume();
    try { return LOOPS[name](level); } catch { return { set() {}, stop() {} }; }
  },
  ambience(name) { setBed(name); },
};
