// Tidecallers — the card pool: every card's cost, effect and tide.
// The deck is 32 cards: 4 tides × 8 card types, one of each.
// A card's name is its tide + its type, so no name is borrowed from any
// commercial game. Card effects are plain numbers a player can read at a
// glance: damage, block, cards drawn, life healed, or pierce (ignores block).

import { ELEMENTS, ELEMENT_ORDER, TIDE_DAMAGE_BONUS, TIDE_DRAW_BONUS } from './config.js';

export const CARD_TYPES = [
  { key: 'strike', name: 'Strike', cost: 1, damage: 3, text: 'Deal 3 damage.' },
  { key: 'heavy', name: 'Heavy Blow', cost: 2, damage: 5, text: 'Deal 5 damage.' },
  { key: 'guard', name: 'Guard', cost: 1, block: 4, text: 'Gain 4 block.' },
  { key: 'bulwark', name: 'Bulwark', cost: 2, block: 7, text: 'Gain 7 block.' },
  { key: 'surge', name: 'Surge', cost: 1, draw: 2, text: 'Draw 2 cards.' },
  { key: 'mend', name: 'Mend', cost: 2, heal: 4, text: 'Heal 4 life.' },
  { key: 'lash', name: 'Lash', cost: 1, damage: 2, draw: 1, text: 'Deal 2 damage. Draw 1 card.' },
  { key: 'break', name: 'Break', cost: 2, damage: 4, pierce: true, text: 'Deal 4 damage. Ignores block.' },
];

// Build a fresh 32-card deck. Every card gets a stable id (tide-type).
export function buildDeck() {
  const cards = [];
  for (const element of ELEMENT_ORDER) {
    for (const type of CARD_TYPES) {
      cards.push({
        id: `${element}-${type.key}`,
        element,
        key: type.key,
        name: `${ELEMENTS[element].name} ${type.name}`,
        cost: type.cost,
        text: type.text,
        damage: type.damage ?? 0,
        block: type.block ?? 0,
        draw: type.draw ?? 0,
        heal: type.heal ?? 0,
        pierce: type.pierce ?? false,
      });
    }
  }
  return cards;
}

// Does tide A beat tide B in the cycle Ember > Leaf > Stone > Frost > Ember?
export function tideBeats(a, b) {
  return ELEMENTS[a] && ELEMENTS[a].beats === b;
}

// The tide bonus a card earns against the foe's last played card:
// +2 damage/block/heal and +1 draw when its tide beats that card's tide.
export function tideBonus(card, foeLastElement) {
  if (!foeLastElement || !tideBeats(card.element, foeLastElement)) return { damage: 0, block: 0, heal: 0, draw: 0 };
  return { damage: TIDE_DAMAGE_BONUS, block: TIDE_DAMAGE_BONUS, heal: TIDE_DAMAGE_BONUS, draw: TIDE_DRAW_BONUS };
}

// The card's numbers with its tide bonus applied (0 when no bonus).
export function effectiveNumbers(card, foeLastElement) {
  const bonus = tideBonus(card, foeLastElement);
  return {
    damage: card.damage + bonus.damage,
    block: card.block + bonus.block,
    heal: card.heal + bonus.heal,
    draw: card.draw + bonus.draw,
    pierce: card.pierce,
    hasBonus: bonus.damage > 0 || bonus.draw > 0,
  };
}

// One-line human-readable effect, with the tide bonus folded in.
export function effectLine(card, foeLastElement) {
  const n = effectiveNumbers(card, foeLastElement);
  const parts = [];
  if (n.damage) parts.push(`Deal ${n.damage} damage${n.pierce ? ' (pierces block)' : ''}`);
  if (n.block) parts.push(`Gain ${n.block} block`);
  if (n.draw) parts.push(`Draw ${n.draw} card${n.draw > 1 ? 's' : ''}`);
  if (n.heal) parts.push(`Heal ${n.heal} life`);
  return parts.join('. ') + '.';
}
