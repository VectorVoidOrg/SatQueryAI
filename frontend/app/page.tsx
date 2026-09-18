"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Globe } from "lucide-react";
import { FrontierHero } from "@/components/home/FrontierHero";
import { FrontierPromptBox } from "@/components/home/FrontierPromptBox";
import { ResultsPanel } from "@/components/results/ResultsPanel";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";
import { SideNavbar } from "@/components/layout/SideNavbar";
import { ImageWorkspace } from "@/components/results/ImageWorkspace";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { useAuth } from "@/components/auth/AuthProvider";
import { postAnalyze } from "@/lib/api/analyzeClient";
import { saveAnalysis, saveChatMessage } from "@/lib/history";
import type { SavedImagePreview } from "@/lib/history";
import { createImagePreviewData } from "@/lib/imagePreview";
import { saveConversationImages } from "@/lib/promptDraft";
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

const HOME_STATE_KEY = "satquery_active_home_state";
const HOME_STATE_MAX_AGE_MS = 5 * 60 * 1000;

function waitForRemainingLoaderTime(startedAt: number) {
  const remaining = LOADER_MINIMUM_DURATION_MS - (Date.now() - startedAt);
  return remaining > 0 ? new Promise<void>((resolve) => setTimeout(resolve, remaining)) : Promise.resolve();
}

