// Your coffee has a passport: click a big origin on the map and you travel there first
// (a full-screen landscape, a passport stamp, tasting notes drifting in the air), then explore the numbers.
import { TRIPS, PRODUCERS } from './world-data.js';
import { PHOTOS, photoUrl } from './photos.js';
import { Sound } from './sound.js';
import { World } from './world.js';
import { focusOrigin } from './map.js';
import { $ } from './util.js';

let stamps = new Set();
try { stamps = new Set(JSON.parse(localStorage.getItem('brew-stamps') || '[]')); } catch {}
let at = -1;

const byId = new Map(PRODUCERS.map(p => [p.id, p]));
export const hasTrip = id => TRIPS.some(t => t.id === id);

function stampSVG(t, n) {
  const date = new Date().toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  return `<svg viewBox="-110 -110 220 220" aria-hidden="true">
    <defs><path id="stampArc${n}" d="M-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0"/></defs>
    <circle r="100" fill="none" stroke="currentColor" stroke-width="5"/><circle r="88" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 4"/>
    <text font-size="17" letter-spacing="5" fill="currentColor"><textPath href="#stampArc${n}" startOffset="2%">ENTRY · ${t.name.toUpperCase()} · COFFEE ORIGIN ·</textPath></text>
    <text y="-6" text-anchor="middle" font-size="${t.name.length > 7 ? 22 : 28}" font-weight="900" fill="currentColor">${t.name.toUpperCase()}</text>
    <text y="26" text-anchor="middle" font-size="15" letter-spacing="2" fill="currentColor">${date}</text>
    <path d="M-22,44 q22,-14 44,0" fill="none" stroke="currentColor" stroke-width="3"/>
  </svg>`;
}

function renderBook() {
  $('passportCount').textContent = `${stamps.size} / ${TRIPS.length} stamps`;
  $('passportStamps').innerHTML = TRIPS.map(t => `<button type="button" class="pp-stamp${stamps.has(t.key) ? ' got' : ''}" data-trip="${t.key}" aria-label="Travel to ${t.name}">
    <span class="pp-ring">${stamps.has(t.key) ? t.name.slice(0, 3).toUpperCase() : '?'}</span><span class="pp-name">${t.name}</span></button>`).join('');
}

export function openTrip(key) {
  const i = TRIPS.findIndex(t => t.key === key || t.id === key);
  if (i < 0) return false;
  at = i;
  const t = TRIPS[i], p = byId.get(t.id);
  const dlg = $('trip');
  const bg = $('tripPhoto');
  bg.style.backgroundImage = PHOTOS[t.key] ? `url("${photoUrl(t.key)}")` : '';
  bg.style.setProperty('--sky1', t.sky[0]); bg.style.setProperty('--sky2', t.sky[1]);
  $('tripKicker').textContent = t.kicker;
  $('tripName').textContent = t.name;
  $('tripLine').textContent = t.line;
  $('tripNotes').innerHTML = t.notes.map((n, k) => `<span style="--d:${k * 0.6}s;--x:${[2, 26, 14][k]}%;--y:${[16, 30, 44][k]}%">${n}</span>`).join('');
  $('tripFacts').innerHTML = [
    ['Grows at', t.alt], ['Harvest', p?.harvest || '–'], ['Process', t.process], ['Species', (p?.type || '').replace(/\bA\b/, 'Arabica').replace(/\bR\b/, 'Robusta')],
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  const next = TRIPS[(i + 1) % TRIPS.length];
  $('tripNext').textContent = `Next stop: ${next.name} →`;
  $('tripStamp').innerHTML = stampSVG(t, i);
  $('tripStamp').classList.remove('in'); void $('tripStamp').offsetWidth; $('tripStamp').classList.add('in');
  const credit = PHOTOS[t.key];
  $('tripCredit').innerHTML = credit ? `Photo: <a href="https://unsplash.com/photos/${credit.page}" target="_blank" rel="noopener">${credit.by}</a> / Unsplash` : '';
  dlg.classList.remove('in'); void dlg.offsetWidth; dlg.classList.add('in');
  if (!dlg.open) dlg.showModal();
  document.body.classList.add('on-trip');
  Sound.ambience('wind');
  setTimeout(() => Sound.sfx('clunk'), 900);
  if (!stamps.has(t.key)) {
    stamps.add(t.key);
    try { localStorage.setItem('brew-stamps', JSON.stringify([...stamps])); } catch {}
    renderBook();
  }
  return true;
}

function closeTrip() {
  $('trip').close();
}

export function initPassport() {
  renderBook();
  $('passportStamps').addEventListener('click', e => { const b = e.target.closest('[data-trip]'); if (b) openTrip(b.dataset.trip); });
  $('tripClose').addEventListener('click', closeTrip);
  $('tripNext').addEventListener('click', () => { Sound.sfx('paper'); openTrip(TRIPS[(at + 1) % TRIPS.length].key); });
  $('tripExplore').addEventListener('click', () => {
    const t = TRIPS[at];
    closeTrip();
    focusOrigin({ id: t.id });
    document.getElementById('mapWrap').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  $('trip').addEventListener('close', () => {
    document.body.classList.remove('on-trip');
    Sound.ambience('sea');
    const r = $('mapWrap').getBoundingClientRect();
    World.ripple(r.left + r.width / 2, r.top + r.height / 2);
  });
}
