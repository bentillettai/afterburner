import { clamp, clamp01, damp, rand } from './util.js';
import { HALF, BOOST_TOP, BOOST_COST, WALL_GAP, ENERGY_REGEN, PIT_REFILL, AI_FIRE_RANGE } from './config.js';
import { kAt, wrapS, PIT, PIT_X } from './track.js';
import { S, player } from './state.js';
import { boostNow, checkPads, warpLaunch, warpLand } from './physics.js';
import { stepWarp } from './warp.js';
import { rechargeAmmo, aiShoot } from './weapons.js';

// Computer racers: slow for the sharpest bend coming up, follow a racing line with a personal
// offset, boost on straights, top up in the pit lane, and rubber-band a little to the player.
export function stepAI(r, dt) {
  if (S.phase !== 'race' && S.phase !== 'done') { r.va = 0; return; }
  let kmax = 0, ksign = 0;
  for (let d = 10; d <= 110; d += 10) { const k = kAt(r.s + d); if (Math.abs(k) > kmax) { kmax = Math.abs(k); ksign = Math.sign(k); } }
  const vCurve = Math.sqrt(150 / Math.max(kmax, 1e-4));
  const gap = player.s - r.s;
  const rubber = 1 + clamp(gap / 500, -0.1, 0.12);
  let target = Math.min(r.base * rubber, vCurve + 6);
  if (r.boostT > 0) target = Math.max(target, BOOST_TOP * 0.92);
  r.va += clamp(target - r.va, -85 * dt, (r.boostT > 0 ? 110 : 42) * dt);
  // racing line: hug the inside of the next turn, with a personal offset
  const kNear = kAt(r.s + 35);
  const tx = clamp(kNear * 420 + r.lineOff + Math.sin(S.t * 0.4 + r.phase) * 2, -HALF + 2, HALF - 2);
  const pit = wrapS(r.s) > PIT[0] - 120 && wrapS(r.s) < PIT[1] && r.energy < 50;
  const goal = pit ? -8.5 : tx;
  const vbT = clamp((goal - r.x) * 1.4, -14, 14);
  r.vb = damp(r.vb, vbT, 4, dt);
  r.s += r.va * dt; r.x += r.vb * dt;
  r.h = Math.atan2(r.vb, Math.max(10, r.va));
  r.steerVis = damp(r.steerVis, clamp(r.vb / 8 + ksign * clamp01(kmax * 40) * 0.6, -1, 1), 6, dt);
  r.boostT = Math.max(0, r.boostT - dt);
  r.aiBoostCD -= dt;
  if (r.aiBoostCD <= 0 && kmax < 0.006 && r.energy > 45) { r.energy -= BOOST_COST; boostNow(r, 1.4); r.aiBoostCD = 5 + rand() * 6; }
  if (Math.abs(r.x) > HALF - WALL_GAP) { r.x = Math.sign(r.x) * (HALF - WALL_GAP); r.vb = 0; }
  if (!stepWarp(r, warpLaunch, warpLand)) checkPads(r);
  const sm = wrapS(r.s);
  const inPit = sm > PIT[0] && sm < PIT[1] && r.x < PIT_X[1] + 1;
  if (S.phase === 'race') {
    r.energy = Math.min(100, r.energy + (inPit ? PIT_REFILL : ENERGY_REGEN) * dt);
    rechargeAmmo(r, dt);
    aiShoot(r, AI_FIRE_RANGE);
  }
  r.thrust = 1;
}
