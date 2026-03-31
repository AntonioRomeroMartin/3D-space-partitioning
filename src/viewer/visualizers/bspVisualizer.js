import * as THREE from "three";

function gatherIndices(node, out = []) {
  if (node.isLeaf) {
    const idx = node.indices;
    if (idx) for (let i = 0; i < idx.length; i++) out.push(idx[i]);
    return out;
  }
  for (const child of node.children) gatherIndices(child, out);
  return out;
}

function collectSplitPlanes(node, maxDepth, result) {
  if (!node || node.isLeaf || node.depth >= maxDepth) return;
  if (node.splitPlane) result.push(node);
  for (const child of node.children) collectSplitPlanes(child, maxDepth, result);
}

export class BspVisualizer {
  constructor(scene) {
    this.scene = scene;
    this.planeMesh = null;
    this._coloredPointCloud = null;
    this._originalColors = null;

    this.showSolid = true;
    this.showWireframe = true;

    this.planeGeometry = new THREE.PlaneGeometry(1, 1);
    this.dummy = new THREE.Object3D();
    this._tmpSize = new THREE.Vector3();
    this._zAxis = new THREE.Vector3(0, 0, 1);

    this.planeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }

  setVisibility(showSolid, showWireframe) {
    this.showSolid = showSolid;
    this.showWireframe = showWireframe;
    if (this._coloredPointCloud) this._coloredPointCloud.visible = showSolid;
    if (this.planeMesh) this.planeMesh.visible = showWireframe;
  }

  update(nodes, _zMin, _zMax, pointCloud, treeRoot, depth) {
    this.clear();
    if (!nodes || nodes.length === 0) return;

    // Recolor point cloud per cell
    if (pointCloud) {
      const colorAttr = pointCloud.geometry.attributes.color;
      this._coloredPointCloud = pointCloud;
      this._originalColors = colorAttr.array.slice();
      pointCloud.visible = this.showSolid;

      const colors = colorAttr.array;
      const tmpColor = new THREE.Color();
      const indexBuf = [];
      for (let i = 0; i < nodes.length; i++) {
        indexBuf.length = 0;
        gatherIndices(nodes[i], indexBuf);
        tmpColor.setHSL((i / nodes.length) % 1, 0.9, 0.6);
        const r = tmpColor.r, g = tmpColor.g, b = tmpColor.b;
        for (let j = 0; j < indexBuf.length; j++) {
          const base = indexBuf[j] * 3;
          colors[base]     = r;
          colors[base + 1] = g;
          colors[base + 2] = b;
        }
      }
      colorAttr.needsUpdate = true;
    }

    // Render split planes
    if (treeRoot && depth > 0) {
      const splitNodes = [];
      collectSplitPlanes(treeRoot, depth, splitNodes);
      const count = splitNodes.length;
      if (count > 0) {
        this.planeMesh = new THREE.InstancedMesh(this.planeGeometry, this.planeMaterial, count);
        for (let i = 0; i < count; i++) {
          const node = splitNodes[i];
          const { nx, ny, nz, ox, oy, oz } = node.splitPlane;
          node.bounds.getSize(this._tmpSize);
          const size = Math.max(this._tmpSize.x, this._tmpSize.y, this._tmpSize.z);
          this.dummy.position.set(ox, oy, oz);
          this.dummy.quaternion.setFromUnitVectors(this._zAxis, new THREE.Vector3(nx, ny, nz));
          this.dummy.scale.set(size, size, 1);
          this.dummy.updateMatrix();
          this.planeMesh.setMatrixAt(i, this.dummy.matrix);
        }
        this.planeMesh.instanceMatrix.needsUpdate = true;
        this.planeMesh.visible = this.showWireframe;
        this.scene.add(this.planeMesh);
      }
    }
  }

  clear() {
    if (this._coloredPointCloud && this._originalColors) {
      const colorAttr = this._coloredPointCloud.geometry.attributes.color;
      colorAttr.array.set(this._originalColors);
      colorAttr.needsUpdate = true;
      this._coloredPointCloud.visible = true;
      this._coloredPointCloud = null;
      this._originalColors = null;
    }
    if (this.planeMesh) {
      this.scene.remove(this.planeMesh);
      this.planeMesh.dispose();
      this.planeMesh = null;
    }
  }
}
