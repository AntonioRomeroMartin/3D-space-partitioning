/** @module viewer/renderer */

import * as THREE from "three";

/**
 * Creates and configures the Three.js WebGL renderer, sized to the full viewport,
 * and appends its canvas to the document body.
 * @returns {THREE.WebGLRenderer}
 */
export function createRenderer() {

  const renderer = new THREE.WebGLRenderer();

  renderer.setSize(window.innerWidth, window.innerHeight);

  document.body.appendChild(renderer.domElement);

  return renderer;

}