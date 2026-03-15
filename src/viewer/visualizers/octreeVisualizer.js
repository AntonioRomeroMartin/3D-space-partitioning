import * as THREE from "three";

import { getHeightColor } from "../helpers/colorRamp.js";

export class OctreeVisualizer {
  constructor(scene) {
    this.scene = scene;
    this.solidMesh = null;
    this.wireframeMesh = null;

    this.boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.dummy = new THREE.Object3D();

    this.showSolid = true;
    this.showWireframe = true;

    this.solidMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7,
      roughness: 0.4,
      metalness: 0.1,
    });

    this.wireMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
  }

  setVisibility(showSolid, showWireframe) {
    this.showSolid = showSolid;
    this.showWireframe = showWireframe;

    if (this.solidMesh) this.solidMesh.visible = this.showSolid;
    if (this.wireframeMesh) this.wireframeMesh.visible = this.showWireframe;
  }

  update(nodes, zMin, zMax) {
    this.clear();

    if (!nodes || nodes.length === 0) return;

    const count = nodes.length;
    this.solidMesh = new THREE.InstancedMesh(this.boxGeometry, this.solidMaterial, count);
    this.wireframeMesh = new THREE.InstancedMesh(this.boxGeometry, this.wireMaterial, count);

    const colorArray = new Float32Array(count * 3);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const node = nodes[i];

      node.bounds.getCenter(center);
      node.bounds.getSize(size);

      this.dummy.position.copy(center);
      this.dummy.scale.copy(size);
      this.dummy.updateMatrix();

      this.solidMesh.setMatrixAt(i, this.dummy.matrix);
      this.wireframeMesh.setMatrixAt(i, this.dummy.matrix);

      getHeightColor(center.z, zMin, zMax, tempColor);
      tempColor.toArray(colorArray, i * 3);
    }

    this.solidMesh.instanceColor = new THREE.InstancedBufferAttribute(colorArray, 3);
    this.solidMesh.instanceMatrix.needsUpdate = true;
    this.solidMesh.instanceColor.needsUpdate = true;
    this.wireframeMesh.instanceMatrix.needsUpdate = true;

    this.solidMesh.visible = this.showSolid;
    this.wireframeMesh.visible = this.showWireframe;

    this.scene.add(this.solidMesh);
    this.scene.add(this.wireframeMesh);
  }

  clear() {
    if (this.solidMesh) {
      this.scene.remove(this.solidMesh);
      this.solidMesh.dispose();
      this.solidMesh = null;
    }

    if (this.wireframeMesh) {
      this.scene.remove(this.wireframeMesh);
      this.wireframeMesh.dispose();
      this.wireframeMesh = null;
    }
  }
}