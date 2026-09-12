"use client";

import React from "react";
import { useChatStore } from "@/store/useChatStore";
import { ChatThread } from "@/components/command-center/chat/ChatThread";
import { ChatInput } from "@/components/command-center/chat/ChatInput";
import { AuditTab } from "@/components/command-center/audit/AuditTab";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, BarChart3, Bot } from "lucide-react";

interface CommandCenterPanelProps {
  isFullWidth?: boolean;
}

export const CommandCenterPanel: React.FC<CommandCenterPanelProps> = ({
  isFullWidth = false,
}) => {
  const { activeTab, setActiveTab, latestAudit, messages } = useChatStore();

  const hasAuditAvailable = !!latestAudit || messages.some((m) => !!m.metrics);

  return (
    <div className="flex flex-col h-full w-full bg-transparent text-primary overflow-hidden">
      {/* Panel Header & Tabs */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-stone-200/60 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md shrink-0">
        <div className={`flex items-center justify-between w-full ${isFullWidth ? "max-w-4xl mx-auto" : ""}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-primary dark:bg-stone-800 text-white flex items-center justify-center shadow-xs ring-1 ring-white/10">
              <Bot className="w-4 h-4 text-accent" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif text-base tracking-wide text-primary font-medium">
                AI Command
              </span>
              <em className="font-serif italic text-sm text-accent">
                Center
              </em>
            </div>
            {isFullWidth && (
              <span className="ml-2 hidden sm:inline-flex items-center text-[10px] font-mono font-medium text-secondary/70 dark:text-[#B8AEA3] bg-black/[0.04] dark:bg-white/5 px-2.5 py-0.5 rounded-full border border-stone-300/40 dark:border-white/10">
                Analytical Text / Synthesis View
              </span>
            )}
          </div>

          {/* Tab Switcher */}
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "chat" | "audit")}>
            <TabsList className="h-8">
              <TabsTrigger value="chat" className="text-xs py-1 px-3.5 flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" />
                <span>Chat</span>
              </TabsTrigger>
              <TabsTrigger value="audit" className="text-xs py-1 px-3.5 flex items-center gap-1.5 relative">
                <BarChart3 className="w-3 h-3" />
                <span>Audit</span>
                {hasAuditAvailable && (
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Panel Body */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeTab === "chat" ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <ChatThread isFullWidth={isFullWidth} />
            <ChatInput isFullWidth={isFullWidth} />
          </div>
        ) : (
          <AuditTab isFullWidth={isFullWidth} />
        )}
      </div>
    </div>
  );
};
