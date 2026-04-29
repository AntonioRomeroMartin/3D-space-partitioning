import * as THREE from "three";
import { TreeVisualizer } from "./treeVisualizer.js";

/**
 * Visualizer for the k-d Tree algorithm.
 * Colors each cell by the axis actually used for the split: red = X, green = Y, blue = Z.
 * Colors match the XYZ axis helper in the scene exactly.
 * The axis is read from `node.splitAxis` (set during build) so it works correctly
 * for all split modes (cycle, widest, variance).
 * @memberof viewer.visualizers
 * @alias KdTreeVisualizer
 * @extends TreeVisualizer
 */
export class KdTreeVisualizer extends TreeVisualizer {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    super(scene);
    /** One color per axis (X, Y, Z) — identical to the scene axis helper. @type {THREE.Color[]} */
    this.axisColors = [
      new THREE.Color(0xff4444), // X — red
      new THREE.Color(0x44ff44), // Y — green
      new THREE.Color(0x4466ff), // Z — blue
    ];
  }

  /**
   * Colors the node by the axis that split its parent to create it (`node.splitAxis`).
   * Falls back to `depth % 3` for the root, which has no parent split.
   * @param {TreeNode} node
   * @param {THREE.Vector3} center
   * @param {number} zMin
   * @param {number} zMax
   * @param {THREE.Color} outColor
   */
  getNodeColor(node, center, zMin, zMax, outColor) {
    const axis = node.splitAxis ?? node.depth % 3;
    outColor.copy(this.axisColors[axis]);
  }
}
