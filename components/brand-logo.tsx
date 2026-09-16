const BLUE = "#1B50C0";
const RED  = "#CC1B14";

const BLUE_LINES: [number, number, number, number][] = [
  [0, -33, 0, 33],
  [0, 0, 28.6, -16.5],
  [0, 0, 28.6, 16.5],
  [0, -21, 7.8, -25.5],
  [0, -21, -7.8, -25.5],
  [0, 21, -7.8, 25.5],
  [0, 21, 7.8, 25.5],
  [18.2, -10.5, 26, -6],
  [18.2, -10.5, 18.2, -19.5],
  [18.2, 10.5, 18.2, 19.5],
  [18.2, 10.5, 26, 6],
];

const RED_LINES: [number, number, number, number][] = [
  [0, 0, -28.6, -16.5],
  [0, 0, -28.6, 16.5],
  [-18.2, -10.5, -18.2, -19.5],
  [-18.2, -10.5, -26, -6],
  [-18.2, 10.5, -26, 6],
  [-18.2, 10.5, -18.2, 19.5],
];

function Flake({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g transform={`translate(${cx},${cy})`} strokeWidth="5.5" strokeLinecap="round" fill="none">
      <g stroke={BLUE}>
        {BLUE_LINES.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
        ))}
      </g>
      <g stroke={RED}>
        {RED_LINES.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
        ))}
      </g>
    </g>
  );
}

interface BrandLogoProps {
  className?: string;
  variant?: "light" | "color";
  style?: React.CSSProperties;
}

/** Full wordmark — snowflake + "Bedarts COLD SUPPLIES" text.
 *  variant="light" (default): white text, for dark backgrounds.
 *  variant="color": red/blue text, for light backgrounds. */
export function BrandLogo({ className, variant = "light", style }: BrandLogoProps) {
  const textPrimary   = variant === "color" ? RED  : "white";
  const textSecondary = variant === "color" ? BLUE : "rgba(255,255,255,0.8)";

  return (
    <svg
      viewBox="0 0 290 90"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Bedarts Cold Supplies"
      className={className}
      style={{ overflow: "visible", ...style }}
    >
      <Flake cx={44} cy={45} />
      <text
        x="93"
        y="56"
        style={{ fontFamily: "var(--font-display)", fontSize: 42, fontWeight: 900 }}
        fill={textPrimary}
      >
        Bedarts
      </text>
      <text
        x="96"
        y="73"
        style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: 4 }}
        fill={textSecondary}
      >
        COLD SUPPLIES
      </text>
    </svg>
  );
}

interface BrandIconProps {
  className?: string;
  style?: React.CSSProperties;
}

/** Snowflake mark only — for watermarks, favicons, and decorative use. */
export function BrandIcon({ className, style }: BrandIconProps) {
  return (
    <svg
      viewBox="-38 -38 76 76"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <Flake cx={0} cy={0} />
    </svg>
  );
}
