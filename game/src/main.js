// Tidecallers — entrypoint: boot the table, wire input, and honour ?shot=.
// The stage is a fixed 1280×800 design scaled to fit the window, so a
// screenshot at 1280×800 is exactly the game as designed.

import { createGame, startMatch, endTurn, onCardClicked, scriptedState } from './game.js';
import { buildStage, render, showScreen, showWinScreen, showLossScreen, setMuteLabel } from './render.js';
import { unlockAudio, toggleMute, sfx } from './audio.js';

const STAGE_W = 1280;
const STAGE_H = 800;

let state = null;
let shotMode = null;

function fitStage() {
  const stage = document.getElementById('stage');
  const scale = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
  stage.style.transform = `scale(${scale})`;
  stage.style.left = `${(window.innerWidth - STAGE_W * scale) / 2}px`;
  stage.style.top = `${(window.innerHeight - STAGE_H * scale) / 2}px`;
}

function onPlay(card) {
  onCardClicked(state, card, document.querySelector(`.card[data-id="${card.id}"]`));
}

function restart() {
  const seed = shotMode ? 20261122 : (Date.now() % 2147483647);
  state = createGame(seed);
  if (shotMode) {
    state = scriptedState(shotMode);
    if (shotMode === 'win') showWinScreen(state.stats, state.player.life);
    else if (shotMode === 'loss') showLossScreen(state.stats, state.player.life);
    else if (shotMode === 'title') showScreen('title');
    render(state, { onPlay });
  } else {
    showScreen('title');
    render(state, { onPlay });
  }
}

function start() {
  buildStage();
  fitStage();
  window.addEventListener('resize', fitStage);
  const params = new URLSearchParams(window.location.search);
  shotMode = params.get('shot');

  document.getElementById('end-turn').addEventListener('click', () => {
    unlockAudio();
    if (state && !state.over) endTurn(state);
  });
  document.getElementById('mute-btn').addEventListener('click', () => {
    unlockAudio();
    setMuteLabel(toggleMute());
  });

  // Keyboard: 1-7 play a hand card, Space/Enter ends the turn or starts
  // the game, R restarts after a win or loss, M mutes.
  window.addEventListener('keydown', (e) => {
    unlockAudio();
    if (!state) return;
    const k = e.key.toLowerCase();
    if (k === 'm') { setMuteLabel(toggleMute()); return; }
    if (state.screen === 'title' && (k === 'enter' || k === ' ')) { e.preventDefault(); startMatch(state); return; }
    if (state.over && (k === 'r' || k === 'enter' || k === ' ')) { e.preventDefault(); restart(); return; }
    if (state.screen !== 'play' || state.phase !== 'player' || state.over) return;
    if (k === ' ' || k === 'enter') { e.preventDefault(); endTurn(state); return; }
    const n = Number.parseInt(k, 10);
    if (n >= 1 && n <= 7) {
      const card = state.player.hand[n - 1];
      if (card) onPlay(card);
    }
  });

  // Mouse: click anywhere on a screen to start / play again.
  window.addEventListener('click', (e) => {
    unlockAudio();
    if (!state) return;
    if (e.target.closest('.card') || e.target.closest('button')) return;
    if (state.screen === 'title') startMatch(state);
    else if (state.over) restart();
  });

  restart();
  if (!shotMode) sfx('click');
}

document.addEventListener('DOMContentLoaded', start);
