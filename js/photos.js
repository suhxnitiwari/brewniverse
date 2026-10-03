// Photos from Unsplash (free Unsplash License), loaded from Unsplash's image CDN.
// Every photographer is credited in the footer.
export const PHOTOS = {
  hero:    { id: '1609050471053-8636409f9f5b', by: 'Nathan Dumlao', page: 'espresso-pouring-from-portafilter-So7cyDtlmls' },
  farm:    { id: '1701735513192-bc7248978c51', by: 'Projeto Café Gato-Mourisco', page: 'a-lush-green-hillside-covered-in-lots-of-trees-zOVRgigQMQA' },
  cherry:  { id: '1694558334826-a371e09fae1d', by: 'Allec Gomes', page: 'a-branch-with-red-berries-and-green-leaves-6GzV9uNUDS8' },
  pick:    { id: '1670758611084-e216510c5433', by: 'George Dagerotip', page: 'a-person-holding-a-handful-of-berries-in-their-hand-XRY4giMaDoA' },
  dry:     { id: '1649616551649-06bbf4d11354', by: 'Dimitry B', page: 'a-group-of-wooden-boxes-filled-with-purple-beans-VwG92UTKDGc' },
  green:   { id: '1599766676337-49a81ed46552', by: 'Jonathan Farber', page: 'brown-and-gray-pebbles-in-close-up-photography-j_Db7wOW5ik' },
  sacks:   { id: '1565273975921-c884f2b703df', by: 'Diego Catto', page: 'two-bags-of-coffee-beans-sitting-next-to-each-other-9LqctKiRP5c' },
  roaster: { id: '1607681034540-2c46cc71896d', by: 'Tim Mossholder', page: 'coffee-roasting-in-playa-del-carmen-YC6RVdoTtIk' },
  roasted: { id: '1447933601403-0c6688de566e', by: 'Mike Kenneally', page: 'coffee-bean-lot-TD4DBagg2wE' },
  grind:   { id: '1522659516672-189a712c29af', by: 'Hanny Naibaho', page: 'person-holding-the-espresso-portafilter-zvvgwYoThjs' },
  milk:    { id: '1514066558159-fc8c737ef259', by: 'Nathan Dumlao', page: 'man-pouring-milk-in-coffee-2z3MOB3kfJU' },
  latte:   { id: '1559001724-fbad036dbc9e', by: 'Phil Desforges', page: 'cafe-latte-Nw8wbiDE3gU' },
  morning: { id: '1662038271111-5b1c0b4157e8', by: 'Aimee Giles', page: 'steaming-mug-on-wooden-table-u1QfqxhsrXQ' },
  steam:   { id: '1596098823457-74e360fcd023', by: 'tabitha turner', page: 'brown-ceramic-cup-with-white-smoke-PSqT-lQAt7A' },
  // origins for the passport trips (locations checked against each photo’s Unsplash tag)
  ethiopia:  { id: '1572888195250-3037a59d3578', by: 'Erik Hathaway', page: 'aerial-photography-of-mountain-eRFC0_U0hGE' },
  colombia:  { id: '1457414254764-c87b209f5249', by: 'Julian Andres Carmona Serrato', page: 'cloudy-sky-over-mountain-SkIy9L2LjnI' },
  brazil:    { id: '1633437805600-2c58bf56663c', by: 'Dhan Sugui', page: 'a-lush-green-valley-surrounded-by-mountains-AgPj0maIEEs' },
  kenya:     { id: '1740344109636-0e7cbdde0f48', by: 'Tourite Safaris', page: 'a-view-of-a-field-with-a-mountain-in-the-background-bV9pyy4ksUk' },
  guatemala: { id: '1624397741918-19d0a95fa902', by: 'Ferrando Elias', page: 'cars-parked-on-side-of-road-near-building-during-night-time-LS_CULmNM_c' },
  yemen:     { id: '1656416584402-b720e0d786dc', by: 'asamw', page: 'a-city-with-many-buildings-vNTrQ49rByg' },
  indonesia: { id: '1569081562679-6d71c00aab86', by: 'Marc St', page: 'aerial-photo-of-mountains-LU1dhnTY8ZU' },
  vietnam:   { id: '1678099006439-dba9e4d3f9f5', by: 'Pete Walls', page: 'a-grassy-field-with-trees-and-mountains-in-the-background-Fl3bY0hWXv4' },
};

// Pick a width that matches the screen so phones don’t download huge files.
export function photoUrl(key, w) {
  const width = w || Math.min(2400, Math.ceil((window.innerWidth * Math.min(2, window.devicePixelRatio || 1)) / 400) * 400);
  return `https://images.unsplash.com/photo-${PHOTOS[key].id}?auto=format&fit=crop&w=${width}&q=72`;
}

// Fill every [data-photo] element with its background image.
export function applyPhotos(root = document) {
  root.querySelectorAll('[data-photo]').forEach(el => {
    el.style.backgroundImage = `url("${photoUrl(el.dataset.photo)}")`;
  });
}

export function creditsHTML() {
  const seen = new Set();
  return Object.values(PHOTOS).filter(p => !seen.has(p.by) && seen.add(p.by)).map(p =>
    `<a href="https://unsplash.com/photos/${p.page}" target="_blank" rel="noopener">${p.by}</a>`).join(', ');
}
