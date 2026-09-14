"use client";

import React, { useState, useRef } from "react";
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
} from "lucide-react";
import type { ImageSlot, Modality, AnalyzeFormValues } from "@/lib/types/analyze";

interface FrontierPromptBoxProps {
  value: string;
  onChange: (val: string) => void;
  onSubmitPrompt: (form: AnalyzeFormValues) => Promise<void> | void;
  isSubmitting?: boolean;
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
}: {
  slot: ImageSlot;
  index: number;
  onRemove: () => void;
  onModalityChange: (m: Modality) => void;
  onTimestampChange: (t: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-stone-200/50 dark:bg-[#1F1B17] border border-stone-300/60 dark:border-white/10 animate-fade-in-up">
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
}) => {
  const [images, setImages] = useState<ImageSlot[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [bands, setBands] = useState("1,2,3");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const addFile = (file: File) => {
    setFileError(null);
    if (images.length >= 2) {
      setFileError("Maximum 2 images. Remove one first.");
      return;
    }
    setImages((prev) => [
      ...prev,
      { file, modality: "optical", timestamp: "" },
    ]);
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

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(addFile);
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      Array.from(e.dataTransfer.files).forEach(addFile);
    }
  };

  const canSubmit = (value.trim() || images.length > 0) && !isSubmitting;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canSubmit) return;

    const query = value.trim() || "Describe this satellite image in detail.";
    await onSubmitPrompt({ images, query, bands, dataset: "operational" });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

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
                disabled={images.length >= 2 || isSubmitting}
                className="apple-interactive flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-secondary hover:text-primary dark:text-[#B8AEA3] dark:hover:text-[#F3EEE7] bg-stone-200/50 dark:bg-[#1F1B17] hover:bg-stone-200/80 dark:hover:bg-[#2A241F] border border-stone-300/60 dark:border-white/10 shadow-xs transition-all duration-200 ease-apple disabled:opacity-40 disabled:pointer-events-none"
                title={images.length >= 2 ? "Max 2 images" : "Attach image"}
              >
                {images.length >= 2 ? (
                  <Plus className="w-3.5 h-3.5 opacity-40" />
                ) : (
                  <Paperclip className="w-3.5 h-3.5" />
                )}
                <span>
                  {images.length === 0
                    ? "Attach Image"
                    : images.length === 1
                    ? "Add 2nd Image"
                    : "2 images"}
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
