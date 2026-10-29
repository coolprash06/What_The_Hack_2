"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Box, COLORS, Cylinder } from "./primitives";

type Vec3 = [number, number, number];

// Deterministic pseudo-random so the floor looks the same on every render.
const rand = (i: number) => {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const PLANK_WIDTH = 0.5;
const PLANK_COLORS = ["#3a2214", "#331d11", "#2c180e", "#40271a", "#36200f"];

function buildPlanks() {
  const planks: { x: number; z: number; length: number; color: string }[] = [];
  const [zStart, zEnd] = [-12, 11];
  for (let col = 0; col < 56; col++) {
    const x = -14 + PLANK_WIDTH * (col + 0.5);
    let z = zStart;
    let seg = 0;
    // Stagger the first joint so seams don't line up across columns.
    let length = 1 + rand(col) * 3;
    while (z < zEnd) {
      const len = Math.min(length, zEnd - z);
      const color = PLANK_COLORS[Math.floor(rand(col * 31 + seg * 7) * PLANK_COLORS.length)];
      planks.push({ x, z: z + len / 2, length: len, color });
      z += len;
      seg++;
      length = 3 + rand(col * 13 + seg) * 2;
    }
  }
  return planks;
}

const PLANKS = buildPlanks();

export function Floor() {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    PLANKS.forEach((p, i) => {
      dummy.position.set(p.x, -0.05, p.z);
      dummy.scale.set(PLANK_WIDTH * 0.96, 0.1, p.length - 0.03);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, color.set(p.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.11, -0.5]} receiveShadow>
        <planeGeometry args={[30, 24]} />
        <meshStandardMaterial color={COLORS.floorGap} />
      </mesh>
      <instancedMesh ref={ref} args={[undefined, undefined, PLANKS.length]} receiveShadow>
        <boxGeometry />
        <meshStandardMaterial roughness={0.45} metalness={0.05} />
      </instancedMesh>
    </group>
  );
}

function Sconce({ x }: { x: number }) {
  return (
    <group position={[x, 4.4, -10.85]}>
      <Box size={[0.18, 0.5, 0.2]} color={COLORS.brass} metalness={0.8} roughness={0.35} />
      <Cylinder
        radius={0.16}
        radiusBottom={0.22}
        height={0.34}
        position={[0, 0.38, 0.12]}
        color="#ffcf8a"
        emissive="#ffae5c"
        emissiveIntensity={2.5}
      />
      <pointLight position={[0, 0.4, 0.5]} color="#ffae5c" intensity={2.5} distance={8} decay={1.2} />
    </group>
  );
}

function Seal() {
  return (
    <group position={[0, 6.8, -10.9]}>
      <Cylinder radius={1.35} height={0.1} rotation-x={Math.PI / 2} color={COLORS.brass} metalness={0.85} roughness={0.3} segments={48} />
      <Cylinder radius={1.12} height={0.12} rotation-x={Math.PI / 2} color={COLORS.woodDark} segments={48} />
      {/* Scales of justice */}
      <group position={[0, 0, 0.1]}>
        <Box size={[0.07, 1.3, 0.05]} position={[0, -0.05, 0]} color={COLORS.brass} metalness={0.85} roughness={0.3} />
        <Box size={[1.2, 0.06, 0.05]} position={[0, 0.5, 0]} color={COLORS.brass} metalness={0.85} roughness={0.3} />
        <Box size={[0.5, 0.06, 0.05]} position={[0, -0.7, 0]} color={COLORS.brass} metalness={0.85} roughness={0.3} />
        {[-0.55, 0.55].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <Box size={[0.02, 0.5, 0.02]} position={[0, 0.25, 0]} color={COLORS.brass} metalness={0.85} />
            <Cylinder radius={0.24} radiusBottom={0.12} height={0.08} position={[0, -0.02, 0]} color={COLORS.brass} metalness={0.85} roughness={0.3} />
          </group>
        ))}
      </group>
    </group>
  );
}

