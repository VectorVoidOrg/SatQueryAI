"use client";

import React from "react";
import { FileImage, Calendar, Layers } from "lucide-react";
import type { InputRecord } from "@/lib/types/analyze";

interface InputsTableProps {
  inputs: InputRecord[];
}

export const InputsTable: React.FC<InputsTableProps> = ({ inputs }) => {
  return (
    <div className="p-4 rounded-xl bg-white/60 dark:bg-[#171512] border border-stone-200 dark:border-white/10 space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-primary">
        <Layers className="w-3.5 h-3.5 text-accent" />
        <span>Analyzed Inputs ({inputs.length})</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-stone-200/50 dark:bg-[#1F1B17] text-secondary font-mono">
            <tr>
              <th className="p-2 rounded-l-lg">File Name</th>
              <th className="p-2">Modality</th>
              <th className="p-2 rounded-r-lg">Acquisition Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200/50 dark:divide-white/5">
            {inputs.map((inp, idx) => (
              <tr key={idx} className="hover:bg-stone-100/50 dark:hover:bg-white/5">
                <td className="p-2 font-mono text-primary flex items-center gap-1.5 font-medium">
                  <FileImage className="w-3.5 h-3.5 text-secondary shrink-0" />
                  <span>{inp.filename}</span>
                </td>
                <td className="p-2">
                  <span className="px-2 py-0.5 rounded-md font-mono text-[10px] uppercase font-semibold bg-stone-200 dark:bg-stone-800 text-secondary">
                    {inp.modality}
                  </span>
                </td>
                <td className="p-2 font-mono text-secondary">
                  {inp.timestamp ? (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-secondary/60" />
                      {inp.timestamp}
                    </span>
                  ) : (
                    <span className="text-secondary/40">N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
