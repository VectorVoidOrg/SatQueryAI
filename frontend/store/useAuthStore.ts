import { create } from "zustand";
import { useProfileStore, UserProfile } from "@/store/useProfileStore";
import { toast } from "@/store/useToastStore";

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: UserProfile;
  login: (credentials: { email: string; password?: string; name?: string }) => Promise<void>;
  logout: () => void;
  syncFromProfile: (profile: UserProfile) => void;
}

const STORAGE_KEY = "satquery_auth_token";

export const useAuthStore = create<AuthState>((set, get) => {
  let initialToken: string | null = "demo_token_sih26167";
  let isAuthenticated = true;

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        initialToken = stored || null;
        isAuthenticated = Boolean(stored);
      }
    } catch (e) {
      // Ignored
    }
  }

  const initialProfile = useProfileStore.getState().profile;

  return {
    isAuthenticated,
    token: initialToken,
    user: initialProfile,

    login: async ({ email, password, name }) => {
      // Clean auth abstraction: ready for real JWT / OAuth backend endpoint
      const syntheticToken = `sq_jwt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const updatedName = name || email.split("@")[0].replace(".", " ");
      const formattedName =
        updatedName.charAt(0).toUpperCase() + updatedName.slice(1);

      const updatedUser: UserProfile = {
        name: formattedName,
        email,
        role: "Remote Sensing Analyst & Evaluator",
      };

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, syntheticToken);
        } catch (e) {}
      }

      // Update both auth state and profile state to prevent conflicts
      useProfileStore.getState().updateProfile(updatedUser);

      set({
        isAuthenticated: true,
        token: syntheticToken,
        user: updatedUser,
      });

      toast.success("Authenticated successfully", `Welcome back, ${updatedUser.name}`);
    },

    logout: () => {
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (e) {}
      }

      set({
        isAuthenticated: false,
        token: null,
      });

      toast.info("Logged out", "Operating in guest review mode");
    },

    syncFromProfile: (profile: UserProfile) => {
      set({ user: profile });
    },
  };
});
