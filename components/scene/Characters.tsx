"use client";

import { useCallback, useRef, type ReactNode } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { Anchor } from "./anchors";
import { roomLight } from "./LightRig";

const HIGHLIGHT = 0.32;

// Collects a figure's materials and lifts their emissive glow while it is the
// active speaker, so the highlight follows the figure's own colors.
function useHighlight(active: boolean) {
  const materials = useRef(new Set<THREE.MeshStandardMaterial>());
  useFrame((_, delta) => {
    for (const m of materials.current) {
      m.emissiveIntensity = THREE.MathUtils.damp(m.emissiveIntensity, active ? HIGHLIGHT : 0, 4, delta);
    }
  });
  return useCallback((m: THREE.MeshStandardMaterial | null) => {
    if (!m) return;
    materials.current.add(m);
    return () => {
      materials.current.delete(m);
    };
  }, []);
}

type Register = ReturnType<typeof useHighlight>;

function Part({
  color,
  register,
  roughness = 0.75,
  children,
  ...props
}: ThreeElements["mesh"] & { color: string; register?: Register; roughness?: number; children: ReactNode }) {
  return (
    <mesh castShadow receiveShadow {...props}>
      {children}
      <meshStandardMaterial
        ref={register}
        color={color}
        emissive={color}
        emissiveIntensity={0}
        roughness={roughness}
        flatShading
      />
    </mesh>
  );
}

// Gentle breathing bob, offset per character so the room doesn't move in sync.
// The body ref's own position is overwritten, so it must sit inside any offset group.
function useIdle(seed: number) {
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed * 1.7;
    if (body.current) body.current.position.y = Math.sin(t * 1.6) * 0.012;
    if (head.current) {
      head.current.rotation.y = Math.sin(t * 0.45) * 0.18;
      head.current.rotation.x = Math.sin(t * 0.7) * 0.04;
    }
  });
  return { body, head };
}

export interface FigureLook {
  outfit: string;
  skin: string;
  hair: string;
  pants?: string;
}

/**
 * A stylized low-poly person. Origin is at the feet when standing, or at the
 * hips (seat height) when seated. Faces +z. Its name tag is pinned to the
 * anchor `tagId`, just above the head.
 */
