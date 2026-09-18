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

interface ProfileMenuProps {
  popoverPlacement?: "top" | "bottom";
  fitContainer?: boolean;
}

export function ProfileMenu({ popoverPlacement = "bottom", fitContainer = false }: ProfileMenuProps) {
  const { user, signOut, deleteAccount } = useAuth();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!user) return null;

  const email = user.email ?? "No email available";
  const name = user.user_metadata?.display_name || email.split("@")[0];
  const initials = name
    .split(/\s+/)
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleDeleteAccount = async () => {
    if (deleting || !window.confirm("Delete your account and all saved analyses? This cannot be undone.")) return;
    setDeleting(true);
    const result = await deleteAccount();
    if (result.error) {
      setDeleting(false);
      window.alert(result.error.message);
    }
  };

  return (
    <div className={fitContainer ? "relative w-full" : "relative"}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`glass-pill flex items-center gap-2 rounded-full px-2 py-1.5 text-xs text-secondary hover:text-primary ${fitContainer ? "w-full justify-start" : ""}`}
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
        <div className={`absolute z-40 ${fitContainer ? "left-0 right-auto w-full" : "right-0 w-72"} max-w-[calc(100vw-2rem)] rounded-xl border border-stone-300/70 bg-[#FAF6F0] p-4 shadow-xl dark:border-white/10 dark:bg-[#171512] ${popoverPlacement === "top" ? "bottom-full mb-2" : "top-11"}`}>
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
          <button
            type="button"
            onClick={() => void handleDeleteAccount()}
            disabled={deleting}
            className="mt-2 flex w-full items-center justify-center rounded-lg px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-500/10 disabled:opacity-50 dark:text-rose-300"
          >
            {deleting ? "Deleting account..." : "Delete account"}
          </button>
        </div>
      )}
    </div>
  );
}
