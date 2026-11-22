// Tidecallers — the game: state, turns, and the duel itself.
// A duel is 1v1, 20 life each. Every turn you gain 3 energy and draw a card;
// click a card to play it. Marra commits to her next card and the table
// shows her intent, so you can read her and counter her. A card whose tide
// beats the foe's last played card's tide gets +2. First to 0 life loses.

import { MAX_LIFE, ENERGY_PER_TURN, START_HAND, MAX_HAND } from './config.js';
import { buildDeck, effectiveNumbers } from './cards.js';
import { mulberry32, makeDrawPile, drawCards } from './deck.js';
import { chooseIntent, aiExtraCard } from './ai.js';
import { sfx } from './audio.js';
import { render, flyCard, floatText, shake, showScreen, showWinScreen, showLossScreen } from './render.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A fresh duel. `seed` drives the shuffle; a live game seeds from the clock.
export function createGame(seed) {
  const rng = mulberry32(seed);
  const deck = buildDeck();
  const state = {
    screen: 'title',
    phase: 'player',
    turn: 0,
    rng,
    player: newSide(deck, rng),
    foe: newSide(deck, rng),
    playerLast: null,
    foeLast: null,
    intent: null,
    log: '',
    stats: { turns: 0, damageDealt: 0, damageTaken: 0, cardsPlayed: 0 },
    over: false,
  };
  return state;
}

function newSide(deck, rng) {
  const side = {
    life: MAX_LIFE,
    block: 0,
    energy: ENERGY_PER_TURN,
    hand: [],
    draw: makeDrawPile(deck, rng),
    discard: [],
    lastElement: null,
  };
  drawCards(side.draw, side.discard, side.hand, START_HAND, rng, MAX_HAND);
  return side;
}

// Start the duel from the title screen.
export function startMatch(state) {
  state.screen = 'play';
  state.phase = 'player';
  state.turn = 1;
  state.stats.turns = 1;
  state.player.energy = ENERGY_PER_TURN;
  drawCards(state.player.draw, state.player.discard, state.player.hand, 1, state.rng, MAX_HAND);
  state.intent = chooseIntent(state.foe.hand, state.foe, state.player, state.rng);
  state.log = 'Your turn — play a card, or end your turn.';
  showScreen(null);
  sfx('deal');
  render(state, { onPlay: (card, el) => onCardClicked(state, card, el) });
}

// The player's turn begins: fresh energy, block falls away, draw a card.
function beginPlayerTurn(state) {
  state.turn += 1;
  state.stats.turns = state.turn;
  state.phase = 'player';
  state.player.energy = ENERGY_PER_TURN;
  state.player.block = 0;
  drawCards(state.player.draw, state.player.discard, state.player.hand, 1, state.rng, MAX_HAND);
  state.log = `Turn ${state.turn} — your move.`;
  sfx('turn');
}

// Resolve one played card. Returns the numbers that were applied, for the
// floating text and the log. `side` is who played it, `foe` is the target.
export function resolveCard(state, side, foe, card) {
  const foeLastElement = side === state.player ? (state.foeLast ? state.foeLast.element : null)
    : (state.playerLast ? state.playerLast.element : null);
  const n = effectiveNumbers(card, foeLastElement);
  const applied = { damage: 0, block: 0, heal: 0, draw: 0, tide: n.hasBonus };
  if (n.damage > 0) {
    let dmg = n.damage;
    if (!card.pierce && foe.block > 0) {
      const absorbed = Math.min(foe.block, dmg);
      foe.block -= absorbed;
      dmg -= absorbed;
    }
    foe.life = Math.max(0, foe.life - dmg);
    applied.damage = dmg;
    if (side === state.player) state.stats.damageDealt += dmg;
    else state.stats.damageTaken += dmg;
  }
  if (n.block > 0) {
    side.block += n.block;
    applied.block = n.block;
  }
  if (n.heal > 0) {
    const healed = Math.min(MAX_LIFE - side.life, n.heal);
    side.life += healed;
    applied.heal = healed;
  }
  if (n.draw > 0) {
    applied.draw = drawCards(side.draw, side.discard, side.hand, n.draw, state.rng, MAX_HAND);
  }
  return applied;
}

