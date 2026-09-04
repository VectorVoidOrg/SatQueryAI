import { create } from "zustand";

export interface UserProfile {
  name: string;
  email: string;
  role: string;
}

interface ProfileState {
  profile: UserProfile;
  isProfileModalOpen: boolean;
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
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("satquery_user_profile");
      if (stored) {
        initialProfile = { ...DEFAULT_PROFILE, ...JSON.parse(stored) };
      }
    } catch (e) {
      // Ignored
    }
  }

  return {
    profile: initialProfile,
    isProfileModalOpen: false,
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
