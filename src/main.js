import { createScene } from "./viewer/scene.js";
import { createCamera, fitCameraToObject } from "./viewer/camera.js";
import { createRenderer } from "./viewer/renderer.js";
import { createControls } from "./viewer/controls.js";
import { createLabeledAxes } from "./viewer/helpers.js";

import { loadPointCloud } from "./loaders/pcdLoader.js";

const scene = createScene();
const camera = createCamera();
const renderer = createRenderer();
const controls = createControls(camera, renderer.domElement);
const datasetSelect = document.getElementById("dataset");
const showAxesCheckbox = document.getElementById("show-axes");

let currentPointCloud = null;
let axes = null;

function syncAxesVisibility() {

  if (!axes) {
    return;
  }

  axes.visible = !showAxesCheckbox || showAxesCheckbox.checked;

}

function loadSelectedDataset() {

  if (!datasetSelect) {
    return;
  }

  datasetSelect.disabled = true;

  if (currentPointCloud) {
    scene.remove(currentPointCloud);
    currentPointCloud.geometry.dispose();
    currentPointCloud.material.dispose();
    currentPointCloud = null;
  }

  loadPointCloud(
    scene,
    datasetSelect.value,
    function (points) {

      currentPointCloud = points;
      const { center, size } = fitCameraToObject(camera, points);
      const axisScale = Math.max(size.x, size.y, size.z) / 2;

      if (axes) scene.remove(axes);
      axes = createLabeledAxes();
      axes.position.copy(center);
      axes.scale.setScalar(axisScale);
      syncAxesVisibility();
      scene.add(axes);

      controls.target.copy(center);
      controls.update();
      datasetSelect.disabled = false;

    },
    function () {

      datasetSelect.disabled = false;

    }
  );

}

if (datasetSelect) {
  datasetSelect.addEventListener("change", loadSelectedDataset);
}

if (showAxesCheckbox) {
  showAxesCheckbox.addEventListener("change", syncAxesVisibility);
}

loadSelectedDataset();

window.addEventListener("resize", function () {

  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

});

function animate() {

  requestAnimationFrame(animate);

  controls.update();
  renderer.render(scene, camera);

}

animate();