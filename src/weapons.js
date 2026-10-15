import * as THREE from 'three';
import { rand } from './util.js';
import { BOLT_SPEED, BOLT_LIFE, BOLT_DAMAGE, BOLT_SLOW, SHIELD_DOWN_SLOW, AMMO_MAX, AMMO_RECHARGE, FIRE_COOLDOWN, HOVER } from './config.js';
import { scene } from './renderer.js';
import { L, fr, frame, wrapS } from './track.js';
import { S, racers, player } from './state.js';
import { glow } from './kartModel.js';
import { emitSparks } from './effects.js';
import { audio } from './audio.js';
import { flash } from './hud.js';
import { initHitFx, resetHitFx, showHit, updateHitFx } from './hitfx.js';

// Blaster bolts. Like the karts they live in track space: s along the track, x across it,
// so a bolt follows the bends and hits whoever is in its lane ahead.
const bolts = [];
const boltGeo = new THREE.BoxGeometry(0.4, 0.4, 5);
const coreGeo = new THREE.BoxGeometry(0.16, 0.16, 5.3);
const tmpF = fr(), look = new THREE.Vector3();

export function initWeapons() {
  for (let i = 0; i < 40; i++) {
    const m = new THREE.Mesh(boltGeo, glow('#ffffff', { opacity: 0.95 }));
    m.add(new THREE.Mesh(coreGeo, glow('#ffffff', { opacity: 1 })));
    m.visible = false; scene.add(m);
    bolts.push({ m, life: 0, s: 0, x: 0, v: 0, owner: null });
  }
  initHitFx();
}

export function resetWeapons() {
  bolts.forEach(b => { b.life = 0; b.m.visible = false; });
  resetHitFx();
  S.hitMark = null; S.incoming = false;
  racers.forEach(r => { r.ammo = AMMO_MAX; r.ammoT = 0; r.fireCD = 0; r.hitT = 0; r.aiFireCD = 3 + rand() * 4; });
}

export function fire(r) {
  if (r.ammo < 1 || r.fireCD > 0) return false;
  const b = bolts.find(q => q.life <= 0); if (!b) return false;
  r.ammo -= 1; r.fireCD = FIRE_COOLDOWN;
  Object.assign(b, { life: BOLT_LIFE, s: r.s + 3, x: r.x, v: Math.max(0, r.va) + BOLT_SPEED, owner: r });
  b.m.material.color.set(r.color); b.m.visible = true;
  if (r === player) audio.zap(880, 0.12);
  else { const d = Math.abs(r.s - player.s); if (d < 120) audio.zap(620, 0.12 * (1 - d / 120)); }
  return true;
}

// one bolt back every AMMO_RECHARGE seconds
export function rechargeAmmo(r, dt) {
  r.fireCD = Math.max(0, (r.fireCD || 0) - dt);
  r.hitT = Math.max(0, (r.hitT || 0) - dt);
  r.aiFireCD = Math.max(0, (r.aiFireCD || 0) - dt);
  if (r.ammo >= AMMO_MAX) { r.ammoT = 0; return; }
  r.ammoT += dt;
  if (r.ammoT >= AMMO_RECHARGE) { r.ammoT = 0; r.ammo += 1; }
}

function hit(b, r) {
  const shieldDown = r.energy <= 0;
  r.energy = Math.max(0, r.energy - BOLT_DAMAGE);
  r.va *= 1 - (shieldDown ? SHIELD_DOWN_SLOW : BOLT_SLOW);
  r.vb += (Math.random() - 0.5) * 8;
  r.hitT = 0.5;
  frame(r.s, tmpF);
  const pos = tmpF.p.clone().addScaledVector(tmpF.r, r.x).addScaledVector(tmpF.u, 1.2);
  emitSparks(pos, tmpF.t.clone().multiplyScalar(r.va * 0.5), 10, b.owner.color);
  showHit(pos, r, b.owner.color, shieldDown, b.owner === player, r === player);
  if (r === player) {
    audio.burst(0.3, 500, 0.22); audio.beep(110, 0.25, 0.22); S.shake = Math.max(S.shake, 0.45);
    flash(shieldDown ? 'SHIELD DOWN' : 'HIT', 0.6, `by ${b.owner.name}`);
  } else if (b.owner === player) {
    audio.ding();
    S.hitMark = { name: r.name, ko: shieldDown, t: 0.9 };
  }
}

export function updateBolts(dt) {
  if (S.hitMark && (S.hitMark.t -= dt) <= 0) S.hitMark = null;
  // warn when a rival's bolt is closing on you from behind, in your lane
  S.incoming = bolts.some(b => {
    if (b.life <= 0 || b.owner === player) return false;
    let ds = wrapS(player.s - b.s); if (ds > L / 2) ds -= L;
    return ds > 0 && ds < 90 && Math.abs(b.x - player.x) < 3;
  });
  updateHitFx(dt);
  for (const b of bolts) {
    if (b.life <= 0) continue;
    b.life -= dt;
    const s0 = b.s;
    b.s += b.v * dt;
    for (const r of racers) {
      if (r === b.owner || r.finished) continue;
      // did the bolt pass through this kart during this step?
      let ds0 = wrapS(r.s - s0); if (ds0 > L / 2) ds0 -= L;
      const ds1 = ds0 - (b.s - s0);
      if (ds0 > -2.5 && ds1 < 2.5 && Math.abs(r.x - b.x) < 2.2) { hit(b, r); b.life = 0; break; }
    }
    if (b.life <= 0) { b.m.visible = false; continue; }
    frame(b.s, tmpF);
    b.m.position.copy(tmpF.p).addScaledVector(tmpF.r, b.x).addScaledVector(tmpF.u, HOVER + 0.8);
    look.copy(b.m.position).add(tmpF.t);
    b.m.up.copy(tmpF.u); b.m.lookAt(look);
  }
}

// rivals shoot at whoever is in their lane ahead, now and then
export function aiShoot(r, range) {
  if (r.ammo < 1 || r.fireCD > 0 || r.aiFireCD > 0) return;
  for (const t of racers) {
    if (t === r || t.finished) continue;
    let ds = wrapS(t.s - r.s); if (ds > L / 2) ds -= L;
    if (ds > range[0] && ds < range[1] && Math.abs(t.x - r.x) < 2) {
      if (fire(r)) r.aiFireCD = t === player ? 1.2 + rand() * 2.5 : 2 + rand() * 3;
      return;
    }
  }
}
