/* ボタン図鑑 shared 3D code (three.js r147, classic script).
   Each button page loads three.min.js, this file, then its own model.js,
   which defines TEX + build function and calls viewer(). */
THREE.ColorManagement.legacyMode = false;
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const loader = new THREE.TextureLoader();
function tex(src) {
  const t = loader.load(src);
  t.encoding = THREE.sRGBEncoding;
  t.anisotropy = 8;
  return t;
}

/* a flat-ish round face built as rings, so it can bend into a dome */
function cap(R, rings, segs, zFn, facing, mirrorU) {
  const pos = [], uv = [], idx = [];
  const put = (x, y) => { pos.push(x, y, zFn(x, y)); uv.push((mirrorU ? -x : x) / (2 * R) + .5, y / (2 * R) + .5); };
  put(0, 0);
  for (let i = 1; i <= rings; i++) {
    const r = R * i / rings;
    for (let j = 0; j < segs; j++) { const a = j / segs * Math.PI * 2; put(r * Math.cos(a), r * Math.sin(a)); }
  }
  const tri = (a, b, c) => facing > 0 ? idx.push(a, b, c) : idx.push(a, c, b);
  for (let j = 0; j < segs; j++) tri(0, 1 + j, 1 + (j + 1) % segs);
  for (let i = 1; i < rings; i++) for (let j = 0; j < segs; j++) {
    const a = 1 + (i - 1) * segs + j, b = 1 + (i - 1) * segs + (j + 1) % segs;
    const c = 1 + i * segs + j, d = 1 + i * segs + (j + 1) % segs;
    tri(a, c, d); tri(a, d, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function rim(R, zTop, zBot, segs) {
  const g = new THREE.CylinderGeometry(R, R, zTop - zBot, segs, 1, true);
  g.rotateX(Math.PI / 2); g.translate(0, 0, (zTop + zBot) / 2);
  return g;
}
/* a raised strip that follows a curved surface (the bar on No.001's back) */
function strip(x0, x1, y0, y1, baseZ, h, mirrorU) {
  const nx = 28, ny = 4, pos = [], uv = [], idx = [];
  const P = (x, y, z) => { pos.push(x, y, z); uv.push((mirrorU ? -x : x) / 2 + .5, y / 2 + .5); return pos.length / 3 - 1; };
  const top = [];
  for (let i = 0; i <= nx; i++) { top[i] = []; for (let j = 0; j <= ny; j++) {
    const x = x0 + (x1 - x0) * i / nx, y = y0 + (y1 - y0) * j / ny; top[i][j] = P(x, y, baseZ(x, y) - h);
  } }
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) idx.push(top[i][j], top[i + 1][j], top[i + 1][j + 1], top[i][j], top[i + 1][j + 1], top[i][j + 1]);
  const wall = (pts) => { for (let k = 0; k < pts.length - 1; k++) {
    const [ax, ay] = pts[k], [bx, by] = pts[k + 1];
    const a = P(ax, ay, baseZ(ax, ay) - h), b = P(bx, by, baseZ(bx, by) - h);
    const c = P(bx, by, baseZ(bx, by) + .01), d = P(ax, ay, baseZ(ax, ay) + .01);
    idx.push(a, b, c, a, c, d);
  } };
  const line = (fx, fy, n) => Array.from({ length: n + 1 }, (_, k) => [fx(k / n), fy(k / n)]);
  wall(line(t => x0 + (x1 - x0) * t, () => y0, nx));
  wall(line(t => x0 + (x1 - x0) * t, () => y1, nx));
  wall(line(() => x0, t => y0 + (y1 - y0) * t, ny));
  wall(line(() => x1, t => y0 + (y1 - y0) * t, ny));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function photoMat(map, extra) {
  return new THREE.MeshPhysicalMaterial(Object.assign({ map, roughness: .42, metalness: 0, clearcoat: .7, clearcoatRoughness: .14, envMapIntensity: .55 }, extra || {}));
}

/* No.001 front: copper streaks that light up along their grain, a soft gold sheen, and fine glitter */
function marbleMat(map, fiberMap, maskMap) {
  const m = new THREE.MeshPhysicalMaterial({ map, roughness: .4, metalness: 0, clearcoat: .8, clearcoatRoughness: .1, envMapIntensity: .5 });
  const uMV = { value: new THREE.Matrix3() };
  m.userData.uMV = uMV;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.fiberMap = { value: fiberMap };
    sh.uniforms.maskMap = { value: maskMap };
    sh.uniforms.uMV = uMV;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D fiberMap;\nuniform sampler2D maskMap;\nuniform mat3 uMV;\nfloat hsh(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      {
        vec4 fb = texture2D(fiberMap, vUv);
        vec4 mk = texture2D(maskMap, vUv);
        float a2 = atan(fb.g * 2.0 - 1.0, fb.r * 2.0 - 1.0);
        float a = 0.5 * a2;
        vec3 N = normalize(normal);
        vec3 T = normalize(uMV * vec3(cos(a), sin(a), 0.0));
        T = normalize(T - N * dot(T, N));
        vec3 V = normalize(vViewPosition);
        vec3 Ls[3];
        Ls[0] = normalize(vec3(-2.0, 3.0, 4.0)); Ls[1] = normalize(vec3(2.6, 1.0, 3.0)); Ls[2] = normalize(vec3(0.3, -2.2, 3.0));
        float w[3]; w[0] = 1.0; w[1] = .65; w[2] = .45;
        float streak = 0.0, broad = 0.0, glit = 0.0;
        vec2 cell = floor(vUv * 380.0);
        vec2 f = fract(vUv * 380.0) - 0.5;
        float on = step(0.62, hsh(cell + 3.1));
        vec3 fn = normalize(N + uMV * vec3((hsh(cell) - .5) * 1.6, (hsh(cell + 17.3) - .5) * 1.6, 0.0));
        float dotShape = smoothstep(0.5, 0.05, length(f));
        for (int i = 0; i < 3; i++) {
          vec3 H = normalize(Ls[i] + V);
          float th = dot(T, H);
          float s = sqrt(max(0.0, 1.0 - th * th));
          float lit = clamp(dot(N, Ls[i]) + 0.3, 0.0, 1.0);
          streak += w[i] * pow(s, 90.0) * lit;
          broad += w[i] * pow(max(dot(N, H), 0.0), 40.0) * lit;
          glit += w[i] * pow(max(dot(reflect(-V, fn), Ls[i]), 0.0), 260.0);
        }
        vec3 copper = vec3(1.0, 0.52, 0.22);
        vec3 goldc = vec3(0.86, 0.78, 0.40);
        vec3 spark = mix(vec3(1.0, 0.62, 0.32), vec3(1.0, 0.9, 0.6), hsh(cell + 9.7));
        totalEmissiveRadiance += copper * streak * fb.b * 1.0;
        totalEmissiveRadiance += goldc * (streak * 0.35 + broad * 0.25) * mk.g * 0.45;
        totalEmissiveRadiance += spark * glit * on * dotShape * mk.b * 1.6;
      }`);
  };
  return m;
}


function glowMat(map, glowMap, extra) {
  const m = new THREE.MeshPhysicalMaterial(Object.assign({
    map, emissiveMap: glowMap, emissive: 0xffffff, emissiveIntensity: .55,
    roughness: .16, metalness: 0, clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: .6
  }, extra || {}));
  // light from behind shines through most when the face looks at you, and fades as it turns edge-on
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n totalEmissiveRadiance *= (0.15 + 0.85 * pow(abs(normal.z), 1.5));');
  };
  return m;
}
function rimTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 64;
  const g = c.getContext('2d');
  // bottom of canvas = back of button, top = front (cylinder v runs back→front after rotation)
  const bands = [[0, '#4a170a'], [.16, '#7e3312'], [.3, '#b5601f'], [.4, '#c98a36'], [.43, '#e2c172'], [.47, '#a9561b'], [.7, '#c4702a'], [.77, '#d9b064'], [.8, '#8a3514'], [1, '#5a1d0b']];
  const grd = g.createLinearGradient(0, 64, 0, 0);
  bands.forEach(([p, col]) => grd.addColorStop(p, col));
  g.fillStyle = grd; g.fillRect(0, 0, 512, 64);
  // tortoiseshell mottling around the edge
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 90; i++) {
    g.fillStyle = `rgba(${40 + rnd() * 40},${10 + rnd() * 15},5,${.15 + rnd() * .3})`;
    const x = rnd() * 512, w = 6 + rnd() * 30;
    g.fillRect(x, 0, w, 64);
  }
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = THREE.RepeatWrapping;
  return t;
}
function cloverRelief(H, baseZ, height, extra) {
  const n = H.n, raw = atob(H.h), b16 = !!H.b16, top = b16 ? 65534 : 254;
  const q = b16 ? new Uint16Array(n * n) : new Uint8Array(raw.length);
  if (b16) for (let i = 0; i < n * n; i++) q[i] = raw.charCodeAt(2 * i) * 256 + raw.charCodeAt(2 * i + 1);
  else for (let i = 0; i < raw.length; i++) q[i] = raw.charCodeAt(i);
  const pos = [], uv = [], idx = [], id = new Int32Array(n * n).fill(-1);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const v = q[j * n + i]; if (!v) continue;
    const x = H.x0 + (H.x1 - H.x0) * i / (n - 1), y = H.y0 + (H.y1 - H.y0) * j / (n - 1);
    id[j * n + i] = pos.length / 3;
    pos.push(x, y, baseZ + height * (v - 1) / top + (extra ? extra(x, y) : 0)); uv.push(x / 2 + .5, y / 2 + .5);
  }
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
    const a = id[j * n + i], b = id[j * n + i + 1], c = id[(j + 1) * n + i], d = id[(j + 1) * n + i + 1];
    if (a < 0 || b < 0 || c < 0 || d < 0) continue;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function pearlMat(map, fiberMap) {
  const m = new THREE.MeshPhysicalMaterial({ map, roughness: .3, metalness: 0, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: .5 });
  const uMV = { value: new THREE.Matrix3() };
  m.userData.uMV = uMV;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.fiberMap = { value: fiberMap };
    sh.uniforms.uMV = uMV;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D fiberMap;\nuniform mat3 uMV;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      {
        vec4 fb = texture2D(fiberMap, vUv);
        float a2 = atan(fb.g * 2.0 - 1.0, fb.r * 2.0 - 1.0);
        float a = 0.5 * a2;
        vec3 T = normalize(uMV * vec3(cos(a), sin(a), 0.0));
        vec3 N = normalize(normal);
        T = normalize(T - N * dot(T, N));
        vec3 V = normalize(vViewPosition);
        // a little per-fibre wobble so the sheen breaks into flecks like nacre
        float wob = (fb.b - 0.5) * 0.35 + sin(a2 * 3.0 + vUv.x * 40.0) * 0.08;
        vec3 Ls[4];
        Ls[0] = normalize(vec3(-2.0, 3.0, 4.0)); Ls[1] = normalize(vec3(2.6, 1.0, 3.0));
        Ls[2] = normalize(vec3(0.3, -2.2, 3.0)); Ls[3] = normalize(vec3(-3.0, -0.6, 2.0));
        float w[4]; w[0] = 1.0; w[1] = .7; w[2] = .45; w[3] = .4;
        float sh = 0.0;
        for (int i = 0; i < 4; i++) {
          vec3 H = normalize(Ls[i] + V);
          float th = dot(T, H) + wob * 0.25;
          float s = sqrt(max(0.0, 1.0 - th * th));
          sh += w[i] * pow(s, 70.0) * clamp(dot(N, Ls[i]) + 0.4, 0.0, 1.0);
        }
        float nv = clamp(dot(N, V), 0.0, 1.0);
        vec3 tint = mix(vec3(1.0, 0.80, 0.74), vec3(0.86, 0.88, 1.0), 0.5 + 0.5 * sin(a2 * 2.0 + nv * 7.0));
        totalEmissiveRadiance += tint * sh * fb.b * 0.85;
      }`);
  };
  return m;
}

function glitterMat(map, mask) {
  const m = new THREE.MeshPhysicalMaterial({ map, roughness: .32, metalness: 0, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: .6 });
  const uMV = { value: new THREE.Matrix3() };
  m.userData.uMV = uMV;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.maskMap = { value: mask };
    sh.uniforms.uMV = uMV;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D maskMap;\nuniform mat3 uMV;\nfloat hsh(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      {
        float mk = texture2D(maskMap, vUv).r;
        vec3 N = normalize(normal);
        vec3 V = normalize(vViewPosition);
        vec3 Ls[3];
        Ls[0] = normalize(vec3(-2.0, 3.0, 4.0)); Ls[1] = normalize(vec3(2.6, 1.0, 3.0)); Ls[2] = normalize(vec3(0.3, -2.2, 3.0));
        float w[3]; w[0] = 1.0; w[1] = .7; w[2] = .5;
        vec3 acc = vec3(0.0);
        // two layers of tiny tilted flakes; each flashes only when it tips toward a light
        for (int k = 0; k < 2; k++) {
          float sc = k == 0 ? 240.0 : 150.0;
          vec2 cell = floor(vUv * sc + float(k) * 0.37);
          vec2 f = fract(vUv * sc + float(k) * 0.37) - 0.5;
          float on = step(k == 0 ? 0.45 : 0.65, hsh(cell + 3.1 + float(k)));
          vec3 fn = normalize(N + uMV * vec3((hsh(cell) - .5) * 1.8, (hsh(cell + 17.3) - .5) * 1.8, 0.0));
          float shape = smoothstep(0.5, 0.0, length(f));
          float g = 0.0;
          for (int i = 0; i < 3; i++) g += w[i] * pow(max(dot(reflect(-V, fn), Ls[i]), 0.0), 220.0);
          vec3 tint = mix(vec3(0.92, 0.94, 1.0), vec3(1.0, 0.82, 0.95), step(0.82, hsh(cell + 5.5)));
          acc += tint * g * on * shape;
        }
        totalEmissiveRadiance += acc * mk * 2.6;
      }`);
  };
  return m;
}
function stripRot(cx, cy, ang, len0, len1, wid, baseZ, h, mirrorU) {
  const nx = 24, ny = 4, pos = [], uv = [], idx = [];
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const W = (u, v) => [cx + u * ca - v * sa, cy + u * sa + v * ca];
  const P = (x, y, z) => { pos.push(x, y, z); uv.push((mirrorU ? -x : x) / 2 + .5, y / 2 + .5); return pos.length / 3 - 1; };
  const top = [];
  for (let i = 0; i <= nx; i++) { top[i] = []; for (let j = 0; j <= ny; j++) {
    const [x, y] = W(len0 + (len1 - len0) * i / nx, -wid / 2 + wid * j / ny); top[i][j] = P(x, y, baseZ(x, y) - h);
  } }
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) idx.push(top[i][j], top[i + 1][j], top[i + 1][j + 1], top[i][j], top[i + 1][j + 1], top[i][j + 1]);
  const wall = (pts) => { for (let k = 0; k < pts.length - 1; k++) {
    const [ax, ay] = pts[k], [bx, by] = pts[k + 1];
    const a = P(ax, ay, baseZ(ax, ay) - h), b = P(bx, by, baseZ(bx, by) - h), c = P(bx, by, baseZ(bx, by) + .01), d = P(ax, ay, baseZ(ax, ay) + .01);
    idx.push(a, b, c, a, c, d);
  } };
  const line = (fu, fv, n) => Array.from({ length: n + 1 }, (_, k) => W(fu(k / n), fv(k / n)));
  wall(line(t => len0 + (len1 - len0) * t, () => -wid / 2, nx));
  wall(line(t => len0 + (len1 - len0) * t, () => wid / 2, nx));
  wall(line(() => len0, t => -wid / 2 + wid * t, ny));
  wall(line(() => len1, t => -wid / 2 + wid * t, ny));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function bowMat(map, fiberMap, maskMap) {
  const m = new THREE.MeshPhysicalMaterial({ map, roughness: .35, metalness: 0, clearcoat: .85, clearcoatRoughness: .06, envMapIntensity: .35 });
  const uMV = { value: new THREE.Matrix3() };
  m.userData.uMV = uMV;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.fiberMap = { value: fiberMap };
    sh.uniforms.maskMap = { value: maskMap };
    sh.uniforms.uMV = uMV;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D fiberMap;\nuniform sampler2D maskMap;\nuniform mat3 uMV;\nfloat hsh(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      {
        vec4 fb = texture2D(fiberMap, vUv);
        float gm = texture2D(maskMap, vUv).r;
        float a2 = atan(fb.g * 2.0 - 1.0, fb.r * 2.0 - 1.0);
        float a = 0.5 * a2;
        vec3 N = normalize(normal);
        vec3 T = normalize(uMV * vec3(cos(a), sin(a), 0.0));
        T = normalize(T - N * dot(T, N));
        vec3 V = normalize(vViewPosition);
        vec3 Ls[4];
        Ls[0] = normalize(vec3(-2.0, 3.0, 4.0)); Ls[1] = normalize(vec3(2.6, 1.0, 3.0));
        Ls[2] = normalize(vec3(0.3, -2.2, 3.0)); Ls[3] = normalize(vec3(-3.0, -0.6, 2.0));
        float w[4]; w[0] = 1.0; w[1] = .7; w[2] = .45; w[3] = .4;
        float sh = 0.0, gl = 0.0;
        vec2 cell = floor(vUv * 120.0);
        vec2 f = fract(vUv * 120.0) - 0.5;
        float on = step(0.4, hsh(cell + 3.1));
        vec3 fn = normalize(N + uMV * vec3((hsh(cell) - .5) * 1.7, (hsh(cell + 17.3) - .5) * 1.7, 0.0));
        float shape = smoothstep(0.48, 0.1, length(f + (vec2(hsh(cell + 1.7), hsh(cell + 8.1)) - .5) * .25));
        for (int i = 0; i < 4; i++) {
          vec3 H = normalize(Ls[i] + V);
          float th = dot(T, H);
          float s = sqrt(max(0.0, 1.0 - th * th));
          sh += w[i] * pow(s, 120.0) * clamp(dot(N, Ls[i]) + 0.4, 0.0, 1.0);
          gl += w[i] * pow(max(dot(reflect(-V, fn), Ls[i]), 0.0), 160.0);
        }
        float nv = clamp(dot(N, V), 0.0, 1.0);
        vec3 satin = mix(vec3(1.0, 0.64, 0.38), vec3(1.0, 0.76, 0.52), 0.5 + 0.5 * sin(a2 * 2.0 + nv * 6.0));
        vec3 orange = mix(vec3(1.0, 0.46, 0.16), vec3(1.0, 0.6, 0.26), hsh(cell + 5.5));
        totalEmissiveRadiance += satin * sh * fb.b * 0.5;
        totalEmissiveRadiance += orange * gl * on * shape * gm * 3.6;
      }`);
  };
  return m;
}

function milgrainTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 16;
  const g = c.getContext('2d');
  for (let i = 0; i < 160; i++) {
    const x = i * 1024 / 160, grd = g.createLinearGradient(x, 0, x + 6.4, 0);
    grd.addColorStop(0, '#000'); grd.addColorStop(.5, '#fff'); grd.addColorStop(1, '#000');
    g.fillStyle = grd; g.fillRect(x, 0, 6.4, 16);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping;
  return t;
}

function makeEnv(renderer, kind) {
  const pm = new THREE.PMREMGenerator(renderer);
  const sc = new THREE.Scene();
  if (kind === 'jewel') {
    // dark room with a few strong softboxes: crisp, deep reflections for polished gold
    sc.add(new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20), new THREE.MeshBasicMaterial({ color: 0x5e564b, side: THREE.BackSide })));
    const glow = (w, h, x, y, z, k, c) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c || 0xffffff).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); sc.add(m); };
    glow(7, 2.2, -5, 6, 6, 4.5);
    glow(1.6, 9, 7, 0, 4, 3.2, 0xfff3dc);
    glow(9, 1.2, 1, -7, 3, 1.6, 0xfff0d8);
    glow(4, 4, -2, 2, -8, 1.4);
    glow(14, 6, 0, 9, -2, .55, 0xf2ece2);
    glow(9, 9, 1, 1, 9, .8, 0xfff2de);
    glow(7, 2.5, -3, 4, -7, 2.6);
    glow(2, 7, 6, -1, -5, 1.8, 0xfff3dc);
    const rt0 = pm.fromScene(sc, .02); pm.dispose(); return rt0.texture;
  }
  sc.add(new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20), new THREE.MeshBasicMaterial({ color: 0x8a8a86, side: THREE.BackSide })));
  const panel = (w, h, x, y, z, c) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); sc.add(m); };
  panel(8, 5, -5, 6, 7, 0xffffff);
  panel(6, 6, 7, 2, 4, 0xd8d8d0);
  panel(12, 3, 0, -8, 0, 0x55534e);
  panel(5, 8, 2, 3, -8, 0xbfbfb8);
  const rt = pm.fromScene(sc, .04);
  pm.dispose();
  return rt.texture;
}

