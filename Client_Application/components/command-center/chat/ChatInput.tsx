"use client";

import React, { useState, useRef } from "react";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useChatStore } from "@/store/useChatStore";

export const ChatInput: React.FC = () => {
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
    <div className="p-3 bg-white/40 backdrop-blur-xs border-t border-stone-200/50 shrink-0">
      {/* Console Card Container with Rotating Border Light matching Home Box */}
      <div className="relative rounded-2xl overflow-hidden group shadow-[0_8px_24px_rgba(78,59,42,0.08)]">
        {/* Border-Only Rotating Light Beam: strictly confined to the border channel via CSS hardware mask */}
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
        <div className="glassmortisin-input relative rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between w-full transition-all duration-200 ease-apple border border-white/60 bg-white/70">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this imagery (e.g. riverbank erosion, new structures)..."
            rows={1}
            disabled={isSending}
            className="w-full resize-none bg-transparent px-1 py-1 text-xs text-primary placeholder:text-secondary/50 focus:outline-none min-h-[38px] max-h-[120px] leading-relaxed"
          />

          <div className="flex items-center justify-between pt-2 mt-1 border-t border-stone-200/40">
            <div className="flex items-center gap-1.5 text-[10px] text-secondary font-mono">
              <Sparkles className="w-3 h-3 text-accent" />
              <span>GeoVLM Reasoner active</span>
            </div>

            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              aria-label="Send message"
              className="apple-interactive w-8 h-8 rounded-full bg-[#7F4B30] hover:bg-[#965A3B] text-white flex items-center justify-center shadow-[0_4px_12px_rgba(127,75,48,0.3)] ring-2 ring-[#7F4B30]/20 hover:-translate-y-0.5 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 ease-apple shrink-0"
            >
              {isSending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
