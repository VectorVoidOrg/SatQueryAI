"use client";

export function BackgroundVideo() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <video
        className="h-full w-full object-cover opacity-55 dark:opacity-60"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      >
        <source src="/BG_Vid.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[#FAF6F0]/25 dark:bg-[#0F0E0C]/35" />
    </div>
  );
}