const VIEWS = { front: [0, 0], back: [Math.PI, 0], side: [Math.PI / 2, .18] };

function viewer(canvas, build, key) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: /[?&]thumb/.test(location.search) });
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const scene = new THREE.Scene();
  scene.environment = makeEnv(renderer, build.env);
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 50);
  cam.position.set(0, 0, 4.6);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6b6660, .55));
  const key1 = new THREE.DirectionalLight(0xffffff, .75); key1.position.set(-2, 3, 4); scene.add(key1);
  const fill = new THREE.DirectionalLight(0xffffff, .35); fill.position.set(3, -1, -4); scene.add(fill);
  const obj = build(); scene.add(obj);
  canvas.parentElement.querySelector('.loading')?.remove();

  let yaw = -.45, pitch = .22, tYaw = yaw, tPitch = pitch, vel = 0, dragging = false, touched = false, lx = 0, ly = 0, lastT = performance.now();
  const btns = document.querySelectorAll(`.views[data-for="${key}"] button`);
  const mark = (v) => btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
  btns.forEach(b => b.addEventListener('click', () => {
    touched = true; vel = 0;
    const [y, p] = VIEWS[b.dataset.view];
    const turn = Math.PI * 2;
    tYaw = y + Math.round((yaw - y) / turn) * turn; tPitch = p; mark(b.dataset.view);
    if (reduceMotion) { yaw = tYaw; pitch = tPitch; }
  }));
  canvas.addEventListener('pointerdown', e => { dragging = true; touched = true; lx = e.clientX; ly = e.clientY; vel = 0; canvas.setPointerCapture(e.pointerId); mark(''); });
  canvas.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = (e.clientX - lx) / canvas.clientWidth * 4, dy = (e.clientY - ly) / canvas.clientHeight * 3;
    lx = e.clientX; ly = e.clientY;
    yaw += dx; tYaw = yaw; vel = dx;
    pitch = Math.max(-1.2, Math.min(1.2, pitch + dy)); tPitch = pitch;
  });
  const end = () => { dragging = false; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * renderer.getPixelRatio())) { renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  }
  let visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(canvas);
  function frame(t) {
    const dt = Math.min(.05, (t - lastT) / 1000); lastT = t;
    if (visible) {
      if (!dragging) {
        if (!touched && !reduceMotion) { tYaw += dt * .35; }
        else if (Math.abs(vel) > .0005) { tYaw += vel; vel *= .9; }
        const k = reduceMotion ? 1 : 1 - Math.pow(.0015, dt);
        yaw += (tYaw - yaw) * k; pitch += (tPitch - pitch) * k;
      }
      obj.rotation.set(pitch, yaw, 0, 'YXZ');
      resize(); renderer.render(scene, cam);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.__set = window.__set || {}; window.__set[key] = (y, p) => { touched = true; yaw = tYaw = y; pitch = tPitch = p; };
}

