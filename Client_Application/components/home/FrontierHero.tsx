import React from "react";
import { Sparkles, Globe2, Compass } from "lucide-react";

interface FrontierHeroProps {
  onSelectSuggestion: (query: string) => void;
}

export const FrontierHero: React.FC<FrontierHeroProps> = ({ onSelectSuggestion }) => {
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
    <div className="flex flex-col items-center text-center space-y-4 max-w-2xl mx-auto mb-6 select-none">
      {/* Subtle pill tag */}
      <div className="liquid-glass inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-slate-200 text-slate-700 text-xs shadow-sm">
        <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
        <span className="font-medium text-slate-800">Agentic Remote-Sensing Assistant</span>
        <span className="text-slate-300">•</span>
        <span className="font-mono text-slate-400 text-[10px]">SIH 26167</span>
      </div>

      {/* Main Tagline (Claude/Gemini style) in Instrument Serif */}
      <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl text-slate-900 tracking-tight leading-[1.15] font-normal">
        Where should our <em className="italic text-slate-500 font-serif">spatial intelligence</em> focus today?
      </h1>

      <p className="text-sm text-slate-500 max-w-lg leading-relaxed font-normal">
        Drop high-resolution satellite imagery (optical + SAR) or ask natural-language questions to orchestrate autonomous geospatial models and inspect spatial evidence.
      </p>

      {/* Suggestion Chips */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectSuggestion(s.prompt)}
            className="liquid-glass px-3.5 py-1.5 rounded-full text-xs text-slate-600 hover:text-slate-900 hover:bg-white hover:border-slate-300 border border-slate-200/80 transition-all shadow-sm flex items-center gap-1.5 group"
          >
            <Compass className="w-3 h-3 text-slate-400 group-hover:text-accent transition-colors" />
            <span>{s.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
