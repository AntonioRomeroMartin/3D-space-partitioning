import * as THREE from "three";

import { TreeVisualizer } from "./treeVisualizer.js";

export class KdTreeVisualizer extends TreeVisualizer {
  constructor(scene) {
    super(scene);

    this.axisColors = [
      new THREE.Color(0xff4d4d), // X axis split
      new THREE.Color(0x4dd26f), // Y axis split
      new THREE.Color(0x4d8cff), // Z axis split
    ];
  }

  getNodeColor(node, center, zMin, zMax, outColor) {
    const axisColor = this.axisColors[node.depth % 3];
    outColor.copy(axisColor);
  }
}
