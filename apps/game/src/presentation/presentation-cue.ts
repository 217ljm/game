import type { PresentationCue, PresentationCueType } from "../contracts";

/** Pure helpers kept separate so cue policy can be tested without Phaser. */
export type CueBucket = "action" | "resource" | "person" | "transition" | "ambient" | "screen";

export function classifyPresentationCue(cue: Pick<PresentationCue, "type">): CueBucket {
  switch (cue.type) {
    case "action.scheduled":
    case "action.resolve": return "action";
    case "resource.delta": return "resource";
    case "person.react": return "person";
    case "screen.enter": return "screen";
    case "quarter.complete":
    case "year.advance":
    case "event.interrupt": return "transition";
    case "month.advance": return "ambient";
  }
}

export type MotionLevel = "full" | "reduced" | "off";

/** Durations are policy only; they never affect simulation facts. */
export function presentationCueDuration(type: PresentationCueType, level: MotionLevel = "full"): number {
  if (level === "off") return 0;
  const reduced = level === "reduced";
  switch (type) {
    case "screen.enter": return reduced ? 120 : 260;
    case "action.scheduled": return reduced ? 100 : 260;
    case "action.resolve": return reduced ? 120 : 320;
    case "resource.delta": return reduced ? 120 : 280;
    case "person.react": return reduced ? 140 : 360;
    case "event.interrupt": return reduced ? 160 : 420;
    case "month.advance": return reduced ? 80 : 180;
    case "quarter.complete": return reduced ? 180 : 520;
    case "year.advance": return reduced ? 220 : 650;
  }
}

