"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAssetStore } from "@/store/useAssetStore";
import { useChatStore } from "@/store/useChatStore";
import { useSessionStore } from "@/store/useSessionStore";
import { useProfileStore } from "@/store/useProfileStore";
import { MapCanvasLoader } from "@/components/map/MapCanvasLoader";
import { CommandCenterPanel } from "@/components/command-center/CommandCenterPanel";
import { ExportReportButton } from "@/components/export/ExportReportButton";
import { HistorySidebar } from "@/components/history/HistorySidebar";
import { ProfileModal } from "@/components/profile/ProfileModal";
import { EnvironmentStatusBadge } from "@/components/common/EnvironmentStatusBadge";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { FullScreenAnalysisLoader } from "@/components/loading/FullScreenAnalysisLoader";
import { isSpatialResponse } from "@/lib/adapters/satelliteAnalysisAdapter";
import {
  Globe,
  ShieldCheck,
  Activity,
  Terminal,
  ArrowLeft,
  History,
  User,
  Plus,
} from "lucide-react";

interface DashboardShellProps {
  sessionId?: string;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({ sessionId: propSessionId }) => {
  const { assetName, requiresSpatialView, setRequiresSpatialView } = useAssetStore();
  const { sessionId: currentSessionId, isSending, isAnalyzing, messages } = useChatStore();
  const { getSession, setActiveSessionId, setHistorySidebarOpen } = useSessionStore();
  const { profile, initProfile, setProfileModalOpen } = useProfileStore();

  useEffect(() => {
    initProfile();
  }, [initProfile]);

  const displaySessionId = propSessionId || currentSessionId;

  // Active step index for controlled multi-step loader during in-flight analysis
  const pendingMessage = messages.find((m) => m.status === "pending");
  const activeStepIndex = pendingMessage?.activeStepIndex;

  // Hydrate session data if propSessionId is provided
  useEffect(() => {
    if (propSessionId) {
      const sess = getSession(propSessionId);
      if (sess) {
        setActiveSessionId(propSessionId);
        useChatStore.getState().setSessionId(sess.id);
        useChatStore.getState().setMessages(sess.messages);
        if (sess.asset) {
          useAssetStore.getState().setAsset({
            assetId: sess.asset.assetId,
            assetName: sess.asset.assetName,
            bbox: sess.asset.bbox,
            sources: sess.asset.sources,
          });
        }
        if (sess.evidence) {
          useAssetStore.getState().setEvidence(sess.evidence);
        }
        if (sess.latestAudit) {
          useChatStore.getState().setAuditRecord(sess.latestAudit.query, sess.latestAudit.audit);
        }
        const isSpatial = isSpatialResponse({
          evidence: sess.evidence,
          requiresMap: sess.requiresMap,
        });
        setRequiresSpatialView(isSpatial);
      }
    }
  }, [propSessionId, getSession, setActiveSessionId, setRequiresSpatialView]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#FAF6F0] dark:bg-[#0F0E0C] text-primary selection:bg-accent/20 selection:text-primary transition-colors duration-300">
      {/* Warm Still-life photo background softly diffused behind frosted glass - hidden in dark mode */}
      <div
        className="fixed inset-0 pointer-events-none bg-cover bg-center bg-no-repeat opacity-30 dark:hidden scale-[1.02]"
        style={{ backgroundImage: "url('/images/warm-bg.png')" }}
      />
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-br from-[#FAF6F0]/85 via-[#F3E5D0]/80 to-[#EADCC9]/85 dark:hidden backdrop-blur-[24px]" />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,_rgba(200,109,59,0.06)_0%,_transparent_75%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,_rgba(200,109,59,0.05)_0%,_transparent_75%)]" />

      {/* History Drawer and Profile Modal */}
      <HistorySidebar />
      <ProfileModal />

      {/* Top Navbar — Milky Glass Pill */}
      <header className="relative z-30 px-4 sm:px-6 py-3 shrink-0 flex items-center justify-between overflow-hidden animate-navbar-reveal">
        <div className="glass-pill rounded-full w-full min-w-0 overflow-hidden px-3.5 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-3">
          {/* Left: Back to Home + Logo */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink">
            <Link
              href="/"
              className="apple-interactive flex items-center gap-1.5 text-xs text-secondary hover:text-primary dark:hover:text-white font-medium px-2.5 py-1 rounded-full hover:bg-black/[0.04] dark:hover:bg-white/10 transition-all duration-200 ease-apple"
              title="Return to Home Prompt"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Home</span>
            </Link>

            <div className="h-4 w-px bg-stone-300/60 dark:bg-white/10" />

            {/* Logo */}
            <div className="flex items-center gap-2 shrink-0">
              <Globe className="w-5 h-5 text-accent animate-pulse" style={{ animationDuration: "8s" }} />
              <div className="flex items-baseline gap-1.5">
                <span className="font-serif text-xl tracking-wide text-primary font-medium">
                  SatQuery
                </span>
                <em className="font-serif italic text-lg text-accent">
                  AI
                </em>
              </div>
            </div>

            <div className="h-4 w-px bg-stone-300/60 dark:bg-white/10 hidden sm:block" />

            {/* SIH Tag & Active AOI */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase text-secondary/70 tracking-widest font-semibold">
                SIH 26167
              </span>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full glass-inner text-xs text-primary">
                <Activity className="w-3.5 h-3.5 text-accent" />
                <span className="text-secondary text-[11px]">AOI:</span>
                <span className="font-mono font-semibold text-primary text-[11px] truncate max-w-[120px] sm:max-w-[160px]">{assetName}</span>
              </div>
            </div>
          </div>

          {/* Right Actions: Session Pill + History Drawer + Profile Avatar + Export */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink-0">
            {/* New Analysis Button */}
            <Link
              href="/"
              className="apple-interactive hidden lg:flex items-center gap-1.5 text-xs text-primary/90 hover:text-primary px-2.5 py-1 rounded-full glass-inner hover:bg-white/60 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 ease-apple shrink-0"
            >
              <Plus className="w-3 h-3 text-secondary" />
              <span>New</span>
            </Link>

            {/* History Sidebar Button */}
            <button
              onClick={() => setHistorySidebarOpen(true)}
              className="apple-interactive flex items-center gap-1.5 text-xs text-primary/90 hover:text-primary px-3 py-1 rounded-full glass-inner hover:bg-white/60 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 ease-apple shrink-0"
              title="View past conversation history"
            >
              <History className="w-3.5 h-3.5 text-secondary" />
              <span className="hidden sm:inline">History</span>
            </button>

            {/* Session Pill */}
            <div className="hidden xl:flex items-center gap-1.5 text-[10px] font-mono text-secondary px-3 py-1 rounded-full glass-inner shrink-0">
              <Terminal className="w-3 h-3 text-secondary" />
              <span>SESS:</span>
              <span className="text-primary font-semibold">{displaySessionId.slice(0, 10)}</span>
            </div>

            {/* Calibrated Status */}
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium px-3 py-1 rounded-full bg-emerald-500/10 backdrop-blur-md border border-emerald-500/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[10px] tracking-wider uppercase font-semibold">Calibrated</span>
            </div>

            {/* Environment Indicator: Demo / Live */}
            <EnvironmentStatusBadge />

            {/* Export Report Action */}
            <ExportReportButton />

            {/* Theme Toggle Button */}
            <ThemeToggle />

            {/* User Profile Avatar Button */}
            <button
              onClick={() => setProfileModalOpen(true)}
              className="apple-interactive flex items-center gap-2 p-1 rounded-full hover:bg-black/[0.04] dark:hover:bg-white/10 transition-all duration-200 ease-apple border border-transparent hover:border-white/60 dark:hover:border-white/20 ml-0.5 shrink-0"
              title="Account settings"
              aria-label="User profile settings"
            >
              <div className="w-7 h-7 rounded-full bg-[#1C1917] dark:bg-[#1F1B17] text-white font-serif italic text-xs flex items-center justify-center font-bold shadow-xs ring-2 ring-black/5 dark:ring-white/10">
                {profile.name ? profile.name.charAt(0).toUpperCase() : "U"}
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Full-Screen Analysis Loader Overlay: The entire central experience during inference */}
      <FullScreenAnalysisLoader
        isLoading={isSending || isAnalyzing}
        value={activeStepIndex}
      />

      {/* Main Workspace: Dynamic Spatial Split (60vw / 40vw) or Centered Full-Width (max-w-5xl) */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row min-h-0 px-4 pb-4 gap-3 overflow-hidden">
        <AnimatePresence mode="wait">
          {requiresSpatialView && (
            <motion.section
              key="geospatial-map-section"
              aria-label="Geospatial Map Viewer"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="w-full lg:w-[60vw] h-[55vh] lg:h-full relative rounded-3xl overflow-hidden border border-white/60 dark:border-white/10 shadow-[0_20px_45px_-12px_rgba(78,59,42,0.12),inset_0_1.5px_1.5px_rgba(255,255,255,0.9)] dark:shadow-[0_20px_45px_-12px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)] bg-[#EFE8DE] dark:bg-[#0F0E0C]"
            >
              <MapCanvasLoader />
            </motion.section>
          )}
        </AnimatePresence>

        <motion.section
          key={requiresSpatialView ? "command-center-split" : "command-center-full"}
          layout
          aria-label="AI Command Center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className={`h-full relative rounded-3xl overflow-hidden glass-card flex flex-col ${
            requiresSpatialView
              ? "w-full lg:w-[40vw] h-[45vh] lg:h-full"
              : "w-full max-w-5xl mx-auto shadow-[0_20px_45px_-12px_rgba(78,59,42,0.12),inset_0_1.5px_1.5px_rgba(255,255,255,0.9)] dark:shadow-[0_20px_45px_-12px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)]"
          }`}
        >
          <CommandCenterPanel isFullWidth={!requiresSpatialView} />
        </motion.section>
      </main>
    </div>
  );
};

