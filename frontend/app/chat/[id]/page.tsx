import React from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

interface ChatPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ChatIdPage({ params }: ChatPageProps) {
  const { id } = await params;
  return <DashboardShell sessionId={id} />;
}
