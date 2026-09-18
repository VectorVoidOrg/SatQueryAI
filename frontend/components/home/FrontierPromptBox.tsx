"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ArrowRight,
  CalendarDays,
  Paperclip,
  X,
  FileImage,
  Loader2,
  Plus,
  ChevronDown,
  ChevronUp,
  PenLine,
  Eraser,
  SquareDashed,
  Check,
} from "lucide-react";
import type { ImageSlot, Modality, AnalyzeFormValues } from "@/lib/types/analyze";
import { createImagePreview } from "@/lib/imagePreview";
import { clearPromptDraft, loadPromptDraft, savePromptDraft } from "@/lib/promptDraft";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

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

function getModalityPreviewFilter(modality: Modality) {
  if (modality === "sar") return "contrast(1.6) brightness(1.1) saturate(1.8) url(#upload-sar-color-map)";
  if (modality === "multispectral") return "contrast(2.1) brightness(0.72) saturate(1.9) url(#upload-multispectral-color-map)";
  return "contrast(1.15) saturate(1.25)";
}

const ACCEPTED_EXTENSIONS = ".tif,.tiff,.png,.jpg,.jpeg";
const ACCEPTED_FILE_EXTENSIONS = new Set([".tif", ".tiff", ".png", ".jpg", ".jpeg"]);

function isSupportedImage(file: File) {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  return ACCEPTED_FILE_EXTENSIONS.has(extension) || file.type.startsWith("image/");
}