export function Room() {
  return (
    <group>
      {/* Back wall with wainscoting */}
      <Box size={[30, 12, 0.4]} position={[0, 6, -11.2]} color={COLORS.wall} />
      <Box size={[30, 2.4, 0.15]} position={[0, 1.2, -10.95]} color={COLORS.woodMid} />
      <Box size={[30, 0.12, 0.25]} position={[0, 2.45, -10.92]} color={COLORS.woodRich} />
      {/* Side walls */}
      {[-14.5, 14.5].map((x) => (
        <group key={x}>
          <Box size={[0.4, 12, 24]} position={[x, 6, -0.5]} color={COLORS.wall} />
          <Box size={[0.15, 2.4, 24]} position={[x - Math.sign(x) * 0.25, 1.2, -0.5]} color={COLORS.woodMid} />
        </group>
      ))}
      {/* Columns */}
      {[-9, -4.6, 4.6, 9].map((x) => (
        <group key={x} position={[x, 0, -10.5]}>
          <Box size={[1.0, 0.4, 1.0]} position={[0, 0.2, 0]} color={COLORS.woodRich} />
          <Cylinder radius={0.32} radiusBottom={0.36} height={9} position={[0, 4.9, 0]} color="#3d2416" roughness={0.5} />
          <Box size={[0.95, 0.35, 0.95]} position={[0, 9.5, 0]} color={COLORS.woodRich} />
        </group>
      ))}
      {/* Banners flanking the seal */}
      {[-2.8, 2.8].map((x) => (
        <group key={x} position={[x, 6.6, -10.95]}>
          <Box size={[1.3, 4.2, 0.05]} color={COLORS.banner} roughness={0.9} />
          <Box size={[1.3, 0.15, 0.07]} position={[0, -2.05, 0]} color={COLORS.brass} metalness={0.8} roughness={0.35} />
          <Box size={[1.5, 0.08, 0.1]} position={[0, 2.12, 0]} color={COLORS.brass} metalness={0.8} roughness={0.35} />
        </group>
      ))}
      <Seal />
      {[-11.5, -6.8, 6.8, 11.5].map((x) => (
        <Sconce key={x} x={x} />
      ))}
      <GalleryRail />
    </group>
  );
}

// The "bar" separating the gallery from the court floor, open in the middle.
function GalleryRail() {
  return (
    <group position={[0, 0, 2.8]}>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 4.4, 0, 0]}>
          <Box size={[5.6, 0.1, 0.18]} position={[0, 1.05, 0]} color={COLORS.woodRich} />
          <Box size={[5.6, 0.08, 0.14]} position={[0, 0.12, 0]} color={COLORS.woodRich} />
          {Array.from({ length: 15 }, (_, i) => (
            <Box key={i} size={[0.07, 0.9, 0.07]} position={[-2.7 + i * 0.385, 0.58, 0]} color={COLORS.woodMid} />
          ))}
        </group>
      ))}
    </group>
  );
}

const STRIKE_PERIOD = 1.1;
const LIFT_ANGLE = 0.95;

function Gavel({ active, position }: { active: boolean; position: Vec3 }) {
  const arm = useRef<THREE.Group>(null);
  const flash = useRef<THREE.PointLight>(null);
  const anim = useRef({ phase: 0, flash: 0 });

  useFrame((_, delta) => {
    const a = anim.current;
    const group = arm.current;
    if (!group) return;
    if (active) {
      const prev = a.phase;
      a.phase = (a.phase + delta / STRIKE_PERIOD) % 1;
      if (a.phase < prev) a.flash = 1; // wrapped around: the gavel just landed
      // Slow wind-up, then an accelerating slam.
      const angle =
        a.phase < 0.7
          ? LIFT_ANGLE * (0.5 - 0.5 * Math.cos((a.phase / 0.7) * Math.PI))
          : LIFT_ANGLE * (1 - ((a.phase - 0.7) / 0.3) ** 2);
      group.rotation.z = angle;
    } else {
      a.phase = 0;
      group.rotation.z = THREE.MathUtils.damp(group.rotation.z, 0, 6, delta);
    }
    a.flash = Math.max(0, a.flash - delta * 5);
    if (flash.current) flash.current.intensity = a.flash * 8;
  });

  const brass = { color: COLORS.brass, metalness: 0.85, roughness: 0.3 };
  return (
    <group position={position} rotation-y={-0.5}>
      {/* Sound block */}
      <Cylinder radius={0.24} height={0.08} position={[0.8, -0.14, 0]} color={COLORS.woodRich} />
      <group ref={arm}>
        <Cylinder radius={0.035} radiusBottom={0.045} height={0.8} rotation-z={Math.PI / 2} position={[0.4, 0, 0]} color={COLORS.woodRich} segments={12} />
        <Cylinder radius={0.1} height={0.34} rotation-x={Math.PI / 2} position={[0.8, 0, 0]} color={COLORS.woodMid} />
        {[-0.12, 0.12].map((z) => (
          <Cylinder key={z} radius={0.106} height={0.03} rotation-x={Math.PI / 2} position={[0.8, 0, z]} {...brass} />
        ))}
      </group>
      <pointLight ref={flash} position={[0.8, 0.3, 0.3]} color="#ffd59a" intensity={0} distance={4} decay={1.5} />
    </group>
  );
}

