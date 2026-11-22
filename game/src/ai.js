// Tidecallers — the opponent: Marra, the Undertow.
// Marra commits to ONE card for her next turn and the table shows it as her
// intent ("NEXT: Attack 5"), so the player can read her plan and counter it:
// guard against an attack, break through a guard, or draw and heal while she
// guards. The intent is honest — she really does play that card next turn.
//
// Intent choice, in order:
//   1. Lethal: an attack that finishes the player.
//   2. Survival: a guard or heal when her life is low.
//   3. Value: her biggest attack, or a draw when her hand is thin.
// A little randomness keeps her from being a solved puzzle.

import { effectiveNumbers } from './cards.js';

// Pick the card Marra will play next turn. Returns { card, label, kind }.
export function chooseIntent(hand, self, foe, rng) {
  const playable = hand.filter((c) => c.cost <= 3);
  if (playable.length === 0) return null;

  const withNumbers = playable.map((card) => ({
    card,
    n: effectiveNumbers(card, foe.lastElement),
  }));

  // 1. Lethal: any attack that drops the player to 0 (block counts).
  const lethal = withNumbers.filter(
    (x) => x.n.damage > 0 && (x.card.pierce ? x.n.damage : Math.max(0, x.n.damage - foe.block)) >= foe.life,
  );
  if (lethal.length > 0) return intentOf(pickBest(lethal, (x) => x.n.damage, rng), 'attack');

  // 2. Survival: life 8 or less — guard first, heal second.
  if (self.life <= 8) {
    const guards = withNumbers.filter((x) => x.n.block > 0);
    if (guards.length > 0 && rng() < 0.7) return intentOf(pickBest(guards, (x) => x.n.block, rng), 'guard');
    const heals = withNumbers.filter((x) => x.n.heal > 0);
    if (heals.length > 0 && rng() < 0.6) return intentOf(pickBest(heals, (x) => x.n.heal, rng), 'heal');
  }

  // 3. Thin hand: draw, so she keeps having answers.
  if (hand.length <= 2) {
    const draws = withNumbers.filter((x) => x.n.draw > 0);
    if (draws.length > 0 && rng() < 0.6) return intentOf(pickBest(draws, (x) => x.n.draw, rng), 'draw');
  }

  // 4. Value: her biggest attack most of the time, a guard or draw sometimes.
  const attacks = withNumbers.filter((x) => x.n.damage > 0);
  const roll = rng();
  if (attacks.length > 0 && roll < 0.62) return intentOf(pickBest(attacks, (x) => x.n.damage, rng), 'attack');
  const guards = withNumbers.filter((x) => x.n.block > 0);
  if (guards.length > 0 && roll < 0.8) return intentOf(pickBest(guards, (x) => x.n.block, rng), 'guard');
  const draws = withNumbers.filter((x) => x.n.draw > 0);
  if (draws.length > 0) return intentOf(pickBest(draws, (x) => x.n.draw, rng), 'draw');
  if (attacks.length > 0) return intentOf(pickBest(attacks, (x) => x.n.damage, rng), 'attack');
  return intentOf(withNumbers[0], withNumbers[0].n.heal > 0 ? 'heal' : 'guard');
}

function intentOf(entry, kind) {
  const { card, n } = entry;
  const label =
    kind === 'attack' ? `${card.pierce ? 'Pierce' : 'Attack'} ${n.damage}`
    : kind === 'guard' ? `Guard ${n.block}`
    : kind === 'heal' ? `Heal ${n.heal}`
    : `Draw ${n.draw}`;
  return { card, label, kind, element: card.element };
}

// Highest by score, with a random pick among near-ties so she varies.
function pickBest(list, score, rng) {
  const best = Math.max(...list.map(score));
  const tied = list.filter((x) => score(x) >= best - 1);
  return tied[Math.floor(rng() * tied.length)];
}

// After her intent card, Marra may spend leftover energy on one cheap card:
// a guard when she is hurt, an attack when the player is hurt, else any
// 1-cost card. Returns the card or null.
export function aiExtraCard(hand, energy, self, foe, rng) {
  const cheap = hand.filter((c) => c.cost <= energy && c.cost === 1);
  if (cheap.length === 0) return null;
  if (self.life <= 8) {
    const guards = cheap.filter((c) => c.block > 0 || c.heal > 0);
    if (guards.length > 0 && rng() < 0.7) return guards[Math.floor(rng() * guards.length)];
  }
  if (foe.life <= 6) {
    const attacks = cheap.filter((c) => c.damage > 0);
    if (attacks.length > 0) return attacks[Math.floor(rng() * attacks.length)];
  }
  if (rng() < 0.5) return cheap[Math.floor(rng() * cheap.length)];
  return null;
}
