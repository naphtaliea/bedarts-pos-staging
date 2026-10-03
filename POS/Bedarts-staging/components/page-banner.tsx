import { SnowflakePattern } from "./snowflake-pattern";

interface PageBannerProps {
  children: React.ReactNode;
}

export function PageBanner({ children }: PageBannerProps) {
  return (
    <div className="relative bg-sidebar overflow-hidden shrink-0">
      <div className="absolute inset-0 pointer-events-none">
        <SnowflakePattern opacity={0.15} rows={2} tileSize={52} />
      </div>
      <div className="relative z-10 border-b border-white/10">
        {children}
      </div>
    </div>
  );
}
