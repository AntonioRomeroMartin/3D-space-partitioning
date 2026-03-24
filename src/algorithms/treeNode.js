export class TreeNode {
  constructor(bounds, depth) {
    this.bounds = bounds;
    this.depth = depth;
    this.children = [];
    this.points = [];
    this.isLeaf = true;
    this.pointCount = 0;
  }
}
