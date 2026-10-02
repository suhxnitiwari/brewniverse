// The Pour Lab: move a pitcher over a big cup and pour. How high you hold it changes what happens:
// from high up, milk punches through the crema and dives; held low, foam floats and blooms on top.
import { INGREDIENTS, PITCHER_ORDER, STACK_ORDER, CUPS, DRINKS } from './data.js';
import {
  CX, BOTTOM, geometry, outlineMarkup, clipMarkup, layersMarkup, bands,
  total, matches, ratioParts, fitCup, cupSVG, recipeText,
} from './cup.js';
import { holdable, clamp } from './util.js';
import { Sound } from './sound.js';

const $ = id => document.getElementById(id);

const state = {
  cup: 'mug',
  amounts: Object.fromEntries(Object.keys(INGREDIENTS).map(k => [k, 0])),
  history: [],          // [{ key, ml }] per pour, for undo
  action: null,         // { type: 'pour' | 'sip', key, last, moved }
  mixed: false,
  recipe: null,
  sel: 'espresso',      // which pitcher you’re holding
  ptr: null,            // pitcher position in SVG units (null = resting)
  cremaTop: false,      // milk dove under the crema, so the surface stays brown
  puddle: 0,
};
const PX_PER_CM = 21;   // the mug is about 10 cm tall
const HIGH = 150, LOW = 60;
let snd = null;

let geo;
let lastMatchId = null;

export function initPour() {
  buildPitchers();
  buildCupPicker();
  buildRecipeSelect();
  setCup(state.cup);
  bindActions();
  render();
}

// ---------- setup ----------

function pitcherIcon(color) {
  return `<svg viewBox="0 0 48 48" aria-hidden="true" class="pitcher-icon">
    <path d="M12 10 h22 l-2 4 v22 a6 6 0 0 1 -6 6 h-8 a6 6 0 0 1 -6 -6 z" fill="${color}" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M34 18 c8 0 8 14 0 14" fill="none" stroke="currentColor" stroke-width="2.2"/>
    <path d="M12 10 l-5 -3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
  </svg>`;
}

function buildPitchers() {
  const wrap = $('pitchers');
  wrap.innerHTML = PITCHER_ORDER.map(key => {
    const ing = INGREDIENTS[key];
    return `<button class="pitcher" type="button" role="radio" data-key="${key}" style="--ing:${ing.color}"
        aria-checked="${key === state.sel}" aria-label="${ing.name}. Click to pick, or hold to pour">
      ${pitcherIcon(ing.color)}
      <span class="pitcher-name">${ing.name}</span>
      <span class="pitcher-ml" data-ml="${key}">0 ml</span>
    </button>`;
  }).join('');

  wrap.querySelectorAll('.pitcher').forEach(btn => {
    btn.addEventListener('click', () => select(btn.dataset.key));
    holdable(btn, () => { select(btn.dataset.key); startAction('pour', btn.dataset.key); }, stopAction);
  });
}

function select(key) {
  state.sel = key;
  $('pitchers').querySelectorAll('.pitcher').forEach(b => b.setAttribute('aria-checked', b.dataset.key === key));
  drawPitcher();
}

function buildCupPicker() {
  $('cupPicker').innerHTML = Object.entries(CUPS).map(([k, c]) =>
    `<button type="button" role="radio" data-cup="${k}" aria-checked="false">${c.name}<small>${c.capacity} ml</small></button>`
  ).join('');
  $('cupPicker').addEventListener('click', e => {
    const b = e.target.closest('[data-cup]');
    if (b) setCup(b.dataset.cup, true);
  });
}

function buildRecipeSelect() {
  const sel = $('recipeSelect');
  sel.insertAdjacentHTML('beforeend', DRINKS.map(d => `<option value="${d.id}">${d.name}</option>`).join(''));
  sel.addEventListener('change', () => followRecipe(sel.value));
}

