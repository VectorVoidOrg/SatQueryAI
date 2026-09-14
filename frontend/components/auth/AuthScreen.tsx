"use client";

import { FormEvent, useState } from "react";
import { AlertCircle, Eye, EyeOff, Globe, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export function AuthScreen({ configurationError }: { configurationError?: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(configurationError ?? null);
  const [messageTone, setMessageTone] = useState<"error" | "success">("error");
  const [submitting, setSubmitting] = useState(false);

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
        setMessage(result.error.message);
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

  const switchMode = () => {
    setMode((current) => current === "signin" ? "signup" : "signin");
    setMessage(configurationError ?? null);
    setMessageTone("error");
    setPassword("");
    setConfirmPassword("");
  };

  const inputClassName = "mt-1.5 w-full rounded-lg border border-stone-300 bg-white/80 px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-white/10 dark:bg-[#0F0E0C]";

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FAF6F0] dark:bg-[#0F0E0C] px-4 py-10 text-primary dark:text-[#F3EEE7]">
      <section className="w-full max-w-md rounded-2xl border border-stone-300/70 bg-white/70 p-7 shadow-[0_24px_70px_-30px_rgba(78,59,42,0.35)] dark:border-white/10 dark:bg-[#171512]">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1C1917] text-white"><Globe className="h-4 w-4" /></div>
          <div className="flex items-baseline gap-1.5"><span className="font-serif text-2xl">SatQuery</span><em className="font-serif text-xl text-accent">AI</em></div>
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
          {message && <p role="alert" className={`flex gap-2 rounded-lg p-3 text-xs ${messageTone === "success" ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200" : "bg-amber-500/10 text-amber-800 dark:text-amber-200"}`}><AlertCircle className="h-4 w-4 shrink-0" />{message}</p>}
          <button type="submit" disabled={submitting || Boolean(configurationError)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1C1917] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#342D27] disabled:cursor-not-allowed disabled:opacity-50">{submitting && <Loader2 className="h-4 w-4 animate-spin" />}{submitting ? "Connecting..." : mode === "signin" ? "Sign in" : "Create account"}</button>
        </form>
        <div className="mt-5 border-t border-stone-200 pt-5 text-center dark:border-white/10"><button type="button" onClick={switchMode} className="text-xs text-secondary hover:text-primary">{mode === "signin" ? "Need an account? Create one" : "Already have an account? Sign in"}</button></div>
      </section>
    </main>
  );
}
