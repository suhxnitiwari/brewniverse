// Grind Guide: slide from cold-brew boulders to Turkish powder.
import { GRINDS } from './world-data.js';
import { $, seeded } from './util.js';

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
}

export function initGrind() {
  $('grindScale').innerHTML = GRINDS.map((g, i) => `<li><button type="button" data-i="${i}">${g.name}</button></li>`).join('');
  $('grindScale').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) { at = +b.dataset.i; render(); } });
  $('grindSlider').max = GRINDS.length - 1;
  $('grindSlider').addEventListener('input', e => { at = +e.target.value; render(); });
  $('grindMethods').innerHTML = GRINDS.flatMap((g, i) => g.brew.map(b => `<button type="button" class="chip" data-i="${i}">${b}</button>`)).join('');
  $('grindMethods').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) { at = +b.dataset.i; render(); } });
  render();
}
