import * as THREE from 'three';
import { clamp } from './util.js';
import { HALF } from './config.js';
import { scene, canvasTex } from './renderer.js';

export const CTRL = [[20,10,-80],[0,12,200],[30,18,420],[170,32,540],[330,42,500],[420,30,370],[390,12,230],[270,6,170],[200,16,40],[250,24,-80],[380,28,-150],[440,20,-320],[340,12,-450],[150,26,-460],[0,36,-420],[-140,24,-340],[-190,14,-220],[-120,10,-160]];
export const curve = new THREE.CatmullRomCurve3(CTRL.map(p => new THREE.Vector3(...p)), true, 'centripetal');
export const L = curve.getLength();
export const N = Math.round(L / 2);
export const STEP = L / N;
export const P = [], T = [], U = [], R = [], K = [];
for (let i = 0; i < N; i++) { P.push(curve.getPointAt(i / N)); T.push(curve.getTangentAt(i / N).normalize()); }
const WUP = new THREE.Vector3(0, 1, 0);
const R0 = [], U0 = [];
for (let i = 0; i < N; i++) {
  const r = new THREE.Vector3().crossVectors(T[i], WUP).normalize();
  R0.push(r); U0.push(new THREE.Vector3().crossVectors(r, T[i]).normalize());
}
for (let i = 0; i < N; i++) {
  const a = T[(i - 1 + N) % N], b = T[(i + 1) % N];
  const d = new THREE.Vector3(b.x - a.x, 0, b.z - a.z).multiplyScalar(1 / (2 * STEP));
  K.push(d.dot(R0[i]));
}
// banking: lean into turns, smoothed along the track
const bankRaw = K.map(k => clamp(k * 24, -0.42, 0.42));
export const BANK = bankRaw.map((_, i) => { let s = 0; for (let j = -18; j <= 18; j++) s += bankRaw[(i + j + N) % N]; return s / 37; });
for (let i = 0; i < N; i++) {
  const b = BANK[i];
  const u = U0[i].clone().multiplyScalar(Math.cos(b)).addScaledVector(R0[i], Math.sin(b)).normalize();
  U.push(u); R.push(new THREE.Vector3().crossVectors(T[i], u).normalize());
}
export const KS = K.map((_, i) => { let s = 0; for (let j = -4; j <= 4; j++) s += K[(i + j + N) % N]; return s / 9; });

export const fr = () => ({ p: new THREE.Vector3(), t: new THREE.Vector3(), u: new THREE.Vector3(), r: new THREE.Vector3(), k: 0 });
export const wrapS = s => ((s % L) + L) % L;
export function frame(s, out) {
  const f = wrapS(s) / STEP, i0 = Math.floor(f), a = f - i0, i = i0 % N, j = (i + 1) % N;
  out.p.lerpVectors(P[i], P[j], a);
  out.t.lerpVectors(T[i], T[j], a).normalize();
  out.u.lerpVectors(U[i], U[j], a).normalize();
  out.r.lerpVectors(R[i], R[j], a).normalize();
  out.k = KS[i] * (1 - a) + KS[j] * a;
  return out;
}
export const kAt = s => { const f = wrapS(s) / STEP, i = Math.floor(f) % N; return KS[i]; };

