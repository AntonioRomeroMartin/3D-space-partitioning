import { Box3, Vector3 } from "three";
import { TreeNode } from "./treeNode.js";
import { BaseTree } from "./baseTree.js";

export class BspTree extends BaseTree {
  constructor(maxDepth, maxPointsPerNode) {
    super(maxDepth, maxPointsPerNode);
    this._tmpSize = new Vector3();
  }

  /**
   * Builds a BSP tree from a flat positions array [x,y,z, x,y,z, ...].
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

    const min = node.bounds.min;
    const max = node.bounds.max;

    node.bounds.getSize(this._tmpSize);

    // BSP split plane: choose the longest axis, then split at midpoint.
    let axis = 0;
    if (this._tmpSize.y > this._tmpSize.x && this._tmpSize.y >= this._tmpSize.z) {
      axis = 1;
    } else if (this._tmpSize.z > this._tmpSize.x && this._tmpSize.z >= this._tmpSize.y) {
      axis = 2;
    }

    const splitValue =
      axis === 0
        ? (min.x + max.x) * 0.5
        : axis === 1
          ? (min.y + max.y) * 0.5
          : (min.z + max.z) * 0.5;

    const frontPoints = [];
    const backPoints = [];

    for (const point of node.points) {
      const coordinate = axis === 0 ? point.x : axis === 1 ? point.y : point.z;
      if (coordinate < splitValue) {
        backPoints.push(point);
      } else {
        frontPoints.push(point);
      }
    }

    // Degenerate split protection: no partition, keep as leaf.
    if (frontPoints.length === 0 || backPoints.length === 0) {
      this._finalizeLeaf(node);
      return;
    }

    node.isLeaf = false;

    const backMin = min.clone();
    const backMax = max.clone();
    const frontMin = min.clone();
    const frontMax = max.clone();

    if (axis === 0) {
      backMax.x = splitValue;
      frontMin.x = splitValue;
    } else if (axis === 1) {
      backMax.y = splitValue;
      frontMin.y = splitValue;
    } else {
      backMax.z = splitValue;
      frontMin.z = splitValue;
    }

    const backNode = new TreeNode(new Box3(backMin, backMax), node.depth + 1);
    backNode.points = backPoints;

    const frontNode = new TreeNode(new Box3(frontMin, frontMax), node.depth + 1);
    frontNode.points = frontPoints;

    node.children.push(backNode, frontNode);
    node.points = null;

    this._splitNode(backNode);
    this._splitNode(frontNode);
  }
}
