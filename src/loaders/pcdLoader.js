/**
 * @namespace loaders
 * @description Point cloud file loaders.
 */

import * as THREE from "three";
import { PCDLoader } from "three/addons/loaders/PCDLoader.js";

/**
 * Attempts to parse a binary PCD with FIELDS=x y z, SIZE=4 4 4, TYPE=F F F directly
 * from an ArrayBuffer, bypassing DataView field-by-field reads.
 * The positions Float32Array is created as a zero-copy view when the data region is
 * 4-byte aligned, or as a single slice copy otherwise.
 * @param {ArrayBuffer} buffer
 * @returns {THREE.Points|null} Parsed point cloud, or null if the format is not supported.
 */
function tryFastParsePcd(buffer) {
  const headerView = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 4096));

  // Locate end of ASCII header: "DATA binary\n"
  const MARKER = [68, 65, 84, 65, 32, 98, 105, 110, 97, 114, 121, 10];
  let headerEnd = -1;
  outer: for (let i = 0, limit = headerView.length - MARKER.length; i <= limit; i++) {
    for (let j = 0; j < MARKER.length; j++) {
      if (headerView[i + j] !== MARKER[j]) continue outer;
    }
    headerEnd = i + MARKER.length;
    break;
  }
  if (headerEnd === -1) return null;

  const headerText = new TextDecoder().decode(headerView.subarray(0, headerEnd));
  const get = (field) => {
    const m = headerText.match(new RegExp(`^${field}\\s+(.+?)\\s*$`, 'm'));
    return m ? m[1] : '';
  };

  // Only handle pure x/y/z Float32 binary — anything else falls back to PCDLoader.
  if (get('FIELDS') !== 'x y z') return null;
  if (get('TYPE')   !== 'F F F') return null;
  if (get('SIZE')   !== '4 4 4') return null;

  const pointCount = parseInt(get('POINTS') || get('WIDTH'));
  if (!pointCount || buffer.byteLength - headerEnd < pointCount * 12) return null;

  // Float32Array requires 4-byte alignment; the header rarely lands on a multiple of 4.
  const positions = (headerEnd % 4 === 0)
    ? new Float32Array(buffer, headerEnd, pointCount * 3)
    : new Float32Array(buffer.slice(headerEnd, headerEnd + pointCount * 12));

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.01 }));
}

/**
 * Downloads a URL as an ArrayBuffer using XHR so that native ProgressEvents are
 * forwarded directly to the caller — no chunk assembly or custom progress shim needed.
 * @param {string} url
 * @param {function(ProgressEvent): void} [onProgress]
 * @returns {Promise<ArrayBuffer>}
 */
function fetchArrayBuffer(url, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'arraybuffer';
    if (onProgress) xhr.onprogress = onProgress;
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response);
      else reject(new Error(`HTTP ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.open('GET', url);
    xhr.send();
  });
}

/**
 * Loads a PCD point cloud from a remote URL or a local File object and adds it to the scene.
 * Binary x/y/z Float32 files (all bundled datasets) use a fast-path parser that creates
 * the geometry buffer directly from the raw bytes after the header, avoiding the
 * DataView field-by-field reads of Three.js PCDLoader.
 * ASCII and non-standard binary PCD files fall back to Three.js PCDLoader.
 * @memberof loaders
 * @alias loadPointCloud
 * @param {THREE.Scene} scene - Scene to add the loaded points to.
 * @param {string|File} source - Remote URL string or local File.
 * @param {function(THREE.Points): void} onLoaded - Called with the loaded Points object.
 * @param {function(Error): void} onError - Called if loading or parsing fails.
 * @param {function(ProgressEvent): void} [onProgress] - XHR progress events (remote only).
 */
export function loadPointCloud(scene, source, onLoaded, onError, onProgress) {
  const isFile = source instanceof File;

  const parseBuffer = (buffer) => {
    const points = tryFastParsePcd(buffer);
    if (points) {
      scene.add(points);
      onLoaded(points);
      return;
    }
    // Fallback: ASCII PCD or binary with extra fields / non-float types.
    const blob    = new Blob([buffer], { type: 'application/octet-stream' });
    const blobUrl = URL.createObjectURL(blob);
    new PCDLoader().load(
      blobUrl,
      (pts) => { URL.revokeObjectURL(blobUrl); scene.add(pts); onLoaded(pts); },
      undefined,
      (err) => { URL.revokeObjectURL(blobUrl); onError(err); }
    );
  };

  if (isFile) {
    source.arrayBuffer().then(parseBuffer).catch(onError);
  } else {
    fetchArrayBuffer(source, onProgress).then(parseBuffer).catch(onError);
  }
}
