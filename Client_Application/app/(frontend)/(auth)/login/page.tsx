"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Globe, ArrowLeft, Mail, Lock, User, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { useProfileStore } from "@/store/useProfileStore";

export default function LoginPage() {
  const router = useRouter();
  const { updateProfile, setAuthenticated } = useProfileStore();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name: isSignUp ? name : undefined,
          mode: isSignUp ? "signup" : "login",
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.authenticated || !result.user) {
        throw new Error(result.error?.message || "Authentication failed.");
      }

      const user = result.user;
      const displayName = isSignUp
        ? user.name || name || "Researcher"
        : user.name || email.split("@")[0] || "Researcher";

      updateProfile({
        name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
        email: user.email || email,
        role: user.role || "Geospatial Analyst",
      });
      setAuthenticated(true);

      router.push("/chat");
    } catch (error) {
      console.error("Authentication failed", error);
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-screen bg-[#FAF6F0] text-[#1C1917] flex flex-col justify-between overflow-x-hidden selection:bg-accent/20 selection:text-primary">
      {/* Warm Still-life photo background softly diffused behind frosted glass */}
      <div
        className="fixed inset-0 pointer-events-none bg-cover bg-center bg-no-repeat opacity-35 scale-[1.02]"
        style={{ backgroundImage: "url('/images/warm-bg.png')" }}
      />
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-br from-[#FAF6F0]/85 via-[#F3E5D0]/80 to-[#EADCC9]/85 backdrop-blur-[24px]" />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,_rgba(200,109,59,0.08)_0%,_transparent_75%)]" />

      {/* Header Bar */}
      <header className="relative z-20 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-full bg-[#1C1917] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-all duration-200 ease-apple">
            <Globe className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-serif text-xl tracking-wide text-primary font-medium">
              SatQuery
            </span>
            <em className="font-serif italic text-lg text-accent">AI</em>
          </div>
          <span className="ml-1 text-[10px] font-mono font-semibold bg-white/50 backdrop-blur-md text-secondary px-2.5 py-0.5 rounded-full border border-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_6px_rgba(78,59,42,0.04)]">
            SIH 26167
          </span>
        </Link>

        <Link
          href="/"
          className="apple-interactive glass-pill flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-secondary hover:text-primary hover:bg-white/70 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 ease-apple"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-secondary" />
          <span>Back to Workspace</span>
        </Link>
      </header>

      {/* Main Authentication Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          {/* Card Container */}
          <div className="glass-card relative rounded-3xl p-8 shadow-2xl backdrop-blur-md transition-all border border-white/70">
            {/* Subtle Top Badge */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-secondary uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>Geospatial Intelligence Portal</span>
            </div>

            {/* Title Heading */}
            <div className="text-center space-y-1 mb-8">
              <h1 className="font-serif text-3xl text-primary font-normal tracking-tight">
                {isSignUp ? "Create Workspace Account" : "Access SatQuery AI"}
              </h1>
              <p className="text-xs text-secondary">
                {isSignUp
                  ? "Enter your research credentials to begin satellite analysis"
                  : "Sign in to manage satellite rasters, history, and AI runs"}
              </p>
            </div>

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono font-semibold text-secondary uppercase tracking-wider block">
                    Full Name
                  </label>
                  <div className="relative flex items-center">
                    <User className="w-4 h-4 text-accent absolute left-3.5 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="Dr. Maya Lin"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="glass-inner w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-primary placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent/40 font-medium transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-semibold text-secondary uppercase tracking-wider block">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-accent absolute left-3.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="analyst@isro.gov.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="glass-inner w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-primary placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent/40 font-medium transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono font-semibold text-secondary uppercase tracking-wider block">
                    Password
                  </label>
                  {!isSignUp && (
                    <button
                      type="button"
                      className="text-[11px] font-mono text-secondary hover:text-primary transition-colors"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-accent absolute left-3.5 pointer-events-none" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="glass-inner w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-primary placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent/40 font-medium transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="apple-interactive w-full mt-2 py-3 px-4 rounded-full bg-[#7F4B30] hover:bg-[#683c25] text-white font-medium text-xs tracking-wide shadow-[0_4px_14px_rgba(127,75,48,0.35)] ring-2 ring-[#7F4B30]/25 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 ease-apple flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                <span>{loading ? "Authenticating..." : isSignUp ? "Create Account" : "Sign In to Workspace"}</span>
                <ArrowRight className="w-3.5 h-3.5 text-white/90 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </form>

            {/* Toggle Mode */}
            <div className="mt-6 pt-5 border-t border-stone-200/50 text-center text-xs text-secondary">
              {isSignUp ? (
                <span>
                  Already have access?{" "}
                  <button
                    type="button"
                    onClick={() => setIsSignUp(false)}
                    className="font-semibold text-primary hover:text-accent underline"
                  >
                    Sign in
                  </button>
                </span>
              ) : (
                <span>
                  Need satellite vision access?{" "}
                  <button
                    type="button"
                    onClick={() => setIsSignUp(true)}
                    className="font-semibold text-primary hover:text-accent underline"
                  >
                    Register account
                  </button>
                </span>
              )}
            </div>
          </div>

          {/* Security Assurance Footer */}
          <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-secondary">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Multi-Band Encrypted Spatial Data Pipeline</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-4 text-center text-xs text-secondary/70 font-mono border-t border-stone-200/60">
        SatQuery AI • Autonomous Geospatial Vision-Language Architecture
      </footer>
    </div>
  );
}
