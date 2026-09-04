"use client";

import React from "react";
import { useChatStore } from "@/store/useChatStore";
import { ChatThread } from "@/components/command-center/chat/ChatThread";
import { ChatInput } from "@/components/command-center/chat/ChatInput";
import { AuditTab } from "@/components/command-center/audit/AuditTab";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, BarChart3, Bot } from "lucide-react";

export const CommandCenterPanel: React.FC = () => {
  const { activeTab, setActiveTab, latestAudit, messages } = useChatStore();

  const hasAuditAvailable = !!latestAudit || messages.some((m) => !!m.metrics);

  return (
    <div className="flex flex-col h-full w-full bg-white/60 text-slate-900 overflow-hidden">
      {/* Panel Header & Tabs */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200/80 bg-white/70 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shadow-sm">
            <Bot className="w-4 h-4 text-accent" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-serif text-base tracking-wide text-slate-900 font-medium">
              AI Command
            </span>
            <em className="font-serif italic text-sm text-slate-500">
              Center
            </em>
          </div>
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

      {/* Panel Body */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeTab === "chat" ? (
          <>
            <ChatThread />
            <ChatInput />
          </>
        ) : (
          <AuditTab />
        )}
      </div>
    </div>
  );
};
