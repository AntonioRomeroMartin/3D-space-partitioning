import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/**
 * Creates OrbitControls with damping enabled.
 * Left-drag orbits, scroll wheel zooms. Right-click and panning are disabled.
 * @memberof viewer
 * @alias createControls
 * @param {THREE.Camera} camera
 * @param {HTMLElement} domElement - The renderer's canvas element.
 * @returns {OrbitControls}
 */
export function createControls(camera, domElement) {

  const controls = new OrbitControls(camera, domElement);

  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.zoomSpeed = 1;
  controls.rotateSpeed = 0.8;

  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: null,
  };

  return controls;

}
