import { Box3, Vector3 } from "three";
import { TreeNode } from "./treeNode.js";

export class KdTree {
  constructor(maxDepth, maxPointsPerNode) {
    this.maxDepth = maxDepth;
    this.maxPointsPerNode = maxPointsPerNode;
    this.root = null;
  }

  /**
   * Builds a k-d tree from a flat positions array [x,y,z, x,y,z, ...].
   * @param {Float32Array} positions
   */
  build(positions) {
    const bounds = new Box3();
    const points = [];

    for (let i = 0; i < positions.length; i += 3) {
      const point = new Vector3(positions[i], positions[i + 1], positions[i + 2]);
      points.push(point);
      bounds.expandByPoint(point);
    }

    this.root = new TreeNode(bounds, 0);
    this.root.points = points;

    this._splitNode(this.root);
  }

  _splitNode(node) {
    if (node.depth >= this.maxDepth || node.points.length <= this.maxPointsPerNode) {
      node.pointCount = node.points.length;
      node.points = null;
      return;
    }

    const axis = node.depth % 3;
    const min = node.bounds.min;
    const max = node.bounds.max;

    // Midpoint split keeps build cost low and works well for interactive exploration.
    const splitValue = axis === 0
      ? (min.x + max.x) * 0.5
      : axis === 1
      ? (min.y + max.y) * 0.5
      : (min.z + max.z) * 0.5;

    const leftPoints = [];
    const rightPoints = [];

    for (const point of node.points) {
      const coordinate = axis === 0 ? point.x : axis === 1 ? point.y : point.z;
      if (coordinate < splitValue) {
        leftPoints.push(point);
      } else {
        rightPoints.push(point);
      }
    }

    // Degenerate split protection: stop if partition didn't separate points.
    if (leftPoints.length === 0 || rightPoints.length === 0) {
      node.pointCount = node.points.length;
      node.points = null;
      return;
    }

    node.isLeaf = false;

    const leftMin = min.clone();
    const leftMax = max.clone();
    const rightMin = min.clone();
    const rightMax = max.clone();

    if (axis === 0) {
      leftMax.x = splitValue;
      rightMin.x = splitValue;
    } else if (axis === 1) {
      leftMax.y = splitValue;
      rightMin.y = splitValue;
    } else {
      leftMax.z = splitValue;
      rightMin.z = splitValue;
    }

    const leftNode = new TreeNode(new Box3(leftMin, leftMax), node.depth + 1);
    leftNode.points = leftPoints;

    const rightNode = new TreeNode(new Box3(rightMin, rightMax), node.depth + 1);
    rightNode.points = rightPoints;

    node.children.push(leftNode, rightNode);
    node.points = null;

    this._splitNode(leftNode);
    this._splitNode(rightNode);
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
}
