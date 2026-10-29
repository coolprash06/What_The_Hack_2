"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useCourt } from "@/state/courtStore";

export type CourtFocus = "wide" | "judge" | "petitioner" | "defendant" | "witness" | "jury" | "bench";

type Vec3 = [number, number, number];

const SHOTS: Record<CourtFocus, { position: Vec3; target: Vec3 }> = {
  // The whole court: jury box (far left) to the witness stand (right).
  wide: { position: [-2.4, 7.4, 11.5], target: [-2.4, 1.8, -4.2] },
  judge: { position: [-0.3, 4.15, -3.4], target: [0, 3.75, -8.1] },
  // Seen from the petitioner's left, so the jury box sits fully out of frame
  // (behind the camera's left edge) instead of being cut off.
  petitioner: { position: [-5.4, 3.2, 4.2], target: [-3.6, 1.5, -1] },
  defendant: { position: [1.4, 3.1, 4.6], target: [3.6, 1.5, -1] },
  // From in front of the stand, far enough left that the defendant's podium
  // stays out of the sight line.
  witness: { position: [4.4, 3.6, 0.8], target: [6.0, 1.6, -4.8] },
  jury: { position: [-3.6, 4.0, 2.4], target: [-9.4, 1.2, -3.6] },
  bench: { position: [0, 4.4, 3.6], target: [0, 3.2, -6.5] },
};

// Shots that share the screen with a step panel. Matches the overlay layout in
// CourtApp: a 560px side panel from 1024px up, otherwise a bottom sheet. The
// view is shifted so the focused area is centered in the space left over.
const PANEL_SHOTS = new Set<CourtFocus>(["petitioner", "defendant", "witness", "jury", "bench"]);
const SIDE_PANEL_PX = 560;
const DESKTOP_MIN_PX = 1024;

const MOVE_SECONDS = 1.5;
/** Tween progress at which the destination counts as "arrived" for the UI. */
const ARRIVE_AT = 0.8;
/** Longest frame step the tween will take, so a hitch slows it rather than snapping it. */
const MAX_STEP = 1 / 20;

// Look-around: the camera orbits the shot's target by at most this much either
// way, measured from the shot itself, so both directions always get the same range.
const LOOK_YAW = THREE.MathUtils.degToRad(45);
const LOOK_PITCH = THREE.MathUtils.degToRad(4);
const ARROW_STEP = THREE.MathUtils.degToRad(12);
/** Radians turned per screen height dragged. */
const DRAG_SPEED = 2 * Math.PI * 0.45;
const LOOK_DAMPING = 8;

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
const target = new THREE.Vector3();
const viewOffset = { x: 0, y: 0 };
const spherical = new THREE.Spherical();
const scratch = new THREE.Vector3();
/** Current look-around offset from the shot, easing toward the goal. */
const look = { yaw: 0, pitch: 0, goalYaw: 0, goalPitch: 0 };

function aim(yaw: number, pitch: number) {
  look.goalYaw = THREE.MathUtils.clamp(yaw, -LOOK_YAW, LOOK_YAW);
  look.goalPitch = THREE.MathUtils.clamp(pitch, -LOOK_PITCH, LOOK_PITCH);
}

/**
 * Owns the camera. Between shots it tweens the camera to the next shot; once
 * a shot has landed, dragging or the arrow keys orbit it within a fixed,
 * symmetric range around that shot.
 */
export function CameraRig({ focus, onArrive }: { focus: CourtFocus; onArrive?: (focus: CourtFocus) => void }) {
  const canvas = useThree((s) => s.gl.domElement);
  const onArriveRef = useRef(onArrive);
  const move = useRef({ focus: null as CourtFocus | null, t: 1, arrived: true, sizeKey: "" });
  const canLook = useRef(false);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    onArriveRef.current = onArrive;
  }, [onArrive]);

  // Drag to look around. (globals.css turns off the canvas's touch scrolling.)
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!canLook.current || drag.current || (e.pointerType === "mouse" && e.button !== 0)) return;
      drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      // Dragging the lamp chain (or a camera move) takes over mid-drag.
      if (!canLook.current) {
        drag.current = null;
        return;
      }
      const perPixel = DRAG_SPEED / canvas.clientHeight;
      // Same directions as OrbitControls: drag right turns the view right.
      aim(look.goalYaw - (e.clientX - d.x) * perPixel, look.goalPitch - (e.clientY - d.y) * perPixel);
      d.x = e.clientX;
      d.y = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      if (drag.current?.id !== e.pointerId) return;
      drag.current = null;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [canvas]);

  // Left/right arrow keys look around, unless the user is typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (!canLook.current || isTyping()) return;
      e.preventDefault();
      // Same direction as dragging the view that way.
      aim(look.goalYaw + (e.key === "ArrowLeft" ? ARROW_STEP : -ARROW_STEP), look.goalPitch);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useFrame((state, delta) => {
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
      from.position.copy(camera.position);
      from.target.copy(target);
      from.offset = { ...viewOffset };
      resolveShot(focus, width, height, to.position, to.target);
      to.offset = viewOffsetFor(focus, width, height);
      // The move absorbs any look-around; the new shot starts centered.
      look.yaw = look.pitch = look.goalYaw = look.goalPitch = 0;
      drag.current = null;
      m.t = first ? 1 : 0;
      if (refocus || first) m.arrived = false;
      if (first) {
        camera.position.copy(to.position);
        target.copy(to.target);
        Object.assign(viewOffset, to.offset);
      }
    }

    if (m.t < 1) {
      m.t = Math.min(1, m.t + Math.min(delta, MAX_STEP) / MOVE_SECONDS);
      const e = easeInOutCubic(m.t);
      camera.position.lerpVectors(from.position, to.position, e);
      target.lerpVectors(from.target, to.target, e);
      viewOffset.x = THREE.MathUtils.lerp(from.offset.x, to.offset.x, e);
      viewOffset.y = THREE.MathUtils.lerp(from.offset.y, to.offset.y, e);
    } else {
      // Landed: orbit the shot's target by the current look offset.
      look.yaw = THREE.MathUtils.damp(look.yaw, look.goalYaw, LOOK_DAMPING, delta);
      look.pitch = THREE.MathUtils.damp(look.pitch, look.goalPitch, LOOK_DAMPING, delta);
      spherical.setFromVector3(scratch.subVectors(to.position, to.target));
      spherical.theta += look.yaw;
      spherical.phi += look.pitch;
      camera.position.copy(to.target).add(scratch.setFromSpherical(spherical));
    }
    camera.lookAt(target);
    camera.setViewOffset(width, height, viewOffset.x, viewOffset.y, width, height);
    camera.updateProjectionMatrix();

    if (!m.arrived && m.t >= ARRIVE_AT) {
      m.arrived = true;
      onArriveRef.current?.(focus);
    }

    // Looking around only once a shot has landed, and never while the lamp
    // chain is being dragged.
    const { lampOn, controlsEnabled } = useCourt.getState();
    canLook.current = m.t >= 1 && lampOn && controlsEnabled;
  });

  return null;
}
