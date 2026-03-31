/** @module services/datasetService */

import * as THREE from "three";

import { loadPointCloud } from "../loaders/pcdLoader.js";
import { fitCameraToObject } from "../viewer/camera.js";
import { getHeightColor } from "../viewer/helpers/colorRamp.js";
import { createLabeledAxes } from "../viewer/helpers/axes.js";

/**
 * Factory that creates the dataset service responsible for loading, caching,
 * colorizing, and displaying PCD point clouds in the scene.
 *
 * Remote datasets (URL strings) are cached by URL so subsequent loads are instant.
 * Local files (File objects) are never cached.
 *
 * @param {object} deps
 * @param {THREE.Scene} deps.scene
 * @param {THREE.PerspectiveCamera} deps.camera
 * @param {OrbitControls} deps.controls
 * @returns {{
 *   load: function(string|File, function): Promise,
 *   clear: function(): void,
 *   setAxesVisible: function(boolean): void,
 *   getPointCloud: function(): THREE.Points|null,
 *   getHeightRange: function(): {zMin: number, zMax: number},
 *   hasDataset: function(string): boolean
 * }}
 */
export function createDatasetService({ scene, camera, controls }) {
  let currentPointCloud = null;
  let axes = null;
  let globalZMin = 0;
  let globalZMax = 0;
  const datasetCache = new Map();

  function clearCurrentView() {
    if (currentPointCloud) {
      scene.remove(currentPointCloud);
      currentPointCloud = null;
    }
    if (axes) {
      scene.remove(axes);
      axes = null;
    }
  }

  function disposePointCloud(points) {
    if (!points) return;
    if (points.geometry) points.geometry.dispose();
    if (points.material) points.material.dispose();
  }

  function clear() {
    clearCurrentView();
    const uniquePointClouds = new Set();
    for (const cached of datasetCache.values()) {
      if (cached?.points) uniquePointClouds.add(cached.points);
    }
    for (const points of uniquePointClouds) {
      disposePointCloud(points);
    }
    datasetCache.clear();
    globalZMin = 0;
    globalZMax = 0;
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

  /**
   * Loads a point cloud from a remote URL string or a local File object.
   * Remote datasets are cached; local files are not.
   * @param {string|File} source
   */
  function load(source, onProgress) {
    const isFile = source instanceof File;
    const cacheKey = isFile ? null : source;

    clearCurrentView();

    if (cacheKey && datasetCache.has(cacheKey)) {
      const cached = datasetCache.get(cacheKey);
      currentPointCloud = cached.points;
      globalZMin = cached.zMin;
      globalZMax = cached.zMax;
      scene.add(currentPointCloud);
      updateAxes(cached.center, cached.size);
      fitCameraToObject(camera, currentPointCloud);
      controls.target.copy(cached.center);
      controls.update();
      return Promise.resolve({
        points: currentPointCloud,
        center: cached.center,
        size: cached.size,
        zMin: globalZMin,
        zMax: globalZMax,
      });
    }

    return new Promise((resolve, reject) => {
      loadPointCloud(
        scene,
        source,
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
          if (cacheKey) {
            datasetCache.set(cacheKey, {
              points,
              center: center.clone(),
              size: size.clone(),
              zMin: globalZMin,
              zMax: globalZMax,
            });
          }
          resolve({ points, center: center.clone(), size: size.clone(), zMin: globalZMin, zMax: globalZMax });
        },
        reject,
        onProgress
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

  function hasDataset(path) {
    return datasetCache.has(path);
  }

  return {
    clear,
    load,
    setAxesVisible,
    getPointCloud,
    getHeightRange,
    hasDataset,
  };
}
