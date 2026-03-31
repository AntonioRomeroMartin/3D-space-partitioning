import * as THREE from "three";

/**
 * Maps a Z value to a color ranging from Purple/Blue (low) to Orange/Red (high)
 */
export function getHeightColor(z, zMin, zMax, outColor) {
  const range = zMax - zMin || 1;
  const normalizedZ = Math.max(0, Math.min(1, (z - zMin) / range));
  // Hue 0.7 (purple/blue) → 0.0 (red) across the HSL wheel as Z goes low → high
  const hue = 0.7 - (normalizedZ * 0.7);
  outColor.setHSL(hue, 1.0, 0.5);
}