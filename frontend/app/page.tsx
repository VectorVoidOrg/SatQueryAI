"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Globe } from "lucide-react";
import { FrontierHero } from "@/components/home/FrontierHero";
import { FrontierPromptBox } from "@/components/home/FrontierPromptBox";
import { ResultsPanel } from "@/components/results/ResultsPanel";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";
import { SideNavbar } from "@/components/layout/SideNavbar";
import { ImageWorkspace } from "@/components/results/ImageWorkspace";
import { useAuth } from "@/components/auth/AuthProvider";
import { postAnalyze } from "@/lib/api/analyzeClient";
import { saveAnalysis, saveChatMessage } from "@/lib/history";
import type { SavedImagePreview } from "@/lib/history";
import { createImagePreviewData } from "@/lib/imagePreview";
import { toast } from "@/store/useToastStore";
import type { AnalyzeFormValues, AnalyzeResponse } from "@/lib/types/analyze";

const ANALYSIS_LOADING_STEPS = [
  { text: "Uploading imagery and query" },
  { text: "Preparing spatial analysis pipeline" },
  { text: "Running specialist VLM inference" },
  { text: "Cross-checking visual evidence" },
  { text: "Assembling your answer" },
] as const;
const LOADER_STEP_DURATION_MS = 2000;
const LOADER_MINIMUM_DURATION_MS = ANALYSIS_LOADING_STEPS.length * LOADER_STEP_DURATION_MS;

interface ConversationTurn {
  query: string;
  response: AnalyzeResponse;
  imagePreviews: SavedImagePreview[];
}

function waitForRemainingLoaderTime(startedAt: number) {
  const remaining = LOADER_MINIMUM_DURATION_MS - (Date.now() - startedAt);
  return remaining > 0 ? new Promise<void>((resolve) => setTimeout(resolve, remaining)) : Promise.resolve();
}

