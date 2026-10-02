// Roast: hold the burner, watch the bean change, hear it crack.
import { ROAST_COLORS, ROAST_STAGES, FIRST_CRACK, SECOND_CRACK } from './data.js';
import { Sound } from './sound.js';

const $ = id => document.getElementById(id);
const MIN = 20, MAX = 260;
const METERS = [['acidity', 'Acidity'], ['body', 'Body'], ['bitterness', 'Bitterness'], ['oil', 'Surface oil']];

const state = { temp: MIN, heating: false, last: 0 };
let hum = null;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- color + stage math ----------

const lerp = (a, b, t) => a + (b - a) * t;
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

function colorAt(t) {
  for (let i = 0; i < ROAST_COLORS.length - 1; i++) {
    const [t0, c0] = ROAST_COLORS[i], [t1, c1] = ROAST_COLORS[i + 1];
    if (t <= t1) {
      const f = Math.max(0, (t - t0) / (t1 - t0));
      const a = hex(c0), b = hex(c1);
      return a.map((v, j) => Math.round(lerp(v, b[j], f)));
    }
  }
  return hex(ROAST_COLORS[ROAST_COLORS.length - 1][1]);
}

function stageAt(t) {
  let s = ROAST_STAGES[0];
  for (const st of ROAST_STAGES) if (t >= st.from) s = st;
  return s;
}

// Smoothly blend meter values between drinkable stages.
function metersAt(t) {
  const brewable = ROAST_STAGES.filter(s => s.meters);
  if (t < brewable[0].from) return null;
  for (let i = 0; i < brewable.length - 1; i++) {
    const a = brewable[i], b = brewable[i + 1];
    if (t < b.from) {
      const f = (t - a.from) / (b.from - a.from);
      return Object.fromEntries(Object.keys(a.meters).map(k => [k, lerp(a.meters[k], b.meters[k], f)]));
    }
  }
  return brewable[brewable.length - 1].meters;
}

function pop() { Sound.sfx('crack'); }

function crackBurst(kind) {
  const first = kind === 'first';
  const count = first ? 9 : 16;
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      pop();
      spark(first);
    }, Math.random() * (first ? 1600 : 1200));
  }
  // the whole room flashes the moment it cracks
  const flash = $('roastFlash');
  flash.innerHTML = first ? `<b>Crack.</b><span>First crack · ${FIRST_CRACK}°C</span>` : `<b>Crack.</b><span>Second crack · ${SECOND_CRACK}°C</span>`;
  flash.classList.remove('on'); void flash.offsetWidth; flash.classList.add('on');
}

function spark(big) {
  if (reduceMotion) return;
  const g = $('roastParticles');
  const a = Math.random() * Math.PI * 2;
  const d = 90 + Math.random() * 50;
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  el.setAttribute('cx', 120 + Math.cos(a) * 60);
  el.setAttribute('cy', 150 + Math.sin(a) * 80);
  el.setAttribute('r', big ? 3 : 2);
  el.setAttribute('class', 'spark');
  el.style.setProperty('--dx', `${Math.cos(a) * d * 0.5}px`);
  el.style.setProperty('--dy', `${Math.sin(a) * d * 0.5}px`);
  g.appendChild(el);
  setTimeout(() => el.remove(), 700);
  const bean = $('roastBeanBody');
  bean.classList.remove('jolt'); void bean.getBBox(); bean.classList.add('jolt');
}

// ---------- temperature changes ----------

function setTemp(t, fromUser = false) {
  const prev = state.temp;
  state.temp = Math.max(MIN, Math.min(MAX, t));
  if (prev < FIRST_CRACK && state.temp >= FIRST_CRACK) crackBurst('first');
  if (prev < SECOND_CRACK && state.temp >= SECOND_CRACK) crackBurst('second');
  if (!fromUser) $('tempSlider').value = Math.round(state.temp);
  render();
}

