import { Box3, Vector3 } from "three";
import { TreeNode } from "./treeNode.js";
import { BaseTree } from "./baseTree.js";

const _axisSize = new Vector3();

/**
 * k-d Tree spatial partitioning structure.
 *
 * Three axis-selection strategies are supported via `splitMode`:
 *  - `'cycle'`    : Cycles X → Y → Z by depth (default).
 *  - `'widest'`   : Picks the axis with the largest bounding-box extent.
 *  - `'variance'` : Picks the axis with the highest point variance (PCA diagonal).
 *
 * The split plane is placed at the median point coordinate on the chosen axis.
 * Points are partitioned into a left child (indices < median index) and a
 * right child (indices >= median index); the median is included in the right
 * child so every point appears in exactly one leaf range.
 * Tight bounding boxes are computed from actual point distributions.
 * Degenerate splits that produce an empty left side finalize the node as a leaf.
 *
 * @memberof algorithms
 * @alias KdTree
 * @extends BaseTree
 */
export class KdTree extends BaseTree {
  /**
   * @param {number} maxDepth - Maximum recursion depth.
   * @param {number} maxPointsPerNode - Leaf threshold.
   * @param {'cycle'|'widest'|'variance'} [splitMode='cycle'] - Axis selection strategy.
   */
  constructor(maxDepth, maxPointsPerNode, splitMode = 'cycle') {
    super(maxDepth, maxPointsPerNode);
    this.splitMode = splitMode;
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

    this._points = points;
    this.root = new TreeNode(bounds, 0);
    this._splitNode(this.root);
    // Release the points array — only needed during construction.
    // Cached trees can hold millions of Vector3 objects; freeing them
    // keeps peak memory manageable when building multiple variants.
    this._points = null;
  }

  /**
   * Entry point required by the BaseTree contract. Kicks off the recursive split
   * over the full point array. Called once by `build()`.
   * @param {TreeNode} node
   */
  _splitNode(node) {
    this._split(node, 0, this._points.length);
  }

  /**
   * Recursive workhorse. Operates on the shared `this._points` array in-place
   * over the range [start, end). Every node receives its range as
   * `pointsStart`/`pointsEnd` for rendering access. The median is included in
   * the right child so no point is ever lost. Bounding boxes are computed from
   * the actual point distribution after partitioning.
   * @param {TreeNode} node
   * @param {number} start - Inclusive start index into `this._points`.
   * @param {number} end   - Exclusive end index into `this._points`.
   */
  _split(node, start, end) {
    const count = end - start;

    node.pointsStart = start;
    node.pointsEnd = end;

    if (node.depth >= this.maxDepth || count <= this.maxPointsPerNode) {
      this._finalizeLeaf(node, count);
      return;
    }

    const axis = this._selectAxis(node, start, end);
    const key = axis === 0 ? "x" : axis === 1 ? "y" : "z";

    const medianIndex = start + Math.floor(count / 2);
    this._selectNth(start, end, medianIndex, key);

    // Median is included in the right child — every point lands in exactly one leaf.
    const leftEnd = medianIndex;       // left:  [start,       medianIndex)
    const rightStart = medianIndex;    // right: [medianIndex, end)

    if (leftEnd === start) {
      this._finalizeLeaf(node, count);
      return;
    }

    node.isLeaf = false;

    const leftNode = new TreeNode(this._computeBounds(start, leftEnd), node.depth + 1);
    const rightNode = new TreeNode(this._computeBounds(rightStart, end), node.depth + 1);
    // Tag children with the axis that created the boundary between them.
    leftNode.splitAxis = axis;
    rightNode.splitAxis = axis;

    node.children.push(leftNode, rightNode);

    this._split(leftNode, start, leftEnd);
    this._split(rightNode, rightStart, end);
  }

