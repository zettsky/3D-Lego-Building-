/**
 * Guided Build interaction state machine.
 *
 * Owns *what the user is looking at* (step, playback, exploded, ghost preference).
 * It never owns brick positions: the committed assembly is always derived from
 * `assemblyAt(instruction, step)`, and animation / explosion are visual offsets on top.
 *
 * Rules (from the brief):
 *  - Ghost Mode survives camera moves and step changes; it is a preference.
 *  - Entering Exploded View hides ghosts; leaving restores the previous ghost setting
 *    (because ghost visibility is derived, the preference itself is never overwritten).
 *  - Replay re-animates only the current step and never touches either mode's preference.
 *  - Changing steps exits Exploded View and cancels/completes any running animation
 *    (a new animation token makes stale "done" events from the old animation no-ops).
 */

export type Speed = 0.5 | 1 | 1.5 | 2;

export interface GuidedState {
  step: number;
  total: number;
  playing: boolean;
  animating: boolean;
  animToken: number;
  exploded: boolean;
  explodeAmount: number; // 0..1, kept between visits to Exploded View
  ghostPref: boolean;
  speed: Speed;
}

export type GuidedAction =
  | { type: "NEXT" }
  | { type: "PREV" }
  | { type: "GOTO"; step: number }
  | { type: "REPLAY" }
  | { type: "PLAY" }
  | { type: "PAUSE" }
  | { type: "TOGGLE_PLAY" }
  | { type: "ANIM_DONE"; token: number }
  | { type: "TOGGLE_GHOST" }
  | { type: "TOGGLE_EXPLODE" }
  | { type: "SET_EXPLODE"; amount: number }
  | { type: "SET_SPEED"; speed: Speed };

export function initGuided(total: number, startStep = 0, ghostPref = false): GuidedState {
  const step = Math.max(0, Math.min(total - 1, startStep));
  return {
    step,
    total,
    playing: false,
    animating: true,
    animToken: 1,
    exploded: false,
    explodeAmount: 1,
    ghostPref,
    speed: 1,
  };
}

const clampStep = (s: GuidedState, i: number) => Math.max(0, Math.min(s.total - 1, i));

export function guidedReducer(s: GuidedState, a: GuidedAction): GuidedState {
  switch (a.type) {
    case "NEXT": {
      if (s.step >= s.total - 1) return { ...s, playing: false, exploded: false };
      return { ...s, step: s.step + 1, animating: true, animToken: s.animToken + 1, exploded: false };
    }
    case "PREV": {
      if (s.step <= 0) return { ...s, exploded: false, animating: false, animToken: s.animToken + 1 };
      // Moving backward restores the exact previous assembly instantly.
      return { ...s, step: s.step - 1, animating: false, animToken: s.animToken + 1, exploded: false, playing: false };
    }
    case "GOTO": {
      const step = clampStep(s, a.step);
      if (step === s.step) return s;
      const forwardOne = step === s.step + 1;
      return { ...s, step, animating: forwardOne, animToken: s.animToken + 1, exploded: false, playing: false };
    }
    case "REPLAY":
      return { ...s, animating: true, animToken: s.animToken + 1, exploded: false };
    case "PLAY":
      if (s.exploded) return s;
      if (s.step >= s.total - 1 && !s.animating)
        // At the end: start over from the first step.
        return { ...s, playing: true, step: 0, animating: true, animToken: s.animToken + 1 };
      return { ...s, playing: true };
    case "PAUSE":
      return { ...s, playing: false };
    case "TOGGLE_PLAY":
      return guidedReducer(s, { type: s.playing ? "PAUSE" : "PLAY" });
    case "ANIM_DONE":
      if (a.token !== s.animToken) return s; // stale event from a cancelled animation
      return { ...s, animating: false };
    case "TOGGLE_GHOST":
      return { ...s, ghostPref: !s.ghostPref };
    case "TOGGLE_EXPLODE":
      if (s.exploded) return { ...s, exploded: false };
      return {
        ...s,
        exploded: true,
        playing: false,
        animating: false, // complete the running placement instantly
        animToken: s.animToken + 1,
        explodeAmount: s.explodeAmount > 0.02 ? s.explodeAmount : 1,
      };
    case "SET_EXPLODE":
      return { ...s, explodeAmount: Math.max(0, Math.min(1, a.amount)) };
    case "SET_SPEED":
      return { ...s, speed: a.speed };
  }
}

/** Derived: ghosts show only when preferred, not exploded, not mid-animation and a next step exists. */
export function ghostVisible(s: GuidedState): boolean {
  return s.ghostPref && !s.exploded && !s.animating && s.step < s.total - 1;
}

export function progressPct(s: GuidedState): number {
  return Math.round(((s.step + (s.animating ? 0 : 1)) / s.total) * 100);
}
