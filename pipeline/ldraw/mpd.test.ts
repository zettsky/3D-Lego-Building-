import { describe, expect, it } from "vitest";
import { classifyLicence, compose, IDENTITY, parseMpd } from "./mpd";

const MPD = `0 FILE main.ldr
0 Test House
0 Name: main.ldr
0 Author: Tsumiki test fixture
0 !LDRAW_ORG Model
0 !LICENSE Licensed under CC BY 4.0 : see CAreadme.txt
1 0 0 0 0 1 0 0 0 1 0 0 0 1 3020.dat
0 STEP
1 4 0 -8 0 1 0 0 0 1 0 0 0 1 wall.ldr
1 4 0 -32 0 1 0 0 0 1 0 0 0 1 wall.ldr
0 STEP
1 15 -30 -56 -10 1 0 0 0 1 0 0 0 1 3024.dat
0 STEP
0 NOFILE
0 FILE wall.ldr
0 Wall
1 16 0 0 0 1 0 0 0 1 0 0 0 1 3001.dat
0 STEP
0 NOFILE
`;

describe("MPD parser", () => {
  it("expands sub-models before the parent step, inherits colour 16, keeps source order", () => {
    const m = parseMpd(MPD);
    expect(m.stepOrder).toBe("source");
    expect(m.pieceCount).toBe(4);
    expect(m.steps.map((s) => s.parts.map((p) => `${p.part}:${p.color}`))).toEqual([["3020:0"], ["3001:4", "3001:4"], ["3024:15"]]);
    expect(m.steps[1].parts[1].pose.slice(0, 3)).toEqual([0, -32, 0]);
    expect(m.stats.emptyStepsDropped).toBe(1);
    expect(m.main.author).toBe("Tsumiki test fixture");
    expect(classifyLicence(m.main.licence)).toMatchObject({ ok: true, licence: "CC BY 4.0" });
  });
  it("rejects missing or unknown licences and detects recursion", () => {
    expect(classifyLicence(null).ok).toBe(false);
    expect(classifyLicence("All rights reserved").ok).toBe(false);
    const loop = parseMpd("0 FILE a.ldr\n1 4 0 0 0 1 0 0 0 1 0 0 0 1 a.ldr\n");
    expect(loop.issues.some((i) => /recursion/.test(i.message))).toBe(true);
  });
  it("composes placements", () => {
    expect(compose(IDENTITY, [1, 2, 3, 1, 0, 0, 0, 1, 0, 0, 0, 1])).toEqual([1, 2, 3, 1, 0, 0, 0, 1, 0, 0, 0, 1]);
  });
});
