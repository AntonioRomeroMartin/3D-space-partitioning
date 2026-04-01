import { TreeVisualizer } from "./treeVisualizer.js";
import { getHeightColor } from "../helpers/colorRamp.js";

/**
 * Visualizer for the Octree algorithm.
 * Colors each cell by the Z coordinate of its center using the blue → red height ramp.
 * @memberof viewer.visualizers
 * @alias OctreeVisualizer
 * @extends TreeVisualizer
 */
export class OctreeVisualizer extends TreeVisualizer {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    super(scene);
  }

  /**
   * Colors the node by the Z height of its center.
   * @param {TreeNode} node
   * @param {THREE.Vector3} center
   * @param {number} zMin
   * @param {number} zMax
   * @param {THREE.Color} outColor
   */
  getNodeColor(node, center, zMin, zMax, outColor) {
    getHeightColor(center.z, zMin, zMax, outColor);
  }
}