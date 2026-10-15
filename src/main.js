import './style.css';
import { composer } from './renderer.js';
import { LAPS } from './config.js';
import { L, wrapS, buildTrack } from './track.js';
import { buildWorld } from './world.js';
import { S, racers, player, createRacers, place } from './state.js';
import { pressed } from './input.js';
import { audio } from './audio.js';
import { initEffects, updateSparks } from './effects.js';
import { initWeapons, updateBolts } from './weapons.js';
import { $, fmt, flash, msgTimer, hud, resize } from './hud.js';
import { stepPlayer, collide } from './physics.js';
import { stepAI } from './ai.js';
import { updateCamera } from './camera.js';
import { resetRace, finishRace, showResults, bestEver, GRID, GRID_ORDER } from './race.js';

// Build order matches the prototype: track, city, racers, then effects.
const arches = buildTrack();
const skyFollow = buildWorld();
createRacers();
initEffects();
initWeapons();

// ---------------- loop ----------------
let last = performance.now();
function step(dt) {
  S.t += dt;
  if (S.phase === 'count') {
    const before = Math.ceil(S.count);
    S.count -= dt;
    const now = Math.ceil(S.count);
    if (now !== before && now > 0) audio.beep(440);
    if (now > 0) flash(String(now), 0.3);
    if (S.count <= 0) { S.phase = 'race'; flash('GO!', 0.8); audio.beep(880, 0.35); }
  }
  if (S.phase === 'race' || S.phase === 'done') {
    S.raceTime += dt;
    // AI karts keep going for a few seconds after you finish so the results settle
    for (const r of racers) {
      if (r !== player && !r.finished && r.s >= LAPS * L) { r.finished = true; r.finishTime = S.raceTime; }
    }
  }
  stepPlayer(player, dt);
  racers.forEach(r => { if (r !== player) stepAI(r, dt); });
  collide();
  updateBolts(dt);
  if (S.phase === 'race') {
    const li = Math.floor(player.s / L);
    if (li > S.lapIdx && player.s > 0) {
      const lt = S.raceTime - S.lapStart;
      S.bestLap = Math.min(S.bestLap, lt); S.lapStart = S.raceTime; S.lapIdx = li;
      $('best').textContent = 'Best lap ' + fmt(Math.min(bestEver, S.bestLap));
      if (li >= LAPS) finishRace();
      else if (li === LAPS - 1) { flash('FINAL LAP', 1.5, fmt(lt)); audio.beep(660, 0.25); }
      else flash(`LAP ${li + 1}`, 1.2, fmt(lt));
    }
    const wrong = Math.cos(player.h) < -0.2 && Math.hypot(player.va, player.vb) > 3;
    if (wrong && msgTimer <= 0) flash('WRONG WAY', 0.3);
  }
  if (S.phase === 'done' && !S.finishShown && S.t - S.finishAt > 2.4) showResults();
  racers.forEach(r => place(r, dt));
  updateSparks(dt);
  arches.forEach((a, i) => { const d = wrapS(a.s - player.s); const near = d < 500 ? 1 - d / 500 : 0; a.mat.color.copy(a.col).multiplyScalar(0.45 + 0.55 * Math.max(0, Math.sin(S.t * 7 - i * 0.7)) + near * 0.4); });
  updateCamera(dt, skyFollow);
  pressed.clear();
}
function frameLoop(now) {
  requestAnimationFrame(frameLoop);
  let dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (S.paused) return;
  // fixed sub-steps keep wall bounces stable at 170 m/s
  const n = Math.ceil(dt / (1 / 120)); for (let i = 0; i < n; i++) step(dt / n);
  hud();
  composer.render();
}

window.addEventListener('resize', resize);

function begin() { audio.start(); resetRace(); }
$('start').addEventListener('click', begin);
$('again').addEventListener('click', begin);
window.addEventListener('keydown', e => {
  if (e.code === 'Enter' && (S.phase === 'title' || S.finishShown)) begin();
  if (e.code === 'KeyR' && S.phase !== 'title') begin();
  if (e.code === 'KeyM') { audio.muted = !audio.muted; }
  if (e.code === 'KeyC') S.camMode = 1 - S.camMode;
  if (e.code === 'KeyP') S.paused = !S.paused;
  if (e.code === 'KeyF') { const el = document.documentElement; if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => {}); else document.exitFullscreen?.().catch(() => {}); }
});

// title screen: rivals idle on the grid while the camera circles your kart
racers.forEach((r, k) => { const g = GRID[GRID_ORDER[k]]; r.s = g[0]; r.x = g[1]; });
$('loading').hidden = true; $('title').hidden = false;
resize();
requestAnimationFrame(frameLoop);
window.__ab = { S, racers, player, L, resetRace: begin, step }; // handle for automated test drives
