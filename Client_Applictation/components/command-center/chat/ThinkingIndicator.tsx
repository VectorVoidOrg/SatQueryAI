import React from "react";
import { Sparkles } from "lucide-react";

export const ThinkingIndicator: React.FC = () => {
  return (
    <div className="liquid-glass flex items-center gap-2.5 px-4 py-2 rounded-full text-slate-700 text-xs w-fit shadow-sm animate-fade-in-up border border-slate-200/60">
      <Sparkles className="w-3.5 h-3.5 text-accent animate-spin" style={{ animationDuration: "3s" }} />
      <span className="font-serif italic text-sm text-slate-800 tracking-wide font-medium">
        Orchestrating Vision-Language Pipeline
      </span>
      <div className="flex items-center gap-1 pl-1">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-800 animate-dot-pulse-1" />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-800 animate-dot-pulse-2" />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-800 animate-dot-pulse-3" />
      </div>
    </div>
  );
};
