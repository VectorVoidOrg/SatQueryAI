"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { AuthScreen } from "@/components/auth/AuthScreen";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, configured } = useAuth();

  if (!configured) {
    return (
      <AuthScreen configurationError="Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to frontend/.env.local to continue." />
    );
  }

  if (loading) {
    return <div className="min-h-screen bg-[#FAF6F0] dark:bg-[#0F0E0C]" />;
  }

  return user ? <>{children}</> : <AuthScreen />;
}
