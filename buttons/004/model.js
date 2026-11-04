/* No.004 */
(() => {
const TEX = {"dFront": "front.jpg", "dGlitter": "glitter.png", "dBack": "back.jpg"};
const GEMS_D = [[-0.1441, 0.1201, 0.072], [0.0493, 0.1367, 0.072], [-0.1469, -0.0482, 0.072], [0.065, -0.0979, 0.072]];
function buildD() {
  const grp = new THREE.Group();
  const FZ = .07, EZ = -.06;
  const frontZ = (x, y) => { const r = Math.min(1, Math.hypot(x, y)); const e = Math.max(0, (r - .93) / .07); return FZ + .075 * Math.pow(1 - r * r, 1.3) - .03 * e * e; };
  const coneZ = (x, y) => { const r = Math.min(1, Math.hypot(x, y)); const t = Math.min(1, Math.max(0, (1 - r) / .45)); return EZ - .2 * t * t * (3 - 2 * t); };
  // a channel runs across the back boss (the thread passes under a small bridge in the middle)
  const CH = { cx: .05, cy: .04, ang: 1.185, w: .27, d: .15 };
  const chUV = (x, y) => { const dx = x - CH.cx, dy = y - CH.cy, ca = Math.cos(CH.ang), sa = Math.sin(CH.ang); return [dx * ca + dy * sa, -dx * sa + dy * ca]; };
  const backZ = (x, y) => {
    const z = coneZ(x, y); const [u, v] = chUV(x, y);
    const hw = CH.w / 2, av = Math.abs(v);
    const edge = Math.min(1, Math.max(0, (hw - av) / .035));
    const floor = 1 - .35 * Math.pow(Math.min(1, av / hw), 2);
    const cut = CH.d * edge * edge * (3 - 2 * edge) * floor;
    return z + Math.min(cut, EZ - z);
  };
  const fm = glitterMat(tex(TEX.dFront), loader.load(TEX.dGlitter));
  const front = new THREE.Mesh(cap(1, 48, 160, frontZ, 1, false), fm);
  front.onBeforeRender = (r, s, cam) => { fm.userData.uMV.value.setFromMatrix4(new THREE.Matrix4().multiplyMatrices(cam.matrixWorldInverse, front.matrixWorld)); };
  grp.add(front);
  const backMat = photoMat(tex(TEX.dBack), { roughness: .2, clearcoat: 1, clearcoatRoughness: .04 });
  grp.add(new THREE.Mesh(cap(1, 96, 260, backZ, -1, true), backMat));
  grp.add(new THREE.Mesh(rim(1, FZ - .03, EZ, 160), new THREE.MeshPhysicalMaterial({ color: 0x16161a, roughness: .25, clearcoat: 1, clearcoatRoughness: .05 })));
  // the little bridge over the channel, with the thread tunnel underneath (photo x is mirrored on the back)
  const hw = CH.w / 2 + .03, depth = coneZ(CH.cx, CH.cy) - (coneZ(CH.cx, CH.cy) + CH.d);
  const H = -depth;
  const br = new THREE.Shape();
  br.moveTo(-hw, 0); br.lineTo(-hw, H); br.lineTo(hw, H); br.lineTo(hw, 0);
  br.lineTo(hw - .06, 0); br.lineTo(hw - .06, H * .4); br.quadraticCurveTo(0, H * .78, -hw + .06, H * .4); br.lineTo(-hw + .06, 0); br.closePath();
  const bg = new THREE.ExtrudeGeometry(br, { depth: .22, bevelEnabled: true, bevelThickness: .015, bevelSize: .015, bevelSegments: 3, curveSegments: 8 });
  bg.rotateX(-Math.PI / 2); bg.translate(0, -.11, 0); bg.rotateZ(CH.ang - Math.PI / 2);
  bg.translate(CH.cx, CH.cy, coneZ(CH.cx, CH.cy) + CH.d);
  const bp = bg.attributes.position, buv = bg.attributes.uv;
  for (let i = 0; i < bp.count; i++) buv.setXY(i, -bp.getX(i) / 2 + .5, bp.getY(i) / 2 + .5);
  grp.add(new THREE.Mesh(bg, photoMat(tex(TEX.dBack), { roughness: .2, clearcoat: 1, clearcoatRoughness: .04 })));
  // crystals: small faceted stones that catch the light
  const gemMat = new THREE.MeshPhysicalMaterial({ color: 0xc9cbd2, metalness: 1, roughness: .03, iridescence: .45, iridescenceIOR: 1.5, iridescenceThicknessRange: [300, 900], envMapIntensity: 2.4, flatShading: true });
  // set into the surface: only the faceted top shows, level with the glossy face
  GEMS_D.forEach(([x, y, r]) => {
    const crown = new THREE.CylinderGeometry(r * .62, r, r * .32, 8, 1);
    crown.rotateX(Math.PI / 2); crown.rotateZ(Math.PI / 8);
    const table = new THREE.ConeGeometry(r * .62, r * .1, 8); table.rotateX(Math.PI / 2); table.rotateZ(Math.PI / 8);
    const z = frontZ(x, y);
    const m1 = new THREE.Mesh(crown, gemMat); m1.position.set(x, y, z - r * .14);
    const m2 = new THREE.Mesh(table, gemMat); m2.position.set(x, y, z + r * .02 + .002);
    grp.add(m1, m2);
  });
  return grp;
}
buildD.env = 'jewel';
viewer(document.getElementById('cv'), buildD, 'v');
})();
