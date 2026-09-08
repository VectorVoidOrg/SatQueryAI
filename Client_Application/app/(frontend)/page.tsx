"use client";

import React, { useState } from "react";
import { FrontierHero } from "@/components/home/FrontierHero";
import {
  FRONT_PAGE_LOADING_DURATION,
  FRONT_PAGE_LOADING_STATES,
  FrontierPromptBox,
} from "@/components/home/FrontierPromptBox";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";
import { HistorySidebar } from "@/components/history/HistorySidebar";
import { ProfileModal } from "@/components/auth/ProfileModal";
import { useSessionStore } from "@/store/useSessionStore";
import { useProfileStore } from "@/store/useProfileStore";
import { Globe, Clock, Plus, LogIn, Map, User } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { setHistorySidebarOpen } = useSessionStore();
  const { profile, setProfileModalOpen } = useProfileStore();

  const handleSelectSuggestion = (query: string) => {
    setPrompt(query);
  };

  return (
    <div className="relative min-h-screen w-screen bg-[#FAF6F0] text-[#1C1917] flex flex-col justify-between overflow-x-hidden selection:bg-accent/20 selection:text-primary">
      <MultiStepLoader
        loadingStates={FRONT_PAGE_LOADING_STATES}
        loading={isTransitioning}
        duration={FRONT_PAGE_LOADING_DURATION}
      />

      {/* Warm Still-life photo background softly diffused behind frosted glass */}
      <div
        className="fixed inset-0 pointer-events-none bg-cover bg-center bg-no-repeat opacity-35 scale-[1.02]"
        style={{ backgroundImage: "url('/images/warm-bg.png')" }}
      />
      {/* Soft warm diffusion glass overlay: mimics sunlit dune and creates velvety depth */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-br from-[#FAF6F0]/85 via-[#F3E5D0]/80 to-[#EADCC9]/85 backdrop-blur-[24px]" />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,_rgba(200,109,59,0.08)_0%,_transparent_75%)]" />

      {/* Satellite map canvas reveal */}
      <div
        className={`fixed inset-0 pointer-events-none bg-cover bg-center transition-opacity duration-300 ease-apple ${
          isTransitioning ? "opacity-35" : "opacity-0"
        }`}
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(28,25,23,0.3) 0%, rgba(23,49,37,0.4) 100%), url('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/7/57/95')",
        }}
      />

      {/* Top Navbar */}
      <header className="relative z-20 px-6 py-4 flex items-center justify-between">
        {/* Left: Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-full bg-[#1C1917] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-all duration-200 ease-apple">
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
          <span className="ml-1 text-[10px] font-mono font-semibold bg-white/50 backdrop-blur-md text-secondary px-2.5 py-0.5 rounded-full border border-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_6px_rgba(78,59,42,0.04)]">
            SIH 26167
          </span>
        </Link>

        {/* Right: Map Workspace, History, New Chat, Profile Avatar, and Login */}
        <div className="flex items-center gap-3">
          {/* Direct Link to SatQuery Chat & Map Workspace */}
          <Link
            href="/chat"
            className="apple-interactive glass-pill hidden md:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-secondary hover:text-primary hover:bg-white/70 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 ease-apple"
          >
            <Map className="w-3.5 h-3.5 text-accent" />
            <span>Map Workspace</span>
          </Link>

          {/* History Button (opens collapsible sidebar) */}
          <button
            type="button"
            onClick={() => setHistorySidebarOpen(true)}
            className="apple-interactive glass-pill flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium text-secondary hover:text-primary hover:bg-white/70 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 ease-apple"
            title="Conversation History"
          >
            <Clock className="w-3.5 h-3.5 text-secondary" />
            <span>History</span>
          </button>

          {/* New Chat Button */}
          <button
            type="button"
            onClick={() => setPrompt("")}
            className="apple-interactive glass-pill hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-secondary hover:text-primary hover:bg-white/70 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 ease-apple"
          >
            <Plus className="w-3.5 h-3.5 text-secondary" />
            <span>New Analysis</span>
          </button>

          {/* User Profile Avatar */}
          <button
            type="button"
            onClick={() => setProfileModalOpen(true)}
            className="w-8 h-8 rounded-full bg-[#1C1917] text-white flex items-center justify-center font-serif text-sm font-semibold hover:brightness-125 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 ease-apple shadow-xs ring-2 ring-black/5"
            title={`Logged in as ${profile.name}`}
          >
            {profile.name ? profile.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
          </button>

          {/* Login Button */}
          <Link
            href="/login"
            className="apple-interactive flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-white bg-[#7F4B30] hover:bg-[#965A3B] transition-all duration-200 ease-apple shadow-xs border border-[#7F4B30]/30 hover:-translate-y-0.5 active:scale-[0.98]"
            title="Sign In / Register Account"
          >
            <LogIn className="w-3.5 h-3.5 text-white/90" />
            <span>Login</span>
          </Link>
        </div>
      </header>

      {/* Main Centered Content (Claude / Gemini Frontier Model Style) */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8">
        <FrontierHero onSelectSuggestion={handleSelectSuggestion} isTransitioning={isTransitioning} />
        <FrontierPromptBox
          value={prompt}
          onChange={setPrompt}
          onTransitionStart={() => setIsTransitioning(true)}
          isTransitioning={isTransitioning}
        />
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-4 text-center text-xs text-secondary/70 font-mono flex items-center justify-between border-t border-stone-200/60">
        <span>SatQuery AI • Autonomous Geospatial Vision-Language Architecture</span>
        <div className="flex items-center gap-4 text-secondary">
          <Link href="/chat" className="hover:underline hover:text-primary">
            Open Chat & Map UI &rarr;
          </Link>
        </div>
      </footer>

      {/* Collapsible History Sidebar */}
      <HistorySidebar />

      {/* Profile Settings Modal */}
      <ProfileModal />
    </div>
  );
}
