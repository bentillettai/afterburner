import * as THREE from 'three';
import { BOLT_DAMAGE } from './config.js';
import { scene, camera, canvasTex } from './renderer.js';
import { racers } from './state.js';
import { glow } from './kartModel.js';

// What a blaster hit looks like: a flash and shock ring where the bolt lands, the target's
// shield bubble lighting up (red when it had no energy left), and, for your own hits,
// a damage number floating up off the kart you hit.
const SHIELD_T = 0.6, BURST_T = 0.4, POP_T = 1.0;
const bursts = [], pops = [];
let popTex = null;

function makePopTex(text, color) {
  return canvasTex(256, 128, (x, w, h) => {
    x.font = '80px Audiowide, "Arial Black", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.shadowColor = color; x.shadowBlur = 20; x.fillStyle = color; x.fillText(text, w / 2, h / 2);
    x.shadowBlur = 0; x.globalAlpha = 0.8; x.fillStyle = '#ffffff'; x.fillText(text, w / 2, h / 2);
  });
}

export function initHitFx() {
  const shieldGeo = new THREE.SphereGeometry(1, 24, 14);
  racers.forEach(r => {
    const mat = glow('#ffffff', { opacity: 0, side: THREE.DoubleSide });
    const m = new THREE.Mesh(shieldGeo, mat);
    m.scale.set(2.5, 1.5, 3.3); m.position.y = 0.9; m.visible = false;
    r.model.group.add(m);
    r.shield = { m, mat, t: 0 };
  });
  const ringGeo = new THREE.TorusGeometry(1, 0.14, 6, 36), coreGeo = new THREE.SphereGeometry(1, 14, 10);
  for (let i = 0; i < 12; i++) {
    const ring = new THREE.Mesh(ringGeo, glow('#ffffff', { opacity: 0 })), core = new THREE.Mesh(coreGeo, glow('#ffffff', { opacity: 0 }));
    const g = new THREE.Group(); g.add(ring, core); g.visible = false; scene.add(g);
    bursts.push({ g, ring, core, life: 0 });
  }
  popTex = { hit: makePopTex(`-${BOLT_DAMAGE}`, '#ffe14d'), down: makePopTex('KO!', '#ff2f5a') };
  for (let i = 0; i < 8; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: popTex.hit, transparent: true, depthTest: false, depthWrite: false }));
    sp.scale.set(5, 2.5, 1); sp.renderOrder = 10; sp.visible = false; scene.add(sp);
    pops.push({ sp, life: 0, r: null });
  }
}

export function resetHitFx() {
  racers.forEach(r => { if (r.shield) { r.shield.t = 0; r.shield.m.visible = false; } });
  bursts.forEach(b => { b.life = 0; b.g.visible = false; });
  pops.forEach(p => { p.life = 0; p.sp.visible = false; });
}

export function showHit(pos, target, color, shieldDown, byPlayer, onPlayer) {
  const sh = target.shield;
  // your own bubble stays faint so it doesn't block the view; the screen edge glows red instead
  if (sh) { sh.t = SHIELD_T; sh.peak = onPlayer ? 0.22 : 0.6; sh.mat.color.set(shieldDown ? '#ff2f5a' : target.color); sh.m.visible = true; }
  if (onPlayer) return;
  const b = bursts.find(q => q.life <= 0) || bursts[0];
  b.life = BURST_T; b.g.position.copy(pos); b.g.visible = true;
  b.ring.material.color.set(color); b.core.material.color.set(shieldDown ? '#ff2f5a' : '#ffffff');
  if (byPlayer) {
    const p = pops.find(q => q.life <= 0) || pops[0];
    p.life = POP_T; p.r = target; p.sp.visible = true;
    p.sp.material.map = shieldDown ? popTex.down : popTex.hit; p.sp.material.needsUpdate = true;
  }
}

export function updateHitFx(dt) {
  for (const r of racers) {
    const sh = r.shield; if (!sh || sh.t <= 0) continue;
    sh.t = Math.max(0, sh.t - dt);
    const k = sh.t / SHIELD_T;
    sh.mat.opacity = sh.peak * k;
    const wob = 1 + 0.08 * Math.sin(sh.t * 40);
    sh.m.scale.set(2.5 * wob, 1.5 * wob, 3.3 * wob);
    if (sh.t <= 0) sh.m.visible = false;
  }
  for (const b of bursts) {
    if (b.life <= 0) continue;
    b.life -= dt;
    const k = 1 - Math.max(0, b.life) / BURST_T;
    b.ring.scale.setScalar(1 + k * 6); b.ring.material.opacity = 0.9 * (1 - k);
    b.core.scale.setScalar(0.8 + k * 2.2); b.core.material.opacity = 0.9 * (1 - k) * (1 - k);
    b.g.lookAt(camera.position);
    if (b.life <= 0) b.g.visible = false;
  }
  for (const p of pops) {
    if (p.life <= 0) continue;
    p.life -= dt;
    const k = 1 - Math.max(0, p.life) / POP_T;
    p.sp.position.copy(p.r.model.group.position); p.sp.position.y += 3.2 + k * 3;
    p.sp.material.opacity = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    // grow with distance so the number stays readable on a kart far up the road
    const sc = (k < 0.12 ? 0.6 + k * 4 : 1.08) * Math.max(1, p.sp.position.distanceTo(camera.position) / 22);
    p.sp.scale.set(5 * sc, 2.5 * sc, 1);
    if (p.life <= 0) p.sp.visible = false;
  }
}
