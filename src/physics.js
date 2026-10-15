import { clamp, clamp01, damp } from './util.js';
import {
  HALF, TOP, BOOST_TOP, ACCEL, BOOST_COST, STEER_RATE, AIR_STEER_RATE, WALL_GAP, WALL_CUSHION, WALL_CUSHION_TURN,
  WALL_ALIGN, WALL_BOUNCE, WALL_BOUNCE_MAX, WALL_SPEED_LOSS, WALL_SPEED_LOSS_MAX, WALL_SCRAPE_DRAG, WALL_ENERGY_FREE,
  WALL_ENERGY, WALL_SOUND_MIN, ENERGY_REGEN, PIT_REFILL, WARP_STEER, WARP_LAND_BOOST,
} from './config.js';
import { stepWarp } from './warp.js';
import { fire, rechargeAmmo } from './weapons.js';
import { L, fr, frame, wrapS, kAt, PADS, PAD_LEN, PAD_W, PIT, PIT_X } from './track.js';
import { S, racers, player } from './state.js';
import { down, pressed } from './input.js';
import { audio } from './audio.js';
import { emitSparks } from './effects.js';
import { flash } from './hud.js';

// Hover physics, worked out in track space: s is distance along the track, x is the sideways
// offset from the centre line, h is heading relative to the track, and (va, vb) is velocity
// along and across it. The track's curvature turns the kart as it moves.
const tmpF = fr();
export function boostNow(r, dur) { r.boostT = Math.max(r.boostT, dur); if (r === player) { audio.burst(0.6, 300, 0.35); S.shake = Math.max(S.shake, 0.25); } }
export function checkPads(r) {
  const sm = wrapS(r.s);
  for (const p of PADS) {
    if (sm >= p.s && sm <= p.s + PAD_LEN && Math.abs(r.x - p.x) < PAD_W / 2 + 0.6 && r.boostT < 0.9) { boostNow(r, 1.1); if (r === player) flash('BOOST', 0.5); }
  }
}
export function wallHit(r, side, impact, dt) {
  r.x = side * (HALF - WALL_GAP);
  // glance off: a small push back towards the middle, and the nose swings round to run along the wall
  if (Math.sign(r.vb) === side) r.vb = -side * Math.min(WALL_BOUNCE_MAX, impact * WALL_BOUNCE);
  if (Math.sin(r.h) * side > 0) r.h = damp(r.h, -side * 0.03, WALL_ALIGN, dt);
  r.va *= 1 - Math.min(WALL_SPEED_LOSS_MAX, impact * WALL_SPEED_LOSS) - WALL_SCRAPE_DRAG * dt;
  r.energy = Math.max(0, r.energy - Math.max(0, impact - WALL_ENERGY_FREE) * WALL_ENERGY);
  if (r === player) {
    frame(r.s, tmpF);
    const pos = tmpF.p.clone().addScaledVector(tmpF.r, side * HALF).addScaledVector(tmpF.u, 0.6);
    if (impact > 3 || Math.random() < 0.1) emitSparks(pos, tmpF.t.clone().multiplyScalar(player.va * 0.4), impact > 3 ? 4 + Math.min(8, impact) : 1, side > 0 ? '#33f0ff' : '#ff2fa6');
    if (impact > WALL_SOUND_MIN && S.t - S.wallSoundAt > 0.3) { audio.burst(0.14, 500, 0.08); S.wallSoundAt = S.t; }
    if (impact > 3) S.shake = Math.max(S.shake, Math.min(0.25, impact * 0.015));
  }
}

// warp gate launch and landing; the landing is forgiving: it straightens the kart and gives a little boost
export function warpLaunch(r) {
  if (r !== player) return;
  flash('WARP', 0.8); audio.burst(0.9, 160, 0.4); S.shake = Math.max(S.shake, 0.35);
}
export function warpLand(r) {
  r.vb *= 0.3; r.h *= 0.4;
  boostNow(r, WARP_LAND_BOOST);
  if (r !== player) return;
  S.shake = Math.max(S.shake, 0.3);
  frame(r.s, tmpF);
  emitSparks(tmpF.p.clone().addScaledVector(tmpF.r, r.x).addScaledVector(tmpF.u, 0.3), tmpF.t.clone().multiplyScalar(r.va * 0.4), 14, '#8a5cff');
}

export function stepPlayer(r, dt) {
  const auto = r.finished || window.__abAuto;
  let steer = (down('ArrowRight', 'KeyD') ? 1 : 0) - (down('ArrowLeft', 'KeyA') ? 1 : 0);
  let thrust = down('ArrowUp', 'KeyW') ? 1 : 0;
  let brake = down('ArrowDown', 'KeyS');
  let air = down('Space');
  if (auto) {
    const ahead = kAt(r.s + 40);
    const wantX = clamp(ahead * 300, -7, 7);
    steer = clamp((wantX - r.x) * 0.08 - r.h * 2.5 + ahead * 26, -1, 1);
    thrust = 1; brake = false; air = Math.abs(ahead) > 0.022;
  }
  if (S.phase !== 'race' && !r.finished) { steer = 0; thrust = 0; brake = false; air = false; }
  if (!auto && S.phase === 'race' && (pressed.has('ShiftLeft') || pressed.has('ShiftRight'))) {
    if (r.energy >= BOOST_COST && r.boostT < 0.4) { r.energy -= BOOST_COST; boostNow(r, 1.6); flash('BOOST', 0.5); }
    else if (r.energy < BOOST_COST) flash('LOW ENERGY', 0.7);
  }
  if (S.phase === 'race') {
    rechargeAmmo(r, dt);
    if (!auto && down('KeyE', 'KeyX') && !fire(r) && r.ammo < 1 && (pressed.has('KeyE') || pressed.has('KeyX'))) flash('NO AMMO', 0.5);
  }
  r.steerVis = damp(r.steerVis, steer * (air ? 1.4 : 1), 10, dt);
  r.thrust = damp(r.thrust || 0, thrust, 6, dt);
  integrate(r, dt, steer, thrust, brake, air);
}

