# ☕ Brewniverse

The whole world of coffee in one site. **Live:** https://suhxnitiwari.github.io/brewniverse/

An interactive coffee guide. No frameworks, no build step: just HTML, CSS and JavaScript.

## What you can do

- **Pour Lab:** hold a pitcher (espresso, brewed coffee, hot water, steamed milk, foam, chocolate, whipped cream) to pour it into a demitasse, glass, or mug. The ratio bar updates live, and the site tells you which drink you’ve made. Hold **Sip** to drink from the top layer down, **Stir** to blend it, and **Undo** your last pour. Pick a recipe to get dashed guide lines to pour up to.
- **Drink Guide:** 17 drinks drawn to scale from their recipes. Hover or tap to watch each one get built, then hit *Pour it yourself*.
- **Bean Anatomy:** a cross-section of a coffee cherry. Tap each of the 7 layers (skin → pulp → mucilage → parchment → silver skin → bean → embryo), peel it the way a farm processes coffee, and flip to a peaberry.
- **Roastery:** hold the burner to heat a green bean. It changes color, puffs up, and pops at first crack (~196 °C) and second crack (~224 °C), with live acidity, body, bitterness and oil meters.

Every cup is generated from the numbers in [`js/data.js`](js/data.js), so adding a drink means adding one line of data.

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
js/cup.js         cup drawing + ratio / matching math
js/pour.js        Pour Lab
js/guide.js       Drink Guide + hero cup
js/anatomy.js     Bean Anatomy
js/roast.js       Roaster (sound is synthesized with the Web Audio API)
```

Recipes are typical café values. Every shop does it a little differently.
