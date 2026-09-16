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

interface Props {
  id: string;
  tileSize?: number;
  scale?: number;
  opacity?: number;
  rows?: number;
  className?: string;
  height?: number | string;
}

export function SnowflakePattern({
  id,
  tileSize = 44,
  scale = 0.44,
  opacity = 0.18,
  rows = 2,
  className,
  height,
}: Props) {
  const cx = tileSize / 2;
  const cy = tileSize / 2;

  return (
    <svg
      width="100%"
      height={height ?? tileSize * rows}
      className={className}
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <pattern id={id} width={tileSize} height={tileSize} patternUnits="userSpaceOnUse">
          <g
            transform={`translate(${cx},${cy}) scale(${scale})`}
            strokeWidth="5.5"
            strokeLinecap="round"
            fill="none"
          >
            <g stroke="#1B50C0">
              {BLUE_LINES.map(([x1, y1, x2, y2], i) => (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
              ))}
            </g>
            <g stroke="#CC1B14">
              {RED_LINES.map(([x1, y1, x2, y2], i) => (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
              ))}
            </g>
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} opacity={opacity} />
    </svg>
  );
}
