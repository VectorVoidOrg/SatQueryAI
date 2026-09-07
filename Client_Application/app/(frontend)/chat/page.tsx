import React from "react";
import { DashboardShell } from "@/components/chat/DashboardShell";

export const metadata = {
  title: "SatQuery AI — Interactive Geospatial Chat Canvas",
  description: "Autonomous satellite imagery visual analysis, AI change mask, and reasoning workspace.",
};

export default function ChatPage() {
  return <DashboardShell />;
}
