import { Box3, Vector3 } from "three";

export class BaseTree {
  constructor(maxDepth, maxPointsPerNode) {
    this.maxDepth = maxDepth;
    this.maxPointsPerNode = maxPointsPerNode;
    this.root = null;
  }

  build(positions) {
    throw new Error("BaseTree.build() must be implemented by subclasses.");
  }

  _splitNode(node) {
    throw new Error("BaseTree._splitNode() must be implemented by subclasses.");
  }

  /**
   * Returns occupied nodes at a target depth, or earlier leaves where branches end.
   */
  getNodesAtDepth(targetDepth) {
    const safeDepth = Math.max(0, targetDepth | 0);
    const result = [];
    if (!this.root) return result;

    const stack = [this.root];

    while (stack.length > 0) {
      const node = stack.pop();
      if (!node) continue;

      if (node.depth === safeDepth || node.isLeaf) {
        result.push(node);
        continue;
      }

      for (let i = node.children.length - 1; i >= 0; i--) {
        stack.push(node.children[i]);
      }
    }

    return result;
  }

  _finalizeLeaf(node) {
    node.isLeaf = true;
    node.pointCount = node.points ? node.points.length : 0;
    node.points = null;
  }

  _positionsToPointsAndBounds(positions) {
    const bounds = new Box3();
    const points = [];

    for (let i = 0; i + 2 < positions.length; i += 3) {
      const point = new Vector3(positions[i], positions[i + 1], positions[i + 2]);
      points.push(point);
      bounds.expandByPoint(point);
    }

    if (points.length === 0) {
      const zero = new Vector3(0, 0, 0);
      bounds.set(zero, zero);
    }

    return { points, bounds };
  }
}