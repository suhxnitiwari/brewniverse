// Flavor Wheel: a sunburst you read from the middle out. Tap the outer ring to build your tasting notes.
import { FLAVORS } from './world-data.js';
import { $ } from './util.js';

const R = [64, 150, 236, 372];   // ring edges: center, category, group, note
const TAU = Math.PI * 2;
const GAP = 0.004;

const notes = new Set();
let focus = null;     // category name
const segs = [];      // flat list for lookup

function tint(hex, t) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(v + (255 - v) * t));
  return `rgb(${c.join(',')})`;
}

function arc(a0, a1, r0, r1) {
  a0 += GAP; a1 -= GAP;
  const p = (a, r) => `${(Math.sin(a) * r).toFixed(2)},${(-Math.cos(a) * r).toFixed(2)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${p(a0, r1)} A${r1},${r1} 0 ${large} 1 ${p(a1, r1)} L${p(a1, r0)} A${r0},${r0} 0 ${large} 0 ${p(a0, r0)}Z`;
}

// Radial text that always reads left-to-right.
function label(text, a0, a1, r0, r1, cls) {
  const a = (a0 + a1) / 2, deg = (a * 180) / Math.PI;
  const flip = a > Math.PI;
  const r = (r0 + r1) / 2;
  const x = Math.sin(a) * r, y = -Math.cos(a) * r;
  const rot = flip ? deg + 90 : deg - 90;
  const lines = text.split(' / ');
  const body = lines.length === 1 ? text
    : lines.map((l, i) => `<tspan x="${x.toFixed(1)}" dy="${i ? 1.1 : -0.55 * (lines.length - 1)}em">${l}${i < lines.length - 1 ? ' /' : ''}</tspan>`).join('');
  return `<text class="${cls}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" transform="rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})">${body}</text>`;
}

function build() {
  const leaves = c => (c.children ? c.children.length : 1);
  const total = FLAVORS.reduce((s, cat) => s + cat.children.reduce((t, g) => t + leaves(g), 0), 0);
  const per = TAU / total;
  let a = 0, svg = '';
  FLAVORS.forEach(cat => {
    const a0 = a;
    cat.children.forEach(g => {
      const g0 = a;
      if (g.children) {
        g.children.forEach(n => {
          segs.push({ kind: 'note', name: n, cat: cat.name, group: g.name });
          svg += `<g class="w-seg w-note" data-cat="${cat.name}" data-note="${n}" tabindex="0" role="button" aria-label="${n}">
            <path d="${arc(a, a + per, R[2], R[3])}" fill="${tint(cat.color, .55)}"/>${label(n, a, a + per, R[2], R[3], 'w-t3')}</g>`;
          a += per;
        });
        svg += `<g class="w-seg w-group" data-cat="${cat.name}"><path d="${arc(g0, a, R[1], R[2])}" fill="${tint(cat.color, .3)}"/>${label(g.name, g0, a, R[1], R[2], 'w-t2')}</g>`;
      } else {
        // no sub-notes: the group itself is the note and fills both outer rings
        svg += `<g class="w-seg w-note" data-cat="${cat.name}" data-note="${g.name}" tabindex="0" role="button" aria-label="${g.name}">
          <path d="${arc(a, a + per, R[1], R[3])}" fill="${tint(cat.color, .4)}"/>${label(g.name, a, a + per, R[1], R[3], 'w-t2')}</g>`;
        a += per;
      }
    });
    svg += `<g class="w-seg w-cat" data-cat="${cat.name}" tabindex="0" role="button" aria-label="${cat.name}">
      <path d="${arc(a0, a, R[0], R[1])}" fill="${cat.color}"/>${label(cat.name, a0, a, R[0], R[1], 'w-t1')}</g>`;
  });
  svg += `<circle r="${R[0] - 4}" class="w-hub"/><text class="w-hub-t" y="-4">Start</text><text class="w-hub-t" y="14">here</text>`;
  $('wheelSvg').innerHTML = svg;
}

function render() {
  const svg = $('wheelSvg');
  svg.classList.toggle('has-focus', !!focus);
  svg.querySelectorAll('.w-seg').forEach(g => {
    g.classList.toggle('is-focus', g.dataset.cat === focus);
    if (g.dataset.note) g.classList.toggle('is-picked', notes.has(g.dataset.note));
  });

  const cat = FLAVORS.find(c => c.name === focus);
  $('wheelInfo').innerHTML = cat
    ? `<p class="mini-title">Category</p><h3 style="--c:${cat.color}" class="w-title">${cat.name}</h3>
       <p>${cat.about}</p><p class="m-sold"><b>Look for it in:</b> ${cat.find}</p>
       <div class="chips">${segs.filter(s => s.cat === cat.name).map(s => `<button type="button" class="chip" data-add="${s.name}" aria-pressed="${notes.has(s.name)}">${s.name}</button>`).join('')}
       ${cat.children.filter(g => !g.children).map(g => `<button type="button" class="chip" data-add="${g.name}" aria-pressed="${notes.has(g.name)}">${g.name}</button>`).join('')}</div>
       <button class="link" type="button" data-unfocus>← All categories</button>`
    : `<p class="mini-title">How to use it</p><h3>Taste from the middle out</h3>
       <ol class="w-how"><li>Take a sip (slurping is allowed and it helps).</li><li>Pick the broad category it reminds you of: fruity? nutty? roasty?</li><li>Move outward to get more specific. “Fruity” → “Berry” → “Blueberry”.</li><li>Tap the notes you taste to save them below.</li></ol>`;

  const list = [...notes];
  $('myNotes').innerHTML = list.length
    ? list.map(n => `<button type="button" class="chip" data-add="${n}" aria-pressed="true">${n} ✕</button>`).join('')
    : '<span class="match-empty">Tap notes on the wheel to build your cup’s profile.</span>';
  $('notesLine').textContent = list.length ? `“This coffee tastes like ${list.length > 1 ? list.slice(0, -1).join(', ').toLowerCase() + ' and ' + list.at(-1).toLowerCase() : list[0].toLowerCase()}.”` : '';
  $('clearNotes').hidden = !list.length;
}

function toggleNote(n) { notes.has(n) ? notes.delete(n) : notes.add(n); render(); }

export function initWheel() {
  build();
  const svg = $('wheelSvg');
  const act = el => {
    const seg = el.closest('.w-seg');
    if (!seg) { if (el.closest('.w-hub, .w-hub-t')) { focus = null; render(); } return; }
    if (seg.dataset.note) { focus = seg.dataset.cat; toggleNote(seg.dataset.note); }
    else { focus = focus === seg.dataset.cat && seg.classList.contains('w-cat') ? null : seg.dataset.cat; render(); }
  };
  svg.addEventListener('click', e => act(e.target));
  svg.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(e.target); } });
  document.querySelector('.wheel-side').addEventListener('click', e => {
    const add = e.target.closest('[data-add]');
    if (add) toggleNote(add.dataset.add);
    if (e.target.closest('[data-unfocus]')) { focus = null; render(); }
  });
  $('clearNotes').addEventListener('click', () => { notes.clear(); render(); });
  render();
}
