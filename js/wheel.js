// Flavor Wheel: a sunburst you read from the middle out. Tap the outer ring to build your tasting notes.
import { FLAVORS } from './world-data.js';
import { $ } from './util.js';
import { World } from './world.js';
import { Sound } from './sound.js';

const R = [64, 150, 236, 372];   // ring edges: center, category, group, note
const TAU = Math.PI * 2;
const GAP = 0.004;

const notes = new Set();
let focus = null;     // category name
const segs = [];      // flat list for lookup
const catMid = {};    // each category’s middle angle, so it can bloom outward

function tint(hex, t) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(v + (255 - v) * t));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');   // hex, so canvas code can add alpha
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
          segs.push({ kind: 'note', name: n, cat: cat.name, group: g.name, color: tint(cat.color, 0.15 + (segs.length % 4) * 0.12) });
          svg += `<g class="w-seg w-note" data-cat="${cat.name}" data-note="${n}" tabindex="0" role="button" aria-label="${n}">
            <path d="${arc(a, a + per, R[2], R[3])}" fill="${tint(cat.color, .55)}"/>${label(n, a, a + per, R[2], R[3], 'w-t3')}</g>`;
          a += per;
        });
        svg += `<g class="w-seg w-group" data-cat="${cat.name}"><path d="${arc(g0, a, R[1], R[2])}" fill="${tint(cat.color, .3)}"/>${label(g.name, g0, a, R[1], R[2], 'w-t2')}</g>`;
      } else {
        segs.push({ kind: 'note', name: g.name, cat: cat.name, group: g.name, color: tint(cat.color, 0.2) });
        // no sub-notes: the group itself is the note and fills both outer rings
        svg += `<g class="w-seg w-note" data-cat="${cat.name}" data-note="${g.name}" tabindex="0" role="button" aria-label="${g.name}">
          <path d="${arc(a, a + per, R[1], R[3])}" fill="${tint(cat.color, .4)}"/>${label(g.name, a, a + per, R[1], R[3], 'w-t2')}</g>`;
        a += per;
      }
    });
    catMid[cat.name] = (a0 + a) / 2;
    svg += `<g class="w-seg w-cat" data-cat="${cat.name}" tabindex="0" role="button" aria-label="${cat.name}">
      <path d="${arc(a0, a, R[0], R[1])}" fill="${cat.color}"/>${label(cat.name, a0, a, R[0], R[1], 'w-t1')}</g>`;
  });
  svg += `<circle r="${R[0] - 4}" class="w-hub"/><text class="w-hub-t" y="-4">Start</text><text class="w-hub-t" y="14">here</text>`;
  $('wheelSvg').innerHTML = svg;
}

function render() {
  const svg = $('wheelSvg');
  svg.classList.toggle('has-focus', !!focus);
  const mid = focus != null ? catMid[focus] : 0;
  svg.querySelectorAll('.w-seg').forEach(g => {
    g.classList.toggle('is-focus', g.dataset.cat === focus);
    // the chosen family blooms outward, like a scent opening up
    g.style.transform = g.dataset.cat === focus ? `translate(${(Math.sin(mid) * 16).toFixed(1)}px, ${(-Math.cos(mid) * 16).toFixed(1)}px) scale(1.03)` : '';
    if (g.dataset.note) g.classList.toggle('is-picked', notes.has(g.dataset.note));
  });

  const cat = FLAVORS.find(c => c.name === focus);
  $('wheelWrap').style.setProperty('--aura', cat ? cat.color : '#e6b986');
  $('wheelWrap').classList.toggle('aura-on', !!cat);
  if (cat !== render.cat) { render.cat = cat; World.tint(cat ? [cat.color, tint(cat.color, 0.35), tint(cat.color, 0.6)] : null); }
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
  $('cardMaker').hidden = !list.length;
  $('palette').innerHTML = list.map(n => `<i style="--c:${noteColor(n)}"></i>`).join('');
  $('myNotes').querySelectorAll('[data-add]').forEach(b => b.style.setProperty('--c', noteColor(b.dataset.add)));
}

const noteColor = n => segs.find(s => s.name === n)?.color || '#e6b986';

