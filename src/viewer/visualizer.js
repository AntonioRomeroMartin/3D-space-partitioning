import * as THREE from "three";
import { getHeightColor } from "./colorRamp.js"; 

export class TreeVisualizer {
  constructor(scene) {
    this.scene = scene;
    this.solidMesh = null;
    this.wireframeMesh = null;
    
    this.boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.dummy = new THREE.Object3D();
    
    this.showSolid = true;
    this.showWireframe = true;

    // --- 1. MEMORY LEAK GEFIXT: Materialen 1x in de constructor aanmaken ---
    // Jouw specifieke instellingen (transparent: false) blijven behouden!
    this.solidMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,     
      transparent: false, 
      opacity: 0.15,
      roughness: 0.4,
      metalness: 0.1
    });

    this.wireMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffffff, 
      wireframe: true, 
      transparent: true, 
      opacity: 0.4,
      depthWrite: false,
    });
  }

  setVisibility(showSolid, showWireframe) {
    this.showSolid = showSolid;
    this.showWireframe = showWireframe;
    
    if (this.solidMesh) this.solidMesh.visible = this.showSolid;
    if (this.wireframeMesh) this.wireframeMesh.visible = this.showWireframe;
  }

  update(nodes, zMin, zMax) {
    this.clear();

    if (!nodes || nodes.length === 0) return;

    const count = nodes.length;

    // --- 2. Hergebruik de gemaakte materialen in plaats van new THREE... ---
    this.solidMesh = new THREE.InstancedMesh(this.boxGeometry, this.solidMaterial, count);
    this.wireframeMesh = new THREE.InstancedMesh(this.boxGeometry, this.wireMaterial, count);

    // Array om kleuren puur voor de solide kubussen op te slaan
    const colorArray = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const node = nodes[i];
      
      const size = new THREE.Vector3();
      node.bounds.getSize(size);
      
      const center = new THREE.Vector3();
      node.bounds.getCenter(center);

      this.dummy.position.copy(center);
      this.dummy.scale.copy(size);
      this.dummy.updateMatrix();

      this.solidMesh.setMatrixAt(i, this.dummy.matrix);
      this.wireframeMesh.setMatrixAt(i, this.dummy.matrix);

      // Gradient sampling
      const cubeColor = getHeightColor(center.z, zMin, zMax);
      
      // Stop de kleuren in de buffer
      colorArray[i * 3] = cubeColor.r;
      colorArray[i * 3 + 1] = cubeColor.g;
      colorArray[i * 3 + 2] = cubeColor.b;
    }

    // Koppel de kleur-array ALLEEN aan de solidMesh
    const colorAttribute = new THREE.InstancedBufferAttribute(colorArray, 3);
    this.solidMesh.instanceColor = colorAttribute;

    // --- 3. CRASH GEFIXT: Vraag Three.js om te updaten wat bestaat ---
    this.solidMesh.instanceMatrix.needsUpdate = true;
    this.solidMesh.instanceColor.needsUpdate = true;

    this.wireframeMesh.instanceMatrix.needsUpdate = true;
    // Omdat de wireframe géén eigen kleuren-array heeft, mag deze lijn NIET uitvoeren!
    // this.wireframeMesh.instanceColor.needsUpdate = true; 

    // Visibiliteit toepassen
    this.solidMesh.visible = this.showSolid;
    this.wireframeMesh.visible = this.showWireframe;

    this.scene.add(this.solidMesh);
    this.scene.add(this.wireframeMesh);
  }

  clear() {
    if (this.solidMesh) {
      this.scene.remove(this.solidMesh);
      this.solidMesh.dispose(); // Gooit alleen de geometry/instance weg, niet het materiaal
      this.solidMesh = null;
    }
    if (this.wireframeMesh) {
      this.scene.remove(this.wireframeMesh);
      this.wireframeMesh.dispose();
      this.wireframeMesh = null;
    }
  }
}