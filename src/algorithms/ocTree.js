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
 * Points are tracked as integer indices into the original Float32Array throughout
 * construction, avoiding per-point heap allocation. All index arrays are freed
 * after the tree is built.
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
   * Pre-allocates one set of 8 integer-index bucket arrays per depth level so that
   * no new arrays are created during recursive splitting.
   * @param {Float32Array} positions - Flat [x,y,z, …] array from PCD geometry.
   */
  build(positions) {
    const n = positions.length / 3;
    if (n === 0) { this.root = null; return; }

    this._positions = positions;
    const bounds = this._computeBoundsFromPositions(positions);

    // --- FORCE ROOT BOUNDS INTO A PERFECT CUBE ---
    const size = new Vector3();
    bounds.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const center = new Vector3();
    bounds.getCenter(center);
    bounds.min.set(center.x - maxDim / 2, center.y - maxDim / 2, center.z - maxDim / 2);
    bounds.max.set(center.x + maxDim / 2, center.y + maxDim / 2, center.z + maxDim / 2);
    // --------------------------------------------------

    // Pre-allocate one set of 8 buckets per depth level, reused across all nodes
    // at that level via .length = 0 reset (avoids 8 new arrays per internal node).
    this._buckets = Array.from(
      { length: this.maxDepth + 1 },
      () => Array.from({ length: 8 }, () => [])
    );

    // Build initial index list [0, 1, …, n-1].
    const allIndices = [];
    for (let i = 0; i < n; i++) allIndices.push(i);

    this.root = new TreeNode(bounds, 0);
    this.root.points = allIndices;

    this._splitNode(this.root);

    // Release construction-time references.
    this._positions = null;
    this._buckets = null;
  }

  /**
   * Recursively divides a node into up to 8 octants.
   * Points are tracked as integer indices into `this._positions`.
   * Each point is assigned to an octant using a 3-bit index: bit 0 = X, bit 1 = Y,
   * bit 2 = Z. The same index drives the child bounding-box computation, keeping
   * assignment and geometry fully consistent.
   * Only octants that contain at least one point produce a child node.
   * Reuses the pre-allocated bucket arrays from `this._buckets[node.depth]`,
   * resetting each via `.length = 0` to avoid per-node array allocation.
   * @param {TreeNode} node - The node to split.
   */
  _splitNode(node) {
    // Stopping conditions: reached max depth, or not enough points to justify a split.
    if (node.depth >= this.maxDepth || node.points.length <= this.maxPointsPerNode) {
      this._finalizeLeaf(node);
      return;
    }

    const pos     = this._positions;
    const centerX = (node.bounds.min.x + node.bounds.max.x) * 0.5;
    const centerY = (node.bounds.min.y + node.bounds.max.y) * 0.5;
    const centerZ = (node.bounds.min.z + node.bounds.max.z) * 0.5;

    const pointBuckets = this._buckets[node.depth];
    for (let i = 0; i < 8; i++) pointBuckets[i].length = 0;

    for (const idx of node.points) {
      const base = idx * 3;
      let octantIndex = 0;
      if (pos[base]     >= centerX) octantIndex |= 1; // bit 0 = X
      if (pos[base + 1] >= centerY) octantIndex |= 2; // bit 1 = Y
      if (pos[base + 2] >= centerZ) octantIndex |= 4; // bit 2 = Z
      pointBuckets[octantIndex].push(idx);
    }

    node.isLeaf = false;

    const min = node.bounds.min;
    const max = node.bounds.max;

    for (let i = 0; i < 8; i++) {
      // Only create a child node for non-empty octants (sparse octree).
      if (pointBuckets[i].length > 0) {
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
        const childNode   = new TreeNode(childBounds, node.depth + 1);
        childNode.points  = pointBuckets[i];

        node.children.push(childNode);
        this._splitNode(childNode);
      }
    }

    // Free up memory in the parent node — children now own the index arrays.
    node.points = null;
  }
}
