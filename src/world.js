import * as THREE from 'three';
import { TAU, rand } from './util.js';
import { scene, canvasTex } from './renderer.js';
import { N, P } from './track.js';

// The synthwave city around the track: sky, sun, mountains, ground grid and lit buildings.
export function buildWorld() {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), new THREE.ShaderMaterial({
    uniforms: { top: { value: new THREE.Color('#04010c') }, hor: { value: new THREE.Color('#5a0f7e') }, glow: { value: new THREE.Color('#ff3fae') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 hor; uniform vec3 glow; varying vec3 vP; void main(){ float h = vP.y; vec3 c = mix(hor, top, pow(clamp(h * 1.6, 0.0, 1.0), 0.6)); c = mix(c, glow, smoothstep(0.12, 0.0, abs(h)) * 0.55); gl_FragColor = vec4(c, 1.0); }',
    side: THREE.BackSide, depthWrite: false, fog: false,
  }));
  const follow = new THREE.Group(); follow.add(sky); scene.add(follow);
  // stars
  const sg = new THREE.BufferGeometry(), sp = [];
  for (let i = 0; i < 900; i++) { const a = rand() * TAU, e = 0.08 + rand() * 1.3; sp.push(Math.cos(a) * Math.cos(e) * 2800, Math.sin(e) * 2800, Math.sin(a) * Math.cos(e) * 2800); }
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  follow.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#e9d6ff', size: 3, sizeAttenuation: false, fog: false })));
  // striped synthwave sun
  const sunTex = canvasTex(512, 512, (x, w, h) => {
    const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffe14d'); gr.addColorStop(0.55, '#ff7a45'); gr.addColorStop(1, '#ff2fa6');
    x.fillStyle = gr; x.beginPath(); x.arc(w / 2, h / 2, w / 2 - 4, 0, TAU); x.fill();
    x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 9; i++) x.fillRect(0, h * 0.5 + i * 26, w, 3 + i * 2.4);
  });
  const sun = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshBasicMaterial({ map: sunTex, transparent: true, fog: false, depthWrite: false }));
  sun.position.set(0, 260, -2600); follow.add(sun);
  // wireframe mountains on the horizon
  const mtn = new THREE.MeshBasicMaterial({ color: '#ff2fa6', wireframe: true, transparent: true, opacity: 0.45, fog: false });
  for (let i = 0; i < 18; i++) { const a = i / 18 * TAU, r = 2200, h = 180 + rand() * 260; const m = new THREE.Mesh(new THREE.ConeGeometry(260 + rand() * 160, h, 5, 3), mtn); m.position.set(Math.cos(a) * r, h / 2 - 10, Math.sin(a) * r); follow.add(m); }
  // ground and grid
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), new THREE.MeshStandardMaterial({ color: '#07020f', roughness: 0.4, metalness: 0.6 }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const grid = new THREE.GridHelper(5000, 125, 0xff2fa6, 0x5a1a8a); grid.position.set(120, 0.05, 40);
  grid.material.transparent = true; grid.material.opacity = 0.5; scene.add(grid);
  // city blocks
  const winTex = () => canvasTex(64, 128, (x, w, h) => {
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
    const cols = ['#33f0ff', '#ff4fc8', '#ffe14d', '#8a5cff'];
    for (let yy = 4; yy < h; yy += 8) for (let xx = 4; xx < w; xx += 8) if (rand() < 0.36) { x.fillStyle = cols[Math.floor(rand() * 4)]; x.globalAlpha = 0.35 + rand() * 0.6; x.fillRect(xx, yy, 4, 4); }
    x.globalAlpha = 1;
  }, true);
  const mats = [0, 1, 2].map(() => new THREE.MeshStandardMaterial({ color: '#0b0716', emissive: '#ffffff', emissiveMap: winTex(), emissiveIntensity: 0.55, roughness: 0.6 }));
  const capA = new THREE.MeshBasicMaterial({ color: '#ff2fa6' }), capB = new THREE.MeshBasicMaterial({ color: '#33f0ff' });
  const near = (x, z, d) => { for (let i = 0; i < N; i += 5) { const dx = P[i].x - x, dz = P[i].z - z; if (dx * dx + dz * dz < d * d) return true; } return false; };
  let placed = 0, tries = 0;
  while (placed < 190 && tries < 6000) {
    tries++;
    const x = -900 + rand() * 1900, z = -1100 + rand() * 2000;
    const w = 18 + rand() * 30, d = 18 + rand() * 30, h = 25 + Math.pow(rand(), 1.6) * 190;
    if (near(x, z, Math.max(w, d) * 0.75 + 26)) continue;
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(1, Math.round(w / 10)), uv.getY(i) * Math.max(1, Math.round(h / 18)));
    const m = new THREE.Mesh(g, mats[placed % 3]);
    m.position.set(x, h / 2, z); m.rotation.y = rand() * Math.PI; scene.add(m);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.8, d + 0.8), rand() < 0.5 ? capA : capB);
    cap.position.y = h / 2; m.add(cap);
    placed++;
  }
  scene.add(new THREE.HemisphereLight('#8a6cff', '#12021f', 0.9));
  const key = new THREE.DirectionalLight('#ff8ad9', 1.2); key.position.set(-200, 300, -600); scene.add(key);
  return follow;
}
