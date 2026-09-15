"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ArrowRight,
  Paperclip,
  X,
  FileImage,
  Loader2,
  Plus,
  Calendar,
  ChevronDown,
  ChevronUp,
  PenLine,
  Eraser,
  Check,
} from "lucide-react";
import type { ImageSlot, Modality, AnalyzeFormValues } from "@/lib/types/analyze";
import { createImagePreview } from "@/lib/imagePreview";

interface FrontierPromptBoxProps {
  value: string;
  onChange: (val: string) => void;
  onSubmitPrompt: (form: AnalyzeFormValues) => Promise<void> | void;
  isSubmitting?: boolean;
  compact?: boolean;
}

const MODALITY_OPTIONS: { value: Modality; label: string }[] = [
  { value: "optical", label: "Optical" },
  { value: "multispectral", label: "Multispectral" },
  { value: "sar", label: "SAR" },
];

const ACCEPTED_EXTENSIONS = ".tif,.tiff,.png,.jpg,.jpeg";

function ImageSlotCard({
  slot,
  index,
  onRemove,
  onModalityChange,
  onTimestampChange,
  onHighlightChange,
  preview,
}: {
  slot: ImageSlot;
  index: number;
  onRemove: () => void;
  onModalityChange: (m: Modality) => void;
  onTimestampChange: (t: string) => void;
  onHighlightChange: (highlight: [number, number, number, number] | undefined) => void;
  preview: string | null;
}) {
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState<[number, number] | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTool, setEditorTool] = useState<"pen" | "eraser">("pen");
  const [draftHighlight, setDraftHighlight] = useState<[number, number, number, number] | undefined>(slot.highlight);
  const [drawingHighlight, setDrawingHighlight] = useState<[number, number, number, number] | undefined>(undefined);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setDraftHighlight(slot.highlight);
  }, [slot.highlight]);

  const getPoint = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = imageRef.current?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
    return [
      Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    ] as [number, number];
  };

  const finishHighlight = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drawing || !start || editorTool !== "pen") return;
    const end = getPoint(event);
    const x1 = Math.min(start[0], end[0]);
    const y1 = Math.min(start[1], end[1]);
    const x2 = Math.max(start[0], end[0]);
    const y2 = Math.max(start[1], end[1]);
    setDrawing(false);
    setStart(null);
    const completed: [number, number, number, number] = [x1, y1, x2, y2];
    if (x2 - x1 > 0.02 && y2 - y1 > 0.02) setDraftHighlight(completed);
    setDrawingHighlight(undefined);
  };

  const updateDrawingHighlight = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drawing || !start || editorTool !== "pen") return;
    const [endX, endY] = getPoint(event);
    setDrawingHighlight([
      Math.min(start[0], endX), Math.min(start[1], endY),
      Math.max(start[0], endX), Math.max(start[1], endY),
    ]);
  };

  const commitHighlight = () => {
    onHighlightChange(draftHighlight);
    setEditorOpen(false);
    setDrawing(false);
    setStart(null);
  };

  return (
    <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-stone-200/50 dark:bg-[#1F1B17] border border-stone-300/60 dark:border-white/10 animate-fade-in-up">
      {preview ? <div className="relative self-start inline-block w-fit max-w-full" onDragStart={(event) => event.preventDefault()}><img draggable={false} src={preview} alt={`Preview of ${slot.file.name}`} className="block max-h-44 max-w-full w-auto h-auto rounded-lg bg-black/5 dark:bg-black/20" />{slot.highlight && <div className="pointer-events-none absolute inset-0"><div className="absolute border-2 border-dotted border-accent bg-accent/20" style={{ left: `${slot.highlight[0] * 100}%`, top: `${slot.highlight[1] * 100}%`, width: `${(slot.highlight[2] - slot.highlight[0]) * 100}%`, height: `${(slot.highlight[3] - slot.highlight[1]) * 100}%` }} /></div>}</div> : <div className="flex h-20 items-center justify-center rounded-lg bg-stone-300/40 text-xs text-secondary dark:bg-black/20">Preparing preview...</div>}
      {preview && <div className="flex items-center gap-2"><button type="button" onClick={() => { setDraftHighlight(slot.highlight); setEditorTool("pen"); setEditorOpen(true); }} className="inline-flex items-center gap-1 rounded-md border border-stone-300/70 px-2 py-1 text-[10px] font-mono text-secondary transition-colors hover:border-accent hover:text-accent dark:border-white/10"><PenLine className="h-3 w-3" /> {slot.highlight ? "Edit zone" : "Highlight zone"}</button>{!slot.highlight && <span className="text-[10px] font-mono text-secondary">Open the pen to draw a focus area.</span>}</div>}
      {slot.highlight && <button type="button" onClick={() => onHighlightChange(undefined)} className="self-start text-[10px] font-mono text-accent hover:underline">Clear highlighted zone</button>}

      {editorOpen && preview && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-label={`Highlight ${slot.file.name}`}>
        <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#171512] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white">
            <div><p className="text-sm font-semibold">Highlight an area</p><p className="text-[10px] font-mono text-white/60">Draw only the region the model should analyze</p></div>
            <div className="flex items-center gap-1"><button type="button" onClick={() => setEditorTool("pen")} className={`rounded-lg p-2 ${editorTool === "pen" ? "bg-accent text-white" : "text-white/70 hover:bg-white/10"}`} aria-label="Pen tool" title="Pen tool"><PenLine className="h-4 w-4" /></button><button type="button" onClick={() => { setEditorTool("eraser"); setDraftHighlight(undefined); }} className={`rounded-lg p-2 ${editorTool === "eraser" ? "bg-accent text-white" : "text-white/70 hover:bg-white/10"}`} aria-label="Erase highlight" title="Erase highlight"><Eraser className="h-4 w-4" /></button><button type="button" onClick={commitHighlight} className="ml-2 rounded-lg bg-emerald-600 p-2 text-white hover:bg-emerald-500" aria-label="Apply highlight" title="Apply highlight"><Check className="h-4 w-4" /></button></div>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-black p-3 sm:p-6" onDragStart={(event) => { event.preventDefault(); event.stopPropagation(); }} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); }}>
            <div className={`relative self-start inline-block w-fit max-h-[72vh] max-w-full select-none ${editorTool === "pen" ? "cursor-crosshair" : "cursor-cell"}`} onPointerDown={(event) => { if (editorTool !== "pen") return; event.currentTarget.setPointerCapture(event.pointerId); setStart(getPoint(event)); setDrawingHighlight([getPoint(event)[0], getPoint(event)[1], getPoint(event)[0], getPoint(event)[1]]); setDrawing(true); }} onPointerMove={updateDrawingHighlight} onPointerUp={finishHighlight} onPointerCancel={() => { setDrawing(false); setStart(null); setDrawingHighlight(undefined); }}>
              <img ref={imageRef} draggable={false} src={preview} alt={`Highlight editor for ${slot.file.name}`} className="block max-h-[72vh] max-w-full w-auto h-auto object-contain" />
              {(drawingHighlight ?? draftHighlight) && <div className="pointer-events-none absolute border-2 border-dotted border-accent bg-accent/25" style={{ left: `${(drawingHighlight ?? draftHighlight)![0] * 100}%`, top: `${(drawingHighlight ?? draftHighlight)![1] * 100}%`, width: `${((drawingHighlight ?? draftHighlight)![2] - (drawingHighlight ?? draftHighlight)![0]) * 100}%`, height: `${((drawingHighlight ?? draftHighlight)![3] - (drawingHighlight ?? draftHighlight)![1]) * 100}%` }} />}
            </div>
          </div>
        </div>
      </div>}
      {/* Filename row */}
      <div className="flex items-center gap-2">
        <FileImage className="w-3.5 h-3.5 text-accent shrink-0" />
        <span className="font-mono text-xs text-primary font-medium truncate max-w-[200px]">
          {slot.file.name}
        </span>
        <span className="text-[10px] text-secondary font-mono ml-auto shrink-0">
          {(slot.file.size / (1024 * 1024)).toFixed(1)} MB
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-secondary hover:text-rose-500 p-0.5 rounded-full transition-colors shrink-0"
          title={`Remove image ${index + 1}`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Modality + Timestamp row */}
      <div className="flex items-center gap-2 pl-5">
        {/* Modality selector */}
        <select
          value={slot.modality}
          onChange={(e) => onModalityChange(e.target.value as Modality)}
          className="text-xs bg-white/60 dark:bg-[#171512] border border-stone-300/70 dark:border-white/10 rounded-lg px-2 py-1 text-primary font-medium focus:outline-none focus:ring-1 focus:ring-accent/40 cursor-pointer"
          title="Image modality"
        >
          {MODALITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Timestamp */}
        <div className="flex items-center gap-1 text-xs text-secondary">
          <Calendar className="w-3 h-3 shrink-0" />
          <input
            type="date"
            value={slot.timestamp}
            onChange={(e) => onTimestampChange(e.target.value)}
            className="bg-white/60 dark:bg-[#171512] border border-stone-300/70 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-accent/40 cursor-pointer"
            title="Acquisition date (required for change detection)"
          />
        </div>
      </div>
    </div>
  );
}