export default function HomePage() {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [imagePreviews, setImagePreviews] = useState<SavedImagePreview[]>([]);
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [conversationId, setConversationId] = useState(() => crypto.randomUUID());

  const focusQuery = () => {
    document.getElementById("satquery-prompt")?.focus();
  };

  const handleSelectSuggestion = (query: string) => {
    setPrompt(query);
  };

  const handleSubmitForm = async (form: AnalyzeFormValues) => {
    const loaderStartedAt = Date.now();
    setIsSubmitting(true);
    setRefusal(null);
    try {
      const generatedPreviews = (await Promise.all(
        form.images.map(async (slot) => ({
          filename: slot.file.name,
          data: await createImagePreviewData(slot.file),
        }))
      )).filter((image): image is { filename: string; data: { preview: string; bounds: [number, number, number, number] | null } } => Boolean(image.data.preview))
        .map((image): SavedImagePreview => ({
          filename: image.filename,
          data_url: image.data.preview,
          bounds: image.data.bounds,
        }));
      setImagePreviews(generatedPreviews);

      if (user) {
        const chatSave = await saveChatMessage({
          userId: user.id,
          turnId: conversationId,
          role: "user",
          content: form.query,
        });
        if (chatSave.error) toast.error("Prompt was not saved", chatSave.error.message);
      }

      const res = await postAnalyze({
        ...form,
        conversationId,
        conversationContext: conversation.slice(-6).map((turn) => ({
          query: turn.query,
          answer: turn.response.answer.slice(0, 3000),
        })),
      });

      if (!res.ok) {
        setRefusal(res.detail);
        return;
      }

      setResult(res.data);
      setConversation((current) => [...current, { query: form.query, response: res.data, imagePreviews: generatedPreviews }]);
      if (user) {
        const analysisSave = await saveAnalysis(user.id, form.query, res.data);
        if (analysisSave.error) toast.error("Analysis history was not saved", analysisSave.error.message);

        const assistantSave = await saveChatMessage({
          userId: user.id,
          turnId: conversationId,
          role: "assistant",
          content: res.data.answer,
          response: { ...res.data, image_previews: generatedPreviews },
        });
        if (assistantSave.error) toast.error("Model response was not saved", assistantSave.error.message);
        setHistoryRefreshKey((value) => value + 1);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "The analysis could not be completed.";
      setRefusal(message);
      toast.error("Analysis failed", message);
    } finally {
      await waitForRemainingLoaderTime(loaderStartedAt);
      setIsSubmitting(false);
    }
  };

  const handleNewAnalysis = () => {
    setPrompt("");
    setRefusal(null);
    setResult(null);
    setImagePreviews([]);
    setConversation([]);
    setConversationId(crypto.randomUUID());
  };

  const workspaceTurn = [...conversation].reverse().find((turn) => turn.imagePreviews.length > 0);

  return (
    <div className="relative min-h-screen w-screen bg-[#FAF6F0] text-primary dark:bg-[#0F0E0C] dark:text-[#F3EEE7] overflow-x-hidden selection:bg-accent/20 selection:text-primary transition-colors duration-300">
      <SideNavbar refreshKey={historyRefreshKey} onNewChat={handleNewAnalysis} onSearchQuery={focusQuery} onCollapsedChange={setSidebarCollapsed} />
      {/* Background aesthetics */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-br from-[#FAF6F0]/85 via-[#F3E5D0]/80 to-[#EADCC9]/85 dark:hidden backdrop-blur-[24px]" />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,_rgba(200,109,59,0.08)_0%,_transparent_75%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,_rgba(200,109,59,0.05)_0%,_transparent_75%)]" />

      {/* Reappearing brand when the navigation is fully closed. */}
      {sidebarCollapsed && <header className="relative z-20 px-6 py-4 animate-navbar-reveal">
        <Link href="/" onClick={handleNewAnalysis} className="flex w-fit items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1C1917] text-white shadow-xs transition-transform group-hover:scale-105 dark:bg-[#1F1B17]"><Globe className="h-4 w-4" /></div>
          <span className="font-serif text-xl font-medium tracking-wide text-primary">SatQuery <em className="text-accent">AI</em></span>
        </Link>
      </header>}

      {/* Main Content */}
      <main className={`relative z-10 flex min-h-[calc(100vh-100px)] flex-col px-4 py-6 transition-[margin] duration-300 ease-apple ${sidebarCollapsed ? "lg:ml-0" : "lg:ml-72"} ${conversation.length > 0 ? "h-[calc(100vh-100px)] overflow-hidden" : "items-center justify-center"}`}>
        {!result && (
          <>
            <FrontierHero onSelectSuggestion={handleSelectSuggestion} />
            <FrontierPromptBox
              value={prompt}
              onChange={setPrompt}
              onSubmitPrompt={handleSubmitForm}
              isSubmitting={isSubmitting}
            />
          </>
        )}

        {/* Loading Spinner */}
        {isSubmitting && conversation.length === 0 && (
          <div className="w-full rounded-2xl border border-stone-300/70 bg-[#1C1917] px-3 py-2 shadow-[0_16px_40px_-8px_rgba(78,59,42,0.22)] dark:border-white/10">
            <MultiStepLoader
              loading={isSubmitting}
              loadingStates={ANALYSIS_LOADING_STEPS}
              duration={LOADER_STEP_DURATION_MS}
              className="py-2"
              isModal
            />
          </div>
        )}

        {conversation.length > 0 && (
          <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col">
            <div className={`grid min-h-0 flex-1 gap-5 ${imagePreviews.length > 0 ? "lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]" : "max-w-3xl w-full mx-auto"}`}>
              {workspaceTurn && <ImageWorkspace images={workspaceTurn.imagePreviews} evidence={workspaceTurn.response.visual_evidence} />}
              <section className="flex min-h-0 min-w-0 flex-col rounded-2xl border border-stone-300/70 bg-white/35 p-3 shadow-subtle dark:border-white/10 dark:bg-[#171512]/55">
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pr-1">
                  {conversation.map((turn, index) => <article key={`${turn.query}-${index}`} className="space-y-3"><div className="ml-auto max-w-[90%] rounded-2xl rounded-br-md bg-[#1C1917] px-4 py-3 text-sm text-white shadow-subtle">{turn.query}</div><ResultsPanel data={turn.response} imagePreviews={turn.imagePreviews} showImages={false} dense conversation={conversation.map((item) => ({ query: item.query, response: item.response }))} /></article>)}
                </div>
                <div className="shrink-0 border-t border-stone-300/50 pt-3 dark:border-white/10"><FrontierPromptBox value={prompt} onChange={setPrompt} onSubmitPrompt={handleSubmitForm} isSubmitting={isSubmitting} compact /></div>
              </section>
            </div>
          </div>
        )}
        {refusal && <p className="mx-auto mt-4 text-sm text-rose-600">{refusal}</p>}
      </main>

      {sidebarCollapsed && <footer className="relative z-10 px-6 py-4 text-center text-xs text-secondary/70 dark:text-[#91877D] font-mono flex items-center justify-between border-t border-stone-300/40 dark:border-white/10 mt-12">
        <span>SatQuery AI • Autonomous Geospatial Vision-Language Architecture</span>
        <span className="text-secondary/50">SIH 26167 Hackathon Build</span>
      </footer>}
    </div>
  );
}
