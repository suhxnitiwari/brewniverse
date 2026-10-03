// Grind Guide: slide from cold-brew boulders to Turkish powder.
import { GRINDS } from './world-data.js';
import { $, seeded } from './util.js';
import { Sound } from './sound.js';
import { World } from './world.js';

let at = 5; // fine (espresso)

// A magnified patch of grounds. Particle radius follows the real size.
function particles(g) {
  const rnd = seeded(7);
  const r = 3 + g.mm * 13;
  const n = Math.round(Math.min(900, (240 * 160) / (r * r * 2.2)));
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = rnd() * 240, y = rnd() * 160;
    const rr = r * (0.6 + rnd() * 0.7);
    const pts = 7, d = Array.from({ length: pts }, (_, k) => {
      const a = (k / pts) * Math.PI * 2, rad = rr * (0.55 + rnd() * 0.6);
      return `${(x + Math.cos(a) * rad).toFixed(1)},${(y + Math.sin(a) * rad).toFixed(1)}`;
    }).join(' ');
    const tone = 30 + Math.round(rnd() * 26);
    s += `<polygon points="${d}" fill="hsl(24 45% ${tone}%)"/>`;
  }
  return s;
}

function render() {
  const g = GRINDS[at];
  $('grindSlider').value = at;
  $('grindName').textContent = g.name;
  $('grindLike').textContent = `Feels like ${g.like.toLowerCase()}`;
  $('grindMm').textContent = `≈ ${g.mm} mm`;
  $('grindArt').innerHTML = particles(g);
  $('grindArt').setAttribute('aria-label', `Magnified ${g.name.toLowerCase()} coffee grounds`);
  $('grindBrew').innerHTML = g.brew.map(b => `<span class="chip static">${b}</span>`).join('');
  $('grindTime').textContent = g.time;
  $('grindNote').textContent = g.note;
  $('grindScale').querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-current', i === at ? 'step' : 'false'));
  $('grindMethods').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.i === at));
  // surface area goes up as pieces shrink
  $('grindSurface').style.width = `${Math.round((0.1 / g.mm) * 100)}%`;
  if ($('gmPileArt')) pileArt();
}

// ---------- the grind game ----------
// target = the right grind index; near = also fine
const BREWERS = [
  { id: 'cold', name: 'Cold brew', target: 0,
    icon: '<rect x="14" y="10" width="36" height="46" rx="6"/><path d="M14 22h36"/><path d="M22 10V5h20v5"/>',
    fine: 'A whole night with powder makes bitter sludge. Go way coarser.' },
  { id: 'press', name: 'French press', target: 1,
    icon: '<rect x="16" y="14" width="32" height="42" rx="3"/><path d="M32 4v20M22 24h20M48 22c8 0 8 18 0 18"/>',
    fine: 'Mud. Fine grounds slip right through the mesh and into your cup.' },
  { id: 'drip', name: 'Drip machine', target: 3,
    icon: '<path d="M12 10h40l-10 18H22z"/><rect x="16" y="34" width="32" height="22" rx="4"/>',
    fine: 'The filter clogs and the basket overflows. Coarser!', coarse: 'Water rushes past. Weak, sour coffee.' },
  { id: 'pour', name: 'Pour-over', target: 4,
    icon: '<path d="M12 10h40L38 34H26z"/><path d="M22 40h20l-3 16H25z"/><path d="M50 16c8-4 12 0 10 6"/>',
    fine: 'It’ll drain forever and taste bitter.', coarse: 'The water will rush through. Thin and sour.' },
  { id: 'espresso', name: 'Espresso', target: 5,
    icon: '<rect x="8" y="6" width="48" height="12" rx="3"/><path d="M16 18h32v8H16z"/><path d="M26 26v6M38 26v6"/><path d="M20 40h24l-3 16H23z"/>',
    fine: 'Choked. The machine is wheezing out drips.', coarse: 'Your espresso machine is judging you. That would gush out in eight seconds.' },
  { id: 'turkish', name: 'Turkish', target: 6,
    icon: '<path d="M18 22h28l-4 32H22z"/><path d="M44 28h14"/><path d="M14 22c2-6 6-8 10-8"/>',
    coarse: 'Turkish coffee is basically flour. This is gravel.' },
];
let tries = 0, wins = 0, done = new Set();

