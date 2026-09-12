"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FrontierHero } from "@/components/home/FrontierHero";
import { FrontierPromptBox } from "@/components/home/FrontierPromptBox";
import { HistorySidebar } from "@/components/history/HistorySidebar";
import { ProfileModal } from "@/components/profile/ProfileModal";
import { EnvironmentStatusBadge } from "@/components/common/EnvironmentStatusBadge";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { FullScreenAnalysisLoader } from "@/components/loading/FullScreenAnalysisLoader";
import { useSessionStore } from "@/store/useSessionStore";
import { useProfileStore } from "@/store/useProfileStore";
import { toast } from "@/store/useToastStore";
import { SATELLITE_ANALYSIS_STEPS } from "@/lib/adapters/satelliteAnalysisAdapter";
import { Globe, Clock, Plus, User } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [progressPercent, setProgressPercent] = useState(15);
  const { createSession, setHistorySidebarOpen } = useSessionStore();
  const { profile, initProfile, setProfileModalOpen } = useProfileStore();

  useEffect(() => {
    initProfile();
  }, [initProfile]);

  const handleSelectSuggestion = (query: string) => {
    setPrompt(query);
  };

  const handleStartAnalysis = async (queryPrompt: string, attachedFile: File | null) => {
    setIsAnalyzing(true);
    setActiveStep(0);
    setProgressPercent(15);

    // Stepper interval to advance through the canonical 7 steps while inference runs
    let currentStep = 0;
    const stepInterval = setInterval(() => {
      currentStep++;
      if (currentStep < SATELLITE_ANALYSIS_STEPS.length - 1) {
        setActiveStep(currentStep);
        setProgressPercent(
          Math.round(((currentStep + 1) / SATELLITE_ANALYSIS_STEPS.length) * 100)
        );
      }
    }, 420);

    try {
      const formData = new FormData();
      formData.append("prompt", queryPrompt);
      if (attachedFile) {
        formData.append("file", attachedFile);
      }

      // Start actual API query
      const queryPromise = fetch("/api/query", {
        method: "POST",
        body: formData,
      });

      // Minimum duration so user can comfortably appreciate the full-screen loader without abrupt flickering
      const minDelay = new Promise((resolve) => setTimeout(resolve, 2000));

      const [response] = await Promise.all([queryPromise, minDelay]);
      clearInterval(stepInterval);

      let responseData: any = {};
      if (response.ok) {
        responseData = await response.json();
      }

      // Complete the final step (Step 6 / 7)
      setActiveStep(SATELLITE_ANALYSIS_STEPS.length - 1);
      setProgressPercent(100);

      // Brief hold so user sees the 100% completion state
      await new Promise((resolve) => setTimeout(resolve, 350));

      const newSessionId = createSession({
        prompt: queryPrompt,
        attachedFileName: attachedFile?.name,
        assistantText: responseData.text,
        evidence: responseData.evidence,
        requiresMap: Boolean(
          attachedFile ||
            responseData.requiresMap ||
            responseData.mapData ||
            responseData.spatialOutput
        ),
        audit: responseData.audit,
        bbox: responseData.bbox,
        assetName: responseData.assetName,
      });

      // Navigate directly to the Analysis Map Workspace
      router.push(`/analysis/${newSessionId}`);
    } catch (err: any) {
      clearInterval(stepInterval);
      console.error("Analysis query error:", err);
      toast.error("Analysis Pipeline Error", err?.message || "Failed to reach inference service. Please try again.");
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="relative min-h-screen w-screen bg-[#FAF6F0] dark:bg-[#0F0E0C] text-primary overflow-x-hidden selection:bg-accent/20 selection:text-primary transition-colors duration-300">
      <AnimatePresence mode="wait">
        {!isAnalyzing ? (
          <motion.div
            key="home-viewport"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="relative min-h-screen w-screen flex flex-col justify-between"
          >
            {/* Warm Still-life photo background softly diffused behind frosted glass - hidden in dark mode */}
            <div
              className="fixed inset-0 pointer-events-none bg-cover bg-center bg-no-repeat opacity-35 dark:hidden scale-[1.02]"
              style={{ backgroundImage: "url('/images/warm-bg.png')" }}
            />
            {/* Soft warm diffusion glass overlay: mimics sunlit dune in light mode, hidden in dark mode */}
            <div className="fixed inset-0 pointer-events-none bg-gradient-to-br from-[#FAF6F0]/85 via-[#F3E5D0]/80 to-[#EADCC9]/85 dark:hidden backdrop-blur-[24px]" />
            <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,_rgba(200,109,59,0.08)_0%,_transparent_75%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,_rgba(200,109,59,0.05)_0%,_transparent_75%)]" />

            {/* Top Navbar */}
            <header className="relative z-20 px-6 py-4 flex items-center justify-between">
              {/* Left: Brand */}
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded-full bg-[#1C1917] dark:bg-[#1F1B17] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-all duration-200 ease-apple ring-1 ring-white/10">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-serif text-xl tracking-wide text-primary font-medium">
                    SatQuery
                  </span>
                  <em className="font-serif italic text-lg text-accent">
                    AI
                  </em>
                </div>
                <span className="ml-1 text-[10px] font-mono font-semibold bg-white/50 dark:bg-[#1F1B17] backdrop-blur-md text-secondary dark:text-[#B8AEA3] px-2.5 py-0.5 rounded-full border border-white/60 dark:border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_6px_rgba(78,59,42,0.04)] dark:shadow-none">
                  SIH 26167
                </span>
              </Link>

              {/* Right: Environment, History, New Chat, Theme Toggle, Profile Avatar */}
              <div className="flex items-center gap-3">
                <EnvironmentStatusBadge />
                {/* History Button (opens collapsible sidebar) */}
                <button
                  type="button"
                  onClick={() => setHistorySidebarOpen(true)}
                  className="apple-interactive glass-pill flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium text-secondary hover:text-primary hover:bg-white/70 dark:hover:bg-white/10 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 ease-apple"
                  title="Conversation History"
                >
                  <Clock className="w-3.5 h-3.5 text-secondary" />
                  <span>History</span>
                </button>

                {/* New Chat Button */}
                <button
                  type="button"
                  onClick={() => setPrompt("")}
                  className="apple-interactive glass-pill hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-secondary hover:text-primary hover:bg-white/70 dark:hover:bg-white/10 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 ease-apple"
                >
                  <Plus className="w-3.5 h-3.5 text-secondary" />
                  <span>New Analysis</span>
                </button>

                {/* Theme Toggle */}
                <ThemeToggle />

                {/* User Profile Avatar (opens profile pop-up) */}
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(true)}
                  className="w-9 h-9 rounded-full bg-[#1C1917] dark:bg-[#1F1B17] text-white flex items-center justify-center font-serif text-sm font-semibold hover:brightness-125 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 ease-apple shadow-xs ring-2 ring-black/5 dark:ring-white/10"
                  title={`Logged in as ${profile.name}`}
                >
                  {profile.name ? profile.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                </button>
              </div>
            </header>

            {/* Main Centered Content */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-6">
              <FrontierHero onSelectSuggestion={handleSelectSuggestion} isTransitioning={false} />
              <FrontierPromptBox
                value={prompt}
                onChange={setPrompt}
                onSubmitPrompt={handleStartAnalysis}
                isSubmitting={isAnalyzing}
              />
            </main>

            {/* Footer */}
            <footer className="relative z-10 px-6 py-4 text-center text-xs text-secondary/70 dark:text-[#91877D] font-mono flex items-center justify-between border-t border-stone-300/40 dark:border-white/10">
              <span>SatQuery AI • Autonomous Geospatial Vision-Language Architecture</span>
              <div className="flex items-center gap-4 text-secondary dark:text-[#B8AEA3]">
                <Link href="/analysis/c_sundarbans_demo" className="hover:underline hover:text-accent transition-colors">
                  Default Demo Workspace &rarr;
                </Link>
              </div>
            </footer>

            {/* Collapsible History Sidebar */}
            <HistorySidebar />

            {/* Profile Settings Modal */}
            <ProfileModal />
          </motion.div>
        ) : (
          <FullScreenAnalysisLoader
            key="analysis-loader"
            isLoading={true}
            value={activeStep}
            progress={progressPercent}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
