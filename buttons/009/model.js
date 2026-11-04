/* No.009 */
(() => {
const TEX = {"front": "front.jpg", "back": "back.jpg", "material": "material.png"};
/* No.009 polished brass ring with red enamel flames, around a red marbled centre full of fine silver glitter.
   material.png: B = metalness, G = roughness, R = where the silver glitter is */
function inlayMat(map, matMap) {
  const mm = loader.load(matMap);
  const m = new THREE.MeshPhysicalMaterial({ map, metalnessMap: mm, roughnessMap: mm, metalness: 1, roughness: 1,
    clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1.35 });
  const uMV = { value: new THREE.Matrix3() };
  m.userData.uMV = uMV;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.matMap = { value: mm };
    sh.uniforms.uMV = uMV;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D matMap;\nuniform mat3 uMV;\nfloat hsh(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      {
        float gm = texture2D(matMap, vUv).r;
        vec3 N = normalize(normal);
        vec3 V = normalize(vViewPosition);
        vec3 Ls[3];
        Ls[0] = normalize(vec3(-2.0, 3.0, 4.0)); Ls[1] = normalize(vec3(2.6, 1.0, 3.0)); Ls[2] = normalize(vec3(0.3, -2.2, 3.0));
        vec3 acc = vec3(0.0);
        for (int k = 0; k < 2; k++) {
          float sc = k == 0 ? 420.0 : 260.0;
          vec2 cell = floor(vUv * sc + float(k) * 0.37);
          vec2 f = fract(vUv * sc + float(k) * 0.37) - 0.5;
          float on = step(k == 0 ? 0.55 : 0.75, hsh(cell + 3.1 + float(k)));
          vec3 fn = normalize(N + uMV * vec3((hsh(cell) - .5) * 1.8, (hsh(cell + 17.3) - .5) * 1.8, 0.0));
          float g = 0.0;
          for (int i = 0; i < 3; i++) g += pow(max(dot(reflect(-V, fn), Ls[i]), 0.0), 260.0);
          acc += vec3(0.94, 0.95, 1.0) * g * on * smoothstep(0.5, 0.0, length(f));
        }
        totalEmissiveRadiance += acc * gm * 2.4;
      }`);
  };
  return m;
}
function buildI() {
  const grp = new THREE.Group();
  const FZ = .05, BZ = -.06;
  // gently domed face, rounded at the very edge
  const frontZ = (x, y) => { const r = Math.min(1, Math.hypot(x, y)); const e = Math.max(0, (r - .94) / .06); return FZ + .12 * Math.pow(1 - r * r, .8) - .025 * e * e; };
  const fm = inlayMat(tex(TEX.front), TEX.material);
  const front = new THREE.Mesh(cap(1, 64, 220, frontZ, 1, false), fm);
  front.onBeforeRender = (r, s, cam) => { fm.userData.uMV.value.setFromMatrix4(new THREE.Matrix4().multiplyMatrices(cam.matrixWorldInverse, front.matrixWorld)); };
  grp.add(front);
  // thin brass line around the edge, then the red body
  grp.add(new THREE.Mesh(rim(1, FZ - .025, FZ - .045, 200), new THREE.MeshStandardMaterial({ color: 0xd6d2c6, metalness: 1, roughness: .15, envMapIntensity: 1.4 })));
  grp.add(new THREE.Mesh(rim(1, FZ - .045, BZ, 200), new THREE.MeshPhysicalMaterial({ color: 0x6a1410, roughness: .25, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: .6 })));
  // back: dome with two recessed slots and a small bridge (photo already mirrored)
  const CH = { cx: .04, cy: .1, ang: 0, w: .26, L: .74, d: .12, bridge: .22 };
  const dome = (x, y) => { const r = Math.min(1, Math.hypot(x, y)); return -.2 * Math.pow(1 - r * r, .75); };
  const slot = (x, y) => {
    const u = x - CH.cx, v = y - CH.cy, au = Math.abs(u), hw = CH.w / 2;
    if (au > CH.L) return 0;
    const ends = Math.min(1, (CH.L - au) / .06);
    const side = Math.min(1, Math.max(0, (hw * Math.sqrt(Math.max(0, 1 - Math.pow(au / CH.L, 6))) - Math.abs(v)) / .02));
    return CH.d * ends * side * side * (3 - 2 * side);
  };
  const backZ = (x, y) => { const z = dome(x, y); return BZ + z + Math.min(slot(x, y), -z); };
  const backMat = photoMat(tex(TEX.back), { roughness: .22, clearcoat: 1, clearcoatRoughness: .05, side: THREE.DoubleSide });
  grp.add(new THREE.Mesh(cap(1, 72, 240, backZ, -1, false), backMat));
  const hw = CH.w / 2 + .02, Hh = CH.d;
  const br = new THREE.Shape();
  br.moveTo(-hw, 0); br.lineTo(-hw, Hh); br.lineTo(hw, Hh); br.lineTo(hw, 0);
  br.lineTo(hw - .04, 0); br.lineTo(hw - .04, Hh * .35); br.quadraticCurveTo(0, Hh * .8, -hw + .04, Hh * .35); br.lineTo(-hw + .04, 0); br.closePath();
  const bg = new THREE.ExtrudeGeometry(br, { depth: CH.bridge, bevelEnabled: true, bevelThickness: .01, bevelSize: .01, bevelSegments: 3, curveSegments: 8 });
  bg.rotateX(-Math.PI / 2); bg.translate(0, -CH.bridge / 2, 0); bg.rotateZ(-Math.PI / 2);
  bg.translate(CH.cx, CH.cy, BZ + dome(CH.cx, CH.cy) + CH.d);
  const bp = bg.attributes.position, buv = bg.attributes.uv;
  for (let i = 0; i < bp.count; i++) buv.setXY(i, bp.getX(i) / 2 + .5, bp.getY(i) / 2 + .5);
  grp.add(new THREE.Mesh(bg, backMat));
  return grp;
}
buildI.env = 'jewel';
viewer(document.getElementById('cv'), buildI, 'v');
})();
