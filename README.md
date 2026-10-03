# ☕ Brewniverse

The whole world of coffee in one site. **Live:** https://suhxnitiwari.github.io/brewniverse/

An interactive coffee guide. No frameworks, no build step: just HTML, CSS and JavaScript.

## What you can do

It’s built to feel like a little world you step into. You arrive through a gate (with sound or quietly), and a living layer of particles floats over the whole site and changes its weather as you travel: pollen on the farm, water at the mill, sea spray in shipping, embers at the roast (hotter as you heat), falling grounds at the grinder, crema motes at the espresso, rising milk bubbles, aroma petals at the flavor wheel, and golden dust in the morning sun. Particles lean toward your cursor, a warm light follows it, and clicking empty space sends a ripple through everything. A small readout in the corner tells you where you are and how close you are to your cup.

It opens like a film and gets more hands-on as you scroll. Turn **Sound** on in the top corner: every chapter has its own ambient bed (birds on the farm, water at the mill, the roaster, café murmur), and grinding, steaming, pulling and pouring all make their own sounds. Every sound is synthesized live with the Web Audio API, with no audio files.

The site follows coffee from the tree to your mug:

0. **The journey:** one coffee cherry travels down the page as you scroll and transforms into a seed, a green bean, a sack on a ship, a roasting bean (watch the temperature climb to first crack), grounds, espresso, milk, and finally latte art, over full-bleed photos. Every chapter has a “Why? +” with the detailed steps.

1. **Seed to Cup:** 15 steps from planting to sipping (harvest, float sorting, washed / natural / honey processing, drying, hulling, grading, shipping, roasting, resting, grinding, brewing). A meter tracks how 5 kg of cherries shrinks to about 55 cups.
2. **Bean Anatomy:** a cross-section of a coffee cherry. Peel the 7 layers the way a farm processes coffee, and flip to a peaberry.
3. **Beans & Roasts:** how coffee names fit together (species → variety → origin → grade → roast), Arabica, Robusta, Liberica and Excelsa compared (where the names come from, caffeine, price), 21 coffees by origin (Colombian, Kenya AA, Sumatra, Yirgacheffe, Kona…) linked to the map, rare wild species, 20 varieties by family tree, and light / medium / medium-dark / dark roast piles.
4. **Coffee Map:** “your coffee has a passport.” Click a big origin (Ethiopia, Colombia, Brazil, Kenya, Guatemala, Yemen, Sumatra, Vietnam) and you travel there first: a full-screen landscape, a passport stamp, tasting notes drifting in the air, then “Explore this origin” for the numbers. Stamps you collect are kept in your browser. The map is shaded by harvest size; tap any grower for its flavors and harvest season, or pick Starbucks, Dunkin’, Tim Hortons, McCafé, Nespresso or Nescafé to see where they say they buy their beans.
5. **Roastery:** hold the burner to roast a green bean through first and second crack, with live flavor meters.
6. **Grind Guide:** extra coarse (cold brew) to extra fine (Turkish), with magnified grounds and a grinder that growls or whines as you slide. Then the grind game: drag the grounds into the right brewer (“Your espresso machine is judging you.”).
7. **Flavor Wheel:** tasting treated like perfume. A flavor family blooms outward, the air takes on its colors, notes you pick drift up like scent, and your palette becomes a downloadable tasting card.
8. **Barista School:** a game behind a dark espresso bar. Pick a drink (espresso, americano, latte, flat white, cappuccino, macchiato, mocha, breve), add syrups, then grind, distribute, tamp, lock in and pull the shot yourself (a coarse grind gushes, a loose puck spurts). Pick whole, 2%, oat, almond, soy or half & half, purge the wand, steam it to the right temperature, tap and swirl, pour it with latte art (heart, tulip, rosetta, swan), and get scored.
9. **Pour Lab:** a huge cup and a pitcher that follows your cursor. Height matters: pour milk from high up and it dives under the crema; pour low and the foam floats. A “Why did that happen?” note explains each pour.
10. **The Menu:** a scrolling fashion editorial. One cup morphs from espresso to macchiato, cortado, flat white, cappuccino, latte, mocha and americano, with the ratios changing inside it. All 18 drinks are still one click away.

It ends on a quiet morning-coffee scene. Photos are from [Unsplash](https://unsplash.com) (credited in the footer and in [`js/photos.js`](js/photos.js)), loaded from Unsplash’s image CDN.

Drinks live in [`js/data.js`](js/data.js); everything else (journey, species, map origins, grinds, flavors) is in [`js/world-data.js`](js/world-data.js). The map loads d3, topojson and country shapes from a CDN, so it needs an internet connection.

## Run it locally

ES modules need a local server (opening the file directly won’t work):

```bash
python3 -m http.server 5180
```

Then open http://localhost:5180.

## Deploy

Push to GitHub, then go to **Settings → Pages → Deploy from branch → `main` / root**.

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
js/site.js        arrival gate, nav, chapter menu, sound toggle, weather + trip readout, soundboard
js/cup.js         cup drawing + ratio / matching math
js/journey.js     the scroll-driven bean journey
js/anatomy.js     Bean Anatomy
js/beans.js       Beans & Roasts
js/map.js         Coffee Map (d3 + world-atlas)
js/roast.js       Roastery (sound is synthesized with the Web Audio API)
js/grind.js       Grind Guide
js/wheel.js       Flavor Wheel
js/barista.js     Barista School
js/pour.js        Pour Lab
js/menu.js        the editorial drink sequence
js/passport.js    passport stamps and origin trips
js/guide.js       the full drink grid
```

Recipes and numbers are typical café values and rounded recent averages. Chains don’t publish exact blends, so the brand map shows origins they’ve named publicly.
