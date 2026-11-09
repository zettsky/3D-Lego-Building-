/** Brick colours, keyed by our id, with the matching LDraw colour code for import/export. */
export interface ColorDef {
  id: string;
  name: string;
  ldraw: number;
  hex: string;
}

export const COLORS: ColorDef[] = [
  { id: "white", name: "White", ldraw: 15, hex: "#F4F2EC" },
  { id: "black", name: "Black", ldraw: 0, hex: "#1E2326" },
  { id: "red", name: "Red", ldraw: 4, hex: "#C42A1C" },
  { id: "dark-orange", name: "Dark Orange", ldraw: 484, hex: "#A95A26" },
  { id: "reddish-brown", name: "Reddish Brown", ldraw: 70, hex: "#5E3220" },
  { id: "tan", name: "Tan", ldraw: 19, hex: "#E0C99B" },
  { id: "dark-tan", name: "Dark Tan", ldraw: 28, hex: "#958A73" },
  { id: "yellow", name: "Yellow", ldraw: 14, hex: "#F2CD37" },
  { id: "bright-green", name: "Bright Green", ldraw: 10, hex: "#5E9E4E" },
  { id: "green", name: "Green", ldraw: 2, hex: "#2E7A45" },
  { id: "dark-green", name: "Dark Green", ldraw: 288, hex: "#24503A" },
  { id: "sand-green", name: "Sand Green", ldraw: 378, hex: "#A0BCAC" },
  { id: "medium-blue", name: "Medium Blue", ldraw: 73, hex: "#6A9AD4" },
  { id: "light-bluish-gray", name: "Light Bluish Gray", ldraw: 71, hex: "#A3A8AB" },
  { id: "dark-bluish-gray", name: "Dark Bluish Gray", ldraw: 72, hex: "#6C6E68" },
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
