"use client";

import { useState } from "react";
import { ChevronRight, Globe, LogOut, MessageSquarePlus, Search } from "lucide-react";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { ProfileMenu } from "@/components/auth/ProfileMenu";
import { RecentAnalyses } from "@/components/history/RecentAnalyses";
import { useAuth } from "@/components/auth/AuthProvider";

interface SideNavbarProps {
  refreshKey: number;
  onNewChat: () => void;
  onCollapsedChange: (collapsed: boolean) => void;
  initialCollapsed?: boolean;
}

export function SideNavbar({ refreshKey, onNewChat, onCollapsedChange, initialCollapsed = false }: SideNavbarProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [searchRequest, setSearchRequest] = useState(0);
  const { signOut } = useAuth();

  const collapse = () => {
    setCollapsed(true);
    onCollapsedChange(true);
  };

  const expand = () => {
    setCollapsed(false);
    onCollapsedChange(false);
  };

  if (collapsed) {
    return (
      <button type="button" onClick={expand} className="fixed left-3 top-4 z-50 rounded-full border border-stone-300/70 bg-[#F3E5D0]/90 p-2.5 text-secondary shadow-subtle backdrop-blur-xl transition hover:text-primary dark:border-white/10 dark:bg-[#171512]/95" aria-label="Open navigation" title="Open navigation">
        <ChevronRight className="h-4 w-4" />
      </button>
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-stone-300/50 bg-[#F3E5D0]/90 p-3 shadow-[8px_0_30px_rgba(78,59,42,0.06)] backdrop-blur-2xl animate-navbar-reveal dark:border-white/10 dark:bg-[#171512]/95">
      <div className="flex items-center justify-between px-1">
        <div className="flex min-w-0 items-center gap-1.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1C1917] text-white"><Globe className="h-4 w-4" /></span><span className="shrink-0 font-serif text-xl text-primary">SatQuery <em className="text-accent">AI</em></span></div>
        <button type="button" onClick={collapse} className="rounded-lg p-2 text-secondary transition hover:bg-black/5 hover:text-primary dark:hover:bg-white/5" aria-label="Close navigation" title="Close navigation"><ChevronRight className="h-4 w-4 rotate-180" /></button>
      </div>

      <div className="mt-8 space-y-2">
        <button type="button" onClick={onNewChat} className="flex w-full items-center gap-3 rounded-xl bg-[#1C1917] px-3 py-2.5 text-sm font-medium text-white shadow-subtle transition hover:bg-[#342D27]"><MessageSquarePlus className="h-4 w-4" />New Query</button>
        <button type="button" onClick={() => setSearchRequest((value) => value + 1)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-secondary transition hover:bg-black/5 hover:text-primary dark:hover:bg-white/5"><Search className="h-4 w-4" />Search Query</button>
      </div>

      <div className="mt-8 min-h-0 flex-1"><RecentAnalyses refreshKey={refreshKey} embedded searchRequest={searchRequest} /></div>

      <div className="mt-4 flex min-w-0 items-center justify-between gap-2 border-t border-stone-300/50 pt-3 dark:border-white/10">
        <div className="min-w-0 flex-1"><ProfileMenu popoverPlacement="top" fitContainer /></div>
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle popoverPlacement="top" tooltipPlacement="top" />
          <button type="button" onClick={() => void signOut()} className="rounded-lg p-2 text-secondary transition hover:bg-rose-500/10 hover:text-rose-600" title="Sign out" aria-label="Sign out"><LogOut className="h-4 w-4" /></button>
        </div>
      </div>
    </aside>
  );
}
