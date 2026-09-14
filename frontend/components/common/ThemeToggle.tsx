"use client";

import React, { useState, useRef, useEffect } from "react";
import { useThemeStore, ThemeMode } from "@/store/useThemeStore";
import { Sun, Moon, Laptop, Check } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";

export const ThemeToggle: React.FC = () => {
  const { theme, resolvedTheme, setTheme, initTheme } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    initTheme();
    setMounted(true);
  }, [initTheme]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
    {
      mode: "light",
      label: "Light",
      icon: <Sun className="w-3.5 h-3.5 text-accent" />,
    },
    {
      mode: "dark",
      label: "Dark",
      icon: <Moon className="w-3.5 h-3.5 text-accent" />,
    },
    {
      mode: "system",
      label: "System",
      icon: <Laptop className="w-3.5 h-3.5 text-secondary dark:text-[#B8AEA3]" />,
    },
  ];

  const renderIcon = () => {
    if (!mounted) {
      // Deterministic SVG icon matching initial server HTML to eliminate hydration errors
      return <Sun className="w-3.5 h-3.5 text-accent" />;
    }
    if (theme === "system") {
      return resolvedTheme === "dark" ? (
        <Moon className="w-3.5 h-3.5 text-accent" />
      ) : (
        <Sun className="w-3.5 h-3.5 text-accent" />
      );
    }
    return theme === "dark" ? (
      <Moon className="w-3.5 h-3.5 text-accent" />
    ) : (
      <Sun className="w-3.5 h-3.5 text-accent" />
    );
  };

  return (
    <div ref={containerRef} className="relative shrink-0">
      <Tooltip side="bottom" align="end" content={mounted ? `Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)}` : "Theme"}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="apple-interactive glass-pill w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:text-primary dark:text-[#B8AEA3] dark:hover:text-[#F3EEE7] hover:bg-white/70 dark:hover:bg-white/10 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
          aria-label="Toggle theme options"
          aria-expanded={isOpen}
        >
          {renderIcon()}
        </button>
      </Tooltip>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-36 max-w-[calc(100vw-2rem)] glass-card rounded-2xl p-1.5 shadow-[0_16px_36px_rgba(78,59,42,0.18)] dark:shadow-[0_16px_36px_rgba(0,0,0,0.6)] border border-white/70 dark:border-white/10 dark:bg-[#1F1B17]/95 animate-fade-in-up space-y-0.5">
          {options.map((opt) => {
            const isSelected = theme === opt.mode;
            return (
              <button
                key={opt.mode}
                type="button"
                onClick={() => {
                  setTheme(opt.mode);
                  setIsOpen(false);
                }}
                className={`apple-interactive w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all duration-150 ${
                  isSelected
                    ? "bg-[#C86D3B]/15 text-[#7F4B30] dark:text-[#F3EEE7] font-semibold border border-accent/25"
                    : "text-secondary dark:text-[#B8AEA3] hover:text-primary dark:hover:text-[#F3EEE7] hover:bg-black/5 dark:hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-2">
                  {opt.icon}
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check className="w-3 h-3 text-accent stroke-[2.5]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
