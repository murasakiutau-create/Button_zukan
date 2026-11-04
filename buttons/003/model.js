/* No.003 */
(() => {
const TEX = {"cPearl": "front.jpg", "cFiber": "sheen.png", "cBack": "back.jpg"};
function buildC() {
  const grp = new THREE.Group();
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xe3c47e, metalness: 1, roughness: .06, clearcoat: .5, clearcoatRoughness: .03, envMapIntensity: 1.35, side: THREE.DoubleSide });
  // frame profile (radius, height) from the bezel lip out to the back edge
  const prof = [[.78, .15], [.795, .17], [.815, .164], [.83, .146], [.875, .128], [.925, .1], [.965, .066], [.99, .036], [1, .01], [1, -.07], [.985, -.1], [.97, -.11]];
  const lg = new THREE.LatheGeometry(prof.map(([r, z]) => new THREE.Vector2(r, z)), 160);
  lg.rotateX(Math.PI / 2);
  grp.add(new THREE.Mesh(lg, gold));
  // back plate from the photo
  const back = new THREE.MeshPhysicalMaterial({ map: tex(TEX.cBack), metalness: 1, roughness: .14, envMapIntensity: 1.25, color: 0xf2e6cc });
  grp.add(new THREE.Mesh(cap(.97, 6, 160, () => -.11, -1, true), back));
  // pearly dome
  const R = .8, base = .12, rise = .15;
  const domeZ = (x, y) => { const t = Math.min(1, Math.hypot(x, y) / R); return base + rise * Math.pow(1 - t * t, .55); };
  const fib = loader.load(TEX.cFiber);
  const pm = pearlMat(tex(TEX.cPearl), fib);
  const dome = new THREE.Mesh(cap(R, 56, 180, domeZ, 1, false), pm);
  dome.onBeforeRender = (r, s, cam) => {
    const mv = new THREE.Matrix4().multiplyMatrices(cam.matrixWorldInverse, dome.matrixWorld);
    pm.userData.uMV.value.setFromMatrix4(mv);
  };
  grp.add(dome);
  // tiny shank on the back
  const s = new THREE.Shape();
  s.moveTo(-.11, 0); s.lineTo(-.11, .1); s.quadraticCurveTo(-.11, .15, -.06, .15); s.lineTo(.06, .15); s.quadraticCurveTo(.11, .15, .11, .1); s.lineTo(.11, 0);
  s.lineTo(.07, 0); s.lineTo(.07, .08); s.quadraticCurveTo(.07, .11, .04, .11); s.lineTo(-.04, .11); s.quadraticCurveTo(-.07, .11, -.07, .08); s.lineTo(-.07, 0); s.closePath();
  const sg = new THREE.ExtrudeGeometry(s, { depth: .07, bevelEnabled: true, bevelThickness: .01, bevelSize: .01, bevelSegments: 2, curveSegments: 8 });
  sg.rotateX(-Math.PI / 2); sg.translate(0, -.035, 0); sg.rotateZ(.5); sg.translate(-.02, .1, -.105);
  grp.add(new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ color: 0xe3c47e, metalness: 1, roughness: .1, envMapIntensity: 1.35 })));
  return grp;
}
buildC.env = 'jewel';
viewer(document.getElementById('cv'), buildC, 'v');
})();
