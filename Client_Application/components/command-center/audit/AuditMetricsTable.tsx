import React from "react";
import { BarChart2 } from "lucide-react";

interface AuditMetricsTableProps {
  metrics: Record<string, number | string>;
}

export const AuditMetricsTable: React.FC<AuditMetricsTableProps> = ({ metrics }) => {
  const formatKey = (key: string) => {
    switch (key) {
      case "iou":
        return "Intersection over Union (IoU)";
      case "confidence":
        return "Model Confidence Score";
      case "area_affected_m2":
        return "Total Area Affected";
      case "rmse_drift_m":
        return "RMSE Spatial Drift";
      default:
        return key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  const formatValue = (key: string, val: number | string) => {
    if (typeof val === "number") {
      if (key.includes("confidence") || key === "iou") {
        return (val * 100).toFixed(1) + "%";
      }
      if (key.includes("area")) {
        return val.toLocaleString() + " m²";
      }
      if (key.includes("drift") || key.includes("rate")) {
        return val.toFixed(2) + " m";
      }
      return val.toString();
    }
    return val;
  };

  const entries = Object.entries(metrics);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-secondary/70 font-semibold">
        <BarChart2 className="w-3.5 h-3.5 text-accent" />
        <span>Quantitative Evaluation Metrics</span>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-sand-100/70 border-b border-stone-200/60 text-secondary font-semibold text-[11px]">
              <th className="py-3 px-4">Metric</th>
              <th className="py-3 px-4 text-right">Computed Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200/50">
            {entries.map(([key, val]) => (
              <tr key={key} className="hover:bg-white/40 transition-colors">
                <td className="py-3 px-4 font-medium text-primary">
                  {formatKey(key)}
                </td>
                <td className="py-3 px-4 text-right font-mono font-semibold text-primary">
                  {formatValue(key, val)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
