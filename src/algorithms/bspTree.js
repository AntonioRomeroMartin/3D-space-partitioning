import { Box3 } from "three";
import { TreeNode } from "./treeNode.js";
import { BaseTree } from "./baseTree.js";

/**
 * BSP (Binary Space Partitioning) tree spatial partitioning structure.
 *
 * Recursively splits the point cloud using planes aligned to the principal axis (PCA) of the points in each node.
 * Each split divides the node into two children (front and back) until the maximum depth or minimum point threshold is reached.
 *
 * @memberof algorithms
 * @alias BspTree
 * @extends BaseTree
 */
export class BspTree extends BaseTree {
  /**
   * @param {number} maxDepth - Maximum recursion depth.
   * @param {number} maxPointsPerNode - Leaf threshold.
   */
  constructor(maxDepth, maxPointsPerNode) {
    super(maxDepth, maxPointsPerNode);
  }

  /**
   * Builds the BSP tree from a flat interleaved position array.
   * Pre-allocates three Float32Arrays (`this._wx`, `this._wy`, `this._wz`) sized
   * to the total point count, reused by every `_computePrincipalAxis` call to
   * avoid per-node typed-array allocation during recursive splitting.
   * @param {Float32Array} positions - Flat [x,y,z, …] array from PCD geometry.
   */
  build(positions) {
    const { points, bounds } = this._positionsToPointsAndBounds(positions);
    if (points.length === 0) {
      this.root = null;
      return;
    }

    this._wx = new Float32Array(points.length);
    this._wy = new Float32Array(points.length);
    this._wz = new Float32Array(points.length);

    this.root = new TreeNode(bounds, 0);
    this.root.points = points;

    this._splitNode(this.root);
  }

  /**
   * Converts a flat positions array into an array of Vector3 points and a bounding box.
   * Stores the original geometry index on each point for later use by the visualizer.
   * @param {Float32Array} positions - Flat [x,y,z, …] array.
   * @returns {{ points: THREE.Vector3[], bounds: THREE.Box3 }}
   * @protected
   */
  _positionsToPointsAndBounds(positions) {
    const result = super._positionsToPointsAndBounds(positions);
    for (let i = 0; i < result.points.length; i++) {
      result.points[i].originalIndex = i;
    }
    return result;
  }

  /**
   * Marks a node as a leaf, records its point count, and stores only the geometry indices as a typed array.
   * @param {TreeNode} node
   * @protected
   */
  _finalizeLeaf(node) {
    node.isLeaf = true;
    const pts = node.points;
    const n = pts ? pts.length : 0;
    node.pointCount = n;
    const indices = new Int32Array(n);
    for (let i = 0; i < n; i++) indices[i] = pts[i].originalIndex;
    node.indices = indices;
    node.points = null;
  }

  /**
   * Computes the principal axis (dominant eigenvector) of the covariance matrix
   * of the points using power iteration (20 iterations).
   * Returns the axis (nx, ny, nz) and the centroid (ox, oy, oz) as the split origin.
   * Coordinates are copied into the pre-allocated `this._wx/_wy/_wz` arrays for
   * cache-friendly covariance computation — no per-call allocations.
   * @param {THREE.Vector3[]} points
   * @returns {{ nx: number, ny: number, nz: number, ox: number, oy: number, oz: number }}
   * @protected
   */
  _computePrincipalAxis(points) {
    const n = points.length;
    const xs = this._wx;
    const ys = this._wy;
    const zs = this._wz;

    let mx = 0, my = 0, mz = 0;
    for (let i = 0; i < n; i++) {
      const p = points[i];
      xs[i] = p.x; ys[i] = p.y; zs[i] = p.z;
      mx += p.x; my += p.y; mz += p.z;
    }
    mx /= n; my /= n; mz /= n;

    let cxx = 0, cyy = 0, czz = 0, cxy = 0, cxz = 0, cyz = 0;
    for (let i = 0; i < n; i++) {
      const dx = xs[i] - mx, dy = ys[i] - my, dz = zs[i] - mz;
      cxx += dx * dx; cyy += dy * dy; czz += dz * dz;
      cxy += dx * dy; cxz += dx * dz; cyz += dy * dz;
    }

    let vx = 1, vy = 0, vz = 0;
    for (let i = 0; i < 20; i++) {
      const nx = cxx * vx + cxy * vy + cxz * vz;
      const ny = cxy * vx + cyy * vy + cyz * vz;
      const nz = cxz * vx + cyz * vy + czz * vz;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (len < 1e-10) break;
      vx = nx / len; vy = ny / len; vz = nz / len;
    }

    return { nx: vx, ny: vy, nz: vz, ox: mx, oy: my, oz: mz };
  }

  /**
   * Recursively splits a node using a plane aligned to the principal axis of its points.
   * Each split produces two children (front and back) until the stopping criteria are met.
   * @param {TreeNode} node
   * @protected
   */
  _splitNode(node) {
    if (node.depth >= this.maxDepth || node.points.length <= this.maxPointsPerNode) {
      this._finalizeLeaf(node);
      return;
    }

    const { nx, ny, nz, ox, oy, oz } = this._computePrincipalAxis(node.points);
    node.splitPlane = { nx, ny, nz, ox, oy, oz };

    // Classify, split, and compute tight bounding boxes in one pass.
    const frontPoints = [], backPoints = [];
    const frontBounds = new Box3(), backBounds = new Box3();
    for (const p of node.points) {
      const dot = (p.x - ox) * nx + (p.y - oy) * ny + (p.z - oz) * nz;
      if (dot >= 0) { frontPoints.push(p); frontBounds.expandByPoint(p); }
      else           { backPoints.push(p);  backBounds.expandByPoint(p);  }
    }

    // Degenerate split: keep as leaf.
    if (frontPoints.length === 0 || backPoints.length === 0) {
      this._finalizeLeaf(node);
      return;
    }

    node.isLeaf = false;

    const backNode = new TreeNode(backBounds, node.depth + 1);
    backNode.points = backPoints;

    const frontNode = new TreeNode(frontBounds, node.depth + 1);
    frontNode.points = frontPoints;

    node.children.push(backNode, frontNode);
    node.points = null;

    this._splitNode(backNode);
    this._splitNode(frontNode);
  }
}
