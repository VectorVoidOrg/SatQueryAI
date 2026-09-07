import { create } from "zustand";

export interface UserProfile {
  name: string;
  email: string;
  role: string;
}

interface ProfileState {
  profile: UserProfile;
  isAuthenticated: boolean;
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
  let initialProfile = DEFAULT_PROFILE;
  let initialAuthenticated = false;
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("satquery_user_profile");
      if (stored) {
        initialProfile = { ...DEFAULT_PROFILE, ...JSON.parse(stored) };
      }
      initialAuthenticated = localStorage.getItem("satquery_authenticated") === "true";
    } catch (e) {
      // Ignored
    }
  }

  return {
    profile: initialProfile,
    isAuthenticated: initialAuthenticated,
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
          } catch (e) {}
        }
        return { profile: next };
      }),
  };
});
