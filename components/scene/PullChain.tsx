"use client";

import { useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { MathUtils, type Group, type MeshStandardMaterial } from "three";
import { PALETTE } from "@/lib/palette";
import { QUALITY } from "@/lib/capabilities";
import { useCourt } from "@/state/courtStore";
import { Anchor } from "./anchors";

const CHAIN_LENGTH = 0.21;
const BEAD_RADIUS = 0.028;

/** How far (in world units) the chain must travel before the pull registers. */
const PULL_THRESHOLD = 0.065;
/** Hard stop so the chain cannot be dragged into the desk. */
const MAX_TRAVEL = 0.15;
/** Screen pixels to world units. Tuned so a ~70px drag completes the pull. */
const DRAG_SCALE = 1 / 520;
/** Pointer travel under this is treated as a click, not a drag. */
const TAP_SLOP = 6;
/* Matches DARK_SHEEN in DeskLamp: the chain has to stay on the lamp's
   silhouette in the dark, since it is the part the visitor reaches for. */
const DARK_SHEEN = 0.05;
/** Lift on hover, on top of whatever sheen the chain currently carries. */
const HOVER_LIFT = 0.45;
/** Radius of the invisible grab cylinder around the chain. */
const HIT_RADIUS = 0.22;

type Vec3 = [number, number, number];

/**
 * The pull-chain hanging off the lamp shade. This is the only object in the
 * scene that can turn the light on - nothing else in the room responds.
 *
 * Supports both a plain click and a drag-down gesture; the chain follows the
 * pointer while dragging and springs back on release.
 */
export function PullChain({ anchor = [0, 0, 0] }: { anchor?: Vec3 }) {
  const groupRef = useRef<Group>(null);
  const offset = useRef(0);
  const target = useRef(0);
  const glow = useRef(0);
  const cordRef = useRef<MeshStandardMaterial>(null);
  const beadRef = useRef<MeshStandardMaterial>(null);

  const drag = useRef({ active: false, startY: 0, moved: 0 });
  const [hovered, setHovered] = useState(false);

  const lampOn = useCourt((s) => s.lampOn);
  const pulling = useCourt((s) => s.pulling);
  const motionOn = useCourt((s) => s.motionOn);
  const pullLamp = useCourt((s) => s.pullLamp);
  const setControlsEnabled = useCourt((s) => s.setControlsEnabled);

  const interactive = !lampOn && !pulling;

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // While the lamp is firing, yank the chain to full travel so the pull reads
    // as a deliberate mechanical action rather than a state flip.
    const resting = pulling && motionOn ? MAX_TRAVEL : target.current;
    offset.current = MathUtils.damp(offset.current, resting, 14, delta);

    // A slow idle sway keeps the chain from looking frozen in the dark room.
    const sway = motionOn && !drag.current.active ? Math.sin(state.clock.elapsedTime * 1.1) * 0.006 : 0;

    groupRef.current.position.y = anchor[1] - offset.current;
    groupRef.current.rotation.z = sway + offset.current * 0.12;

    // Sheen fades out as the room lights, mirroring the lamp's own ramp.
    glow.current = motionOn ? MathUtils.damp(glow.current, lampOn ? 1 : 0, 9, delta) : lampOn ? 1 : 0;

    const sheen = (1 - glow.current) * DARK_SHEEN;
    if (cordRef.current) cordRef.current.emissiveIntensity = sheen;
    if (beadRef.current) {
      beadRef.current.emissiveIntensity = sheen + (hovered && interactive ? HOVER_LIFT : 0);
    }
  });

  function endDrag(event: ThreeEvent<PointerEvent>) {
    if (!drag.current.active) return;
    drag.current.active = false;
    (event.target as Element | null)?.releasePointerCapture?.(event.pointerId);
    setControlsEnabled(true);

    const pulledFarEnough = offset.current > PULL_THRESHOLD;
    const wasTap = drag.current.moved < TAP_SLOP;

    target.current = 0;
    // Either a real pull or a real click turns the lamp on.
    if (pulledFarEnough || wasTap) pullLamp();
  }

  const handlers = interactive
    ? {
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "grab";
        },
        onPointerOut: () => {
          setHovered(false);
          if (!drag.current.active) document.body.style.cursor = "auto";
        },
        onPointerDown: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          drag.current = { active: true, startY: e.clientY, moved: 0 };
          (e.target as Element | null)?.setPointerCapture?.(e.pointerId);
          setControlsEnabled(false);
          document.body.style.cursor = "grabbing";
        },
        onPointerMove: (e: ThreeEvent<PointerEvent>) => {
          if (!drag.current.active) return;
          e.stopPropagation();
          const dy = e.clientY - drag.current.startY;
          drag.current.moved = Math.max(drag.current.moved, Math.abs(dy));
          target.current = MathUtils.clamp(dy * DRAG_SCALE, 0, MAX_TRAVEL);
        },
        onPointerUp: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          document.body.style.cursor = "auto";
          endDrag(e);
        },
        onPointerCancel: endDrag,
      }
    : {};

  return (
    <group ref={groupRef} position={anchor}>
      {/* Cord */}
      <mesh position={[0, -CHAIN_LENGTH / 2, 0]}>
        <cylinderGeometry args={[0.006, 0.006, CHAIN_LENGTH, 6]} />
        <meshStandardMaterial
          ref={cordRef}
          color={PALETTE.chain}
          emissive={PALETTE.chain}
          emissiveIntensity={DARK_SHEEN}
          roughness={0.45}
          metalness={0.45}
        />
      </mesh>

      {/* Bead at the end - the visual grab target */}
      <mesh position={[0, -CHAIN_LENGTH - BEAD_RADIUS, 0]} castShadow={QUALITY.shadows}>
        <sphereGeometry args={[BEAD_RADIUS, 12, 10]} />
        <meshStandardMaterial
          ref={beadRef}
          color={PALETTE.chain}
          roughness={0.3}
          metalness={0.55}
          emissive={PALETTE.chain}
          emissiveIntensity={DARK_SHEEN}
        />
      </mesh>

      {/* Invisible, generously sized hit area - the visible cord is far too
          thin to grab reliably, especially on touch. Sized up from the
          original (0.11) so it stays easy to grab from the court's wide shot. */}
      <mesh position={[0, -CHAIN_LENGTH / 2 - 0.06, 0]} visible={false} {...handlers}>
        <cylinderGeometry args={[HIT_RADIUS, HIT_RADIUS, CHAIN_LENGTH + 0.36, 8]} />
      </mesh>

      {/* Where the down-arrow cue is pinned (rendered by the page's overlay,
          shown only before the pull). */}
      <Anchor anchor="pull-cue" position={[0, -CHAIN_LENGTH - 0.14, 0]} />
    </group>
  );
}
