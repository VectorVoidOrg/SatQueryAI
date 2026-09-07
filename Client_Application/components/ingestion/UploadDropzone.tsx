"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileSpreadsheet, RefreshCw, AlertCircle, CheckCircle2, ChevronUp } from "lucide-react";
import { uploadGeoTiff, validateTiffFile, UploadProgressEvent } from "@/lib/api/ingestClient";
import { UploadProgress } from "@/components/ingestion/UploadProgress";
import { useAssetStore } from "@/store/useAssetStore";
import { Button } from "@/components/ui/button";

export const UploadDropzone: React.FC = () => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressEvent | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { assetId, assetName, setAsset } = useAssetStore();

  const handleProcessFile = async (file: File) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setCurrentFile(file);

    const validation = await validateTiffFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || "Invalid file format. Please provide a .tif or .tiff GeoTIFF.");
      setIsCollapsed(false);
      return;
    }

    setIsUploading(true);
    setIsCollapsed(false);
    setUploadProgress({ loaded: 0, total: file.size, percentage: 0 });

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await uploadGeoTiff(file, {
        signal: abortController.signal,
        onProgress: (p) => setUploadProgress(p),
      });

      setIsUploading(false);
      setSuccessMessage(`Asset "${response.name || file.name}" ingested successfully.`);
      
      setAsset({
        assetId: response.asset_id,
        assetName: response.name || file.name.replace(/\.[^/.]+$/, ""),
        bbox: response.bbox,
        sources: response.layers,
      });

      setTimeout(() => {
        setIsCollapsed(true);
        setSuccessMessage(null);
        setCurrentFile(null);
        setUploadProgress(null);
      }, 2500);
    } catch (err: any) {
      setIsUploading(false);
      setErrorMessage(err.message || "Failed to ingest GeoTIFF. Check FastAPI service status.");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleProcessFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleProcessFile(files[0]);
    }
    e.target.value = "";
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsUploading(false);
    setUploadProgress(null);
    setCurrentFile(null);
    setErrorMessage("Upload cancelled.");
  };

  const handleRetry = () => {
    if (currentFile) {
      handleProcessFile(currentFile);
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Collapsed mini-pill on bottom-left
  if (isCollapsed && assetId && !isUploading && !errorMessage) {
    return (
      <div className="absolute bottom-4 left-4 z-[400]">
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="apple-interactive glass-pill rounded-full px-5 py-2.5 flex items-center gap-2.5 text-xs font-medium text-primary hover:bg-white/70 transition-all duration-200 ease-apple hover:-translate-y-0.5 active:scale-[0.98] group"
        >
          <UploadCloud className="w-4 h-4 text-secondary group-hover:text-primary transition-colors" />
          <span>Ingest New GeoTIFF</span>
          <span className="text-[10px] text-secondary/60 font-mono tracking-wider">(500MB max)</span>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-4 left-4 z-[400] w-80 max-w-[calc(100vw-32px)]">
      <div
        className={`glass-card relative rounded-3xl p-5 transition-all duration-200 ease-apple border ${
          errorMessage
            ? "border-rose-300 bg-rose-50/90"
            : isDragOver
            ? "border-accent bg-white/70 ring-2 ring-accent/30"
            : "hover:border-white/90"
        }`}
      >
        {/* Collapse toggle */}
        <button
          type="button"
          onClick={() => setIsCollapsed(true)}
          className="absolute top-3 right-3 text-secondary/60 hover:text-primary p-1 rounded-full transition-colors"
          title="Minimize dropzone"
        >
          <ChevronUp className="w-4 h-4 rotate-180" />
        </button>

        {/* Upload active state */}
        {isUploading && uploadProgress && currentFile && (
          <UploadProgress
            filename={currentFile.name}
            progress={uploadProgress}
            onCancel={handleCancel}
          />
        )}

        {/* Success confirmation */}
        {successMessage && !isUploading && (
          <div className="flex items-center gap-2 text-xs text-emerald-800 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error alert with retry */}
        {errorMessage && !isUploading && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="danger" onClick={handleRetry} className="text-xs">
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry Ingestion
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setErrorMessage(null)} className="text-xs">
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* Default idle dropzone */}
        {!isUploading && !errorMessage && !successMessage && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-5 text-center cursor-pointer rounded-2xl border-2 border-dashed border-stone-300/80 hover:border-accent hover:bg-white/40 transition-all duration-200 ease-apple group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".tif,.tiff,image/*"
              className="hidden"
              onChange={handleFileInput}
            />

            <div className="w-10 h-10 rounded-full bg-sand-100 flex items-center justify-center text-secondary group-hover:text-accent group-hover:scale-110 transition-all duration-200 ease-apple mb-3">
              <UploadCloud className="w-5 h-5" />
            </div>

            <p className="font-serif text-sm text-primary font-medium mb-1">
              Ingest Satellite GeoTIFF
            </p>
            <p className="text-[11px] text-secondary leading-relaxed max-w-[200px]">
              Drag & drop .tif / .tiff file here, or click to browse
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] font-mono text-secondary/60">
              <FileSpreadsheet className="w-3 h-3" />
              <span>COG & multi-band supported (500MB)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
