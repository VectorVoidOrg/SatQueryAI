import React from "react";
import { Sparkles, Globe2, Compass } from "lucide-react";

interface FrontierHeroProps {
  onSelectSuggestion: (query: string) => void;
  isTransitioning?: boolean;
}

export const FrontierHero: React.FC<FrontierHeroProps> = ({ onSelectSuggestion, isTransitioning = false }) => {
  const suggestions = [
    {
      title: "Coastal Erosion Analysis",
      prompt: "Has this riverbank eroded since last quarter?",
    },
    {
      title: "Structure Detection",
      prompt: "Count new structures and industrial expansion in this AOI.",
    },
    {
      title: "Multi-Sensor Fusion",
      prompt: "Compare optical basemap with SAR radar change mask for anomalous displacement.",
    },
    {
      title: "Inundation Mapping",
      prompt: "Detect tidal washout and water logging zones across this sub-basin.",
    },
  ];

  return (
    <div
      className={`flex flex-col items-center text-center space-y-4 max-w-2xl mx-auto mb-6 transition-opacity duration-300 ease-apple ${
        isTransitioning ? "opacity-80" : "opacity-100"
      }`}
    >
      {/* Subtle glass pill tag */}
      <div className="glass-pill inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-secondary text-xs">
        <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
        <span className="font-medium text-primary">Agentic Remote-Sensing Assistant</span>
        <span className="text-secondary/40">•</span>
        <span className="font-mono text-secondary/70 text-[10px]">SIH 26167</span>
      </div>

      {/* Main Tagline with subtle ambient backlight warmth */}
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-12 -inset-y-6 bg-[radial-gradient(ellipse_at_center,_rgba(200,109,59,0.10)_0%,_transparent_70%)] blur-2xl"
        />
        <h1 className="relative font-serif text-4xl sm:text-5xl md:text-6xl text-primary tracking-tight leading-[1.15] font-normal">
          Where should our <em className="italic text-accent font-serif">spatial intelligence</em> focus today?
        </h1>
      </div>

      <p className="text-sm text-secondary max-w-lg leading-relaxed font-normal">
        Drop high-resolution satellite imagery (optical + SAR) or ask natural-language questions to orchestrate autonomous geospatial models and inspect spatial evidence.
      </p>

      {/* Suggestion Pills & Sub-buttons: Warm palette glass capsules with Apple micro-interaction */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectSuggestion(s.prompt)}
            className="apple-interactive glass-pill group px-3.5 py-1.5 rounded-full text-xs text-secondary hover:text-primary hover:bg-white/80 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 ease-apple border border-sand-200/80 hover:border-accent/40 shadow-xs flex items-center gap-1.5"
          >
            <Compass className="w-3 h-3 text-secondary/70 group-hover:text-accent transition-colors shrink-0" />
            <span className="font-medium">{s.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
