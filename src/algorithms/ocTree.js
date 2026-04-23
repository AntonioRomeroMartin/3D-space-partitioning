import { Box3, Vector3 } from "three";
import { TreeNode } from "./treeNode.js";
import { BaseTree } from "./baseTree.js";

/**
 * Octree spatial partitioning structure.
 *
 * Recursively divides a cubic region into 8 equal octants along all three axes
 * simultaneously. Each split produces up to 8 children, one per octant that
 * contains at least one point. The root bounds are forced into a perfect cube
 * so all child cells remain axis-aligned cubes at every depth level.
 *
 * @memberof algorithms
 * @alias Octree
 * @extends BaseTree
 */
export class Octree extends BaseTree {
  /**
   * @param {number} maxDepth - Maximum recursion depth.
   * @param {number} maxPointsPerNode - Leaf threshold.
   */
  constructor(maxDepth, maxPointsPerNode) {
    super(maxDepth, maxPointsPerNode);
  }

  /**
   * Builds the Octree from a flat interleaved position array.
   * The global bounding box is expanded to a perfect cube before splitting begins.
   * Pre-allocates one set of 8 point buckets per depth level in `this._buckets`
   * so that no new arrays are created during recursive splitting.
   * @param {Float32Array} positions - Flat [x,y,z, …] array from PCD geometry.
   */
  build(positions) {
    const { points, bounds } = this._positionsToPointsAndBounds(positions);
    if (points.length === 0) {
      this.root = null;
      return;
    }

    // --- FORCE ROOT BOUNDS INTO A PERFECT CUBE ---
    const size = new Vector3();
    bounds.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);

    const center = new Vector3();
    bounds.getCenter(center);

    // Expand the box equally in all directions based on the longest side
    bounds.min.set(center.x - maxDim / 2, center.y - maxDim / 2, center.z - maxDim / 2);
    bounds.max.set(center.x + maxDim / 2, center.y + maxDim / 2, center.z + maxDim / 2);
    // --------------------------------------------------

    // Pre-allocate one set of 8 buckets per depth level, reused across all nodes
    // at that level via .length = 0 reset (avoids 8 new arrays per internal node).
    this._buckets = Array.from(
      { length: this.maxDepth + 1 },
      () => Array.from({ length: 8 }, () => [])
    );

    this.root = new TreeNode(bounds, 0);
    this.root.points = points;

    this._splitNode(this.root);
  }

  /**
   * Recursively divides a node into up to 8 octants.
   * Points are assigned to octants using bitwise flags on the X, Y, Z axes.
   * Only octants that contain at least one point produce a child node.
   * Reuses the pre-allocated bucket arrays from `this._buckets[node.depth]`,
   * resetting each via `.length = 0` to avoid per-node array allocation.
   * @param {TreeNode} node - The node to split.
   */
  _splitNode(node) {
    // Stopping conditions: Reached max depth, or not enough points to justify a split
    if (node.depth >= this.maxDepth || node.points.length <= this.maxPointsPerNode) {
      this._finalizeLeaf(node);
      return;
    }

    const centerX = (node.bounds.min.x + node.bounds.max.x) * 0.5;
    const centerY = (node.bounds.min.y + node.bounds.max.y) * 0.5;
    const centerZ = (node.bounds.min.z + node.bounds.max.z) * 0.5;

    const pointBuckets = this._buckets[node.depth];
    for (let i = 0; i < 8; i++) pointBuckets[i].length = 0;

    for (const point of node.points) {
      let octantIndex = 0;
      if (point.x >= centerX) octantIndex |= 1; // Bit 0 represents X
      if (point.y >= centerY) octantIndex |= 2; // Bit 1 represents Y
      if (point.z >= centerZ) octantIndex |= 4; // Bit 2 represents Z

      pointBuckets[octantIndex].push(point);
    }

    node.isLeaf = false;

    // Create child nodes for each octant
    const min = node.bounds.min;
    const max = node.bounds.max;

    for (let i = 0; i < 8; i++) {
      // We only create a child node if it actually contains points.
      // This is a crucial optimization to save memory.
      if (pointBuckets[i].length > 0) {

        // Calculate the bounding box for this specific octant
        const childMin = new Vector3(
          (i & 1) ? centerX : min.x,
          (i & 2) ? centerY : min.y,
          (i & 4) ? centerZ : min.z
        );
        const childMax = new Vector3(
          (i & 1) ? max.x : centerX,
          (i & 2) ? max.y : centerY,
          (i & 4) ? max.z : centerZ
        );

        const childBounds = new Box3(childMin, childMax);
        const childNode = new TreeNode(childBounds, node.depth + 1);
        childNode.points = pointBuckets[i];

        node.children.push(childNode);

        // Recursively split the new child
        this._splitNode(childNode);
      }
    }

    // Free up memory in the parent node since the children now own the points
    node.points = null;
  }
}