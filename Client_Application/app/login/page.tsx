"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Globe, ArrowLeft, Mail, Lock, User, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { useProfileStore } from "@/store/useProfileStore";

export default function LoginPage() {
  const router = useRouter();
  const { updateProfile } = useProfileStore();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      const displayName = isSignUp
        ? name || "Researcher"
        : email.split("@")[0] || "Researcher";

      updateProfile({
        name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
        email: email || "dhawal@satquery.ai",
        role: "Geospatial Analyst",
      });

      setLoading(false);
      router.push("/");
    }, 600);
  };

  return (
    <div className="relative min-h-screen w-screen bg-base text-primary flex flex-col justify-between overflow-x-hidden">
      {/* Ambient radial lighting */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_rgba(15,23,42,0.03)_0%,_transparent_75%)]" />

      {/* Header Bar */}
      <header className="relative z-20 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <Globe className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-serif text-xl tracking-wide text-slate-900 font-medium">
              SatQuery
            </span>
            <em className="font-serif italic text-lg text-slate-500">AI</em>
          </div>
          <span className="ml-1 text-[10px] font-mono font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">
            SIH 26167
          </span>
        </Link>

        <Link
          href="/"
          className="liquid-glass flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-700 hover:text-slate-950 hover:bg-white border border-slate-200/80 transition-all shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
          <span>Back to Workspace</span>
        </Link>
      </header>

      {/* Main Authentication Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          {/* Card Container */}
          <div className="liquid-glass relative rounded-3xl border border-slate-200/90 bg-white/80 p-8 shadow-xl backdrop-blur-md transition-all">
            {/* Subtle Top Badge */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-sky-500" />
              <span>Geospatial Intelligence Portal</span>
            </div>

            {/* Title Heading */}
            <div className="text-center space-y-1 mb-8">
              <h1 className="font-serif text-2xl text-slate-900 font-semibold tracking-tight">
                {isSignUp ? "Create Workspace Account" : "Access SatQuery AI"}
              </h1>
              <p className="text-xs text-slate-500">
                {isSignUp
                  ? "Enter your research credentials to begin satellite analysis"
                  : "Sign in to manage satellite rasters, history, and AI runs"}
              </p>
            </div>

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono font-semibold text-slate-600 uppercase tracking-wider block">
                    Full Name
                  </label>
                  <div className="relative flex items-center">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="Dr. Maya Lin"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/90 bg-white/90 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-semibold text-slate-600 uppercase tracking-wider block">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="analyst@isro.gov.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/90 bg-white/90 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono font-semibold text-slate-600 uppercase tracking-wider block">
                    Password
                  </label>
                  {!isSignUp && (
                    <button
                      type="button"
                      className="text-[11px] font-mono text-slate-400 hover:text-slate-800 transition-colors"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/90 bg-white/90 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-full bg-slate-900 text-white font-medium text-xs tracking-wide hover:bg-black active:scale-[0.99] transition-all shadow-md flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                <span>{loading ? "Authenticating..." : isSignUp ? "Create Account" : "Sign In to Workspace"}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </form>

            {/* Toggle Mode */}
            <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
              {isSignUp ? (
                <span>
                  Already have access?{" "}
                  <button
                    type="button"
                    onClick={() => setIsSignUp(false)}
                    className="font-semibold text-slate-900 hover:underline"
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
                    className="font-semibold text-slate-900 hover:underline"
                  >
                    Register account
                  </button>
                </span>
              )}
            </div>
          </div>

          {/* Security Assurance Footer */}
          <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Multi-Band Encrypted Spatial Data Pipeline</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-4 text-center text-xs text-slate-400 font-mono border-t border-slate-200/60">
        SatQuery AI • Autonomous Geospatial Vision-Language Architecture
      </footer>
    </div>
  );
}