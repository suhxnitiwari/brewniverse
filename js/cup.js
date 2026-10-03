// Drawing cups and doing the ratio math. Shared by the Pour Lab and the Drink Guide.
import { INGREDIENTS, STACK_ORDER, CUPS, DRINKS } from './data.js';

export const CX = 140;
export const BOTTOM = 312;
export const VIEWBOX = '0 84 300 238';

let uid = 0;

// cupKey can also be a cup object, so the Drink Guide can morph between sizes
export function geometry(cupKey) {
  const cup = typeof cupKey === 'string' ? CUPS[cupKey] : cupKey;
  const top = BOTTOM - cup.h;
  const x1 = CX - cup.topW / 2, x2 = CX + cup.topW / 2;
  const b1 = CX - cup.botW / 2, b2 = CX + cup.botW / 2;
  const r = Math.min(28, cup.botW / 4);
  const body = `M${x1},${top} L${b1},${BOTTOM - r} Q${b1},${BOTTOM} ${b1 + r},${BOTTOM} L${b2 - r},${BOTTOM} Q${b2},${BOTTOM} ${b2},${BOTTOM - r} L${x2},${top}`;
  const fillH = cup.h - 10;
  // width of the cup at a given y, for drawing the liquid surface ellipse
  const widthAt = y => cup.topW - (cup.topW - cup.botW) * ((y - top) / cup.h);
  // right wall point at fraction t (0 = rim, 1 = bottom)
  const wall = t => [x2 + (b2 - x2) * t, top + (BOTTOM - r - top) * t];
  return { cup, top, x1, x2, body, fillH, mlToPx: fillH / cup.capacity, widthAt, wall };
}

export function outlineMarkup(geo) {
  const { cup, top, x1, x2, body, wall } = geo;
  let handle = '';
  if (cup.handle) {
    const [ax, ay] = wall(0.16), [bx, by] = wall(0.66);
    const reach = cup.h > 150 ? 58 : 44;
    handle = `<path class="cup-handle" d="M${ax - 2},${ay} C${ax + reach},${ay - 8} ${bx + reach},${by + 8} ${bx - 2},${by}" />`;
  }
  return `
    ${handle}
    <path class="cup-body" d="${body}" />
    <ellipse class="cup-rim" cx="${CX}" cy="${top}" rx="${(x2 - x1) / 2}" ry="7" />
    <path class="cup-shine" d="M${x1 + 14},${top + 18} L${x1 + 24},${BOTTOM - 40}" />`;
}

