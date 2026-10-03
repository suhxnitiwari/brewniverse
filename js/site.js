// Site chrome: the global sound switch, the chapter menu, photos, the soundboard, and
// small touches like ambient beds per section and a click sound on buttons.
import { Sound } from './sound.js';
import { applyPhotos, creditsHTML } from './photos.js';
import { $ } from './util.js';
import { World } from './world.js';

const BOARD = [
  { id: 'pick',  label: 'Pick',  play: () => { Sound.sfx('pick'); setTimeout(() => Sound.sfx('drop'), 180); } },
  { id: 'roast', label: 'Roast', play: () => { const h = Sound.loop('roaster', 0.7); for (let i = 0; i < 9; i++) setTimeout(() => Sound.sfx('crack'), 300 + Math.random() * 1400); setTimeout(() => h.stop(), 2000); } },
  { id: 'grind', label: 'Grind', play: () => { const h = Sound.loop('grind', 0.8); setTimeout(() => h.stop(), 1500); } },
  { id: 'pull',  label: 'Pull',  play: () => { Sound.sfx('clunk'); const h = Sound.loop('pump'); setTimeout(() => h.stop(), 2200); } },
  { id: 'steam', label: 'Steam', play: () => { const h = Sound.loop('steam', 1); setTimeout(() => h.set(0), 900); setTimeout(() => h.stop(), 1900); } },
  { id: 'pour',  label: 'Pour',  play: () => { const h = Sound.loop('pour', 0.4); setTimeout(() => h.stop(), 1500); setTimeout(() => Sound.sfx('clink'), 1600); } },
];

// which ambient bed plays while a section is on screen
const BEDS = { top: 'cafe', anatomy: 'farm', beans: 'none', coffeemap: 'sea', roast: 'roaster', grind: 'none', soundboard: 'none', flavor: 'none', barista: 'cafe', pour: 'cafe', drinks: 'cafe', morning: 'cafe' };

function initSoundToggle() {
  const btn = $('soundToggle');
  Sound.subscribe(on => {
    btn.setAttribute('aria-pressed', on);
    btn.querySelector('.sound-label').textContent = on ? 'Sound on' : 'Sound off';
    document.documentElement.classList.toggle('sound-on', on);
    $('sbNote').textContent = on ? 'Tap a word.' : 'Turn the sound on, then tap.';
  });
  btn.addEventListener('click', () => { Sound.toggle(); Sound.sfx('click'); });
  // browsers only allow audio after a gesture, so a remembered “on” waits for the first tap
  if (Sound.on) {
    const wake = () => { Sound.toggle(true); removeEventListener('pointerdown', wake); removeEventListener('keydown', wake); };
    addEventListener('pointerdown', wake, { once: true });
    addEventListener('keydown', wake, { once: true });
  }
}

function initMenu() {
  const btn = $('menuBtn'), menu = $('menu');
  const set = open => {
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', open);
    btn.textContent = open ? 'Close' : 'Chapters';
    document.body.classList.toggle('menu-open', open);
    Sound.sfx('paper');
  };
  btn.addEventListener('click', () => set(menu.hidden));
  menu.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) set(false); });
}

// The nav turns light-on-dark whenever it sits over a dark, photographic section.
const DARK = '.hero, .story, .chapter-card, .breath, .roastery, .soundboard, .morning, .bar-dark';
function initNav() {
  const nav = $('nav');
  let raf = 0;
  const check = () => {
    raf = 0;
    nav.style.visibility = 'hidden';
    const el = document.elementFromPoint(innerWidth / 2, 30);
    nav.style.visibility = '';
    nav.classList.toggle('over-hero', !!el?.closest(DARK));
  };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(check); }, { passive: true });
  check();
}

function initBoard() {
  $('soundBoard').innerHTML = BOARD.map(b => `<button type="button" class="sb-key" data-sb="${b.id}"><span>${b.label}</span></button>`).join('');
  $('soundBoard').addEventListener('click', e => {
    const b = e.target.closest('[data-sb]');
    if (!b) return;
    if (!Sound.on) Sound.toggle(true);
    BOARD.find(x => x.id === b.dataset.sb).play();
    const r = b.getBoundingClientRect(); World.ripple(r.left + r.width / 2, r.top + r.height / 2);
    b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit');
  });
}

function initBeds() {
  // the journey runs its own beds; everything else picks one by what’s on screen
  const io = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting && BEDS[e.target.id]) Sound.ambience(BEDS[e.target.id]);
  }, { threshold: 0.45 });
  Object.keys(BEDS).forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });
}

// The little status line in the corner: where you are on the trip, and how close the cup is.
let placeLock = null;
export function setPlace(label, owner = null) {
  if (placeLock && owner !== placeLock) return;
  $('hudPlace').textContent = label;
}
export function lockPlace(owner) { placeLock = owner; }

function initWeather() {
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      World.set(e.target.dataset.biome);
      lockPlace(null);
      setPlace(e.target.dataset.place);
    }
  }, { rootMargin: '-45% 0px -45% 0px' });
  document.querySelectorAll('[data-biome]').forEach(el => io.observe(el));
  let raf = 0;
  const progress = () => {
    raf = 0;
    const p = Math.min(1, scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight));
    $('hudBar').style.transform = `scaleX(${p})`;
    $('hudPct').textContent = p > 0.985 ? 'Your cup' : `${Math.round(p * 100)}% to your cup`;
  };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(progress); }, { passive: true });
  progress();
}

// The arrival: the world is already moving behind the gate; you choose how to come in.
function initGate() {
  const gate = $('gate');
  let seen = false;
  try { seen = sessionStorage.getItem('brew-entered') === '1'; } catch {}
  const open = (withSound, e) => {
    try { sessionStorage.setItem('brew-entered', '1'); } catch {}
    if (withSound != null) Sound.toggle(withSound);
    if (withSound) Sound.sfx('bloom');
    const r = e?.target?.getBoundingClientRect?.();
    World.ripple(r ? r.left + r.width / 2 : innerWidth / 2, r ? r.top + r.height / 2 : innerHeight / 2);
    gate.classList.add('open');
    document.body.classList.remove('gated');
    setTimeout(() => (gate.hidden = true), 1400);
  };
  if (seen) { gate.hidden = true; document.body.classList.remove('gated'); return; }
  // every arrival starts at the beginning
  try { history.scrollRestoration = 'manual'; } catch {}
  scrollTo(0, 0);
  $('enterSound').addEventListener('click', e => open(true, e));
  $('enterQuiet').addEventListener('click', e => open(false, e));
  addEventListener('keydown', function esc(e) { if (e.key === 'Escape' && !gate.hidden) { open(null); removeEventListener('keydown', esc); } });
  $('enterSound').focus({ preventScroll: true });
}

function initReveal() {
  const io = new IntersectionObserver(entries => entries.forEach(e => e.isIntersecting && e.target.classList.add('in')), { threshold: 0.25 });
  document.querySelectorAll('.chapter-card, .breath, .morning, .soundboard').forEach(el => io.observe(el));
}

export function initSite() {
  initGate();
  applyPhotos();
  $('photoCredits').innerHTML = creditsHTML();
  initSoundToggle();
  initMenu();
  initNav();
  initBoard();
  initBeds();
  initWeather();
  initReveal();
  // a soft tick on every button press, when sound is on
  document.addEventListener('click', e => { if (e.target.closest('.btn, .chip, .seg button, .b-drink, .b-milk')) Sound.sfx('click'); });
  $('morning').querySelector('.m-again').addEventListener('click', () => Sound.sfx('clink'));
}
