import { create } from "zustand";
import { ChatMessage, AuditRecord } from "@/lib/types/chat";
import { sendChatQuery } from "@/lib/api/middlewareClient";
import { useAssetStore } from "@/store/useAssetStore";

interface ChatState {
  sessionId: string;
  messages: ChatMessage[];
  activeTab: "chat" | "audit";
  isSending: boolean;
  latestAudit: { query: string; audit: AuditRecord } | null;

  setSessionId: (id: string) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setAuditRecord: (query: string, audit: AuditRecord) => void;
  sendMessage: (text: string) => Promise<void>;
  retryMessage: (failedMsgId: string) => Promise<void>;
  setActiveTab: (tab: "chat" | "audit") => void;
  clearChat: () => void;
}

const initialSessionId = `sess_${Math.random().toString(36).substring(2, 9)}`;

export const useChatStore = create<ChatState>((set, get) => ({
  sessionId: initialSessionId,
  messages: [
    {
      id: "msg_welcome",
      role: "assistant",
      text: "SatQuery AI Remote-Sensing Assistant ready. Active AOI loaded: Sundarbans_2026Q1 (Multi-band Optical + Sentinel-1 SAR). Ask questions regarding coastal erosion, structural changes, or spatial anomalies.",
      status: "complete",
      createdAt: Date.now() - 60000,
    },
  ],
  activeTab: "chat",
  isSending: false,
  latestAudit: null,

  setActiveTab: (tab) => set({ activeTab: tab }),

  setSessionId: (id: string) => set({ sessionId: id }),

  setMessages: (messages: ChatMessage[]) => set({ messages }),

  setAuditRecord: (query: string, audit: AuditRecord) =>
    set({ latestAudit: { query, audit } }),

  clearChat: () =>
    set({
      messages: [],
      latestAudit: null,
    }),

  sendMessage: async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || get().isSending) return;

    const userMsgId = `msg_u_${Date.now()}`;
    const assistantMsgId = `msg_a_${Date.now()}`;

    const userMessage: ChatMessage = {
      id: userMsgId,
      role: "user",
      text: trimmed,
      status: "complete",
      createdAt: Date.now(),
    };

    const pendingAssistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      status: "pending",
      createdAt: Date.now(),
    };

    // Optimistically update message list
    set((state) => ({
      messages: [...state.messages, userMessage, pendingAssistantMessage],
      isSending: true,
    }));

    try {
      const assetState = useAssetStore.getState();
      const currentAssetId = assetState.assetId || "ast_unknown";
      const activeLayerNames = Object.entries(assetState.activeLayers)
        .filter(([_, active]) => active)
        .map(([layer]) => layer);

      const response = await sendChatQuery({
        session_id: get().sessionId,
        asset_id: currentAssetId,
        message: trimmed,
        map_context: {
          visible_bounds: assetState.bbox || undefined,
          active_layers: activeLayerNames,
        },
      });

      // Update assistant message with completed response
      set((state) => ({
        isSending: false,
        latestAudit: response.audit ? { query: trimmed, audit: response.audit } : state.latestAudit,
        messages: state.messages.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                text: response.text,
                evidenceRef: response.evidence ? `evi_${response.message_id}` : undefined,
                evidenceData: response.evidence,
                metrics: response.audit,
                status: "complete",
              }
            : msg
        ),
      }));

      // Render spatial evidence on map via useAssetStore seam
      if (response.evidence) {
        useAssetStore.getState().setEvidence(response.evidence, assistantMsgId);
      }
    } catch (error: any) {
      set((state) => ({
        isSending: false,
        messages: state.messages.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                text: "Failed to generate remote sensing analysis. Please check network connection or retry.",
                errorMessage: error?.message || "Inference pipeline error.",
                status: "error",
              }
            : msg
        ),
      }));
    }
  },

  retryMessage: async (failedMsgId: string) => {
    const state = get();
    const failedMsgIndex = state.messages.findIndex((m) => m.id === failedMsgId);
    if (failedMsgIndex === -1) return;

    // Find the corresponding user message right before it
    const priorUserMsg = state.messages
      .slice(0, failedMsgIndex)
      .reverse()
      .find((m) => m.role === "user");

    const queryText = priorUserMsg?.text || "Retry query";

    // Set failed message back to pending
    set((s) => ({
      isSending: true,
      messages: s.messages.map((msg) =>
        msg.id === failedMsgId ? { ...msg, status: "pending", errorMessage: undefined } : msg
      ),
    }));

    try {
      const assetState = useAssetStore.getState();
      const currentAssetId = assetState.assetId || "ast_unknown";

      const response = await sendChatQuery({
        session_id: state.sessionId,
        asset_id: currentAssetId,
        message: queryText,
      });

      set((s) => ({
        isSending: false,
        latestAudit: response.audit ? { query: queryText, audit: response.audit } : s.latestAudit,
        messages: s.messages.map((msg) =>
          msg.id === failedMsgId
            ? {
                ...msg,
                text: response.text,
                evidenceRef: response.evidence ? `evi_${response.message_id}` : undefined,
                evidenceData: response.evidence,
                metrics: response.audit,
                status: "complete",
              }
            : msg
        ),
      }));

      if (response.evidence) {
        useAssetStore.getState().setEvidence(response.evidence, failedMsgId);
      }
    } catch (error: any) {
      set((s) => ({
        isSending: false,
        messages: s.messages.map((msg) =>
          msg.id === failedMsgId
            ? {
                ...msg,
                errorMessage: error?.message || "Retry failed.",
                status: "error",
              }
            : msg
        ),
      }));
    }
  },
}));
