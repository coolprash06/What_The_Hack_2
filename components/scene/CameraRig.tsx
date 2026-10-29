"use client";

import { useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export type CourtFocus = "petitioner" | "defendant" | "jury" | "bench";

type Vec3 = [number, number, number];

const SHOTS: Record<CourtFocus, { position: Vec3; target: Vec3 }> = {
  petitioner: { position: [-1.2, 3.3, 5.2], target: [-3.6, 1.4, -1] },
  defendant: { position: [1.2, 3.3, 5.2], target: [3.6, 1.4, -1] },
  jury: { position: [-3.4, 4.2, 2.6], target: [-9.4, 1.0, -3.6] },
  bench: { position: [0, 4.4, 3.6], target: [0, 3.2, -6.5] },
};

// Matches the overlay layout in CourtApp: a 560px side panel from 1024px up,
// otherwise a bottom sheet. The view is shifted so the focused area stays visible.
const SIDE_PANEL_PX = 560;
const DESKTOP_MIN_PX = 1024;

// Per-frame scratch vectors (there is only ever one rig).
const v = {
  position: new THREE.Vector3(),
  target: new THREE.Vector3(),
  lookAt: new THREE.Vector3(0, 2, -4),
};

export function CameraRig({ focus }: { focus: CourtFocus }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);

  useEffect(() => {
    const { width, height } = size;
    if (width >= DESKTOP_MIN_PX) {
      camera.setViewOffset(width, height, SIDE_PANEL_PX / 2, 0, width, height);
    } else {
      camera.setViewOffset(width, height, 0, height * 0.24, width, height);
    }
    camera.updateProjectionMatrix();
    return () => camera.clearViewOffset();
  }, [camera, size]);

  useFrame((state, delta) => {
    const shot = SHOTS[focus];
    const t = state.clock.elapsedTime;
    v.target.set(...shot.target);
    v.position.set(...shot.position);
    // Narrow screens need the camera further back to fit the scene.
    if (size.width < size.height) v.position.sub(v.target).multiplyScalar(1.5).add(v.target);
    // Slow handheld drift so the room never feels frozen.
    v.position.x += Math.sin(t * 0.3) * 0.12;
    v.position.y += Math.sin(t * 0.45) * 0.06;

    const k = 1 - Math.exp(-2 * delta);
    state.camera.position.lerp(v.position, k);
    v.lookAt.lerp(v.target, k);
    state.camera.lookAt(v.lookAt);
  });

  return null;
}
