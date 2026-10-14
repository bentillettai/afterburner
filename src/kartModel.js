import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { TAU, clamp, clamp01 } from './util.js';
import { HOVER } from './config.js';
import { canvasTex } from './renderer.js';

// ---------------- the Afterburner (from the Turbo Kart garage, wheels folded into hover pods) ----------------
const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05, flatShading: true, ...o });
export const glow = (color, o = {}) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, ...o });
function mesh(geo, mat, parent, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; }
const rbox = (w, h, d, r = 0.1, s = 2) => new RoundedBoxGeometry(w, h, d, s, r);
const UPV = new THREE.Vector3(0, 1, 0);
function limb(parent, a, b, r, mat) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const m = mesh(new THREE.CapsuleGeometry(r, Math.max(0.01, A.distanceTo(B) - r * 2), 3, 8), mat, parent);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(UPV, B.clone().sub(A).normalize());
  return m;
}
function makePod(parent, o) {
  const { x, y, z, r, w, tyre, rim, hub } = o;
  const side = Math.sign(x);
  const fold = new THREE.Group(); fold.position.set(x, y, z); parent.add(fold);
  fold.rotation.z = side * Math.PI / 2;           // wheel folds flat, like anti-gravity mode
  const spin = new THREE.Group(); fold.add(spin);
  const s = Math.min(w, r) * 0.28;
  mesh(new THREE.CylinderGeometry(r, r, w - s * 2, 20), tyre, spin).rotation.z = Math.PI / 2;
  [-1, 1].forEach(k => { mesh(new THREE.TorusGeometry(r - s, s, 6, 20), tyre, spin, k * (w / 2 - s), 0, 0).rotation.y = Math.PI / 2; });
  const face = new THREE.Group(); face.position.x = -side * (w / 2 - 0.02); face.rotation.z = side * Math.PI / 2; spin.add(face);
  const rimR = r * 0.72;
  mesh(new THREE.CylinderGeometry(rimR, rimR, 0.06, 6), rim, face);
  for (let i = 0; i < 3; i++) { const sp = mesh(new THREE.BoxGeometry(rimR * 0.2, 0.1, rimR * 0.9), hub, face, 0, 0.04, 0); sp.rotation.y = (i / 3) * TAU; sp.translateZ(rimR * 0.42); }
  const ringMat = glow(o.glowRing, { opacity: 0.95 });
  const gr = new THREE.Mesh(new THREE.TorusGeometry(r * 1.02, 0.07, 4, 28), ringMat); gr.rotation.x = Math.PI / 2; gr.position.y = -0.06; face.add(gr);
  const pad = new THREE.Mesh(new THREE.CircleGeometry(r * 1.25, 24), glow(o.glowRing, { opacity: 0.5, side: THREE.DoubleSide }));
  pad.rotation.x = -Math.PI / 2; pad.position.set(x * 1.04, 0.06 - HOVER, z); parent.parent.add(pad);
  return { spin, ringMat, pad };
}
function makeFlame(parent, x, y, z, s, outer, core = '#ffffff') {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  const o = new THREE.Mesh(new THREE.ConeGeometry(0.17 * s, 0.9 * s, 10, 1, true), glow(outer, { opacity: 0.85 })); o.rotation.x = -Math.PI / 2; o.position.z = -0.45 * s;
  const c = new THREE.Mesh(new THREE.ConeGeometry(0.09 * s, 0.55 * s, 8, 1, true), glow(core)); c.rotation.x = -Math.PI / 2; c.position.z = -0.27 * s;
  g.add(o, c); return g;
}
function makeDriver(parent, o) {
  const { y, z, suit, helmet, glove = '#1d1b24', headR = 0.42 } = o;
  const driver = new THREE.Group(); driver.position.set(0, y, z); parent.add(driver);
  const suitM = M(suit), gloveM = M(glove), helmM = M(helmet, { roughness: 0.35, metalness: 0.15 });
  mesh(new THREE.CapsuleGeometry(0.34, 0.36, 4, 10), suitM, driver, 0, 0.36, 0);
  const hands = o.hands;
  [-1, 1].forEach(k => { limb(driver, [k * 0.34, 0.62, 0.02], [k * hands[0], hands[1], hands[2]], 0.1, suitM); mesh(new THREE.SphereGeometry(0.11, 8, 6), gloveM, driver, k * hands[0], hands[1], hands[2]); });
  const head = new THREE.Group(); head.position.set(0, 0.9 + headR * 0.75, 0.02); driver.add(head);
  mesh(new THREE.SphereGeometry(headR, 16, 12), helmM, head);
  mesh(new THREE.SphereGeometry(headR * 1.03, 16, 8, Math.PI / 2 - 0.85, 1.7, Math.PI / 2 - 0.5, 0.62), M(o.visor, { roughness: 0.08, metalness: 1, side: THREE.DoubleSide, flatShading: false }), head);
  mesh(new THREE.SphereGeometry(headR * 1.01, 16, 12, Math.PI / 2 - 0.12, 0.24, 0, Math.PI * 0.42), M(o.stripe, { side: THREE.DoubleSide }), head);
  return { driver, head };
}
let ugTexShared = null;
export function buildAfterburner(p, withLight) {
  const group = new THREE.Group(), body = new THREE.Group(); group.add(body);
  const paint = M(p.body, { roughness: 0.25, metalness: 0.45 });
  const dark = M('#18141e', { roughness: 0.4, metalness: 0.5 });
  const neonA = glow(p.neon, { opacity: 1 }), neonB = glow(p.neon2, { opacity: 1 });
  const sh = new THREE.Shape();
  [[-1.75, 0.38], [1.7, 0.38], [1.92, 0.5], [1.0, 0.74], [0.15, 0.95], [-0.25, 1.02], [-1.45, 1.1], [-1.82, 0.92]].forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
  const hull = new THREE.ExtrudeGeometry(sh, { depth: 1.3, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2 });
  hull.rotateY(-Math.PI / 2); hull.translate(0.65, 0, 0);
  mesh(hull, paint, body);
  [-1, 1].forEach(k => {
    const pod = mesh(rbox(0.5, 0.36, 1.1, 0.14), paint, body, k * 1.0, 0.98, 1.08); pod.rotation.x = 0.12;
    mesh(new THREE.BoxGeometry(0.04, 0.06, 2.9), neonA, body, k * 0.8, 0.62, 0.05);
    mesh(new THREE.BoxGeometry(0.04, 0.035, 2.2), neonB, body, k * 0.8, 0.72, -0.1);
    mesh(new THREE.BoxGeometry(0.36, 0.05, 0.05), neonA, body, k * 1.0, 1.0, 1.66);
  });
  const cowl = mesh(new THREE.SphereGeometry(0.62, 14, 8, 0, TAU, 0, Math.PI / 2), dark, body, 0, 1.0, 0.45); cowl.scale.set(0.95, 0.35, 1.2);
  const finS = new THREE.Shape(); finS.moveTo(0, 0); finS.lineTo(-0.7, 0); finS.lineTo(-0.95, 0.85); finS.lineTo(-0.55, 0.85); finS.lineTo(0, 0);
  const finG = new THREE.ExtrudeGeometry(finS, { depth: 0.07, bevelEnabled: false }); finG.rotateY(-Math.PI / 2);
  const fins = [-1, 1].map(k => { const f = mesh(finG, paint, body, k * 0.62, 1.02, -0.95); f.rotation.z = k * 0.22; mesh(new THREE.BoxGeometry(0.075, 0.04, 0.5), neonA, f, 0.035, 0.82, -0.75); return f; });
  mesh(new THREE.BoxGeometry(1.5, 0.07, 0.42), dark, body, 0, 1.78, -1.75);
  const nozzleGlow = glow(p.neon2, { opacity: 0.9 });
  const nozzles = [-0.36, 0.36].map(x => {
    const n = mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.45, 14, 1, true), M('#5a5866', { metalness: 0.9, roughness: 0.25, side: THREE.DoubleSide }), body, x, 0.78, -1.88); n.rotation.x = Math.PI / 2;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.04, 6, 18), nozzleGlow); ring.position.set(x, 0.78, -2.1); body.add(ring);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), nozzleGlow); disc.position.set(x, 0.78, -1.86); disc.rotation.y = Math.PI; body.add(disc);
    return n;
  });
  if (!ugTexShared) ugTexShared = canvasTex(128, 128, (x) => { const g = x.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); });
  const ugMat = new THREE.MeshBasicMaterial({ map: ugTexShared, color: p.neon, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
  const ug = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 6), ugMat); ug.rotation.x = -Math.PI / 2; ug.position.y = 0.03; group.add(ug);
  let ugLight = null;
  if (withLight) { ugLight = new THREE.PointLight(p.neon, 3, 6, 2); ugLight.position.set(0, 0.2, 0); group.add(ugLight); }
  const d = makeDriver(body, { y: 0.6, z: -0.42, suit: p.suit, helmet: p.helmet, visor: p.visor, stripe: p.neon, hands: [0.22, 0.68, 0.55] });
  const wheelSpec = [[1.0, 0.44, 1.1, 0.44, 0.42], [-1.0, 0.44, 1.1, 0.44, 0.42], [1.05, 0.52, -1.05, 0.52, 0.52], [-1.05, 0.52, -1.05, 0.52, 0.52]];
  const tyre = M('#16131a', { roughness: 0.85 }), hub = M('#d0d0dc', { metalness: 1, roughness: 0.2 });
  const pods = wheelSpec.map(([x, y, z, r, w]) => makePod(body, { x: x * 1.12, y: 0.3, z, r, w, tyre, rim: dark, hub, glowRing: p.neon }));
  const flames = nozzles.map(n => makeFlame(body, n.position.x, 0.78, -2.1, 1.25, p.neon2));
  return {
    group, body, ...d, flames,
    tick(st) {
      const pulse = 0.55 + 0.25 * Math.sin(st.t * 6) + st.boost * 0.5;
      nozzleGlow.opacity = clamp01(pulse);
      ugMat.opacity = 0.5 + 0.2 * Math.sin(st.t * 3) + st.boost * 0.3;
      if (ugLight) ugLight.intensity = 2.4 + Math.sin(st.t * 3) * 0.6 + st.boost * 4;
      pods.forEach((pd, i) => { pd.spin.rotation.x += st.dt * (4 + st.speed * 0.15) * (i % 2 ? 1 : -1); pd.pad.material.opacity = 0.35 + 0.15 * Math.sin(st.t * 14 + i); });
      fins.forEach((f, i) => (f.rotation.x = Math.sin(st.t * 18 + i) * 0.02 * clamp01(st.speed / 100) - st.boost * 0.06));
      flames.forEach(fl => { const k = 0.4 + st.thrust * 0.6 + st.boost * 1.8; fl.scale.set(1 + st.boost * 0.4, 1 + st.boost * 0.4, k * (0.8 + Math.random() * 0.4)); });
    },
  };
}

export const PAINTS = [
  { name: 'YOU', body: '#5a2f78', neon: '#ff5ad1', neon2: '#ff9a2e', suit: '#2a1838', helmet: '#fff1d8', visor: '#ff9a5c' },
  { name: 'NOVA', body: '#f4ece6', neon: '#2fd3e0', neon2: '#4f7bff', suit: '#2a3550', helmet: '#2fd3e0', visor: '#4f7bff' },
  { name: 'EMBER', body: '#1d1b24', neon: '#ff9a2e', neon2: '#ffd166', suit: '#3a2a2a', helmet: '#ff6b4a', visor: '#ffd166' },
  { name: 'VOLT', body: '#2a2a10', neon: '#ffe14d', neon2: '#ff2fa6', suit: '#1d1b24', helmet: '#ffe14d', visor: '#ff2fa6' },
  { name: 'HEX', body: '#0f2a3a', neon: '#33f0ff', neon2: '#8a5cff', suit: '#122033', helmet: '#e9fdff', visor: '#33f0ff' },
  { name: 'LUMEN', body: '#13261c', neon: '#5dff9a', neon2: '#33f0ff', suit: '#10201a', helmet: '#5dff9a', visor: '#33f0ff' },
];
