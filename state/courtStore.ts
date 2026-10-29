import { create } from "zustand";
import { PREFERS_REDUCED_MOTION } from "@/lib/capabilities";

interface CourtState {
  /** false until the pull-chain has been pulled. Gates the opening sequence. */
  lampOn: boolean;
  /** True while the chain is mid-animation, so it cannot be re-triggered. */
  pulling: boolean;
  /** Disabled while the user is dragging the chain so OrbitControls stays put. */
  controlsEnabled: boolean;
  motionOn: boolean;
  pullLamp: () => void;
  setControlsEnabled: (controlsEnabled: boolean) => void;
  toggleMotion: () => void;
}

export const useCourt = create<CourtState>((set, get) => ({
  lampOn: false,
  pulling: false,
  controlsEnabled: true,
  motionOn: !PREFERS_REDUCED_MOTION,

  pullLamp: () => {
    if (get().lampOn || get().pulling) return;
    set({ pulling: true });
    // Chain snaps, then the room comes up. LightRig reads lampOn to drive its
    // own ramp; this delay is just the mechanical chain travel.
    const chainTravel = get().motionOn ? 260 : 0;
    window.setTimeout(() => set({ lampOn: true, pulling: false }), chainTravel);
  },

  setControlsEnabled: (controlsEnabled) => set({ controlsEnabled }),
  toggleMotion: () => set((s) => ({ motionOn: !s.motionOn })),
}));
