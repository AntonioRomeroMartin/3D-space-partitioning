/**
 * @namespace viewer.visualizers
 * @description Renderers for each spatial partitioning algorithm.
 */

import * as THREE from "three";

/**
 * Base visualizer for axis-aligned tree structures (Octree, k-d Tree).
 * Renders the active nodes as two overlapping InstancedMeshes: a semi-transparent
 * solid mesh and a wireframe mesh, both sharing the same BoxGeometry.
 * Subclasses override {@link TreeVisualizer#getNodeColor} to supply per-node colors.
 * @memberof viewer.visualizers
 * @alias TreeVisualizer
 */
export class TreeVisualizer {
  /**
   * @param {THREE.Scene} scene - The scene to add meshes to.
   */
  constructor(scene) {
    this.scene = scene;
    this.solidMesh = null;
    this.wireframeMesh = null;

    this.boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.dummy = new THREE.Object3D();

    this.showSolid = true;
    this.showWireframe = true;

    this.solidMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7,
      roughness: 0.4,
      metalness: 0.1,
    });

    this.wireMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });

    this._tmpSize = new THREE.Vector3();
    this._tmpCenter = new THREE.Vector3();
    this._tmpColor = new THREE.Color();
  }

  /**
   * Toggles the visibility of the solid and wireframe meshes independently.
   * @param {boolean} showSolid
   * @param {boolean} showWireframe
   */
  setVisibility(showSolid, showWireframe) {
    this.showSolid = showSolid;
    this.showWireframe = showWireframe;

    if (this.solidMesh) this.solidMesh.visible = this.showSolid;
    if (this.wireframeMesh) this.wireframeMesh.visible = this.showWireframe;
  }

  /**
   * Rebuilds both instanced meshes from a list of active tree nodes.
   * @param {TreeNode[]} nodes - Nodes returned by {@link BaseTree#getNodesAtDepth}.
   * @param {number} zMin - Dataset minimum Z (used for height coloring).
   * @param {number} zMax - Dataset maximum Z (used for height coloring).
   */
  update(nodes, zMin, zMax) {
    this.clear();

    if (!nodes || nodes.length === 0) return;

    const count = nodes.length;
    this.solidMesh = new THREE.InstancedMesh(this.boxGeometry, this.solidMaterial, count);
    this.wireframeMesh = new THREE.InstancedMesh(this.boxGeometry, this.wireMaterial, count);

    const colorArray = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const node = nodes[i];

      node.bounds.getCenter(this._tmpCenter);
      node.bounds.getSize(this._tmpSize);

      this.dummy.position.copy(this._tmpCenter);
      this.dummy.scale.copy(this._tmpSize);
      this.dummy.updateMatrix();

      this.solidMesh.setMatrixAt(i, this.dummy.matrix);
      this.wireframeMesh.setMatrixAt(i, this.dummy.matrix);

      this.getNodeColor(node, this._tmpCenter, zMin, zMax, this._tmpColor);
      this._tmpColor.toArray(colorArray, i * 3);
    }

    this.solidMesh.instanceColor = new THREE.InstancedBufferAttribute(colorArray, 3);
    this.solidMesh.instanceMatrix.needsUpdate = true;
    this.solidMesh.instanceColor.needsUpdate = true;
    this.wireframeMesh.instanceMatrix.needsUpdate = true;

    this.solidMesh.visible = this.showSolid;
    this.wireframeMesh.visible = this.showWireframe;

    this.scene.add(this.solidMesh);
    this.scene.add(this.wireframeMesh);
  }

  /**
   * Computes the color for a single node. Override in subclasses.
   * @param {TreeNode} node
   * @param {THREE.Vector3} center - Center of the node's bounding box.
   * @param {number} zMin
   * @param {number} zMax
   * @param {THREE.Color} outColor - Write the result here.
   */
  getNodeColor(node, center, zMin, zMax, outColor) {
    outColor.setRGB(1, 1, 1);
  }

  /**
   * Removes and disposes both instanced meshes from the scene.
   */
  clear() {
    if (this.solidMesh) {
      this.scene.remove(this.solidMesh);
      this.solidMesh.dispose();
      this.solidMesh = null;
    }

    if (this.wireframeMesh) {
      this.scene.remove(this.wireframeMesh);
      this.wireframeMesh.dispose();
      this.wireframeMesh = null;
    }
  }
}
