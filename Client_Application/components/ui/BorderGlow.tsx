"use client";

import { useCallback, useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";

interface BorderGlowProps {
  children?: ReactNode;
  className?: string;
  glowColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  glowIntensity?: number;
  coneSpread?: number;
  colors?: string[];
}

interface GlowStyle extends CSSProperties {
  "--card-bg"?: string;
  "--border-radius"?: string;
  "--glow-intensity"?: number;
  "--cone-spread"?: string;
  "--glow-color"?: string;
  "--glow-color-60"?: string;
  "--gradient-one"?: string;
  "--gradient-two"?: string;
  "--gradient-three"?: string;
  "--gradient-base"?: string;
}

function parseGlowColor(color: string): string {
  const parts = color.trim().split(/\s+/).map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return "hsl(198deg 93% 60%)";
  }
  return `hsl(${parts[0]}deg ${parts[1]}% ${parts[2]}%)`;
}

function buildGlowStyles(glowColor: string, intensity: number, colors: string[]): GlowStyle {
  const glow = parseGlowColor(glowColor);
  const accentColors = colors.length > 0 ? colors : ["#38bdf8"];

  return {
    "--glow-color": glow,
    "--glow-color-60": glow.replace(")", ` / ${Math.min(0.6 * intensity, 1)})`),
    "--gradient-one": `radial-gradient(at 80% 55%, ${accentColors[0]} 0, transparent 50%)`,
    "--gradient-two": `radial-gradient(at 20% 20%, ${accentColors[Math.min(1, accentColors.length - 1)]} 0, transparent 50%)`,
    "--gradient-three": `radial-gradient(at 86% 85%, ${accentColors[Math.min(2, accentColors.length - 1)]} 0, transparent 50%)`,
    "--gradient-base": `linear-gradient(${accentColors[0]} 0 100%)`,
  };
}

export function BorderGlow({
  children,
  className = "",
  glowColor = "198 93 60",
  backgroundColor = "#ffffff",
  borderRadius = 24,
  glowIntensity = 1,
  coneSpread = 28,
  colors = ["#38bdf8", "#22c55e", "#f59e0b"],
}: BorderGlowProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const updatePointerPosition = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const bounds = card.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const centerX = bounds.width / 2;
    const centerY = bounds.height / 2;
    const distanceToEdge = Math.min(
      x,
      y,
      bounds.width - x,
      bounds.height - y,
    );
    const edgeProximity = Math.max(0, Math.min(100, 100 - (distanceToEdge / Math.min(centerX, centerY)) * 100));
    const angle = (Math.atan2(y - centerY, x - centerX) * 180) / Math.PI + 90;

    card.style.setProperty("--edge-proximity", `${edgeProximity / 100}`);
    card.style.setProperty("--cursor-angle", `${angle < 0 ? angle + 360 : angle}deg`);
  }, []);

  const resetGlow = useCallback(() => {
    cardRef.current?.style.setProperty("--edge-proximity", "0");
  }, []);

  const style: GlowStyle = {
    "--card-bg": backgroundColor,
    "--border-radius": `${borderRadius}px`,
    "--glow-intensity": glowIntensity,
    "--cone-spread": `${coneSpread}deg`,
    ...buildGlowStyles(glowColor, glowIntensity, colors),
  };

  return (
    <div
      ref={cardRef}
      className={`border-glow-card ${className}`}
      style={style}
      onPointerMove={updatePointerPosition}
      onPointerLeave={resetGlow}
    >
      <span className="border-glow-edge-light" aria-hidden="true" />
      <div className="border-glow-inner">{children}</div>
    </div>
  );
}
