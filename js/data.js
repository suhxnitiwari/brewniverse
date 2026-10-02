// All the coffee knowledge lives here. Every cup on the site is drawn from these numbers.

// rate = ml per second while you hold the pitcher
export const INGREDIENTS = {
  syrup:     { name: 'Flavor syrup',  short: 'syrup',     color: '#c98a3e', rate: 8 },
  espresso:  { name: 'Espresso',      short: 'espresso',  color: '#2b170d', rate: 20 },
  brewed:    { name: 'Brewed coffee', short: 'coffee',    color: '#6b4429', rate: 50 },
  water:     { name: 'Hot water',     short: 'water',     color: '#c9e4f2', rate: 50, opacity: 0.8 },
  milk:      { name: 'Steamed milk',  short: 'milk',      color: '#efdfc6', rate: 45 },
  foam:      { name: 'Milk foam',     short: 'foam',      color: '#fdf8ef', rate: 30, floats: true },
  chocolate: { name: 'Chocolate',     short: 'chocolate', color: '#5c2d1a', rate: 15 },
  cream:     { name: 'Whipped cream', short: 'cream',     color: '#fffdf7', rate: 25, floats: true },
};

// Pitcher order on screen
export const PITCHER_ORDER = ['espresso', 'brewed', 'water', 'milk', 'foam', 'chocolate', 'cream'];

// Bottom → top. Heavy syrup sinks, foam and cream float.
export const STACK_ORDER = ['syrup', 'chocolate', 'espresso', 'brewed', 'water', 'milk', 'foam', 'cream'];

export const CUPS = {
  demitasse: { name: 'Demitasse', capacity: 100, topW: 124, botW: 84,  h: 96,  handle: true },
  glass:     { name: 'Glass',     capacity: 200, topW: 132, botW: 112, h: 156, handle: false },
  mug:       { name: 'Mug',       capacity: 360, topW: 184, botW: 166, h: 214, handle: true },
};

// Recipes in ml. tags drive the guide filters.
export const DRINKS = [
  { id: 'espresso', name: 'Espresso', tags: ['black'],
    recipe: { espresso: 30 },
    blurb: 'A 30 ml shot of coffee forced through a tight puck under pressure. Everything else starts here.' },
  { id: 'ristretto', name: 'Ristretto', tags: ['black'],
    recipe: { espresso: 18 },
    blurb: 'A “restricted” shot: same coffee, less water. Shorter, thicker, sweeter.' },
  { id: 'doppio', name: 'Doppio', tags: ['black'],
    recipe: { espresso: 60 },
    blurb: 'Two shots in one cup. The base of most café drinks.' },
  { id: 'lungo', name: 'Lungo', tags: ['black'],
    recipe: { espresso: 90 },
    blurb: 'A “long” shot: extra water pushed through the same coffee. Thinner and more bitter.' },
  { id: 'americano', name: 'Americano', tags: ['black'],
    recipe: { espresso: 60, water: 120 },
    blurb: 'Espresso stretched with hot water. Drip-coffee strength, espresso flavor.' },
  { id: 'black', name: 'Black Coffee', tags: ['black'],
    recipe: { brewed: 240 },
    blurb: 'Brewed coffee: drip, pour-over, French press. No espresso machine needed.' },
  { id: 'redeye', name: 'Red Eye', tags: ['black', 'strong'],
    recipe: { brewed: 210, espresso: 30 },
    blurb: 'Brewed coffee with a shot of espresso dropped in. For very long nights.' },
  { id: 'macchiato', name: 'Macchiato', tags: ['milk', 'strong'],
    recipe: { espresso: 30, foam: 15 },
    blurb: 'Espresso “stained” with a spoonful of foam. Tiny and intense.' },
  { id: 'cortado', name: 'Cortado', tags: ['milk', 'strong'],
    recipe: { espresso: 60, milk: 60 },
    blurb: 'Equal parts espresso and steamed milk. Takes the edge off without hiding the coffee.' },
  { id: 'piccolo', name: 'Piccolo', tags: ['milk'],
    recipe: { espresso: 25, milk: 60, foam: 10 },
    blurb: 'A tiny latte in a small glass, usually built on a ristretto.' },
  { id: 'flatwhite', name: 'Flat White', tags: ['milk'],
    recipe: { espresso: 60, milk: 110, foam: 10 },
    blurb: 'A double shot with thin, velvety microfoam. Smaller than a latte, so the coffee shows.' },
  { id: 'cappuccino', name: 'Cappuccino', tags: ['milk'],
    recipe: { espresso: 60, milk: 60, foam: 60 },
    blurb: 'The classic thirds: espresso, steamed milk, and a thick cap of foam.' },
  { id: 'galao', name: 'Galão', tags: ['milk'],
    recipe: { espresso: 30, milk: 90, foam: 30 },
    blurb: 'Portugal’s answer to the latte: about 1 part espresso to 3 parts foamy milk.' },
  { id: 'latte', name: 'Caffè Latte', tags: ['milk'],
    recipe: { espresso: 60, milk: 200, foam: 20 },
    blurb: 'Mostly steamed milk with a thin layer of foam. The gentlest espresso drink.' },
  { id: 'breve', name: 'Breve', tags: ['milk', 'sweet'],
    recipe: { espresso: 60, milk: 150, foam: 30 },
    blurb: 'A latte made with steamed half-and-half instead of milk. Rich, creamy and very American.' },
  { id: 'aulait', name: 'Café au Lait', tags: ['milk'],
    recipe: { brewed: 150, milk: 150 },
    blurb: 'Brewed coffee and hot milk, half and half. No espresso involved.' },
  { id: 'mocha', name: 'Mocha', tags: ['milk', 'sweet'],
    recipe: { chocolate: 30, espresso: 60, milk: 150, cream: 30 },
    blurb: 'A latte with chocolate and whipped cream on top. Dessert that counts as coffee.' },
  { id: 'conpanna', name: 'Con Panna', tags: ['sweet', 'strong'],
    recipe: { espresso: 30, cream: 30 },
    blurb: 'A shot of espresso under a cloud of whipped cream.' },
];

