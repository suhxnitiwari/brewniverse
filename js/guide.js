// Drink Guide cards + the hero cup. Both "build" a drink layer by layer.
import { DRINKS, INGREDIENTS, STACK_ORDER } from './data.js';
import { cupSVG, fitCup, total, ratioParts, recipeText } from './cup.js';
import { followRecipe } from './pour.js';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'black', label: 'No milk' },
  { id: 'milk', label: 'Milky' },
  { id: 'strong', label: 'Strong' },
  { id: 'sweet', label: 'Sweet' },
];

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Fill `recipe` into `el` from empty, one ingredient at a time.
export function animateBuild(el, recipe, ms = 1400) {
  const cup = fitCup(total(recipe));
  if (el._anim) cancelAnimationFrame(el._anim);
  if (reduceMotion) { el.innerHTML = cupSVG(cup, recipe); return; }
  const vol = total(recipe);
  const start = performance.now();
  const frame = now => {
    const p = Math.min(1, (now - start) / ms);
    const eased = 1 - Math.pow(1 - p, 2);
    let left = vol * eased;
    const partial = {};
    for (const k of STACK_ORDER) {
      if (!recipe[k]) continue;
      partial[k] = Math.min(recipe[k], left);
      left -= partial[k];
    }
    el.innerHTML = cupSVG(cup, partial);
    if (p < 1) el._anim = requestAnimationFrame(frame);
  };
  el._anim = requestAnimationFrame(frame);
}

export function initGuide() {
  const grid = document.getElementById('drinkGrid');
  const filters = document.getElementById('drinkFilters');

  filters.innerHTML = FILTERS.map((f, i) =>
    `<button type="button" class="chip" data-filter="${f.id}" aria-pressed="${i === 0}">${f.label}</button>`).join('');

  grid.innerHTML = DRINKS.map(d => {
    const rp = ratioParts(d.recipe);
    const parts = rp.length === 1
      ? `100% ${INGREDIENTS[rp[0].key].short}`
      : rp.map(p => `${p.part} ${INGREDIENTS[p.key].short}`).join(' : ');
    return `<article class="drink-card" data-id="${d.id}" data-tags="${d.tags.join(' ')}" tabindex="0">
      <div class="drink-art">${cupSVG(fitCup(total(d.recipe)), d.recipe)}</div>
      <h3>${d.name}</h3>
      <p class="drink-ratio">${parts}</p>
      <p class="drink-blurb">${d.blurb}</p>
      <p class="drink-recipe">${recipeText(d.recipe)}</p>
      <button type="button" class="btn btn-sm pour-this">Pour it yourself →</button>
    </article>`;
  }).join('');

  grid.querySelectorAll('.drink-card').forEach(card => {
    const drink = DRINKS.find(d => d.id === card.dataset.id);
    const art = card.querySelector('.drink-art');
    const play = () => animateBuild(art, drink.recipe);
    card.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') play(); });
    card.addEventListener('focus', play);
    card.addEventListener('click', e => {
      if (e.target.closest('.pour-this')) {
        followRecipe(drink.id);
        document.getElementById('pour').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
      } else {
        play();
      }
    });
  });

  filters.addEventListener('click', e => {
    const b = e.target.closest('[data-filter]');
    if (!b) return;
    filters.querySelectorAll('[data-filter]').forEach(x => x.setAttribute('aria-pressed', x === b));
    const f = b.dataset.filter;
    grid.querySelectorAll('.drink-card').forEach(card => {
      card.hidden = f !== 'all' && !card.dataset.tags.split(' ').includes(f);
    });
  });
}

export function initHero() {
  const btn = document.getElementById('heroCup');
  const art = document.getElementById('heroCupArt');
  const name = document.getElementById('heroCupName');
  const lineup = ['cappuccino', 'americano', 'mocha', 'cortado', 'latte', 'macchiato', 'flatwhite']
    .map(id => DRINKS.find(d => d.id === id));
  let i = 0, timer;
  const show = () => {
    const d = lineup[i % lineup.length];
    name.textContent = d.name;
    animateBuild(art, d.recipe, 1800);
    i++;
    clearTimeout(timer);
    timer = setTimeout(show, 4200);
  };
  btn.addEventListener('click', show);
  show();
}
