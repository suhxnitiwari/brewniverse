# ☕ Brewniverse

*The whole world of coffee in one site: follow a cherry from the tree to your mug, then pull the shot yourself.*

**Live:** https://suhxnitiwari.github.io/brewniverse/

## What it is

An interactive coffee guide built to feel like a small world you step into. You arrive through a gate, a single coffee cherry travels down the page as you scroll and turns into a seed, a green bean, a sack on a ship, a roasting bean, grounds, espresso, milk and finally latte art. Along the way you peel a cherry layer by layer, roast a bean through first crack, match grinds to brewers, collect passport stamps from coffee origins, build a drink at a barista bar and get scored on it, and pour milk into a cup where the height of your pour changes the physics.

No frameworks and no build step: about 4,400 lines of vanilla ES modules, plus hand-written CSS and HTML.

## How it's built

- **Every sound is synthesized live.** [`js/sound.js`](js/sound.js) uses the Web Audio API with no audio files: a shared pink-noise buffer run through biquad filters, oscillators modulated by LFOs, and gain envelopes. Each chapter has its own ambient bed that crossfades as you scroll (birds on the farm, water at the mill, café murmur). Held actions are parameterized loops: the grinder's pitch follows the grind setting (coarse growls, fine whines), the steam wand changes with tip depth, the roaster's gas roar intensifies with temperature.
- **One canvas of particle "weather."** [`js/world.js`](js/world.js) runs a full-screen particle system with 12 biomes (pollen, water, sea spray, embers, grounds, crema, bubbles, aroma petals and more), each defined by colors, shape, velocity, turbulence and density. Particles have depth for parallax, lean toward the cursor on a spring, scatter from click ripples, and are re-dressed in staggered waves so the weather shimmers into the next biome instead of cutting. Glow dots are drawn from cached radial-gradient sprites rather than new gradients per particle per frame, and the loop pauses when the tab is hidden.
- **A pour that follows real behavior.** In the Pour Lab ([`js/pour.js`](js/pour.js)) the pitcher's height above the liquid changes what lands: foam poured from high up plunges under the crema and mixes as milk, milk poured low partly floats as froth, and higher pours run faster and splash. The cup's layers, blended color and ratio bar update as you pour or sip from the top.
- **Drink recognition by ratio.** [`js/cup.js`](js/cup.js) names whatever you've poured by comparing it to every recipe: an L1 distance between normalized ingredient ratios (80% of the score) plus a log-scaled size term (20%), sorted to find the closest match.
- **A barista score that teaches.** [`js/barista.js`](js/barista.js) walks you through grind, distribute, tamp, pull, steam and pour, then grades each step in bands (dose near 18 g, tamp around 25 to 36 lb, a shot of about 60 ml in 25 to 30 seconds, milk temperature within each milk's range, pour accuracy, latte art). A fast, watery shot is diagnosed as a sour gusher and a slow one as choked and bitter; the stars come from the average, and the tip targets your weakest row.
- **A real map.** The Coffee Map ([`js/map.js`](js/map.js)) draws countries with d3 and topojson, shades growers by harvest size, and only loads once it's near the viewport via `IntersectionObserver`. Passport stamps persist in `localStorage`.
- **Downloadable tasting card.** The Flavor Wheel renders your chosen notes to a 1080×1350 canvas and exports it as a PNG.
- **Accessible motion.** The particle world, roast, anatomy and guide animations respect `prefers-reduced-motion`.

## Design choices

- It opens like a film and gets more hands-on the further you scroll, so reading turns into doing.
- The air itself tells you where you are: embers get hotter as you roast, the flavor wheel tints the particles with whatever you're "smelling," and a small readout in the corner tracks how close you are to your cup.
- Tasting is treated like perfume. Flavor families bloom outward and the notes you pick drift upward like scent.
- The Menu is a scrolling fashion editorial: one cup morphs from espresso to macchiato, cortado, flat white, cappuccino, latte, mocha and americano with the ratios shifting inside it.
- It has a voice. Drag the wrong grounds into a brewer and "Your espresso machine is judging you."
- It ends on a quiet morning-coffee scene.

## What's inside

0. **The journey:** the scroll-driven cherry-to-latte story, each chapter with a "Why? +" for the details.
1. **Seed to Cup:** 15 steps from planting to sipping, with a meter showing how 5 kg of cherries shrinks to about 55 cups.
2. **Bean Anatomy:** peel 7 layers of a coffee cherry the way a farm does, and flip to a peaberry.
3. **Beans & Roasts:** species to variety to origin to grade to roast; Arabica, Robusta, Liberica and Excelsa compared; 21 coffees by origin; 20 varieties by family tree.
4. **Coffee Map:** travel to an origin (Ethiopia, Colombia, Brazil, Kenya, Guatemala, Yemen, Sumatra, Vietnam), get a stamp, then explore the numbers, or see where Starbucks, Dunkin', Tim Hortons, McCafé, Nespresso and Nescafé say they buy beans.
5. **Roastery:** hold the burner through first and second crack, with live flavor meters.
6. **Grind Guide:** extra coarse to extra fine, magnified, plus the grind-matching game.
7. **Flavor Wheel:** build a palette and download it as a tasting card.
8. **Barista School:** eight drinks, syrups, six milks, steaming, and heart, tulip, rosetta or swan latte art.
9. **Pour Lab:** a giant cup and a pitcher that follows your cursor.
10. **The Menu:** the editorial drink sequence, with all 18 drinks one click away.

Recipes and numbers are typical café values and rounded recent averages. Chains don't publish exact blends, so the brand map shows origins they've named publicly. Photos are from [Unsplash](https://unsplash.com), credited in the footer and in [`js/photos.js`](js/photos.js).

## Tech stack

Vanilla JavaScript (ES modules), HTML, CSS, Canvas 2D, SVG, Web Audio API, d3 + topojson, GitHub Pages.

## Run it locally

ES modules need a local server (opening the file directly won't work):

```bash
python3 -m http.server 5180
```

Then open http://localhost:5180. The map loads d3, topojson and country shapes from a CDN, so it needs an internet connection.

## Project layout

```
index.html        page structure
css/style.css     all styles (light + dark mode)
js/data.js        drinks, ingredients, cups, anatomy, roast data
js/world-data.js  journey, species, roast levels, origins + brands, grinds, flavor wheel
js/util.js        press-and-hold, animation ticker, small helpers
js/sound.js       the sound engine: ambient beds, effects, held loops
js/world.js       the living particle world, its weather, cursor light and ripples
js/photos.js      Unsplash photos + credits
js/site.js        arrival gate, nav, chapter menu, sound toggle, weather + trip readout
js/cup.js         cup drawing + ratio / matching math
js/journey.js     the scroll-driven bean journey
js/anatomy.js     Bean Anatomy
js/beans.js       Beans & Roasts
js/map.js         Coffee Map (d3 + world-atlas)
js/roast.js       Roastery
js/grind.js       Grind Guide
js/wheel.js       Flavor Wheel
js/barista.js     Barista School
js/pour.js        Pour Lab
js/menu.js        the editorial drink sequence
js/passport.js    passport stamps and origin trips
js/guide.js       the full drink grid
```

Built by [Suhani Tiwari](https://suhanitiwari.com).
