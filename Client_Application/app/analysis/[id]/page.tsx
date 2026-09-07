import React from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";


interface AnalysisPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AnalysisPage(props: AnalysisPageProps) {
  const params = await props.params;
  return <DashboardShell sessionId={params.id} />;
}
