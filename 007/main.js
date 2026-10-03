// 007 — Quantum Bloom
// Romanesco + Fibonacci flower + Sierpinski tetrahedron + Koch snowflakes + Barnsley ferns,
// all coloured by one shared "quantum" shader: a superposition of standing-wave eigenstates whose
// probability density selects hydrogen (Balmer) emission wavelengths.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const params = new URLSearchParams(location.search);
const LOW = params.get('q') === 'low';

// ---------- utils ----------
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const GA = Math.PI * (3 - Math.sqrt(5)); // golden angle
const UP = new THREE.Vector3(0, 1, 0);

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02030a);
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 400);
camera.position.set(0, 10, 20);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2.0, 0);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.45;
controls.minDistance = 5;
controls.maxDistance = 45;

// ---------- quantum shader chunk ----------
const QUANTUM = /* glsl */`
const float PI = 3.14159265;
vec3 wl2rgb(float w){
  w = clamp(w, 380., 750.);
  vec3 c;
  if(w < 440.)      c = vec3((440.-w)/60., 0., 1.);
  else if(w < 490.) c = vec3(0., (w-440.)/50., 1.);
  else if(w < 510.) c = vec3(0., 1., (510.-w)/20.);
  else if(w < 580.) c = vec3((w-510.)/70., 1., 0.);
  else if(w < 645.) c = vec3(1., (645.-w)/65., 0.);
  else              c = vec3(1., 0., 0.);
  float f = w < 420. ? .35 + .65*(w-380.)/40. : (w > 700. ? .35 + .65*(750.-w)/50. : 1.);
  return c * f;
}
// hydrogen Balmer lines, nm (H-alpha, H-beta, H-gamma, H-delta)
const float BALMER[4] = float[4](656.3, 486.1, 434.0, 410.2);

uniform float uTime;
uniform float uN;   // phase offset ("principal quantum number") per object family
uniform float uK;   // spatial frequency of the wavefunction

// superposition of 4 eigenstates with energies E_k ~ k^2; returns colour, writes density
vec3 quantum(vec3 p, float t, float n, out float dens){
  p *= uK;
  float r  = length(p);
  float th = atan(length(p.xz), p.y);
  float ph = atan(p.z, p.x);
  float re = 0., im = 0.;
  for(int i = 1; i <= 4; i++){
    float k = float(i);
    float a = sin(k*r*1.35 + n) * cos((k-1.)*ph + k*th*.55 + n*.7);
    float E = .22 * k * k;
    re += a / k * cos(E*t);
    im -= a / k * sin(E*t);
  }
  dens = clamp((re*re + im*im) / 2.6, 0., 1.);
  float x = dens * 2.999;
  int i0 = int(x);
  float f = smoothstep(.3, .7, fract(x));
  float lam = mix(BALMER[i0], BALMER[min(i0+1,3)], f);
  lam += 38. * sin(atan(im, re) + t*.3);          // phase of the wavefunction tints the hue
  return wl2rgb(lam) * (.28 + 1.25 * sqrt(dens));
}
`;

const uniforms = { uTime: { value: 0 } };
function U(extra = {}) { // each material shares uTime but owns its N / K
  const o = { uTime: uniforms.uTime, uN: { value: 0 }, uK: { value: 0.5 } };
  for (const k in extra) o[k] = { value: extra[k] };
  return o;
}

// ---------- materials ----------
function meshMaterial({ n = 0, k = 0.5, alpha = 1, glass = false, hScale = 0, side = THREE.FrontSide, rim = 1.0 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: U({ uAlpha: alpha, uHS: hScale, uRim: rim }),
    transparent: glass, depthWrite: !glass, side,
    blending: glass ? THREE.AdditiveBlending : THREE.NormalBlending,
    vertexShader: /* glsl */`
      varying vec3 vP; varying vec3 vN; varying float vH;
      uniform float uHS;
      void main(){
        vec4 lp = vec4(position, 1.);
        vec3 ln = normal;
        #ifdef USE_INSTANCING
          lp = instanceMatrix * lp; ln = mat3(instanceMatrix) * ln;
        #endif
        vec4 wp = modelMatrix * lp;
        vP = wp.xyz;
        vN = normalize(mat3(modelMatrix) * ln);
        vH = uHS > 0. ? clamp(position.y * uHS, 0., 1.) : 1.;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vP; varying vec3 vN; varying float vH;
      uniform float uAlpha; uniform float uRim;
      ${QUANTUM}
      void main(){
        float d, d2;
        vec3 q  = quantum(vP + vec3(0., vH*1.4, 0.), uTime, uN, d);
        vec3 q2 = quantum(vP.zyx*1.3 + 4., uTime*.8, uN+2., d2);
        vec3 N = normalize(vN);
        if(!gl_FrontFacing) N = -N;
        vec3 V = normalize(cameraPosition - vP);
        float fr = pow(1. - abs(dot(N, V)), 2.4);
        float df = .42 + .58 * max(dot(N, normalize(vec3(.4,.8,.5))), 0.);
        vec3 col = q * df * mix(.38, 1., vH) + q2 * fr * uRim * 1.4;
        #ifdef GLASS
          gl_FragColor = vec4(col, uAlpha * (.05 + fr));
        #else
          gl_FragColor = vec4(col, uAlpha);
        #endif
      }`,
    defines: glass ? { GLASS: 1 } : {},
  });
}

