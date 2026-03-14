import { Box3, Vector3 } from "three";

export class OctreeNode {
  constructor(bounds, depth) {
    this.bounds = bounds; // THREE.Box3 representing the spatial volume
    this.depth = depth;   // How deep this node is in the tree (Root is 0)
    this.children = [];   // Will hold up to 8 child OctreeNodes
    this.points = [];     // Array of THREE.Vector3 points inside this node
    this.isLeaf = true;   // True if it hasn't been split
    this.pointCount = 0;

  }
}

export class Octree {
  constructor(maxDepth, maxPointsPerNode) {
    this.maxDepth = maxDepth;
    this.maxPointsPerNode = maxPointsPerNode;
    this.root = null;
  }

  /**
   * Kicks off the tree building process.
   * @param {Float32Array} positions - The raw position array from PCD geometry
   */
  build(positions) {
    const bounds = new Box3();
    const points = [];

    // 1. Convert flat array [x,y,z, x,y,z] into Vector3s and find the global bounding box
    for (let i = 0; i < positions.length; i += 3) {
      const point = new Vector3(positions[i], positions[i + 1], positions[i + 2]);
      points.push(point);
      bounds.expandByPoint(point);

    }

    // --- NEW: FORCE ROOT BOUNDS INTO A PERFECT CUBE ---
    const size = new Vector3();
    bounds.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z); // Find the longest side
    
    const center = new Vector3();
    bounds.getCenter(center);

    // Expand the box equally in all directions based on the longest side
    bounds.min.set(center.x - maxDim / 2, center.y - maxDim / 2, center.z - maxDim / 2);
    bounds.max.set(center.x + maxDim / 2, center.y + maxDim / 2, center.z + maxDim / 2);
    // --------------------------------------------------

    // 2. Initialize the root node with the global bounds and all points
    this.root = new OctreeNode(bounds, 0);
    this.root.points = points;

    // 3. Begin the recursive splitting
    this._splitNode(this.root);
  }

  /**
   * The core recursive function that divides a node into 8 octants.
   */
  _splitNode(node) {
    // Stopping conditions: Reached max depth, or not enough points to justify a split
    if (node.depth >= this.maxDepth || node.points.length <= this.maxPointsPerNode) {
            node.pointCount = node.points.length
            node.points = null; // Free memory since we won't need the actual points anymore
      return;
    }

    node.isLeaf = false;

    const center = new Vector3();
    node.bounds.getCenter(center);

    // Create 8 empty buckets for our points
    const pointBuckets = Array.from({ length: 8 }, () => []);

    // Distribute points into the 8 buckets based on their position relative to the center
    for (const point of node.points) {
      let octantIndex = 0;
      if (point.x >= center.x) octantIndex |= 1; // Bit 0 represents X
      if (point.y >= center.y) octantIndex |= 2; // Bit 1 represents Y
      if (point.z >= center.z) octantIndex |= 4; // Bit 2 represents Z
      
      pointBuckets[octantIndex].push(point);
    }

    // Create child nodes for each octant
    const min = node.bounds.min;
    const max = node.bounds.max;

    for (let i = 0; i < 8; i++) {
      // We only create a child node if it actually contains points.
      // This is a crucial optimization to save memory.
      if (pointBuckets[i].length > 0) {
        
        // Calculate the bounding box for this specific octant
        const childMin = new Vector3(
          (i & 1) ? center.x : min.x,
          (i & 2) ? center.y : min.y,
          (i & 4) ? center.z : min.z
        );
        const childMax = new Vector3(
          (i & 1) ? max.x : center.x,
          (i & 2) ? max.y : center.y,
          (i & 4) ? max.z : center.z
        );

        const childBounds = new Box3(childMin, childMax);
        const childNode = new OctreeNode(childBounds, node.depth + 1);
        childNode.points = pointBuckets[i];

        node.children.push(childNode);

        // Recursively split the new child
        this._splitNode(childNode);
      }
    }

    // Free up memory in the parent node since the children now own the points
    node.points = null;
  }

  /**
   * Retrieves all occupied nodes at a specific depth level.
   * This allows dynamic resolution changes in the viewer without rebuilding.
   */
  getNodesAtDepth(targetDepth) {
    const result = [];
    this._collectNodesAtDepth(this.root, targetDepth, result);
    return result;
  }

  _collectNodesAtDepth(node, targetDepth, result) {
    if (!node) return;

    // If we've reached the requested depth, OR if we hit a leaf early, collect it
    if (node.depth === targetDepth || node.isLeaf) {
      result.push(node);
      return;
    }

    // Otherwise, keep digging
    for (const child of node.children) {
      this._collectNodesAtDepth(child, targetDepth, result);
    }
  }
}