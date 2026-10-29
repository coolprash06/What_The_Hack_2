"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { CameraRig, type CourtFocus } from "./CameraRig";
import { Floor, JudgeBench, JuryBox, Podium, Room, type SeatState } from "./Furniture";

type Vec3 = [number, number, number];

const JURY_POSITION: Vec3 = [-9.4, 0, -3.6];
const PETITIONER_POSITION: Vec3 = [-3.6, 0, -1];
const DEFENDANT_POSITION: Vec3 = [3.6, 0, -1];

// A spotlight that brightens when its area of the court is in focus.
function AreaSpot({
  position,
  target,
  active,
  angle = 0.4,
  base = 0.8,
  peak = 3.2,
}: {
  position: Vec3;
  target: Vec3;
  active: boolean;
  angle?: number;
  base?: number;
  peak?: number;
}) {
  const light = useRef<THREE.SpotLight>(null);
  const targetObject = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, delta) => {
    if (light.current) {
      light.current.intensity = THREE.MathUtils.damp(light.current.intensity, active ? peak : base, 2.5, delta);
    }
  });

  return (
    <>
      <primitive object={targetObject} position={target} />
      <spotLight
        ref={light}
        position={position}
        target={targetObject}
        angle={angle}
        penumbra={0.7}
        decay={0}
        intensity={base}
        color="#ffc98a"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
      />
    </>
  );
}

export interface CourtroomProps {
  focus: CourtFocus;
  seats: SeatState[];
  gavelActive: boolean;
}

export default function Courtroom({ focus, seats, gavelActive }: CourtroomProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ fov: 45, position: [0, 8, 17], near: 0.1, far: 80 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={["#0a0605"]} />
      <fog attach="fog" args={["#0a0605", 18, 38]} />
      <CameraRig focus={focus} />

      <ambientLight intensity={0.22} color="#ffd9b0" />
      <hemisphereLight args={["#ffcf99", "#1a0d06", 0.35]} />
      <AreaSpot position={[0, 11, -1.5]} target={[0, 2.5, -6.8]} active={focus === "bench"} angle={0.5} base={1.4} peak={3.6} />
      <AreaSpot position={[-3.6, 8, 2.5]} target={PETITIONER_POSITION} active={focus === "petitioner"} />
      <AreaSpot position={[3.6, 8, 2.5]} target={DEFENDANT_POSITION} active={focus === "defendant"} />
      <AreaSpot position={[-5, 8.5, 0]} target={JURY_POSITION} active={focus === "jury"} angle={0.45} />

      <Floor />
      <Room />
      <JudgeBench gavelActive={gavelActive} />
      <Podium position={PETITIONER_POSITION} rotationY={-0.45} accent="#2f5d8a" active={focus === "petitioner"} />
      <Podium position={DEFENDANT_POSITION} rotationY={0.45} accent="#8a2f2f" active={focus === "defendant"} />
      <JuryBox position={JURY_POSITION} rotationY={1.2} seats={seats} active={focus === "jury"} />

      {/* Dust drifting through the light beams */}
      <Sparkles count={70} scale={[18, 8, 12]} position={[0, 4, -3]} size={2} speed={0.2} opacity={0.35} color="#ffd59a" />
    </Canvas>
  );
}
