import { create } from "zustand";

export interface UserProfile {
  name: string;
  email: string;
  role: string;
}

interface ProfileState {
  profile: UserProfile;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  hydrateFromStorage: () => void;
  isProfileModalOpen: boolean;
  setAuthenticated: (authenticated: boolean) => void;
  setProfileModalOpen: (open: boolean) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

const DEFAULT_PROFILE: UserProfile = {
  name: "Dr. Dhawal Gupta",
  email: "dhawal@satquery.ai",
  role: "Remote Sensing Analyst & Evaluator",
};

export const useProfileStore = create<ProfileState>((set) => {
  return {
    profile: DEFAULT_PROFILE,
    isAuthenticated: false,
    hasHydrated: false,
    hydrateFromStorage: () => {
      if (typeof window === "undefined") return;

      try {
        const stored = localStorage.getItem("satquery_user_profile");
        const profile = stored
          ? { ...DEFAULT_PROFILE, ...JSON.parse(stored) }
          : DEFAULT_PROFILE;
        const isAuthenticated = localStorage.getItem("satquery_authenticated") === "true";
        set({ profile, isAuthenticated, hasHydrated: true });
      } catch {
        set({ hasHydrated: true });
      }
    },
    isProfileModalOpen: false,
    setAuthenticated: (authenticated) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("satquery_authenticated", String(authenticated));
      }
      set({ isAuthenticated: authenticated });
    },
    setProfileModalOpen: (open) => set({ isProfileModalOpen: open }),
    updateProfile: (updates) =>
      set((state) => {
        const next = { ...state.profile, ...updates };
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("satquery_user_profile", JSON.stringify(next));
          } catch {}
        }
        return { profile: next };
      }),
  };
});
