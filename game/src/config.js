// Tidecallers — game constants: the four tides, life, energy and hand rules.
// Every tide is told apart by BOTH a colour and a shape (never text alone):
//   Ember  red     ▲ triangle   beats Leaf
//   Leaf   green   ● circle     beats Stone
//   Stone  grey    ■ square     beats Frost
//   Frost  blue    ◆ diamond    beats Ember

export const ELEMENTS = {
  ember: { key: 'ember', name: 'Ember', color: '#e8491d', dark: '#7e1c05', light: '#ffb199', shape: '▲', beats: 'leaf' },
  leaf: { key: 'leaf', name: 'Leaf', color: '#2fae4e', dark: '#0f4d22', light: '#9fe8b4', shape: '●', beats: 'stone' },
  stone: { key: 'stone', name: 'Stone', color: '#8a7f72', dark: '#453d33', light: '#d8cfc2', shape: '■', beats: 'frost' },
  frost: { key: 'frost', name: 'Frost', color: '#3aa7e8', dark: '#0f4a75', light: '#b3e0ff', shape: '◆', beats: 'ember' },
};

export const ELEMENT_ORDER = ['ember', 'leaf', 'stone', 'frost'];

export const MAX_LIFE = 20;
export const ENERGY_PER_TURN = 3;
export const START_HAND = 4;
export const MAX_HAND = 7;
export const START_ENERGY = 3;

// Tide bonus: a card whose tide beats the foe's last played card's tide
// gets +2 to damage, block and healing, and +1 to cards drawn.
export const TIDE_DAMAGE_BONUS = 2;
export const TIDE_DRAW_BONUS = 1;

export const FOE_NAME = 'Marra, the Undertow';
export const PLAYER_NAME = 'You, Tidecaller';
export const GAME_TITLE = 'TIDECALLERS';
export const GAME_SUBTITLE = 'A duel of four tides';
