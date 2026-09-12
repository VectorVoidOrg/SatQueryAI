"use client";

import React from "react";
import { useToastStore, ToastItem } from "@/store/useToastStore";
import { CheckCircle2, Info, AlertTriangle, AlertCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useToastStore();

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 24, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.96, transition: { duration: 0.2 } }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            layout
          >
            <ToastCard toast={toast} onDismiss={() => dismissToast(toast.id)} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

const ToastCard: React.FC<{ toast: ToastItem; onDismiss: () => void }> = ({
  toast,
  onDismiss,
}) => {
  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />;
      case "info":
        return <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case "success":
        return "border-emerald-500/30";
      case "info":
        return "border-accent/30";
      case "warning":
        return "border-amber-500/35";
      case "error":
        return "border-rose-500/35";
    }
  };

  return (
    <div
      className={`pointer-events-auto liquid-glass rounded-2xl p-3.5 shadow-[0_12px_32px_rgba(78,59,42,0.12)] border ${getBorderColor()} flex items-start gap-3 animate-fade-in-up transition-all duration-200 ease-apple`}
      role="alert"
    >
      {getIcon()}
      <div className="flex-1 min-w-0 pr-1">
        <p className="font-serif text-sm text-primary font-medium tracking-wide leading-tight">
          {toast.title}
        </p>
        {toast.description && (
          <p className="text-[11px] text-secondary mt-0.5 leading-relaxed break-words">
            {toast.description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-secondary/60 hover:text-primary p-1 rounded-full hover:bg-black/5 transition-colors shrink-0 -mr-1 -mt-1"
        aria-label="Close notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
