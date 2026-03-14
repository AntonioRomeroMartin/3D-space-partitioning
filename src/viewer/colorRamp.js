import * as THREE from "three";

/**
 * Maps a Z value to a color ranging from Purple/Blue (low) to Orange/Red (high)
 */
export function getHeightColor(z, zMin, zMax) {
  const range = zMax - zMin || 1;
  const normalizedZ = Math.max(0, Math.min(1, (z - zMin) / range));
  
  // HSL Color wheel: 
  // 0.7 is roughly Purple/Blue. 0.0 is Red.
  // We subtract our normalized Z to slide from 0.7 down to 0.0
  const hue = 0.7 - (normalizedZ * 0.7); 
  
  const color = new THREE.Color();
  color.setHSL(hue, 1.0, 0.5);
  
  return color;
}