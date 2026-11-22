// Tidecallers — the draw pile: a seeded shuffle, drawing, discarding and
// reshuffling. The seed only matters for the screenshot states (a fixed seed
// makes a fixed table); a live game seeds from the clock.

// Small deterministic PRNG (mulberry32) so a screenshot seed replays exactly.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle, in place, driven by the given rng function.
export function shuffle(pile, rng) {
  for (let i = pile.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pile[i], pile[j]] = [pile[j], pile[i]];
  }
  return pile;
}

// A fresh shuffled draw pile from a card list.
export function makeDrawPile(cards, rng) {
  return shuffle([...cards], rng);
}

// Draw up to n cards from the pile into hand. When the draw pile runs out,
// the discard pile is shuffled back in; when both are empty, drawing stops.
// Returns how many cards were actually drawn.
export function drawCards(pile, discard, hand, n, rng, maxHand) {
  let drawn = 0;
  while (drawn < n && hand.length < maxHand) {
    if (pile.length === 0) {
      if (discard.length === 0) break;
      pile.push(...shuffle(discard.splice(0), rng));
    }
    hand.push(pile.pop());
    drawn++;
  }
  return drawn;
}
