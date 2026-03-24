import * as THREE from "three";

import { TreeVisualizer } from "./treeVisualizer.js";

export class BspVisualizer extends TreeVisualizer {
  constructor(scene) {
    super(scene);

    this.axisColors = [
      new THREE.Color(0xffa347), // X plane split
      new THREE.Color(0x66d9ff), // Y plane split
      new THREE.Color(0xff7ac6), // Z plane split
    ];
  }

  getNodeColor(node, center, zMin, zMax, outColor) {
    node.bounds.getSize(this._tmpSize);

    let axis = 0;
    if (this._tmpSize.y > this._tmpSize.x && this._tmpSize.y >= this._tmpSize.z) {
      axis = 1;
    } else if (this._tmpSize.z > this._tmpSize.x && this._tmpSize.z >= this._tmpSize.y) {
      axis = 2;
    }

    const axisColor = this.axisColors[axis];
    outColor.copy(axisColor);
  }
}
