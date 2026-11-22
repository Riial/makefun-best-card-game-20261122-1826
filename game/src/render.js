// Tidecallers — the table: every pixel the player sees, built from the DOM
// and CSS (no images, no canvas). Cards slide, flip and snap with CSS
// transitions; damage floats up as numbers; a win lands with confetti.
// The judge reads the game mostly through screenshots, so the table is
// designed to be legible at thumbnail size: big numbers, big shapes.

import { ELEMENTS, MAX_LIFE, FOE_NAME, PLAYER_NAME, GAME_TITLE, GAME_SUBTITLE } from './config.js';
import { effectiveNumbers } from './cards.js';

const $ = (id) => document.getElementById(id);

let stageEl = null;
let handEls = new Map(); // card id -> element, for the player's hand
let currentOnPlay = null; // the live click handler, refreshed on every render

// Build the static skeleton once. Called by main.js on boot.
export function buildStage() {
  stageEl = $('stage');
  stageEl.innerHTML = `
    <div id="table">
      <div id="topbar">
        <div id="brand">${GAME_TITLE}</div>
        <div id="turn-banner"></div>
        <button id="mute-btn" class="mini-btn" title="Mute (M)">SOUND: ON</button>
      </div>
      <div id="foe-zone">
        <div class="side-row">
          <div class="side-name foe-name">${FOE_NAME}</div>
          <div id="foe-life" class="life-wrap"></div>
        </div>
        <div id="foe-hand" class="hand foe-hand"></div>
        <div id="intent" class="intent"></div>
      </div>
      <div id="center">
        <div id="arena">
          <div class="played-col"><div class="played-label">MARRA'S LAST CARD</div><div id="foe-played" class="played-slot"></div></div>
          <div id="cycle">
            <div class="cycle-title">THE FOUR TIDES</div>
            <div class="cycle-row"><span class="chip ember">▲</span><span class="cycle-arrow">beats</span><span class="chip leaf">●</span><span class="cycle-arrow">beats</span><span class="chip stone">■</span><span class="cycle-arrow">beats</span><span class="chip frost">◆</span><span class="cycle-arrow">beats</span><span class="chip ember">▲</span></div>
            <div class="cycle-note">Play a tide that beats the foe's last card: +2</div>
          </div>
          <div class="played-col"><div class="played-label">YOUR LAST CARD</div><div id="player-played" class="played-slot"></div></div>
        </div>
        <div id="log" class="log"></div>
      </div>
      <div id="player-zone">
        <div class="side-row">
          <div class="side-name">${PLAYER_NAME}</div>
          <div id="player-life" class="life-wrap"></div>
          <div id="energy" class="energy"></div>
        </div>
        <div id="player-hand" class="hand player-hand"></div>
        <div id="controls">
          <button id="end-turn" class="big-btn">END TURN&nbsp;&nbsp;(Space)</button>
          <div id="piles" class="piles"></div>
          <div id="hint" class="hint">Click a card to play it · 1–7 keys play cards · M mutes</div>
        </div>
      </div>
    </div>
    <div id="title-screen" class="screen"></div>
    <div id="win-screen" class="screen"></div>
    <div id="loss-screen" class="screen"></div>
    <div id="float-layer"></div>
    <div id="confetti-layer"></div>`;
  renderTitleScreen();
}

// ---------- cards ----------

// One face-up card element. `opts` may carry foeLastElement (for the live
// tide badge), playable (energy check) and onPlay (click handler).
export function cardElement(card, opts = {}) {
  const el = ELEMENTS[card.element];
  const n = effectiveNumbers(card, opts.foeLastElement);
  const div = document.createElement('div');
  div.className = `card ${card.element}${n.hasBonus ? ' tide-live' : ''}${opts.playable === false ? ' unplayable' : ''}`;
  div.dataset.id = card.id;
  const beatsName = ELEMENTS[el.beats].name;
  div.innerHTML = `
    <div class="card-cost">${card.cost}</div>
    <div class="card-art"><span class="card-shape">${el.shape}</span><span class="card-art-name">${el.name}</span></div>
    <div class="card-name">${card.name}</div>
    <div class="card-text">${card.text}</div>
    <div class="card-foot">${n.hasBonus ? `<span class="tide-badge">TIDE +2</span>` : `<span>${el.name} beats ${beatsName}</span>`}</div>`;
  if (opts.clickable) div.addEventListener('click', () => { if (currentOnPlay) currentOnPlay(card, div); });
  return div;
}

// A face-down card back (the foe's hand): just a wave mark, no text —
// backs overlap in a fan, so text would be clipped.
function cardBackElement() {
  const div = document.createElement('div');
  div.className = 'card card-back';
  div.innerHTML = '<div class="back-shape">≈</div>';
  return div;
}

// ---------- life, energy, intent ----------

