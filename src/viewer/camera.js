import * as THREE from "three";

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

export function fitCameraToObject(camera, object) {

  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3()).length();
  const center = box.getCenter(new THREE.Vector3());

  const distance = size || 1;

  camera.position.set(center.x, center.y, center.z + distance);
  camera.lookAt(center);

  return { center, size: box.getSize(new THREE.Vector3()) };

}