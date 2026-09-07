"use client";

import React, { useState, useRef } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/store/useChatStore";
import { useProfileStore } from "@/store/useProfileStore";

export const ChatInput: React.FC = () => {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const router = useRouter();

  const { sendMessage, isSending } = useChatStore();
  const { isAuthenticated } = useProfileStore();

  const handleSend = () => {
    if (!input.trim() || isSending) return;
    if (!isAuthenticated) {
      router.push(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 96)}px`;
    }
  };

  return (
    <div className="p-3 bg-white/70 border-t border-slate-200/80 shrink-0">
      <div className="liquid-glass rounded-full pl-5 pr-2 py-1.5 flex items-center gap-3 w-full shadow-glass border border-slate-200/90 transition-all bg-white/90">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Ask about this imagery (e.g. riverbank erosion, new structures)..."
          rows={1}
          disabled={isSending}
          className="w-full resize-none bg-transparent py-1 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-40 min-h-[28px] max-h-[96px] leading-relaxed"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || isSending}
          aria-label="Send query"
          className="bg-slate-900 rounded-full p-2.5 text-white hover:bg-black active:scale-95 disabled:pointer-events-none disabled:opacity-30 transition-all shrink-0 shadow-sm"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <ArrowRight className="w-4 h-4 text-white" />
          )}
        </button>
      </div>

      <div className="flex items-center justify-between mt-2 px-3 text-[10px] text-slate-400 font-mono">
        <span>Press <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">Enter ↵</kbd> to send</span>
        <span><kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">Shift+Enter</kbd> newline</span>
      </div>
    </div>
  );
};
