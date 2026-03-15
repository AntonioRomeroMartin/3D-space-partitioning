import * as THREE from "three";

export function createLabeledAxes() {

  const group = new THREE.Group();
  const len = 2;
  const radius = 0.01;
  const geom = new THREE.CylinderGeometry(radius, radius, len, 14);

  function makeLabel(text, color) {

    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.font = "bold 90px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.fillText(text, 64, 64);
    return new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c) }));

  }

  const x = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color: 0xff4444 }));
  x.rotation.z = -Math.PI / 2;
  const y = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color: 0x44ff44 }));
  const z = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color: 0x4466ff }));
  z.rotation.x = Math.PI / 2;
  group.add(x, y, z);

  const lx = makeLabel("X", "#ff6666");
  const ly = makeLabel("Y", "#66ff66");
  const lz = makeLabel("Z", "#66a0ff");
  if (lx && ly && lz) {
    lx.position.set(len * 0.62, 0, 0);
    ly.position.set(0, len * 0.62, 0);
    lz.position.set(0, 0, len * 0.62);
    lx.scale.setScalar(0.22);
    ly.scale.setScalar(0.22);
    lz.scale.setScalar(0.22);
    group.add(lx, ly, lz);
  }

  return group;

}