function todayAsDateInputValue() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function LegacyHighlightImageSlotCard({
  slot,
  index,
  onRemove,
  onModalityChange,
  onHighlightChange,
  preview,
}: {
  slot: ImageSlot;
  index: number;
  onRemove: () => void;
  onModalityChange: (m: Modality) => void;
  onHighlightChange: (highlight: [number, number, number, number] | undefined) => void;
  preview: string | null;
}) {
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState<[number, number] | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTool, setEditorTool] = useState<"rectangle" | "pen" | "eraser">("rectangle");
  const [draftHighlight, setDraftHighlight] = useState<[number, number, number, number] | undefined>(slot.highlight);
  const [drawingHighlight, setDrawingHighlight] = useState<[number, number, number, number] | undefined>(undefined);
  const [freehandPoints, setFreehandPoints] = useState<[number, number][]>([]);
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
    if (!drawing || !start || editorTool === "eraser") return;
    const end = getPoint(event);
    const points = editorTool === "pen" ? [...freehandPoints, end] : [start, end];
    const x1 = Math.min(...points.map(([x]) => x));
    const y1 = Math.min(...points.map(([, y]) => y));
    const x2 = Math.max(...points.map(([x]) => x));
    const y2 = Math.max(...points.map(([, y]) => y));
    setDrawing(false);
    setStart(null);
    const completed: [number, number, number, number] = [x1, y1, x2, y2];
    if (x2 - x1 > 0.02 && y2 - y1 > 0.02) setDraftHighlight(completed);
    setFreehandPoints([]);
    setDrawingHighlight(undefined);
  };

  const updateDrawingHighlight = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drawing || !start || editorTool === "eraser") return;
    const [endX, endY] = getPoint(event);
    if (editorTool === "pen") setFreehandPoints((points) => [...points, [endX, endY]]);
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
    setFreehandPoints([]);
  };

  return (
    <div className="flex w-36 shrink-0 flex-col gap-1.5 rounded-xl border border-stone-300/60 bg-stone-200/50 p-2 dark:border-white/10 dark:bg-[#1F1B17]">
      {preview ? <div className="relative inline-block shrink-0" style={{ width: 128 }} onDragStart={(event) => event.preventDefault()}><img draggable={false} src={preview} alt={`Preview of ${slot.file.name}`} className="block rounded-lg bg-black/5 object-cover dark:bg-black/20" style={{ width: 128, height: 80 }} /><button type="button" onClick={() => { setDraftHighlight(slot.highlight); setEditorTool("rectangle"); setEditorOpen(true); }} className="absolute right-1 top-1 z-10 inline-flex items-center gap-1 rounded-md bg-[#1C1917]/90 px-2 py-1 text-[10px] font-semibold text-white shadow-md transition hover:bg-accent" aria-label={slot.highlight ? "Edit highlighted area" : "Highlight an area"} title={slot.highlight ? "Edit highlighted area" : "Highlight an area"}><PenLine className="h-3 w-3" /> <span>{slot.highlight ? "Edit" : "Highlight"}</span></button>{slot.highlight && <div className="pointer-events-none absolute inset-0"><div className="absolute border-2 border-dotted border-accent bg-accent/20" style={{ left: `${slot.highlight[0] * 100}%`, top: `${slot.highlight[1] * 100}%`, width: `${(slot.highlight[2] - slot.highlight[0]) * 100}%`, height: `${(slot.highlight[3] - slot.highlight[1]) * 100}%` }} /></div>}</div> : <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded-lg bg-stone-300/40 text-xs text-secondary dark:bg-black/20">Preparing preview...</div>}
      {slot.highlight && <button type="button" onClick={() => onHighlightChange(undefined)} className="self-start text-[10px] font-mono text-accent hover:underline">Clear highlighted zone</button>}

      {editorOpen && preview && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-label={`Highlight ${slot.file.name}`}>
        <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#171512] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white">
            <div><p className="text-sm font-semibold">Highlight an area</p><p className="text-[10px] font-mono text-white/60">Draw only the region the model should analyze</p></div>
            <div className="flex items-center gap-1"><button type="button" onClick={() => setEditorTool("rectangle")} className={`inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs ${editorTool === "rectangle" ? "bg-accent text-white" : "text-white/70 hover:bg-white/10"}`} aria-label="Rectangle selection tool" title="Rectangle selection tool"><SquareDashed className="h-4 w-4" /><span>Rectangle</span></button><button type="button" onClick={() => setEditorTool("pen")} className={`inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs ${editorTool === "pen" ? "bg-accent text-white" : "text-white/70 hover:bg-white/10"}`} aria-label="Freeform pen tool" title="Freeform pen tool"><PenLine className="h-4 w-4" /><span>Pen</span></button><button type="button" onClick={() => { setEditorTool("eraser"); setDraftHighlight(undefined); setFreehandPoints([]); setDrawingHighlight(undefined); }} className={`inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs ${editorTool === "eraser" ? "bg-accent text-white" : "text-white/70 hover:bg-white/10"}`} aria-label="Erase highlight" title="Erase highlight"><Eraser className="h-4 w-4" /><span>Erase</span></button></div>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-black p-3 sm:p-6" onDragStart={(event) => { event.preventDefault(); event.stopPropagation(); }} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); }}>
            <div className={`relative self-start inline-block w-fit max-h-[72vh] max-w-full select-none ${editorTool === "pen" ? "cursor-crosshair" : editorTool === "rectangle" ? "cursor-crosshair" : "cursor-cell"}`} onPointerDown={(event) => { if (editorTool === "eraser") return; event.currentTarget.setPointerCapture(event.pointerId); const point = getPoint(event); setStart(point); setFreehandPoints(editorTool === "pen" ? [point] : []); setDrawingHighlight([point[0], point[1], point[0], point[1]]); setDrawing(true); }} onPointerMove={updateDrawingHighlight} onPointerUp={finishHighlight} onPointerCancel={() => { setDrawing(false); setStart(null); setFreehandPoints([]); setDrawingHighlight(undefined); }}>
              <img ref={imageRef} draggable={false} src={preview} alt={`Highlight editor for ${slot.file.name}`} className="block max-h-[72vh] max-w-full w-auto h-auto object-contain" />
              {freehandPoints.length > 1 && <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none"><polyline points={freehandPoints.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" stroke="#C86D3B" strokeWidth="0.008" vectorEffect="non-scaling-stroke" /></svg>}
              {(drawingHighlight ?? draftHighlight) && <div className="pointer-events-none absolute border-2 border-dotted border-accent bg-accent/25" style={{ left: `${(drawingHighlight ?? draftHighlight)![0] * 100}%`, top: `${(drawingHighlight ?? draftHighlight)![1] * 100}%`, width: `${((drawingHighlight ?? draftHighlight)![2] - (drawingHighlight ?? draftHighlight)![0]) * 100}%`, height: `${((drawingHighlight ?? draftHighlight)![3] - (drawingHighlight ?? draftHighlight)![1]) * 100}%` }} />}
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-[#171512] px-4 py-3 text-white">
            <span className="text-xs text-white/65">Finalize this highlighted area</span>
            <button type="button" onClick={commitHighlight} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-emerald-500" aria-label="Apply highlight" title="Apply highlight"><Check className="h-4 w-4" /> Apply</button>
          </div>
        </div>
      </div>}
      {/* Filename row */}
      <div className="flex min-w-0 items-center gap-1.5">
        <FileImage className="w-3.5 h-3.5 text-accent shrink-0" />
        <span className="min-w-0 flex-1 truncate font-mono text-[10px] font-medium text-primary">
          {slot.file.name}
        </span>
        <span className="shrink-0 text-[9px] font-mono text-secondary">
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

      {/* Modality selector */}
      <div className="flex items-center gap-2 pl-5">
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

      </div>
    </div>
  );
}

function ImageSlotCard({
  slot,
  index,
  onRemove,
  onModalityChange,
  onTimestampChange,
  preview,
}: {
  slot: ImageSlot;
  index: number;
  onRemove: () => void;
  onModalityChange: (modality: Modality) => void;
  onTimestampChange: (timestamp: string) => void;
  preview: string | null;
}) {
  const previewFilter = getModalityPreviewFilter(slot.modality);

  return (
    <div className="flex w-36 shrink-0 flex-col gap-1.5 rounded-xl border border-stone-300/60 bg-white/45 p-2 shadow-subtle dark:border-white/10 dark:bg-[#1F1B17]">
      {preview ? (
        <div className="relative h-20 w-32 overflow-hidden rounded-lg bg-black/5 dark:bg-black/20">
          <img src={preview} alt={`Preview of ${slot.file.name}`} className="block h-20 w-32 object-cover transition-all duration-300 ease-in-out" style={{ filter: previewFilter }} />
          <svg className="pointer-events-none absolute h-0 w-0" aria-hidden="true" focusable="false">
            <defs>
              <filter id="upload-sar-color-map" colorInterpolationFilters="sRGB">
                <feColorMatrix type="saturate" values="1.8" />
                <feComponentTransfer>
                  <feFuncR type="table" tableValues="0.16 0.98" />
                  <feFuncG type="table" tableValues="0.01 1" />
                  <feFuncB type="table" tableValues="0.04 0.08" />
                </feComponentTransfer>
              </filter>
              <filter id="upload-multispectral-color-map" colorInterpolationFilters="sRGB">
                <feColorMatrix values="1.15 -0.55 1.35 0 0.04 1.35 -0.75 0.35 0 0.02 0.25 1.05 -0.35 0 0.04 0 0 0 1 0" />
              </filter>
            </defs>
          </svg>
        </div>
      ) : (
        <div className="flex h-20 w-32 items-center justify-center rounded-lg bg-stone-300/40 text-xs text-secondary dark:bg-black/20">Preparing preview...</div>
      )}
      <div className="flex min-w-0 items-center gap-1.5">
        <FileImage className="h-3.5 w-3.5 shrink-0 text-accent" />
        <span className="min-w-0 flex-1 truncate font-mono text-[10px] font-medium text-primary">{slot.file.name}</span>
        <button type="button" onClick={onRemove} className="shrink-0 rounded p-0.5 text-secondary transition hover:text-rose-500" title={`Remove image ${index + 1}`} aria-label={`Remove image ${index + 1}`}><X className="h-3.5 w-3.5" /></button>
      </div>
      <div className="relative w-full">
        <Select items={MODALITY_OPTIONS} value={slot.modality} onValueChange={(value) => onModalityChange(value as Modality)}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent><SelectGroup><SelectLabel>Image modality</SelectLabel>{MODALITY_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectGroup></SelectContent>
        </Select>
      </div>
      <label className="flex items-center gap-1.5 rounded-lg border border-stone-300/70 bg-white/70 px-2 py-1.5 text-[11px] text-secondary dark:border-white/10 dark:bg-[#171512]" title={`Date for ${slot.file.name}`}>
        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-accent" />
        <span className="sr-only">Image date</span>
        <input type="date" value={slot.timestamp || todayAsDateInputValue()} onChange={(event) => onTimestampChange(event.target.value)} className="min-w-0 w-full bg-transparent text-[11px] text-primary outline-none" aria-label={`Date for ${slot.file.name}`} />
      </label>
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
  const draftHydratedRef = useRef(false);

  useEffect(() => {
    let active = true;
    void loadPromptDraft().then((draft) => {
      if (!active) return;
      let savedQuery = "";
      try {
        savedQuery = localStorage.getItem("satquery_draft_query") ?? "";
      } catch {
        // Draft persistence is best-effort when browser storage is unavailable.
      }
      if (draft) {
        if (!value.trim() && draft.query) onChange(draft.query);
        if (images.length === 0 && draft.images.length > 0) setImages(draft.images.map((slot) => ({ ...slot, timestamp: slot.timestamp || todayAsDateInputValue() })));
      } else if (!value.trim() && savedQuery) {
        onChange(savedQuery);
      }
      draftHydratedRef.current = true;
    }).catch(() => {
      draftHydratedRef.current = true;
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!draftHydratedRef.current) return;
    try {
      localStorage.setItem("satquery_draft_query", value);
    } catch {
      // Draft persistence is best-effort when browser storage is unavailable.
    }
    void savePromptDraft(value, images).catch(() => undefined);
  }, [value, images]);

  useEffect(() => {
    if (!fileError) return;
    const timeout = window.setTimeout(() => setFileError(null), 7000);
    return () => window.clearTimeout(timeout);
  }, [fileError]);

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
    const unsupported = incoming.filter((file) => !isSupportedImage(file));
    const supported = incoming.filter(isSupportedImage);
    if (unsupported.length > 0) {
      const names = unsupported.map((file) => file.name).join(", ");
      setFileError(`Unsupported file format: ${names}. Use TIFF, PNG, or JPEG images.`);
    } else {
      setFileError(null);
    }
    setImages((prev) => {
      const existingKeys = new Set(prev.map((slot) => `${slot.file.name}:${slot.file.size}:${slot.file.lastModified}`));
      const newFiles = supported.filter((file) => {
        const key = `${file.name}:${file.size}:${file.lastModified}`;
        if (existingKeys.has(key)) return false;
        existingKeys.add(key);
        return true;
      });
      const available = Math.max(0, 5 - prev.length);
      if (newFiles.length > available) setFileError("Maximum 5 unique images. Remove one first.");
      return [...prev, ...newFiles.slice(0, available).map((file) => ({ file, modality: "optical" as Modality, timestamp: todayAsDateInputValue() }))];
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

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      addFiles(Array.from(files));
    }
    e.target.value = "";
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedImages = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));
    if (pastedImages.length > 0) {
      event.preventDefault();
      addFiles(pastedImages);
    }
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
    try {
      localStorage.removeItem("satquery_draft_query");
    } catch {
      // Draft persistence is best-effort when browser storage is unavailable.
    }
    void clearPromptDraft().catch(() => undefined);
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
          <textarea ref={textareaRef} id="satquery-prompt" value={value} onChange={(e) => onChange(e.target.value)} onPaste={handlePaste} onKeyDown={handleKeyDown} rows={1} disabled={isSubmitting} placeholder="Ask a follow-up..." className="min-h-8 max-h-24 flex-1 resize-none bg-transparent px-1 py-1 text-sm text-primary placeholder:text-secondary/60 focus:outline-none" />
          <button type="button" onClick={() => handleSubmit()} disabled={!canSubmit} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7F4B30] text-white transition hover:bg-[#965A3B] disabled:opacity-30" aria-label="Send follow-up">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}</button>
        </div>
        {images.length > 0 && <div className="mt-2 rounded-xl border border-stone-300/70 bg-[#FAF6F0] p-2.5 shadow-subtle dark:border-white/10 dark:bg-[#171512]"><p className="mb-1 text-[10px] font-mono uppercase text-secondary">Attached for follow-up</p>{images.map((slot) => <p key={slot.file.name} className="truncate text-xs text-primary">{slot.file.name}</p>)}</div>}
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-2.5">
      {/* Rotating light border container */}
      <div className="relative rounded-2xl overflow-visible group shadow-[0_16px_40px_-8px_rgba(78,59,42,0.12)]">
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
              <div className="flex flex-wrap gap-2 pb-1">
              {images.map((slot, idx) => (
                <ImageSlotCard
                  key={idx}
                  slot={slot}
                  index={idx}
                  onRemove={() => removeImage(idx)}
                  onModalityChange={(m) => updateModality(idx, m)}
                  onTimestampChange={(timestamp) => setImages((current) => current.map((item, itemIndex) => itemIndex === idx ? { ...item, timestamp } : item))}
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
            onPaste={handlePaste}
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
        <span>JPG / PNG / GeoTIFF · up to 5 images · natural-language query</span>
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
