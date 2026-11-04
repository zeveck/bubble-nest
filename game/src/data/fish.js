// The 20 collectible bettas (males) and the 19 ladies.
// pattern: 0 solid, 1 marble, 2 butterfly, 3 koi, 4 dragon, 5 rim
export const PATTERN = { solid: 0, marble: 1, butterfly: 2, koi: 3, dragon: 4, rim: 5 };

const F = (id, name, fins, bodyA, bodyB, finA, finB, accent, sheen, pattern, line, pitch, trail) =>
  ({ id, name, fins, bodyA, bodyB, finA, finB, accent, sheen, pattern: PATTERN[pattern], line, pitch, trail });

export const FISH = [
  F('rust', 'Rust', 'halfmoon', '#c4142a', '#8e0f2e', '#b0122c', '#5a1a6e', '#3b52d6', '#4a6cff', 'solid', 'Proud and peckish.', 0, '#ff4a4a'),
  F('sky', 'Sky', 'veiltail', '#9fd2ff', '#5f9fe8', '#6fb0ff', '#1f4fd0', '#ffffff', '#bfe6ff', 'solid', 'Daydreams mid-bite.', 2, '#8fd0ff'),
  F('mango', 'Mango', 'plakat', '#ff8a1c', '#ff6a00', '#ffb020', '#ffe14a', '#ff5a00', '#ffd27a', 'solid', 'Loud, bright and always hungry.', 4, '#ffa040'),
  F('domino', 'Domino', 'halfmoon', '#1e1e28', '#2a2a36', '#22222c', '#16161e', '#f4f4f4', '#6a7cff', 'butterfly', 'Very fancy, very sure.', -2, '#ffffff'),
  F('kiwi', 'Kiwi', 'crowntail', '#8fdc3a', '#5fbf2a', '#7ad030', '#3e9a20', '#fff04a', '#d8ff7a', 'rim', 'Spiky and cheerful.', 5, '#a8ff50'),
  F('marble', 'Marble', 'plakat', '#f4f1ee', '#e8e2dc', '#f2eeea', '#e0dad4', '#3a5ad8', '#c8c0ff', 'marble', 'Never the same twice.', 1, '#c8a8ff'),
  F('cobalt', 'Cobalt', 'crowntail', '#1f4fe0', '#173aa8', '#2050e8', '#0e2a90', '#7ad0ff', '#8ac8ff', 'dragon', 'Shiny armour, soft heart.', -3, '#3a7aff'),
  F('copper', 'Copper', 'halfmoon', '#c8743a', '#9a4f22', '#d07a3a', '#7a3a18', '#ffd08a', '#ffb070', 'dragon', 'Warm as a radiator.', -1, '#e08a4a'),
  F('ember', 'Ember', 'doubletail', '#e0281e', '#c01a14', '#e83020', '#ff8a1a', '#ffd040', '#ff8a4a', 'butterfly', 'Two tails, twice the swagger.', 3, '#ff6a2a'),
  F('koi', 'Koi', 'plakat', '#f6f2ec', '#efe8e0', '#f4efe8', '#ece4da', '#ff6a1a', '#ffd0a0', 'koi', 'Patchy and proud.', 2, '#ff8a3a'),
  F('bronze', 'Bronze', 'veiltail', '#b8892e', '#8a6420', '#c09030', '#6a4a14', '#ffe08a', '#ffd070', 'solid', 'Slow, stately and shiny.', -4, '#d8a840'),
  F('rosette', 'Rosette', 'halfmoon', '#ff8ab8', '#f06aa0', '#ff9ac4', '#ff5a9a', '#ffffff', '#ffd0ea', 'rim', 'Twirls when happy.', 6, '#ff9ac8'),
  F('mustard', 'Mustard', 'doubletail', '#2a50b8', '#1e3a90', '#3a5ac0', '#e8c020', '#ffd020', '#7a9aff', 'rim', 'Mixes colours boldly.', 0, '#e8c830'),
  F('galaxy', 'Galaxy', 'plakat', '#1a2050', '#121638', '#1e2660', '#2a1e70', '#ffffff', '#7a8aff', 'marble', 'Full of stars.', -2, '#e8ecff'),
  F('neon', 'Neon', 'crowntail', '#30e8f0', '#18b8d8', '#28d8f0', '#1898d0', '#ff4fd8', '#a0ffff', 'rim', 'Glows at parties.', 7, '#3cf0ff'),
  F('violet', 'Violet', 'veiltail', '#7a3ad0', '#5a20a8', '#8a40d8', '#4a1890', '#d0a0ff', '#c090ff', 'solid', 'Quietly dramatic.', -5, '#a060ff'),
  F('avatar', 'Avatar', 'halfmoon', '#6a8ab0', '#4a6a90', '#5a7aa8', '#2a3a60', '#d8e8ff', '#e0f0ff', 'dragon', 'Metal-scaled legend.', -1, '#a8c8e8'),
  F('candy', 'Candy', 'doubletail', '#ff9ad0', '#ff7ac0', '#ffa0d8', '#ff70b8', '#30d0c0', '#ffd0f0', 'koi', 'Sweet tooth, sweeter fins.', 5, '#ff8ad0'),
  F('orchid', 'Black Orchid', 'crowntail', '#16101e', '#1e1428', '#1a1224', '#120c18', '#9a4ae8', '#8a5aff', 'rim', 'Mysterious nibbler.', -6, '#a060ff'),
  F('opal', 'Opal', 'halfmoon', '#f2f0f6', '#e6e8f4', '#f4f2fa', '#d8e0f8', '#ffd0f0', '#b0f0ff', 'solid', 'Shimmers like a pearl.', 8, '#ffffff'),
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