function bindActions() {
  holdable($('sipBtn'), () => startAction('sip'), stopAction);
  $('stirBtn').addEventListener('click', () => {
    state.mixed = !state.mixed;
    $('stirBtn').setAttribute('aria-pressed', state.mixed);
    $('stirBtn').textContent = state.mixed ? 'Unstir' : 'Stir';
    $('cupWrap').classList.remove('is-stirring');
    void $('cupWrap').offsetWidth;
    $('cupWrap').classList.add('is-stirring');
    render();
  });
  $('undoBtn').addEventListener('click', undo);
  $('emptyBtn').addEventListener('click', () => { empty(); toast('Fresh cup'); });

  const wrap = $('cupWrap'), svg = $('cupSvg');
  const toSvg = e => {
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: clamp(p.x, -40, 340), y: clamp(p.y, -105, 300) };
  };
  wrap.addEventListener('pointermove', e => { state.ptr = toSvg(e); drawPitcher(); });
  wrap.addEventListener('pointerleave', () => { if (!state.action) { state.ptr = null; drawPitcher(); } });
  wrap.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    try { wrap.setPointerCapture(e.pointerId); } catch {}
    state.ptr = toSvg(e);
    startAction('pour', state.sel);
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => wrap.addEventListener(ev, () => { if (state.action?.type === 'pour') stopAction(); }));
  wrap.addEventListener('contextmenu', e => e.preventDefault());
}

// ---------- state changes ----------

function setCup(key, userPicked = false) {
  state.cup = key;
  geo = geometry(key);
  $('cupDefs').innerHTML = clipMarkup(geo, 'labClip');
  $('cupOutline').innerHTML = outlineMarkup(geo);
  $('cupPicker').querySelectorAll('[data-cup]').forEach(b => b.setAttribute('aria-checked', b.dataset.cup === key));
  $('volCap').textContent = CUPS[key].capacity;
  if (total(state.amounts) > CUPS[key].capacity) {
    empty();
    if (userPicked) toast('That didn’t fit, so here’s a fresh cup');
  }
  render();
}

function empty() {
  for (const k in state.amounts) state.amounts[k] = 0;
  state.cremaTop = false;
  state.puddle = 0;
  state.history = [];
  render();
}

function undo() {
  const last = state.history.pop();
  if (!last) return toast('Nothing to undo');
  state.amounts[last.key] = Math.max(0, state.amounts[last.key] - last.ml);
  render();
}

export function followRecipe(id) {
  const drink = DRINKS.find(d => d.id === id) || null;
  state.recipe = drink;
  $('recipeSelect').value = drink ? drink.id : '';
  const hint = $('recipeHint');
  if (drink) {
    empty();
    setCup(fitCup(total(drink.recipe)));
    hint.innerHTML = `<strong>${drink.name}:</strong> ${recipeText(drink.recipe)}.<br>Pour up to each dashed line, bottom to top.`;
    hint.hidden = false;
  } else {
    hint.hidden = true;
  }
  render();
}

// ---------- where the stream lands ----------

function spout() {
  return state.ptr || { x: CX + 6, y: geo.top - 70 };
}

function landing() {
  const sp = spout();
  // the spout can dip inside the rim (that’s how latte art is poured), as long as it’s above the liquid
  const inCup = sp.x > geo.x1 + 8 && sp.x < geo.x2 - 8 && sp.y < surfaceY() + 2;
  const surface = inCup ? surfaceY() : 318;
  return { sp, inCup, surface, h: Math.max(0, surface - sp.y) };
}

// The physics lesson: the same milk behaves differently depending on height.
function physicsKey(key, h) {
  const coffeeBelow = state.amounts.espresso + state.amounts.brewed > 0;
  if (!coffeeBelow) return key;
  if (key === 'foam' && h > HIGH) return 'milk';          // foam can’t survive a long fall: it plunges and mixes
  if (key === 'milk' && h < LOW) return Math.random() < 0.45 ? 'foam' : 'milk'; // close to the surface, the froth floats
  return key;
}

function drawPitcher() {
  const g = $('pitcherCursor');
  if (!geo) return;
  const sp = spout();
  const pouring = state.action?.type === 'pour';
  const ing = INGREDIENTS[state.sel];
  g.classList.toggle('resting', !state.ptr && !pouring);
  g.setAttribute('transform', `translate(${sp.x} ${sp.y}) rotate(${pouring ? -38 : -6})`);
  g.innerHTML = `<path d="M0,0 l18,-4 h46 l-6,78 a10,10 0 0 1 -10,9 h-24 a10,10 0 0 1 -10,-9 z" fill="#d7dbe0" stroke="#7d848b" stroke-width="2.5"/>
    <path d="M14,22 h44 l-3,48 a8,8 0 0 1 -8,7 h-22 a8,8 0 0 1 -8,-7 z" fill="${ing.color}" opacity=".9"/>
    <path d="M64,10 c22,0 22,40 -4,42" fill="none" stroke="#7d848b" stroke-width="6"/>`;
  const L = landing();
  const tag = $('heightTag');
  if (state.ptr && L.inCup) {
    tag.setAttribute('x', sp.x + 76); tag.setAttribute('y', sp.y + 30);
    tag.textContent = `${(L.h / PX_PER_CM).toFixed(1)} cm`;
  } else tag.textContent = '';
}

