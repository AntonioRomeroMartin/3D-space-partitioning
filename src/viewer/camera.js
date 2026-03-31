/** @module viewer/camera */

import * as THREE from "three";

/**
 * Creates a perspective camera with a 75° FOV positioned along the Z axis.
 * @returns {THREE.PerspectiveCamera}
 */
export function createCamera() {

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  camera.position.set(0, 0, 5);

  return camera;

}

/**
 * Repositions the camera so that the given object fills the view.
 * The camera is placed along the Z axis at a distance proportional to
 * the object's bounding sphere diameter.
 * @param {THREE.PerspectiveCamera} camera
 * @param {THREE.Object3D} object
 * @returns {{ center: THREE.Vector3, size: THREE.Vector3 }}
 */
export function fitCameraToObject(camera, object) {

  const box = new THREE.Box3().setFromObject(object);
  const sizeVec = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  // Use the largest dimension, matching the Octree's perfect-cube root bounds.
  const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
  const distance = (maxDim || 1) * 1.6;

  camera.position.set(center.x, center.y, center.z + distance);
  camera.lookAt(center);

  return { center, size: sizeVec };

}