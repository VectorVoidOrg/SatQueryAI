import React from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

interface AnalysisPageProps {
  params: {
    id: string;
  };
}

export default function AnalysisPage({ params }: AnalysisPageProps) {
  return <DashboardShell sessionId={params.id} />;
}
