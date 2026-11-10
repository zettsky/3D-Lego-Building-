/** Brick colours, keyed by our id, with the matching LDraw colour code for import/export. */
export interface ColorDef {
  id: string;
  name: string;
  ldraw: number;
  hex: string;
}

export const COLORS: ColorDef[] = [
  // Names are the LEGO colour names printed in parts lists; hex values follow the LDraw colour table.
  { id: "white", name: "White", ldraw: 15, hex: "#F4F4F0" },
  { id: "black", name: "Black", ldraw: 0, hex: "#1B2A34" },
  { id: "red", name: "Bright Red", ldraw: 4, hex: "#C91A09" },
  { id: "dark-orange", name: "Dark Orange", ldraw: 484, hex: "#A95500" },
  { id: "reddish-brown", name: "Reddish Brown", ldraw: 70, hex: "#582A12" },
  { id: "tan", name: "Tan", ldraw: 19, hex: "#E4CD9E" },
  { id: "dark-tan", name: "Dark Tan", ldraw: 28, hex: "#958A73" },
  { id: "yellow", name: "Bright Yellow", ldraw: 14, hex: "#F2CD37" },
  { id: "bright-blue", name: "Bright Blue", ldraw: 1, hex: "#0055BF" },
  { id: "bright-green", name: "Bright Green", ldraw: 10, hex: "#4B9F4A" },
  { id: "green", name: "Dark Green", ldraw: 2, hex: "#237841" },
  { id: "dark-green", name: "Earth Green", ldraw: 288, hex: "#184632" },
  { id: "sand-green", name: "Sand Green", ldraw: 378, hex: "#A0BCAC" },
  { id: "medium-blue", name: "Medium Blue", ldraw: 73, hex: "#5A93DB" },
  { id: "light-bluish-gray", name: "Medium Stone Grey", ldraw: 71, hex: "#A0A5A9" },
  { id: "dark-bluish-gray", name: "Dark Stone Grey", ldraw: 72, hex: "#6C6E68" },
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
