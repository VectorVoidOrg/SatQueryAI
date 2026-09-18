import { create } from "zustand";

export interface UserProfile {
  name: string;
  email: string;
  role: string;
}

interface ProfileState {
  profile: UserProfile;
  isProfileModalOpen: boolean;
  initProfile: () => void;
  setProfileModalOpen: (open: boolean) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

export const DEFAULT_PROFILE: UserProfile = {
  name: "Dr. Dhawal Gupta",
  email: "dhawal@satquery.ai",
  role: "Remote Sensing Analyst & Evaluator",
};

export const useProfileStore = create<ProfileState>((set) => {
  return {
    profile: DEFAULT_PROFILE,
    isProfileModalOpen: false,
    initProfile: () => {
      if (typeof window === "undefined") return;
      try {
        const stored = localStorage.getItem("satquery_user_profile");
        if (stored) {
          set({ profile: { ...DEFAULT_PROFILE, ...JSON.parse(stored) } });
        }
      } catch (e) {
        // Ignored
      }
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
