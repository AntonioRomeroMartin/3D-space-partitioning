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

// --- DOM ---
const algorithmSelect        = document.getElementById("algorithm");
const showAxesCheckbox       = document.getElementById("show-axes");
const showCubesCheckbox      = document.getElementById("show-cubes");
const showWireframesCheckbox = document.getElementById("show-wireframe");
const depthDisplay           = document.getElementById("depth-display");
const leafSizeDisplay        = document.getElementById("leaf-size-display");
const datasetGroup           = document.getElementById("remote-dataset-group");
const dropZone               = document.getElementById("drop-zone");
const fileInput              = document.getElementById("file-input");
const localFileTag           = document.getElementById("local-file-tag");
const localFileName          = document.getElementById("local-file-name");
const clearLocalFileBtn      = document.getElementById("clear-local-file");
const urlInput               = document.getElementById("url-input");
const urlLoadBtn             = document.getElementById("url-load-btn");
const loadingOverlay         = document.getElementById("loading-overlay");
const loadingText            = document.getElementById("loading-text");
const loadingProgress        = document.getElementById("loading-progress");
const showCubesLabel         = showCubesCheckbox?.closest("label");
const showWireframeLabel     = showWireframesCheckbox?.closest("label");
const kdSplitSection         = document.getElementById("kd-split-section");
const kdSplitBtns            = document.querySelectorAll("#kd-split-group .dataset-btn");

let currentKdSplitMode = 'cycle';

function currentAlgorithm() {
  return algorithmSelect?.value || "octree";
}

function kdVariant() {
  return currentAlgorithm() === 'kdtree' ? currentKdSplitMode : undefined;
}

// --- DATASETS (single source of truth) ---
// Use VITE_DATASETS_URL env variable if defined (Vercel), otherwise use /data for local development
const DATASETS_BASE_URL =
  import.meta.env.VITE_DATASETS_URL ?? "/data";
const REMOTE_DATASETS = [
  { path: `${DATASETS_BASE_URL}/ufo.pcd`,            label: "UFO",      maxDepth: 8, maxPoints: 30  },
  { path: `${DATASETS_BASE_URL}/corridor_telin.pcd`, label: "Corridor", maxDepth: 9, maxPoints: 20  },
  { path: `${DATASETS_BASE_URL}/hasselt.pcd`,        label: "Hasselt",  maxDepth: 8, maxPoints: 200 },
];

REMOTE_DATASETS.forEach(({ path, label }, i) => {
  const btn = document.createElement("button");
  btn.className = "dataset-btn" + (i === 0 ? " active" : "");
  btn.dataset.path = path;
  btn.textContent = label;
  datasetGroup.appendChild(btn);
});

const remoteBtns = datasetGroup.querySelectorAll(".dataset-btn");

// --- STATE ---
const INITIAL_DATASET = REMOTE_DATASETS[0].path;
let currentDatasetPath = INITIAL_DATASET;
let localFile = null;

// --- VISUALIZERS ---
const octreeVisualizer  = new OctreeVisualizer(scene);
const kdTreeVisualizer  = new KdTreeVisualizer(scene);
const bspVisualizer     = new BspVisualizer(scene);

const visualizersByAlgorithm = {
  octree: octreeVisualizer,
  kdtree: kdTreeVisualizer,
  bsp:    bspVisualizer,
};
const allVisualizers = [octreeVisualizer, kdTreeVisualizer, bspVisualizer];

const datasetConfigs = Object.fromEntries(
  REMOTE_DATASETS.map(({ path, maxDepth, maxPoints }) => [path, { maxDepth, maxPoints }])
);

// --- SERVICES ---
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
      const tree = new KdTree(config.maxDepth, config.maxPoints, config.splitMode || 'cycle');
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

// --- LOADING OVERLAY ---
function showLoading(text = "Loading…") {
  loadingText.textContent = text;
  loadingProgress.textContent = "";
  loadingOverlay.classList.add("active");
  if (leafSizeDisplay) leafSizeDisplay.textContent = "Leaf size: —";
}

function hideLoading() {
  loadingOverlay.classList.remove("active");
}

function onLoadProgress(event) {
  if (event.lengthComputable && event.total > 0) {
    const pct = Math.round((event.loaded / event.total) * 100);
    if (pct >= 100) {
      loadingText.textContent = "Parsing…";
      loadingProgress.textContent = "";
    } else {
      loadingProgress.textContent = `${pct}%`;
    }
  }
}

function nextFrame() {
  return new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
}

