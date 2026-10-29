"use client";

import { useCallback } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { anchorEntries, bindAnchor, COVERS_LABELS_SELECTOR, unbindAnchor, type AnchorEntry } from "../Pinned";

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
/** Labels closer than this to a covering element count as behind it. */
const COVER_MARGIN_PX = 6;

/** Mount once, last inside the <Canvas>, so it runs after the camera has moved. */
export function AnchorProjector() {
  useFrame(({ camera, size }) => {
    camera.updateMatrixWorld();

    // All layout reads happen before any writes, so the frame costs one layout.
    const covers = Array.from(document.querySelectorAll(COVERS_LABELS_SELECTOR), (el) => el.getBoundingClientRect()).filter(
      (r) => r.width > 0 && r.height > 0,
    );
    const placements: { element: HTMLElement; entry: AnchorEntry; x: number; y: number; hidden: boolean }[] = [];
    for (const entry of anchorEntries.values()) {
      const { object, element } = entry;
      if (!object || !element) continue;
      object.getWorldPosition(point).project(camera);
      const x = ((point.x + 1) / 2) * size.width;
      const y = ((1 - point.y) / 2) * size.height;
      let hidden = point.z > 1;
      if (!hidden && entry.avoidUi && covers.length && entry.x !== undefined && entry.y !== undefined) {
        // The label's box as last laid out, moved to where it is about to go.
        const box = (element.firstElementChild ?? element).getBoundingClientRect();
        const dx = x - entry.x;
        const dy = y - entry.y;
        const left = box.left + dx - COVER_MARGIN_PX;
        const right = box.right + dx + COVER_MARGIN_PX;
        const top = box.top + dy - COVER_MARGIN_PX;
        const bottom = box.bottom + dy + COVER_MARGIN_PX;
        hidden = covers.some((c) => left < c.right && right > c.left && top < c.bottom && bottom > c.top);
      }
      placements.push({ element, entry, x, y, hidden });
    }

    for (const { element, entry, x, y, hidden } of placements) {
      element.style.visibility = hidden ? "hidden" : "visible";
      entry.x = x;
      entry.y = y;
      element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }
  });
  return null;
}
