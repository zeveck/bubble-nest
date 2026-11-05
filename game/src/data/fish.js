// The 47 collectible bettas (males): Rust, 28 sons (19 ladies + 9 tank friends) and 18 lost bettas.
// Listed by world (15 / 15 / 17), the order the Collection shows them in.
// pattern: 0 solid, 1 marble, 2 butterfly, 3 koi, 4 dragon, 5 rim
export const PATTERN = { solid: 0, marble: 1, butterfly: 2, koi: 3, dragon: 4, rim: 5 };

const F = (id, name, fins, bodyA, bodyB, finA, finB, accent, sheen, pattern, line, pitch, trail) =>
  ({ id, name, fins, bodyA, bodyB, finA, finB, accent, sheen, pattern: PATTERN[pattern], line, pitch, trail });

const W = (w, f) => (f.world = w, f);
export const FISH = [
  // cw
  W('cw', F('rust', 'Rust', 'halfmoon', '#c4142a', '#8e0f2e', '#b0122c', '#5a1a6e', '#3b52d6', '#4a6cff', 'solid', 'Proud and peckish.', 0, '#ff4a4a')),
  W('cw', F('sky', 'Sky', 'veiltail', '#9fd2ff', '#5f9fe8', '#6fb0ff', '#1f4fd0', '#ffffff', '#bfe6ff', 'solid', 'Daydreams mid-bite.', 2, '#8fd0ff')),
  W('cw', F('mango', 'Mango', 'plakat', '#ff8a1c', '#ff6a00', '#ffb020', '#ffe14a', '#ff5a00', '#ffd27a', 'solid', 'Loud, bright and always hungry.', 4, '#ffa040')),
  W('cw', F('domino', 'Domino', 'halfmoon', '#1e1e28', '#2a2a36', '#22222c', '#16161e', '#f4f4f4', '#6a7cff', 'butterfly', 'Very fancy, very sure.', -2, '#ffffff')),
  W('cw', F('kiwi', 'Kiwi', 'crowntail', '#8fdc3a', '#5fbf2a', '#7ad030', '#3e9a20', '#fff04a', '#d8ff7a', 'rim', 'Spiky and cheerful.', 5, '#a8ff50')),
  W('cw', F('marble', 'Marble', 'plakat', '#f4f1ee', '#e8e2dc', '#f2eeea', '#e0dad4', '#3a5ad8', '#c8c0ff', 'marble', 'Never the same twice.', 1, '#c8a8ff')),
  W('cw', F('cobalt', 'Cobalt', 'crowntail', '#1f4fe0', '#173aa8', '#2050e8', '#0e2a90', '#7ad0ff', '#8ac8ff', 'dragon', 'Shiny armour, soft heart.', -3, '#3a7aff')),
  W('cw', F('sunset', 'Sunset', 'doubletail', '#ff7a5a', '#f0604e', '#ff8a6a', '#c02a8a', '#ffd070', '#ffb0a0', 'solid', 'Glows warmest at dusk.', 3, '#ff8a60')),
  W('cw', F('moss', 'Moss', 'veiltail', '#6a8a2a', '#557522', '#3aa060', '#1a9a5a', '#e0f080', '#c0e890', 'marble', 'Slow, steady and soft.', -3, '#7ab040')),
  W('cw', F('cherry', 'Cherry', 'plakat', '#d8203a', '#b8162e', '#e83048', '#ffffff', '#ffffff', '#ff9aaa', 'butterfly', 'Sweet, with a bit of sass.', 4, '#ff3070')),
  W('cw', F('pip', 'Pip', 'plakat', '#9ff0c8', '#80e0b0', '#c0f8e0', '#ffffff', '#40c090', '#e0fff0', 'solid', 'Small, but very brave.', 9, '#fff090')),
  W('cw', F('bubbles', 'Bubbles', 'veiltail', '#f6e6ee', '#ecd6e2', '#f8eef4', '#80c8ff', '#80c8ff', '#ffffff', 'rim', 'Blows bubbles when nervous.', 6, '#b0f0ff')),
  W('cw', F('lotus', 'Lotus', 'doubletail', '#ffffff', '#f4f0f8', '#ffa0c8', '#b090ff', '#ff80b0', '#ffffff', 'butterfly', 'Calm, pink and pondering.', 1, '#ffb0c8')),
  W('cw', F('sunbeam', 'Sunbeam', 'halfmoon', '#fff090', '#ffe070', '#fff4b0', '#ffffff', '#ffc020', '#fffad0', 'butterfly', 'Naps in warm spots.', 2, '#ffe060')),
  W('cw', F('pebble', 'Pebble', 'crowntail', '#a89a88', '#958878', '#7a808a', '#4a5058', '#e8e0d0', '#d8d0c0', 'marble', 'Hides well. Too well.', -4, '#c0c0cc')),
  // cp
  W('cp', F('copper', 'Copper', 'halfmoon', '#c8743a', '#9a4f22', '#d07a3a', '#7a3a18', '#ffd08a', '#ffb070', 'dragon', 'Warm as a radiator.', -1, '#e08a4a')),
  W('cp', F('ember', 'Ember', 'doubletail', '#e0281e', '#c01a14', '#e83020', '#ff8a1a', '#ffd040', '#ff8a4a', 'butterfly', 'Two tails, twice the swagger.', 3, '#ff6a2a')),
  W('cp', F('koi', 'Koi', 'plakat', '#f6f2ec', '#efe8e0', '#f4efe8', '#ece4da', '#ff6a1a', '#ffd0a0', 'koi', 'Patchy and proud.', 2, '#ff8a3a')),
  W('cp', F('bronze', 'Bronze', 'veiltail', '#b8892e', '#8a6420', '#c09030', '#6a4a14', '#ffe08a', '#ffd070', 'solid', 'Slow, stately and shiny.', -4, '#d8a840')),
  W('cp', F('rosette', 'Rosette', 'halfmoon', '#ff8ab8', '#f06aa0', '#ff9ac4', '#ff5a9a', '#ffffff', '#ffd0ea', 'rim', 'Twirls when happy.', 6, '#ff9ac8')),
  W('cp', F('mustard', 'Mustard', 'doubletail', '#2a50b8', '#1e3a90', '#3a5ac0', '#e8c020', '#ffd020', '#7a9aff', 'rim', 'Mixes colours boldly.', 0, '#e8c830')),
  W('cp', F('marigold', 'Marigold', 'crowntail', '#ffd820', '#ffc410', '#ffe040', '#ff7a10', '#ff5a10', '#fff090', 'solid', 'Sunny side up.', 3, '#ffc030')),
  W('cp', F('teal', 'Teal', 'halfmoon', '#1fb8a8', '#169888', '#20c0b0', '#0a7a7a', '#e0fff8', '#90fff0', 'marble', 'Cool as a pond.', 0, '#30d8c8')),
  W('cp', F('tide', 'Tide', 'veiltail', '#3aa88a', '#2a8a72', '#2a5a8a', '#16306a', '#ffffff', '#c0f0e8', 'rim', 'Comes and goes.', -2, '#80b0f0')),
  W('cp', F('rivet', 'Rivet', 'plakat', '#4a5058', '#3a4048', '#5a6068', '#2a3038', '#d07a3a', '#b0c0d0', 'dragon', 'Holds it all together.', -5, '#6a9ad0')),
  W('cp', F('steam', 'Steam', 'veiltail', '#f2e2c4', '#e8d4b0', '#ffc8a8', '#ffb090', '#ffffff', '#ffffff', 'solid', 'Lets off a little puff.', 5, '#f0f8ff')),
  W('cp', F('pinch', 'Pinch', 'doubletail', '#3a1418', '#2a0e12', '#c0402a', '#8a2418', '#ff7a50', '#ff9070', 'dragon', 'Learned a trick from the crayfish.', 4, '#ff6a30')),
  W('cp', F('gauge', 'Gauge', 'doubletail', '#1e6a3a', '#16542e', '#2a7a44', '#c8a040', '#e8c060', '#80e0a0', 'rim', 'Always measuring something.', -1, '#80c090')),
  W('cp', F('cinder', 'Cinder', 'crowntail', '#2a2a2e', '#202024', '#ff7a20', '#2a2a2e', '#ff8a20', '#ffa060', 'koi', 'Smoulders quietly.', -6, '#ff5020')),
  W('cp', F('brass', 'Brass', 'plakat', '#d8b040', '#c09a30', '#e0bc50', '#6a4a14', '#6a4a14', '#ffe890', 'rim', 'Polished to a shine.', -3, '#e8c040')),
  // nn
  W('nn', F('galaxy', 'Galaxy', 'plakat', '#1a2050', '#121638', '#1e2660', '#2a1e70', '#ffffff', '#7a8aff', 'marble', 'Full of stars.', -2, '#e8ecff')),
  W('nn', F('neon', 'Neon', 'crowntail', '#30e8f0', '#18b8d8', '#28d8f0', '#1898d0', '#ff4fd8', '#a0ffff', 'rim', 'Glows at parties.', 7, '#3cf0ff')),
  W('nn', F('violet', 'Violet', 'veiltail', '#7a3ad0', '#5a20a8', '#8a40d8', '#4a1890', '#d0a0ff', '#c090ff', 'solid', 'Quietly dramatic.', -5, '#a060ff')),
  W('nn', F('avatar', 'Avatar', 'halfmoon', '#6a8ab0', '#4a6a90', '#5a7aa8', '#2a3a60', '#d8e8ff', '#e0f0ff', 'dragon', 'Metal-scaled legend.', -1, '#a8c8e8')),
  W('nn', F('candy', 'Candy', 'doubletail', '#ff9ad0', '#ff7ac0', '#ffa0d8', '#ff70b8', '#30d0c0', '#ffd0f0', 'koi', 'Sweet tooth, sweeter fins.', 5, '#ff8ad0')),
  W('nn', F('orchid', 'Black Orchid', 'crowntail', '#16101e', '#1e1428', '#1a1224', '#120c18', '#9a4ae8', '#8a5aff', 'rim', 'Mysterious nibbler.', -6, '#a060ff')),
  W('nn', F('opal', 'Opal', 'halfmoon', '#f2f0f6', '#e6e8f4', '#f4f2fa', '#d8e0f8', '#ffd0f0', '#b0f0ff', 'solid', 'Shimmers like a pearl.', 8, '#ffffff')),
  W('nn', F('lilac', 'Lilac', 'veiltail', '#c8a8f0', '#b494e4', '#e0ccff', '#ffffff', '#a070e0', '#f4e8ff', 'butterfly', 'Smells like spring, somehow.', 6, '#d0b0ff')),
  W('nn', F('comet', 'Comet', 'doubletail', '#f4f6ff', '#e4e8f8', '#2a3050', '#141830', '#ffffff', '#d0e0ff', 'marble', 'Leaves a trail of wishes.', 7, '#a0c0ff')),
  W('nn', F('laser', 'Laser', 'crowntail', '#ff30b0', '#e01898', '#ff40c0', '#30e8ff', '#30e8ff', '#ffb0f0', 'butterfly', 'Zips. Never zags.', 8, '#40ff80')),
  W('nn', F('flicker', 'Flicker', 'halfmoon', '#4a1a8a', '#3a1070', '#5a20a0', '#e8ff30', '#e8ff30', '#c0a0ff', 'koi', 'On, off, on again.', 6, '#40f0ff')),
  W('nn', F('disco', 'Disco', 'doubletail', '#d8dce8', '#c0c6d8', '#e8ecf8', '#ff40c0', '#ff40c0', '#ffffff', 'marble', 'Never misses a beat.', 5, '#ff60c0')),
  W('nn', F('jellybean', 'Jellybean', 'plakat', '#a8f040', '#90e030', '#b8f860', '#c03a90', '#c03a90', '#e8ffb0', 'koi', 'Squishy and sweet.', 9, '#ff80d0')),
  W('nn', F('mirror', 'Mirror', 'veiltail', '#d8e0e8', '#c4ccd8', '#e8eef4', '#a8b4c4', '#ffffff', '#ffffff', 'dragon', 'Admires himself, a lot.', 0, '#e0e8f8')),
  W('nn', F('firefly', 'Firefly', 'crowntail', '#14281a', '#0e1e12', '#1a3020', '#d8ff30', '#e8ff40', '#e0ff60', 'dragon', 'Lights up the dark.', 3, '#d8ff40')),
  W('nn', F('ticket', 'Ticket', 'doubletail', '#d02a6a', '#b01e58', '#e03a7a', '#ffc830', '#ffc830', '#ffb0d0', 'rim', 'Admit one. Small fish only.', 2, '#ff4050')),
  W('nn', F('midnight', 'Midnight', 'veiltail', '#0c1438', '#08102a', '#101a48', '#30e0ff', '#30e0ff', '#40c0ff', 'rim', 'Up way past bedtime.', -7, '#4070ff')),
];

