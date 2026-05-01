import { Box3, Vector3 } from "three";
import { TreeNode } from "./treeNode.js";
import { BaseTree } from "./baseTree.js";

/**
 * BSP (Binary Space Partitioning) tree spatial partitioning structure.
 *
 * Recursively splits the point cloud using planes aligned to the principal axis
 * (PCA) of the points in each node. The split plane is positioned at the
 * **median projection** of the node's points onto the principal axis, guaranteeing
 * that each split divides the point set into two equal-count halves (balanced tree).
 *
 * The PCA axis is computed via a single-pass Welford covariance algorithm followed
 * by power iteration — no scratch buffers are needed. Points are tracked as integer
 * indices into the original Float32Array throughout construction. Leaf nodes store a
 * compact Int32Array of geometry indices used by the visualizer for point-cloud
 * recoloring. The positions reference is freed after the tree is fully built.
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
   * @param {Float32Array} positions - Flat [x,y,z, …] array from PCD geometry.
   */
  build(positions) {
    const n = positions.length / 3;
    if (n === 0) { this.root = null; return; }

    this._positions = positions;

    const bounds = this._computeBoundsFromPositions(positions);

    // Build initial index list [0, 1, …, n-1].
    const allIndices = [];
    for (let i = 0; i < n; i++) allIndices.push(i);

    this.root = new TreeNode(bounds, 0);
    this.root.points = allIndices;

    this._splitNode(this.root);

    this._positions = null;
  }

  /**
   * Marks a node as a leaf, stores the geometry indices as a typed array, and
   * frees the construction-time index array.
   * @param {TreeNode} node
   * @protected
   */
  _finalizeLeaf(node) {
    node.isLeaf     = true;
    const pts       = node.points;
    node.pointCount = pts ? pts.length : 0;
    node.indices    = new Int32Array(pts ?? []);
    node.points     = null;
  }

  /**
   * Computes the principal axis (dominant eigenvector) of the covariance matrix
   * and the centroid of the node's points in a **single pass** using Welford's
   * online covariance algorithm, followed by power iteration (up to 20 steps,
   * with early termination when the vector magnitude falls below 1e-10).
   *
   * Mean and all six covariance entries are accumulated as running scalars —
   * no scratch buffers or per-call allocations are needed.
   *
   * @param {number[]} indices - Index array for this node's points.
   * @returns {{ nx: number, ny: number, nz: number, ox: number, oy: number, oz: number }}
   * @protected
   */
  _computePrincipalAxis(indices) {
    const n   = indices.length;
    const pos = this._positions;

    let mx = 0, my = 0, mz = 0;
    let cxx = 0, cyy = 0, czz = 0, cxy = 0, cxz = 0, cyz = 0;

    for (let i = 0; i < n; i++) {
      const k    = i + 1;
      const base = indices[i] * 3;
      const x = pos[base], y = pos[base + 1], z = pos[base + 2];
      const dx = x - mx, dy = y - my, dz = z - mz;
      mx += dx / k; my += dy / k; mz += dz / k;
      // Welford online covariance: (delta_before_update) × (value − new_mean)
      cxx += dx * (x - mx); cyy += dy * (y - my); czz += dz * (z - mz);
      cxy += dx * (y - my); cxz += dx * (z - mz); cyz += dy * (z - mz);
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
   * Rearranges `arr` within [lo, hi) so that `arr[nth]` is the value that would
   * be there after a full sort (3-way / Dutch National Flag quickselect).
   * Equal values are grouped into a pivot zone in one pass, preventing O(n²)
   * behaviour on duplicate projections. O(n) average.
   * @param {Float32Array} arr
   * @param {number} lo
   * @param {number} hi
   * @param {number} nth
   * @protected
   */
  _selectNthScalar(arr, lo, hi, nth) {
    while (lo < hi - 1) {
      const pivot = arr[(lo + hi) >> 1];
      let lt = lo, gt = hi - 1, i = lo;
      while (i <= gt) {
        const v = arr[i];
        if      (v < pivot) { const t = arr[lt]; arr[lt++] = arr[i]; arr[i++] = t; }
        else if (v > pivot) { const t = arr[i];  arr[i]    = arr[gt]; arr[gt--] = t; }
        else                { i++; }
      }
      if      (nth < lt) hi = lt;
      else if (nth > gt) lo = gt + 1;
      else               break;
    }
  }

  /**
   * Recursively splits a node using a plane whose normal is the principal axis of
   * its points and whose origin is the **median-projected point** on that axis.
   * Positioning the plane at the median guarantees that each split divides the
   * point set into two equal-count halves, bounding tree depth at ⌈log₂ n⌉.
   *
   * Implementation:
   *  1. `_computePrincipalAxis` — Welford pass → axis (nx,ny,nz) and centroid (ox,oy,oz).
   *  2. Project all points onto the axis into a temporary Float32Array; quickselect
   *     to find the median projection `d_med` in O(n) average.
   *  3. Classify: front if projection ≥ d_med, back otherwise; track tight AABBs.
   *  4. Store `splitPlane` at the median-shifted origin (ox + d_med·nx, …) so the
   *     visualizer renders planes at the correct position.
   *
   * @param {TreeNode} node
   * @protected
   */
  _splitNode(node) {
    if (node.depth >= this.maxDepth || node.points.length <= this.maxPointsPerNode) {
      this._finalizeLeaf(node);
      return;
    }

    const { nx, ny, nz, ox, oy, oz } = this._computePrincipalAxis(node.points);

    // Project all points onto the principal axis; quickselect for the median.
    const points = node.points;
    const cnt    = points.length;
    const pos    = this._positions;
    const dots   = new Float32Array(cnt);
    for (let i = 0; i < cnt; i++) {
      const base = points[i] * 3;
      dots[i] = (pos[base] - ox) * nx + (pos[base + 1] - oy) * ny + (pos[base + 2] - oz) * nz;
    }
    const mid = cnt >> 1;
    this._selectNthScalar(dots, 0, cnt, mid);
    const medianDot = dots[mid];

    // Classify points and compute tight bounding boxes in one pass.
    const frontIndices = [];
    const backIndices  = [];
    let fMinX =  Infinity, fMinY =  Infinity, fMinZ =  Infinity;
    let fMaxX = -Infinity, fMaxY = -Infinity, fMaxZ = -Infinity;
    let bMinX =  Infinity, bMinY =  Infinity, bMinZ =  Infinity;
    let bMaxX = -Infinity, bMaxY = -Infinity, bMaxZ = -Infinity;

    for (const idx of points) {
      const base = idx * 3;
      const px = pos[base], py = pos[base + 1], pz = pos[base + 2];
      const dot = (px - ox) * nx + (py - oy) * ny + (pz - oz) * nz;

      if (dot >= medianDot) {
        frontIndices.push(idx);
        if (px < fMinX) fMinX = px; else if (px > fMaxX) fMaxX = px;
        if (py < fMinY) fMinY = py; else if (py > fMaxY) fMaxY = py;
        if (pz < fMinZ) fMinZ = pz; else if (pz > fMaxZ) fMaxZ = pz;
      } else {
        backIndices.push(idx);
        if (px < bMinX) bMinX = px; else if (px > bMaxX) bMaxX = px;
        if (py < bMinY) bMinY = py; else if (py > bMaxY) bMaxY = py;
        if (pz < bMinZ) bMinZ = pz; else if (pz > bMaxZ) bMaxZ = pz;
      }
    }

    // Degenerate split (all points share the same projection): keep as leaf.
    if (frontIndices.length === 0 || backIndices.length === 0) {
      this._finalizeLeaf(node);
      return;
    }

    node.isLeaf = false;

    // Shift origin to median-projected position for correct visualizer rendering.
    node.splitPlane = {
      nx, ny, nz,
      ox: ox + medianDot * nx,
      oy: oy + medianDot * ny,
      oz: oz + medianDot * nz,
    };

    const frontBounds = new Box3(new Vector3(fMinX, fMinY, fMinZ), new Vector3(fMaxX, fMaxY, fMaxZ));
    const backBounds  = new Box3(new Vector3(bMinX, bMinY, bMinZ), new Vector3(bMaxX, bMaxY, bMaxZ));

    const frontNode  = new TreeNode(frontBounds, node.depth + 1);
    const backNode   = new TreeNode(backBounds,  node.depth + 1);
    frontNode.points = frontIndices;
    backNode.points  = backIndices;

    node.children.push(backNode, frontNode);
    node.points = null;

    this._splitNode(backNode);
    this._splitNode(frontNode);
  }
}
