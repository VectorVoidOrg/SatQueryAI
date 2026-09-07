"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/store/useSessionStore";
import { X, MessageSquare, Trash2, Plus, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export const HistorySidebar: React.FC = () => {
  const router = useRouter();
  const { sessions, isHistorySidebarOpen, setHistorySidebarOpen, deleteSession } = useSessionStore();

  if (!isHistorySidebarOpen) return null;

  const sessionList = Object.values(sessions).sort((a, b) => b.updatedAt - a.updatedAt);

  const handleSelectSession = (id: string) => {
    setHistorySidebarOpen(false);
    router.push(`/chat/${id}`);
  };

  const handleNewAnalysis = () => {
    setHistorySidebarOpen(false);
    router.push("/");
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs transition-opacity animate-fade-in-up">
      {/* Sidebar Panel */}
      <div className="liquid-glass w-full max-w-sm h-full bg-white/95 border-l border-slate-200/90 shadow-2xl p-6 flex flex-col text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-700" />
            <h2 className="font-serif text-lg text-slate-900 font-semibold tracking-wide">
              Conversation History
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setHistorySidebarOpen(false)}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Analysis Button */}
        <div className="py-4">
          <Button
            variant="default"
            size="sm"
            onClick={handleNewAnalysis}
            className="w-full h-10 rounded-full bg-slate-900 text-white hover:bg-black flex items-center justify-center gap-2 shadow-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>New Analysis</span>
          </Button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {sessionList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400 space-y-2">
              <MessageSquare className="w-8 h-8 opacity-40" />
              <p className="text-xs">No previous analysis sessions yet</p>
            </div>
          ) : (
            sessionList.map((s) => (
              <div
                key={s.id}
                onClick={() => handleSelectSession(s.id)}
                className="liquid-glass group relative flex flex-col gap-1 p-3.5 rounded-2xl border border-slate-200/70 hover:border-slate-300 hover:bg-white bg-slate-50/60 cursor-pointer transition-all shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-xs text-slate-900 line-clamp-1 group-hover:text-accent transition-colors">
                    {s.title}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(s.id);
                    }}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span>
                    {new Date(s.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })} •{" "}
                    {new Date(s.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {s.attachedFileName && (
                    <span className="truncate max-w-[110px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {s.attachedFileName}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 text-center font-mono">
          SatQuery AI • Earth Observation Assistant
        </div>
      </div>
    </div>
  );
};
