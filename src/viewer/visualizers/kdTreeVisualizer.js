import * as THREE from "three";
import { TreeVisualizer } from "./treeVisualizer.js";

/**
 * Visualizer for the k-d Tree algorithm.
 * Colors each cell by its splitting axis: red = X, green = Y, blue = Z.
 * The axis is determined by `node.depth % 3`, matching the build strategy.
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
    /** One color per axis (X, Y, Z). @type {THREE.Color[]} */
    this.axisColors = [
      new THREE.Color(0xff4d4d), // X axis split
      new THREE.Color(0x4dd26f), // Y axis split
      new THREE.Color(0x4d8cff), // Z axis split
    ];
  }

  /**
   * Colors the node by the axis used at its depth level.
   * @param {TreeNode} node
   * @param {THREE.Vector3} center
   * @param {number} zMin
   * @param {number} zMax
   * @param {THREE.Color} outColor
   */
  getNodeColor(node, center, zMin, zMax, outColor) {
    const axisColor = this.axisColors[node.depth % 3];
    outColor.copy(axisColor);
  }
}
