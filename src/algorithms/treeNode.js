/**
 * A single node in a spatial partitioning tree (Octree, k-d Tree, or BSP Tree).
 * Internal nodes store child references; leaf nodes store point counts and,
 * for BSP trees, a typed index array into the original geometry buffer.
 * @memberof algorithms
 * @alias TreeNode
 */
export class TreeNode {
  /**
   * @param {THREE.Box3} bounds - Axis-aligned bounding box for this node's region.
   * @param {number} depth - Depth of this node in the tree (root = 0).
   */
  constructor(bounds, depth) {
    /** Axis-aligned bounding box of this node's spatial region. @type {THREE.Box3} */
    this.bounds = bounds;
    /** Depth of this node (root = 0). @type {number} */
    this.depth = depth;
    /** Child nodes. Empty for leaf nodes. @type {TreeNode[]} */
    this.children = [];
    /** Points held during construction; nulled out after splitting. @type {THREE.Vector3[]|null} */
    this.points = [];
    /** True if this node has no children (is a leaf). @type {boolean} */
    this.isLeaf = true;
    /** Number of points contained in this leaf. @type {number} */
    this.pointCount = 0;
  }
}
