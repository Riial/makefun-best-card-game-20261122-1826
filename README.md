# Tidecallers — best-card-game-20261122-1826

[![make.fun](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/Riial/makefun-best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/Riial/makefun-best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826)

An original 1v1 card duel for the [best-card-game-20261122-1826 bounty](https://make.fun/bounty/best-card-game-20261122-1826). You are a Tidecaller duelling Marra, the Undertow, across a tide-washed table. Both sides have 20 life; each turn you gain 3 energy and draw a card, then click cards to play them.

Four tides — Ember ▲, Leaf ●, Stone ■, Frost ◆ — run in a cycle (Ember beats Leaf, Leaf beats Stone, Stone beats Frost, Frost beats Ember), told apart by colour *and* shape. A card whose tide beats the foe's last played card gets +2: the combo that turns a hand into a plan. Marra commits to her next card and the table shows her intent ("NEXT: Attack 5"), so you can read her and counter her — guard against an attack, break through a guard, or draw and heal while she guards.

Cards: Strike, Heavy Blow, Guard, Bulwark, Surge, Mend, Lash and Break, one of each in every tide — a 32-card deck per side. Win at 0 enemy life, lose at 0 of your own.

Play it: serve `game/` with any static server (`node serve.ts` → http://localhost:8080) and open `game/index.html` in desktop Chrome. Mouse and keyboard (1–7 play cards, Space ends the turn, M mutes, R restarts). All art is CSS and all sound is WebAudio generated in code — no assets, no network.

Source, one clear job per file:

- `game/src/config.js` — the four tides, life, energy and hand rules
- `game/src/cards.js` — the 32-card pool, the tide cycle and the +2 combo
- `game/src/deck.js` — seeded shuffle, drawing, discarding, reshuffling
- `game/src/ai.js` — Marra's intent: lethal first, survival second, value third
- `game/src/audio.js` — WebAudio bleeps, generated in code
- `game/src/render.js` — the table, the cards, the animations, the screens
- `game/src/game.js` — the duel: state, turns, resolving cards, shot states
- `game/src/main.js` — entrypoint: boot, input, `?shot=` states

`main.ts` (Node 22, stdlib only) copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with `buildDossier` from `vendor/makefun-game.ts`.