// --- HELPERS ---
function computeLeafSize(nodes) {
  if (!nodes || nodes.length === 0) return null;
  let total = 0;
  let count = 0;
  for (const node of nodes) {
    const { min, max } = node.bounds;
    total += Math.cbrt((max.x - min.x) * (max.y - min.y) * (max.z - min.z));
    count++;
  }
  return count > 0 ? total / count : null;
}

function syncControlsForAlgorithm() {
  const algo = currentAlgorithm();
  const isBsp = algo === "bsp";
  if (showCubesLabel) showCubesLabel.style.display = isBsp ? "none" : "";
  if (showWireframeLabel) showWireframeLabel.lastChild.nodeValue = isBsp ? " Planes" : " Wireframe";
  if (kdSplitSection) kdSplitSection.style.display = algo === "kdtree" ? "" : "none";
}

// --- VISUAL TOGGLES ---
function syncTreeVisibility() {
  const algo = currentAlgorithm();
  const showCubes = showCubesCheckbox ? showCubesCheckbox.checked : true;
  const showWireframes = showWireframesCheckbox ? showWireframesCheckbox.checked : true;
  const visualizer = visualizersByAlgorithm[algo] || octreeVisualizer;
  // "Cubes" is hidden for BSP — ignore its stale state so the point cloud is never
  // inadvertently hidden when switching from an algorithm that had it unchecked.
  visualizer.setVisibility(algo === "bsp" ? true : showCubes, showWireframes);
}

function syncAxesVisibility() {
  datasetService.setAxesVisible(!showAxesCheckbox || showAxesCheckbox.checked);
}

function clearVisualizers() {
  for (const visualizer of allVisualizers) visualizer.clear();
}

// --- TREE / VISUALIZATION ---
function buildOrGetTree() {
  const pointCloud = datasetService.getPointCloud();
  if (!pointCloud) return;

  const effectiveAlgorithm = currentAlgorithm();

  const result = partitionService.buildOrGetTree({
    algorithm: effectiveAlgorithm,
    datasetPath: currentDatasetPath,
    pointCloud,
    splitMode: currentAlgorithm() === 'kdtree' ? currentKdSplitMode : undefined,
    cacheVariant: kdVariant(),
  });

  if (!result.supported) {
    console.warn(result.message);
    clearVisualizers();
    return;
  }

  if (!result.fromCache) {
    console.log(`Building ${effectiveAlgorithm} with maxDepth: ${result.config.maxDepth}, maxPoints: ${result.config.maxPoints}...`);
  }

  updateVisualization();
}

function updateVisualization() {
  if (!partitionService.getCurrentTree()) return;

  clearVisualizers();

  const activeNodes = partitionService.getActiveNodes();
  const { zMin, zMax } = datasetService.getHeightRange();
  const visualizer = visualizersByAlgorithm[currentAlgorithm()] || octreeVisualizer;

  visualizer.update(
    activeNodes, zMin, zMax, datasetService.getPointCloud(),
    partitionService.getCurrentTree()?.root,
    partitionService.getCurrentDepth()
  );

  syncTreeVisibility();

  if (depthDisplay) depthDisplay.innerText = partitionService.getCurrentDepth();

  if (leafSizeDisplay) {
    const ls = computeLeafSize(activeNodes);
    leafSizeDisplay.textContent = ls != null ? `Leaf size: ${ls.toFixed(3)}` : "Leaf size: —";
  }
}

async function rebuildTree() {
  syncControlsForAlgorithm();
  const cached = partitionService.hasTree(currentAlgorithm(), currentDatasetPath, kdVariant());
  if (!cached) {
    showLoading("Building tree…");
    clearVisualizers();
    await nextFrame();
  }
  buildOrGetTree();
  if (!cached) hideLoading();
}

// --- DATASET SELECTION ---
function setActiveRemoteBtn(path) {
  remoteBtns.forEach(btn => btn.classList.toggle("active", btn.dataset.path === path));
  localFileTag.classList.remove("active");
  currentDatasetPath = path;
}

async function loadRemoteDataset(path) {
  const datasetCached = datasetService.hasDataset(path);
  const treeCached = datasetCached && partitionService.hasTree(currentAlgorithm(), path, kdVariant());
  setActiveRemoteBtn(path);
  if (!treeCached) {
    showLoading(datasetCached ? "Building tree…" : `Loading ${path.split("/").pop()}…`);
    clearVisualizers();
  }
  try {
    await datasetService.load(path, onLoadProgress);
    syncAxesVisibility();
    if (!datasetCached) {
      loadingText.textContent = "Building tree…";
      await nextFrame();
    }
    buildOrGetTree();
  } catch (err) {
    console.error("Failed to load dataset:", err);
    alert(`Could not load "${path.split("/").pop()}". See console for details.`);
  } finally {
    if (!treeCached) hideLoading();
  }
}

