import { TAU, clamp, clamp01 } from './util.js';
import { LAPS, BOOST_TOP, BOOST_COST } from './config.js';
import { renderer, composer, camera } from './renderer.js';
import { N, P, L } from './track.js';
import { S, racers, player, rank } from './state.js';
import { audio } from './audio.js';

export const $ = id => document.getElementById(id);
export const ORD = n => ['ST', 'ND', 'RD'][n - 1] || 'TH';
export const fmt = t => { if (!isFinite(t)) return '--'; const m = Math.floor(t / 60), s = t % 60; return `${m}:${s.toFixed(2).padStart(5, '0')}`; };

// ---------------- minimap ----------------
const mapCv = $('map'), mapCtx = mapCv.getContext('2d');
let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
P.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); });
function drawMap() {
  const W = mapCv.width, H = mapCv.height; if (!W) return;
  mapCtx.clearRect(0, 0, W, H);
  const pad = W * 0.12, sc = Math.min((W - pad * 2) / (maxX - minX), (H - pad * 2) / (maxZ - minZ));
  const ox = (W - (maxX - minX) * sc) / 2, oz = (H - (maxZ - minZ) * sc) / 2;
  // view from above with +z down the screen flipped so the start straight points up
  const tx = x => W - (ox + (x - minX) * sc), tz = z => H - (oz + (z - minZ) * sc);
  mapCtx.lineJoin = 'round'; mapCtx.lineWidth = W * 0.045; mapCtx.strokeStyle = '#33f0ff'; mapCtx.shadowColor = '#33f0ff'; mapCtx.shadowBlur = W * 0.05;
  mapCtx.beginPath(); for (let i = 0; i < N; i += 4) { const p = P[i]; i ? mapCtx.lineTo(tx(p.x), tz(p.z)) : mapCtx.moveTo(tx(p.x), tz(p.z)); } mapCtx.closePath(); mapCtx.stroke();
  mapCtx.shadowBlur = 0;
  for (let k = racers.length - 1; k >= 0; k--) {
    const r = racers[k], p = r.model.group.position;
    mapCtx.beginPath(); mapCtx.arc(tx(p.x), tz(p.z), W * (k === 0 ? 0.05 : 0.035), 0, TAU);
    mapCtx.fillStyle = r.color; mapCtx.fill();
    if (k === 0) { mapCtx.lineWidth = W * 0.02; mapCtx.strokeStyle = '#ffffff'; mapCtx.stroke(); }
  }
}

// ---------------- big centre messages ----------------
export let msgTimer = 0;
export function flash(text, dur = 1.2, sub = '') { $('msg').textContent = text; $('msg').classList.add('on'); $('sub').textContent = sub; $('sub').classList.toggle('on', !!sub); msgTimer = dur; }
export function hideMsg() { msgTimer = 0; $('msg').classList.remove('on'); $('sub').classList.remove('on'); }

export function hud() {
  if (S.phase === 'title') return;
  const spd = Math.hypot(player.va, player.vb);
  const r = player.finished ? S.place : rank();
  $('pos').textContent = r; $('posSuf').textContent = ORD(r);
  $('lap').textContent = clamp(Math.floor(player.s / L) + 1, 1, LAPS);
  $('time').textContent = fmt(S.phase === 'count' ? 0 : (player.finished ? player.finishTime : S.raceTime));
  $('spd').textContent = Math.round(spd * 3.6);
  $('spdBar').style.transform = `scaleX(${clamp01(spd / BOOST_TOP)})`;
  $('enBar').style.transform = `scaleX(${player.energy / 100})`;
  $('enTxt').textContent = Math.round(player.energy);
  $('energy').classList.toggle('low', player.energy < BOOST_COST);
  if (msgTimer > 0) { msgTimer -= 1 / 60; if (msgTimer <= 0) { $('msg').classList.remove('on'); $('sub').classList.remove('on'); } }
  drawMap();
  audio.update(spd, player.boostT > 0 ? 1 : 0, player.thrust || 0);
}

export function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false); composer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  const dpr = Math.min(window.devicePixelRatio || 1, 2), mr = mapCv.getBoundingClientRect();
  mapCv.width = Math.max(1, mr.width * dpr); mapCv.height = Math.max(1, mr.height * dpr);
}