function setQ(mat, n, k) { mat.uniforms.uN.value = n; mat.uniforms.uK.value = k; return mat; }
function mesh(opts) { return setQ(meshMaterial(opts) , opts.n ?? 0, opts.k ?? 0.5); }

const pointVS = /* glsl */`
  attribute float aSize; attribute float aRnd;
  varying vec3 vP; varying float vRnd;
  uniform float uPR;
  void main(){
    vec4 wp = modelMatrix * vec4(position, 1.);
    vP = wp.xyz; vRnd = aRnd;
    vec4 mv = viewMatrix * wp;
    gl_PointSize = aSize * uPR * (32. / -mv.z);
    gl_Position = projectionMatrix * mv;
  }`;
const pointFS = /* glsl */`
  varying vec3 vP; varying float vRnd;
  uniform float uBright;
  ${QUANTUM}
  void main(){
    float r = length(gl_PointCoord - .5) * 2.;
    if(r > 1.) discard;
    float a = pow(1. - r, 2.);
    float d;
    vec3 q = quantum(vP + vec3(vRnd*1.5), uTime, uN, d);
    gl_FragColor = vec4(q * a * uBright, a);
  }`;
function pointMaterial({ n = 0, k = 0.5, bright = 1 } = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: U({ uPR: renderer.getPixelRatio(), uBright: bright }),
    vertexShader: pointVS, fragmentShader: pointFS,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  return setQ(m, n, k);
}
function lineMaterial({ n = 0, k = 0.5, bright = 1 } = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: U({ uBright: bright }),
    vertexShader: `varying vec3 vP; void main(){ vec4 wp = modelMatrix*vec4(position,1.); vP = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `varying vec3 vP; uniform float uBright; ${QUANTUM}
      void main(){ float d; vec3 q = quantum(vP, uTime, uN, d); gl_FragColor = vec4(q * uBright, 1.); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  return setQ(m, n, k);
}

// ============================================================
// 1. ROMANESCO — self-similar spiral cones (3 levels)
// ============================================================
const FH = 1.5; // floret height (base radius = 1)
function floretGeometry(radial, rows) {
  const pts = [];
  for (let i = 0; i <= rows; i++) {
    const v = i / rows;
    // slightly bulging, smooth spire
    const r = Math.pow(1 - v, 0.85) * (1 + 0.12 * Math.sin(Math.PI * v));
    pts.push(new THREE.Vector2(Math.max(r, 0.0005), v * FH));
  }
  const g = new THREE.LatheGeometry(pts, radial);
  g.computeVertexNormals();
  return g;
}

function children(parents, N, kS, rand) {
  const out = [];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion();
  const pos = new THREE.Vector3(), nrm = new THREE.Vector3(), sc = new THREE.Vector3();
  const slant = Math.hypot(1, FH);
  const area = Math.PI * slant; // lateral area of unit cone
  for (const P of parents) {
    const spin = rand() * Math.PI * 2;
    for (let i = 0; i < N; i++) {
      const t = (i + 0.5) / N, s = Math.sqrt(t), az = i * GA + spin;
      const c = Math.cos(az), sn = Math.sin(az);
      nrm.set(FH * c, 1, FH * sn).normalize();
      pos.set(c * s * 0.97, FH * (1 - s), sn * s * 0.97).addScaledVector(nrm, -0.04);
      q.setFromUnitVectors(UP, nrm);
      const size = kS * Math.sqrt(area / N) * (0.78 + 0.42 * s);
      sc.setScalar(size);
      m.compose(pos, q, sc).premultiply(P);
      out.push(m.clone());
    }
  }
  return out;
}

const romanesco = new THREE.Group();
{
  const mat1 = mesh({ n: 0.0, k: 0.55, hScale: 1 / FH });
  const mat2 = mesh({ n: 1.3, k: 0.55, hScale: 1 / FH });
  const mat3 = mesh({ n: 2.6, k: 0.55, hScale: 1 / FH });
  const rand = rng(7);
  const root = new THREE.Matrix4().compose(new THREE.Vector3(0, 0.25, 0), new THREE.Quaternion(), new THREE.Vector3(1.9, 1.9, 1.9));
  const L1 = children([root], LOW ? 110 : 170, 1.12, rand);
  const L2 = children(L1, LOW ? 22 : 38, 1.1, rand);
  const L3 = children(L2, LOW ? 5 : 9, 1.1, rand);
  const mk = (geo, mats, list) => {
    const im = new THREE.InstancedMesh(geo, mats, list.length);
    list.forEach((mx, i) => im.setMatrixAt(i, mx));
    im.frustumCulled = false;
    romanesco.add(im);
  };
  mk(floretGeometry(28, 12), mat1, L1);
  mk(floretGeometry(14, 6), mat2, L2);
  mk(floretGeometry(8, 3), mat3, L3);
  // the apex-most floret of level 1 is the one at i=0 (centre); nothing extra needed
}
scene.add(romanesco);

// ============================================================
// 2. FLOWER — Fibonacci petal rings (8 / 13 / 21)
// ============================================================
function petalGeometry(L, W) {
  const U_ = 28, V_ = 14, pos = [], idx = [];
  for (let i = 0; i <= U_; i++) {
    const u = i / U_;
    const w = W * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.75)), 0.85);
    for (let j = 0; j <= V_; j++) {
      const v = (j / V_) * 2 - 1, z = v * w;
      const x = -0.9 * z * z + 0.35 * L * Math.pow(u, 2.6) - 0.12 * L * u; // cup + tip recurve
      pos.push(x, L * u, z);
    }
  }
  for (let i = 0; i < U_; i++) for (let j = 0; j < V_; j++) {
    const a = i * (V_ + 1) + j, b = a + V_ + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
const flower = new THREE.Group();
const petalRings = [
  { n: 8,  rho: 1.7, tilt: 0.38, L: 2.9, W: 0.95 },
  { n: 13, rho: 1.9, tilt: 0.78, L: 3.5, W: 0.95 },
  { n: 21, rho: 2.1, tilt: 1.2, L: 3.9, W: 0.8 },
].map((r, i) => {
  const im = new THREE.InstancedMesh(petalGeometry(r.L, r.W), mesh({ n: 3 + i * 1.7, k: 0.42, side: THREE.DoubleSide, rim: 0.45 }), r.n);
  im.frustumCulled = false;
  flower.add(im);
  return { ...r, im, off: i * GA * 0.5 };
});
scene.add(flower);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
function updatePetals(t) {
  for (const r of petalRings) {
    for (let i = 0; i < r.n; i++) {
      const az = (i / r.n) * Math.PI * 2 + r.off;
      const breathe = 0.07 * Math.sin(t * 0.55 + i * 0.7 + r.rho * 3);
      const tilt = r.tilt + breathe;
      _e.set(0, az, -tilt, 'YZX');       // tilt about Z, then spin about Y
      _q.setFromEuler(_e);
      _p.set(Math.cos(az) * r.rho, 0.1, -Math.sin(az) * r.rho);
      const s = 1 + 0.03 * Math.sin(t * 0.8 + i);
      _s.set(s, s, s);
      _m.compose(_p, _q, _s);
      r.im.setMatrixAt(i, _m);
    }
    r.im.instanceMatrix.needsUpdate = true;
  }
}

// ============================================================
// 3. BARNSLEY FERNS — 7 drooping fronds as leaves
// ============================================================
const ferns = new THREE.Group();
{
  const rand = rng(21);
  const PER = LOW ? 14000 : 46000, FR = 7;
  const posArr = new Float32Array(PER * FR * 3), sz = new Float32Array(PER * FR), rn = new Float32Array(PER * FR);
  let o = 0;
  for (let f = 0; f < FR; f++) {
    const phi = f * GA * 2.0 + 0.3;
    const L = 4.4 + rand() * 1.8;
    const a0 = 1.5 + rand() * 0.6;     // angle from vertical (rad) – spreads out and downward
    const kap = 0.03 + rand() * 0.04;    // droop
    const twist = (rand() - 0.5) * 0.9;
    let x = 0, y = 0;
    for (let i = -20; i < PER; i++) {
      const r = rand();
      let nx, ny;
      if (r < 0.01)       { nx = 0;                        ny = 0.16 * y; }
      else if (r < 0.86)  { nx = 0.85*x + 0.04*y;          ny = -0.04*x + 0.85*y + 1.6; }
      else if (r < 0.93)  { nx = 0.2*x - 0.26*y;           ny = 0.23*x + 0.22*y + 1.6; }
      else                { nx = -0.15*x + 0.28*y;         ny = 0.26*x + 0.24*y + 0.44; }
      x = nx; y = ny;
      if (i < 0) continue;
      const s = y / 10, lat = x / 10;           // s: 0..1 along frond, lat: ~±0.27
      const th = a0 + kap * s * L;              // direction angle from vertical
      const arcR = (Math.cos(a0) - Math.cos(th)) / kap, arcY = (Math.sin(th) - Math.sin(a0)) / kap;
      const rr = arcR + lat * L * 0.55 * Math.cos(th) + 0;
      const yy = arcY - lat * L * 0.55 * Math.sin(th);
      const tw = lat * L * 0.55 * Math.sin(twist * s);      // out-of-plane twist
      const px = Math.cos(phi) * rr - Math.sin(phi) * tw;
      const pz = Math.sin(phi) * rr + Math.cos(phi) * tw;
      posArr[o * 3] = px; posArr[o * 3 + 1] = yy * 1.0 + 0.1; posArr[o * 3 + 2] = pz;
      sz[o] = 0.9 + rand() * 1.4; rn[o] = rand() + f * 0.31;
      o++;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
  g.setAttribute('aRnd', new THREE.BufferAttribute(rn, 1));
  const pts = new THREE.Points(g, pointMaterial({ n: 5, k: 0.36, bright: 0.85 }));
  pts.frustumCulled = false;
  ferns.add(pts);
}
scene.add(ferns);

// ============================================================
// 4. SIERPINSKI TETRAHEDRON — glass faces + glowing edges
// ============================================================
const gasket = new THREE.Group();
{
  const depth = 5;
  const V = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(a => new THREE.Vector3(...a).normalize());
  let cells = [{ c: new THREE.Vector3(), s: 1 }];
  for (let d = 0; d < depth; d++) {
    const nx = [];
    for (const { c, s } of cells) for (const v of V) nx.push({ c: c.clone().addScaledVector(v, s / 2), s: s / 2 });
    cells = nx;
  }
  // faces
  const geo = new THREE.TetrahedronGeometry(1, 0);
  const im = new THREE.InstancedMesh(geo, mesh({ n: 6.2, k: 0.28, glass: true, side: THREE.FrontSide, alpha: 0.18 }), cells.length);
  cells.forEach(({ c, s }, i) => { _m.compose(c, new THREE.Quaternion(), _s.set(s, s, s)); im.setMatrixAt(i, _m); });
  im.frustumCulled = false;
  gasket.add(im);
  // edges
  const E = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];
  const lp = [];
  for (const { c, s } of cells) for (const [a, b] of E) {
    lp.push(c.x + V[a].x * s, c.y + V[a].y * s, c.z + V[a].z * s, c.x + V[b].x * s, c.y + V[b].y * s, c.z + V[b].z * s);
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  const lines = new THREE.LineSegments(lg, lineMaterial({ n: 6.2, k: 0.28, bright: 0.22 }));
  lines.frustumCulled = false;
  gasket.add(lines);
  gasket.scale.setScalar(8.6);
  gasket.position.set(0, 1.5, 0);
}
scene.add(gasket);

// ============================================================
// 5. KOCH SNOWFLAKES
// ============================================================
function kochPositions(R, depth, y) {
  let pts = [];
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + (i * 2 * Math.PI) / 3;
    pts.push([R * Math.cos(a), R * Math.sin(a)]);
  }
  pts.push(pts[0]);
  for (let d = 0; d < depth; d++) {
    const nx = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const dx = (bx - ax) / 3, dy = (by - ay) / 3;
      const p1 = [ax + dx, ay + dy], p3 = [ax + 2 * dx, ay + 2 * dy];
      const h = Math.sqrt(3) / 2; // peak, rotated -60deg (outward for CCW orientation)
      const p2 = [p1[0] + dx * 0.5 + dy * h, p1[1] + dy * 0.5 - dx * h];
      nx.push([ax, ay], p1, p2, p3);
    }
    nx.push(pts[pts.length - 1]);
    pts = nx;
  }
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) out.push(pts[i][0], y, pts[i][1], pts[i + 1][0], y, pts[i + 1][1]);
  return out;
}
const kochMat = lineMaterial({ n: 8, k: 0.3, bright: 0.55 });
const koch = [];
function addKoch(R, y, layers, spin, tilt = 0) {
  const holder = new THREE.Group();
  holder.position.y = y;
  holder.rotation.x = tilt;
  for (let l = 0; l < layers; l++) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(kochPositions(R * Math.pow(0.8, l), LOW ? 4 : 5, 0), 3));
    const ls = new THREE.LineSegments(g, kochMat);
    ls.rotation.y = l * (Math.PI / 6);
    ls.position.y = l * 0.08;
    ls.frustumCulled = false;
    holder.add(ls);
  }
  scene.add(holder);
  koch.push({ holder, spin });
}
addKoch(8.2, -3.3, 4, 0.05);
addKoch(5.6, -3.0, 3, -0.08);
addKoch(3.0, 7.0, 3, 0.12, 0.25);
addKoch(1.7, 8.6, 2, -0.2, -0.3);

