import * as THREE from 'three';
import { TAU } from './util.js';
import { scene, camera } from './renderer.js';
import { glow } from './kartModel.js';

// Sparks from wall scrapes and bumps, and speed lines that stream past the camera.
export const sparks = [];
export const lines = [];
export let lineMat = null, lineGroup = null;

// Called after the racers are built, so the scene keeps the prototype's object order.
export function initEffects() {
  const sparkGeo = new THREE.BoxGeometry(0.08, 0.08, 0.7);
  for (let i = 0; i < 90; i++) { const m = new THREE.Mesh(sparkGeo, glow('#ffe14d', { opacity: 1 })); m.visible = false; scene.add(m); sparks.push({ m, life: 0, v: new THREE.Vector3() }); }
  // speed lines in camera space
  lineMat = new THREE.MeshBasicMaterial({ color: '#e9fdff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  lineGroup = new THREE.Group(); camera.add(lineGroup); scene.add(camera);
  for (let i = 0; i < 46; i++) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 5), lineMat);
    const a = Math.random() * TAU, r = 3 + Math.random() * 5;
    l.position.set(Math.cos(a) * r * 1.6, Math.sin(a) * r, -Math.random() * 60);
    lineGroup.add(l); lines.push(l);
  }
}

export function emitSparks(pos, dir, n, color) {
  for (let k = 0; k < n; k++) {
    const s = sparks.find(q => q.life <= 0); if (!s) return;
    s.life = 0.3 + Math.random() * 0.35; s.m.visible = true; s.m.material.color.set(color);
    s.m.position.copy(pos); s.v.copy(dir).multiplyScalar(0.6 + Math.random()).add(new THREE.Vector3((Math.random() - 0.5) * 18, Math.random() * 10, (Math.random() - 0.5) * 18));
  }
}

export function updateSparks(dt) {
  sparks.forEach(s => { if (s.life > 0) { s.life -= dt; s.m.position.addScaledVector(s.v, dt); s.v.y -= 30 * dt; s.m.lookAt(s.m.position.clone().add(s.v)); if (s.life <= 0) s.m.visible = false; } });
}
