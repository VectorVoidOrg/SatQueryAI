import { create } from "zustand";
import { ChatMessage, AuditRecord, AnalysisStep } from "@/lib/types/chat";
import { sendChatQuery } from "@/lib/api/middlewareClient";
import { useAssetStore } from "@/store/useAssetStore";
import { toast } from "@/store/useToastStore";
import { DEFAULT_SATELLITE_PIPELINE_STEPS, isSpatialResponse } from "@/lib/adapters/satelliteAnalysisAdapter";

interface ChatState {
  sessionId: string;
  messages: ChatMessage[];
  activeTab: "chat" | "audit";
  isSending: boolean;
  isAnalyzing: boolean;
  latestAudit: { query: string; audit: AuditRecord } | null;

  setSessionId: (id: string) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setAuditRecord: (query: string, audit: AuditRecord) => void;
  sendMessage: (text: string) => Promise<void>;
  retryMessage: (failedMsgId: string) => Promise<void>;
  setActiveTab: (tab: "chat" | "audit") => void;
  clearChat: () => void;
  setIsAnalyzing: (val: boolean) => void;
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
  isAnalyzing: false,
  latestAudit: null,

  setActiveTab: (tab) => set({ activeTab: tab }),

  setSessionId: (id: string) => set({ sessionId: id }),

  setMessages: (messages: ChatMessage[]) => set({ messages }),

  setAuditRecord: (query: string, audit: AuditRecord) =>
    set({ latestAudit: { query, audit } }),

  setIsAnalyzing: (val: boolean) => set({ isAnalyzing: val, isSending: val }),

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

    const initialSteps = DEFAULT_SATELLITE_PIPELINE_STEPS.map((s, idx) => ({
      ...s,
      status: (idx === 0 ? "running" : "pending") as AnalysisStep["status"],
    }));

    const pendingAssistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      status: "pending",
      createdAt: Date.now(),
      pipelineSteps: initialSteps,
      activeStepIndex: 0,
    };

    // Optimistically update message list and enter full-screen analysis state
    set((state) => ({
      messages: [...state.messages, userMessage, pendingAssistantMessage],
      isSending: true,
      isAnalyzing: true,
    }));

    toast.info("Processing started", "Orchestrating SAR & optical analysis pipeline");

    // Progressive pipeline stepper simulation while waiting for backend response
    let currentStep = 0;
    const progressInterval = setInterval(() => {
      currentStep++;
      if (currentStep < initialSteps.length) {
        set((state) => ({
          messages: state.messages.map((msg) => {
            if (msg.id !== assistantMsgId || !msg.pipelineSteps) return msg;
            const updatedSteps = msg.pipelineSteps.map((s, idx) => {
              if (idx < currentStep) return { ...s, status: "complete" as const };
              if (idx === currentStep) return { ...s, status: "running" as const };
              return s;
            });
            return { ...msg, pipelineSteps: updatedSteps, activeStepIndex: currentStep };
          }),
        }));
      }
    }, 420);

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
          drawn_aoi: assetState.drawnAoi || undefined,
        },
      });

      clearInterval(progressInterval);

      // Determine strictly whether this result requires spatial visualization
      const isSpatial = isSpatialResponse({
        evidence: response.evidence,
        requiresMap: response.requiresMap,
        spatialOutput: response.spatialOutput,
        mapData: response.mapData,
      });

      // Update asset store spatial visibility and evidence
      useAssetStore.getState().setRequiresSpatialView(isSpatial);
      if (isSpatial && response.evidence) {
        useAssetStore.getState().setEvidence(response.evidence, assistantMsgId);
      } else {
        useAssetStore.getState().clearEvidence();
      }

      // Mark all pipeline steps complete
      const finalSteps = initialSteps.map((s) => ({ ...s, status: "complete" as const }));

      // Complete final step and hold briefly so user sees 100% completion
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                pipelineSteps: finalSteps,
                activeStepIndex: finalSteps.length - 1,
              }
            : msg
        ),
      }));

      await new Promise((resolve) => setTimeout(resolve, 300));

      // Update assistant message with completed response
      set((state) => ({
        isSending: false,
        isAnalyzing: false,
        latestAudit: response.audit ? { query: trimmed, audit: response.audit } : state.latestAudit,
        messages: state.messages.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                text: response.text,
                evidenceRef: isSpatial && response.evidence ? `evi_${response.message_id}` : undefined,
                evidenceData: isSpatial ? response.evidence : undefined,
                requiresMap: isSpatial,
                metrics: response.audit,
                status: "complete",
                pipelineSteps: finalSteps,
                activeStepIndex: finalSteps.length - 1,
              }
            : msg
        ),
      }));

      toast.success("Analysis completed", "Spatial intelligence ready");
    } catch (error: any) {
      clearInterval(progressInterval);

      set((state) => ({
        isSending: false,
        isAnalyzing: false,
        messages: state.messages.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                text: "Failed to generate remote sensing analysis. Please check network connection or retry.",
                errorMessage: error?.message || "Inference pipeline error.",
                status: "error",
                pipelineSteps: (msg.pipelineSteps || initialSteps).map((s, idx) =>
                  idx === (msg.activeStepIndex ?? 0) ? { ...s, status: "error" as const } : s
                ),
              }
            : msg
        ),
      }));

      toast.error("Analysis failed", error?.message || "Pipeline encountered inference error");
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
    const retrySteps = DEFAULT_SATELLITE_PIPELINE_STEPS.map((s, idx) => ({
      ...s,
      status: (idx === 0 ? "running" : "pending") as AnalysisStep["status"],
    }));

    set((s) => ({
      isSending: true,
      isAnalyzing: true,
      messages: s.messages.map((msg) =>
        msg.id === failedMsgId
          ? {
              ...msg,
              status: "pending",
              errorMessage: undefined,
              pipelineSteps: retrySteps,
              activeStepIndex: 0,
            }
          : msg
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

      const isSpatial = isSpatialResponse({
        evidence: response.evidence,
        requiresMap: response.requiresMap,
        spatialOutput: response.spatialOutput,
        mapData: response.mapData,
      });

      useAssetStore.getState().setRequiresSpatialView(isSpatial);
      if (isSpatial && response.evidence) {
        useAssetStore.getState().setEvidence(response.evidence, failedMsgId);
      } else {
        useAssetStore.getState().clearEvidence();
      }

      const finalRetrySteps = retrySteps.map((s) => ({ ...s, status: "complete" as const }));
      set((s) => ({
        messages: s.messages.map((msg) =>
          msg.id === failedMsgId
            ? {
                ...msg,
                pipelineSteps: finalRetrySteps,
                activeStepIndex: finalRetrySteps.length - 1,
              }
            : msg
        ),
      }));

      await new Promise((resolve) => setTimeout(resolve, 300));

      set((s) => ({
        isSending: false,
        isAnalyzing: false,
        latestAudit: response.audit ? { query: queryText, audit: response.audit } : s.latestAudit,
        messages: s.messages.map((msg) =>
          msg.id === failedMsgId
            ? {
                ...msg,
                text: response.text,
                evidenceRef: isSpatial && response.evidence ? `evi_${response.message_id}` : undefined,
                evidenceData: isSpatial ? response.evidence : undefined,
                requiresMap: isSpatial,
                metrics: response.audit,
                status: "complete",
                pipelineSteps: finalRetrySteps,
                activeStepIndex: finalRetrySteps.length - 1,
              }
            : msg
        ),
      }));
    } catch (error: any) {
      set((s) => ({
        isSending: false,
        isAnalyzing: false,
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
