import React from "react";
import { ChatMessage } from "@/lib/types/chat";
import { useChatStore } from "@/store/useChatStore";
import { ThinkingIndicator } from "@/components/command-center/chat/ThinkingIndicator";
import { MapPin, BarChart3, RotateCcw, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message }) => {
  const { retryMessage, setActiveTab, isSending } = useChatStore();

  const isUser = message.role === "user";

  if (message.status === "pending") {
    return <ThinkingIndicator />;
  }

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-in-up">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-slate-900 text-white px-4 py-3 text-xs shadow-sm leading-relaxed">
          <p className="whitespace-pre-wrap">{message.text}</p>
          <div className="mt-1.5 text-[10px] text-slate-400 text-right font-mono">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>
    );
  }

  // Assistant error state with inline retry (US-9)
  if (message.status === "error") {
    return (
      <div className="flex justify-start animate-fade-in-up">
        <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-rose-50 border border-rose-200 p-4 text-xs text-slate-800 shadow-sm space-y-2.5">
          <div className="flex items-start gap-2 text-rose-800 font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{message.errorMessage || "Inference pipeline query failed."}</span>
          </div>
          <p className="text-[11px] text-slate-500">
            The previous analytical context and chat history are preserved.
          </p>
          <div className="pt-1">
            <Button
              size="sm"
              variant="danger"
              disabled={isSending}
              onClick={() => retryMessage(message.id)}
              className="text-xs"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Retry Query
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Assistant success message
  const hasEvidence = !!message.evidenceData || !!message.evidenceRef;
  const hasAudit = !!message.metrics;

  return (
    <div className="flex justify-start animate-fade-in-up">
      <div className="liquid-glass max-w-[90%] rounded-2xl rounded-tl-sm p-4 text-xs text-slate-800 shadow-glass space-y-3 leading-relaxed border border-slate-200/80">
        {/* Main message text */}
        <p className="whitespace-pre-wrap text-slate-800 leading-relaxed">{message.text}</p>

        {/* Spatial evidence badge */}
        {hasEvidence && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
            <div className="liquid-glass inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-300 text-amber-900 bg-amber-50/80 font-medium text-[11px] shadow-sm">
              <MapPin className="w-3.5 h-3.5 text-amber-600" />
              <span>Spatial evidence rendered in amber on map</span>
            </div>
          </div>
        )}

        {/* Audit metrics quick access */}
        {hasAudit && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
            <div className="flex items-center gap-1.5 text-emerald-700 font-mono text-[10px]">
              <CheckCircle className="w-3 h-3 text-emerald-600" />
              <span>
                Models ({message.metrics?.models?.length || 0}) • IoU:{" "}
                {message.metrics?.metrics?.iou ?? "N/A"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("audit")}
              className="text-accent hover:text-sky-800 font-medium flex items-center gap-1 transition-colors hover:underline"
            >
              <BarChart3 className="w-3 h-3" />
              View in Audit Tab &rarr;
            </button>
          </div>
        )}

        <div className="text-[10px] text-slate-400 font-mono">
          {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
};
