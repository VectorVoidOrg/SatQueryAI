"use client";

import { useState } from "react";
import { CalendarDays, LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

function formatJoinDate(value: string | undefined) {
  if (!value) return "Unavailable";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function ProfileMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const email = user.email ?? "No email available";
  const name = user.user_metadata?.display_name || email.split("@")[0];
  const initials = name
    .split(/\s+/)
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="glass-pill flex items-center gap-2 rounded-full px-2 py-1.5 text-xs text-secondary hover:text-primary"
        title="Open profile"
        aria-label="Open profile"
        aria-expanded={open}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1C1917] text-[10px] font-semibold text-white dark:bg-[#342D27]">
          {initials || <UserRound className="h-3.5 w-3.5" />}
        </span>
        <span className="hidden max-w-[120px] truncate sm:inline">{name}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-40 w-72 rounded-xl border border-stone-300/70 bg-[#FAF6F0] p-4 shadow-xl dark:border-white/10 dark:bg-[#171512]">
          <div className="flex items-center gap-3 border-b border-stone-200 pb-3 dark:border-white/10">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1C1917] text-sm font-semibold text-white dark:bg-[#342D27]">
              {initials || <UserRound className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-primary">{name}</p>
              <p className="truncate text-xs text-secondary">{email}</p>
            </div>
          </div>

          <div className="space-y-3 py-3">
            <div className="flex items-center gap-2 text-xs">
              <UserRound className="h-3.5 w-3.5 text-accent" />
              <span className="text-secondary">Email</span>
              <span className="ml-auto max-w-[155px] truncate text-primary" title={email}>{email}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <CalendarDays className="h-3.5 w-3.5 text-accent" />
              <span className="text-secondary">Joined</span>
              <span className="ml-auto text-primary">{formatJoinDate(user.created_at)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-stone-300/80 px-3 py-2 text-xs font-medium text-secondary transition hover:border-rose-300 hover:text-rose-600 dark:border-white/10 dark:hover:border-rose-400/40 dark:hover:text-rose-300"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
