import React from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

interface AnalysisPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AnalysisPage(props: AnalysisPageProps) {
  const params = await props.params;
  return <DashboardShell sessionId={params.id} />;
}
