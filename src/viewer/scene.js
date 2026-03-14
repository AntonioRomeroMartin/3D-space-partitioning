import * as THREE from "three";

export function createScene() {

  const scene = new THREE.Scene();

  scene.background = new THREE.Color(0x111111);

  // Add lights so we can actually see the 3D shapes of the solid cubes
  const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 3.0);
  dirLight.position.set(50, 100, 50);
  scene.add(dirLight);

  // Extra lampje vanaf de andere kant om te donkere schaduwen op te lichten
  const backLight = new THREE.DirectionalLight(0xffffff, 2.0);
  backLight.position.set(-50, 50, -50);
  scene.add(backLight);

  return scene;

}