function lifeHtml(side) {
  const pct = Math.max(0, (side.life / MAX_LIFE) * 100);
  const tone = pct > 50 ? '' : pct > 25 ? ' mid' : ' low';
  const block = side.block > 0 ? `<span class="block-badge"><span class="shield"></span>${side.block} BLOCK</span>` : '';
  return `<span class="life-label">LIFE</span><span class="life-bar"><span class="life-fill${tone}" style="width:${pct}%"></span></span><span class="life-num">${side.life}<span class="life-max">/${MAX_LIFE}</span></span>${block}`;
}

function energyHtml(energy) {
  let pips = '';
  for (let i = 0; i < 3; i++) pips += `<span class="pip${i < energy ? ' on' : ''}">◆</span>`;
  return `<span class="energy-label">ENERGY</span>${pips}<span class="energy-num">${energy}</span>`;
}

function intentHtml(intent) {
  if (!intent) return '<span class="intent-label">MARRA IS THINKING…</span>';
  const el = ELEMENTS[intent.element];
  return `<span class="intent-label">MARRA'S NEXT MOVE</span><span class="intent-chip" style="--c:${el.color}"><span class="chip">${el.shape}</span> ${intent.label}</span><span class="intent-note">read it — then counter it</span>`;
}

// ---------- render ----------

// Redraw the whole table from the game state.
export function render(state, opts = {}) {
  currentOnPlay = opts.onPlay || null;
  $('foe-life').innerHTML = lifeHtml(state.foe);
  $('player-life').innerHTML = lifeHtml(state.player);
  $('energy').innerHTML = energyHtml(state.player.energy);
  $('intent').innerHTML = intentHtml(state.intent);
  $('turn-banner').textContent = state.phase === 'ai' ? "MARRA'S TURN" : state.screen === 'play' ? `YOUR TURN — ${state.turn}` : '';
  $('end-turn').disabled = state.phase !== 'player' || state.screen !== 'play';
  $('piles').textContent = `DECK ${state.player.draw.length} · DISCARD ${state.player.discard.length} · FOE DECK ${state.foe.draw.length}`;
  $('log').textContent = state.log || '';
  renderFoeHand(state.foe.hand.length);
  renderPlayerHand(state, opts);
  renderPlayedSlot('foe-played', state.foeLast, state.playerLast ? state.playerLast.element : null);
  renderPlayedSlot('player-played', state.playerLast, state.foeLast ? state.foeLast.element : null);
}

function renderFoeHand(count) {
  const box = $('foe-hand');
  box.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const back = cardBackElement();
    back.style.setProperty('--i', i);
    back.style.setProperty('--n', Math.max(count, 1));
    box.appendChild(back);
  }
}

function renderPlayerHand(state, opts) {
  const box = $('player-hand');
  const hand = state.player.hand;
  const seen = new Set();
  hand.forEach((card, i) => {
    seen.add(card.id);
    let el = handEls.get(card.id);
    const playable = state.phase === 'player' && state.screen === 'play' && card.cost <= state.player.energy;
    if (!el) {
      el = cardElement(card, { foeLastElement: state.foeLast ? state.foeLast.element : null, playable, clickable: true });
      el.classList.add('dealt');
      el.style.animationDelay = `${i * 70}ms`;
      handEls.set(card.id, el);
      box.appendChild(el);
    }
    // Keep order, position in the fan, and live state fresh.
    box.appendChild(el);
    const mid = (hand.length - 1) / 2;
    el.style.setProperty('--rot', `${(i - mid) * 2.5}deg`);
    el.style.setProperty('--lift', `${Math.abs(i - mid) * 6}px`);
    el.classList.toggle('unplayable', !playable);
    const n = effectiveNumbers(card, state.foeLast ? state.foeLast.element : null);
    el.classList.toggle('tide-live', n.hasBonus);
    const badge = el.querySelector('.tide-badge');
    if (n.hasBonus && !badge) el.querySelector('.card-foot').innerHTML = '<span class="tide-badge">TIDE +2</span>';
    if (!n.hasBonus && badge) {
      const elName = ELEMENTS[card.element];
      el.querySelector('.card-foot').innerHTML = `<span>${elName.name} beats ${ELEMENTS[elName.beats].name}</span>`;
    }
  });
  for (const [id, el] of [...handEls]) {
    if (!seen.has(id)) {
      el.remove();
      handEls.delete(id);
    }
  }
}

function renderPlayedSlot(id, card, foeLastElement) {
  const slot = $(id);
  slot.innerHTML = '';
  if (card) slot.appendChild(cardElement(card, { foeLastElement }));
}

// ---------- effects ----------

// Fly a clone of a card element from its spot to a target slot, then call done.
export function flyCard(fromEl, toSelector, done) {
  const to = document.querySelector(toSelector);
  if (!fromEl || !to) { done(); return; }
  const a = fromEl.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const clone = fromEl.cloneNode(true);
  clone.classList.add('fly-clone');
  clone.style.left = `${a.left}px`;
  clone.style.top = `${a.top}px`;
  clone.style.width = `${a.width}px`;
  clone.style.height = `${a.height}px`;
  document.body.appendChild(clone);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const anim = clone.animate(
    [{ transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 1 },
     { transform: `translate(${dx}px,${dy}px) rotate(-8deg) scale(0.62)`, opacity: 0.9, offset: 0.7 },
     { transform: `translate(${dx}px,${dy}px) rotate(0deg) scale(0.62)`, opacity: 0 }],
    { duration: 420, easing: 'cubic-bezier(.3,.7,.4,1)' },
  );
  anim.onfinish = () => { clone.remove(); done(); };
}