const DESK_TOP_Y = 3.11;

export function JudgeBench({ gavelActive }: { gavelActive: boolean }) {
  return (
    <group>
      {/* Raised platform and step */}
      <Box size={[9, 0.8, 4]} position={[0, 0.4, -7.4]} color={COLORS.woodDark} />
      <Box size={[7, 0.4, 0.7]} position={[0, 0.2, -5.1]} color={COLORS.woodDark} />
      {/* Bench front with raised panels */}
      <Box size={[7.2, 2.3, 0.9]} position={[0, 1.95, -6.1]} color={COLORS.woodMid} />
      {[-2.5, -0.85, 0.85, 2.5].map((x) => (
        <Box key={x} size={[1.3, 1.5, 0.06]} position={[x, 1.9, -5.63]} color={COLORS.woodRich} />
      ))}
      <Box size={[7.6, 0.12, 1.5]} position={[0, DESK_TOP_Y - 0.06, -6.25]} color={COLORS.woodRich} roughness={0.35} />
      <Box size={[1.6, 0.22, 0.05]} position={[0, 2.82, -5.58]} color={COLORS.brass} metalness={0.85} roughness={0.3} />
      {/* Judge's chair */}
      <group position={[0, 0.8, -8.2]}>
        <Box size={[1.2, 0.9, 1.0]} position={[0, 0.45, 0]} color={COLORS.woodDark} />
        <Box size={[1.25, 0.2, 1.05]} position={[0, 1.0, 0]} color={COLORS.leather} roughness={0.5} />
        <Box size={[1.3, 2.8, 0.25]} position={[0, 2.3, -0.5]} color={COLORS.leather} roughness={0.5} />
        <Box size={[1.45, 0.18, 0.3]} position={[0, 3.75, -0.5]} color={COLORS.brass} metalness={0.8} roughness={0.35} />
      </group>
      {/* Stack of case files */}
      <Box size={[0.6, 0.12, 0.45]} position={[-1.8, DESK_TOP_Y + 0.06, -6.3]} rotation-y={0.2} color="#d8cdb4" roughness={0.95} />
      <Box size={[0.6, 0.1, 0.45]} position={[-1.75, DESK_TOP_Y + 0.17, -6.3]} rotation-y={-0.1} color="#c9b994" roughness={0.95} />
      <Gavel active={gavelActive} position={[0.5, DESK_TOP_Y + 0.18, -6.0]} />
    </group>
  );
}

