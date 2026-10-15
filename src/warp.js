import * as THREE from 'three';
import { clamp } from './util.js';
import { HALF, HOVER, WALL_GAP, WARP_GAP, WARP_HEIGHT, WARP_MIN_SPEED } from './config.js';
import { scene, canvasTex } from './renderer.js';
import { fr, frame, wrapS } from './track.js';

// The warp gate: the road ends in a portal, the kart flies a scripted arc over the gap in track
// space (s keeps running, y is height above where the road would be) and lands past the far portal.
const [G0, G1] = WARP_GAP;
export const inGap = s => { const sm = wrapS(s); return sm > G0 && sm < G1; };

// Returns true while airborne. onLaunch/onLand let the caller add sound and effects.
export function stepWarp(r, onLaunch, onLand) {
  const sm = wrapS(r.s), inside = sm > G0 && sm < G1;
  if (inside && !r.air) {
    r.air = true; r.airFrom = sm;
    if (r.va < WARP_MIN_SPEED) r.va = WARP_MIN_SPEED;
    onLaunch?.(r);
  }
  if (!r.air) return false;
  if (!inside) {
    r.air = false; r.y = 0; r.pitch = 0;
    r.x = clamp(r.x, -(HALF - WALL_GAP - 1.5), HALF - WALL_GAP - 1.5);
    onLand?.(r);
    return false;
  }
  // a sine arc from wherever the kart entered to the landing portal, scaled down for late entries
  const span = G1 - r.airFrom, u = clamp((sm - r.airFrom) / span, 0, 1), hgt = WARP_HEIGHT * span / (G1 - G0);
  r.y = hgt * Math.sin(Math.PI * u);
  r.pitch = Math.atan(hgt * Math.PI / span * Math.cos(Math.PI * u));
  return true;
}

// ---------------- visuals ----------------
const spin = [], hoops = [];
const tmpF = fr(), basis = new THREE.Matrix4();
function placeOnTrack(obj, s, lift) {
  frame(s, tmpF);
  basis.makeBasis(tmpF.r.clone().negate(), tmpF.u, tmpF.t);
  obj.quaternion.setFromRotationMatrix(basis);
  obj.position.copy(tmpF.p).addScaledVector(tmpF.u, lift);
  scene.add(obj);
  return obj;
}
const add = c => new THREE.MeshBasicMaterial({ color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

export function buildWarp() {
  // swirling portal skin
  const swirl = canvasTex(256, 256, (x, w, h) => {
    const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(0.35, 'rgba(138,92,255,.25)'); g.addColorStop(1, 'rgba(51,240,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.translate(w / 2, h / 2); x.lineWidth = 3;
    for (let a = 0; a < 6; a++) {
      x.strokeStyle = a % 2 ? 'rgba(255,47,166,.6)' : 'rgba(51,240,255,.6)';
      x.beginPath(); for (let t = 0; t < 1; t += 0.01) { const rr = t * w / 2, th = a * Math.PI / 3 + t * 5; x.lineTo(Math.cos(th) * rr, Math.sin(th) * rr); } x.stroke();
    }
  });
  const R = HALF + 3, CY = 7;
  [[G0, '#33f0ff', '#ff2fa6'], [G1, '#ff2fa6', '#33f0ff']].forEach(([s, a, b], gi) => {
    const g = placeOnTrack(new THREE.Group(), s, 0);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.9, 10, 64), add(a)); ring.position.y = CY; g.add(ring);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(R + 2.2, 0.35, 8, 64), add(b)); ring2.position.y = CY; g.add(ring2);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(R, 48), new THREE.MeshBasicMaterial({ map: swirl, transparent: true, opacity: gi ? 0.25 : 0.45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    disc.position.y = CY; g.add(disc);
    spin.push({ m: disc, w: gi ? -1.6 : 2.2 }, { m: ring2, w: 0.5 });
  });
  // a short tunnel of rings leading into the gate, bunching up as they near it
  for (let i = 0; i < 7; i++) {
    const s = G0 - 90 + 90 * (1 - Math.pow(1 - i / 7, 1.6));
    const g = placeOnTrack(new THREE.Group(), s, 0);
    const m = new THREE.Mesh(new THREE.TorusGeometry(R - 1, 0.3, 6, 6 + (i % 2) * 2), add(i % 2 ? '#ff2fa6' : '#33f0ff'));
    m.position.y = CY; g.add(m); spin.push({ m, w: (i % 2 ? -1 : 1) * 0.8 });
  }
  // the road ends in a bright lip, and starts again with one
  const lip = canvasTex(256, 32, (x, w, h) => { x.fillStyle = '#ffe14d'; x.fillRect(0, 0, w, h); x.fillStyle = '#ff2fa6'; for (let i = 0; i < w; i += 32) x.fillRect(i, 0, 16, h); });
  [[G0 - 2.5, G0], [G1, G1 + 2.5]].forEach(([a, b]) => {
    const f0 = frame(a, fr()), f1 = frame(b, fr());
    const geo = new THREE.BufferGeometry();
    const v = (f, x) => f.p.clone().addScaledVector(f.r, x).addScaledVector(f.u, 0.06);
    const q = [v(f0, -HALF), v(f0, HALF), v(f1, -HALF), v(f1, HALF)];
    geo.setAttribute('position', new THREE.Float32BufferAttribute(q.flatMap(p => [p.x, p.y, p.z]), 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
    geo.setIndex([0, 1, 2, 1, 3, 2]);
    scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: lip, side: THREE.DoubleSide })));
  });
  // guide hoops hanging along the flight path
  [0.25, 0.5, 0.75].forEach((u, i) => {
    const s = G0 + (G1 - G0) * u;
    const g = placeOnTrack(new THREE.Group(), s, HOVER + WARP_HEIGHT * Math.sin(Math.PI * u));
    const mat = add(i === 1 ? '#33f0ff' : '#8a5cff');
    const m = new THREE.Mesh(new THREE.TorusGeometry(11, 0.4, 8, 48), mat); g.add(m);
    hoops.push({ m, mat, base: new THREE.Color(mat.color), k: i });
  });
}

export function updateWarp(t) {
  spin.forEach(o => { o.m.rotation.z = t * o.w; });
  hoops.forEach(h => h.mat.color.copy(h.base).multiplyScalar(0.35 + 0.4 * Math.max(0, Math.sin(t * 6 - h.k * 1.2))));
}
