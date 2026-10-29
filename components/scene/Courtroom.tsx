"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Preload, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { QUALITY } from "@/lib/capabilities";
import { useCourt } from "@/state/courtStore";
import { Anchor, AnchorProjector } from "./anchors";
import { CameraRig, type CourtFocus } from "./CameraRig";
import { Figure, Judge, type FigureLook } from "./Characters";
import { DeskLamp } from "./DeskLamp";
import { Floor, JudgeBench, JuryBox, Podium, Room, WITNESS_SEAT, WitnessStand, type SeatState } from "./Furniture";
import { LightRig, roomLight } from "./LightRig";

// r3f 9.8 (the latest) still creates a THREE.Clock internally, which three
// 0.186 reports as deprecated on every mount. Drop only that one message.
const consoleFunction = THREE.getConsoleFunction();
THREE.setConsoleFunction((type: "log" | "warn" | "error", message: string, ...params: unknown[]) => {
  if (type === "warn" && message.startsWith("THREE.Clock: This module has been deprecated")) return;
  if (consoleFunction) consoleFunction(type, message, ...params);
  else console[type](message, ...params);
});

type Vec3 = [number, number, number];

const JURY_POSITION: Vec3 = [-9.4, 0, -3.6];
const PETITIONER_POSITION: Vec3 = [-3.6, 0, -1];
const DEFENDANT_POSITION: Vec3 = [3.6, 0, -1];
const WITNESS_POSITION: Vec3 = [6.0, 0, -4.8];
// On the bench's right, just past the gavel.
const LAMP_POSITION: Vec3 = [2.3, 3.11, -6.35];
const LAMP_SCALE = 1.3;

const LOOKS = {
  petitioner: { outfit: "#3d74c4", skin: "#e8b98f", hair: "#2a1a10", pants: "#22314a" },
  defendant: { outfit: "#c0433a", skin: "#a86b45", hair: "#120c08", pants: "#3a2222" },
  witness: { outfit: "#8a62c9", skin: "#f1c9a5", hair: "#b07a3c", pants: "#2f2640" },
} satisfies Record<string, FigureLook>;

const JUROR_LOOKS: FigureLook[] = [
  { outfit: "#d89a2b", skin: "#d9a273", hair: "#3b2414" },
  { outfit: "#2f9e83", skin: "#7a4a2c", hair: "#0f0a08" },
  { outfit: "#d1588a", skin: "#f1c9a5", hair: "#6b3a1e" },
  { outfit: "#7d9a32", skin: "#c68b59", hair: "#1d1410" },
  { outfit: "#4fa3d8", skin: "#e8b98f", hair: "#c9a14a" },
  { outfit: "#b8794a", skin: "#a86b45", hair: "#2a1a10" },
];

export type Speaker = "judge" | "petitioner" | "defendant" | "witness" | `juror-${number}`;

/** Spotlight levels: the active area stands out from a dim room. */
const SPOT = { active: 3.4, wide: 1.1, idle: 0.3 };

// A spotlight on one area of the court. It stays dark until the lamp brings
// the room up, then sits at a level set by what the camera is looking at.
function AreaSpot({
  position,
  target,
  intensity,
  angle = 0.4,
  castShadow = QUALITY.shadows,
}: {
  position: Vec3;
  target: Vec3;
  intensity: number;
  angle?: number;
  castShadow?: boolean;
}) {
  const light = useRef<THREE.SpotLight>(null);
  const targetObject = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, delta) => {
    if (light.current) {
      light.current.intensity = THREE.MathUtils.damp(light.current.intensity, intensity * roomLight.level, 2.5, delta);
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
        intensity={0}
        color="#ffd6a0"
        castShadow={castShadow}
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.0006}
      />
    </>
  );
}

export interface CourtroomProps {
  focus: CourtFocus;
  /** Called once the camera has mostly arrived at a new shot. */
  onArrive?: (focus: CourtFocus) => void;
  seats: SeatState[];
  gavelActive: boolean;
  speaker: Speaker | null;
  /** False once the case has gone ahead without witnesses: the stand stays empty. */
  witnessPresent: boolean;
}