export default function HomePage() {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [imagePreviews, setImagePreviews] = useState<SavedImagePreview[]>([]);
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [conversationId, setConversationId] = useState(() => crypto.randomUUID());
  const [sessionImages, setSessionImages] = useState<AnalyzeFormValues["images"]>([]);
  const restoredStateRef = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(HOME_STATE_KEY);
      if (saved) {
        const state = JSON.parse(saved) as {
          result?: AnalyzeResponse | null;
          conversation?: ConversationTurn[];
          imagePreviews?: SavedImagePreview[];
          conversationId?: string;
          savedAt?: number;
        };
        const isFresh = typeof state.savedAt === "number" && Date.now() - state.savedAt <= HOME_STATE_MAX_AGE_MS;
        if (isFresh) {
          if (state.result) setResult(state.result);
          if (Array.isArray(state.conversation)) setConversation(state.conversation);
          if (Array.isArray(state.imagePreviews)) setImagePreviews(state.imagePreviews);
          if (state.conversationId) setConversationId(state.conversationId);
        } else {
          localStorage.removeItem(HOME_STATE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(HOME_STATE_KEY);
    } finally {
      restoredStateRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!restoredStateRef.current) return;
    try {
      if (conversation.length === 0 && !result) {
        localStorage.removeItem(HOME_STATE_KEY);
      } else {
        localStorage.setItem(HOME_STATE_KEY, JSON.stringify({ result, conversation, imagePreviews, conversationId, savedAt: Date.now() }));
      }
    } catch {
      // Large image data can exceed storage limits; the live page remains usable.
    }
  }, [conversation, result, imagePreviews, conversationId]);

  React.useEffect(() => {
    if (!refusal) return;
    const timeout = window.setTimeout(() => setRefusal(null), 7000);
    return () => window.clearTimeout(timeout);
  }, [refusal]);

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
      if (form.images.length > 0) setSessionImages(form.images);

      const requestForm = {
        ...form,
        images: form.images.length > 0 ? form.images : sessionImages,
        conversationId,
        conversationContext: conversation.slice(-6).map((turn) => ({
          query: turn.query,
          answer: turn.response.answer.slice(0, 3000),
        })),
      };
      if (form.images.length > 0) {
        void saveConversationImages(conversationId, form.images).catch(() => undefined);
      }
      const res = await postAnalyze(requestForm);

      if (!res.ok) {
        setRefusal(res.detail);
        setIsSubmitting(false);
        toast.error("Analysis failed", res.detail);
        return;
      }

      setResult(res.data);
      setConversation((current) => [...current, { query: form.query, response: res.data, imagePreviews: generatedPreviews }]);
      if (user) {
        const chatSave = await saveChatMessage({
          userId: user.id,
          turnId: conversationId,
          role: "user",
          content: form.query,
        });
        if (chatSave.error) toast.error("Prompt was not saved", chatSave.error.message);

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
      setIsSubmitting(false);
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
    setSessionImages([]);
    localStorage.removeItem(HOME_STATE_KEY);
  };

  const workspaceTurn = [...conversation].reverse().find((turn) => turn.imagePreviews.length > 0);
  return (
    <div className="relative min-h-screen w-screen bg-[#FAF6F0]/65 text-primary dark:bg-[#0F0E0C]/75 dark:text-[#F3EEE7] overflow-x-hidden selection:bg-accent/20 selection:text-primary transition-colors duration-300">
      <SideNavbar refreshKey={historyRefreshKey} onNewChat={handleNewAnalysis} onCollapsedChange={setSidebarCollapsed} initialCollapsed />
      {/* Background aesthetics */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-br from-[#FAF6F0]/25 via-[#F3E5D0]/20 to-[#EADCC9]/25 dark:hidden backdrop-blur-[8px]" />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,_rgba(200,109,59,0.08)_0%,_transparent_75%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,_rgba(200,109,59,0.05)_0%,_transparent_75%)]" />

      {/* Reappearing brand when the navigation is fully closed. */}
      {sidebarCollapsed && <header className="relative z-20 px-6 py-4 animate-navbar-reveal">
        <div className="flex items-center gap-3">
        <Link href="/" onClick={handleNewAnalysis} className="flex w-fit items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1C1917] text-white shadow-xs transition-transform group-hover:scale-105 dark:bg-[#1F1B17]"><Globe className="h-4 w-4" /></div>
          <span className="font-serif text-xl font-medium tracking-wide text-primary">SatQuery <em className="text-accent">AI</em></span>
        </Link>
        </div>
      </header>}

      {/* Main Content */}
      <main className={`relative z-10 flex min-h-[calc(100vh-100px)] flex-col px-4 py-6 ${conversation.length > 0 ? "lg:h-[calc(100vh-100px)] lg:overflow-hidden" : "items-center justify-center"}`}>
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
          <div className="mx-auto flex h-full w-full max-w-[1440px] min-h-0 flex-col">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-secondary">Conversation</p>
                <h1 className="font-serif text-2xl text-primary">Continue your analysis</h1>
              </div>
              <button type="button" onClick={handleNewAnalysis} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-stone-300/70 px-3 py-1.5 text-xs text-secondary transition hover:text-primary dark:border-white/10"><ArrowLeft className="h-3.5 w-3.5" /> New Query</button>
            </div>
            <div className={`grid min-h-0 w-full flex-1 items-stretch gap-2 ${workspaceTurn ? "lg:mx-auto lg:h-[calc(100vh-9rem)] lg:max-w-[1280px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : "max-w-3xl mx-auto"}`}>
              {workspaceTurn && <div className="box-border min-h-0 w-full overscroll-contain lg:flex lg:h-full lg:items-start lg:overflow-y-auto lg:pb-8"><ImageWorkspace images={workspaceTurn.imagePreviews} evidence={workspaceTurn.response.visual_evidence} data={workspaceTurn.response} /></div>}
              <section className="box-border flex h-full min-h-0 min-w-0 w-full flex-col rounded-2xl border border-stone-300/70 bg-white/35 p-3 pb-5 text-xs shadow-subtle dark:border-white/10 dark:bg-[#171512]/55 lg:overflow-y-auto">
                <div className="space-y-5 pr-2 pb-2">
                  {conversation.map((turn, index) => <article key={`${turn.query}-${index}`} className="space-y-3"><Bubble align="end"><BubbleContent>{turn.query}</BubbleContent></Bubble><ResultsPanel data={turn.response} imagePreviews={turn.imagePreviews} showImages={false} dense conversation={conversation.map((item) => ({ query: item.query, response: item.response, imagePreviews: item.imagePreviews }))} /></article>)}
                </div>
                <div className="shrink-0 pt-3"><FrontierPromptBox value={prompt} onChange={setPrompt} onSubmitPrompt={handleSubmitForm} isSubmitting={isSubmitting} compact /></div>
              </section>
            </div>
          </div>
        )}
        {refusal && <p className="mx-auto mt-4 text-sm text-rose-600">{refusal}</p>}
      </main>

    </div>
  );
}
