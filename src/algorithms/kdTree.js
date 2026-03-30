import { Box3 } from "three";
import { TreeNode } from "./treeNode.js";
import { BaseTree } from "./baseTree.js";

export class KdTree extends BaseTree {
  constructor(maxDepth, maxPointsPerNode) {
    super(maxDepth, maxPointsPerNode);
  }

  /**
   * Builds a k-d tree from a flat positions array [x,y,z, x,y,z, ...].
   * @param {Float32Array} positions
   */
  build(positions) {
    const { points, bounds } = this._positionsToPointsAndBounds(positions);
    if (points.length === 0) {
      this.root = null;
      return;
    }

    this.root = new TreeNode(bounds, 0);
    this.root.points = points;

    this._splitNode(this.root);
  }

  _splitNode(node) {
    if (node.depth >= this.maxDepth || node.points.length <= this.maxPointsPerNode) {
      this._finalizeLeaf(node);
      return;
    }

    const axis = node.depth % 3;
    const min = node.bounds.min;
    const max = node.bounds.max;

    const coords = node.points.map(p => axis === 0 ? p.x : axis === 1 ? p.y : p.z);
    coords.sort((a, b) => a - b);
    const splitValue = coords[Math.floor(coords.length / 2)];

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
      this._finalizeLeaf(node);
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
}