// a strip of surface following the track, between lateral/height offsets
export function band(s0, s1, a, b, vLen, mat) {
  const i0 = Math.round(s0 / STEP), i1 = Math.round(s1 / STEP);
  const pos = [], uv = [], idx = [];
  const v = new THREE.Vector3();
  for (let i = i0, n = 0; i <= i1; i++, n++) {
    const k = ((i % N) + N) % N;
    const [ax, ah] = a(k), [bx, bh] = b(k);
    v.copy(P[k]).addScaledVector(R[k], ax).addScaledVector(U[k], ah); pos.push(v.x, v.y, v.z);
    v.copy(P[k]).addScaledVector(R[k], bx).addScaledVector(U[k], bh); pos.push(v.x, v.y, v.z);
    const d = (i - i0) * STEP / vLen;
    uv.push(0, d, 1, d);
    if (i < i1) { const q = 2 * n; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  scene.add(m);
  return m;
}

export const PIT = [L - 260, L - 40];           // pit lane on the main straight, left side
export const PIT_X = [-HALF + 0.6, -5];
export const PADS = [
  { s: 330, x: 4 }, { s: 345, x: -6 }, { s: 1090, x: 0 }, { s: 1480, x: -5 }, { s: 1495, x: 5 },
  { s: 1980, x: 2 }, { s: 2420, x: -4 }, { s: 2700, x: 6 },
];
export const PAD_LEN = 14, PAD_W = 7;

export function buildTrack() {
  const roadTex = canvasTex(256, 512, (x, w, h) => {
    x.fillStyle = '#120a20'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 1600; i++) { x.fillStyle = `rgba(160,120,255,${Math.random() * 0.05})`; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    x.strokeStyle = 'rgba(51,240,255,.10)'; x.lineWidth = 2;
    for (let y = 0; y < h; y += 64) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); }
    for (let xx = 0; xx <= w; xx += 64) { x.beginPath(); x.moveTo(xx, 0); x.lineTo(xx, h); x.stroke(); }
    x.fillStyle = 'rgba(51,240,255,.85)'; x.fillRect(w / 2 - 3, 0, 6, h * 0.45);
    x.fillStyle = 'rgba(255,47,166,.35)'; x.fillRect(w / 4 - 1, 0, 2, h * 0.25); x.fillRect(3 * w / 4 - 1, 0, 2, h * 0.25);
  }, true);
  band(0, L, () => [-HALF, 0], () => [HALF, 0], 24, new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.35, metalness: 0.5, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: roadTex, emissiveIntensity: 0.35 }));
  // deck underside and sides
  const deck = new THREE.MeshStandardMaterial({ color: '#0d0818', roughness: 0.7, metalness: 0.3, side: THREE.DoubleSide });
  band(0, L, () => [-HALF - 0.4, -1.4], () => [HALF + 0.4, -1.4], 24, deck);
  band(0, L, () => [HALF + 0.4, -1.4], () => [HALF + 0.4, 0], 24, deck);
  band(0, L, () => [-HALF - 0.4, 0], () => [-HALF - 0.4, -1.4], 24, deck);
  // glowing rails: magenta left, cyan right, plus a faint energy wall above each
  const railA = new THREE.MeshBasicMaterial({ color: '#ff2fa6', side: THREE.DoubleSide });
  const railB = new THREE.MeshBasicMaterial({ color: '#33f0ff', side: THREE.DoubleSide });
  band(0, L, () => [-HALF, 0.05], () => [-HALF, 0.75], 4, railA);
  band(0, L, () => [HALF, 0.75], () => [HALF, 0.05], 4, railB);
  band(0, L, () => [-HALF - 0.4, -0.05], () => [-HALF - 0.4, -0.5], 4, railA);
  band(0, L, () => [HALF + 0.4, -0.5], () => [HALF + 0.4, -0.05], 4, railB);
  const wallTex = canvasTex(8, 128, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.55)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) { x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(0, y, w, 1); }
  });
  const wallMat = c => new THREE.MeshBasicMaterial({ color: c, map: wallTex, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  band(0, L, () => [-HALF, 0.75], () => [-HALF, 2.8], 8, wallMat('#ff2fa6'));
  band(0, L, () => [HALF, 2.8], () => [HALF, 0.75], 8, wallMat('#33f0ff'));

  // pit lane (energy refill)
  const pitTex = canvasTex(64, 128, (x, w, h) => {
    x.fillStyle = 'rgba(255,47,166,.35)'; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(255,170,220,.9)';
    for (let y = 0; y < h; y += 32) { x.fillRect(0, y, w, 6); }
    x.fillRect(0, 0, 4, h); x.fillRect(w - 4, 0, 4, h);
  }, true);
  band(PIT[0], PIT[1], () => [PIT_X[0], 0.03], () => [PIT_X[1], 0.03], 6, new THREE.MeshBasicMaterial({ map: pitTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));

  // boost pads
  const padTex = canvasTex(128, 128, (x, w, h) => {
    x.fillStyle = 'rgba(255,225,77,.18)'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#ffe14d'; x.lineWidth = 14; x.lineJoin = 'miter';
    x.beginPath(); x.moveTo(14, 90); x.lineTo(w / 2, 36); x.lineTo(w - 14, 90); x.stroke();
    x.strokeStyle = '#fff7c0'; x.lineWidth = 3; x.strokeRect(2, 2, w - 4, h - 4);
  }, true);
  const padMat = new THREE.MeshBasicMaterial({ map: padTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  PADS.forEach(p => band(p.s, p.s + PAD_LEN, () => [p.x - PAD_W / 2, 0.05], () => [p.x + PAD_W / 2, 0.05], PAD_LEN / 3, padMat));

  // light arches
  const arches = [];
  const basis = new THREE.Matrix4();
  for (let s = 40, i = 0; s < L - 30; s += 72, i++) {
    const f = frame(s, fr());
    const g = new THREE.Group();
    basis.makeBasis(f.r.clone().negate(), f.u, f.t); g.quaternion.setFromRotationMatrix(basis); g.position.copy(f.p);
    const col = new THREE.Color(i % 2 ? '#33f0ff' : '#ff2fa6');
    const mat = new THREE.MeshBasicMaterial({ color: col.clone() });
    [HALF + 1, -HALF - 1].forEach(x => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 11, 0.5), mat); m.position.set(x, 5.5, 0); g.add(m); });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(2 * HALF + 2.5, 0.5, 0.5), mat); bar.position.y = 11; g.add(bar);
    scene.add(g);
    arches.push({ mat, col, s });
  }
  // start gate
  const f0 = frame(0, fr());
  const gate = new THREE.Group();
  basis.makeBasis(f0.r.clone().negate(), f0.u, f0.t); gate.quaternion.setFromRotationMatrix(basis); gate.position.copy(f0.p);
  scene.add(gate);
  const banner = canvasTex(1024, 128, (x, w, h) => {
    x.fillStyle = '#0b0418'; x.fillRect(0, 0, w, h);
    x.font = '84px Audiowide, "Arial Black", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.shadowColor = '#ff2fa6'; x.shadowBlur = 24; x.fillStyle = '#ff7ad9'; x.fillText('AFTERBURNER', w / 2, h / 2 + 6);
  });
  const postMat = new THREE.MeshBasicMaterial({ color: '#33f0ff' });
  [HALF + 2.5, -HALF - 2.5].forEach(x => { const m = new THREE.Mesh(new THREE.BoxGeometry(1.2, 14, 1.2), postMat); m.position.set(x, 7, 0); gate.add(m); });
  const bmat = new THREE.MeshBasicMaterial({ map: banner });
  const ban = new THREE.Mesh(new THREE.BoxGeometry(2 * HALF + 6, 3.6, 0.8), [postMat, postMat, postMat, postMat, bmat, bmat]);
  ban.position.y = 13.5; gate.add(ban);
  const checker = canvasTex(256, 32, (x, w, h) => { for (let i = 0; i < w / 16; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? '#0b0418' : '#e9fdff'; x.fillRect(i * 16, j * 16, 16, 16); } });
  band(-1.5, 1.5, () => [-HALF, 0.04], () => [HALF, 0.04], 3, new THREE.MeshBasicMaterial({ map: checker, side: THREE.DoubleSide }));

  // support pylons
  const pyl = new THREE.MeshStandardMaterial({ color: '#150c26', roughness: 0.6, metalness: 0.4 });
  const pylGlow = new THREE.MeshBasicMaterial({ color: '#8a5cff' });
  for (let s = 0; s < L; s += 46) {
    const f = frame(s, fr());
    const h = f.p.y - 1.4;
    if (h < 2) continue;
    const m = new THREE.Mesh(new THREE.BoxGeometry(3, h, 3), pyl);
    m.position.set(f.p.x, h / 2, f.p.z); m.rotation.y = Math.atan2(f.t.x, f.t.z); scene.add(m);
    const st = new THREE.Mesh(new THREE.BoxGeometry(3.1, h, 0.25), pylGlow); m.add(st); st.position.z = 1.5;
  }
  return arches;
}
