/**
 * A single node in a spatial partitioning tree (Octree, k-d Tree, or BSP Tree).
 * Internal nodes store child references; leaf nodes store point counts and,
 * for BSP trees, a typed index array into the original geometry buffer.
 */
export class TreeNode {
  /**
   * @param {THREE.Box3} bounds - Axis-aligned bounding box for this node's region.
   * @param {number} depth - Depth of this node in the tree (root = 0).
   */
  constructor(bounds, depth) {
    /** @type {THREE.Box3} Axis-aligned bounding box of this node's spatial region. */
    this.bounds = bounds;
    /** @type {number} Depth of this node (root = 0). */
    this.depth = depth;
    /** @type {TreeNode[]} Child nodes. Empty for leaf nodes. */
    this.children = [];
    /** @type {THREE.Vector3[]|null} Points held during construction; nulled out after splitting. */
    this.points = [];
    /** @type {boolean} True if this node has no children (is a leaf). */
    this.isLeaf = true;
    /** @type {number} Number of points contained in this leaf. */
    this.pointCount = 0;
  }
}
