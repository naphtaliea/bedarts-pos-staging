"use client";

import { useState } from "react";

interface BrandLogoProps {
  className?: string;
  // "color" = full-color logo for light backgrounds
  // "reverse" = white+red logo for dark/navy backgrounds
  variant?: "color" | "reverse";
  style?: React.CSSProperties;
}

export function BrandLogo({ className, variant = "color", style }: BrandLogoProps) {
  const src = variant === "reverse" ? "/logo-brand-reverse.png" : "/logo-brand.png";
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <img
      src={src}
      alt="Bedarts Cold Supplies"
      className={className}
      style={style}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}

interface BrandIconProps {
  className?: string;
  style?: React.CSSProperties;
}

export function BrandIcon({ className, style }: BrandIconProps) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <img
      src="/icon-192.png"
      alt=""
      aria-hidden="true"
      className={className}
      style={style}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}
