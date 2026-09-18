"use client";

import React from "react";
import { Sparkles } from "lucide-react";

interface FrontierHeroProps {
  onSelectSuggestion?: (query: string) => void;
  isTransitioning?: boolean;
}

export const FrontierHero: React.FC<FrontierHeroProps> = ({
  onSelectSuggestion,
  isTransitioning = false,
}) => {
  return (
    <div
      className={`flex flex-col items-center text-center space-y-4 max-w-2xl mx-auto mb-5 transition-opacity duration-300 ease-apple ${
        isTransitioning ? "opacity-80" : "opacity-100"
      }`}
    >
      {/* Pill tag */}
      <div className="glass-pill inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-secondary text-xs">
        <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
        <span className="font-medium text-primary">Agentic Remote-Sensing Assistant</span>
        <span className="text-secondary/40">•</span>
        <span className="font-mono text-secondary/70 text-[10px]">SIH 26167</span>
      </div>

      {/* Main tagline */}
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-12 -inset-y-6 bg-[radial-gradient(ellipse_at_center,_rgba(200,109,59,0.10)_0%,_transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,_rgba(200,109,59,0.06)_0%,_transparent_70%)] blur-2xl"
        />
        <h1 className="relative font-serif text-4xl sm:text-5xl md:text-6xl text-primary tracking-tight leading-[1.15] font-normal">
          Where should our{" "}
          <em className="italic text-accent font-serif">spatial intelligence</em>{" "}
          focus today?
        </h1>
      </div>

    </div>
  );
};
