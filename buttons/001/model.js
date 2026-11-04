/* No.001 */
(() => {
const TEX = {"aFrontBase": "front.jpg", "aFiber": "sheen.png", "aMask": "glitter.png", "aBack": "back.jpg"};
/* No.001 brown marble: flat face, domed back with a bar --- */
function buildA() {
  const grp = new THREE.Group();
  const FZ = .06, EZ = -.05, DOME = .2;
  const frontZ = (x, y) => { const r = Math.hypot(x, y); const t = Math.max(0, (r - .9) / .1); return FZ - .035 * t * t; };
  const domeZ = (x, y) => { const r = Math.min(1, Math.hypot(x, y)); return EZ - DOME * Math.pow(1 - r * r, .85); };
  // a channel runs across the back; a small bridge in the middle covers the thread tunnel
  const CH = { cx: 0, cy: .04, ang: .061, w: .21, d: .1 };
  const backZ = (x, y) => {
    const z = domeZ(x, y), dx = x - CH.cx, dy = y - CH.cy;
    const v = -dx * Math.sin(CH.ang) + dy * Math.cos(CH.ang), hw = CH.w / 2, av = Math.abs(v);
    const edge = Math.min(1, Math.max(0, (hw - av) / .03));
    const cut = CH.d * edge * edge * (3 - 2 * edge) * (1 - .35 * Math.pow(Math.min(1, av / hw), 2));
    return z + Math.min(cut, EZ - z);
  };
  const back = photoMat(tex(TEX.aBack), { roughness: .3, clearcoat: .9 });
  const fm = marbleMat(tex(TEX.aFrontBase), loader.load(TEX.aFiber), loader.load(TEX.aMask));
  const frontMesh = new THREE.Mesh(cap(1, 48, 160, frontZ, 1, false), fm);
  frontMesh.onBeforeRender = (r, s, cam) => { fm.userData.uMV.value.setFromMatrix4(new THREE.Matrix4().multiplyMatrices(cam.matrixWorldInverse, frontMesh.matrixWorld)); };
  grp.add(frontMesh);
  grp.add(new THREE.Mesh(cap(1, 96, 260, backZ, -1, true), back));
  grp.add(new THREE.Mesh(rim(1, FZ - .035, EZ, 160), new THREE.MeshPhysicalMaterial({ color: 0x2a0f08, roughness: .35, clearcoat: .5, clearcoatRoughness: .2, envMapIntensity: .35 })));
  const hw = CH.w / 2 + .03, H = CH.d;
  const br = new THREE.Shape();
  br.moveTo(-hw, 0); br.lineTo(-hw, H); br.lineTo(hw, H); br.lineTo(hw, 0);
  br.lineTo(hw - .05, 0); br.lineTo(hw - .05, H * .4); br.quadraticCurveTo(0, H * .8, -hw + .05, H * .4); br.lineTo(-hw + .05, 0); br.closePath();
  const bg = new THREE.ExtrudeGeometry(br, { depth: .3, bevelEnabled: true, bevelThickness: .012, bevelSize: .012, bevelSegments: 3, curveSegments: 8 });
  bg.rotateX(-Math.PI / 2); bg.translate(0, -.15, 0); bg.rotateZ(CH.ang - Math.PI / 2);
  bg.translate(CH.cx, CH.cy, domeZ(CH.cx, CH.cy) + CH.d);
  const bp = bg.attributes.position, buv = bg.attributes.uv;
  for (let i = 0; i < bp.count; i++) buv.setXY(i, -bp.getX(i) / 2 + .5, bp.getY(i) / 2 + .5);
  grp.add(new THREE.Mesh(bg, photoMat(tex(TEX.aBack), { roughness: .3, clearcoat: .9 })));
  return grp;
}
viewer(document.getElementById('cv'), buildA, 'v');
})();
