"use client";

import { useCallback, type ReactNode } from "react";
import type { Object3D } from "three";

// Pins ordinary DOM elements (name tags, hints, speech bubbles) to points in
// the 3D scene. The scene places invisible <Anchor>s (scene/anchors.tsx); the
// page renders <Pinned> elements with the same id in its own React tree; the
// scene's <AnchorProjector> moves each element over its anchor every frame.
//
// This replaces drei's <Html>, which mounts a separate React root per element
// and unmounts it synchronously during r3f commits (an error under React 19).

export interface AnchorEntry {
  object?: Object3D;
  element?: HTMLElement;
}

export const anchorEntries = new Map<string, AnchorEntry>();

export function bindAnchor(id: string, patch: AnchorEntry) {
  anchorEntries.set(id, { ...anchorEntries.get(id), ...patch });
}

export function unbindAnchor(id: string, key: keyof AnchorEntry) {
  const entry = anchorEntries.get(id);
  if (!entry) return;
  delete entry[key];
  if (!entry.object && !entry.element) anchorEntries.delete(id);
}

/**
 * A DOM element pinned to the scene <Anchor> with the same id. Its top-left
 * corner sits on the anchor; offset the content with `className`.
 */
export function Pinned({ id, className, children }: { id: string; className?: string; children: ReactNode }) {
  const ref = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) return;
      bindAnchor(id, { element });
      return () => unbindAnchor(id, "element");
    },
    [id],
  );
  return (
    <div ref={ref} className="pointer-events-none absolute top-0 left-0 will-change-transform" style={{ visibility: "hidden" }}>
      <div className={className}>{children}</div>
    </div>
  );
}
