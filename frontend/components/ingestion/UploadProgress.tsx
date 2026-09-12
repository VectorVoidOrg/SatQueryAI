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
          <HardDriveDownload className="w-4 h-4 text-accent shrink-0 animate-bounce" />
          <span className="font-mono text-primary truncate font-medium" title={filename}>
            {filename}
          </span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-secondary/60 hover:text-rose-600 p-1 rounded-full transition-colors"
          title="Cancel upload"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress track */}
      <div className="w-full h-1.5 rounded-full bg-stone-200 overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-100 ease-linear shadow-xs"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono text-secondary">
        <span>
          {loadedMb} MB / {totalMb} MB
        </span>
        <span className="font-bold text-accent">{progress.percentage}%</span>
      </div>
    </div>
  );
};
