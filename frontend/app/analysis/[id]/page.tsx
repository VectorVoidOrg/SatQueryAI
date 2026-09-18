"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Globe, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { fetchReportJson } from "@/lib/api/reportClient";
import { ResultsPanel } from "@/components/results/ResultsPanel";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { ProfileMenu } from "@/components/auth/ProfileMenu";
import { toast } from "@/store/useToastStore";
import { ReportVisuals } from "@/components/results/ReportVisuals";
import type { AnalyzeResponse } from "@/lib/types/analyze";
import type { SavedImagePreview } from "@/lib/history";
import { getAnalysisByReportId } from "@/lib/history";
import { useAuth } from "@/components/auth/AuthProvider";

interface AnalysisPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function AnalysisPage({ params }: AnalysisPageProps) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [imagePreviews, setImagePreviews] = useState<SavedImagePreview[]>([]);

  useEffect(() => {
    if (!error) return;
    const timeout = window.setTimeout(() => setError(null), 7000);
    return () => window.clearTimeout(timeout);
  }, [error]);

  useEffect(() => {
    let isMounted = true;

    async function loadReport() {
      setLoading(true);
      setError(null);

      const res = await fetchReportJson(id);
      if (!isMounted) return;

      setLoading(false);
      if (res.ok) {
        setData(res.data);
      } else {
        const saved = user ? await getAnalysisByReportId(user.id, id) : { data: null, error: null };
        if (saved.data?.response) {
          setData(saved.data.response);
        } else {
          const detail = saved.error?.message ?? res.detail;
          setError(detail);
          toast.error("Report unavailable", detail);
        }
      }
    }

    loadReport();

    return () => {
      isMounted = false;
    };
  }, [id, user]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`satquery-report-images-${id}`);
      if (saved) setImagePreviews(JSON.parse(saved) as SavedImagePreview[]);
    } catch {
      setImagePreviews([]);
    }
  }, [id]);

  return (
    <div className="relative min-h-screen w-screen bg-[#FAF6F0]/65 dark:bg-[#0F0E0C]/75 text-primary overflow-x-hidden selection:bg-accent/20 selection:text-primary transition-colors duration-300">
      <header className="relative z-20 px-6 py-4 flex items-center justify-between border-b border-stone-300/40 dark:border-white/10">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-full bg-[#1C1917] dark:bg-[#1F1B17] text-white flex items-center justify-center shadow-xs">
            <Globe className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-serif text-xl tracking-wide text-primary font-medium">
              SatQuery
            </span>
            <em className="font-serif italic text-lg text-accent">AI</em>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <button type="button" onClick={() => window.history.length > 1 ? router.back() : router.push("/")} className="inline-flex items-center gap-1.5 rounded-full border border-stone-300/70 px-3 py-1.5 text-xs text-secondary hover:text-primary transition-colors font-mono dark:border-white/10">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Escape</span>
          </button>
          <ThemeToggle />
            <ProfileMenu />
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
        {loading && (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
            <p className="text-sm font-mono text-secondary">
              Loading report record {id}…
            </p>
          </div>
        )}

        {error && (
          <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 space-y-2 font-mono text-xs">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <span>Report Not Found</span>
            </div>
            <p>{error}</p>
            <p className="text-[11px] opacity-80 pt-2">
              Note: Backend reports are stored in memory per process run. If the backend server restarted, previous report IDs are cleared.
            </p>
          </div>
        )}

        {data && <>
          <div className="rounded-2xl border border-stone-300/70 bg-white/65 p-5 shadow-subtle dark:border-white/10 dark:bg-[#171512]/80">
            <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-secondary">SatQuery AI report</p>
            <h1 className="mt-1 break-words font-serif text-3xl text-primary">{data.query}</h1>
            <p className="mt-2 text-xs text-secondary">Generated from the received analysis output. Visuals are derived from the response metrics and input modalities.</p>
          </div>
          <ReportVisuals data={data} />
          <ResultsPanel data={data} imagePreviews={imagePreviews} showReportActions={false} />
        </>}
      </main>
    </div>
  );
}
