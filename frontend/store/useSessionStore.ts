import { create } from "zustand";
import { ChatMessage, AuditRecord } from "@/lib/types/chat";
import { LayerSource } from "@/lib/types/geo";
import { isSpatialResponse } from "@/lib/adapters/satelliteAnalysisAdapter";

export interface SessionData {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  asset: {
    assetId: string;
    assetName: string;
    bbox: [number, number, number, number];
    sources?: {
      optical?: LayerSource;
      sar?: LayerSource;
      aiChangeMask?: { type: "geojson"; data?: GeoJSON.FeatureCollection };
    };
  };
  evidence: GeoJSON.FeatureCollection | null;
  requiresMap?: boolean;
  latestAudit: { query: string; audit: AuditRecord } | null;
  attachedFileName?: string;
}

interface SessionStoreState {
  sessions: Record<string, SessionData>;
  isHistorySidebarOpen: boolean;
  activeSessionId: string | null;

  setHistorySidebarOpen: (open: boolean) => void;
  setActiveSessionId: (id: string | null) => void;

  createSession: (params: {
    prompt: string;
    attachedFileName?: string;
    assistantText?: string;
    evidence?: GeoJSON.FeatureCollection;
    requiresMap?: boolean;
    audit?: AuditRecord;
    bbox?: [number, number, number, number];
    assetName?: string;
  }) => string;

  getSession: (id: string) => SessionData | undefined;
  updateSession: (id: string, updates: Partial<SessionData>) => void;
  addMessageToSession: (id: string, message: ChatMessage) => void;
  deleteSession: (id: string) => void;
}

const DEFAULT_SESSIONS: Record<string, SessionData> = {
  "c_sundarbans_demo": {
    id: "c_sundarbans_demo",
    title: "Sundarbans Riverbank Coastal Erosion",
    createdAt: Date.now() - 3600000 * 2,
    updatedAt: Date.now() - 3600000 * 2,
    messages: [
      {
        id: "msg_init",
        role: "user",
        text: "Has this riverbank eroded since last quarter?",
        status: "complete",
        createdAt: Date.now() - 3600000 * 2,
      },
      {
        id: "msg_resp",
        role: "assistant",
        text: "Analysis complete: 3 distinct segments along the eastern riverbank show more than 2.3m of coastal retreat since 2022. The affected erosion zones have been delineated and highlighted in amber on your map.",
        status: "complete",
        createdAt: Date.now() - 3600000 * 2 + 1500,
        evidenceRef: "evi_sundarbans",
        metrics: {
          models: [
            { name: "SAR-ChangeNet", version: "v2.4.1", duration_ms: 142 },
            { name: "GeoVLM-Reasoner", version: "large-fp16", duration_ms: 890 },
          ],
          metrics: {
            iou: 0.81,
            confidence: 0.87,
            area_affected_m2: 13260,
          },
        },
      },
    ],
    asset: {
      assetId: "ast_sundarbans_2026q1",
      assetName: "Sundarbans_2026Q1",
      bbox: [88.021, 21.678, 88.412, 21.983],
      sources: {
        optical: {
          type: "tile",
          url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        },
        sar: {
          type: "tile",
          url: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
        },
      },
    },
    evidence: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [88.22, 21.82],
                [88.25, 21.84],
                [88.27, 21.83],
                [88.24, 21.81],
                [88.22, 21.82],
              ],
            ],
          },
          properties: {
            class: "Active Erosion Corridor",
            confidence: 0.89,
            area_m2: 4230,
            retreat_rate_m_yr: 1.15,
          },
        },
      ],
    },
    latestAudit: {
      query: "Has this riverbank eroded since last quarter?",
      audit: {
        models: [
          { name: "SAR-ChangeNet", version: "v2.4.1", duration_ms: 142 },
          { name: "GeoVLM-Reasoner", version: "large-fp16", duration_ms: 890 },
        ],
        metrics: {
          iou: 0.81,
          confidence: 0.87,
          area_affected_m2: 13260,
        },
      },
    },
    requiresMap: true,
    attachedFileName: "sundarbans_delta_rgb_sar.tif",
  },
};

export const useSessionStore = create<SessionStoreState>((set, get) => {
  let initialSessions = DEFAULT_SESSIONS;
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("satquery_sessions");
      if (stored) {
        initialSessions = { ...DEFAULT_SESSIONS, ...JSON.parse(stored) };
      }
    } catch (e) {}
  }

  const persist = (sessions: Record<string, SessionData>) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("satquery_sessions", JSON.stringify(sessions));
      } catch (e) {}
    }
  };

  return {
    sessions: initialSessions,
    isHistorySidebarOpen: false,
    activeSessionId: null,

    setHistorySidebarOpen: (open) => set({ isHistorySidebarOpen: open }),
    setActiveSessionId: (id) => set({ activeSessionId: id }),

    createSession: ({
      prompt,
      attachedFileName,
      assistantText,
      evidence,
      requiresMap,
      audit,
      bbox = [88.021, 21.678, 88.412, 21.983],
      assetName,
    }) => {
      const id = `c_${Math.random().toString(36).substring(2, 9)}`;
      const title =
        prompt.length > 40 ? prompt.slice(0, 38).trim() + "..." : prompt;

      const isSpatial = isSpatialResponse({ evidence, requiresMap });

      const userMessage: ChatMessage = {
        id: `msg_u_${Date.now()}`,
        role: "user",
        text: prompt,
        status: "complete",
        createdAt: Date.now(),
      };

      const assistantMessage: ChatMessage = {
        id: `msg_a_${Date.now()}`,
        role: "assistant",
        text:
          assistantText ||
          "Multi-band vision-language scan completed. Spatial boundaries have been mapped to the coordinates and highlighted in amber.",
        status: "complete",
        createdAt: Date.now() + 800,
        evidenceRef: isSpatial && evidence ? `evi_${id}` : undefined,
        evidenceData: isSpatial ? evidence : undefined,
        requiresMap: isSpatial,
        metrics: audit,
      };

      const newSession: SessionData = {
        id,
        title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [userMessage, assistantMessage],
        asset: {
          assetId: `ast_${id}`,
          assetName: assetName || (attachedFileName ? attachedFileName.replace(/\.[^/.]+$/, "") : "Sundarbans_2026Q1"),
          bbox,
          sources: {
            optical: {
              type: "tile",
              url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            },
            sar: {
              type: "tile",
              url: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
            },
          },
        },
        evidence: isSpatial ? (evidence || null) : null,
        requiresMap: isSpatial,
        latestAudit: audit ? { query: prompt, audit } : null,
        attachedFileName,
      };

      set((state) => {
        const next = { [id]: newSession, ...state.sessions };
        persist(next);
        return { sessions: next, activeSessionId: id };
      });

      return id;
    },

    getSession: (id) => get().sessions[id],

    updateSession: (id, updates) => {
      set((state) => {
        const existing = state.sessions[id];
        if (!existing) return state;
        const updated = { ...existing, ...updates, updatedAt: Date.now() };
        const next = { ...state.sessions, [id]: updated };
        persist(next);
        return { sessions: next };
      });
    },

    addMessageToSession: (id, message) => {
      set((state) => {
        const existing = state.sessions[id];
        if (!existing) return state;
        const updated = {
          ...existing,
          messages: [...existing.messages, message],
          updatedAt: Date.now(),
        };
        const next = { ...state.sessions, [id]: updated };
        persist(next);
        return { sessions: next };
      });
    },

    deleteSession: (id) => {
      set((state) => {
        const next = { ...state.sessions };
        delete next[id];
        persist(next);
        return {
          sessions: next,
          activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
        };
      });
    },
  };
});