// ============================================================
// 6. QUANTUM DUST — samples of a hydrogen 3d_z² orbital + faint stars
// ============================================================
const dust = new THREE.Group();
{
  const rand = rng(99);
  const N = LOW ? 5000 : 14000, SC = 1.05, L = 22;
  const p = new Float32Array(N * 3), sz = new Float32Array(N), rn = new Float32Array(N);
  let n = 0, guard = 0;
  while (n < N && guard++ < 6e6) {
    const x = (rand() * 2 - 1) * L, y = (rand() * 2 - 1) * L, z = (rand() * 2 - 1) * L;
    const r = Math.hypot(x, y, z); if (r < 1e-3) continue;
    const c2 = (y * y) / (r * r), Y = 3 * c2 - 1;
    const dens = Math.pow(r, 4) * Math.exp((-2 * r) / 3) * Y * Y / 95;
    if (rand() < dens) {
      p[n * 3] = x * SC; p[n * 3 + 1] = y * SC; p[n * 3 + 2] = z * SC;
      sz[n] = 0.6 + rand() * 1.2; rn[n] = rand(); n++;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p.slice(0, n * 3), 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(sz.slice(0, n), 1));
  g.setAttribute('aRnd', new THREE.BufferAttribute(rn.slice(0, n), 1));
  const pts = new THREE.Points(g, pointMaterial({ n: 9, k: 0.18, bright: 0.7 }));
  pts.frustumCulled = false;
  dust.add(pts);
  dust.position.y = 1.5;

  const sg = new THREE.BufferGeometry(), sp = new Float32Array(1500 * 3);
  for (let i = 0; i < 1500; i++) {
    const v = new THREE.Vector3(rand() - .5, rand() - .5, rand() - .5).normalize().multiplyScalar(60 + rand() * 40);
    sp.set([v.x, v.y, v.z], i * 3);
  }
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x8fa8ff, size: 0.35, sizeAttenuation: true, transparent: true, opacity: 0.55, depthWrite: false })));
}
scene.add(dust);