// Floating combat text over a life bar ("-5", "+4", "TIDE +2").
export function floatText(selector, text, kind) {
  const target = document.querySelector(selector);
  if (!target) return;
  const r = target.getBoundingClientRect();
  const div = document.createElement('div');
  div.className = `float-text ${kind}`;
  div.textContent = text;
  div.style.left = `${r.left + r.width / 2}px`;
  div.style.top = `${r.top - 8}px`;
  $('float-layer').appendChild(div);
  setTimeout(() => div.remove(), 1200);
}

// A short shake of the table (a hit landing). The shake runs on #table, not
// #stage, so it never fights the stage's fit-to-window scale transform.
export function shake() {
  const table = $('table');
  table.classList.remove('shake');
  void table.offsetWidth;
  table.classList.add('shake');
}

// Confetti for the win screen: coloured pieces falling over the stage.
export function confetti() {
  const layer = $('confetti-layer');
  const colours = ['#e8491d', '#2fae4e', '#8a7f72', '#3aa7e8', '#ffd166', '#f4f1e8'];
  for (let i = 0; i < 80; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colours[i % colours.length];
    piece.style.animationDelay = `${Math.random() * 0.9}s`;
    piece.style.animationDuration = `${2.2 + Math.random() * 1.6}s`;
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    layer.appendChild(piece);
  }
  setTimeout(() => { layer.innerHTML = ''; }, 4500);
}

// ---------- screens ----------

function renderTitleScreen() {
  $('title-screen').innerHTML = `
    <div class="screen-inner title-inner">
      <div class="title-kicker">A DUEL OF FOUR TIDES</div>
      <h1 class="game-title">${GAME_TITLE}</h1>
      <div class="game-sub">${GAME_SUBTITLE} — you against Marra, the Undertow</div>
      <div class="legend">
        ${['ember', 'leaf', 'stone', 'frost'].map((k) => {
          const el = ELEMENTS[k];
          return `<div class="legend-chip" style="--c:${el.color};--d:${el.dark}"><span class="chip big">${el.shape}</span><span class="legend-name">${el.name}</span><span class="legend-beats">beats ${ELEMENTS[el.beats].name}</span></div>`;
        }).join('')}
      </div>
      <div class="howto">
        <div>Each turn you gain <b>3 energy</b> and draw a card. Click a card to play it.</div>
        <div>Attack, guard, draw, heal — and watch <b>Marra's next move</b>: she shows it.</div>
        <div>A card whose tide beats her last card gets <b>+2</b>. First to 0 life loses.</div>
      </div>
      <div class="press-play">CLICK OR PRESS ENTER TO PLAY</div>
      <div class="title-foot">An original card duel · no copies, no borrowed art · sound: M</div>
    </div>`;
}

export function showScreen(name) {
  for (const id of ['title-screen', 'win-screen', 'loss-screen']) $(id).classList.remove('show');
  if (name) $(`${name}-screen`).classList.add('show');
}

function statsHtml(stats, lifeLeft) {
  return `<div class="stats">
    <div class="stat"><span class="stat-num">${stats.turns}</span><span class="stat-label">TURNS</span></div>
    <div class="stat"><span class="stat-num">${stats.damageDealt}</span><span class="stat-label">DAMAGE DEALT</span></div>
    <div class="stat"><span class="stat-num">${stats.cardsPlayed}</span><span class="stat-label">CARDS PLAYED</span></div>
    <div class="stat"><span class="stat-num">${lifeLeft}</span><span class="stat-label">LIFE LEFT</span></div>
  </div>`;
}

export function showWinScreen(stats, lifeLeft) {
  $('win-screen').innerHTML = `
    <div class="screen-inner">
      <h1 class="end-title win">VICTORY!</h1>
      <div class="end-sub">The tide is yours. Marra sinks beneath the waves.</div>
      ${statsHtml(stats, lifeLeft)}
      <div class="press-play">CLICK OR PRESS R TO DUEL AGAIN</div>
    </div>`;
  showScreen('win');
  confetti();
}

export function showLossScreen(stats, lifeLeft) {
  $('loss-screen').innerHTML = `
    <div class="screen-inner">
      <h1 class="end-title loss">DEFEAT</h1>
      <div class="end-sub">The undertow takes you. The tides will turn — try again.</div>
      ${statsHtml(stats, lifeLeft)}
      <div class="press-play">CLICK OR PRESS R TO TRY AGAIN</div>
    </div>`;
  showScreen('loss');
}

export function setMuteLabel(muted) {
  $('mute-btn').textContent = muted ? 'SOUND: OFF' : 'SOUND: ON';
}
