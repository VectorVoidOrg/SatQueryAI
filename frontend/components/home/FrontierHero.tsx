"use client";

import React from "react";
import { Sparkles, Globe2, Zap, Layers } from "lucide-react";

// Trained query phrasings from backend README §4.1 — use verbatim for best results
export const TRAINED_PHRASINGS = [
  {
    title: "Change Detection",
    prompt: "Has the built-up area changed between the two images?",
    icon: "layers",
    needs: "2 optical + timestamps",
  },
  {
    title: "Scene Description",
    prompt: "Describe this satellite image in detail.",
    icon: "globe",
    needs: "1 image",
  },
  {
    title: "Optical + SAR Fusion",
    prompt: "Use the optical and SAR images together to identify the land-cover and the built-up and water-covered regions.",
    icon: "zap",
    needs: "1 optical + 1 SAR",
  },
  {
    title: "Change Amount",
    prompt: "How much of the scene changed between the two dates?",
    icon: "layers",
    needs: "2 optical + timestamps",
  },
];

interface FrontierHeroProps {
  onSelectSuggestion: (query: string) => void;
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

      <p className="text-sm text-secondary max-w-lg leading-relaxed font-normal">
        Upload 1–2 satellite images (optical, SAR, or bi-temporal pair) and ask
        natural-language questions. The agentic backend selects the right
        specialist model and returns evidence-grounded answers.
      </p>

      {/* Suggestion pills — all use REAL trained phrasings */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
        {TRAINED_PHRASINGS.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectSuggestion(s.prompt)}
            title={`Needs: ${s.needs}`}
            className="apple-interactive px-3.5 py-1.5 rounded-full text-xs font-medium text-[#7F4B30] dark:text-[#F3EEE7] hover:text-[#FAF6F0] dark:hover:text-white bg-[#E1D9C9]/90 dark:bg-[#1F1B17] hover:bg-[#7F4B30] dark:hover:bg-[#2A241F] border border-[#AE9372]/60 dark:border-white/10 hover:border-[#7F4B30] dark:hover:border-accent/40 hover:-translate-y-[1px] active:scale-[0.99] shadow-[0_4px_14px_rgba(127,75,48,0.08),inset_0_1px_1px_rgba(255,255,255,0.85)] dark:shadow-[0_4px_14px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.08)] flex items-center gap-1.5 group backdrop-blur-md transition-all duration-200 ease-apple"
          >
            {s.icon === "layers" ? (
              <Layers className="w-3 h-3 text-[#B27D57] dark:text-accent group-hover:text-[#FAF6F0] dark:group-hover:text-white transition-colors" />
            ) : s.icon === "zap" ? (
              <Zap className="w-3 h-3 text-[#B27D57] dark:text-accent group-hover:text-[#FAF6F0] dark:group-hover:text-white transition-colors" />
            ) : (
              <Globe2 className="w-3 h-3 text-[#B27D57] dark:text-accent group-hover:text-[#FAF6F0] dark:group-hover:text-white transition-colors" />
            )}
            <span>{s.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
