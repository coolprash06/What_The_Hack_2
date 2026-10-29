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
  /** Hide the element while it overlaps any UI marked with COVERS_LABELS. */
  avoidUi?: boolean;
  /** Where the projector last placed the element, in px. */
  x?: number;
  y?: number;
}

export const anchorEntries = new Map<string, AnchorEntry>();

/** Spread onto UI that pinned labels must never show through (panels, nav, progress bar). */
export const COVERS_LABELS = { "data-covers-labels": "" } as const;
export const COVERS_LABELS_SELECTOR = "[data-covers-labels]";

export function bindAnchor(id: string, patch: AnchorEntry) {
  anchorEntries.set(id, { ...anchorEntries.get(id), ...patch });
}

export function unbindAnchor(id: string, key: "object" | "element") {
  const entry = anchorEntries.get(id);
  if (!entry) return;
  delete entry[key];
  if (key === "element") delete entry.avoidUi;
  if (!entry.object && !entry.element) anchorEntries.delete(id);
}

/**
 * A DOM element pinned to the scene <Anchor> with the same id. Its top-left
 * corner sits on the anchor; offset the content with `className`.
 */
export function Pinned({
  id,
  className,
  avoidUi = false,
  children,
}: {
  id: string;
  className?: string;
  avoidUi?: boolean;
  children: ReactNode;
}) {
  const ref = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) return;
      bindAnchor(id, { element, avoidUi });
      return () => unbindAnchor(id, "element");
    },
    [id, avoidUi],
  );
  return (
    <div ref={ref} className="pointer-events-none absolute top-0 left-0 will-change-transform" style={{ visibility: "hidden" }}>
      <div className={className}>{children}</div>
    </div>
  );
}
