"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Globe, Plus, Loader2, ArrowLeft } from "lucide-react";
import { FrontierHero } from "@/components/home/FrontierHero";
import { FrontierPromptBox } from "@/components/home/FrontierPromptBox";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { EnvironmentStatusBadge } from "@/components/common/EnvironmentStatusBadge";
import { ResultsPanel } from "@/components/results/ResultsPanel";
import { RefusalCard } from "@/components/results/RefusalCard";
import { postAnalyze } from "@/lib/api/analyzeClient";
import type { AnalyzeFormValues, AnalyzeResponse } from "@/lib/types/analyze";

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);

  const handleSelectSuggestion = (query: string) => {
    setPrompt(query);
  };

  const handleSubmitForm = async (form: AnalyzeFormValues) => {
    setIsSubmitting(true);
    setResult(null);
    setRefusal(null);

    const res = await postAnalyze(form);
    setIsSubmitting(false);

    if (res.ok) {
      setResult(res.data);
    } else {
      setRefusal(res.detail);
    }
  };

  const handleNewAnalysis = () => {
    setPrompt("");
    setResult(null);
    setRefusal(null);
  };

  return (
    <div className="relative min-h-screen w-screen bg-[#FAF6F0] dark:bg-[#0F0E0C] text-primary overflow-x-hidden selection:bg-accent/20 selection:text-primary transition-colors duration-300">
      {/* Background aesthetics */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-br from-[#FAF6F0]/85 via-[#F3E5D0]/80 to-[#EADCC9]/85 dark:hidden backdrop-blur-[24px]" />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,_rgba(200,109,59,0.08)_0%,_transparent_75%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,_rgba(200,109,59,0.05)_0%,_transparent_75%)]" />

      {/* Top Navbar */}
      <header className="relative z-20 px-6 py-4 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" onClick={handleNewAnalysis} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-full bg-[#1C1917] dark:bg-[#1F1B17] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-all duration-200 ease-apple ring-1 ring-white/10">
            <Globe className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-serif text-xl tracking-wide text-primary font-medium">
              SatQuery
            </span>
            <em className="font-serif italic text-lg text-accent">AI</em>
          </div>
          <span className="ml-1 text-[10px] font-mono font-semibold bg-white/50 dark:bg-[#1F1B17] backdrop-blur-md text-secondary dark:text-[#B8AEA3] px-2.5 py-0.5 rounded-full border border-white/60 dark:border-white/10">
            SIH 26167
          </span>
        </Link>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          <EnvironmentStatusBadge />

          {(result || refusal) && (
            <button
              type="button"
              onClick={handleNewAnalysis}
              className="apple-interactive glass-pill flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-secondary hover:text-primary hover:bg-white/70 dark:hover:bg-white/10 transition-all duration-200"
            >
              <Plus className="w-3.5 h-3.5 text-accent" />
              <span>New Query</span>
            </button>
          )}

          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-6 max-w-4xl mx-auto space-y-6">
        {!result && !refusal && (
          <>
            <FrontierHero onSelectSuggestion={handleSelectSuggestion} />
            <FrontierPromptBox
              value={prompt}
              onChange={setPrompt}
              onSubmitPrompt={handleSubmitForm}
              isSubmitting={isSubmitting}
            />
          </>
        )}

        {/* Loading Spinner */}
        {isSubmitting && (
          <div className="p-8 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
            <p className="text-sm font-mono text-secondary">
              Running spatial intelligence pipeline & specialist VLM inference…
            </p>
          </div>
        )}

        {/* Refusal display */}
        {refusal && (
          <div className="w-full space-y-4">
            <button
              type="button"
              onClick={handleNewAnalysis}
              className="flex items-center gap-1.5 text-xs text-secondary hover:text-primary transition-colors font-mono"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to search</span>
            </button>
            <RefusalCard detail={refusal} onReset={handleNewAnalysis} />
          </div>
        )}

        {/* Result display */}
        {result && (
          <div className="w-full space-y-4">
            <button
              type="button"
              onClick={handleNewAnalysis}
              className="flex items-center gap-1.5 text-xs text-secondary hover:text-primary transition-colors font-mono"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>New Analysis</span>
            </button>
            <ResultsPanel data={result} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-4 text-center text-xs text-secondary/70 dark:text-[#91877D] font-mono flex items-center justify-between border-t border-stone-300/40 dark:border-white/10 mt-12">
        <span>SatQuery AI • Autonomous Geospatial Vision-Language Architecture</span>
        <span className="text-secondary/50">SIH 26167 Hackathon Build</span>
      </footer>
    </div>
  );
}