// ---------- pouring & sipping loop ----------

function startAction(type, key) {
  if (state.action) stopAction();
  if (type === 'sip' && total(state.amounts) < 0.5) return toast('Nothing to sip!');
  state.action = { type, key, last: performance.now(), moved: 0, high: 0, low: 0, spilled: 0, dove: 0, bloomed: 0 };
  $('cupSvg').classList.add(type === 'pour' ? 'is-pouring' : 'is-sipping');
  if (type === 'pour') { snd = Sound.loop('pour', 0.5); drawPitcher(); }
  requestAnimationFrame(tick);
}

function stopAction() {
  const a = state.action;
  if (!a) return;
  state.action = null;
  snd?.stop(); snd = null;
  if (a.type === 'pour') explain(a);
  // a quick tap still pours a little splash
  if (a.type === 'pour' && a.moved < 5 && !a.spilled) a.moved += addLiquid(physicsKey(a.key, landing().h), 5 - a.moved);
  if (a.type === 'pour' && a.moved > 0.2) state.history.push({ key: a.key, ml: a.moved });
  $('cupSvg').classList.remove('is-pouring', 'is-sipping');
  render();
}

function addLiquid(key, ml) {
  const room = CUPS[state.cup].capacity - total(state.amounts);
  const add = Math.min(ml, room);
  state.amounts[key] += add;
  return add;
}

// Sip from the top: cream and foam first, then whatever's on top.
function sip(ml) {
  let left = ml;
  if (state.mixed) {
    for (const k of ['cream', 'foam']) {
      const take = Math.min(left, state.amounts[k]); state.amounts[k] -= take; left -= take;
    }
    const liquids = STACK_ORDER.filter(k => !INGREDIENTS[k].floats);
    const liquidTotal = liquids.reduce((s, k) => s + state.amounts[k], 0);
    if (left > 0 && liquidTotal > 0) {
      const f = Math.min(1, left / liquidTotal);
      liquids.forEach(k => (state.amounts[k] *= 1 - f));
    }
  } else {
    for (const k of [...STACK_ORDER].reverse()) {
      const take = Math.min(left, state.amounts[k]); state.amounts[k] -= take; left -= take;
      if (left <= 0) break;
    }
  }
  for (const k in state.amounts) if (state.amounts[k] < 0.05) state.amounts[k] = 0;
  state.history = []; // sipping makes undo meaningless
}

function tick(now) {
  const a = state.action;
  if (!a) return;
  const dt = Math.min(0.05, (now - a.last) / 1000);
  a.last = now;
  if (a.type === 'pour') {
    const L = landing();
    snd?.set(clamp(L.h / 260, 0, 1));
    // higher pours run faster and hit harder
    const want = INGREDIENTS[a.key].rate * dt * (0.6 + clamp(L.h / 220, 0, 1) * 0.9);
    if (!L.inCup) {
      a.spilled += want;
      state.puddle = Math.min(90, state.puddle + want * 0.4);
      render();
      requestAnimationFrame(tick);
      return;
    }
    if (L.h > HIGH) a.high += want; else if (L.h < LOW) a.low += want;
    const key = physicsKey(a.key, L.h);
    if (key !== a.key) key === 'milk' ? (a.dove += want) : (a.bloomed += want);
    // milk falling hard through crema leaves the crema floating on top
    if ((a.key === 'milk' || a.key === 'foam') && state.amounts.espresso > 0) {
      if (L.h > HIGH * 0.8 && state.amounts.foam < 3) state.cremaTop = true;
      if (L.h < LOW || state.amounts.foam > 6) state.cremaTop = false;
    }
    if (a.key === 'water' && L.h > HIGH) state.cremaTop = false;
    const got = addLiquid(key, want);
    a.moved += got;
    if (got < want) {
      stopAction();
      overflow();
      return;
    }
  } else {
    sip(40 * dt);
    if (total(state.amounts) < 0.5) {
      stopAction();
      toast('All gone ☕');
      return;
    }
  }
  render();
  requestAnimationFrame(tick);
}

