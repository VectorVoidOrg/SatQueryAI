"use client";

import React, { useState, useRef } from "react";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useChatStore } from "@/store/useChatStore";

interface ChatInputProps {
  isFullWidth?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ isFullWidth = false }) => {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const { sendMessage, isSending } = useChatStore();

  const handleSend = () => {
    if (!input.trim() || isSending) return;
    sendMessage(input);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  return (
    <div className="p-3 bg-white/40 dark:bg-[#171512]/80 backdrop-blur-xs border-t border-stone-200/50 dark:border-white/10 shrink-0">
      <div className={isFullWidth ? "max-w-3xl mx-auto w-full" : "w-full"}>
        {/* Console Card Container with Rotating Border Light matching Home Box */}
      <div className="relative rounded-2xl overflow-hidden group shadow-[0_8px_24px_rgba(78,59,42,0.08)]">
        {/* Border-Only Rotating Light Beam: strictly confined to the border channel via CSS hardware mask (zero inside bleed, zero outside bloom) */}
        <div className="border-beam-track">
          <div
            aria-hidden="true"
            className="absolute -inset-[150%] animate-rotate-beam pointer-events-none"
            style={{
              background:
                "conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 75deg, rgba(200, 109, 59, 0.4) 95deg, #C86D3B 110deg, #FFFFFF 120deg, #C86D3B 130deg, rgba(200, 109, 59, 0.4) 145deg, transparent 165deg, transparent 360deg)",
            }}
          />
        </div>

        {/* Translucent Glassmortisin Console Interior Card */}
        <div className="glassmortisin-input relative rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between w-full transition-all duration-200 ease-apple border border-white/60 dark:border-white/10 bg-white/70 dark:bg-[#171512]">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this imagery (e.g. riverbank erosion, new structures)..."
            rows={2}
            disabled={isSending}
            className="w-full resize-none bg-transparent px-1 py-0.5 text-xs text-primary placeholder:text-secondary/50 dark:placeholder:text-[#91877D] focus:outline-none disabled:opacity-40 min-h-[42px] max-h-[120px] leading-relaxed"
          />

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-stone-200/50 dark:border-white/10">
            <div className="flex items-center gap-1.5 text-[10px] text-secondary/70 dark:text-[#91877D] font-mono">
              <Sparkles className="w-3 h-3 text-accent" />
              <span>Spatial VLM Reasoning</span>
            </div>

            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              aria-label="Send query"
              className="apple-interactive bg-[#7F4B30] hover:bg-[#B27D57] rounded-full w-8 h-8 text-white hover:brightness-105 active:scale-95 disabled:pointer-events-none disabled:opacity-30 transition-all duration-200 ease-apple flex items-center justify-center shrink-0 shadow-[0_4px_14px_rgba(127,75,48,0.35),inset_0_1px_1px_rgba(255,255,255,0.5)] ring-1 ring-[#7F4B30]/30"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <ArrowRight className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

        <div className="flex items-center justify-between mt-2 px-3 text-[10px] text-secondary/60 dark:text-[#91877D] font-mono">
          <span>Press <kbd className="px-1 py-0.5 rounded bg-white/60 dark:bg-[#1F1B17] border border-stone-200 dark:border-white/10 text-secondary dark:text-[#B8AEA3]">Enter ↵</kbd> to send</span>
          <span><kbd className="px-1 py-0.5 rounded bg-white/60 dark:bg-[#1F1B17] border border-stone-200 dark:border-white/10 text-secondary dark:text-[#B8AEA3]">Shift+Enter</kbd> newline</span>
        </div>
      </div>
    </div>
  );
};