// ---------- post ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.6, 0.6, 0.35);
composer.addPass(bloom);
composer.addPass(new OutputPass());

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// ---------- interaction ----------
let paused = false;
addEventListener('keydown', e => {
  if (e.code === 'Space') { paused = !paused; e.preventDefault(); }
  else if (e.key === 'h' || e.key === 'H') document.body.classList.toggle('hide');
  else if (e.key === 's' || e.key === 'S') {
    composer.render();
    renderer.domElement.toBlob(b => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'quantum-bloom.png'; a.click();
    });
  }
});

// ---------- loop ----------
const clock = new THREE.Clock();
let T = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!paused) T += dt;
  const t = params.has('t') ? parseFloat(params.get('t')) : T;
  uniforms.uTime.value = t;
  romanesco.rotation.y = t * 0.08;
  flower.rotation.y = -t * 0.05;
  ferns.rotation.y = t * 0.03;
  gasket.rotation.y = t * 0.05; gasket.rotation.x = Math.sin(t * 0.07) * 0.15;
  dust.rotation.y = -t * 0.015;
  for (const k of koch) k.holder.rotation.y = t * k.spin;
  updatePetals(t);
  controls.autoRotate = !paused;
  controls.update();
  composer.render();
  requestAnimationFrame(frame);
}
frame();
document.getElementById('load').style.opacity = 0;
setTimeout(() => document.getElementById('load').remove(), 900);
window.__ready = true;
