"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { clsx } from "clsx";

export interface SelectItemOption {
  label: string;
  value: string | null;
}

interface SelectContextValue {
  items: SelectItemOption[];
  value: string | null;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = createContext<SelectContextValue | null>(null);

function useSelect() {
  const context = useContext(SelectContext);
  if (!context) throw new Error("Select components must be used inside Select");
  return context;
}

export function Select({ items, value = null, onValueChange, children }: { items: SelectItemOption[]; value?: string | null; onValueChange?: (value: string) => void; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <SelectContext.Provider value={{ items, value, onValueChange, open, setOpen }}>{children}</SelectContext.Provider>;
}

export function SelectTrigger({ className, children }: { className?: string; children?: ReactNode }) {
  const { open, setOpen } = useSelect();
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!triggerRef.current?.parentElement?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open, setOpen]);

  return <button ref={triggerRef} type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)} className={clsx("flex h-9 items-center justify-between gap-3 rounded-lg border border-stone-300/70 bg-white/70 px-3 text-xs font-medium text-primary shadow-sm outline-none transition hover:border-accent/60 focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-white/10 dark:bg-[#171512]", className)}>{children}<ChevronDown className={clsx("h-3.5 w-3.5 shrink-0 text-secondary transition-transform", open && "rotate-180")} /></button>;
}

export function SelectValue({ placeholder = "Select an option" }: { placeholder?: string }) {
  const { items, value } = useSelect();
  return <span className="truncate">{items.find((item) => item.value === value)?.label ?? placeholder}</span>;
}

export function SelectContent({ children }: { children: ReactNode }) {
  const { open } = useSelect();
  if (!open) return null;
  return <div className="select-menu-swish absolute left-0 top-[calc(100%+0.35rem)] z-50 min-w-full overflow-hidden rounded-xl border border-stone-300/80 bg-[#FAF6F0] p-1.5 shadow-xl dark:border-white/10 dark:bg-[#1C1917]" role="listbox">{children}</div>;
}

export function SelectGroup({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

export function SelectLabel({ children }: { children: ReactNode }) {
  return <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wide text-secondary">{children}</div>;
}

export function SelectItem({ value, children }: { value: string | null; children: ReactNode }) {
  const { value: selectedValue, onValueChange, setOpen } = useSelect();
  if (value === null) return null;
  return <button type="button" role="option" aria-selected={selectedValue === value} onClick={() => { onValueChange?.(value); setOpen(false); }} className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-xs text-primary transition hover:bg-accent/10 aria-selected:bg-accent/10"><span>{children}</span>{selectedValue === value && <Check className="h-3.5 w-3.5 text-accent" />}</button>;
}