"use client";

import React, { useState } from "react";
import { FrontierHero } from "@/components/home/FrontierHero";
import { FrontierPromptBox } from "@/components/home/FrontierPromptBox";
import { HistorySidebar } from "@/components/history/HistorySidebar";
import { ProfileModal } from "@/components/profile/ProfileModal";
import { useSessionStore } from "@/store/useSessionStore";
import { useProfileStore } from "@/store/useProfileStore";
import { Globe, Clock, Plus, User, LogIn } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const { setHistorySidebarOpen } = useSessionStore();
  const { profile, setProfileModalOpen } = useProfileStore();

  const handleSelectSuggestion = (query: string) => {
    setPrompt(query);
  };

  return (
    <div className="relative min-h-screen w-screen bg-base text-primary flex flex-col justify-between overflow-x-hidden">
      {/* Subtle ambient radial light */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_rgba(15,23,42,0.02)_0%,_transparent_70%)]" />

      {/* Top Navbar */}
      <header className="relative z-20 px-6 py-4 flex items-center justify-between">
        {/* Left: Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <Globe className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-serif text-xl tracking-wide text-slate-900 font-medium">
              SatQuery
            </span>
            <em className="font-serif italic text-lg text-slate-500">
              AI
            </em>
          </div>
          <span className="ml-1 text-[10px] font-mono font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">
            SIH 26167
          </span>
        </Link>

        {/* Right: History, New Chat, Flashing Login, Profile Avatar */}
        <div className="flex items-center gap-3">
          {/* History Button (opens collapsible sidebar) */}
          <button
            type="button"
            onClick={() => setHistorySidebarOpen(true)}
            className="liquid-glass flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-700 hover:text-slate-950 hover:bg-white border border-slate-200/80 transition-all shadow-sm"
            title="Conversation History"
          >
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>History</span>
          </button>

          {/* New Chat Button */}
          <button
            type="button"
            onClick={() => setPrompt("")}
            className="liquid-glass hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-700 hover:text-slate-950 hover:bg-white border border-slate-200/80 transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>New Analysis</span>
          </button>

          {/* Flashing Corner Login Button */}
          <Link
            href="/login"
            className="relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-white bg-slate-900 hover:bg-black transition-all shadow-md animate-pulse hover:animate-none group overflow-hidden"
            title="Sign In / Register Account"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <LogIn className="w-3.5 h-3.5 text-slate-300 group-hover:text-white transition-colors" />
            <span>Login</span>
          </Link>

          {/* User Profile Avatar (opens profile pop-up) */}
          <button
            type="button"
            onClick={() => setProfileModalOpen(true)}
            className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-serif text-sm font-semibold hover:bg-black hover:scale-105 transition-all shadow-sm ring-2 ring-slate-200"
            title={`Logged in as ${profile.name || "User"}`}
          >
            {profile.name ? profile.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Centered Content (Claude / Gemini Frontier Model Style) */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8">
        <FrontierHero onSelectSuggestion={handleSelectSuggestion} />
        <FrontierPromptBox value={prompt} onChange={setPrompt} />
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-4 text-center text-xs text-slate-400 font-mono flex items-center justify-between border-t border-slate-200/60">
        <span>SatQuery AI • Autonomous Geospatial Vision-Language Architecture</span>
        <div className="flex items-center gap-4 text-slate-500">
          <Link href="/analysis/c_sundarbans_demo" className="hover:underline hover:text-slate-900">
            Default Demo Workspace &rarr;
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