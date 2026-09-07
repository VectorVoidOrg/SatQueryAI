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
          className="liquid-glass rounded-full px-5 py-2.5 flex items-center gap-2.5 text-xs font-medium text-slate-800 hover:bg-white hover:text-black transition-all shadow-glass group"
        >
          <UploadCloud className="w-4 h-4 text-slate-700 group-hover:text-black transition-colors" />
          <span>Ingest New GeoTIFF</span>
          <span className="text-[10px] text-slate-400 font-mono tracking-wider">(500MB max)</span>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-4 left-4 z-[400] w-80 max-w-[calc(100vw-32px)]">
      <div
        className={`liquid-glass relative rounded-3xl p-5 shadow-glass transition-all duration-300 ${
          errorMessage
            ? "border-rose-300 bg-rose-50/90"
            : isDragOver
            ? "border-accent bg-sky-50/90 ring-2 ring-accent/30"
            : "border-slate-200/80"
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
            className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1 rounded-full"
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
          <div className="flex items-start gap-2.5 text-xs text-emerald-800 animate-fade-in-up">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-slate-900">{successMessage}</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">Map view centered on new bounding box.</p>
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
                className="text-xs text-slate-600 hover:text-slate-900"
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
            <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 group-hover:text-black group-hover:scale-105 transition-all mb-3 shadow-inner">
              <UploadCloud className="w-5 h-5" />
            </div>
            <p className="font-serif text-base text-slate-900 tracking-wide font-medium">
              Drop Multi-band .tif or Click to Browse
            </p>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Direct streaming ingest to FastAPI (500MB+ supported)
            </p>
            <div className="flex items-center gap-1.5 mt-3 text-[10px] text-slate-400 font-mono">
              <FileSpreadsheet className="w-3 h-3" />
              <span>GEOTIFF / COG • EPSG:4326</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
