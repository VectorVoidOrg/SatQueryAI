"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/store/useSessionStore";
import { X, MessageSquare, Trash2, Plus, Clock } from "lucide-react";

export const HistorySidebar: React.FC = () => {
  const router = useRouter();
  const { sessions, isHistorySidebarOpen, setHistorySidebarOpen, deleteSession } = useSessionStore();

  if (!isHistorySidebarOpen) return null;

  const sessionList = Object.values(sessions).sort((a, b) => b.updatedAt - a.updatedAt);

  const handleSelectSession = (id: string) => {
    setHistorySidebarOpen(false);
    router.push(`/analysis/${id}`);
  };

  const handleNewAnalysis = () => {
    setHistorySidebarOpen(false);
    router.push("/");
  };

  return (
    <div
      onClick={() => setHistorySidebarOpen(false)}
      className="fixed inset-0 z-50 flex justify-end bg-black/25 backdrop-blur-[6px] animate-backdrop-fade-in"
    >
      {/* Sidebar Panel with premium satin frosted glass & Apple slide-in */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm sm:max-w-md h-full flex flex-col text-primary animate-drawer-slide-in relative bg-[#FAF6F0]/95 dark:bg-[#0F0E0C]/98 backdrop-blur-[36px] saturate-[190%] border-l border-white/80 dark:border-white/10 shadow-[-24px_0_60px_rgba(78,59,42,0.14)] dark:shadow-[-24px_0_60px_rgba(0,0,0,0.6)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-200/60 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#C86D3B]/10 text-accent flex items-center justify-center border border-[#C86D3B]/25 shadow-xs">
              <Clock className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h2 className="font-serif text-lg text-primary font-medium tracking-wide">
                Conversation History
              </h2>
              <p className="text-[11px] text-secondary/70 dark:text-[#91877D] font-mono">
                {sessionList.length} recorded session{sessionList.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setHistorySidebarOpen(false)}
            className="w-8 h-8 rounded-full bg-stone-200/60 dark:bg-white/10 hover:bg-stone-300/70 dark:hover:bg-white/20 text-secondary hover:text-primary dark:hover:text-white flex items-center justify-center transition-all duration-200 ease-apple"
            title="Close history"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Analysis Button */}
        <div className="px-6 py-4 border-b border-stone-200/40 dark:border-white/10">
          <button
            type="button"
            onClick={handleNewAnalysis}
            className="apple-interactive w-full py-2.5 px-4 rounded-xl bg-[#7F4B30] hover:bg-[#965A3B] text-white text-xs font-medium shadow-[0_4px_14px_rgba(127,75,48,0.22),inset_0_1px_1px_rgba(255,255,255,0.4)] transition-all duration-200 ease-apple hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Start New Analysis</span>
          </button>
        </div>

        {/* Sessions List — Tactile Luxury Glass Cards */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
          {sessionList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-secondary/50 space-y-2">
              <MessageSquare className="w-8 h-8 opacity-40 text-secondary" />
              <p className="text-xs">No previous analysis sessions yet</p>
            </div>
          ) : (
            sessionList.map((s) => (
              <div
                key={s.id}
                onClick={() => handleSelectSession(s.id)}
                className="apple-interactive group relative rounded-xl p-3.5 bg-white/70 dark:bg-[#171512] hover:bg-white/95 dark:hover:bg-[#1F1B17] border border-stone-200/70 dark:border-white/10 hover:border-[#C86D3B]/50 shadow-[0_2px_8px_rgba(78,59,42,0.03),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_20px_rgba(78,59,42,0.08)] dark:hover:shadow-[0_8px_20px_rgba(0,0,0,0.5)] transition-all duration-200 ease-apple cursor-pointer flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-xs text-primary line-clamp-2 leading-snug group-hover:text-[#7F4B30] dark:group-hover:text-accent transition-colors">
                    {s.title}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(s.id);
                    }}
                    className="text-secondary/40 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-150 shrink-0"
                    title="Delete session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-secondary/70 dark:text-[#91877D] font-mono pt-1 border-t border-stone-100 dark:border-white/5">
                  <span>
                    {new Date(s.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })} •{" "}
                    {new Date(s.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {s.attachedFileName && (
                    <span className="truncate max-w-[120px] text-secondary font-medium bg-[#FAF6F0] dark:bg-[#1F1B17] border border-stone-200/80 dark:border-white/10 px-2 py-0.5 rounded-full dark:text-[#B8AEA3]">
                      {s.attachedFileName}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-200/50 dark:border-white/10 text-[10px] text-secondary/60 dark:text-[#91877D] text-center font-mono tracking-wider uppercase bg-white/20 dark:bg-white/5">
          SatQuery AI • Earth Observation Assistant
        </div>
      </div>
    </div>
  );
};
