import { PCDLoader } from "three/addons/loaders/PCDLoader.js";

/**
 * Loads a PCD point cloud from a remote URL path or a local File object.
 * @param {THREE.Scene} scene
 * @param {string|File} source - URL string or File from a file input / drag & drop
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
