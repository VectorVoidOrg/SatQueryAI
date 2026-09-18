"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, Eye, EyeOff, Globe, Loader2, Mail, Sun, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useAuth } from "@/components/auth/AuthProvider";

export function AuthScreen({ configurationError, authMessage }: { configurationError?: string; authMessage?: string }) {
  const { enterGuestMode } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(configurationError ?? authMessage ?? null);
  const [messageTone, setMessageTone] = useState<"error" | "success">("error");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [authMessageVisible, setAuthMessageVisible] = useState(Boolean(authMessage));

  useEffect(() => {
    if (authMessage) {
      setMessage(authMessage);
      setAuthMessageVisible(true);
    }
  }, [authMessage]);

  useEffect(() => {
    if (!message || messageTone !== "error") return;
    const timeout = window.setTimeout(() => {
      setMessage(null);
      setAuthMessageVisible(false);
    }, 7000);
    return () => window.clearTimeout(timeout);
  }, [message, messageTone]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || submitting || configurationError) return;

    if (mode === "signup" && password !== confirmPassword) {
      setMessage("Passwords do not match.");
      setMessageTone("error");
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const result = mode === "signin"
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { data: { display_name: displayName.trim() || email.split("@")[0] } },
          });

      if (result.error) {
        const isExistingUser = mode === "signup" && /already registered|already exists|user exists/i.test(result.error.message);
        setMessage(isExistingUser ? "User already exists, kindly sign in." : result.error.message);
        setMessageTone("error");
      } else if (mode === "signup" && result.data.user?.identities?.length === 0) {
        setMessage("User already exists, kindly sign in.");
        setMessageTone("error");
      } else if (mode === "signup" && !result.data.session) {
        setMessage("Account created. Check your email to confirm it, then sign in.");
        setMessageTone("success");
      }
    } catch {
      setMessage("We could not reach Supabase. Check your connection and try again.");
      setMessageTone("error");
    } finally {
      setSubmitting(false);
    }
  };

  const resendConfirmation = async () => {
    if (!supabase || !email.trim() || resending) return;
    setResending(true);
    setMessage(null);
    const { error } = await supabase.auth.resend({ type: "signup", email: email.trim() });
    setMessage(error ? error.message : "Confirmation email sent. Check your inbox and spam folder.");
    setMessageTone(error ? "error" : "success");
    setResending(false);
  };

  const switchMode = () => {
    setMode((current) => current === "signin" ? "signup" : "signin");
    setMessage(configurationError ?? null);
    setMessageTone("error");
    setPassword("");
    setConfirmPassword("");
  };

  const inputClassName = "mt-1.5 w-full rounded-lg border border-stone-300 bg-white/80 px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-white/10 dark:bg-[#0F0E0C]";

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-[#FAF6F0]/65 dark:bg-[#0F0E0C]/75 px-4 py-10 text-primary dark:text-[#F3EEE7]">
      <div className="absolute right-16 top-4"><ThemeToggle popoverPlacement="bottom" /></div>
      <section className="w-full max-w-md rounded-2xl border border-stone-300/70 bg-white/70 p-7 shadow-[0_24px_70px_-30px_rgba(78,59,42,0.35)] dark:border-white/10 dark:bg-[#171512]">
        <div className="mb-8 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1C1917] text-white"><Globe className="h-4 w-4" /></div>
          <div className="flex items-baseline gap-1.5"><span className="font-serif text-2xl">SatQuery</span><em className="font-serif text-xl text-accent">AI</em></div>
          </div>
          <Sun className="h-4 w-4 text-accent" aria-hidden="true" />
        </div>
        <div className="mb-6">
          <h1 className="font-serif text-3xl">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-2 text-sm text-secondary">{mode === "signin" ? "Sign in to access your private analysis workspace." : "Create an account to save your analysis history securely."}</p>
        </div>

        <form onSubmit={submit} className="space-y-4" noValidate>
          {mode === "signup" && <label className="block text-sm font-medium" htmlFor="display-name">Name <span className="font-normal text-secondary">(optional)</span><input id="display-name" name="name" autoComplete="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputClassName} /></label>}
          <label className="block text-sm font-medium" htmlFor="email">Email address<input id="email" name="email" required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClassName} /></label>
          <label className="block text-sm font-medium" htmlFor="password">Password<div className="relative"><input id="password" name="password" required minLength={8} type={showPassword ? "text" : "password"} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClassName} pr-11`} /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-secondary hover:text-primary" title={showPassword ? "Hide password" : "Show password"} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>
          {mode === "signup" && <label className="block text-sm font-medium" htmlFor="confirm-password">Confirm password<input id="confirm-password" name="confirm-password" required minLength={8} type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClassName} /></label>}
          {message && <div role="alert" className={`flex items-start gap-2 rounded-lg p-3 text-xs ${messageTone === "success" ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200" : "bg-amber-500/10 text-amber-800 dark:text-amber-200"}`}><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span className="min-w-0 flex-1">{message}</span>{authMessageVisible && <button type="button" onClick={() => { setMessage(null); setAuthMessageVisible(false); }} className="rounded p-0.5 text-current/70 transition hover:bg-black/5 hover:text-current dark:hover:bg-white/10" aria-label="Dismiss account message" title="Dismiss message"><X className="h-3.5 w-3.5" /></button>}</div>}
          <button type="submit" disabled={submitting || Boolean(configurationError)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1C1917] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#342D27] disabled:cursor-not-allowed disabled:opacity-50">{submitting && <Loader2 className="h-4 w-4 animate-spin" />}{submitting ? "Connecting..." : mode === "signin" ? "Sign in" : "Create account"}</button>
        </form>
        <div className="mt-5 flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.14em] text-secondary"><span className="h-px flex-1 bg-stone-200 dark:bg-white/10" /><span>or</span><span className="h-px flex-1 bg-stone-200 dark:bg-white/10" /></div>
        <button type="button" onClick={enterGuestMode} className="mt-4 flex w-full items-center justify-center rounded-lg border border-accent/40 bg-accent/10 px-4 py-2.5 text-xs font-medium text-accent transition hover:bg-accent/15 hover:shadow-sm">Continue as guest</button>
        <p className="mt-2 text-center text-[10px] text-secondary">Guest analyses stay on this device and are not saved to an account.</p>
        {mode === "signin" && <button type="button" onClick={() => void resendConfirmation()} disabled={resending || !email.trim() || Boolean(configurationError)} className="mt-4 flex w-full items-center justify-center gap-2 text-xs text-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"><Mail className="h-3.5 w-3.5" />{resending ? "Sending confirmation..." : "Resend confirmation email"}</button>}
        <div className="mt-5 border-t border-stone-200 pt-5 text-center dark:border-white/10"><button type="button" onClick={switchMode} className="text-xs text-secondary hover:text-primary">{mode === "signin" ? "Need an account? Create one" : "Already have an account? Sign in"}</button></div>
      </section>
    </main>
  );
}