  /**
   * Chooses the split axis for the current node according to `this.splitMode`.
   *  - cycle:    depth % 3  (ignores point distribution)
   *  - widest:   axis with the largest bounding-box extent (O(1))
   *  - variance: axis with the highest point variance — equivalent to the
   *              dominant diagonal entry of the covariance matrix (O(n))
   * @param {TreeNode} node
   * @param {number} start
   * @param {number} end
   * @returns {0|1|2}
   */
  _selectAxis(node, start, end) {
    if (this.splitMode === 'widest') {
      const size = node.bounds.getSize(_axisSize);
      if (size.x >= size.y && size.x >= size.z) return 0;
      if (size.y >= size.z) return 1;
      return 2;
    }

    if (this.splitMode === 'variance') {
      // Welford's online algorithm on a capped sample.
      // For large nodes, stride-sample up to MAX_SAMPLES points so that
      // axis selection stays O(1) in practice on datasets with millions of points.
      const MAX_SAMPLES = 1024;
      const pts = this._points;
      const n = end - start;
      const stride = Math.max(1, Math.floor(n / MAX_SAMPLES));
      let mx = 0, my = 0, mz = 0;
      let vx = 0, vy = 0, vz = 0;
      let k = 0;
      for (let i = start; i < end; i += stride) {
        k++;
        const p = pts[i];
        const dx = p.x - mx, dy = p.y - my, dz = p.z - mz;
        mx += dx / k; my += dy / k; mz += dz / k;
        vx += dx * (p.x - mx);
        vy += dy * (p.y - my);
        vz += dz * (p.z - mz);
      }
      if (vx >= vy && vx >= vz) return 0;
      if (vy >= vz) return 1;
      return 2;
    }

    // default: cycle
    return node.depth % 3;
  }

  /**
   * Rearranges `this._points` within [start, end) so that the element at `nth`
   * is the value that would be there after a full sort (3-way / Dutch National Flag
   * quickselect). Equal-valued points are grouped into a pivot zone in a single pass,
   * so duplicate coordinates do not cause degraded partitions. O(n) average.
   * @param {number} start
   * @param {number} end
   * @param {number} nth - Target index to place the median at.
   * @param {string} key - "x", "y", or "z"
   */
  _selectNth(start, end, nth, key) {
    const points = this._points;
    let lo = start;
    let hi = end - 1;

    while (lo < hi) {
      const pivot = points[(lo + hi) >> 1][key];
      let lt = lo;   // boundary of the < zone:  [lo, lt) < pivot
      let gt = hi;   // boundary of the > zone:  (gt, hi] > pivot
      let i  = lo;   // scan pointer:             [lt, i)  = pivot

      while (i <= gt) {
        const v = points[i][key];
        if (v < pivot) {
          const tmp = points[lt]; points[lt] = points[i]; points[i] = tmp;
          lt++; i++;
        } else if (v > pivot) {
          const tmp = points[i]; points[i] = points[gt]; points[gt] = tmp;
          gt--;
        } else {
          i++;
        }
      }
      // [lo, lt) < pivot  |  [lt, gt] = pivot  |  (gt, hi] > pivot

      if      (nth < lt) hi = lt - 1;
      else if (nth > gt) lo = gt + 1;
      else               break;      // nth sits in the pivot zone — done
    }
  }

  /**
   * Computes a tight axis-aligned bounding box by scanning `this._points[start, end)`.
   * No array allocations beyond the two Vector3 objects required by Box3.
   * @param {number} start
   * @param {number} end
   * @returns {THREE.Box3}
   */
  _computeBounds(start, end) {
    const points = this._points;
    const p0 = points[start];
    let minX = p0.x, minY = p0.y, minZ = p0.z;
    let maxX = minX, maxY = minY, maxZ = minZ;

    for (let i = start + 1; i < end; i++) {
      const p = points[i];
      if      (p.x < minX) minX = p.x;
      else if (p.x > maxX) maxX = p.x;
      if      (p.y < minY) minY = p.y;
      else if (p.y > maxY) maxY = p.y;
      if      (p.z < minZ) minZ = p.z;
      else if (p.z > maxZ) maxZ = p.z;
    }

    return new Box3(new Vector3(minX, minY, minZ), new Vector3(maxX, maxY, maxZ));
  }
}