// a picked note drifts up off the wheel like a scent
function floatNote(n) {
  const seg = $('wheelSvg').querySelector(`[data-note="${CSS.escape(n)}"]`);
  const wrap = $('wheelWrap');
  if (!seg) return;
  const r = seg.getBoundingClientRect(), w = wrap.getBoundingClientRect();
  const el = document.createElement('span');
  el.className = 'w-float';
  el.textContent = n;
  el.style.left = `${r.left - w.left + r.width / 2}px`;
  el.style.top = `${r.top - w.top + r.height / 2}px`;
  el.style.color = noteColor(n);
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

function toggleNote(n) {
  const adding = !notes.has(n);
  adding ? notes.add(n) : notes.delete(n);
  if (adding) { floatNote(n); Sound.sfx('bloom'); }
  render();
}

// ---------- the tasting card: a little perfume card of your coffee ----------
async function makeCard() {
  const list = [...notes];
  const name = $('coffeeName').value.trim() || 'My coffee';
  try { await Promise.all(['900 64px Archivo', 'italic 400 120px "Instrument Serif"', '500 24px "JetBrains Mono"'].map(f => document.fonts.load(f))); } catch {}
  const W = 1080, H = 1350, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1d120b'); bg.addColorStop(1, '#0c0704');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // the aura: one soft cloud of color per note, like a fragrance pyramid
  list.forEach((n, i) => {
    const a = (i / list.length) * Math.PI * 2 - Math.PI / 2 + 0.4, rad = list.length > 1 ? 230 : 0;
    const x = W / 2 + Math.cos(a) * rad, y = 560 + Math.sin(a) * rad * 0.8;
    const base = FLAVORS.find(c => c.name === segs.find(sg => sg.name === n)?.cat)?.color || '#e6b986';
    const gr = g.createRadialGradient(x, y, 0, x, y, 300);
    gr.addColorStop(0, base + 'b0'); gr.addColorStop(0.55, base + '40'); gr.addColorStop(1, base + '00');
    g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(0, 0, W, H);
  });
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#e6b986'; g.font = '500 26px "JetBrains Mono", monospace'; g.textAlign = 'center';
  g.fillText('M Y   C O F F E E   P A L E T T E', W / 2, 120);
  g.fillStyle = '#fffaf2'; g.font = 'italic 400 104px "Instrument Serif", Georgia, serif';
  const words = name.split(' '); let line = '', y = 250;
  for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > W - 160 && line) { g.fillText(line, W / 2, y); line = w; y += 100; } else line = t; }
  g.fillText(line, W / 2, y);
  // notes, each with its swatch
  const startY = 900, rowH = Math.min(70, 360 / Math.max(1, list.length));
  list.slice(0, 6).forEach((n, i) => {
    const yy = startY + i * rowH;
    g.fillStyle = noteColor(n); g.beginPath(); g.arc(300, yy - 14, 18, 0, 7); g.fill();
    g.fillStyle = '#fffaf2'; g.textAlign = 'left'; g.font = '900 46px Archivo, sans-serif';
    g.fillText(n.toUpperCase(), 340, yy);
  });
  if (list.length > 6) { g.fillStyle = '#b9a48f'; g.font = '500 24px "JetBrains Mono", monospace'; g.fillText(`+ ${list.length - 6} more`, 340, startY + 6 * rowH); }
  g.textAlign = 'center'; g.fillStyle = '#b9a48f'; g.font = '500 22px "JetBrains Mono", monospace';
  g.fillText(`${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}  ·  BREWNIVERSE`, W / 2, H - 70);

  const url = c.toDataURL('image/png');
  $('cardImg').src = url;
  $('cardDownload').href = url;
  $('cardDownload').download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'my-coffee'}-palette.png`;
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const file = blob && new File([blob], 'my-coffee-palette.png', { type: 'image/png' });
  const canShare = file && navigator.canShare?.({ files: [file] });
  $('cardShare').hidden = !canShare;
  $('cardShare').onclick = () => navigator.share({ files: [file], title: name, text: `My coffee palette: ${list.join(', ')}` }).catch(() => {});
  $('cardDialog').showModal();
  Sound.sfx('paper');
}

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
  $('makeCard').addEventListener('click', makeCard);
  $('cardClose').addEventListener('click', () => $('cardDialog').close());
  $('cardDialog').addEventListener('click', e => { if (e.target === $('cardDialog')) $('cardDialog').close(); });
  render();
}
