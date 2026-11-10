/** Brick colours, keyed by our id, with the matching LDraw colour code for import/export. */
export interface ColorDef {
  id: string;
  name: string;
  ldraw: number;
  hex: string;
  /** Opacity for transparent colours. */
  alpha?: number;
}

export const COLORS: ColorDef[] = [
  // Names are the LEGO colour names printed in parts lists; hex values are the LDraw
  // reference values from LDConfig.ldr (www.ldraw.org).
  { id: "white", name: "White", ldraw: 15, hex: "#F4F4F4" },
  { id: "black", name: "Black", ldraw: 0, hex: "#1B2A34" },
  { id: "red", name: "Bright Red", ldraw: 4, hex: "#B40000" },
  { id: "dark-orange", name: "Dark Orange", ldraw: 484, hex: "#91501C" },
  { id: "orange", name: "Bright Orange", ldraw: 25, hex: "#D67923" },
  { id: "reddish-brown", name: "Reddish Brown", ldraw: 70, hex: "#5F3109" },
  { id: "tan", name: "Brick Yellow (Tan)", ldraw: 19, hex: "#D7BA8C" },
  { id: "dark-tan", name: "Sand Yellow (Dark Tan)", ldraw: 28, hex: "#897D62" },
  { id: "yellow", name: "Bright Yellow", ldraw: 14, hex: "#FAC80A" },
  { id: "bright-blue", name: "Bright Blue", ldraw: 1, hex: "#1E5AA8" },
  { id: "bright-green", name: "Bright Green", ldraw: 10, hex: "#58AB41" },
  { id: "green", name: "Dark Green", ldraw: 2, hex: "#00852B" },
  { id: "dark-green", name: "Earth Green", ldraw: 288, hex: "#00451A" },
  { id: "sand-green", name: "Sand Green", ldraw: 378, hex: "#708E7C" },
  { id: "medium-blue", name: "Medium Blue", ldraw: 73, hex: "#7396C8" },
  { id: "light-bluish-gray", name: "Medium Stone Grey", ldraw: 71, hex: "#969696" },
  { id: "dark-bluish-gray", name: "Dark Stone Grey", ldraw: 72, hex: "#646464" },
  { id: "trans-clear", name: "Transparent", ldraw: 47, hex: "#FCFCFC", alpha: 0.5 },
  { id: "trans-orange", name: "Transparent Bright Orange", ldraw: 57, hex: "#F08F1C", alpha: 0.5 },
];

const BY_ID = new Map(COLORS.map((c) => [c.id, c]));
const BY_LDRAW = new Map(COLORS.map((c) => [c.ldraw, c]));

export function getColor(id: string): ColorDef {
  const c = BY_ID.get(id);
  if (!c) throw new Error(`Unknown colour "${id}"`);
  return c;
}

export function findColorByLdraw(code: number): ColorDef | undefined {
  return BY_LDRAW.get(code);
}
