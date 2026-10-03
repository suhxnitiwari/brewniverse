// The Drink Guide as an editorial: one cup, one drink at a time. As you scroll, the same cup
// morphs into the next drink: espresso stays, milk rises, foam changes, the cup grows.
import { DRINKS, CUPS } from './data.js';
import { geometry, outlineMarkup, clipMarkup, layersMarkup, mixColor, ratioParts, fitCup, total, VIEWBOX } from './cup.js';
import { INGREDIENTS } from './data.js';
import { followRecipe } from './pour.js';
import { Sound } from './sound.js';
import { $, clamp, lerp } from './util.js';

const ORDER = [
  { id: 'espresso',   line: 'Coffee in its most concentrated form.' },
  { id: 'macchiato',  line: 'Espresso, stained with a spoon of foam.' },
  { id: 'cortado',    line: 'Half espresso, half milk. Cut, not covered.' },
  { id: 'flatwhite',  line: 'A whisper of silky foam. The coffee still talks.' },
  { id: 'cappuccino', line: 'The classic: equal thirds.' },
  { id: 'latte',      line: 'Mostly milk. The gentlest way in.' },
  { id: 'mocha',      line: 'Dessert that counts as coffee.' },
  { id: 'americano',  line: 'Espresso, stretched with hot water.' },
].map(o => ({ ...o, drink: DRINKS.find(d => d.id === o.id) }));
const N = ORDER.length;
const ease = t => t * t * (3 - 2 * t);

let shown = -1, raf = 0;

function cupFor(d) { return CUPS[fitCup(total(d.recipe))]; }

function draw(u) {
  const i = Math.min(N - 1, Math.floor(u)), t = u - i;
  // each drink holds still for a moment, then morphs into the next
  const m = i < N - 1 ? ease(clamp((t - 0.5) / 0.5, 0, 1)) : 0;
  const A = ORDER[i].drink, B = ORDER[Math.min(N - 1, i + 1)].drink;
  const ca = cupFor(A), cb = cupFor(B);
  const cup = {
    capacity: lerp(ca.capacity, cb.capacity, m), topW: lerp(ca.topW, cb.topW, m), botW: lerp(ca.botW, cb.botW, m),
    h: lerp(ca.h, cb.h, m), handle: m < 0.5 ? ca.handle : cb.handle,
  };
  const amounts = {};
  for (const k of Object.keys(INGREDIENTS)) amounts[k] = lerp(A.recipe[k] || 0, B.recipe[k] || 0, m);
  const geo = geometry(cup);
  $('dgCup').innerHTML = `<svg class="cup-svg" viewBox="${VIEWBOX}" aria-hidden="true">
    <defs>${clipMarkup(geo, 'dgClip')}</defs>
    <g clip-path="url(#dgClip)">${layersMarkup(geo, amounts)}</g>${outlineMarkup(geo)}</svg>`;
  $('dgGlow').style.setProperty('--c', mixColor(amounts) || '#6b4429');

  const k = m < 0.5 ? i : i + 1;
  if (k !== shown) show(k);
}

function show(k) {
  shown = k;
  const o = ORDER[k], d = o.drink;
  $('dgNum').textContent = `${String(k + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}`;
  $('dgName').textContent = `${d.name}.`;
  $('dgName').style.setProperty('--len', d.name.length + 1);
  $('dgMeta').textContent = `${total(d.recipe)} ml`;
  $('dgLine').textContent = o.line;
  $('dgRatio').innerHTML = ratioParts(d.recipe).map(p => `<span style="--ing:${INGREDIENTS[p.key].color}"><i></i>${p.part} ${INGREDIENTS[p.key].short}</span>`).join('');
  const copy = $('dgCopy');
  copy.classList.remove('in'); void copy.offsetWidth; copy.classList.add('in');
  $('dgDots').querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-current', j === k ? 'true' : 'false'));
  Sound.sfx('clink');
}

function update() {
  raf = 0;
  const sec = $('dgStory'), r = sec.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) return;
  const span = sec.offsetHeight - innerHeight;
  const p = clamp(-r.top / span, 0, 0.9999);
  draw(p * N);
}

export function initMenu() {
  $('dgStory').style.setProperty('--n', N);
  $('dgDots').innerHTML = ORDER.map((o, j) => `<li><button type="button" data-j="${j}" aria-label="${o.drink.name}"><span>${o.drink.name}</span></button></li>`).join('');
  $('dgDots').addEventListener('click', e => {
    const b = e.target.closest('[data-j]');
    if (!b) return;
    const sec = $('dgStory'), span = sec.offsetHeight - innerHeight;
    scrollTo({ top: (sec.getBoundingClientRect().top + scrollY) + span * ((+b.dataset.j + 0.2) / N), behavior: 'smooth' });
  });
  $('dgPour').addEventListener('click', () => {
    followRecipe(ORDER[shown].id);
    document.getElementById('pour').scrollIntoView({ behavior: 'smooth' });
  });
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
  addEventListener('resize', () => { if (!raf) raf = requestAnimationFrame(update); });
  draw(0);
}