// Outer → inner
export const ANATOMY = [
  { id: 'skin', name: 'Skin', sci: 'Exocarp', goneAt: 1,
    body: 'The thin outer skin of the coffee cherry. It starts green and ripens to red (or yellow or orange, depending on the variety).',
    fact: 'Pickers judge ripeness by skin color. Underripe cherries make sour, grassy coffee.' },
  { id: 'pulp', name: 'Pulp', sci: 'Mesocarp', goneAt: 1,
    body: 'A thin layer of sweet, juicy fruit. Coffee cherries are mostly seed, so there isn’t much flesh.',
    fact: 'Dried skins and pulp are steeped into a fruity tea called cascara.' },
  { id: 'mucilage', name: 'Mucilage', sci: 'Pectin layer', goneAt: 2,
    body: 'A slippery, sugary gel stuck to the parchment. How it’s removed (or left on) changes the flavor.',
    fact: '“Honey process” coffees are dried with some mucilage left on, which usually adds sweetness and body.' },
  { id: 'parchment', name: 'Parchment', sci: 'Endocarp', goneAt: 3,
    body: 'A papery, protective hull around each seed. Coffee is often stored “in parchment” until just before export.',
    fact: 'Taking it off is called hulling, or dry milling.' },
  { id: 'silverskin', name: 'Silver skin', sci: 'Spermoderm', goneAt: 4,
    body: 'A tissue-thin seed coat hugging the bean. Bits of it still cling to green coffee.',
    fact: 'It flakes off during roasting as “chaff”, which roasters have to collect.' },
  { id: 'bean', name: 'Bean', sci: 'Endosperm', goneAt: 99,
    body: 'The seed itself: what gets roasted and ground. It stores the caffeine, sugars, oils and acids that become flavor.',
    fact: 'Arabica beans are roughly 1.2–1.5% caffeine. Robusta is about 2.2–2.7%.' },
  { id: 'embryo', name: 'Embryo', sci: 'Germ', goneAt: 99,
    body: 'A tiny germ tucked into the end of the seed. Planted instead of roasted, it would grow a new coffee tree.',
    fact: 'Coffee seedlings are grown from these same seeds, usually still in their parchment.' },
];

export const PROCESS_STAGES = [
  { name: 'Ripe cherry', text: 'Picked at peak red. Each cherry usually holds two seeds with their flat sides facing each other.' },
  { name: 'Pulped', text: 'A pulper squeezes off the skin and fruit. The seeds slide out coated in sticky mucilage.' },
  { name: 'Fermented & washed', text: 'Seeds sit in tanks for roughly 12–48 hours while microbes break down the mucilage, then get washed clean. Now it’s “coffee in parchment.”' },
  { name: 'Dried & hulled', text: 'Dried to about 11% moisture, then hulled to crack off the parchment. What’s left is green coffee, the form that ships around the world.' },
  { name: 'Roasted', text: 'Heat turns the seed brown, builds hundreds of aroma compounds, and blows off the silver skin as chaff.' },
];

// Roast curve: bean temperature (°C) → color + what's happening.
export const ROAST_COLORS = [
  [20, '#9fae76'], [150, '#cdb66c'], [175, '#c09455'], [195, '#9d6a3f'],
  [212, '#74462a'], [226, '#4d2c18'], [242, '#2b180e'], [258, '#120a06'],
];

export const ROAST_STAGES = [
  { from: 0,   name: 'Green',        note: 'Raw seed. Grassy, hard as a pebble, and not something you want to brew.', meters: null, best: [] },
  { from: 150, name: 'Drying',       note: 'Water is boiling off and the bean turns yellow. Smells like hay and toast.', meters: null, best: [] },
  { from: 175, name: 'Browning',     note: 'Sugars caramelize and the Maillard reaction kicks in. Almost there.', meters: null, best: [] },
  { from: 196, name: 'Light',        note: 'Just past first crack. Bright, fruity, floral, tea-like.',
    meters: { acidity: 5, body: 2, bitterness: 1, oil: 0 }, best: ['Pour-over', 'AeroPress', 'Chemex'] },
  { from: 210, name: 'Medium',       note: 'Balanced and sweet: caramel, nuts, milk chocolate.',
    meters: { acidity: 3.5, body: 3, bitterness: 2.5, oil: 1 }, best: ['Drip', 'Pour-over', 'Cold brew'] },
  { from: 222, name: 'Medium-Dark',  note: 'Second crack begins. Dark chocolate, spice, bittersweet.',
    meters: { acidity: 2, body: 4.5, bitterness: 3.5, oil: 3 }, best: ['Espresso', 'Moka pot', 'French press'] },
  { from: 235, name: 'Dark',         note: 'Smoky and roasty. The roast flavor takes over the bean’s own.',
    meters: { acidity: 1, body: 4, bitterness: 5, oil: 5 }, best: ['Espresso', 'Milk drinks', 'French press'] },
  { from: 250, name: 'Burnt',        note: 'Charcoal. The oils are smoking. Maybe stop?',
    meters: { acidity: 0, body: 2, bitterness: 5, oil: 5 }, best: [] },
];

export const FIRST_CRACK = 196;
export const SECOND_CRACK = 224;