function explain(a) {
  const ing = INGREDIENTS[a.key];
  let why;
  if (a.spilled > 2 && a.moved < 1) why = 'The spout wasn’t over the cup. Gravity doesn’t care how good your coffee is.';
  else if (a.dove > 3) why = `You poured the foam from ${(HIGH / PX_PER_CM).toFixed(0)}+ cm up. It fell so hard it broke apart and mixed in as milk instead of floating. To keep foam on top, pour close to the surface.`;
  else if ((a.key === 'milk' || a.key === 'foam') && a.high > a.moved * 0.5 && state.amounts.espresso > 0) why = 'You poured from high up. A thin, fast stream punches straight through the crema, so the milk dives underneath and the surface stays brown. Baristas start every latte this way.';
  else if (a.bloomed > 2 || ((a.key === 'milk' || a.key === 'foam') && a.low > a.moved * 0.5)) why = 'You poured close to the surface. The stream slows down, so the lighter, airy milk floats and blooms white on top. That’s how latte art gets drawn.';
  else if (a.key === 'water' && a.high > a.moved * 0.5 && state.amounts.espresso > 0) why = 'Hot water from up high churns the espresso and breaks up the crema. Pour the espresso over the water instead and you get a long black, with its crema intact.';
  else if (a.key === 'espresso' && state.amounts.milk > 0) why = 'Espresso is denser than milk, so it sinks through it. Pour it slowly over the back of a spoon and it will hover in a stripe. That’s a latte macchiato.';
  else if (ing.floats) why = `${ing.name} is mostly air, so it floats on everything.`;
  else why = 'Liquids stack by weight: syrup and chocolate sink, espresso sits on them, milk floats above, and foam floats on everything.';
  const el = $('plWhy');
  if (el.textContent !== why) { el.textContent = why; el.parentElement.classList.remove('pop'); void el.offsetWidth; el.parentElement.classList.add('pop'); }
}

function overflow() {
  const wrap = $('cupWrap');
  wrap.classList.remove('is-full'); void wrap.offsetWidth; wrap.classList.add('is-full');
  toast('The cup is full!');
  const drips = $('drips');
  drips.innerHTML = [0, 1, 2].map(i =>
    `<circle class="drip" cx="${geo.x2 + 4 - i * 6}" cy="${geo.top + 2}" r="3.5" fill="${topColor()}" style="animation-delay:${i * 0.12}s" />`).join('');
}

function topColor() {
  const list = bands(state.amounts, state.mixed);
  return list.length ? list[list.length - 1].color : '#ccc';
}

// ---------- rendering ----------

function surfaceY() {
  return BOTTOM - total(state.amounts) * geo.mlToPx;
}

function render() {
  if (!geo) return;
  const amounts = state.amounts;
  const vol = total(amounts);

  $('cupLayers').innerHTML = layersMarkup(geo, amounts, { mixed: state.mixed })
    .replace(/class="band band-(\w+)"/g, 'class="band band-$1" data-key="$1"');

  // stream from the spout down to wherever it lands
  const a = state.action;
  const stream = $('stream');
  if (a && a.type === 'pour') {
    const L = landing();
    const w = clamp(9 - L.h / 45, 2.5, 8);
    const sx = L.sp.x - w / 2;
    $('streamBody').setAttribute('x', sx);
    $('streamBody').setAttribute('y', L.sp.y);
    $('streamBody').setAttribute('width', w);
    $('streamBody').setAttribute('height', Math.max(0, L.surface - L.sp.y));
    $('streamFlow').setAttribute('x1', L.sp.x); $('streamFlow').setAttribute('x2', L.sp.x);
    $('streamFlow').setAttribute('y1', L.sp.y); $('streamFlow').setAttribute('y2', L.surface);
    stream.style.setProperty('--ing', INGREDIENTS[a.key].color);
    stream.classList.add('on');
    // a hard landing splashes
    $('splash').innerHTML = L.h > HIGH ? Array.from({ length: 5 }, () => {
      const dx = (Math.random() - 0.5) * 50, dy = -Math.random() * 18;
      return `<circle cx="${L.sp.x + dx}" cy="${L.surface + dy}" r="${1.5 + Math.random() * 2}" fill="${INGREDIENTS[a.key].color}"/>`;
    }).join('') : '';
  } else {
    stream.classList.remove('on');
    $('splash').innerHTML = '';
  }
  $('puddle').innerHTML = state.puddle > 0 ? `<ellipse cx="${geo.x2 + 60}" cy="318" rx="${10 + state.puddle}" ry="${3 + state.puddle * 0.06}" fill="#6b4429" opacity=".55"/>` : '';
  // milk that dove under leaves the crema floating on top
  $('cremaTop').innerHTML = state.cremaTop && !state.mixed && amounts.milk > 0 && amounts.foam < 3
    ? `<g clip-path="url(#labClip)"><rect x="${geo.x1 - 10}" y="${surfaceY() - 1}" width="${geo.x2 - geo.x1 + 20}" height="6" fill="#a8683a"/></g>` : '';
  drawPitcher();

  // steam only on a hot, not-empty cup
  $('steam').classList.toggle('on', vol > 10);
  $('steam').setAttribute('transform', `translate(${CX - 145}, ${geo.top - 10 - 70})`);

  drawGuides();
  renderReadout(vol);
}

