interface Props {
  id?: string;
  tileSize?: number;
  scale?: number;
  opacity?: number;
  rows?: number;
  className?: string;
  height?: number | string;
  onLight?: boolean;
}

export function SnowflakePattern({
  tileSize = 44,
  opacity = 0.18,
  rows = 2,
  height,
  className,
  onLight,
}: Props) {
  const h = height ?? tileSize * rows;
  const bgHeight = typeof h === "number" ? h : tileSize * rows;

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        display: "block",
        flexShrink: 0,
        width: "100%",
        height: h,
        opacity,
        backgroundImage: "url(/snowflake-pattern.png)",
        backgroundRepeat: "repeat",
        backgroundSize: `auto ${bgHeight}px`,
        pointerEvents: "none",
        filter: onLight ? "invert(1)" : undefined,
      }}
    />
  );
}
