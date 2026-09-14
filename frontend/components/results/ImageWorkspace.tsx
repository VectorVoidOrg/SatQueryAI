"use client";

import { useState } from "react";
import { Maximize2, X } from "lucide-react";
import type { SavedImagePreview } from "@/lib/history";
import type { VisualEvidence } from "@/lib/types/analyze";

interface ImageWorkspaceProps {
  images: SavedImagePreview[];
  evidence?: VisualEvidence | null;
}

export function ImageWorkspace({ images, evidence }: ImageWorkspaceProps) {
  const [fullscreen, setFullscreen] = useState<string | null>(null);
  const overlay = evidence?.overlay_png_base64 ? `data:image/png;base64,${evidence.overlay_png_base64}` : null;

  if (images.length === 0 && !overlay) {
    return <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-stone-300/70 p-6 text-center text-sm text-secondary dark:border-white/10">No visual input was saved for this response.</div>;
  }

  return (
    <section className="flex min-h-0 h-full flex-col gap-3 rounded-2xl border border-stone-300/70 bg-white/45 p-3 shadow-subtle dark:border-white/10 dark:bg-[#171512]/70">
      <div className="flex items-center justify-between px-1">
        <div><p className="font-serif text-xl text-primary">Visual workspace</p><p className="text-[10px] font-mono uppercase tracking-wider text-secondary">Uploaded imagery and evidence</p></div>
        {overlay && <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-1 text-[10px] font-mono text-accent">Boundary evidence</span>}
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {images.map((image) => <figure key={image.filename} className="group relative overflow-hidden rounded-xl border border-stone-200 bg-black/5 dark:border-white/10 dark:bg-black/20"><img src={image.data_url} alt={image.filename} className="max-h-[45vh] min-h-40 w-full object-contain" /><button type="button" onClick={() => setFullscreen(image.data_url)} className="absolute right-2 top-2 rounded-md bg-black/60 p-1.5 text-white opacity-0 transition group-hover:opacity-100" aria-label={`Expand ${image.filename}`}><Maximize2 className="h-4 w-4" /></button><figcaption className="truncate bg-white/70 px-3 py-2 text-xs text-secondary dark:bg-[#1F1B17]/90">{image.filename}</figcaption></figure>)}
        {overlay && <figure className="relative overflow-hidden rounded-xl border-2 border-accent bg-black shadow-[0_0_0_2px_rgba(200,109,59,0.18)] animate-pulse"><img src={overlay} alt="Highlighted boundary evidence" className="max-h-[45vh] min-h-40 w-full object-contain" /><figcaption className="bg-accent/10 px-3 py-2 text-xs font-medium text-accent">Highlighted boundary / visual evidence</figcaption></figure>}
      </div>
      {fullscreen && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-5" onClick={() => setFullscreen(null)}><button type="button" className="absolute right-5 top-5 rounded-full bg-white/15 p-2 text-white" onClick={() => setFullscreen(null)} aria-label="Close image"><X className="h-5 w-5" /></button><img src={fullscreen} alt="Expanded uploaded image" className="max-h-full max-w-full object-contain" /></div>}
    </section>
  );
}
