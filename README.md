# ☕ Brewniverse

The whole world of coffee in one site. **Live:** https://suhxnitiwari.github.io/brewniverse/

An interactive coffee guide. No frameworks, no build step: just HTML, CSS and JavaScript.

## What you can do

The site follows coffee from the tree to your mug:

1. **Seed to Cup:** 15 steps from planting to sipping (harvest, float sorting, washed / natural / honey processing, drying, hulling, grading, shipping, roasting, resting, grinding, brewing). A meter tracks how 5 kg of cherries shrinks to about 55 cups.
2. **Bean Anatomy:** a cross-section of a coffee cherry. Peel the 7 layers the way a farm processes coffee, and flip to a peaberry.
3. **Beans & Roasts:** how coffee names fit together (species → variety → origin → grade → roast), Arabica, Robusta, Liberica and Excelsa compared (where the names come from, caffeine, price), 21 coffees by origin (Colombian, Kenya AA, Sumatra, Yirgacheffe, Kona…) linked to the map, rare wild species, 20 varieties by family tree, and light / medium / medium-dark / dark roast piles.
4. **Coffee Map:** a world map of the bean belt, shaded by harvest size. Tap a country for its flavors and harvest season, or pick Starbucks, Dunkin’, Tim Hortons, McCafé, Nespresso or Nescafé to see where they say they buy their beans.
5. **Roastery:** hold the burner to roast a green bean through first and second crack, with live flavor meters.
6. **Grind Guide:** extra coarse (cold brew) to extra fine (Turkish), with magnified grounds, brew times and the “sour → finer, bitter → coarser” rule.
7. **Flavor Wheel:** a tasting wheel you read from the middle out. Tap notes to build your own tasting card.
8. **Barista School:** a guided build. Pick a drink (espresso, americano, latte, flat white, cappuccino, macchiato, mocha, breve), add syrups, then grind, tamp and pull the shot yourself. Pick whole, 2%, oat, almond, soy or half & half, steam it to the right temperature, pour it with latte art (heart, tulip, rosetta, swan), and get scored.
9. **Pour Lab:** hold pitchers to pour any drink and watch the ratio form.
10. **Drink Guide:** 18 drinks drawn to scale from their recipes.

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
js/cup.js         cup drawing + ratio / matching math
js/journey.js     Seed to Cup
js/anatomy.js     Bean Anatomy
js/beans.js       Beans & Roasts
js/map.js         Coffee Map (d3 + world-atlas)
js/roast.js       Roastery (sound is synthesized with the Web Audio API)
js/grind.js       Grind Guide
js/wheel.js       Flavor Wheel
js/barista.js     Barista School
js/pour.js        Pour Lab
js/guide.js       Drink Guide + hero cup
```

Recipes and numbers are typical café values and rounded recent averages. Chains don’t publish exact blends, so the brand map shows origins they’ve named publicly.
