import * as THREE from 'three';
import { TAU, clamp01, damp } from './util.js';
import { BOOST_TOP } from './config.js';
import { camera } from './renderer.js';
import { fr, frame } from './track.js';
import { S, player } from './state.js';
import { lines, lineMat, lineGroup } from './effects.js';

// Chase camera that leans with the banked track, pulls back with speed and circles the kart on the title screen.
const tmpF = fr();
const cam = { h: 0, up: new THREE.Vector3(0, 1, 0), fov: 70, back: 9.5 };
const camPos = new THREE.Vector3(), look = new THREE.Vector3(), cf = new THREE.Vector3();
export function updateCamera(dt, skyFollow) {
  const r = player;
  frame(r.s, tmpF);
  cam.h = damp(cam.h, r.h * 0.75, 7, dt);
  cam.up.lerp(tmpF.u, 1 - Math.exp(-6 * dt)).normalize();
  const spd = Math.hypot(r.va, r.vb), boost = r.boostT > 0 ? 1 : 0;
  const near = S.camMode === 1;
  cam.back = damp(cam.back, (near ? 6.5 : 9.5) + spd * 0.012 - boost * 1.2, 4, dt);
  cf.copy(tmpF.t).multiplyScalar(Math.cos(cam.h)).addScaledVector(tmpF.r, Math.sin(cam.h));
  const base = r.model.group.position;
  camPos.copy(base).addScaledVector(cf, -cam.back).addScaledVector(cam.up, near ? 2.4 : 3.3);
  look.copy(base).addScaledVector(cf, 14).addScaledVector(cam.up, 1.3);
  if (S.phase === 'title') {
    const a = S.t * 0.12;
    camPos.copy(base).add(new THREE.Vector3(Math.sin(a) * 14, 4.5, Math.cos(a) * 14));
    look.copy(base).add(new THREE.Vector3(0, 1.2, 0));
    camera.up.set(0, 1, 0);
  } else camera.up.copy(cam.up);
  if (S.shake > 0) { camPos.add(new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).multiplyScalar(S.shake)); S.shake = Math.max(0, S.shake - dt * 1.6); }
  camera.position.copy(camPos); camera.lookAt(look);
  const tf = S.phase === 'title' ? 55 : 68 + clamp01(spd / BOOST_TOP) * 22 + boost * 6 + (r.air ? 10 : 0);
  cam.fov = damp(cam.fov, tf, 4, dt);
  camera.fov = cam.fov; camera.updateProjectionMatrix();
  skyFollow.position.set(camera.position.x, 0, camera.position.z);
  // speed lines
  const sp = clamp01((spd - 60) / 100) + boost * 0.4 + (r.air ? 0.5 : 0);
  lineMat.opacity = sp * 0.35;
  lines.forEach(l => { l.position.z += (spd * 1.4 + 20) * dt; if (l.position.z > 4) { const a = Math.random() * TAU, rr = 3 + Math.random() * 5; l.position.set(Math.cos(a) * rr * 1.6, Math.sin(a) * rr, -60 - Math.random() * 10); } });
  lineGroup.visible = sp > 0.02;
}