function judge(b) {
  const diff = at - b.target;
  const g = GRINDS[at];
  let msg, ok = false;
  if (diff === 0) { ok = true; msg = `Perfect. ${g.name} + ${b.name.toLowerCase()} is exactly right.`; }
  else if (Math.abs(diff) === 1 && !(b.id === 'turkish' || b.id === 'cold')) msg = diff > 0 ? `So close. Just a notch coarser for ${b.name.toLowerCase()}.` : `So close. Just a notch finer for ${b.name.toLowerCase()}.`;
  else msg = diff > 0 ? (b.fine || 'Too fine: it’ll taste bitter and harsh.') : (b.coarse || 'Too coarse: water rushes past. Sour and weak.');
  tries++;
  if (ok && !done.has(b.id)) { wins++; done.add(b.id); }
  $('gmSay').textContent = msg;
  $('gmSay').className = `gm-say ${ok ? 'good' : 'bad'}`;
  $('gmScore').textContent = wins ? `${wins} of ${BREWERS.length} brewers matched${wins === BREWERS.length ? '. You’re a grinder whisperer.' : ''}` : '';
  const el = $('gmBrewers').querySelector(`[data-b="${b.id}"]`);
  el.classList.remove('good', 'bad'); void el.offsetWidth; el.classList.add(ok ? 'good' : 'bad');
  if (ok) el.classList.add('won');
  Sound.sfx(ok ? 'chime' : 'wrong');
  if (ok) { const r = el.getBoundingClientRect(); World.ripple(r.left + r.width / 2, r.top + r.height / 2); }
}

function pileArt() {
  const g = GRINDS[at];
  const rnd = seeded(3);
  const r = 1.2 + g.mm * 4.2;
  let s = '';
  for (let i = 0; i < 120; i++) {
    const x = 60 + (rnd() - 0.5) * 90 * (1 - rnd() * 0.3), y = 70 - rnd() * 40 * (1 - Math.abs(x - 60) / 50);
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * (0.6 + rnd() * 0.6)).toFixed(2)}" fill="hsl(24 45% ${28 + Math.round(rnd() * 22)}%)"/>`;
  }
  $('gmPileArt').innerHTML = s;
  $('gmPileName').textContent = g.name;
}

function initGame() {
  $('gmBrewers').innerHTML = BREWERS.map(b => `<button type="button" class="gm-brewer" data-b="${b.id}">
    <svg viewBox="0 0 64 60" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">${b.icon}</g></svg><span>${b.name}</span></button>`).join('');
  $('gmBrewers').addEventListener('click', e => { const el = e.target.closest('[data-b]'); if (el) judge(BREWERS.find(b => b.id === el.dataset.b)); });

  // drag the pile: a little ghost follows your pointer; drop it on a brewer
  const pile = $('gmPile');
  let ghost = null, start = null;
  pile.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    pile.setPointerCapture(e.pointerId);
    start = { x: e.clientX, y: e.clientY };
  });
  pile.addEventListener('pointermove', e => {
    if (!start) return;
    if (!ghost && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) {
      ghost = document.createElement('div');
      ghost.className = 'gm-ghost';
      ghost.innerHTML = $('gmPileArt').outerHTML.replace('id="gmPileArt"', '');
      document.body.appendChild(ghost);
      Sound.sfx('paper');
    }
    if (ghost) {
      ghost.style.transform = `translate(${e.clientX - 50}px, ${e.clientY - 40}px)`;
      ghost.hidden = true;
      const over = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-b]');
      ghost.hidden = false;
      $('gmBrewers').querySelectorAll('[data-b]').forEach(el => el.classList.toggle('over', el === over));
    }
  });
  const end = e => {
    if (!start) return;
    start = null;
    if (!ghost) return;
    ghost.hidden = true;
    const over = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-b]');
    ghost.remove(); ghost = null;
    $('gmBrewers').querySelectorAll('.over').forEach(el => el.classList.remove('over'));
    if (over) { Sound.sfx('drop'); judge(BREWERS.find(b => b.id === over.dataset.b)); }
  };
  pile.addEventListener('pointerup', end);
  pile.addEventListener('pointercancel', end);
  pileArt();
}

// the grinder sings while you move the dial: low growl for coarse, high whine for fine
let grindSnd = null, grindTimer = 0;
function grindNoise() {
  const level = at / (GRINDS.length - 1);
  if (!grindSnd) grindSnd = Sound.loop('grind', level);
  else grindSnd.set(level);
  clearTimeout(grindTimer);
  grindTimer = setTimeout(() => { grindSnd?.stop(); grindSnd = null; }, 420);
}

export function initGrind() {
  initGame();
  $('grindScale').innerHTML = GRINDS.map((g, i) => `<li><button type="button" data-i="${i}">${g.name}</button></li>`).join('');
  $('grindScale').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) { at = +b.dataset.i; render(); } });
  $('grindSlider').max = GRINDS.length - 1;
  $('grindSlider').addEventListener('input', e => { at = +e.target.value; render(); grindNoise(); });
  $('grindMethods').innerHTML = GRINDS.flatMap((g, i) => g.brew.map(b => `<button type="button" class="chip" data-i="${i}">${b}</button>`)).join('');
  $('grindMethods').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) { at = +b.dataset.i; render(); } });
  render();
}