export function integrate(r, dt, steer, thrust, brake, air) {
  const spd = Math.hypot(r.va, r.vb);
  const rate = (air ? AIR_STEER_RATE : STEER_RATE) * (0.45 + 0.55 * clamp01(spd / 70)) * (r.air ? WARP_STEER : 1);
  r.h += steer * rate * dt;
  // the track bends under you: heading and velocity rotate relative to the track
  const k = kAt(r.s), turn = -k * r.va * dt;
  r.h += turn;
  const c = Math.cos(turn), sn = Math.sin(turn);
  const va = r.va * c - r.vb * sn, vb = r.va * sn + r.vb * c;
  r.h = Math.atan2(Math.sin(r.h), Math.cos(r.h));
  const fx = Math.cos(r.h), fy = Math.sin(r.h);
  let fwd = va * fx + vb * fy, lat = -va * fy + vb * fx;
  const boosting = r.boostT > 0;
  let top = boosting ? BOOST_TOP : TOP;
  if (r.energy <= 0) top *= 0.82;
  if (thrust) fwd += (fwd < top ? ACCEL * (1 - 0.55 * clamp01(fwd / top)) * thrust : 0) * dt;
  else fwd -= fwd * 0.3 * dt;
  if (boosting && fwd < BOOST_TOP) fwd += 130 * dt;
  if (fwd > top) fwd -= (fwd - top) * 1.4 * dt;
  if (brake) fwd = Math.max(-20, fwd - 95 * dt);
  if (air) fwd -= (8 + fwd * 0.08) * dt;
  lat *= Math.exp(-(air ? 1.4 : 7) * dt);
  r.va = fwd * fx - lat * fy; r.vb = fwd * fy + lat * fx;
  r.s += r.va * dt; r.x += r.vb * dt;
  r.boostT = Math.max(0, r.boostT - dt);
  if (stepWarp(r, warpLaunch, warpLand)) {
    // in the air there are no walls, just an invisible edge that keeps the kart over the landing
    r.x = clamp(r.x, -(HALF - WALL_GAP), HALF - WALL_GAP);
  } else {
    // near the wall the kart is eased away from it, so most close calls never touch
    const edge = Math.abs(r.x) - (HALF - WALL_GAP - WALL_CUSHION), side = Math.sign(r.x);
    if (edge > 0 && Math.sin(r.h) * side > -0.1) r.h -= side * edge * WALL_CUSHION_TURN * dt;
    if (Math.abs(r.x) > HALF - WALL_GAP) wallHit(r, side, Math.abs(r.vb), dt);
    checkPads(r);
  }
  const sm = wrapS(r.s);
  const inPit = sm > PIT[0] && sm < PIT[1] && r.x > PIT_X[0] - 1 && r.x < PIT_X[1] + 1;
  if (S.phase === 'race') r.energy = Math.min(100, r.energy + (inPit ? PIT_REFILL : ENERGY_REGEN) * dt);
}

export function collide() {
  for (let a = 0; a < racers.length; a++) for (let b = a + 1; b < racers.length; b++) {
    const A = racers[a], B = racers[b];
    let ds = wrapS(B.s) - wrapS(A.s); if (ds > L / 2) ds -= L; if (ds < -L / 2) ds += L;
    const dx = B.x - A.x;
    if (Math.abs(ds) < 4.2 && Math.abs(dx) < 2.6) {
      const push = (2.6 - Math.abs(dx)) / 2 * (dx >= 0 ? 1 : -1);
      A.x -= push; B.x += push;
      const back = ds > 0 ? A : B, front = ds > 0 ? B : A;
      const closing = (B.vb - A.vb) * Math.sign(dx || 1) < 0 || back.va > front.va + 2;
      if (closing) [A, B].forEach(r => { if (S.t - (r.lastBump || -9) > 0.35) { r.energy = Math.max(0, r.energy - 3); r.lastBump = S.t; } });
      A.vb = Math.min(A.vb, 0) * (dx >= 0 ? 1 : 0) + Math.max(A.vb, 0) * (dx >= 0 ? 0 : 1) - Math.sign(dx || 1) * 3;
      B.vb = Math.max(B.vb, 0) * (dx >= 0 ? 1 : 0) + Math.min(B.vb, 0) * (dx >= 0 ? 0 : 1) + Math.sign(dx || 1) * 3;
      if (back.va > front.va) { const dv = back.va - front.va; back.va -= dv * 0.6; front.va += dv * 0.3; }
      if ((A === player || B === player) && closing) {
        S.shake = Math.max(S.shake, 0.18);
        if (!S.bumpCD || S.t - S.bumpCD > 0.25) { audio.burst(0.12, 900, 0.2); S.bumpCD = S.t; }
        frame(player.s, tmpF);
        emitSparks(tmpF.p.clone().addScaledVector(tmpF.r, player.x + (dx >= 0 ? 1.2 : -1.2) * (A === player ? 1 : -1)).addScaledVector(tmpF.u, 0.8), tmpF.t.clone().multiplyScalar(player.va * 0.5), 6, '#ffffff');
      }
    }
  }
}
