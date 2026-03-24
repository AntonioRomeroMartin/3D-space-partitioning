import { createDatasetService } from "./services/datasetService.js";
import { createPartitionService } from "./services/partitionService.js";

import { Octree } from "./algorithms/ocTree.js";
import { KdTree } from "./algorithms/kdTree.js";
import { BspTree } from "./algorithms/bspTree.js";

import { createScene } from "./viewer/scene.js";
import { createCamera } from "./viewer/camera.js";
import { createRenderer } from "./viewer/renderer.js";
import { createControls } from "./viewer/controls.js";
import { OctreeVisualizer } from "./viewer/visualizers/octreeVisualizer.js";
import { KdTreeVisualizer } from "./viewer/visualizers/kdTreeVisualizer.js";
import { BspVisualizer } from "./viewer/visualizers/bspVisualizer.js";

const scene = createScene();
const camera = createCamera();
const renderer = createRenderer();

const controls = createControls(camera, renderer.domElement);

// --- DOM ELEMENTS ---
const datasetSelect = document.getElementById("dataset");
const algorithmSelect = document.getElementById("algorithm");
const showAxesCheckbox = document.getElementById("show-axes");
const showCubesCheckbox = document.getElementById("show-cubes");
const showWireframesCheckbox = document.getElementById("show-wireframe");
const depthDisplay = document.getElementById("depth-display");

// --- GLOBAL VARIABLES ---
const octreeVisualizer = new OctreeVisualizer(scene);
const kdTreeVisualizer = new KdTreeVisualizer(scene);
const bspVisualizer = new BspVisualizer(scene);

const visualizersByAlgorithm = {
  octree: octreeVisualizer,
  kdtree: kdTreeVisualizer,
  bsp: bspVisualizer,
};

const allVisualizers = [octreeVisualizer, kdTreeVisualizer, bspVisualizer];

// --- CONFIGURATION & CACHING ---
const datasetConfigs = {
  "/data/ufo.pcd": { maxDepth: 8, maxPoints: 30 },
  "/data/corridor_telin.pcd": { maxDepth: 9, maxPoints: 20 },
  "/data/hasselt.pcd": { maxDepth: 8, maxPoints: 200 }
};

const datasetService = createDatasetService({ scene, camera, controls });
const partitionService = createPartitionService({
  datasetConfigs,
  builders: {
    octree: (positions, config) => {
      const tree = new Octree(config.maxDepth, config.maxPoints);
      tree.build(positions);
      return tree;
    },
    kdtree: (positions, config) => {
      const tree = new KdTree(config.maxDepth, config.maxPoints);
      tree.build(positions);
      return tree;
    },
    bsp: (positions, config) => {
      const tree = new BspTree(config.maxDepth, config.maxPoints);
      tree.build(positions);
      return tree;
    },
  },
});

// --- VISUAL TOGGLES ---
function syncTreeVisibility() {
  const showCubes = showCubesCheckbox ? showCubesCheckbox.checked : true;
  const showWireframes = showWireframesCheckbox ? showWireframesCheckbox.checked : true;
  const activeAlgorithm = algorithmSelect ? algorithmSelect.value : "octree";
  const visualizer = visualizersByAlgorithm[activeAlgorithm] || octreeVisualizer;
  visualizer.setVisibility(showCubes, showWireframes);
}

function syncAxesVisibility() {
  datasetService.setAxesVisible(!showAxesCheckbox || showAxesCheckbox.checked);
}

// --- CORE LOGIC: LAZY LOADING TREES ---
function buildOrGetTree() {
  const pointCloud = datasetService.getPointCloud();
  if (!pointCloud) return;

  const activeAlgorithm = algorithmSelect ? algorithmSelect.value : "octree";

  const result = partitionService.buildOrGetTree({
    algorithm: activeAlgorithm,
    datasetPath: datasetSelect?.value,
    pointCloud,
  });

  if (!result.supported) {
    console.warn(result.message);
    for (const visualizer of allVisualizers) {
      visualizer.clear();
    }
    return;
  }

  if (!result.fromCache) {
    console.log(`Building ${activeAlgorithm} with maxDepth: ${result.config.maxDepth}, maxPoints: ${result.config.maxPoints}...`);
  }

  updateVisualization();
}

function updateVisualization() {
  if (!partitionService.getCurrentTree()) return;

  for (const visualizer of allVisualizers) {
    visualizer.clear();
  }

  const activeNodes = partitionService.getActiveNodes();
  const { zMin, zMax } = datasetService.getHeightRange();
  const activeAlgorithm = algorithmSelect ? algorithmSelect.value : "octree";
  const visualizer = visualizersByAlgorithm[activeAlgorithm] || octreeVisualizer;

  visualizer.update(activeNodes, zMin, zMax);

  if (depthDisplay) depthDisplay.innerText = partitionService.getCurrentDepth();
}

// --- DATA LOADING ---
async function loadSelectedDataset() {
  if (!datasetSelect) return;
  datasetSelect.disabled = true;

  for (const visualizer of allVisualizers) {
    visualizer.clear();
  }

  try {
    await datasetService.load(datasetSelect.value);
    syncAxesVisibility();
    buildOrGetTree();
  } finally {
    datasetSelect.disabled = false;
  }
}

// --- EVENT LISTENERS ---
showCubesCheckbox?.addEventListener("change", syncTreeVisibility);
showWireframesCheckbox?.addEventListener("change", syncTreeVisibility);
showAxesCheckbox?.addEventListener("change", syncAxesVisibility);
datasetSelect?.addEventListener("change", loadSelectedDataset);
algorithmSelect?.addEventListener("change", buildOrGetTree);

window.addEventListener("keydown", (event) => {
  if (!partitionService.getCurrentTree()) return;

  if (event.key === "+" || event.key === "=") {
    if (partitionService.changeDepth(1).changed) updateVisualization();
  } else if (event.key === "-") {
    if (partitionService.changeDepth(-1).changed) updateVisualization();
  }
});

window.addEventListener("resize", function () {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});

// INIT
loadSelectedDataset();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  
  renderer.render(scene, camera);
}

animate();