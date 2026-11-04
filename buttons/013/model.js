/* No.013 */
(() => {
const TEX = {"front": "front.jpg", "back": "back.jpg"};
/* No.013 cocoa-brown button: a glossy raised rim around a recessed satin-gold centre whose soft sheen slides as it turns */
function buildM() {
  const grp = new THREE.Group();
  const CX = .03, CY = .03;
  // smooth, gently rounded face: the dark ring is only colour, not a step or a groove
  const frontZ = (x, y) => { const r = Math.min(1, Math.hypot(x, y)); const e = Math.max(0, (r - .8) / .2); return .02 + .07 * (1 - r * r * .35) - .06 * e * e; };
  // show the photo as it is: its own colour does most of the work, with only a clear gloss on top
  const ft = tex(TEX.front);
  const fm = new THREE.MeshPhysicalMaterial({ map: ft, emissiveMap: ft, emissive: 0xffffff, emissiveIntensity: .55,
    roughness: .5, metalness: 0, clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: .25 });
  grp.add(new THREE.Mesh(cap(1, 96, 240, frontZ, 1, false), fm));
  grp.add(new THREE.Mesh(rim(1, .022, -.04, 200), new THREE.MeshPhysicalMaterial({ color: 0x3e2614, roughness: .2, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: .6 })));
  // back: deep satin dome with a horizontal channel and a bridge (photo already mirrored)
  const CH = { cx: -.05, cy: -.03, w: .2, L: .82, d: .14, bridge: .3 };
  const dome = (x, y) => { const r = Math.min(1, Math.hypot(x, y)); return -.3 * Math.pow(1 - r * r, .7); };
  const slot = (x, y) => {
    const u = x - CH.cx, v = y - CH.cy, au = Math.abs(u), hw = CH.w / 2;
    if (au > CH.L) return 0;
    const ends = Math.min(1, (CH.L - au) / .06);
    const side = Math.min(1, Math.max(0, (hw * Math.sqrt(Math.max(0, 1 - Math.pow(au / CH.L, 8))) - Math.abs(v)) / .02));
    return CH.d * ends * side * side * (3 - 2 * side);
  };
  const BZ = -.04;
  const backZ = (x, y) => { const z = dome(x, y); return BZ + z + Math.min(slot(x, y), -z); };
  const backMat = photoMat(tex(TEX.back), { roughness: .3, clearcoat: .9, clearcoatRoughness: .08, side: THREE.DoubleSide });
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
viewer(document.getElementById('cv'), buildM, 'v');
})();
