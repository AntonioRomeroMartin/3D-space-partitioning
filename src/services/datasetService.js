import * as THREE from "three";

import { loadPointCloud } from "../loaders/pcdLoader.js";
import { fitCameraToObject } from "../viewer/camera.js";
import { getHeightColor } from "../viewer/helpers/colorRamp.js";
import { createLabeledAxes } from "../viewer/helpers/axes.js";

export function createDatasetService({ scene, camera, controls }) {
  let currentPointCloud = null;
  let axes = null;
  let globalZMin = 0;
  let globalZMax = 0;

  function clear() {
    if (currentPointCloud) {
      scene.remove(currentPointCloud);
      currentPointCloud.geometry.dispose();
      currentPointCloud.material.dispose();
      currentPointCloud = null;
    }

    if (axes) {
      scene.remove(axes);
      axes = null;
    }
  }

  function colorizePointCloud(points) {
    const positionAttribute = points.geometry.attributes.position;
    const positions = positionAttribute.array;
    const pointCount = positionAttribute.count;
    const colors = new Float32Array(pointCount * 3);
    const tempColor = new THREE.Color();

    for (let i = 0; i < pointCount; i++) {
      const z = positions[i * 3 + 2];
      getHeightColor(z, globalZMin, globalZMax, tempColor);
      tempColor.toArray(colors, i * 3);
    }

    points.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    points.material = new THREE.PointsMaterial({
      size: 0.007,
      opacity: 0.8,
      vertexColors: true,
    });
  }

  function updateAxes(center, size) {
    if (axes) scene.remove(axes);

    const axisScale = Math.max(size.x, size.y, size.z) / 2;
    axes = createLabeledAxes();
    axes.position.copy(center);
    axes.scale.setScalar(axisScale);
    scene.add(axes);
  }

  function load(datasetPath) {
    clear();

    return new Promise((resolve, reject) => {
      loadPointCloud(
        scene,
        datasetPath,
        (points) => {
          currentPointCloud = points;

          const { center, size } = fitCameraToObject(camera, points);
          const boundingBox = new THREE.Box3().setFromObject(points);

          globalZMin = boundingBox.min.z;
          globalZMax = boundingBox.max.z;

          colorizePointCloud(points);
          updateAxes(center, size);

          controls.target.copy(center);
          controls.update();

          resolve({
            points,
            center,
            size,
            zMin: globalZMin,
            zMax: globalZMax,
          });
        },
        reject,
      );
    });
  }

  function setAxesVisible(visible) {
    if (axes) axes.visible = visible;
  }

  function getPointCloud() {
    return currentPointCloud;
  }

  function getHeightRange() {
    return { zMin: globalZMin, zMax: globalZMax };
  }

  return {
    clear,
    load,
    setAxesVisible,
    getPointCloud,
    getHeightRange,
  };
}