export default function Courtroom({ focus, onArrive, seats, gavelActive, speaker, witnessPresent }: CourtroomProps) {
  const lampOn = useCourt((s) => s.lampOn);
  const spot = (active: boolean) => (active ? SPOT.active : focus === "wide" ? SPOT.wide : SPOT.idle);

  return (
    <Canvas
      shadows={QUALITY.shadows ? "percentage" : false}
      dpr={QUALITY.dpr}
      camera={{ fov: 45, position: [-2.4, 7.4, 11.5], near: 0.1, far: 80 }}
      gl={{ antialias: QUALITY.antialias }}
      onCreated={({ gl }) => {
        // Neutral keeps the warm woods and outfit colors from going muddy.
        gl.toneMapping = THREE.NeutralToneMapping;
      }}
    >
      <color attach="background" args={["#0a0605"]} />
      <CameraRig focus={focus} onArrive={onArrive} />
      <LightRig />

      <AreaSpot position={[0, 11, -1.5]} target={[0, 2.5, -6.8]} intensity={spot(focus === "bench" || focus === "judge")} angle={0.5} />
      <AreaSpot position={[-3.6, 8, 2.5]} target={PETITIONER_POSITION} intensity={spot(focus === "petitioner")} />
      <AreaSpot position={[3.6, 8, 2.5]} target={DEFENDANT_POSITION} intensity={spot(focus === "defendant")} />
      <AreaSpot position={[-5, 8.5, 0]} target={JURY_POSITION} intensity={spot(focus === "jury")} angle={0.45} />
      <AreaSpot position={[5, 8, -1]} target={WITNESS_POSITION} intensity={spot(focus === "witness")} angle={0.35} castShadow={false} />

      <Floor />
      <Room />
      <JudgeBench gavelActive={gavelActive} />
      <Judge position={[0, 1.9, -8.15]} scale={1.85} active={speaker === "judge"} />
      <DeskLamp position={LAMP_POSITION} rotation-y={Math.PI} scale={LAMP_SCALE} />
      <Anchor anchor="lamp-hint" position={[LAMP_POSITION[0], LAMP_POSITION[1] + 1.15, LAMP_POSITION[2]]} />

      {/* Podium speakers stand behind the podium, beside its microphone. */}
      <Podium position={PETITIONER_POSITION} rotationY={-0.45} accent="#2f5d8a" active={focus === "petitioner"}>
        <Figure
          position={[-0.25, 0, -0.75]}
          scale={1.12}
          look={LOOKS.petitioner}
          seed={1}
          active={speaker === "petitioner"}
          tagId="tag-petitioner"
        />
      </Podium>
      <Podium position={DEFENDANT_POSITION} rotationY={0.45} accent="#8a2f2f" active={focus === "defendant"}>
        <Figure
          position={[-0.25, 0, -0.75]}
          scale={1.12}
          look={LOOKS.defendant}
          seed={2}
          active={speaker === "defendant"}
          tagId="tag-defendant"
        />
      </Podium>
      <WitnessStand position={WITNESS_POSITION} rotationY={-0.7}>
        <Figure
          position={WITNESS_SEAT}
          visible={witnessPresent}
          seated
          look={LOOKS.witness}
          seed={3}
          active={speaker === "witness"}
          tagId="tag-witness"
        />
      </WitnessStand>
      <JuryBox
        position={JURY_POSITION}
        rotationY={1.2}
        seats={seats}
        active={focus === "jury"}
        renderOccupant={(i) => (
          <Figure
            seated
            look={JUROR_LOOKS[i % JUROR_LOOKS.length]}
            seed={4 + i}
            active={speaker === `juror-${i}`}
            tagId={`tag-juror-${i}`}
          />
        )}
      />

      {/* Dust drifting through the light beams, once there is light to catch it.
          Always mounted (only its opacity changes) so lighting up compiles nothing new. */}
      <Sparkles count={70} scale={[18, 8, 12]} position={[0, 4, -3]} size={2} speed={0.2} opacity={lampOn ? 0.35 : 0} color="#ffd59a" />

      {/* Compile every shader up front so first visits to a shot don't hitch. */}
      <Preload all />
      <AnchorProjector />
    </Canvas>
  );
}
