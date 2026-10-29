"use client";

import { useEffect, useRef } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import { BackSide, Color, MathUtils, type MeshStandardMaterial, type Object3D, type PointLight, type SpotLight } from "three";
import { PALETTE } from "@/lib/palette";
import { QUALITY } from "@/lib/capabilities";
import { useCourt } from "@/state/courtStore";
import { PullChain } from "./PullChain";

const SEG = QUALITY.segments;

/* Shade geometry. An upper hemisphere (closed on top, open rim at the bottom)
   scaled along X gives the elongated banker's-lamp dome. */
const SHADE_RADIUS = 0.3;
const SHADE_STRETCH = 1.85;
/* Flattens the dome into the low banker's-lamp profile. */
const SHADE_SQUASH = 0.82;
const SHADE_Y = 0.46;
const HEMISPHERE: [number, number, number, number, number, number, number] = [
  SHADE_RADIUS,
  SEG,
  Math.max(8, SEG / 2),
  0,
  Math.PI * 2,
  0,
  Math.PI / 2,
];

const shadeOff = new Color(PALETTE.shadeGreen);
const shadeLit = new Color(PALETTE.shadeGreenLit);

/* Self-lit floor the lamp holds *while the room is dark*, so its silhouette
   separates from the near-black wall.

   Brass this metallic has next to no diffuse response with no environment
   map to reflect, so without this the one object the visitor has to find
   reads darker than the furniture behind it. This floor ramps *out* as the
   bulb ramps in, so it costs the lit room nothing. */
const DARK_SHEEN = { shade: 0.042, brass: 0.038 };

/**
 * Banker's lamp: brass base and stem, green glass dome, warm bulb, pull chain.
 *
 * Owns the *lamp's own* glow ramp (fast, ~0.3s) - the room's ambient reveal is
 * a slower ramp handled by LightRig, so the bulb visibly leads the room.
 */
