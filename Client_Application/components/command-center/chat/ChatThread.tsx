"use client";

import React, { useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/store/useChatStore";
import { useProfileStore } from "@/store/useProfileStore";
import { ChatMessageBubble } from "@/components/command-center/chat/ChatMessageBubble";
import { ArrowUpRight, Sparkles } from "lucide-react";

export const ChatThread: React.FC = () => {
  const router = useRouter();
  const { messages, sendMessage, isSending } = useChatStore();
  const { isAuthenticated } = useProfileStore();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sampleQuestions = [
    "Has this riverbank eroded since last quarter?",
    "Count new structures in this AOI.",
    "Highlight anomalous change detection zones.",
  ];

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-600 space-y-5">
        <div className="space-y-2 max-w-md">
          <p className="text-slate-400 text-xs tracking-widest uppercase font-mono font-semibold">
            Vision-Language Earth Observation
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl text-slate-900 tracking-tight font-normal">
            Know it then <em className="italic text-slate-500">all</em>.
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
            Drop multi-spectral satellite imagery or ask a natural-language question to orchestrate autonomous geospatial models.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 w-full max-w-sm pt-2">
          {sampleQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isSending}
              onClick={() => {
                if (!isAuthenticated) {
                  router.push(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
                  return;
                }
                sendMessage(q);
              }}
              className="liquid-glass rounded-full px-4 py-2.5 text-left text-xs text-slate-700 hover:text-slate-900 hover:bg-white transition-all flex items-center justify-between group shadow-sm border border-slate-200/80"
            >
              <div className="flex items-center gap-2 truncate pr-2">
                <Sparkles className="w-3.5 h-3.5 text-accent group-hover:text-slate-900 transition-colors shrink-0" />
                <span className="truncate font-medium">{q}</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 transition-colors shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60"
    >
      {messages.map((msg) => (
        <ChatMessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} className="h-1" />
    </div>
  );
};