function drawGuides() {
  const g = $('guideLines');
  if (!state.recipe) { g.innerHTML = ''; return; }
  const r = state.recipe.recipe;
  let ml = 0, out = '';
  for (const k of STACK_ORDER) {
    if (!r[k]) continue;
    ml += r[k];
    const y = BOTTOM - ml * geo.mlToPx;
    const done = (state.amounts[k] || 0) >= r[k] * 0.9;
    out += `<line class="guide ${done ? 'done' : ''}" x1="${geo.x1 - 6}" x2="${geo.x2 + 6}" y1="${y}" y2="${y}" />
            <text class="guide-label ${done ? 'done' : ''}" x="${geo.x2 - 10}" y="${y - 5}" text-anchor="end">${INGREDIENTS[k].short}</text>`;
  }
  g.innerHTML = out;
}

function renderReadout(vol) {
  const amounts = state.amounts;
  const cap = CUPS[state.cup].capacity;
  $('volNow').textContent = Math.round(vol);
  $('volFill').style.width = `${Math.min(100, (vol / cap) * 100)}%`;

  // pitcher badges
  document.querySelectorAll('[data-ml]').forEach(el => {
    el.textContent = `${Math.round(amounts[el.dataset.ml])} ml`;
    el.closest('.pitcher').classList.toggle('has-some', amounts[el.dataset.ml] > 0.5);
  });

  // stacked ratio bar
  const present = STACK_ORDER.filter(k => amounts[k] > 0.5);
  $('ratioBar').innerHTML = present.length
    ? present.map(k => `<span style="flex:${amounts[k]};--ing:${INGREDIENTS[k].color}" title="${INGREDIENTS[k].name}"></span>`).join('')
    : '<span class="ratio-empty">empty cup</span>';

  const parts = ratioParts(amounts);
  $('ratioText').innerHTML = parts.length
    ? parts.map(p => `<span><b>${p.part}</b> ${INGREDIENTS[p.key].short}</span>`).join('<i>:</i>')
    : '';

  $('amounts').innerHTML = present.map(k =>
    `<li><span class="dot" style="--ing:${INGREDIENTS[k].color}"></span>${INGREDIENTS[k].name}
     <span class="amt">${Math.round(amounts[k])} ml · ${Math.round((amounts[k] / vol) * 100)}%</span></li>`).join('');

  renderMatch(vol);
}

function renderMatch(vol) {
  const el = $('match');
  if (vol < 5) {
    if (lastMatchId !== 'none') {
      el.innerHTML = `<p class="match-empty">Start pouring and I’ll tell you what you’re making.</p>`;
      $('plMatch').innerHTML = '';
      lastMatchId = 'none';
    }
    return;
  }
  const [best, next] = matches(state.amounts);
  const pct = Math.round(best.score * 100);
  const id = `${best.drink.id}|${next.drink.id}|${pct}`;
  if (id === lastMatchId) return;
  const sameDrink = lastMatchId && lastMatchId.startsWith(best.drink.id + '|');
  lastMatchId = id;

  const verdict = pct >= 90 ? 'That’s a' : pct >= 72 ? 'Looks like a' : 'Closest to a';
  $('plMatch').innerHTML = `<small>${verdict}</small>${best.drink.name}.`;
  if (sameDrink) {
    el.querySelector('.match-pct').textContent = `${pct}% match`;
    el.querySelector('.match-verdict').textContent = verdict;
    el.querySelector('.match-next').innerHTML = `Also kind of a <b>${next.drink.name}</b> (${Math.round(next.score * 100)}%)`;
    return;
  }
  el.innerHTML = `
    <div class="match-cup">${cupSVG(fitCup(total(best.drink.recipe)), best.drink.recipe)}</div>
    <div>
      <p class="match-verdict">${verdict}</p>
      <p class="match-name">${best.drink.name}</p>
      <p class="match-pct">${pct}% match</p>
      <p class="match-blurb">${best.drink.blurb}</p>
      <p class="match-next">Also kind of a <b>${next.drink.name}</b> (${Math.round(next.score * 100)}%)</p>
    </div>`;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
}

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1600);
}