export function Figure({
  look,
  seated = false,
  active,
  seed = 0,
  tagId,
  ...props
}: ThreeElements["group"] & {
  look: FigureLook;
  seated?: boolean;
  active: boolean;
  seed?: number;
  tagId: string;
}) {
  const register = useHighlight(active);
  const { body, head } = useIdle(seed);
  const pants = look.pants ?? "#2b2b33";
  const hip = seated ? 0 : 0.8;

  return (
    <group {...props}>
      {seated ? (
        <>
          {[-0.1, 0.1].map((x) => (
            <group key={x}>
              <Part color={pants} register={register} position={[x, 0.07, 0.2]}>
                <boxGeometry args={[0.15, 0.14, 0.46]} />
              </Part>
              <Part color={pants} register={register} position={[x, -0.2, 0.42]}>
                <boxGeometry args={[0.13, 0.5, 0.14]} />
              </Part>
            </group>
          ))}
        </>
      ) : (
        [-0.1, 0.1].map((x) => (
          <Part key={x} color={pants} register={register} position={[x, 0.4, 0]}>
            <boxGeometry args={[0.15, 0.8, 0.17]} />
          </Part>
        ))
      )}
      <group position={[0, hip, 0]}>
        <group ref={body}>
          <Part color={look.outfit} register={register} position={[0, 0.33, 0]}>
            <cylinderGeometry args={[0.2, 0.26, 0.64, 7]} />
          </Part>
          {[-1, 1].map((side) => (
            <Part
              key={side}
              color={look.outfit}
              register={register}
              position={[side * 0.3, 0.34, 0.02]}
              rotation-z={side * 0.12}
            >
              <boxGeometry args={[0.1, 0.56, 0.12]} />
            </Part>
          ))}
          <Part color={look.skin} register={register} position={[0, 0.69, 0]}>
            <cylinderGeometry args={[0.06, 0.07, 0.1, 6]} />
          </Part>
          <group ref={head} position={[0, 0.86, 0]}>
            <Part color={look.skin} register={register}>
              <sphereGeometry args={[0.17, 7, 5]} />
            </Part>
            <Part color={look.hair} register={register} position={[0, 0.07, -0.02]} scale={[1.05, 0.62, 1.05]}>
              <sphereGeometry args={[0.18, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </Part>
            {[-0.06, 0.06].map((x) => (
              <mesh key={x} position={[x, 0.01, 0.155]}>
                <boxGeometry args={[0.04, 0.05, 0.02]} />
                <meshStandardMaterial color="#141014" />
              </mesh>
            ))}
          </group>
          <Anchor anchor={tagId} position={[0, 1.15, 0]} />
        </group>
      </group>
    </group>
  );
}

/**
 * The AI Judge: an oversized robed figure with a robot head and a glowing
 * visor, seated behind the bench. Origin at seat height; faces +z. Its name
 * tag and speech bubble are pinned to the "judge-tag" and "judge-speech" anchors.
 */
export function Judge({ active, ...props }: ThreeElements["group"] & { active: boolean }) {
  const register = useHighlight(active);
  const { body, head } = useIdle(0.5);
  const visor = useRef<THREE.MeshStandardMaterial>(null);
  const antenna = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    const pulse = 0.85 + 0.15 * Math.sin(clock.elapsedTime * 2.2);
    if (visor.current) visor.current.emissiveIntensity = roomLight.level * 2.4 * pulse;
    if (antenna.current) antenna.current.emissiveIntensity = roomLight.level * 3 * (0.6 + 0.4 * Math.sin(clock.elapsedTime * 3));
  });

  const robe = "#1f1c2b";
  const metal = "#4a4f5c";
  return (
    <group {...props}>
      <group ref={body}>
        <Part color={robe} register={register} position={[0, 0.36, 0]}>
          <cylinderGeometry args={[0.24, 0.34, 0.72, 8]} />
        </Part>
        {/* Robe sleeves */}
        {[-1, 1].map((side) => (
          <Part key={side} color={robe} register={register} position={[side * 0.33, 0.36, 0.04]} rotation-z={side * 0.15}>
            <boxGeometry args={[0.15, 0.6, 0.18]} />
          </Part>
        ))}
        {/* White jabot collar */}
        <Part color="#f2efe6" register={register} position={[0, 0.62, 0.17]} rotation-x={-0.2}>
          <boxGeometry args={[0.16, 0.18, 0.05]} />
        </Part>
        <group ref={head} position={[0, 0.94, 0]}>
          <Part color={metal} register={register} roughness={0.45}>
            <boxGeometry args={[0.4, 0.36, 0.36]} />
          </Part>
          {/* Visor */}
          <mesh position={[0, 0.03, 0.185]}>
            <boxGeometry args={[0.32, 0.08, 0.02]} />
            <meshStandardMaterial ref={visor} color="#0b2a33" emissive="#5ff4ff" emissiveIntensity={0} toneMapped={false} />
          </mesh>
          {/* Antenna */}
          <mesh position={[0, 0.28, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.2, 6]} />
            <meshStandardMaterial color={metal} />
          </mesh>
          <mesh position={[0, 0.39, 0]}>
            <sphereGeometry args={[0.035, 8, 6]} />
            <meshStandardMaterial ref={antenna} color="#ff5a5a" emissive="#ff5a5a" emissiveIntensity={0} toneMapped={false} />
          </mesh>
          {/* Side "ears" */}
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.215, 0, 0]} rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[0.06, 0.06, 0.04, 8]} />
              <meshStandardMaterial color="#c9a14a" metalness={0.7} roughness={0.35} />
            </mesh>
          ))}
        </group>
        <Anchor anchor="judge-tag" position={[0, 1.5, 0]} />
        <Anchor anchor="judge-speech" position={[-0.55, 1.2, 0]} />
      </group>
    </group>
  );
}
