"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Paperclip, X, FileSpreadsheet, Loader2, Sparkles, Image as ImageIcon } from "lucide-react";
import { useSessionStore } from "@/store/useSessionStore";
import { useProfileStore } from "@/store/useProfileStore";
import { AuditRecord } from "@/lib/types/chat";
import { validateTiffFile } from "@/lib/api/ingestClient";
import { BorderGlow } from "@/components/ui/BorderGlow";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";

interface QueryResponse {
  text?: string;
  evidence?: GeoJSON.FeatureCollection;
  audit?: AuditRecord;
  bbox?: [number, number, number, number];
  assetName?: string;
}

interface FrontierPromptBoxProps {
  value: string;
  onChange: (val: string) => void;
}

export const FrontierPromptBox: React.FC<FrontierPromptBoxProps> = ({ value, onChange }) => {
  const router = useRouter();
  const { createSession } = useSessionStore();
  const { isAuthenticated } = useProfileStore();

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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!value.trim() && !attachedFile) || isSubmitting) return;
    if (!isAuthenticated && localStorage.getItem("satquery_has_started_analysis") === "true") {
      router.push("/login");
      return;
    }

    setIsSubmitting(true);
    localStorage.setItem("satquery_has_started_analysis", "true");
    const queryPrompt = value.trim() || "Analyze attached satellite imagery for surface and structural changes.";

    try {
      // 1. Send data to /api/query endpoint
      const formData = new FormData();
      formData.append("prompt", queryPrompt);
      if (attachedFile) {
        formData.append("file", attachedFile);
      }

      const response = await fetch("/api/query", {
        method: "POST",
        body: formData,
      });

      let responseData: QueryResponse = {};
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
      localStorage.setItem("satquery_anonymous_session_id", newSessionId);

      // 3. Smooth transition to dedicated analysis page with unique ID
      router.push(`/chat/${newSessionId}`);
    } catch (err) {
      console.warn("API call failed, generating local session:", err);
      // Fallback local session generation
      const newSessionId = createSession({
        prompt: queryPrompt,
        attachedFileName: attachedFile?.name,
      });
      localStorage.setItem("satquery_anonymous_session_id", newSessionId);
      router.push(`/chat/${newSessionId}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const loadingStates = attachedFile
    ? [
        { text: "Validating satellite imagery" },
        { text: "Uploading GeoTIFF for analysis" },
        { text: "Running spatial query" },
        { text: "Preparing your map workspace" },
      ]
    : [
        { text: "Validating your query" },
        { text: "Running spatial query" },
        { text: "Preparing your map workspace" },
      ];

  return (
    <>
      <MultiStepLoader
        loadingStates={loadingStates}
        loading={isSubmitting}
        duration={attachedFile ? 1200 : 900}
        loop={false}
      />
      <div className="w-full max-w-2xl mx-auto space-y-2.5">
      {/* Liquid Glass Prompt Box Card */}
      <BorderGlow
        className="transition-transform duration-300"
        backgroundColor={isDragOver ? "#f0f9ff" : "#ffffff"}
        glowColor="198 93 60"
        colors={["#38bdf8", "#22c55e", "#f59e0b"]}
        glowIntensity={isDragOver ? 1.35 : 0.9}
      >
        <div
          className={`liquid-glass relative rounded-[inherit] p-4 shadow-glass transition-all duration-300 border-0 bg-transparent ${
            isDragOver ? "ring-2 ring-accent/30" : ""
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
          <div className="flex items-center gap-2 mb-2 p-2 rounded-xl bg-slate-100/90 border border-slate-200/80 text-xs w-fit animate-fade-in-up">
            <FileSpreadsheet className="w-4 h-4 text-accent shrink-0" />
            <span className="font-mono text-slate-800 truncate max-w-[240px]">
              {attachedFile.name}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              ({(attachedFile.size / (1024 * 1024)).toFixed(1)} MB)
            </span>
            <button
              type="button"
              onClick={() => setAttachedFile(null)}
              className="text-slate-400 hover:text-slate-800 p-0.5 rounded-full"
              title="Remove attached file"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* File Error Notice */}
        {fileError && (
          <p className="text-xs text-rose-600 mb-2 pl-1 animate-fade-in-up">{fileError}</p>
        )}

        {/* Multiline Input */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about imagery or attach a GeoTIFF to begin analysis..."
          rows={3}
          disabled={isSubmitting}
          className="w-full resize-none bg-transparent px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none min-h-[64px] max-h-[160px] leading-relaxed"
        />

        {/* Action Bottom Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            {/* File attachment button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="liquid-glass flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-slate-700 hover:text-slate-900 hover:bg-white border border-slate-200 transition-all shadow-sm group"
              title="Attach GeoTIFF (.tif, .tiff)"
            >
              <Paperclip className="w-3.5 h-3.5 text-slate-500 group-hover:text-black transition-colors" />
              <span className="font-medium">Attach Imagery</span>
            </button>

            {/* Quick sample image loader */}
            {!attachedFile && (
              <button
                type="button"
                onClick={handleAttachSample}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-[11px] text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
                title="Load sample Sundarbans GeoTIFF"
              >
                <ImageIcon className="w-3 h-3 text-slate-400" />
                <span>Sample GeoTIFF</span>
              </button>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={(!value.trim() && !attachedFile) || isSubmitting}
            aria-label="Send query"
            className="w-9 h-9 rounded-full bg-slate-900 text-white hover:bg-black active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center shadow-sm shrink-0"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <ArrowRight className="w-4 h-4 text-white" />
            )}
          </button>
        </div>
        </div>
      </BorderGlow>

      {/* Helper text */}
      <div className="flex items-center justify-between px-3 text-[11px] text-slate-400 font-mono">
        <span>Supports Multi-band .tif / .tiff (500MB+) & natural language queries</span>
        <span>Press <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">Enter ↵</kbd></span>
      </div>
      </div>
    </>
  );
};
