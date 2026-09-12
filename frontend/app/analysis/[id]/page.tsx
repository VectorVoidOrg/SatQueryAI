import React from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

interface AnalysisPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AnalysisPage({ params }: AnalysisPageProps) {
  const { id } = await params;
  return <DashboardShell sessionId={id} />;
}
