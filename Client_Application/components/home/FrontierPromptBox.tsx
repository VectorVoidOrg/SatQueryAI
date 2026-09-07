"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Paperclip, X, FileSpreadsheet, Loader2, Sparkles, Image as ImageIcon } from "lucide-react";
import { useSessionStore } from "@/store/useSessionStore";
import { validateTiffFile } from "@/lib/api/ingestClient";

interface FrontierPromptBoxProps {
  value: string;
  onChange: (val: string) => void;
  onTransitionStart?: () => void;
  isTransitioning?: boolean;
}

export const FrontierPromptBox: React.FC<FrontierPromptBoxProps> = ({
  value,
  onChange,
  onTransitionStart,
  isTransitioning = false,
}) => {
  const router = useRouter();
  const { createSession } = useSessionStore();

  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleFileSelect = async (file: File) => {
    setFileError(null);
    const validation = await validateTiffFile(file);
    if (!validation.valid) {
      setFileError(validation.error || "Please attach a valid .tif or .tiff satellite imagery file.");
      return;
    }
    setAttachedFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleAttachSample = () => {
    // Creates a simulated sample GeoTIFF file for fast exploration
    const dummyBlob = new Blob(["II*\0" + "dummy geospatial raster bytes"], { type: "image/tiff" });
    const sampleFile = new File([dummyBlob], "sundarbans_delta_rgb_sar.tif", { type: "image/tiff" });
    setAttachedFile(sampleFile);
    setFileError(null);
  };

  const navigateToAnalysis = (targetId: string) => {
    router.push(`/chat/${targetId}`);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!value.trim() && !attachedFile) || isSubmitting) return;

    setIsSubmitting(true);
    if (onTransitionStart) {
      onTransitionStart();
    }
    const queryPrompt = value.trim() || "Analyze attached satellite imagery for surface and structural changes.";

    // Snappy normal submission delay for smooth tactile feedback
    const minDelay = new Promise((resolve) => setTimeout(resolve, 250));

    try {
      // 1. Send data to /api/query endpoint
      const formData = new FormData();
      formData.append("prompt", queryPrompt);
      if (attachedFile) {
        formData.append("file", attachedFile);
      }

      const fetchPromise = fetch("/api/query", {
        method: "POST",
        body: formData,
      });

      const [response] = await Promise.all([fetchPromise, minDelay]);

      let responseData: any = {};
      if (response.ok) {
        responseData = await response.json();
      }

      // 2. Create session in Zustand store with unique ID
      const newSessionId = createSession({
        prompt: queryPrompt,
        attachedFileName: attachedFile?.name,
        assistantText: responseData.text,
        evidence: responseData.evidence,
        audit: responseData.audit,
        bbox: responseData.bbox,
        assetName: responseData.assetName,
      });

      // 3. Normal navigation to analysis/chat page
      navigateToAnalysis(newSessionId);
    } catch (err) {
      console.warn("API call failed, generating local session:", err);
      await minDelay;
      // Fallback local session generation
      const newSessionId = createSession({
        prompt: queryPrompt,
        attachedFileName: attachedFile?.name,
      });
      navigateToAnalysis(newSessionId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className={`w-full max-w-2xl mx-auto space-y-2.5 transition-all duration-300 ease-apple ${
        isTransitioning
          ? "opacity-95 scale-[0.995]"
          : "opacity-100 scale-100"
      }`}
    >
      {/* Pro Rotating Light & Glass Container — strictly confined border channel */}
      <div className="relative rounded-2xl overflow-hidden group shadow-[0_16px_40px_-8px_rgba(78,59,42,0.12)]">
        {/* Rotating Light Beam: strictly confined to the border channel via CSS hardware mask */}
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

        {/* Light Grey Console Interior Card */}
        <div
          className={`glassmortisin-input-grey relative rounded-2xl p-4 sm:p-5 min-h-[110px] flex flex-col justify-between transition-all duration-200 ease-apple border border-stone-300/80 bg-[#E5E7EB] backdrop-blur-[24px] ${
            isDragOver ? "bg-[#DDE0E4] ring-2 ring-accent/40" : ""
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".tif,.tiff,image/*"
            className="hidden"
            onChange={handleFileInputChange}
          />

          {/* Attached file chip preview */}
          {attachedFile && (
            <div className="flex items-center gap-2 mb-2 p-1.5 rounded-xl bg-stone-200/50 border border-stone-300/60 text-xs w-fit animate-fade-in-up">
              <FileSpreadsheet className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="font-mono text-primary font-medium truncate max-w-[240px]">
                {attachedFile.name}
              </span>
              <span className="text-[10px] text-secondary font-mono">
                ({(attachedFile.size / (1024 * 1024)).toFixed(1)} MB)
              </span>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="text-secondary hover:text-primary p-0.5 rounded-full transition-colors"
                title="Remove attached file"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* File Error Notice */}
          {fileError && (
            <p className="text-xs text-rose-600 mb-1.5 pl-1 animate-fade-in-up">{fileError}</p>
          )}

          {/* Multiline Input */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about satellite imagery, detect surface change, or attach GeoTIFF..."
            rows={2}
            disabled={isSubmitting}
            className="w-full resize-none bg-transparent px-1 py-1 text-sm sm:text-[15px] text-primary placeholder:text-secondary/50 focus:outline-none min-h-[46px] max-h-[140px] leading-relaxed"
          />

          {/* Action Bottom Bar */}
          <div className="flex items-center justify-between pt-2.5 mt-1">
            <div className="flex items-center gap-2">
              {/* File attachment button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="apple-interactive flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-secondary hover:text-primary bg-stone-200/50 hover:bg-stone-200/80 border border-stone-300/60 shadow-xs transition-all duration-200 ease-apple group"
                title="Attach GeoTIFF (.tif, .tiff)"
              >
                <Paperclip className="w-3.5 h-3.5 text-secondary group-hover:text-primary transition-colors" />
                <span>Attach GeoTIFF</span>
              </button>

              {/* Quick sample image loader */}
              {!attachedFile && (
                <button
                  type="button"
                  onClick={handleAttachSample}
                  className="apple-interactive hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-accent bg-[#C86D3B]/10 hover:bg-[#C86D3B]/20 border border-[#C86D3B]/25 transition-all duration-200 ease-apple group"
                  title="Load sample Sundarbans GeoTIFF"
                >
                  <Sparkles className="w-3.5 h-3.5 text-accent" />
                  <span>Demo Imagery</span>
                </button>
              )}

              {/* Instrument badge */}
              <div className="hidden md:flex items-center gap-1 text-[11px] text-secondary/60 font-mono pl-1">
                <span>•</span>
                <span>Multi-Band Optical + SAR</span>
              </div>
            </div>

            {/* Right side: Key hint & Submit Button */}
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-[11px] text-secondary/60 font-mono">
                <kbd className="px-1.5 py-0.5 rounded bg-stone-200/60 border border-stone-300/70 text-secondary text-[10px] font-semibold">↵</kbd>
              </span>

              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={(!value.trim() && !attachedFile) || isSubmitting}
                aria-label="Send query"
                className="apple-interactive w-9 h-9 rounded-full bg-[#7F4B30] hover:bg-[#965A3B] text-white flex items-center justify-center shadow-[0_4px_14px_rgba(127,75,48,0.3),inset_0_1px_1px_rgba(255,255,255,0.5)] ring-2 ring-[#7F4B30]/20 hover:-translate-y-0.5 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 ease-apple shrink-0"
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
      <div className="flex items-center justify-between px-3 text-[11px] text-secondary/70 font-mono">
        <span>Supports Multi-band .tif / .tiff (500MB+) & natural language queries</span>
        <span>Press <kbd className="px-1 py-0.5 rounded bg-white/60 border border-stone-300 text-secondary">Enter ↵</kbd></span>
      </div>
    </div>
  );
};