export const FrontierPromptBox: React.FC<FrontierPromptBoxProps> = ({
  value,
  onChange,
  onSubmitPrompt,
  isSubmitting = false,
  compact = false,
}) => {
  const [images, setImages] = useState<ImageSlot[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [bands, setBands] = useState("1,2,3");
  const [previews, setPreviews] = useState<Array<string | null>>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all(images.map((slot) => createImagePreview(slot.file))).then((nextPreviews) => {
      if (active) setPreviews(nextPreviews);
    });
    return () => {
      active = false;
    };
  }, [images]);

  const addFiles = (incoming: File[]) => {
    setFileError(null);
    setImages((prev) => {
      const existingKeys = new Set(prev.map((slot) => `${slot.file.name}:${slot.file.size}:${slot.file.lastModified}`));
      const newFiles = incoming.filter((file) => {
        const key = `${file.name}:${file.size}:${file.lastModified}`;
        if (existingKeys.has(key)) return false;
        existingKeys.add(key);
        return true;
      });
      const available = Math.max(0, 5 - prev.length);
      if (newFiles.length > available) setFileError("Maximum 5 unique images. Remove one first.");
      return [...prev, ...newFiles.slice(0, available).map((file) => ({ file, modality: "optical" as Modality, timestamp: "" }))];
    });
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setFileError(null);
  };

  const updateModality = (idx: number, m: Modality) => {
    setImages((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, modality: m } : s))
    );
  };

  const updateTimestamp = (idx: number, t: string) => {
    setImages((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, timestamp: t } : s))
    );
  };

  const updateHighlight = (idx: number, highlight: [number, number, number, number] | undefined) => {
    setImages((prev) => prev.map((slot, imageIndex) => imageIndex === idx ? { ...slot, highlight } : slot));
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      addFiles(Array.from(files));
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const canSubmit = (value.trim() || images.length > 0) && !isSubmitting;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canSubmit) return;

    const query = value.trim() || "Describe this satellite image in detail.";
    onChange("");
    await onSubmitPrompt({ images, query, bands, dataset: "operational" });
    setImages([]);
    setPreviews([]);
    setFileError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (compact) {
    return (
      <div className="relative mx-auto w-full max-w-3xl">
        <div className="flex items-center gap-2 rounded-2xl border border-stone-300/80 bg-[#E5E7EB]/90 p-2 shadow-subtle dark:border-white/10 dark:bg-[#171512]">
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting} className="rounded-full p-2 text-secondary transition hover:bg-black/5 hover:text-primary dark:hover:bg-white/10" title="Attach a follow-up image" aria-label="Attach a follow-up image"><Paperclip className="h-4 w-4" /></button>
          <input ref={fileInputRef} type="file" accept={ACCEPTED_EXTENSIONS} multiple className="hidden" onChange={handleFileInputChange} />
          <textarea ref={textareaRef} id="satquery-prompt" value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={handleKeyDown} rows={1} disabled={isSubmitting} placeholder="Ask a follow-up..." className="min-h-8 max-h-24 flex-1 resize-none bg-transparent px-1 py-1 text-sm text-primary placeholder:text-secondary/60 focus:outline-none" />
          <button type="button" onClick={() => handleSubmit()} disabled={!canSubmit} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7F4B30] text-white transition hover:bg-[#965A3B] disabled:opacity-30" aria-label="Send follow-up">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}</button>
        </div>
        {images.length > 0 && <div className="absolute bottom-full left-2 z-20 mb-2 w-64 rounded-xl border border-stone-300/70 bg-[#FAF6F0] p-3 shadow-xl dark:border-white/10 dark:bg-[#171512]"><p className="mb-2 text-[10px] font-mono uppercase text-secondary">Attached for follow-up</p>{images.map((slot) => <p key={slot.file.name} className="truncate text-xs text-primary">{slot.file.name}</p>)}</div>}
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-2.5">
      {/* Rotating light border container */}
      <div className="relative rounded-2xl overflow-hidden group shadow-[0_16px_40px_-8px_rgba(78,59,42,0.12)]">
        <div className="border-beam-track">
          <div
            aria-hidden="true"
            className="absolute -inset-[150%] animate-rotate-beam pointer-events-none"
            style={{
              background:
                "conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 75deg, rgba(200, 109, 59, 0.45) 95deg, #C86D3B 110deg, #FFFFFF 120deg, #C86D3B 130deg, rgba(200, 109, 59, 0.45) 145deg, transparent 165deg, transparent 360deg)",
            }}
          />
        </div>

        {/* Card body */}
        <div
          className={`relative rounded-2xl p-4 sm:p-5 flex flex-col gap-3 transition-all duration-200 ease-apple border border-stone-300/80 dark:border-white/10 bg-[#E5E7EB] dark:bg-[#171512] backdrop-blur-[24px] ${
            isDragOver ? "bg-[#DDE0E4] dark:bg-[#1F1B17] ring-2 ring-accent/40" : ""
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            multiple
            className="hidden"
            onChange={handleFileInputChange}
          />

          {/* Image slots */}
          {images.length > 0 && (
            <div className="flex flex-col gap-2">
              {images.map((slot, idx) => (
                <ImageSlotCard
                  key={idx}
                  slot={slot}
                  index={idx}
                  onRemove={() => removeImage(idx)}
                  onModalityChange={(m) => updateModality(idx, m)}
                  onTimestampChange={(t) => updateTimestamp(idx, t)}
                  onHighlightChange={(highlight) => updateHighlight(idx, highlight)}
                  preview={previews[idx] ?? null}
                />
              ))}
            </div>
          )}

          {/* File error */}
          {fileError && (
            <p className="text-xs text-rose-500 pl-1 animate-fade-in-up">{fileError}</p>
          )}

          {/* Query textarea */}
          <textarea
            ref={textareaRef}
            id="satquery-prompt"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              images.length === 0
                ? "Ask anything about satellite imagery — or attach an image first…"
                : images.length === 1
                ? "Ask a question about this image…"
                : "Ask about change between these two images…"
            }
            rows={2}
            disabled={isSubmitting}
            className="w-full resize-none bg-transparent px-1 py-1 text-sm sm:text-[15px] text-primary placeholder:text-secondary/50 dark:placeholder:text-[#91877D] focus:outline-none min-h-[46px] max-h-[140px] leading-relaxed"
          />

          {/* Advanced: bands */}
          {showAdvanced && (
            <div className="flex items-center gap-2 pl-1 animate-fade-in-up">
              <span className="text-xs text-secondary font-mono">Bands:</span>
              <input
                type="text"
                value={bands}
                onChange={(e) => setBands(e.target.value)}
                placeholder="1,2,3"
                className="text-xs font-mono bg-white/60 dark:bg-[#171512] border border-stone-300/70 dark:border-white/10 rounded-lg px-2 py-1 text-primary focus:outline-none focus:ring-1 focus:ring-accent/40 w-24"
              />
              <span className="text-[10px] text-secondary/60">
                1-based band indices (leave default for RGB)
              </span>
            </div>
          )}

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between pt-1 border-t border-stone-300/40 dark:border-white/10">
            <div className="flex items-center gap-2">
              {/* Attach button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={images.length >= 5 || isSubmitting}
                className="apple-interactive flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-secondary hover:text-primary dark:text-[#B8AEA3] dark:hover:text-[#F3EEE7] bg-stone-200/50 dark:bg-[#1F1B17] hover:bg-stone-200/80 dark:hover:bg-[#2A241F] border border-stone-300/60 dark:border-white/10 shadow-xs transition-all duration-200 ease-apple disabled:opacity-40 disabled:pointer-events-none"
                title={images.length >= 5 ? "Max 5 images" : "Attach image"}
              >
                {images.length >= 2 ? (
                  <Plus className="w-3.5 h-3.5 opacity-40" />
                ) : (
                  <Paperclip className="w-3.5 h-3.5" />
                )}
                <span>
                  {images.length === 0
                    ? "Attach Image"
                    : `${images.length} image${images.length === 1 ? "" : "s"}`}
                </span>
              </button>

              {/* Advanced toggle */}
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="apple-interactive hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium text-secondary/70 hover:text-secondary dark:text-[#91877D] dark:hover:text-[#B8AEA3] bg-stone-200/30 dark:bg-transparent border border-stone-300/40 dark:border-white/5 transition-all duration-200 ease-apple"
                title="Advanced options"
              >
                {showAdvanced ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
                <span>Advanced</span>
              </button>
            </div>

            {/* Submit */}
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-[11px] text-secondary/60 font-mono">
                <kbd className="px-1.5 py-0.5 rounded bg-stone-200/60 dark:bg-[#1F1B17] border border-stone-300/70 dark:border-white/10 text-secondary dark:text-[#B8AEA3] text-[10px] font-semibold">
                  ↵
                </kbd>
              </span>
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!canSubmit}
                aria-label="Run analysis"
                className="apple-interactive w-9 h-9 rounded-full bg-[#7F4B30] hover:bg-[#965A3B] text-white flex items-center justify-center shadow-[0_4px_14px_rgba(127,75,48,0.3),inset_0_1px_1px_rgba(255,255,255,0.5)] ring-2 ring-[#7F4B30]/20 hover:-translate-y-[1px] active:scale-[0.99] disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 ease-apple shrink-0"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Helper text */}
      <div className="flex items-center justify-between px-3 text-[11px] text-secondary/70 dark:text-[#91877D] font-mono">
        <span>GeoTIFF / PNG / JPEG · 1 or 2 images · natural-language query</span>
        <span>
          Press{" "}
          <kbd className="px-1 py-0.5 rounded bg-white/60 dark:bg-[#1F1B17] border border-stone-300 dark:border-white/10 text-secondary dark:text-[#B8AEA3]">
            Enter ↵
          </kbd>
        </span>
      </div>
    </div>
  );
};
