import { Box3 } from "three";
import { TreeNode } from "./treeNode.js";
import { BaseTree } from "./baseTree.js";

/**
 * k-d Tree spatial partitioning structure.
 *
 * At each level the splitting axis cycles through X → Y → Z (depth % 3).
 * The split plane is placed at the midpoint of the current node's bounding box
 * along the active axis, giving O(n log n) total build time. Points are
 * partitioned into a left child (coord < splitValue) and a right child
 * (coord ≥ splitValue); degenerate splits that produce an empty side
 * finalize the node as a leaf instead.
 *
 * @extends BaseTree
 */
export class KdTree extends BaseTree {
  /**
   * @param {number} maxDepth - Maximum recursion depth.
   * @param {number} maxPointsPerNode - Leaf threshold.
   */
  constructor(maxDepth, maxPointsPerNode) {
    super(maxDepth, maxPointsPerNode);
  }

  /**
   * Builds the k-d tree from a flat interleaved position array.
   * @param {Float32Array} positions - Flat [x,y,z, …] array from PCD geometry.
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

  /**
   * Recursively splits a node by the bounding-box midpoint along the current axis.
   * Degenerate splits (all points fall on one side) finalize the node as a leaf.
   * @param {TreeNode} node - The node to split.
   */
  _splitNode(node) {
    if (node.depth >= this.maxDepth || node.points.length <= this.maxPointsPerNode) {
      this._finalizeLeaf(node);
      return;
    }

    const axis = node.depth % 3;
    const min = node.bounds.min;
    const max = node.bounds.max;

    // Midpoint split: O(1) to compute, O(n) to partition — keeps total build at O(n log n).
    const splitValue = axis === 0
      ? (min.x + max.x) * 0.5
      : axis === 1
      ? (min.y + max.y) * 0.5
      : (min.z + max.z) * 0.5;

    const leftPoints = [];
    const rightPoints = [];

    for (const point of node.points) {
      const coord = axis === 0 ? point.x : axis === 1 ? point.y : point.z;
      if (coord < splitValue) leftPoints.push(point);
      else rightPoints.push(point);
    }

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
