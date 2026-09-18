"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

export const CheckIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={cn("w-5 h-5", className)}
    >
      <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
};

export const CheckFilled = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("w-5 h-5", className)}
    >
      <path
        fillRule="evenodd"
        d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
        clipRule="evenodd"
      />
    </svg>
  );
};

export type LoadingState = {
  text: string;
};

export const LoaderCore = ({
  loadingStates,
  value = 0,
  className,
}: {
  loadingStates: readonly LoadingState[] | LoadingState[];
  value?: number;
  className?: string;
}) => {
  return (
    <div className={cn("flex relative justify-start max-w-lg mx-auto flex-col px-4 py-2", className)}>
      {loadingStates.map((loadingState, index) => {
        const isCurrent = value === index;
        const isCompleted = index < value;
        const isUpcoming = index > value;

        return (
          <motion.div
            key={index}
            className="text-left flex items-center gap-3.5 py-2 sm:py-2.5 select-none"
            initial={{ opacity: 0, x: -6 }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="w-5 h-5 flex items-center justify-center shrink-0">
              {isCompleted && (
                <CheckFilled className="w-5 h-5 text-accent drop-shadow-[0_0_6px_rgba(200,109,59,0.4)]" />
              )}
              {isCurrent && (
                <div className="relative flex items-center justify-center">
                  <span className="w-4 h-4 rounded-full bg-accent/30 animate-ping absolute" />
                  <span className="w-2.5 h-2.5 rounded-full bg-accent relative shadow-[0_0_8px_rgba(200,109,59,0.8)]" />
                </div>
              )}
              {isUpcoming && <div className="h-3.5 w-3.5 rounded-full border-2 border-gray-400 dark:border-gray-500" />}
            </div>

            <span
              className={cn(
                "tracking-wide transition-colors duration-200 text-black dark:text-[#F3EEE7]",
                isCurrent
                  ? "font-serif text-base sm:text-lg font-semibold"
                  : isCompleted
                  ? "font-sans text-sm sm:text-base font-medium"
                  : "font-sans text-sm sm:text-base font-normal"
              )}
            >
              {loadingState.text}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
};

export interface MultiStepLoaderProps {
  loadingStates: readonly LoadingState[] | LoadingState[];
  loading?: boolean;
  duration?: number;
  loop?: boolean;
  value?: number;
  className?: string;
  isModal?: boolean;
  onClose?: () => void;
}

export const MultiStepLoader = ({
  loadingStates,
  loading = true,
  duration = 2000,
  loop = false,
  value,
  className,
  isModal = false,
  onClose,
}: MultiStepLoaderProps) => {
  const [internalState, setInternalState] = useState(0);

  // If value is provided, it is controlled by external state; otherwise auto-advance
  const isControlled = typeof value === "number";
  const currentState = isControlled ? value : internalState;

  useEffect(() => {
    if (isControlled || !loading) {
      if (!isControlled) setInternalState(0);
      return;
    }
    const timeout = setTimeout(() => {
      setInternalState((prevState) =>
        loop
          ? prevState === loadingStates.length - 1
            ? 0
            : prevState + 1
          : Math.min(prevState + 1, loadingStates.length - 1)
      );
    }, duration);

    return () => clearTimeout(timeout);
  }, [internalState, loading, loop, loadingStates.length, duration, isControlled]);

  const content = (
    <div className={cn("w-full relative flex items-center justify-center py-4", className)}>
      <LoaderCore
        value={currentState}
        loadingStates={loadingStates}
      />
    </div>
  );

  if (!isModal) {
    return (
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full"
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-md bg-black/40 dark:bg-black/70 p-4"
          onClick={onClose}
        >
          <div
            className="relative max-w-md w-full rounded-3xl border border-stone-300/70 bg-[#FAF8F5]/95 p-6 shadow-2xl overflow-hidden dark:border-white/10 dark:bg-[#171512]/95"
            onClick={(e) => e.stopPropagation()}
          >
            {content}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