export const FISH_BY_ID = Object.fromEntries(FISH.map(f => [f.id, f]));

// Ladies: female body + female fins; colours echo her son, muted and lighter.
const LADY_LIST = [
  ['pearl', 'Pearl', 'sky'], ['clover', 'Clover', 'mango'], ['daisy', 'Daisy', 'domino'], ['honey', 'Honey', 'kiwi'],
  ['willow', 'Willow', 'marble'], ['sunny', 'Sunny', 'cobalt'], ['penny', 'Penny', 'copper'], ['ginger', 'Ginger', 'ember'],
  ['amber', 'Amber', 'koi'], ['maple', 'Maple', 'bronze'], ['hazel', 'Hazel', 'rosette'], ['cinnamon', 'Cinnamon', 'mustard'],
  ['luna', 'Luna', 'galaxy'], ['nova', 'Nova', 'neon'], ['stella', 'Stella', 'violet'], ['iris', 'Iris', 'avatar'],
  ['zinnia', 'Zinnia', 'candy'], ['aurora', 'Aurora', 'orchid'], ['vega', 'Vega', 'opal'],
];
function mute(hex, sat = 0.75, light = 0.12) {
  const c = parseInt(hex.slice(1), 16); let r = (c >> 16 & 255) / 255, g = (c >> 8 & 255) / 255, b = (c & 255) / 255;
  const l = 0.299 * r + 0.587 * g + 0.114 * b;
  r = l + (r - l) * sat; g = l + (g - l) * sat; b = l + (b - l) * sat;
  r += (1 - r) * light; g += (1 - g) * light; b += (1 - b) * light;
  const h = (v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0');
  return '#' + h(r) + h(g) + h(b);
}
export const LADIES = Object.fromEntries(LADY_LIST.map(([id, name, son], i) => {
  const s = FISH_BY_ID[son];
  return [id, { id, name, son, fins: 'female', bodyA: mute(s.bodyA), bodyB: mute(s.bodyB), finA: mute(s.finA), finB: mute(s.finB), accent: mute(s.accent, 0.6, 0.15), sheen: mute(s.sheen), pattern: s.pattern, seed: 0.13 * i + 0.2 }];
}));

// A female betta who lives in each home and empty tank. She nests with you too: her son is `son`.
const FRIEND_LIST = [
  ['cw-home', 'coral', 'Coral', 'sunset'], ['cw-empty-1', 'fern', 'Fern', 'moss'], ['cw-empty-2', 'poppy', 'Poppy', 'cherry'],
  ['cp-home', 'saffron', 'Saffron', 'marigold'], ['cp-empty-1', 'juniper', 'Juniper', 'teal'], ['cp-empty-2', 'marina', 'Marina', 'tide'],
  ['nn-home', 'tansy', 'Tansy', 'lilac'], ['nn-empty-1', 'wren', 'Wren', 'comet'], ['nn-empty-2', 'nell', 'Nell', 'laser'],
];
export const FRIENDS = Object.fromEntries(FRIEND_LIST.map(([tank, id, name, look], i) => {
  const s = FISH_BY_ID[look];
  return [tank, { id, name, son: look, fins: 'female', bodyA: mute(s.bodyA, 0.7, 0.18), bodyB: mute(s.bodyB, 0.7, 0.18), finA: mute(s.finA, 0.7, 0.15), finB: mute(s.finB, 0.7, 0.15), accent: mute(s.accent, 0.6, 0.15), sheen: mute(s.sheen), pattern: s.pattern, seed: 0.17 * i + 0.4 }];
}));
