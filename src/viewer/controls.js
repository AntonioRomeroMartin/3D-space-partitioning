import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FlyControls } from "three/addons/controls/FlyControls.js";

export function createControls(camera, domElement) {

  const controls = new OrbitControls(camera, domElement);

  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.zoomSpeed = 1;

  controls.rotateSpeed = 0.8;

  return controls;

}

export function createFlyControls(camera, domElement) {
  const controls = new FlyControls(camera, domElement);

  // Apply your preferred configurations here
  controls.movementSpeed = 50.0;
  controls.rollSpeed = 0.3;
  controls.dragToLook = true;
  controls.autoForward = false;

  return controls;
}
