"use client";

import React from "react";
import { Sparkles, Clock, CheckCircle2 } from "lucide-react";

interface AnswerBlockProps {
  answer: string;
  taskIntent: string;
  durationSeconds: number;
  compact?: boolean;
}

export const AnswerBlock: React.FC<AnswerBlockProps> = ({
  answer,
  taskIntent,
  durationSeconds,
  compact = false,
}) => {
  return (
    <div className={`${compact ? "p-3 space-y-2" : "p-5 space-y-3"} rounded-2xl bg-white/70 dark:bg-[#171512] border border-stone-300/80 dark:border-white/10 shadow-sm`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm text-primary">Model Answer</span>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium uppercase">
            {taskIntent}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-secondary font-mono">
          <Clock className="w-3.5 h-3.5" />
          <span>{durationSeconds}s</span>
        </div>
      </div>

      <div className={`${compact ? "text-sm" : "text-base sm:text-lg"} text-primary leading-relaxed font-normal whitespace-pre-wrap pl-1`}>
        {answer}
      </div>
    </div>
  );
};
