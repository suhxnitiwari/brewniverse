// The Pour Lab: hold a pitcher, watch the cup fill, see the ratio.
import { INGREDIENTS, PITCHER_ORDER, STACK_ORDER, CUPS, DRINKS } from './data.js';
import {
  CX, BOTTOM, geometry, outlineMarkup, clipMarkup, layersMarkup, bands,
  total, matches, ratioParts, fitCup, cupSVG, recipeText,
} from './cup.js';

const $ = id => document.getElementById(id);

const state = {
  cup: 'mug',
  amounts: Object.fromEntries(Object.keys(INGREDIENTS).map(k => [k, 0])),
  history: [],          // [{ key, ml }] per pour, for undo
  action: null,         // { type: 'pour' | 'sip', key, last, moved }
  mixed: false,
  recipe: null,
};

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
    return `<button class="pitcher" type="button" data-key="${key}" style="--ing:${ing.color}"
        aria-label="Hold to pour ${ing.name}">
      ${pitcherIcon(ing.color)}
      <span class="pitcher-name">${ing.name}</span>
      <span class="pitcher-ml" data-ml="${key}">0 ml</span>
    </button>`;
  }).join('');

  wrap.querySelectorAll('.pitcher').forEach(btn => {
    holdable(btn, () => startAction('pour', btn.dataset.key), stopAction);
  });
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

// Press-and-hold on mouse, touch, and keyboard (Space / Enter).
function holdable(el, onStart, onStop) {
  el.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch {}
    el.classList.add('is-held');
    onStart();
  });
  const end = () => { el.classList.remove('is-held'); onStop(); };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('lostpointercapture', end);
  el.addEventListener('contextmenu', e => e.preventDefault());
  el.addEventListener('keydown', e => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); el.classList.add('is-held'); onStart(); }
  });
  el.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') end(); });
  el.addEventListener('blur', end);
}

function bindActions() {
  holdable($('sipBtn'), () => startAction('sip'), stopAction);
  $('stirBtn').addEventListener('click', () => {
    state.mixed = !state.mixed;
    $('stirBtn').setAttribute('aria-pressed', state.mixed);
    $('stirBtn').textContent = state.mixed ? '🥄 Unstir' : '🥄 Stir';
    $('cupWrap').classList.remove('is-stirring');
    void $('cupWrap').offsetWidth;
    $('cupWrap').classList.add('is-stirring');
    render();
  });
  $('undoBtn').addEventListener('click', undo);
  $('emptyBtn').addEventListener('click', () => { empty(); toast('Fresh cup'); });

  // hover a layer to see what it is
  const svg = $('cupSvg'), tip = $('cupTip');
  svg.addEventListener('pointermove', e => {
    const band = e.target.closest('.band');
    if (!band) { tip.hidden = true; return; }
    const key = band.dataset.key;
    const label = key === 'mixed' ? 'Stirred coffee' : INGREDIENTS[key].name;
    const ml = key === 'mixed'
      ? bands(state.amounts, true).find(b => b.key === 'mixed').ml
      : state.amounts[key];
    tip.textContent = `${label} · ${Math.round(ml)} ml`;
    const r = $('cupWrap').getBoundingClientRect();
    tip.style.left = `${e.clientX - r.left}px`;
    tip.style.top = `${e.clientY - r.top}px`;
    tip.hidden = false;
  });
  svg.addEventListener('pointerleave', () => (tip.hidden = true));
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

// ---------- pouring & sipping loop ----------

function startAction(type, key) {
  if (state.action) stopAction();
  if (type === 'sip' && total(state.amounts) < 0.5) return toast('Nothing to sip!');
  state.action = { type, key, last: performance.now(), moved: 0 };
  $('cupSvg').classList.add(type === 'pour' ? 'is-pouring' : 'is-sipping');
  requestAnimationFrame(tick);
}

function stopAction() {
  const a = state.action;
  if (!a) return;
  state.action = null;
  // a quick tap still pours a little splash
  if (a.type === 'pour' && a.moved < 5) a.moved += addLiquid(a.key, 5 - a.moved);
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
    const want = INGREDIENTS[a.key].rate * dt;
    const got = addLiquid(a.key, want);
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

  // stream from the top of the frame down to the liquid
  const a = state.action;
  const stream = $('stream');
  if (a && a.type === 'pour') {
    const sx = CX - 3, y2 = surfaceY();
    $('streamBody').setAttribute('x', sx);
    $('streamBody').setAttribute('height', Math.max(0, y2 - 0));
    $('streamFlow').setAttribute('x1', sx + 3.5); $('streamFlow').setAttribute('x2', sx + 3.5);
    $('streamFlow').setAttribute('y2', y2);
    stream.style.setProperty('--ing', INGREDIENTS[a.key].color);
    stream.classList.add('on');
  } else {
    stream.classList.remove('on');
  }

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