export function clipMarkup(geo, id) {
  return `<clipPath id="${id}"><path d="${geo.body} Z" /></clipPath>`;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Weighted average color of everything that isn't floating on top.
export function mixColor(amounts, colors = {}) {
  let total = 0; const acc = [0, 0, 0];
  for (const key of STACK_ORDER) {
    const ml = amounts[key] || 0;
    if (!ml || INGREDIENTS[key].floats) continue;
    // water dilutes but barely shows color, so weight it lightly
    const w = key === 'water' ? ml * 0.35 : ml;
    hexToRgb(colors[key] || INGREDIENTS[key].color).forEach((c, i) => (acc[i] += c * w));
    total += w;
  }
  if (!total) return null;
  return `rgb(${acc.map(c => Math.round(c / total)).join(',')})`;
}

// Build the list of visible bands, bottom to top.
export function bands(amounts, mixed = false, colors = {}) {
  const col = k => colors[k] || INGREDIENTS[k].color;
  const out = [];
  if (mixed) {
    const liquid = STACK_ORDER.filter(k => !INGREDIENTS[k].floats).reduce((s, k) => s + (amounts[k] || 0), 0);
    if (liquid > 0) out.push({ key: 'mixed', ml: liquid, color: mixColor(amounts, colors) });
    for (const k of STACK_ORDER) if (INGREDIENTS[k].floats && amounts[k] > 0) out.push({ key: k, ml: amounts[k], color: col(k) });
  } else {
    for (const k of STACK_ORDER) if (amounts[k] > 0) out.push({ key: k, ml: amounts[k], color: col(k) });
  }
  return out;
}

// colors: optional per-ingredient overrides (e.g. oat milk is a little beiger than dairy)
export function layersMarkup(geo, amounts, { mixed = false, colors = {} } = {}) {
  const { x1, x2, mlToPx, widthAt, cup } = geo;
  let y = BOTTOM;
  let svg = '';
  const list = bands(amounts, mixed, colors);
  list.forEach((b, i) => {
    const h = b.ml * mlToPx;
    const yTop = y - h;
    const ing = INGREDIENTS[b.key];
    const opacity = ing && ing.opacity ? ing.opacity : 1;
    const isFoamy = b.key === 'foam' || b.key === 'cream';
    svg += `<rect class="band band-${b.key}" x="${x1 - 10}" y="${yTop}" width="${x2 - x1 + 20}" height="${h + 1}" fill="${b.color}" fill-opacity="${opacity}" />`;
    if (isFoamy) svg += `<rect x="${x1 - 10}" y="${yTop}" width="${x2 - x1 + 20}" height="${h + 1}" fill="url(#bubbles)" />`;
    if (b.key === 'espresso' && !mixed && h > 3) {
      // a thin crema line on top of the shot
      svg += `<rect x="${x1 - 10}" y="${yTop}" width="${x2 - x1 + 20}" height="${Math.min(4, h)}" fill="#a8683a" opacity=".85" />`;
    }
    y = yTop;
    if (i === list.length - 1) {
      const w = Math.min(widthAt(yTop), cup.topW);
      svg += `<ellipse class="surface" cx="${CX}" cy="${yTop}" rx="${w / 2 - 1}" ry="${Math.min(6, 2 + w / 40)}" fill="${b.color}" />
              <ellipse class="surface-hi" cx="${CX}" cy="${yTop}" rx="${w / 2 - 1}" ry="${Math.min(6, 2 + w / 40)}" />`;
    }
  });
  return svg;
}

// A complete, static cup (used for cards and previews).
export function cupSVG(cupKey, amounts, { mixed = false, className = '', colors = {} } = {}) {
  const geo = geometry(cupKey);
  const id = `clip-${++uid}`;
  return `<svg class="cup-svg ${className}" viewBox="${VIEWBOX}" aria-hidden="true">
    <defs>${clipMarkup(geo, id)}</defs>
    <g clip-path="url(#${id})">${layersMarkup(geo, amounts, { mixed, colors })}</g>
    ${outlineMarkup(geo)}
  </svg>`;
}

export const total = a => Object.values(a).reduce((s, v) => s + (v || 0), 0);

export function fitCup(volume) {
  return Object.keys(CUPS).find(k => volume <= CUPS[k].capacity * 0.9) || 'mug';
}

// How alike two drinks are: mostly the ratio, a little bit the size.
export function similarity(a, b) {
  const ta = total(a), tb = total(b);
  if (!ta || !tb) return 0;
  let l1 = 0;
  for (const k of Object.keys(INGREDIENTS)) l1 += Math.abs((a[k] || 0) / ta - (b[k] || 0) / tb);
  const ratio = 1 - l1 / 2;
  const size = Math.max(0, 1 - Math.abs(Math.log(ta / tb)) / Math.log(4));
  return ratio * 0.8 + size * 0.2;
}

export function matches(amounts) {
  return DRINKS.map(d => ({ drink: d, score: similarity(amounts, d.recipe) }))
    .sort((x, y) => y.score - x.score);
}

// "1 : 3.3 : 0.3" relative to the coffee base
export function ratioParts(amounts) {
  const keys = STACK_ORDER.filter(k => amounts[k] > 0.5);
  if (!keys.length) return [];
  const base = amounts.espresso > 0.5 ? amounts.espresso
    : amounts.brewed > 0.5 ? amounts.brewed
    : Math.min(...keys.map(k => amounts[k]));
  const fmt = n => (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10).toString();
  return keys.map(k => ({ key: k, part: fmt(amounts[k] / base) }));
}

export function recipeText(recipe) {
  return STACK_ORDER.filter(k => recipe[k]).map(k => `${recipe[k]} ml ${INGREDIENTS[k].short}`).join(' · ');
}
