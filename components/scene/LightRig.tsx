"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, type AmbientLight, type DirectionalLight, type FogExp2, type HemisphereLight } from "three";
import { PALETTE } from "@/lib/palette";
import { QUALITY } from "@/lib/capabilities";
import { useCourt } from "@/state/courtStore";

/* Ramp shaped so the room reaches ~98% brightness about 1.2s after the pull. */
const RAMP_LAMBDA = 3.25;
/* Held dark for a beat after the chain snaps, so the bulb visibly leads. */
const REVEAL_DELAY = 0.15;

/** Intensities at the two ends of the reveal: [unlit, lit]. The lit room is
    deliberately dim: the sconces, the lamp and the area spots do the lighting. */
const AMBIENT = [0.06, 0.2];
const HEMI = [0.03, 0.32];
const SILHOUETTE = [0.4, 0.22];
const KEY_FILL = [0, 0.5];
const RIM = [0, 0.35];
const FOG_DENSITY = [0.028, 0.022];

/**
 * The current reveal level, 0 (dark) to 1 (lit). Other room lights (sconces,
 * area spots, the judge's visor) read this each frame so they come up with
 * the room instead of glowing in the dark.
 */
export const roomLight = { level: 0 };

/**
 * All room lighting other than the lamp's own bulb.
 *
 * Before the pull the room sits at a hair above black with one cold light
 * behind it, which is just enough to read the furniture as silhouettes.
 */
export function LightRig() {
  const lampOn = useCourt((s) => s.lampOn);
  const motionOn = useCourt((s) => s.motionOn);

  const level = useRef(0);
  const waited = useRef(0);

  const ambientRef = useRef<AmbientLight>(null);
  const hemiRef = useRef<HemisphereLight>(null);
  const silhouetteRef = useRef<DirectionalLight>(null);
  const keyFillRef = useRef<DirectionalLight>(null);
  const rimRef = useRef<DirectionalLight>(null);
  const fogRef = useRef<FogExp2>(null);

  useFrame((_, delta) => {
    if (!motionOn) {
      level.current = lampOn ? 1 : 0;
    } else if (lampOn) {
      waited.current += delta;
      if (waited.current >= REVEAL_DELAY) {
        level.current = MathUtils.damp(level.current, 1, RAMP_LAMBDA, delta);
      }
    } else {
      waited.current = 0;
      level.current = MathUtils.damp(level.current, 0, RAMP_LAMBDA, delta);
    }

    const t = level.current;
    roomLight.level = t;
    const at = (range: number[]) => MathUtils.lerp(range[0], range[1], t);

    if (ambientRef.current) ambientRef.current.intensity = at(AMBIENT);
    if (hemiRef.current) hemiRef.current.intensity = at(HEMI);
    if (silhouetteRef.current) silhouetteRef.current.intensity = at(SILHOUETTE);
    if (keyFillRef.current) keyFillRef.current.intensity = at(KEY_FILL);
    if (rimRef.current) rimRef.current.intensity = at(RIM);
    if (fogRef.current) fogRef.current.density = at(FOG_DENSITY);
  });

  return (
    <>
      <fogExp2 ref={fogRef} attach="fog" args={[PALETTE.wallBack, FOG_DENSITY[0]]} />

      <ambientLight ref={ambientRef} color={PALETTE.ambientWarm} intensity={AMBIENT[0]} />
      <hemisphereLight
        ref={hemiRef}
        color={PALETTE.ambientWarm}
        groundColor={PALETTE.floor}
        intensity={HEMI[0]}
      />

      {/* Cold back light: the only thing separating the furniture from the
          wall while the room is dark. */}
      <directionalLight
        ref={silhouetteRef}
        position={[-6, 9, -9]}
        color={PALETTE.ambientCold}
        intensity={SILHOUETTE[0]}
      />

      {QUALITY.fillLights && (
        <>
          {/* Soft warm key from the gallery, just enough to read faces. At this
              level its shadows would be invisible, so it doesn't cast any. */}
          <directionalLight ref={keyFillRef} position={[-5, 10, 12]} color={PALETTE.lampWarm} intensity={0} />
          {/* Cool rim from the back right, edging the figures and furniture. */}
          <directionalLight ref={rimRef} position={[8, 7, -8]} color={PALETTE.ambientCold} intensity={0} />
        </>
      )}
    </>
  );
}
