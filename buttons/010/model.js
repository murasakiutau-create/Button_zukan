/* No.010 */
(() => {
const TEX = {"front": "front.jpg", "back": "back.jpg", "sheen": "sheen.png"};
/* No.010 square silver setting with stamp-like teeth around a red shell cabochon whose silky streaks slide as it turns */
function teethOutline(a, tip, n) {
  // square of half-size a with n triangular teeth per side reaching out to tip
  const pts = [], step = 2 * a / n;
  const side = (fx) => { for (let k = 0; k < n; k++) { pts.push(fx(-a + k * step, a)); pts.push(fx(-a + (k + .5) * step, tip)); } };
  side((t, o) => [t, o]);           // top, left to right
  side((t, o) => [o, -t]);          // right, top to bottom
  side((t, o) => [-t, -o]);         // bottom, right to left
  side((t, o) => [-o, t]);          // left, bottom to top
  return pts;
}
function slab(pts, z0, z1, mat, capMat) {
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: true, bevelThickness: .008, bevelSize: .008, bevelSegments: 2, curveSegments: 4 });
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 2 + .5, p.getY(i) / 2 + .5);
  g.translate(0, 0, z0);
  return new THREE.Mesh(g, capMat ? [capMat, mat] : mat);
}
function sq(a) { return [[-a, -a], [a, -a], [a, a], [-a, a]]; }
function frame(aOut, aIn, z0, z1, mat) {
  const s = new THREE.Shape(sq(aOut).map(([x, y]) => new THREE.Vector2(x, y)));
  s.holes.push(new THREE.Path(sq(aIn).reverse().map(([x, y]) => new THREE.Vector2(x, y))));
  const g = new THREE.ExtrudeGeometry(s, { depth: z1 - z0, bevelEnabled: true, bevelThickness: .012, bevelSize: .01, bevelSegments: 3 });
  g.translate(0, 0, z0);
  return new THREE.Mesh(g, mat);
}
function buildJ() {
  const grp = new THREE.Group();
  const silver = new THREE.MeshStandardMaterial({ color: 0xd9d9dc, metalness: 1, roughness: .26, envMapIntensity: 1.3 });
  const brushed = new THREE.MeshStandardMaterial({ color: 0xc9c9cc, metalness: 1, roughness: .42, envMapIntensity: 1.1 });
  const backFace = new THREE.MeshStandardMaterial({ map: tex(TEX.back), metalness: .9, roughness: .4, envMapIntensity: 1.1 });
  // toothed base plate (photo of the back on its underside), then the raised frame and the stone
  const BZ = -.1, PZ = .02, S0 = .813;
  grp.add(slab(teethOutline(.9, 1, 6), BZ, PZ, silver, backFace));
  grp.add(frame(.9, .83, PZ, .1, brushed));
  grp.add(frame(.835, .815, .06, .115, silver));
  // red sides of the stone show above the frame
  grp.add(new THREE.Mesh((() => { const g = new THREE.BoxGeometry(2 * S0, 2 * S0, .06); g.translate(0, 0, .13); return g; })(), new THREE.MeshPhysicalMaterial({ color: 0xa8231c, roughness: .2, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: .5 })));
  const S = .815, base = .155, rise = .12;
  const z = (x, y) => { const u = Math.min(1, Math.abs(x) / S), v = Math.min(1, Math.abs(y) / S); return base + rise * (1 - Math.pow(u, 4)) * (1 - Math.pow(v, 4)); };
  const n = 90, pos = [], uv = [], idx = [];
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
    const x = -S + 2 * S * i / n, y = -S + 2 * S * j / n;
    pos.push(x, y, z(x, y)); uv.push(x / 2 + .5, y / 2 + .5);
  }
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = j * (n + 1) + i; idx.push(a, a + 1, a + n + 2, a, a + n + 2, a + n + 1); }
  const sgeo = new THREE.BufferGeometry();
  sgeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sgeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  sgeo.setIndex(idx); sgeo.computeVertexNormals();
  const pm = pearlMat(tex(TEX.front), loader.load(TEX.sheen));
  pm.roughness = .2; pm.envMapIntensity = .25;
  // coral-red shimmer instead of the pale pearl tint
  const basePm = pm.onBeforeCompile;
  pm.onBeforeCompile = (sh) => {
    basePm(sh);
    sh.fragmentShader = sh.fragmentShader
      .replace('mix(vec3(1.0, 0.80, 0.74), vec3(0.86, 0.88, 1.0)', 'mix(vec3(1.0, 0.86, 0.55), vec3(1.0, 0.95, 0.8)')
      .replace('tint * sh * fb.b * 0.85', 'tint * sh * fb.b * 1.6')
      .replace('pow(s, 70.0)', 'pow(s, 220.0)')
      .replace('float wob = (fb.b - 0.5) * 0.35 + sin(a2 * 3.0 + vUv.x * 40.0) * 0.08;', 'float wob = 0.0;');
  };
  const stone = new THREE.Mesh(sgeo, pm);
  stone.onBeforeRender = (r, s, cam) => { pm.userData.uMV.value.setFromMatrix4(new THREE.Matrix4().multiplyMatrices(cam.matrixWorldInverse, stone.matrixWorld)); };
  grp.add(stone);
  // loop shank
  const s = new THREE.Shape();
  s.moveTo(-.17, 0); s.lineTo(-.17, .2); s.quadraticCurveTo(-.17, .3, -.07, .3); s.lineTo(.07, .3); s.quadraticCurveTo(.17, .3, .17, .2); s.lineTo(.17, 0); s.closePath();
  const hole = new THREE.Path(); hole.absarc(0, .17, .055, 0, Math.PI * 2, true); s.holes.push(hole);
  const sg = new THREE.ExtrudeGeometry(s, { depth: .14, bevelEnabled: true, bevelThickness: .015, bevelSize: .015, bevelSegments: 3, curveSegments: 16 });
  sg.rotateX(-Math.PI / 2); sg.rotateZ(Math.PI / 2); sg.translate(.07, 0, BZ - .005);
  grp.add(new THREE.Mesh(sg, silver));
  return grp;
}
buildJ.env = 'jewel';
viewer(document.getElementById('cv'), buildJ, 'v');
})();
