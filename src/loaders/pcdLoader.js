/** @module loaders/pcdLoader */

import { PCDLoader } from "three/addons/loaders/PCDLoader.js";

/**
 * Loads a PCD point cloud from a remote URL or a local File object and adds it to the scene.
 * For local files a temporary object URL is created and revoked after loading.
 * Parsing is performed synchronously on the main thread by Three.js's PCDLoader.
 * @param {THREE.Scene} scene - Scene to add the loaded points to.
 * @param {string|File} source - Remote URL string or local File (binary or ASCII PCD).
 * @param {function(THREE.Points): void} onLoaded - Called with the loaded Points object.
 * @param {function(Error): void} onError - Called if loading or parsing fails.
 * @param {function(ProgressEvent): void} [onProgress] - Called with XHR progress events during download.
 */
export function loadPointCloud(scene, source, onLoaded, onError, onProgress) {
  const isFile = source instanceof File;
  const url = isFile ? URL.createObjectURL(source) : source;

  new PCDLoader().load(
    url,
    (points) => {
      if (isFile) URL.revokeObjectURL(url);
      scene.add(points);
      if (onLoaded) onLoaded(points);
    },
    onProgress,
    (error) => {
      if (isFile) URL.revokeObjectURL(url);
      console.error("Error loading PCD:", error);
      if (onError) onError(error);
    }
  );
}
