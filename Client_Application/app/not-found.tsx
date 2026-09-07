import React from "react";
import Link from "next/link";
import { Globe, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative min-h-screen w-screen bg-[#FAF6F0] text-[#1C1917] flex flex-col items-center justify-center p-6 text-center overflow-hidden">
      {/* Warm Still-life photo background */}
      <div
        className="fixed inset-0 pointer-events-none bg-cover bg-center bg-no-repeat opacity-30 scale-[1.02]"
        style={{ backgroundImage: "url('/images/warm-bg.png')" }}
      />
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-br from-[#FAF6F0]/85 via-[#F3E5D0]/80 to-[#EADCC9]/85 backdrop-blur-[24px]" />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,_rgba(200,109,59,0.08)_0%,_transparent_75%)]" />

      <div className="glass-card relative z-10 p-8 rounded-3xl max-w-md w-full flex flex-col items-center shadow-2xl border border-white/70">
        <div className="w-12 h-12 rounded-full bg-sand-100 flex items-center justify-center mb-4 border border-stone-200 shadow-xs">
          <Globe className="w-6 h-6 text-accent animate-pulse" />
        </div>
        <h2 className="font-serif text-3xl font-normal text-primary mb-2">
          404 — Session or AOI Not Found
        </h2>
        <p className="text-xs text-secondary max-w-sm mb-6 leading-relaxed">
          The geospatial analysis session or coordinates you requested could not be located in cache or spatial index.
        </p>
        <Link
          href="/"
          className="apple-interactive inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold text-white bg-[#7F4B30] hover:bg-[#965A3B] transition-all duration-200 ease-apple shadow-xs border border-[#7F4B30]/30 hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to SatQuery AI Home
        </Link>
      </div>
    </div>
  );
}
