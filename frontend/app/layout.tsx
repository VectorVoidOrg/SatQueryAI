import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "SatQuery AI — Agentic Vision-Language Assistant for Remote-Sensing Imagery",
  description:
    "Scientific instrument canvas for multi-band satellite imagery analysis, change detection, and spatial evidence reasoning (SIH 26167).",
};

import { ToastContainer } from "@/components/ui/ToastContainer";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="h-full w-full overflow-hidden bg-base dark:bg-[#0F0E0C] text-primary dark:text-[#F3EEE7] antialiased" suppressHydrationWarning>
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
