"use client";

import React, { useRef, useEffect } from "react";
import { useChatStore } from "@/store/useChatStore";
import { ChatMessageBubble } from "@/components/command-center/chat/ChatMessageBubble";
import { ArrowUpRight, Sparkles } from "lucide-react";

interface ChatThreadProps {
  isFullWidth?: boolean;
}

export const ChatThread: React.FC<ChatThreadProps> = ({ isFullWidth = false }) => {
  const { messages, sendMessage, isSending } = useChatStore();
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
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-secondary space-y-5">
        <div className="space-y-2 max-w-md">
          <p className="text-secondary/70 text-xs tracking-widest uppercase font-mono font-semibold">
            Vision-Language Earth Observation
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl text-primary tracking-tight font-normal">
            Know it then <em className="italic text-accent">all</em>.
          </h2>
          <p className="text-xs text-secondary leading-relaxed max-w-xs mx-auto">
            Drop multi-spectral satellite imagery or ask a natural-language question to orchestrate autonomous geospatial models.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 w-full max-w-sm pt-2">
          {sampleQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isSending}
              onClick={() => sendMessage(q)}
              className="apple-interactive rounded-full px-4 py-2.5 text-left text-xs font-medium text-[#7F4B30] dark:text-[#E89258] hover:text-[#FAF6F0] dark:hover:text-white bg-[#E1D9C9]/90 dark:bg-[#1F1B17] hover:bg-[#7F4B30] dark:hover:bg-[#965A3B] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 ease-apple flex items-center justify-between group shadow-xs border border-[#AE9372]/60 dark:border-white/10 hover:border-[#7F4B30] dark:hover:border-[#965A3B]"
            >
              <div className="flex items-center gap-2 truncate pr-2">
                <Sparkles className="w-3.5 h-3.5 text-[#B27D57] dark:text-[#D97736] group-hover:text-[#FAF6F0] dark:group-hover:text-white group-hover:scale-110 transition-transform shrink-0" />
                <span className="truncate font-medium">{q}</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#7F4B30]/60 dark:text-[#E89258]/80 group-hover:text-[#FAF6F0] dark:group-hover:text-white transition-colors shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-4 bg-transparent"
    >
      <div className={`space-y-4 ${isFullWidth ? "max-w-3xl mx-auto w-full" : "w-full"}`}>
        {messages.map((msg) => (
          <ChatMessageBubble key={msg.id} message={msg} />
        ))}
      </div>
      <div ref={bottomRef} className="h-1" />
    </div>
  );
};
