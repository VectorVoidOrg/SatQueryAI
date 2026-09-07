"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type LoadingState = {
  text: string;
};

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={cn("h-6 w-6", className)}
    aria-hidden="true"
  >
    <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const CheckFilled = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={cn("h-6 w-6", className)}
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
      clipRule="evenodd"
    />
  </svg>
);

function LoaderCore({ loadingStates, value }: { loadingStates: LoadingState[]; value: number }) {
  return (
    <div className="relative mx-auto mt-40 flex max-w-xl flex-col justify-start">
      {loadingStates.map((loadingState, index) => {
        const distance = Math.abs(index - value);
        const opacity = Math.max(1 - distance * 0.2, 0.2);

        return (
          <motion.div
            key={loadingState.text}
            className="mb-4 flex gap-2 text-left"
            initial={{ opacity: 0, y: -(value * 40) }}
            animate={{ opacity, y: -(value * 40) }}
            transition={{ duration: 0.5 }}
          >
            <div>
              {index > value ? (
                <CheckIcon className="text-slate-400" />
              ) : (
                <CheckFilled
                  className={cn(
                    "text-slate-500",
                    value === index && "text-sky-500",
                  )}
                />
              )}
            </div>
            <span
              className={cn(
                "text-sm text-slate-500",
                value === index && "font-medium text-sky-600",
              )}
            >
              {loadingState.text}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

function MultiStepLoaderContent({
  loadingStates,
  duration = 1200,
  loop = false,
}: {
  loadingStates: LoadingState[];
  duration?: number;
  loop?: boolean;
}) {
  const [currentState, setCurrentState] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setCurrentState((previousState) =>
        loop
          ? previousState === loadingStates.length - 1
            ? 0
            : previousState + 1
          : Math.min(previousState + 1, loadingStates.length - 1),
      );
    }, duration);

    return () => clearTimeout(timeout);
  }, [currentState, duration, loadingStates.length, loop]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] flex h-full w-full items-center justify-center bg-white/75 backdrop-blur-2xl"
      role="status"
      aria-live="polite"
      aria-label="Preparing analysis workspace"
    >
      <div className="relative h-96 w-full max-w-xl">
        <LoaderCore loadingStates={loadingStates} value={currentState} />
      </div>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(900px_at_center,transparent_30%,rgba(255,255,255,0.9))]" />
    </motion.div>
  );
};

export const MultiStepLoader = ({
  loadingStates,
  loading = false,
  duration = 1200,
  loop = false,
}: {
  loadingStates: LoadingState[];
  loading?: boolean;
  duration?: number;
  loop?: boolean;
}) => {
  return (
    <AnimatePresence mode="wait">
      {loading && (
        <MultiStepLoaderContent
          loadingStates={loadingStates}
          duration={duration}
          loop={loop}
        />
      )}
    </AnimatePresence>
  );
};
