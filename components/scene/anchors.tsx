"use client";

import { useCallback } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { anchorEntries, bindAnchor, unbindAnchor } from "../Pinned";

/** An invisible point in the scene that a <Pinned> element follows. */
export function Anchor({ anchor, ...props }: ThreeElements["object3D"] & { anchor: string }) {
  const ref = useCallback(
    (object: THREE.Object3D | null) => {
      if (!object) return;
      bindAnchor(anchor, { object });
      return () => unbindAnchor(anchor, "object");
    },
    [anchor],
  );
  return <object3D ref={ref} {...props} />;
}

const point = new THREE.Vector3();

/** Mount once, last inside the <Canvas>, so it runs after the camera has moved. */
export function AnchorProjector() {
  useFrame(({ camera, size }) => {
    camera.updateMatrixWorld();
    for (const { object, element } of anchorEntries.values()) {
      if (!object || !element) continue;
      object.getWorldPosition(point).project(camera);
      const behind = point.z > 1;
      element.style.visibility = behind ? "hidden" : "visible";
      if (behind) continue;
      const x = ((point.x + 1) / 2) * size.width;
      const y = ((1 - point.y) / 2) * size.height;
      element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }
  });
  return null;
}
