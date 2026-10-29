// Device-tier quality knobs, ported from the lamp export (lamp.txt).
// Read at module load, so only import this from client code.

interface Quality {
  dpr: [number, number];
  shadows: boolean;
  shadowMapSize?: number;
  fillLights: boolean;
  segments: number;
  antialias: boolean;
}

function detectWebGL() {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return false;
    (gl as WebGLRenderingContext).getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function detectTier() {
  if (typeof window === "undefined") return "low";

  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const narrow = window.innerWidth < 768;

  if (cores <= 4 || memory <= 4 || (coarse && narrow)) return "low";
  if (cores <= 8 || memory <= 8) return "medium";
  return "high";
}

export const HAS_WEBGL = detectWebGL();

export const TIER = detectTier();

export const PREFERS_REDUCED_MOTION =
  typeof window !== "undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);

/** Per-tier render settings consumed by the Canvas and the scene meshes. */
export const QUALITY: Quality = {
  low: {
    dpr: [1, 1.25] as [number, number],
    shadows: false,
    fillLights: false,
    segments: 12,
    antialias: false,
  },
  medium: {
    dpr: [1, 1.5] as [number, number],
    shadows: true,
    shadowMapSize: 1024,
    fillLights: true,
    segments: 20,
    antialias: true,
  },
  high: {
    // Capped at 1.5x DPR / 1024 shadow maps to cut per-frame cost on high-DPI
    // screens; the difference isn't visible in this low-poly room.
    dpr: [1, 1.5] as [number, number],
    shadows: true,
    shadowMapSize: 1024,
    fillLights: true,
    segments: 32,
    antialias: true,
  },
}[TIER];
