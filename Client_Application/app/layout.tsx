import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";


export const metadata: Metadata = {
  title: "SatQuery AI — Agentic Vision-Language Assistant for Remote-Sensing Imagery",
  description:
    "Scientific instrument canvas for multi-band satellite imagery analysis, change detection, and spatial evidence reasoning (SIH 26167).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="h-full w-full overflow-hidden bg-base text-primary select-none antialiased">
        {children}
      </body>
    </html>
  );
}
