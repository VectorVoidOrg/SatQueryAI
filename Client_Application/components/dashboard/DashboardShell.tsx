"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAssetStore } from "@/store/useAssetStore";
import { useChatStore } from "@/store/useChatStore";
import { useSessionStore } from "@/store/useSessionStore";
import { useProfileStore } from "@/store/useProfileStore";
import { MapCanvasLoader } from "@/components/map/MapCanvasLoader";
import { CommandCenterPanel } from "@/components/command-center/CommandCenterPanel";
import { ExportReportButton } from "@/components/export/ExportReportButton";
import { HistorySidebar } from "@/components/history/HistorySidebar";
import { ProfileModal } from "@/components/profile/ProfileModal";
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
  const router = useRouter();
  const { assetName } = useAssetStore();
  const { sessionId: currentSessionId } = useChatStore();
  const { getSession, setActiveSessionId, setHistorySidebarOpen } = useSessionStore();
  const { profile, isAuthenticated, setProfileModalOpen } = useProfileStore();

  const displaySessionId = propSessionId || currentSessionId;

  useEffect(() => {
    if (isAuthenticated) return;

    const anonymousSessionId = localStorage.getItem("satquery_anonymous_session_id");
    if (anonymousSessionId !== propSessionId) {
      router.replace(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [isAuthenticated, propSessionId, router]);

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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-base text-primary selection:bg-slate-200">
      {/* Ambient soft glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_rgba(15,23,42,0.02)_0%,_transparent_70%)]" />

      {/* History Drawer and Profile Modal */}
      <HistorySidebar />
      <ProfileModal />

      {/* Top Navbar — Light Liquid Glass Pill */}
      <header className="relative z-30 px-4 sm:px-6 py-3 shrink-0 flex items-center justify-between">
        <div className="liquid-glass rounded-full w-full px-4 sm:px-5 py-2.5 flex items-center justify-between gap-3 shadow-glass">
          {/* Left: Back to Home + Logo */}
          <div className="flex items-center gap-3">
            <Link
              href={isAuthenticated ? "/" : "/login?returnTo=/"}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium px-2.5 py-1 rounded-full hover:bg-slate-100 transition-colors"
              title="Return to Home Prompt"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Home</span>
            </Link>

            <div className="h-4 w-px bg-slate-300/80" />

            {/* Logo */}
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-slate-800 animate-pulse" style={{ animationDuration: "8s" }} />
              <div className="flex items-baseline gap-1.5">
                <span className="font-serif text-xl tracking-wide text-slate-900 font-medium">
                  SatQuery
                </span>
                <em className="font-serif italic text-lg text-slate-500">
                  AI
                </em>
              </div>
            </div>

            <div className="h-4 w-px bg-slate-300/80 hidden sm:block" />

            {/* SIH Tag & Active AOI */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase text-slate-400 tracking-widest font-semibold">
                SIH 26167
              </span>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/90 border border-slate-200 text-xs text-slate-700">
                <Activity className="w-3.5 h-3.5 text-accent" />
                <span className="text-slate-400 text-[11px]">AOI:</span>
                <span className="font-mono font-semibold text-slate-900 text-[11px]">{assetName}</span>
              </div>
            </div>
          </div>

          {/* Center (hidden on small screens): Instrument Telemetry */}
          <div className="hidden xl:flex items-center gap-6 text-xs text-slate-500 tracking-wider">
            <span className="flex items-center gap-1.5 hover:text-slate-900 transition-colors">
              <Radio className="w-3 h-3 text-accent" />
              <span>MULTISPECTRAL + SAR</span>
            </span>
            <span>•</span>
            <span className="hover:text-slate-900 transition-colors">EPSG:4326</span>
            <span>•</span>
            <span className="hover:text-slate-900 transition-colors">VLM REASONING</span>
          </div>

          {/* Right Actions: Session Pill + History Drawer + Profile Avatar + Export */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* New Analysis Button */}
            <Link
              href="/"
              className="hidden lg:flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-full border border-slate-200 hover:border-slate-300 bg-white/60 transition-colors"
            >
              <Plus className="w-3 h-3 text-slate-500" />
              <span>New</span>
            </Link>

            {/* History Sidebar Button */}
            <button
              onClick={() => setHistorySidebarOpen(true)}
              className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 px-3 py-1 rounded-full border border-slate-200 hover:border-slate-300 bg-white/60 transition-colors"
              title="View past conversation history"
            >
              <History className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">History</span>
            </button>

            {/* Session Pill */}
            <div className="hidden md:flex items-center gap-1.5 text-[10px] font-mono text-slate-500 px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
              <Terminal className="w-3 h-3 text-slate-400" />
              <span>SESS:</span>
              <span className="text-slate-800 font-semibold">{displaySessionId.slice(0, 10)}</span>
            </div>

            {/* Calibrated Status */}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[10px] tracking-wider uppercase font-semibold">Calibrated</span>
            </div>

            {/* Export Report Action */}
            <ExportReportButton />

            {/* User Profile Avatar Button */}
            <button
              onClick={() => setProfileModalOpen(true)}
              className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 ml-1"
              title="Account settings"
              aria-label="User profile settings"
            >
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-serif italic text-xs flex items-center justify-center font-bold shadow-sm">
                {profile.name ? profile.name.charAt(0).toUpperCase() : "U"}
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Main Split Content: 60vw Geospatial Viewer / 40vw AI Command Center */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row min-h-0 px-4 pb-4 gap-3 overflow-hidden">
        {/* Left: Geospatial Viewer (60vw desktop / 55vh tablet/mobile) */}
        <section
          aria-label="Geospatial Map Viewer"
          className="w-full lg:w-[60vw] h-[55vh] lg:h-full relative rounded-3xl overflow-hidden liquid-glass border border-slate-200/80 shadow-glass bg-slate-100"
        >
          <MapCanvasLoader />
        </section>

        {/* Right: AI Command Center (40vw desktop / 45vh tablet/mobile) */}
        <section
          aria-label="AI Command Center"
          className="w-full lg:w-[40vw] h-[45vh] lg:h-full relative rounded-3xl overflow-hidden liquid-glass border border-slate-200/80 shadow-glass bg-white/80 flex flex-col"
        >
          <CommandCenterPanel />
        </section>
      </main>
    </div>
  );
};

