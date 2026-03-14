import * as THREE from "three";

import { createScene } from "./viewer/scene.js";
import { createCamera, fitCameraToObject } from "./viewer/camera.js";
import { createRenderer } from "./viewer/renderer.js";
import { createFlyControls } from "./viewer/controls.js";
import { createLabeledAxes } from "./viewer/helpers.js";
import { getHeightColor } from "./viewer/colorRamp.js"; 

import { loadPointCloud } from "./loaders/pcdLoader.js";
import { Octree } from "./algorithms/ocTree.js";
//import { KDTree } from "./algorithms/kdTree.js"; // <--- ADD THIS LINE

import { TreeVisualizer } from "./viewer/visualizer.js";

const scene = createScene();
const camera = createCamera();
const renderer = createRenderer();
const flyControls = createFlyControls(camera, renderer.domElement);
const clock = new THREE.Clock();

// --- DOM ELEMENTS ---
const datasetSelect = document.getElementById("dataset");
const algorithmSelect = document.getElementById("algorithm"); // NEW!
const showAxesCheckbox = document.getElementById("show-axes");
const showCubesCheckbox = document.getElementById("show-cubes");
const showWireframesCheckbox = document.getElementById("show-wireframe");

// --- GLOBAL VARIABLES ---
const visualizer = new TreeVisualizer(scene);
let currentTree = null;
let currentDepth = 1; 
let globalZMin = 0;
let globalZMax = 0;

let currentPointCloud = null;
let axes = null;

// --- CONFIGURATION & CACHING ---
const datasetConfigs = {
  "/data/ufo.pcd": { maxDepth: 8, maxPoints: 30 },
  "/data/corridor_telin.pcd": { maxDepth: 9, maxPoints: 20 },
  "/data/hasselt.pcd": { maxDepth: 8, maxPoints: 200 }
};

let cachedTrees = {
  octree: null,
  kdtree: null,
  bsp: null
};

// --- VISUAL TOGGLES ---
function syncTreeVisibility() {
  const showCubes = showCubesCheckbox ? showCubesCheckbox.checked : true;
  const showWireframes = showWireframesCheckbox ? showWireframesCheckbox.checked : true;
  visualizer.setVisibility(showCubes, showWireframes);
}

function syncAxesVisibility() {
  if (axes) axes.visible = !showAxesCheckbox || showAxesCheckbox.checked;
}

// --- CORE LOGIC: LAZY LOADING TREES ---
function buildOrGetTree() {
  if (!currentPointCloud) return;

  const activeAlgorithm = algorithmSelect ? algorithmSelect.value : "octree";

  // 1. Check cache
  if (cachedTrees[activeAlgorithm]) {
    currentTree = cachedTrees[activeAlgorithm];
    currentDepth = 1; 
    updateVisualization();
    return;
  }

  // 2. Not cached? Get config and build!
  const positions = currentPointCloud.geometry.attributes.position.array;
  const config = datasetConfigs[datasetSelect.value] || { maxDepth: 6, maxPoints: 50 };

  console.log(`Building ${activeAlgorithm} with maxDepth: ${config.maxDepth}, maxPoints: ${config.maxPoints}...`);

  if (activeAlgorithm === "octree") {
    currentTree = new Octree(config.maxDepth, config.maxPoints);
    currentTree.build(positions);
    cachedTrees.octree = currentTree;
  } 
  else if (activeAlgorithm === "kdtree") {
    // CODE FOR BUILDING k-d TREE GOES HERE
    currentTree = new KDTree(config.maxDepth, config.maxPoints);
    currentTree.build(positions);
    cachedTrees.kdtree = currentTree;
    return;
  } 
  else if (activeAlgorithm === "bsp") {
    // CODE FOR BUILDING BSP TREE GOES HERE
    console.warn("BSP tree is not implemented yet!");
    currentTree = null;
    visualizer.clear();
    return;
  }

  currentDepth = 1;
  updateVisualization();
}

function updateVisualization() {
  if (!currentTree) return;
  const activeNodes = currentTree.getNodesAtDepth(currentDepth);
  visualizer.update(activeNodes, globalZMin, globalZMax);

  const depthDisplay = document.getElementById("depth-display");
  if (depthDisplay) depthDisplay.innerText = currentDepth;
}

// --- DATA LOADING ---
function loadSelectedDataset() {
  if (!datasetSelect) return;
  datasetSelect.disabled = true;

  if (currentPointCloud) {
    scene.remove(currentPointCloud);
    currentPointCloud.geometry.dispose();
    currentPointCloud.material.dispose();
    currentPointCloud = null;
    visualizer.clear();
  }

  loadPointCloud(
    scene,
    datasetSelect.value,
    function (points) {
      currentPointCloud = points;
      const { center, size } = fitCameraToObject(camera, points);
      const axisScale = Math.max(size.x, size.y, size.z) / 2;

      // 1. Z Bounds
      const boundingBox = new THREE.Box3().setFromObject(points);
      globalZMin = boundingBox.min.z;
      globalZMax = boundingBox.max.z;

      // 2. Color the points globally
      const positions = points.geometry.attributes.position.array;
      const pointCount = points.geometry.attributes.position.count;
      const colors = new Float32Array(pointCount * 3);

      for (let i = 0; i < pointCount; i++) {
        const z = positions[i * 3 + 2]; 
        const color = getHeightColor(z, globalZMin, globalZMax);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }

      points.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      points.material = new THREE.PointsMaterial({ 
        size: 0.007, 
        opacity: 0.8,
        vertexColors: true 
      });

      // 3. Setup Axes
      if (axes) scene.remove(axes);
      axes = createLabeledAxes();
      axes.position.copy(center);
      axes.scale.setScalar(axisScale);
      syncAxesVisibility();
      scene.add(axes);

      // 4. CLEAR CACHE & BUILD ALGORITHM
      cachedTrees = { octree: null, kdtree: null, bsp: null };
      buildOrGetTree();

      datasetSelect.disabled = false;
    },
    function () {
      datasetSelect.disabled = false;
    }
  );
}

// --- EVENT LISTENERS ---
if (showCubesCheckbox) showCubesCheckbox.addEventListener("change", syncTreeVisibility);
if (showWireframesCheckbox) showWireframesCheckbox.addEventListener("change", syncTreeVisibility);
if (showAxesCheckbox) showAxesCheckbox.addEventListener("change", syncAxesVisibility);
if (datasetSelect) datasetSelect.addEventListener("change", loadSelectedDataset);
if (algorithmSelect) algorithmSelect.addEventListener("change", buildOrGetTree); // Trigger when dropdown changes

window.addEventListener("keydown", (event) => {
  if (!currentTree) return;
  if (event.key === "+" || event.key === "=") {
    currentDepth = Math.min(currentDepth + 1, currentTree.maxDepth);
    updateVisualization();
  } else if (event.key === "-") {
    currentDepth = Math.max(currentDepth - 1, 0);
    updateVisualization();
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
  const delta = clock.getDelta();
  flyControls.update(delta);
  renderer.render(scene, camera);
}

animate();