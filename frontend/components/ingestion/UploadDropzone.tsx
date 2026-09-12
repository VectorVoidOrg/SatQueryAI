"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileSpreadsheet, RefreshCw, AlertCircle, CheckCircle2, ChevronUp } from "lucide-react";
import { uploadGeoTiff, validateTiffFile, UploadProgressEvent } from "@/lib/api/ingestClient";
import { UploadProgress } from "@/components/ingestion/UploadProgress";
import { useAssetStore } from "@/store/useAssetStore";
import { Button } from "@/components/ui/button";
import { toast } from "@/store/useToastStore";

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
      const err = validation.error || "Invalid file format. Please provide a .tif or .tiff GeoTIFF.";
      setErrorMessage(err);
      toast.warning("Invalid GeoTIFF", err);
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
      toast.success("GeoTIFF loaded", `Asset "${response.name || file.name}" ingested and calibrated`);

      setAsset({
        assetId: response.asset_id,
        assetName: response.name || file.name.replace(/\.[^/.]+$/, ""),
        bbox: response.bbox,
        sources: response.layers,
        metadata: {
          fileSize: file.size,
          acquisitionDate: new Date().toISOString().split("T")[0],
          crs: "EPSG:4326 (WGS 84)",
        },
      });

      setTimeout(() => {
        setIsCollapsed(true);
        setSuccessMessage(null);
        setCurrentFile(null);
        setUploadProgress(null);
      }, 2500);
    } catch (err: any) {
      setIsUploading(false);
      const errMsg = err.message || "Failed to ingest GeoTIFF. Check FastAPI service status.";
      setErrorMessage(errMsg);
      toast.error("Ingestion failed", errMsg);
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
            ? "border-rose-300 bg-rose-50/90 dark:bg-rose-950/40 dark:border-rose-800/50"
            : isDragOver
            ? "border-accent bg-white/70 dark:bg-[#1F1B17] ring-2 ring-accent/30"
            : "hover:border-white/90 dark:hover:border-white/20"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".tif,.tiff"
          className="hidden"
          onChange={handleFileInput}
        />

        {/* Collapsible toggle if asset already exists */}
        {assetId && !isUploading && (
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="absolute top-3 right-3 text-secondary/60 hover:text-primary p-1 rounded-full transition-colors"
            title="Minimize"
          >
            <ChevronUp className="w-3.5 h-3.5 rotate-180" />
          </button>
        )}

        {/* Upload in progress state */}
        {isUploading && uploadProgress && currentFile && (
          <UploadProgress
            filename={currentFile.name}
            progress={uploadProgress}
            onCancel={handleCancel}
          />
        )}

        {/* Success state */}
        {successMessage && !isUploading && (
          <div className="flex items-start gap-2.5 text-xs text-emerald-700 animate-fade-in-up">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-primary">{successMessage}</p>
              <p className="text-[11px] text-emerald-600 mt-0.5">Map view centered on new bounding box.</p>
            </div>
          </div>
        )}

        {/* Error state with retry */}
        {errorMessage && !isUploading && (
          <div className="space-y-3 animate-fade-in-up">
            <div className="flex items-start gap-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="leading-snug">{errorMessage}</p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" variant="danger" onClick={handleRetry} className="text-xs">
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry Ingestion
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setErrorMessage(null);
                  setCurrentFile(null);
                }}
                className="text-xs text-secondary hover:text-primary"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* Idle dropzone state */}
        {!isUploading && !errorMessage && !successMessage && (
          <div
            className="flex flex-col items-center justify-center text-center cursor-pointer py-2 group"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-11 h-11 rounded-full bg-primary dark:bg-[#1F1B17] text-white flex items-center justify-center group-hover:scale-105 transition-all duration-200 ease-apple mb-3 shadow-xs ring-1 ring-white/10">
              <UploadCloud className="w-5 h-5 text-accent" />
            </div>
            <p className="font-serif text-base text-primary tracking-wide font-medium">
              Drop Multi-band .tif or Click to Browse
            </p>
            <p className="text-[11px] text-secondary mt-1 leading-relaxed">
              Direct streaming ingest to FastAPI (500MB+ supported)
            </p>
            <div className="flex items-center gap-1.5 mt-3 text-[10px] text-secondary/60 font-mono">
              <FileSpreadsheet className="w-3 h-3" />
              <span>GEOTIFF / COG • EPSG:4326</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