function describePlay(who, card, applied) {
  const verb = who === 'You' ? 'play' : 'plays';
  const parts = [];
  if (applied.damage) parts.push(`deals ${applied.damage} damage`);
  if (applied.block) parts.push(`gains ${applied.block} block`);
  if (applied.heal) parts.push(`heals ${applied.heal}`);
  if (applied.draw) parts.push(`draws ${applied.draw}`);
  return `${who} ${verb} ${card.name} — ${parts.join(', ') || 'nothing happens'}${applied.tide ? ' (TIDE +2!)' : ''}.`;
}

// The player clicked a card in hand.
export function onCardClicked(state, card, el) {
  if (state.screen !== 'play' || state.phase !== 'player' || state.over) return;
  if (card.cost > state.player.energy) {
    state.log = `Not enough energy for ${card.name} (${card.cost} needed).`;
    render(state, { onPlay: (c, e) => onCardClicked(state, c, e) });
    return;
  }
  playPlayerCard(state, card, el);
}

async function playPlayerCard(state, card, el) {
  state.player.energy -= card.cost;
  state.player.hand = state.player.hand.filter((c) => c.id !== card.id);
  state.stats.cardsPlayed += 1;
  const applied = resolveCard(state, state.player, state.foe, card);
  state.player.discard.push(card);
  state.playerLast = card;
  state.log = describePlay('You', card, applied);
  sfx(applied.tide ? 'tide' : 'play');
  if (applied.damage) { floatText('#foe-life', `-${applied.damage}`, 'damage'); shake(); sfx('hit'); }
  if (applied.block) { floatText('#player-life', `+${applied.block} BLOCK`, 'block'); sfx('block'); }
  if (applied.heal) { floatText('#player-life', `+${applied.heal}`, 'heal'); sfx('heal'); }
  if (applied.draw) sfx('draw');
  if (el) {
    el.style.visibility = 'hidden'; // the original vanishes; the clone flies
    await new Promise((done) => flyCard(el, '#player-played', done));
  }
  render(state, { onPlay: (c, e) => onCardClicked(state, c, e) });
  if (checkEnd(state)) return;
}

// End the player's turn: Marra plays, then a new player turn begins.
export async function endTurn(state) {
  if (state.screen !== 'play' || state.phase !== 'player' || state.over) return;
  state.phase = 'ai';
  state.log = "Marra's turn…";
  render(state, { onPlay: (c, e) => onCardClicked(state, c, e) });
  await sleep(650);
  await aiTurn(state);
  if (state.over) return;
  beginPlayerTurn(state);
  render(state, { onPlay: (c, e) => onCardClicked(state, c, e) });
}

async function aiTurn(state) {
  state.foe.block = 0;
  state.foe.energy = ENERGY_PER_TURN;
  drawCards(state.foe.draw, state.foe.discard, state.foe.hand, 1, state.rng, MAX_HAND);

  const intent = state.intent;
  const card = intent ? state.foe.hand.find((c) => c.id === intent.card.id) : null;
  if (card && card.cost <= state.foe.energy) {
    await aiPlayCard(state, card);
    if (state.over) return;
    await sleep(500);
  }
  // Marra may spend leftover energy on one cheap card.
  const extra = aiExtraCard(state.foe.hand, state.foe.energy, state.foe, state.player, state.rng);
  if (extra) {
    await aiPlayCard(state, extra);
    if (state.over) return;
    await sleep(450);
  }
  state.intent = chooseIntent(state.foe.hand, state.foe, state.player, state.rng);
}

