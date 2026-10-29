"use client";

import type { ThreeElements } from "@react-three/fiber";

export const COLORS = {
  floorGap: "#0d0704",
  woodDark: "#2a160c",
  woodMid: "#4a2a17",
  woodRich: "#5e3520",
  wall: "#24140c",
  brass: "#c9a14a",
  leather: "#5a1a1a",
  banner: "#5e1212",
} as const;

type MeshProps = ThreeElements["mesh"];

interface MaterialProps {
  color: string;
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
}

export function Box({
  size,
  color,
  roughness = 0.7,
  metalness = 0,
  emissive,
  emissiveIntensity,
  ...props
}: MeshProps & MaterialProps & { size: [number, number, number] }) {
  return (
    <mesh castShadow receiveShadow {...props}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
      />
    </mesh>
  );
}

export function Cylinder({
  radius,
  radiusBottom = radius,
  height,
  segments = 24,
  color,
  roughness = 0.6,
  metalness = 0,
  emissive,
  emissiveIntensity,
  ...props
}: MeshProps &
  MaterialProps & { radius: number; radiusBottom?: number; height: number; segments?: number }) {
  return (
    <mesh castShadow receiveShadow {...props}>
      <cylinderGeometry args={[radius, radiusBottom, height, segments]} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
      />
    </mesh>
  );
}
