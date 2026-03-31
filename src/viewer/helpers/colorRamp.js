/** @module viewer/helpers/colorRamp */

import * as THREE from "three";

/**
 * Maps a Z coordinate to a color on the blue → red HSL gradient.
 * Low Z values map to hue 0.7 (purple/blue); high Z values map to hue 0.0 (red).
 * The result is written into `outColor` to avoid allocating a new Color object per point.
 * @param {number} z - The Z coordinate of the point.
 * @param {number} zMin - Minimum Z in the dataset (maps to blue).
 * @param {number} zMax - Maximum Z in the dataset (maps to red).
 * @param {THREE.Color} outColor - Color instance to write the result into.
 */
export function getHeightColor(z, zMin, zMax, outColor) {
  const range = zMax - zMin || 1;
  const normalizedZ = Math.max(0, Math.min(1, (z - zMin) / range));
  // Hue 0.7 (purple/blue) → 0.0 (red) across the HSL wheel as Z goes low → high
  const hue = 0.7 - (normalizedZ * 0.7);
  outColor.setHSL(hue, 1.0, 0.5);
}