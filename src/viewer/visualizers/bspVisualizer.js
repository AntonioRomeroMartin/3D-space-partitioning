import * as THREE from "three";

/**
 * Recursively collects all geometry indices from the leaves of a BSP subtree.
 * Uses an imperative accumulator to avoid intermediate array allocations.
 * @param {TreeNode} node
 * @param {number[]} out - Accumulator array to push indices into.
 * @returns {number[]}
 * @inner
 */
function gatherIndices(node, out = []) {
  if (node.isLeaf) {
    const idx = node.indices;
    if (idx) for (let i = 0; i < idx.length; i++) out.push(idx[i]);
    return out;
  }
  for (const child of node.children) gatherIndices(child, out);
  return out;
}

/**
 * Recursively collects all internal BSP nodes up to (but not including) `maxDepth`.
 * Each collected node carries a `splitPlane` property used to render the cutting plane.
 * @param {TreeNode} node
 * @param {number} maxDepth - Display depth; only nodes with depth < maxDepth are included.
 * @param {TreeNode[]} result - Accumulator array.
 * @inner
 */
function collectSplitPlanes(node, maxDepth, result) {
  if (!node || node.isLeaf || node.depth >= maxDepth) return;
  if (node.splitPlane) result.push(node);
  for (const child of node.children) collectSplitPlanes(child, maxDepth, result);
}

/**
 * Visualizer for the BSP Tree algorithm.
 *
 * Unlike the Octree/KdTree visualizers, BSP does not render bounding boxes.
 * Instead it directly recolors the existing point cloud geometry buffer,
 * assigning each leaf cell a distinct HSL color. Split planes are rendered
 * as semi-transparent {@link THREE.InstancedMesh} quads oriented to the PCA normal.
 *
 * On {@link BspVisualizer#clear}, the original height-ramp colors are restored.
 */
export class BspVisualizer {
  /**
   * @param {THREE.Scene} scene
   */
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

  /**
   * Controls point cloud and split-plane visibility independently.
   * @param {boolean} showSolid - Whether the recolored point cloud is visible.
   * @param {boolean} showWireframe - Whether the split-plane quads are visible.
   */
  setVisibility(showSolid, showWireframe) {
    this.showSolid = showSolid;
    this.showWireframe = showWireframe;
    if (this._coloredPointCloud) this._coloredPointCloud.visible = showSolid;
    if (this.planeMesh) this.planeMesh.visible = showWireframe;
  }

  /**
   * Recolors the point cloud per BSP leaf cell and renders the split planes.
   * @param {TreeNode[]} nodes - Active leaf nodes at the current display depth.
   * @param {number} _zMin - Unused (required for interface compatibility).
   * @param {number} _zMax - Unused (required for interface compatibility).
   * @param {THREE.Points} pointCloud - The loaded point cloud whose color buffer is rewritten.
   * @param {TreeNode|null} treeRoot - Root of the BSP tree, used to traverse for split planes.
   * @param {number} depth - Current display depth; planes at depth < this value are shown.
   */
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

  /**
   * Restores the original height-ramp colors on the point cloud and removes split-plane meshes.
   */
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