async function loadLocalFile(file) {
  if (!file.name.toLowerCase().endsWith(".pcd")) {
    alert("Please select a valid .pcd file.");
    return;
  }

  localFile = file;
  remoteBtns.forEach(btn => btn.classList.remove("active"));
  const displayName = file.name.length > 26 ? file.name.slice(0, 23) + "…" : file.name;
  localFileName.textContent = displayName;
  localFileTag.style.display = "flex";
  localFileTag.classList.add("active");

  currentDatasetPath = `__local__:${file.name}`;

  showLoading(`Loading ${file.name}…`);
  clearVisualizers();

  try {
    await datasetService.load(file, onLoadProgress);
    syncAxesVisibility();
    loadingText.textContent = "Building tree…";
    await nextFrame();
    buildOrGetTree();
  } catch (err) {
    console.error("Failed to load local file:", err);
    alert(`Could not load "${file.name}". Make sure it is a valid binary or ASCII PCD file.`);
    localFile = null;
    localFileTag.style.display = "none";
    localFileTag.classList.remove("active");
    await loadRemoteDataset(INITIAL_DATASET);
  } finally {
    hideLoading();
  }
}

async function switchToLocalDataset() {
  if (!localFile) return;
  const path = `__local__:${localFile.name}`;
  if (currentDatasetPath === path && datasetService.getPointCloud()) return;

  remoteBtns.forEach(btn => btn.classList.remove("active"));
  localFileTag.classList.add("active");
  currentDatasetPath = path;

  const datasetCached = datasetService.hasDataset(path);
  const treeCached = datasetCached && partitionService.hasTree(currentAlgorithm(), path, kdVariant());
  if (!treeCached) {
    showLoading(datasetCached ? "Building tree…" : `Loading ${localFile.name}…`);
    clearVisualizers();
  }
  try {
    await datasetService.load(localFile);
    syncAxesVisibility();
    if (!datasetCached) {
      loadingText.textContent = "Building tree…";
      await nextFrame();
    }
    buildOrGetTree();
  } catch (err) {
    console.error("Failed to switch to local file:", err);
  } finally {
    if (!treeCached) hideLoading();
  }
}

// --- EVENT LISTENERS ---
remoteBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const path = btn.dataset.path;
    // Skip if already active and data is loaded
    if (path === currentDatasetPath && datasetService.getPointCloud()) return;
    loadRemoteDataset(path);
  });
});

dropZone.addEventListener("click", () => fileInput.click());

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", (e) => {
  if (!dropZone.contains(e.relatedTarget)) {
    dropZone.classList.remove("dragover");
  }
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (file) loadLocalFile(file);
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) loadLocalFile(file);
  fileInput.value = ""; // reset so same file can be picked again
});

localFileTag.addEventListener("click", () => switchToLocalDataset());

clearLocalFileBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  localFile = null;
  localFileTag.style.display = "none";
  localFileTag.classList.remove("active");
  loadRemoteDataset(INITIAL_DATASET);
});

function loadUrlFromInput() {
  const url = urlInput.value.trim();
  if (!url) return;
  if (!url.toLowerCase().endsWith(".pcd")) {
    alert("URL must point to a .pcd file.");
    return;
  }
  urlInput.value = "";
  loadRemoteDataset(url);
}
urlLoadBtn.addEventListener("click", loadUrlFromInput);
urlInput.addEventListener("keydown", (e) => { if (e.key === "Enter") loadUrlFromInput(); });

kdSplitBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.dataset.mode === currentKdSplitMode) return;
    currentKdSplitMode = btn.dataset.mode;
    kdSplitBtns.forEach(b => b.classList.toggle("active", b === btn));
    rebuildTree();
  });
});

showCubesCheckbox?.addEventListener("change", syncTreeVisibility);
showWireframesCheckbox?.addEventListener("change", syncTreeVisibility);
showAxesCheckbox?.addEventListener("change", syncAxesVisibility);
algorithmSelect?.addEventListener("change", rebuildTree);

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

// --- INIT ---
syncControlsForAlgorithm();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();
loadRemoteDataset(INITIAL_DATASET);