export function DeskLamp(props: ThreeElements["group"]) {
  const lampOn = useCourt((s) => s.lampOn);
  const motionOn = useCourt((s) => s.motionOn);

  const glow = useRef(0);
  const baseRef = useRef<MeshStandardMaterial>(null);
  const collarRef = useRef<MeshStandardMaterial>(null);
  const stemRef = useRef<MeshStandardMaterial>(null);
  const rimRef = useRef<MeshStandardMaterial>(null);
  const shadeRef = useRef<MeshStandardMaterial>(null);
  const innerRef = useRef<MeshStandardMaterial>(null);
  const bulbRef = useRef<MeshStandardMaterial>(null);
  const pointRef = useRef<PointLight>(null);
  const spotRef = useRef<SpotLight>(null);
  const spotTargetRef = useRef<Object3D>(null);

  // A SpotLight aims at its `target` object, which only has a usable world
  // matrix once it is part of the scene graph - hence a real child node
  // rather than the `target-position` shorthand.
  useEffect(() => {
    if (spotRef.current && spotTargetRef.current) {
      spotRef.current.target = spotTargetRef.current;
    }
  }, []);

  useFrame((_, delta) => {
    const targetGlow = lampOn ? 1 : 0;
    glow.current = motionOn ? MathUtils.damp(glow.current, targetGlow, 9, delta) : targetGlow;

    const g = glow.current;

    // Brass keeps its silhouette sheen until the bulb can light it properly.
    const brassSheen = (1 - g) * DARK_SHEEN.brass;
    if (baseRef.current) baseRef.current.emissiveIntensity = brassSheen;
    if (collarRef.current) collarRef.current.emissiveIntensity = brassSheen;
    if (stemRef.current) stemRef.current.emissiveIntensity = brassSheen;
    if (rimRef.current) rimRef.current.emissiveIntensity = brassSheen;

    if (shadeRef.current) {
      shadeRef.current.color.lerpColors(shadeOff, shadeLit, g);
      // Emissive tracks the same two greens: unlit it is only lifting the
      // silhouette off the wall, so it must not read as the lit green.
      shadeRef.current.emissive.lerpColors(shadeOff, shadeLit, g);
      shadeRef.current.emissiveIntensity = MathUtils.lerp(DARK_SHEEN.shade, 0.45, g);
    }
    if (innerRef.current) innerRef.current.emissiveIntensity = g * 1.6;
    if (bulbRef.current) bulbRef.current.emissiveIntensity = g * 4;
    if (pointRef.current) pointRef.current.intensity = g * 9;
    if (spotRef.current) spotRef.current.intensity = g * 26;
  });

  return (
    <group {...props}>
      {/* --- Brass base --- */}
      <mesh position={[0, 0.03, 0]} castShadow={QUALITY.shadows} receiveShadow={QUALITY.shadows}>
        <cylinderGeometry args={[0.2, 0.23, 0.06, SEG]} />
        <meshStandardMaterial
          ref={baseRef}
          color={PALETTE.brass}
          emissive={PALETTE.brass}
          emissiveIntensity={DARK_SHEEN.brass}
          roughness={0.38}
          metalness={0.55}
        />
      </mesh>
      <mesh position={[0, 0.08, 0]} castShadow={QUALITY.shadows}>
        <cylinderGeometry args={[0.13, 0.19, 0.07, SEG]} />
        <meshStandardMaterial
          ref={collarRef}
          color={PALETTE.brassDark}
          emissive={PALETTE.brass}
          emissiveIntensity={DARK_SHEEN.brass}
          roughness={0.42}
          metalness={0.55}
        />
      </mesh>

      {/* --- Stem --- */}
      <mesh position={[0, SHADE_Y / 2 + 0.06, 0]} castShadow={QUALITY.shadows}>
        <cylinderGeometry args={[0.036, 0.044, SHADE_Y - 0.04, SEG]} />
        <meshStandardMaterial
          ref={stemRef}
          color={PALETTE.brass}
          emissive={PALETTE.brass}
          emissiveIntensity={DARK_SHEEN.brass}
          roughness={0.34}
          metalness={0.58}
        />
      </mesh>

      {/* --- Shade: green outside, cream inside --- */}
      <group position={[0, SHADE_Y, 0]} scale={[SHADE_STRETCH, SHADE_SQUASH, 1.05]}>
        <mesh castShadow={QUALITY.shadows}>
          <sphereGeometry args={HEMISPHERE} />
          <meshStandardMaterial
            ref={shadeRef}
            color={PALETTE.shadeGreen}
            emissive={PALETTE.shadeGreen}
            emissiveIntensity={DARK_SHEEN.shade}
            roughness={0.28}
            metalness={0.12}
          />
        </mesh>

        {/* Inner surface, flipped so we see its underside from below. */}
        <mesh scale={[0.96, 0.94, 0.96]}>
          <sphereGeometry args={HEMISPHERE} />
          <meshStandardMaterial
            ref={innerRef}
            color={PALETTE.shadeInner}
            emissive={PALETTE.lampWarm}
            emissiveIntensity={0}
            roughness={0.9}
            side={BackSide}
          />
        </mesh>
      </group>

      {/* Brass rim around the shade opening. TorusGeometry is built in the XY
          plane, so it must be rotated -90deg about X to lie flat. */}
      <mesh position={[0, SHADE_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[SHADE_STRETCH, 1.05, 1]}>
        <torusGeometry args={[SHADE_RADIUS * 0.99, 0.012, 8, SEG]} />
        <meshStandardMaterial
          ref={rimRef}
          color={PALETTE.brass}
          emissive={PALETTE.brass}
          emissiveIntensity={DARK_SHEEN.brass}
          roughness={0.34}
          metalness={0.58}
        />
      </mesh>

      {/* --- Bulb --- */}
      <mesh position={[0, SHADE_Y + 0.1, 0]}>
        <sphereGeometry args={[0.055, 12, 10]} />
        <meshStandardMaterial
          ref={bulbRef}
          color={PALETTE.lampWarm}
          emissive={PALETTE.lampWarm}
          emissiveIntensity={0}
          toneMapped={false}
        />
      </mesh>

      {/* --- Emitted light --- */}
      <pointLight
        ref={pointRef}
        position={[0, SHADE_Y + 0.08, 0]}
        color={PALETTE.lampWarm}
        intensity={0}
        distance={9}
        decay={2}
      />
      <object3D ref={spotTargetRef} position={[0, -SHADE_Y - 1.2, 0]} />
      <spotLight
        ref={spotRef}
        position={[0, SHADE_Y + 0.05, 0]}
        color={PALETTE.lampWarm}
        intensity={0}
        angle={1.0}
        penumbra={0.85}
        distance={7}
        decay={1.6}
        castShadow={QUALITY.shadows}
        shadow-mapSize-width={QUALITY.shadowMapSize ?? 512}
        shadow-mapSize-height={QUALITY.shadowMapSize ?? 512}
        shadow-bias={-0.0015}
      />

      {/* --- Pull chain, hanging off the right rim of the shade --- */}
      <PullChain anchor={[SHADE_RADIUS * SHADE_STRETCH - 0.03, SHADE_Y - 0.01, 0.04]} />
    </group>
  );
}