function heatTick(now) {
  if (!state.heating) return;
  const dt = Math.min(0.05, (now - state.last) / 1000);
  state.last = now;
  const rate = state.temp < 150 ? 32 : 14; // °C per second: fast drying, slow development
  setTemp(state.temp + rate * dt);
  hum?.set(heatLevel());
  if (state.temp >= MAX) return stopHeat();
  requestAnimationFrame(heatTick);
}

function startHeat() {
  if (state.heating) return;
  hum = Sound.loop('roaster', heatLevel());
  state.heating = true;
  state.last = performance.now();
  $('flames').classList.add('on');
  requestAnimationFrame(heatTick);
}

function heatLevel() { return Math.max(0, Math.min(1, (state.temp - MIN) / (MAX - MIN))); }

function stopHeat() {
  hum?.stop(); hum = null;
  state.heating = false;
  $('flames').classList.remove('on');
}

// ---------- drawing ----------

function render() {
  const t = state.temp;
  const [r, g, b] = colorAt(t);
  const stage = stageAt(t);
  const m = metersAt(t);

  $('beanFill').style.fill = `rgb(${r},${g},${b})`;
  $('beanCrease').style.stroke = `rgb(${Math.round(r * 0.55)},${Math.round(g * 0.55)},${Math.round(b * 0.55)})`;
  const oil = m ? m.oil / 5 : 0;
  $('beanOil').style.opacity = 0.12 + oil * 0.3;
  // beans puff up as they roast
  const puff = 1 + 0.14 * Math.max(0, Math.min(1, (t - 150) / 100));
  $('roastBeanBody').style.transform = `scale(${puff})`;

  const smoke = $('roastSmoke');
  const smokeLevel = t < 205 ? 0 : t < 230 ? 1 : t < 248 ? 2 : 3;
  if (smoke.dataset.level !== String(smokeLevel)) {
    smoke.dataset.level = smokeLevel;
    smoke.innerHTML = smokeLevel
      ? Array.from({ length: smokeLevel * 3 }, (_, i) =>
        `<circle class="puff" cx="${90 + i * 22 % 70}" cy="60" r="${10 + (i % 3) * 5}" style="animation-delay:${i * 0.35}s" />`).join('')
      : '';
  }

  $('tempNow').textContent = Math.round(t);
  $('roast').style.setProperty('--heat', heatLevel().toFixed(3));
  $('roastName').textContent = stage.name === 'Green' || stage.name === 'Drying' || stage.name === 'Browning' || stage.name === 'Burnt'
    ? stage.name : `${stage.name} roast`;
  $('roastNote').textContent = stage.note;

  $('flavorMeters').innerHTML = METERS.map(([k, label]) => {
    const v = m ? m[k] : 0;
    return `<div class="fm ${m ? '' : 'off'}"><span>${label}</span>
      <div class="fm-track"><div class="fm-fill" style="width:${(v / 5) * 100}%"></div></div></div>`;
  }).join('') + (m ? '' : '<p class="fm-note">Not ready to brew yet. Keep roasting.</p>');

  $('bestFor').innerHTML = stage.best.length
    ? `<span class="mini-title">Best for</span>${stage.best.map(x => `<span class="chip static">${x}</span>`).join('')}`
    : '';
}

export function initRoast() {
  const heat = $('heatBtn');
  heat.addEventListener('pointerdown', e => { if (e.button === 0) { e.preventDefault(); try { heat.setPointerCapture(e.pointerId); } catch {} startHeat(); } });
  ['pointerup', 'pointercancel', 'lostpointercapture', 'blur'].forEach(ev => heat.addEventListener(ev, stopHeat));
  heat.addEventListener('contextmenu', e => e.preventDefault());
  heat.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); startHeat(); } });
  heat.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') stopHeat(); });

  $('tempSlider').addEventListener('input', e => setTemp(+e.target.value, true));
  $('roastReset').addEventListener('click', () => { stopHeat(); state.temp = MIN; $('tempSlider').value = MIN; render(); });
  render();
}
