"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { Globe, Lock, Mail, User, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { EnvironmentStatusBadge } from "@/components/common/EnvironmentStatusBadge";
import { ThemeToggle } from "@/components/common/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, user } = useAuthStore();

  const [email, setEmail] = useState("dhawal@satquery.ai");
  const [password, setPassword] = useState("••••••••");
  const [name, setName] = useState("Dr. Dhawal Gupta");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await login({ email, password, name });
    setIsSubmitting(false);
    router.push("/analysis/c_sundarbans_demo");
  };

  const handleGuestContinue = async () => {
    await login({ email: "guest.analyst@isro.gov.in", name: "Guest Evaluator" });
    router.push("/analysis/c_sundarbans_demo");
  };

  return (
    <div className="relative min-h-screen w-screen bg-[#FAF6F0] dark:bg-[#0F0E0C] text-primary flex flex-col justify-between overflow-x-hidden selection:bg-accent/20 selection:text-primary transition-colors duration-300">
      {/* Warm Background - hidden in dark mode */}
      <div
        className="fixed inset-0 pointer-events-none bg-cover bg-center bg-no-repeat opacity-35 dark:hidden scale-[1.02]"
        style={{ backgroundImage: "url('/images/warm-bg.png')" }}
      />
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-br from-[#FAF6F0]/85 via-[#F3E5D0]/80 to-[#EADCC9]/85 dark:hidden backdrop-blur-[24px]" />

      {/* Header */}
      <header className="relative z-20 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-full bg-[#1C1917] dark:bg-[#1F1B17] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-all duration-200 ring-1 ring-white/10">
            <Globe className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-serif text-xl tracking-wide text-primary font-medium">
              SatQuery
            </span>
            <em className="font-serif italic text-lg text-accent">AI</em>
          </div>
          <span className="ml-1 text-[10px] font-mono font-semibold bg-white/50 dark:bg-[#1F1B17] backdrop-blur-md text-secondary dark:text-[#B8AEA3] px-2.5 py-0.5 rounded-full border border-white/60 dark:border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_6px_rgba(78,59,42,0.04)] dark:shadow-none">
            SIH 26167
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <EnvironmentStatusBadge />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Login Card */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="glass-card w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-[0_24px_50px_rgba(78,59,42,0.12)] dark:shadow-[0_24px_50px_rgba(0,0,0,0.6)] border border-white/80 dark:border-white/10 animate-fade-in-up space-y-6">
          {/* Card Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#1C1917] dark:bg-[#1F1B17] text-white flex items-center justify-center mx-auto mb-3 shadow-xs ring-1 ring-white/10">
              <Globe className="w-6 h-6 text-accent" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl text-primary font-medium tracking-tight">
              Analyst Authentication
            </h1>
            <p className="text-xs text-secondary leading-relaxed max-w-xs mx-auto">
              Access calibrated satellite assets, autonomous model orchestration, and verifiable audit records.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-medium text-primary flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-accent" /> Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Dhawal Gupta"
                className="glass-inner w-full px-3.5 py-2.5 rounded-xl text-primary placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent/40 font-medium transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-primary flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-accent" /> Organization Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@organization.org"
                className="glass-inner w-full px-3.5 py-2.5 rounded-xl text-primary placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent/40 font-medium transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-primary flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-accent" /> Security Key / Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-inner w-full px-3.5 py-2.5 rounded-xl text-primary placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent/40 font-medium transition-all"
              />
            </div>

            <div className="pt-2 space-y-2.5">
              <button
                type="submit"
                disabled={isSubmitting}
                className="apple-interactive w-full py-2.5 px-4 rounded-xl bg-[#7F4B30] hover:bg-[#965A3B] text-white text-xs font-semibold shadow-[0_4px_14px_rgba(127,75,48,0.25)] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{isSubmitting ? "Authenticating..." : "Sign In to Workspace"}</span>
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              </button>

              <button
                type="button"
                onClick={handleGuestContinue}
                className="apple-interactive w-full py-2 px-4 rounded-xl bg-white/60 dark:bg-[#1F1B17] hover:bg-white dark:hover:bg-[#2A241F] text-secondary hover:text-primary dark:text-[#B8AEA3] dark:hover:text-[#F3EEE7] text-xs font-medium border border-stone-200/80 dark:border-white/10 transition-all duration-200 flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>Continue as Evaluator (Guest Access)</span>
              </button>
            </div>
          </form>

          {/* Defense & Scientific notice */}
          <div className="flex items-center gap-2 pt-2 border-t border-stone-200/60 dark:border-white/10 text-[11px] text-secondary/80">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>SIH 26167 Standard Session Authentication</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-4 text-center text-xs text-secondary/70 dark:text-[#847A70] font-mono flex items-center justify-between border-t border-stone-300/40 dark:border-white/10">
        <span>SatQuery AI • Autonomous Geospatial Vision-Language Architecture</span>
        <Link href="/" className="hover:underline hover:text-accent transition-colors">
          &larr; Back to Prompt Home
        </Link>
      </footer>
    </div>
  );
}
