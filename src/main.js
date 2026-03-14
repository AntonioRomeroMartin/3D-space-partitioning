import * as THREE from "three";

import { createScene } from "./viewer/scene.js";
import { createCamera, fitCameraToObject, FlyControls } from "./viewer/camera.js";
import { createRenderer } from "./viewer/renderer.js";
import { loadPointCloud } from "./loaders/pcdLoader.js";

const scene = createScene();
const camera = createCamera();
const renderer = createRenderer();
const flyControls = new FlyControls(camera, renderer.domElement);
const clock = new THREE.Clock();
const datasetSelect = document.getElementById("dataset");

let currentPointCloud = null;

function removeCurrentPointCloud() {

  if (!currentPointCloud) {
    return;
  }

  scene.remove(currentPointCloud);
  currentPointCloud.geometry.dispose();
  currentPointCloud.material.dispose();
  currentPointCloud = null;

}

function loadSelectedDataset() {

  if (!datasetSelect) {
    return;
  }

  datasetSelect.disabled = true;
  removeCurrentPointCloud();

  loadPointCloud(
    scene,
    datasetSelect.value,
    function (points) {

      currentPointCloud = points;
      fitCameraToObject(camera, points);
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

loadSelectedDataset();

function animate() {

  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  flyControls.update(delta);

  renderer.render(scene, camera);

}

animate();