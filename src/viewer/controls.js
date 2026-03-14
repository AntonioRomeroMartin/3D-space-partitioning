import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export function createControls(camera, domElement) {

  const controls = new OrbitControls(camera, domElement);

  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.zoomSpeed = 1;

  controls.rotateSpeed = 0.8;

  return controls;

}
