"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useCourt } from "@/state/courtStore";

export type CourtFocus = "wide" | "judge" | "petitioner" | "defendant" | "jury" | "bench";

type Vec3 = [number, number, number];

const SHOTS: Record<CourtFocus, { position: Vec3; target: Vec3 }> = {
  // The whole court: jury box (far left) to the witness stand (right).
  wide: { position: [-2.4, 7.4, 11.5], target: [-2.4, 1.8, -4.2] },
  judge: { position: [-0.3, 4.15, -3.4], target: [0, 3.75, -8.1] },
  // Seen from the petitioner's left, so the jury box sits fully out of frame
  // (behind the camera's left edge) instead of being cut off.
  petitioner: { position: [-5.4, 3.2, 4.2], target: [-3.6, 1.5, -1] },
  defendant: { position: [1.4, 3.1, 4.6], target: [3.6, 1.5, -1] },
  jury: { position: [-3.6, 4.0, 2.4], target: [-9.4, 1.2, -3.6] },
  bench: { position: [0, 4.4, 3.6], target: [0, 3.2, -6.5] },
};

// Shots that share the screen with a step panel. Matches the overlay layout in
// CourtApp: a 560px side panel from 1024px up, otherwise a bottom sheet. The
// view is shifted so the focused area is centered in the space left over.
const PANEL_SHOTS = new Set<CourtFocus>(["petitioner", "defendant", "jury", "bench"]);
const SIDE_PANEL_PX = 560;
const DESKTOP_MIN_PX = 1024;

const MOVE_SECONDS = 1.5;
/** Tween progress at which the destination counts as "arrived" for the UI. */
const ARRIVE_AT = 0.8;
/** Longest frame step the tween will take, so a hitch slows it rather than snapping it. */
const MAX_STEP = 1 / 20;

const LOOK_YAW = THREE.MathUtils.degToRad(35);
const LOOK_PITCH = THREE.MathUtils.degToRad(4);
const ARROW_STEP = THREE.MathUtils.degToRad(12);

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function resolveShot(focus: CourtFocus, width: number, height: number, position: THREE.Vector3, target: THREE.Vector3) {
  const shot = SHOTS[focus];
  target.set(...shot.target);
  position.set(...shot.position);
  // Narrow screens need the camera further back to fit the scene.
  if (width < height) position.sub(target).multiplyScalar(1.5).add(target);
}

function viewOffsetFor(focus: CourtFocus, width: number, height: number) {
  if (!PANEL_SHOTS.has(focus)) return { x: 0, y: 0 };
  return width >= DESKTOP_MIN_PX ? { x: SIDE_PANEL_PX / 2, y: 0 } : { x: 0, y: height * 0.24 };
}

function isTyping() {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
}

// Per-frame scratch state (there is only ever one rig).
const from = { position: new THREE.Vector3(), target: new THREE.Vector3(), offset: { x: 0, y: 0 } };
const to = { position: new THREE.Vector3(), target: new THREE.Vector3(), offset: { x: 0, y: 0 } };
const viewOffset = { x: 0, y: 0 };
const spherical = new THREE.Spherical();
const scratch = new THREE.Vector3();

/**
 * Owns the camera. Between shots it tweens the camera on its own with the
 * orbit controls disabled; once a shot has landed it hands over to
 * OrbitControls, limited to looking around that shot. The two never drive the
 * camera in the same frame.
 */
export function CameraRig({ focus, onArrive }: { focus: CourtFocus; onArrive?: (focus: CourtFocus) => void }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const onArriveRef = useRef(onArrive);
  const move = useRef({ focus: null as CourtFocus | null, t: 1, arrived: true, sizeKey: "" });

  useEffect(() => {
    onArriveRef.current = onArrive;
  }, [onArrive]);

  // Left/right arrow keys look around, unless the user is typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const c = controls.current;
      if (!c?.enabled || isTyping()) return;
      e.preventDefault();
      // Same direction as dragging the view that way.
      const step = e.key === "ArrowLeft" ? ARROW_STEP : -ARROW_STEP;
      c.setAzimuthalAngle(THREE.MathUtils.clamp(c.getAzimuthalAngle() + step, c.minAzimuthAngle, c.maxAzimuthAngle));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useFrame((state, delta) => {
    const c = controls.current;
    if (!c) return;
    const camera = state.camera as THREE.PerspectiveCamera;
    const { width, height } = state.size;
    const m = move.current;

    // A new shot, or a resize that changes the framing: start a move from
    // wherever the camera is now (including after the user looked around).
    const sizeKey = `${width}x${height}`;
    if (m.focus !== focus || m.sizeKey !== sizeKey) {
      const first = m.focus === null;
      const refocus = m.focus !== focus;
      m.focus = focus;
      m.sizeKey = sizeKey;
      c.enabled = false;
      from.position.copy(camera.position);
      from.target.copy(c.target);
      from.offset = { ...viewOffset };
      resolveShot(focus, width, height, to.position, to.target);
      to.offset = viewOffsetFor(focus, width, height);
      m.t = first ? 1 : 0;
      if (refocus || first) m.arrived = false;
      if (first) {
        camera.position.copy(to.position);
        c.target.copy(to.target);
        Object.assign(viewOffset, to.offset);
      }
    }

    if (m.t < 1) {
      m.t = Math.min(1, m.t + Math.min(delta, MAX_STEP) / MOVE_SECONDS);
      const e = easeInOutCubic(m.t);
      camera.position.lerpVectors(from.position, to.position, e);
      c.target.lerpVectors(from.target, to.target, e);
      viewOffset.x = THREE.MathUtils.lerp(from.offset.x, to.offset.x, e);
      viewOffset.y = THREE.MathUtils.lerp(from.offset.y, to.offset.y, e);
    }
    if (!c.enabled) camera.lookAt(c.target);
    camera.setViewOffset(width, height, viewOffset.x, viewOffset.y, width, height);
    camera.updateProjectionMatrix();

    if (!m.arrived && m.t >= ARRIVE_AT) {
      m.arrived = true;
      onArriveRef.current?.(focus);
    }

    // Hand over to the orbit controls once landed (and while the lamp chain
    // isn't being dragged), limited to looking around this shot.
    const { lampOn, controlsEnabled } = useCourt.getState();
    const lookAllowed = m.t >= 1 && lampOn && controlsEnabled;
    if (lookAllowed && !c.enabled) {
      spherical.setFromVector3(scratch.subVectors(to.position, to.target));
      c.minAzimuthAngle = spherical.theta - LOOK_YAW;
      c.maxAzimuthAngle = spherical.theta + LOOK_YAW;
      c.minPolarAngle = spherical.phi - LOOK_PITCH;
      c.maxPolarAngle = spherical.phi + LOOK_PITCH;
      // Clear any rotation left over from a drag before the last move.
      c.setAzimuthalAngle(c.getAzimuthalAngle());
      c.setPolarAngle(c.getPolarAngle());
    }
    c.enabled = lookAllowed;
  });

  return <OrbitControls ref={controls} enablePan={false} enableZoom={false} dampingFactor={0.08} rotateSpeed={0.45} />;
}