async function aiPlayCard(state, card) {
  state.foe.energy -= card.cost;
  state.foe.hand = state.foe.hand.filter((c) => c.id !== card.id);
  const applied = resolveCard(state, state.foe, state.player, card);
  state.foe.discard.push(card);
  state.foeLast = card;
  state.log = describePlay('Marra', card, applied);
  sfx(applied.tide ? 'tide' : 'play');
  if (applied.damage) { floatText('#player-life', `-${applied.damage}`, 'damage'); shake(); sfx('hit'); }
  if (applied.block) { floatText('#foe-life', `+${applied.block} BLOCK`, 'block'); sfx('block'); }
  if (applied.heal) { floatText('#foe-life', `+${applied.heal}`, 'heal'); sfx('heal'); }
  if (applied.draw) sfx('draw');
  render(state, { onPlay: (c, e) => onCardClicked(state, c, e) });
  await sleep(650);
  checkEnd(state);
}

// Life hit 0 on either side: the duel ends with a flourish (or a sigh).
function checkEnd(state) {
  if (state.over) return true;
  if (state.foe.life <= 0) {
    state.over = true;
    state.screen = 'win';
    state.log = 'Victory!';
    render(state, { onPlay: () => {} });
    showWinScreen(state.stats, state.player.life);
    sfx('win');
    return true;
  }
  if (state.player.life <= 0) {
    state.over = true;
    state.screen = 'loss';
    state.log = 'Defeat.';
    render(state, { onPlay: () => {} });
    showLossScreen(state.stats, state.player.life);
    sfx('lose');
    return true;
  }
  return false;
}

// ---------- screenshot states ----------
// ?shot=title|table|win|loss jumps straight to a fixed, readable state built
// from the game's own code — a real render, not a mock-up. The table state is
// a mid-duel position: both hands visible, life totals, energy, Marra's
// intent, and a last card on each side of the arena.

export function scriptedState(kind) {
  const state = createGame(20261122);
  if (kind === 'title') {
    state.screen = 'title';
    return state;
  }
  if (kind === 'table') {
    state.screen = 'play';
    state.phase = 'player';
    state.turn = 5;
    state.stats.turns = 5;
    state.stats.damageDealt = 9;
    state.stats.cardsPlayed = 7;
    state.player.life = 17;
    state.player.block = 3;
    state.player.energy = 2;
    state.foe.life = 11;
    state.foe.block = 0;
    state.player.hand = pickCards(state.player, ['ember-strike', 'leaf-heavy', 'frost-guard', 'stone-lash', 'ember-mend', 'frost-break']);
    state.foe.hand = pickCards(state.foe, ['leaf-strike', 'stone-guard', 'ember-heavy', 'frost-surge', 'leaf-lash']);
    state.playerLast = findCard('stone-guard');
    state.foeLast = findCard('leaf-strike');
    state.intent = { card: findCard('ember-heavy'), label: 'Attack 5', kind: 'attack', element: 'ember' };
    state.log = 'Marra shows her next move — an Ember Heavy Blow. Guard, or break through it?';
    return state;
  }
  if (kind === 'win') {
    state.screen = 'win';
    state.over = true;
    state.stats = { turns: 9, damageDealt: 24, damageTaken: 11, cardsPlayed: 13 };
    state.player.life = 12;
    state.foe.life = 0;
    return state;
  }
  if (kind === 'loss') {
    state.screen = 'loss';
    state.over = true;
    state.stats = { turns: 8, damageDealt: 14, damageTaken: 21, cardsPlayed: 11 };
    state.player.life = 0;
    state.foe.life = 9;
    return state;
  }
  return state;
}

// Pull named cards out of a side's piles into its hand (for the table shot).
function pickCards(side, ids) {
  const all = [...side.draw, ...side.discard, ...side.hand];
  const picked = [];
  for (const id of ids) {
    const card = all.find((c) => c.id === id);
    if (card) picked.push(card);
  }
  side.draw = all.filter((c) => !picked.includes(c));
  side.discard = [];
  side.hand = picked;
  return picked;
}

function findCard(id) {
  return buildDeck().find((c) => c.id === id);
}
