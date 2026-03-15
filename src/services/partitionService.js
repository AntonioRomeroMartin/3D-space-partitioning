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

  function buildOrGetTree({ algorithm, datasetPath, pointCloud }) {
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

    if (treeCache.has(algorithm)) {
      currentTree = treeCache.get(algorithm);
      currentDepth = 1;
      return {
        supported: true,
        fromCache: true,
        config: datasetConfigs[datasetPath] || defaultConfig,
      };
    }

    const positions = pointCloud.geometry.attributes.position.array;
    const config = datasetConfigs[datasetPath] || defaultConfig;
    const tree = builder(positions, config);

    treeCache.set(algorithm, tree);
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

  return {
    buildOrGetTree,
    changeDepth,
    clearCache,
    getActiveNodes,
    getCurrentDepth,
    getCurrentTree,
  };
}