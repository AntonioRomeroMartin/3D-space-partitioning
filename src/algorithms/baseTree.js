/**
 * @namespace algorithms
 * @description Spatial partitioning tree implementations.
 */

import { Box3, Vector3 } from "three";

/**
 * Abstract base class for all spatial partitioning trees.
 * Provides shared construction helpers and the depth-based node query used by visualizers.
 * Subclasses must implement {@link BaseTree#build} and {@link BaseTree#_splitNode}.
 * @memberof algorithms
 * @alias BaseTree
 */
export class BaseTree {
  /**
   * @param {number} maxDepth - Maximum depth the tree may grow to.
   * @param {number} maxPointsPerNode - A node with this many points or fewer becomes a leaf.
   */
  constructor(maxDepth, maxPointsPerNode) {
    /** Maximum allowed depth. @type {number} */
    this.maxDepth = maxDepth;
    /** Point threshold below which a node is finalized as a leaf. @type {number} */
    this.maxPointsPerNode = maxPointsPerNode;
    /** Root node, set after {@link BaseTree#build} is called. @type {TreeNode|null} */
    this.root = null;
  }

  /**
   * Builds the tree from a flat interleaved position array.
   * @param {Float32Array} positions - Flat [x,y,z, x,y,z, …] array from a BufferGeometry.
   */
  build(positions) {
    throw new Error("BaseTree.build() must be implemented by subclasses.");
  }

  /**
   * Recursively splits a node into children according to the algorithm's strategy.
   * @param {TreeNode} node
   */
  _splitNode(node) {
    throw new Error("BaseTree._splitNode() must be implemented by subclasses.");
  }

  /**
   * Returns all nodes that should be rendered at a given display depth.
   * Nodes exactly at `targetDepth` are included; nodes shallower than `targetDepth`
   * that are already leaves are also included so the tree always appears complete.
   * @param {number} targetDepth
   * @returns {TreeNode[]}
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

  /**
   * Marks a node as a leaf, records its point count, and frees the point array.
   * Pass `pointCount` explicitly when the subclass manages points outside `node.points`
   * (e.g. index-range trees that keep a shared array on the tree itself).
   * @param {TreeNode} node
   * @param {number} [pointCount]
   */
  _finalizeLeaf(node, pointCount) {
    node.isLeaf = true;
    node.pointCount = pointCount ?? (node.points ? node.points.length : 0);
    node.points = null;
  }

  /**
   * Converts a flat positions array into an array of Vector3 points and a bounding box.
   * @param {Float32Array} positions - Flat [x,y,z, …] array.
   * @returns {{ points: THREE.Vector3[], bounds: THREE.Box3 }}
   */
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