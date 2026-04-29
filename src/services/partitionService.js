/**
 * Factory that creates the partition service responsible for building, caching,
 * and querying spatial partitioning trees (Octree, k-d Tree, BSP Tree).
 *
 * Trees are cached by `algorithm + datasetPath` key so rebuilding is only done once
 * per session. The service also tracks the current display depth and exposes
 * `changeDepth` for keyboard-driven depth navigation.
 *
 * @memberof services
 * @alias createPartitionService
 * @param {object} deps
 * @param {Object.<string, {maxDepth: number, maxPoints: number}>} deps.datasetConfigs
 *   Per-dataset tree configuration keyed by dataset path.
 * @param {Object.<string, function(Float32Array, object): BaseTree>} deps.builders
 *   Map of algorithm name → builder function that constructs and returns a built tree.
 * @param {{maxDepth: number, maxPoints: number}} [deps.defaultConfig]
 *   Fallback config used for local files or unknown dataset paths.
 * @returns {{
 *   buildOrGetTree: function(object): object,
 *   changeDepth: function(number): {changed: boolean, depth: number},
 *   clearCache: function(): void,
 *   getActiveNodes: function(): TreeNode[],
 *   getCurrentDepth: function(): number,
 *   getCurrentTree: function(): BaseTree|null,
 *   hasTree: function(string, string): boolean
 * }}
 */
export function createPartitionService({ datasetConfigs, builders, defaultConfig = { maxDepth: 6, maxPoints: 50 } }) {
  const treeCache = new Map();

  let currentTree = null;
  let currentDepth = 1;

  function reset() {
    currentTree = null;
    currentDepth = 1;
  }

  function clearCache() {
    treeCache.clear();
    reset();
  }

  function getCacheKey(algorithm, datasetPath, variant) {
    const base = `${algorithm}::${datasetPath || "__no_dataset__"}`;
    return variant ? `${base}::${variant}` : base;
  }

  function buildOrGetTree({ algorithm, datasetPath, pointCloud, splitMode, cacheVariant }) {
    if (!pointCloud) {
      return { supported: false, message: "No point cloud loaded." };
    }

    const builder = builders[algorithm];
    if (!builder) {
      reset();
      return {
        supported: false,
        message: `${algorithm} is not implemented yet!`,
      };
    }

    const cacheKey = getCacheKey(algorithm, datasetPath, cacheVariant);

    if (treeCache.has(cacheKey)) {
      currentTree = treeCache.get(cacheKey);
      currentDepth = 1;
      return {
        supported: true,
        fromCache: true,
        config: datasetConfigs[datasetPath] || defaultConfig,
      };
    }

    const positions = pointCloud.geometry.attributes.position.array;
    const config = { ...(datasetConfigs[datasetPath] || defaultConfig), splitMode };
    const tree = builder(positions, config);

    treeCache.set(cacheKey, tree);
    currentTree = tree;
    currentDepth = 1;

    return {
      supported: true,
      fromCache: false,
      config,
    };
  }

  function getActiveNodes() {
    if (!currentTree) return [];
    return currentTree.getNodesAtDepth(currentDepth);
  }

  function changeDepth(delta) {
    if (!currentTree || typeof currentTree.maxDepth !== "number") {
      return { changed: false, depth: currentDepth };
    }

    const nextDepth = Math.max(0, Math.min(currentDepth + delta, currentTree.maxDepth));
    if (nextDepth === currentDepth) {
      return { changed: false, depth: currentDepth };
    }

    currentDepth = nextDepth;
    return { changed: true, depth: currentDepth };
  }

  function getCurrentDepth() {
    return currentDepth;
  }

  function getCurrentTree() {
    return currentTree;
  }

  function hasTree(algorithm, datasetPath, variant) {
    return treeCache.has(getCacheKey(algorithm, datasetPath, variant));
  }

  return {
    buildOrGetTree,
    changeDepth,
    clearCache,
    getActiveNodes,
    getCurrentDepth,
    getCurrentTree,
    hasTree,
  };
}