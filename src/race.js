import { rand } from './util.js';
import { LAPS } from './config.js';
import { L } from './track.js';
import { S, racers, player, AI_BASE, rank } from './state.js';
import { $, ORD, fmt, flash, hideMsg, resize } from './hud.js';
import { audio } from './audio.js';
import { resetWeapons } from './weapons.js';

// The race itself: grid, countdown start, finish and results, and the saved best lap.
const BEST_KEY = 'afterburner-neon-best';
export let bestEver = Infinity;
try { const v = parseFloat(localStorage.getItem(BEST_KEY)); if (v > 0) bestEver = v; } catch (e) {}

export const GRID = [[-14, -5], [-14, 5], [-26, -5], [-26, 5], [-38, -5], [-38, 5]];
// player starts 4th on the grid, the fastest rivals up front
export const GRID_ORDER = [3, 0, 1, 2, 4, 5];

export function resetRace() {
  racers.forEach((r, k) => {
    const [s, x] = GRID[GRID_ORDER[k]];
    Object.assign(r, { s, x, va: 0, vb: 0, h: 0, boostT: 0, energy: 100, finished: false, finishTime: 0, base: AI_BASE[k], lineOff: (rand() - 0.5) * 6, aiBoostCD: 2 + rand() * 4, steerVis: 0, air: false, y: 0, pitch: 0 });
  });
  resetWeapons();
  Object.assign(S, { phase: 'count', t: 0, count: 3.999, raceTime: 0, lapStart: 0, lapIdx: 0, bestLap: Infinity, results: [], finishShown: false, wallSoundAt: -9 });
  $('finish').hidden = true; $('title').hidden = true; $('hud').hidden = false;
  $('best').textContent = 'Best lap ' + fmt(bestEver);
  resize();
  audio.beep(440);
}

export function finishRace() {
  const place = rank();
  player.finished = true; player.finishTime = S.raceTime;
  S.phase = 'done'; S.finishAt = S.t;
  S.place = place;
  flash('FINISH', 2, `${place}${ORD(place).toLowerCase()} place`);
  audio.beep(880, 0.4); audio.beep(1320, 0.5, 0.12);
}

export function showResults() {
  S.finishShown = true;
  hideMsg();
  const rows = racers.map(r => ({ r, score: r.finished ? -1e9 + r.finishTime : -r.s }));
  rows.sort((a, b) => a.score - b.score);
  const list = $('results'); list.innerHTML = '';
  rows.forEach((row, i) => {
    const li = document.createElement('li');
    if (row.r === player) li.className = 'me';
    li.style.setProperty('--sw', row.r.color);
    const t = row.r.finished ? fmt(row.r.finishTime) : `+${Math.max(1, Math.round((LAPS * L - row.r.s) / Math.max(40, row.r.va)))}s est.`;
    li.innerHTML = `<span>${i + 1}${ORD(i + 1).toLowerCase()}</span><span>${row.r.name}</span><span>${t}</span>`;
    list.appendChild(li);
  });
  const place = rows.findIndex(r => r.r === player) + 1;
  $('finPlace').textContent = `${place}${ORD(place).toLowerCase()} place`;
  $('finEyebrow').textContent = place === 1 ? 'Neon Circuit · winner' : 'Neon Circuit · race complete';
  $('finBest').textContent = `Race ${fmt(player.finishTime)} · best lap ${fmt(S.bestLap)}${S.bestLap <= bestEver ? ' (new record)' : ` · record ${fmt(bestEver)}`}`;
  $('finish').hidden = false;
  try { if (S.bestLap < bestEver) { bestEver = S.bestLap; localStorage.setItem(BEST_KEY, String(bestEver)); } } catch (e) {}
}
