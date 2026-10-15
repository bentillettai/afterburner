import * as THREE from 'three';
import { damp, rand, TAU } from './util.js';
import { HOVER } from './config.js';
import { scene } from './renderer.js';
import { frame, fr } from './track.js';
import { buildAfterburner, PAINTS } from './kartModel.js';

// Shared race state: the phase and clocks, and every racer (the player is racers[0]).
export const S = { phase: 'title', t: 0, count: 0, raceTime: 0, lapStart: 0, lapIdx: 0, bestLap: Infinity, results: [], shake: 0, camMode: 0, finishShown: false, finishAt: 0, paused: false, wallSoundAt: -9 };

export const racers = [];
export let player = null;
export const AI_BASE = [0, 107, 104, 101, 98, 95];

export function createRacers() {
  PAINTS.forEach((p, i) => {
    const model = buildAfterburner(p, i === 0);
    scene.add(model.group);
    racers.push({ i, name: p.name, color: p.neon, model, s: 0, x: 0, va: 0, vb: 0, h: 0, steerVis: 0, boostT: 0, energy: 100, finished: false, finishTime: 0, base: 0, phase: rand() * TAU, lineOff: 0, aiBoostCD: 0, air: false, y: 0, pitch: 0 });
  });
  player = racers[0];
}

export function rank() { return 1 + racers.filter(r => r !== player && (r.finished && !player.finished ? true : !player.finished && r.s > player.s)).length; }

// ---------------- placing the models ----------------
const tmpF = fr();
const basis = new THREE.Matrix4(), fwdV = new THREE.Vector3(), rightV = new THREE.Vector3(), xAxis = new THREE.Vector3();
export function place(r, dt) {
  frame(r.s, tmpF);
  const bob = Math.sin(S.t * 5 + r.phase) * 0.07;
  const g = r.model.group;
  g.position.copy(tmpF.p).addScaledVector(tmpF.r, r.x).addScaledVector(tmpF.u, HOVER + bob + (r.y || 0));
  const c = Math.cos(r.h), s = Math.sin(r.h);
  fwdV.copy(tmpF.t).multiplyScalar(c).addScaledVector(tmpF.r, s);
  rightV.copy(tmpF.r).multiplyScalar(c).addScaledVector(tmpF.t, -s);
  xAxis.copy(rightV).negate();
  basis.makeBasis(xAxis, tmpF.u, fwdV);
  g.quaternion.setFromRotationMatrix(basis);
  r.model.body.rotation.z = damp(r.model.body.rotation.z, r.steerVis * 0.32, 8, dt);
  r.model.body.rotation.x = damp(r.model.body.rotation.x, -(r.boostT > 0 ? 0.06 : 0) + (r.thrust || 0) * -0.02 - (r.pitch || 0), 6, dt);
  r.model.body.rotation.y = damp(r.model.body.rotation.y, r.steerVis * 0.08, 8, dt);
  r.model.tick({ t: S.t, dt, boost: r.boostT > 0 ? 1 : 0, speed: Math.hypot(r.va, r.vb), thrust: r.thrust || 0 });
}
