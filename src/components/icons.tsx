/** Small hand-drawn-feel line icons (1.6px stroke, round caps). */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

const Svg = ({ size = 18, children, ...rest }: P & { children: React.ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
);

export const IconPlay = (p: P) => <Svg {...p}><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" /></Svg>;
export const IconPause = (p: P) => <Svg {...p}><path d="M8.5 5.5v13M15.5 5.5v13" strokeWidth={2.4} /></Svg>;
export const IconPrev = (p: P) => <Svg {...p}><path d="M17 5.5 9 12l8 6.5zM6.5 5.5v13" /></Svg>;
export const IconNext = (p: P) => <Svg {...p}><path d="m7 5.5 8 6.5-8 6.5zM17.5 5.5v13" /></Svg>;
export const IconReplay = (p: P) => <Svg {...p}><path d="M4.5 12a7.5 7.5 0 1 0 2.3-5.4" /><path d="M4.5 4.5v4h4" /></Svg>;
export const IconGhost = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="9" width="16" height="9" rx="1.5" strokeDasharray="2.4 2.2" />
    <path d="M8 9V7.2M16 9V7.2" strokeDasharray="1.6 1.6" />
  </Svg>
);
export const IconExplode = (p: P) => (
  <Svg {...p}>
    <rect x="7" y="14" width="10" height="5" rx="1" />
    <rect x="7" y="4" width="10" height="5" rx="1" />
    <path d="M12 9.8v3.2M10 11.2l2 1.8 2-1.8" strokeDasharray="0" />
  </Svg>
);
export const IconCamera = (p: P) => (
  <Svg {...p}>
    <path d="M4 8.5h3l1.6-2.5h6.8L17 8.5h3v10H4z" />
    <circle cx="12" cy="13.2" r="3.2" />
  </Svg>
);
export const IconResetView = (p: P) => (
  <Svg {...p}>
    <path d="M12 3.5 19.5 8v8L12 20.5 4.5 16V8z" />
    <path d="M12 12 19.5 8M12 12 4.5 8M12 12v8.5" />
  </Svg>
);
export const IconFit = (p: P) => (
  <Svg {...p}>
    <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
    <rect x="9" y="9" width="6" height="6" rx="1" />
  </Svg>
);
export const IconUndo = (p: P) => <Svg {...p}><path d="M9 7 4.5 11.5 9 16" /><path d="M4.5 11.5H14a5 5 0 0 1 0 10h-2" /></Svg>;
export const IconRedo = (p: P) => <Svg {...p}><path d="m15 7 4.5 4.5L15 16" /><path d="M19.5 11.5H10a5 5 0 0 0 0 10h2" /></Svg>;
export const IconRotate = (p: P) => <Svg {...p}><path d="M19.5 12A7.5 7.5 0 1 1 17.3 6.7" /><path d="M19.5 4v4h-4" /></Svg>;
export const IconTrash = (p: P) => <Svg {...p}><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5" /></Svg>;
export const IconCopy = (p: P) => <Svg {...p}><rect x="8.5" y="8.5" width="11" height="11" rx="2" /><path d="M15.5 8.5V5a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 5v9A1.5 1.5 0 0 0 5 15.5h3.5" /></Svg>;
export const IconMove = (p: P) => <Svg {...p}><path d="M12 3.5v17M3.5 12h17M12 3.5 9.5 6M12 3.5 14.5 6M12 20.5 9.5 18M12 20.5l2.5-2.5M3.5 12 6 9.5M3.5 12 6 14.5M20.5 12 18 9.5M20.5 12 18 14.5" /></Svg>;
export const IconGrid = (p: P) => <Svg {...p}><path d="M4 4h16v16H4zM4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16" /></Svg>;
export const IconSave = (p: P) => <Svg {...p}><path d="M5 4h11l3 3v13H5z" /><path d="M8 4v5h7V4M8 20v-6h8v6" /></Svg>;
export const IconSearch = (p: P) => <Svg {...p}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 4.5 4.5" /></Svg>;
export const IconUpload = (p: P) => <Svg {...p}><path d="M12 15.5V4M7.5 8.5 12 4l4.5 4.5M4.5 15v4.5h15V15" /></Svg>;
export const IconBack = (p: P) => <Svg {...p}><path d="M14.5 5.5 8 12l6.5 6.5" /></Svg>;
export const IconClose = (p: P) => <Svg {...p}><path d="m6 6 12 12M18 6 6 18" /></Svg>;
export const IconDownload = (p: P) => <Svg {...p}><path d="M12 4v11.5M7.5 11 12 15.5l4.5-4.5M4.5 15v4.5h15V15" /></Svg>;
export const IconPanel = (p: P) => <Svg {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M9 4.5v15" /></Svg>;
export const IconClock = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" /></Svg>;
export const IconCheck = (p: P) => <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>;
export const IconBrick = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 10.5 12 6l8.5 4.5v6L12 21l-8.5-4.5z" />
    <path d="M3.5 10.5 12 15l8.5-4.5M12 15v6" />
    <ellipse cx="9" cy="8.6" rx="1.6" ry=".8" />
    <ellipse cx="15" cy="8.6" rx="1.6" ry=".8" />
  </Svg>
);

/** Four-point sparkle ornament (✦). */
export const Sparkle = ({ size = 14, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" className={className} aria-hidden="true">
    <path d="M10 0c.6 5.4 4.6 9.4 10 10-5.4.6-9.4 4.6-10 10-.6-5.4-4.6-9.4-10-10C5.4 9.4 9.4 5.4 10 0z" fill="currentColor" />
  </svg>
);
