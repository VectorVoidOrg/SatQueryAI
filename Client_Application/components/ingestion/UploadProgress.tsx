import React from "react";
import { UploadProgressEvent } from "@/lib/api/ingestClient";
import { X, HardDriveDownload } from "lucide-react";

interface UploadProgressProps {
  filename: string;
  progress: UploadProgressEvent;
  onCancel: () => void;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  filename,
  progress,
  onCancel,
}) => {
  const loadedMb = (progress.loaded / (1024 * 1024)).toFixed(1);
  const totalMb = (progress.total / (1024 * 1024)).toFixed(1);

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 min-w-0 max-w-[200px]">
          <HardDriveDownload className="w-4 h-4 text-slate-800 shrink-0 animate-bounce" />
          <span className="font-mono text-slate-900 truncate font-medium" title={filename}>
            {filename}
          </span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-slate-400 hover:text-rose-600 p-1 rounded-full transition-colors"
          title="Cancel upload"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress track */}
      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
        <div
          className="h-full bg-slate-900 rounded-full transition-all duration-100 ease-linear shadow-sm"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
        <span>
          {loadedMb} MB / {totalMb} MB
        </span>
        <span className="font-bold text-slate-900">{progress.percentage}%</span>
      </div>
    </div>
  );
};
