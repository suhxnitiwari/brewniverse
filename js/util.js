// Small helpers shared by every section.

export const $ = id => document.getElementById(id);

// Press-and-hold on mouse, touch, and keyboard (Space / Enter).
export function holdable(el, onStart, onStop) {
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

// Loop a callback with the real elapsed seconds until stop() is called.
export function ticker(onTick) {
  let raf = 0, last = 0;
  const step = now => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    onTick(dt);
    raf = requestAnimationFrame(step);
  };
  return {
    start() { if (raf) return; last = performance.now(); raf = requestAnimationFrame(step); },
    stop() { cancelAnimationFrame(raf); raf = 0; },
    get on() { return !!raf; },
  };
}

// A tiny seeded random so drawings come out the same every load.
export function seeded(seed = 1) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const cToF = c => Math.round(c * 9 / 5 + 32);