// A soft glowing disc on the floor that fades in under the active area.
function FocusRing({ active, radius, position }: { active: boolean; radius: number; position: Vec3 }) {
  const material = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((_, delta) => {
    if (material.current) {
      material.current.opacity = THREE.MathUtils.damp(material.current.opacity, active ? 0.35 : 0, 3, delta);
    }
  });
  return (
    <mesh position={position}>
      <cylinderGeometry args={[radius, radius, 0.01, 48]} />
      <meshBasicMaterial ref={material} color="#ffb35c" transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

export function Podium({
  position,
  rotationY,
  accent,
  active,
}: {
  position: Vec3;
  rotationY: number;
  accent: string;
  active: boolean;
}) {
  return (
    <group position={position} rotation-y={rotationY}>
      <FocusRing active={active} radius={1.3} position={[0, 0.02, 0.2]} />
      <Box size={[1.5, 0.12, 1.0]} position={[0, 0.06, 0]} color={COLORS.woodDark} />
      <Box size={[1.2, 1.2, 0.75]} position={[0, 0.72, 0]} color={COLORS.woodMid} />
      <Box size={[0.9, 0.75, 0.04]} position={[0, 0.7, 0.38]} color={COLORS.woodRich} />
      <Box size={[1.22, 0.12, 0.77]} position={[0, 1.2, 0]} color={accent} roughness={0.5} />
      <Box size={[1.4, 0.08, 0.95]} position={[0, 1.36, 0]} rotation-x={0.15} color={COLORS.woodRich} roughness={0.4} />
      {/* Microphone */}
      <Cylinder radius={0.015} height={0.5} position={[0.35, 1.6, -0.25]} rotation-x={-0.4} color="#222" metalness={0.6} segments={8} />
      <Cylinder radius={0.045} height={0.12} position={[0.35, 1.84, -0.36]} rotation-x={-0.4} color="#111" metalness={0.4} segments={12} />
    </group>
  );
}

export type SeatState = "pending" | "current" | "guilty" | "not_guilty";

const SEAT_GLOW: Record<SeatState, { color: string; intensity: number }> = {
  pending: { color: "#000000", intensity: 0 },
  current: { color: "#ffb347", intensity: 0.9 },
  guilty: { color: "#d13a2a", intensity: 0.7 },
  not_guilty: { color: "#3fbf6a", intensity: 0.6 },
};

function JurorSeat({ position, state }: { position: Vec3; state: SeatState }) {
  const cushion = useRef<THREE.MeshStandardMaterial>(null);
  const back = useRef<THREE.MeshStandardMaterial>(null);
  const targetColor = useMemo(() => new THREE.Color(), []);

  useFrame(({ clock }, delta) => {
    const glow = SEAT_GLOW[state];
    targetColor.set(glow.color);
    const pulse = state === "current" ? 0.75 + 0.25 * Math.sin(clock.elapsedTime * 4) : 1;
    for (const m of [cushion.current, back.current]) {
      if (!m) continue;
      m.emissive.lerp(targetColor, 1 - Math.exp(-5 * delta));
      m.emissiveIntensity = THREE.MathUtils.damp(m.emissiveIntensity, glow.intensity * pulse, 5, delta);
    }
  });

  return (
    <group position={position}>
      <Box size={[0.75, 0.45, 0.6]} position={[0, 0.225, 0]} color={COLORS.woodDark} />
      <mesh position={[0, 0.52, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.85, 0.14, 0.7]} />
        <meshStandardMaterial ref={cushion} color={COLORS.leather} roughness={0.5} emissiveIntensity={0} />
      </mesh>
      <mesh position={[0, 0.98, -0.33]} castShadow receiveShadow>
        <boxGeometry args={[0.85, 0.85, 0.12]} />
        <meshStandardMaterial ref={back} color={COLORS.leather} roughness={0.5} emissiveIntensity={0} />
      </mesh>
    </group>
  );
}

const SEATS_PER_ROW = 3;
const SEAT_X = [-1.3, 0, 1.3];

export function JuryBox({
  position,
  rotationY,
  seats,
  active,
}: {
  position: Vec3;
  rotationY: number;
  seats: SeatState[];
  active: boolean;
}) {
  return (
    <group position={position} rotation-y={rotationY}>
      <FocusRing active={active} radius={3} position={[0, 0.02, 0.3]} />
      <Box size={[4.4, 0.2, 3.2]} position={[0, 0.1, 0]} color={COLORS.woodDark} />
      <Box size={[4.4, 0.4, 1.4]} position={[0, 0.4, -0.85]} color={COLORS.woodDark} />
      {/* Enclosure */}
      <Box size={[4.4, 1.1, 0.12]} position={[0, 0.75, 1.55]} color={COLORS.woodMid} />
      <Box size={[4.6, 0.08, 0.26]} position={[0, 1.34, 1.55]} color={COLORS.woodRich} roughness={0.4} />
      {[-2.2, 2.2].map((x) => (
        <group key={x}>
          <Box size={[0.12, 1.1, 3.2]} position={[x, 0.75, 0]} color={COLORS.woodMid} />
          <Box size={[0.26, 0.08, 3.3]} position={[x, 1.34, 0]} color={COLORS.woodRich} roughness={0.4} />
        </group>
      ))}
      <Box size={[4.4, 2.2, 0.12]} position={[0, 1.1, -1.6]} color={COLORS.woodMid} />
      {seats.map((state, i) => {
        const row = Math.floor(i / SEATS_PER_ROW);
        const seatPosition: Vec3 = row === 0 ? [SEAT_X[i % SEATS_PER_ROW], 0.2, 0.45] : [SEAT_X[i % SEATS_PER_ROW], 0.6, -0.8];
        return <JurorSeat key={i} position={seatPosition} state={state} />;
      })}
    </group>
  );
}
