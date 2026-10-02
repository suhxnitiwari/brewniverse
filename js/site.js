// Site chrome: the global sound switch, the chapter menu, photos, the soundboard, and
// small touches like ambient beds per section and a click sound on buttons.
import { Sound } from './sound.js';
import { applyPhotos, creditsHTML } from './photos.js';
import { $ } from './util.js';

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

function initReveal() {
  const io = new IntersectionObserver(entries => entries.forEach(e => e.isIntersecting && e.target.classList.add('in')), { threshold: 0.25 });
  document.querySelectorAll('.chapter-card, .breath, .morning, .soundboard').forEach(el => io.observe(el));
}

export function initSite() {
  applyPhotos();
  $('photoCredits').innerHTML = creditsHTML();
  initSoundToggle();
  initMenu();
  initNav();
  initBoard();
  initBeds();
  initReveal();
  // a soft tick on every button press, when sound is on
  document.addEventListener('click', e => { if (e.target.closest('.btn, .chip, .seg button, .b-drink, .b-milk')) Sound.sfx('click'); });
  $('morning').querySelector('.m-again').addEventListener('click', () => Sound.sfx('clink'));
}
