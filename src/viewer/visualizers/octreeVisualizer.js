import { TreeVisualizer } from "./treeVisualizer.js";

import { getHeightColor } from "../helpers/colorRamp.js";

export class OctreeVisualizer extends TreeVisualizer {
  constructor(scene) {
    super(scene);
  }

  getNodeColor(node, center, zMin, zMax, outColor) {
    getHeightColor(center.z, zMin, zMax, outColor);
  }
}