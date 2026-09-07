import React from "react";
import Link from "next/link";
import { Globe, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-screen bg-base text-primary flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4 border border-slate-200">
        <Globe className="w-6 h-6 text-slate-700" />
      </div>
      <h2 className="font-serif text-3xl font-medium text-slate-900 mb-2">
        404 — Session or AOI Not Found
      </h2>
      <p className="text-sm text-slate-500 max-w-md mb-6">
        The geospatial analysis session or coordinates you requested could not be located in cache or index.
      </p>
      <Link
        href="/"
        className="liquid-glass inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold text-slate-900 border border-slate-300 hover:bg-slate-100 transition-all shadow-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to SatQuery AI Home
      </Link>
    </div>
  );
}
