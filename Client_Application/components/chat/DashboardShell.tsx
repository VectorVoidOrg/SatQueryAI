"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useAssetStore } from "@/store/useAssetStore";
import { useChatStore } from "@/store/useChatStore";
import { useSessionStore } from "@/store/useSessionStore";
import { useProfileStore } from "@/store/useProfileStore";
import { MapCanvasLoader } from "@/components/map/MapCanvasLoader";
import { CommandCenterPanel } from "@/components/command-center/CommandCenterPanel";
import { ExportReportButton } from "@/components/export/ExportReportButton";
import { HistorySidebar } from "@/components/history/HistorySidebar";
import { ProfileModal } from "@/components/auth/ProfileModal";
import {
  Globe,
  ShieldCheck,
  Activity,
  Terminal,
  Radio,
  ArrowLeft,
  History,
  User,
  Plus,
} from "lucide-react";

interface DashboardShellProps {
  sessionId?: string;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({ sessionId: propSessionId }) => {
  const { assetName } = useAssetStore();
  const { sessionId: currentSessionId } = useChatStore();
  const { getSession, setActiveSessionId, setHistorySidebarOpen } = useSessionStore();
  const { profile, setProfileModalOpen } = useProfileStore();

  const displaySessionId = propSessionId || currentSessionId;

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
      }
    }
  }, [propSessionId, getSession, setActiveSessionId]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#FAF6F0] text-[#1C1917] selection:bg-accent/20 selection:text-primary">
      {/* Warm Still-life photo background softly diffused behind frosted glass */}
      <div
        className="fixed inset-0 pointer-events-none bg-cover bg-center bg-no-repeat opacity-30 scale-[1.02]"
        style={{ backgroundImage: "url('/images/warm-bg.png')" }}
      />
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-br from-[#FAF6F0]/85 via-[#F3E5D0]/80 to-[#EADCC9]/85 backdrop-blur-[24px]" />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,_rgba(200,109,59,0.06)_0%,_transparent_75%)]" />

      {/* History Drawer and Profile Modal */}
      <HistorySidebar />
      <ProfileModal />

      {/* Top Navbar — Milky Glass Pill */}
      <header className="relative z-30 px-4 sm:px-6 py-3 shrink-0 flex items-center justify-between animate-navbar-reveal">
        <div className="glass-pill rounded-full w-full px-3.5 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-3">
          {/* Left: Back to Home + Logo */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <Link
              href="/"
              className="apple-interactive flex items-center gap-1.5 text-xs text-secondary hover:text-primary font-medium px-2.5 py-1 rounded-full hover:bg-black/[0.04] transition-all duration-200 ease-apple"
              title="Return to Home Prompt"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Home</span>
            </Link>

            <div className="h-4 w-px bg-stone-300/60" />

            {/* Logo */}
            <div className="flex items-center gap-2">
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

            <div className="h-4 w-px bg-stone-300/60 hidden sm:block" />

            {/* SIH Tag & Active AOI */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase text-secondary/60 tracking-widest font-semibold">
                SIH 26167
              </span>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sand-100/80 border border-stone-300/60 text-xs text-primary shadow-xs">
                <Activity className="w-3.5 h-3.5 text-accent" />
                <span className="text-secondary/70 text-[11px]">AOI:</span>
                <span className="font-mono font-semibold text-primary text-[11px]">{assetName}</span>
              </div>
            </div>
          </div>

          {/* Center (hidden on small screens): Instrument Telemetry */}
          <div className="hidden xl:flex items-center gap-5 text-xs text-secondary tracking-wider font-normal">
            <span className="flex items-center gap-1.5 hover:text-primary transition-colors">
              <Radio className="w-3 h-3 text-accent" />
              <span>MULTISPECTRAL + SAR</span>
            </span>
            <span className="text-stone-300">•</span>
            <span className="hover:text-primary transition-colors">EPSG:4326</span>
            <span className="text-stone-300">•</span>
            <span className="hover:text-primary transition-colors">VLM REASONING</span>
          </div>

          {/* Right Actions: Session Pill + History Drawer + Profile Avatar + Export */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* New Analysis Button */}
            <Link
              href="/"
              className="apple-interactive hidden lg:flex items-center gap-1.5 text-xs text-secondary hover:text-primary px-3 py-1 rounded-full border border-stone-300/60 hover:bg-white/60 transition-all duration-200 ease-apple hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <Plus className="w-3 h-3 text-secondary" />
              <span>New</span>
            </Link>

            {/* History Sidebar Button */}
            <button
              onClick={() => setHistorySidebarOpen(true)}
              className="apple-interactive flex items-center gap-1.5 text-xs text-secondary hover:text-primary px-3 py-1 rounded-full border border-stone-300/60 hover:bg-white/60 transition-all duration-200 ease-apple hover:-translate-y-0.5 active:scale-[0.98]"
              title="View past conversation history"
            >
              <History className="w-3.5 h-3.5 text-secondary" />
              <span className="hidden sm:inline">History</span>
            </button>

            {/* Session Pill */}
            <div className="hidden md:flex items-center gap-1.5 text-[10px] font-mono text-secondary px-3 py-1 rounded-full bg-sand-100/80 border border-stone-300/60">
              <Terminal className="w-3 h-3 text-secondary/60" />
              <span>SESS:</span>
              <span className="text-primary font-semibold">{displaySessionId.slice(0, 10)}</span>
            </div>

            {/* Calibrated Status */}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-emerald-800 font-medium px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[10px] tracking-wider uppercase font-semibold">Calibrated</span>
            </div>

            {/* Export Report Action */}
            <ExportReportButton />

            {/* User Profile Avatar Button */}
            <button
              onClick={() => setProfileModalOpen(true)}
              className="apple-interactive flex items-center gap-2 p-0.5 rounded-full hover:bg-black/5 transition-all duration-200 ease-apple hover:-translate-y-0.5 active:scale-[0.98]"
              title="Account settings"
              aria-label="User profile settings"
            >
              <div className="w-7 h-7 rounded-full bg-[#1C1917] text-white font-serif text-xs flex items-center justify-center font-bold shadow-xs ring-2 ring-black/5">
                {profile.name ? profile.name.charAt(0).toUpperCase() : "U"}
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Main Split Content: 60vw Geospatial Viewer / 40vw AI Command Center */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row min-h-0 px-3 sm:px-4 pb-3 sm:pb-4 gap-3 overflow-hidden">
        {/* Left: Geospatial Viewer (60vw desktop / 55vh tablet/mobile) */}
        <section
          aria-label="Geospatial Map Viewer"
          className="w-full lg:w-[60vw] h-[55vh] lg:h-full relative rounded-3xl overflow-hidden glass-card border border-white/80 shadow-2xl bg-[#EFE8DE] animate-map-reveal"
        >
          <MapCanvasLoader />
        </section>

        {/* Right: AI Command Center (40vw desktop / 45vh tablet/mobile) */}
        <section
          aria-label="AI Command Center"
          className="w-full lg:w-[40vw] h-[45vh] lg:h-full relative rounded-3xl overflow-hidden glass-card border border-white/80 shadow-2xl bg-white/60 flex flex-col animate-panel-reveal"
        >
          <CommandCenterPanel />
        </section>
      </main>
    </div>
  );
};
