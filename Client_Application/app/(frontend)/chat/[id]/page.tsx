import React from "react";
import { DashboardShell } from "@/components/chat/DashboardShell";

interface ChatSessionPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ChatSessionPage(props: ChatSessionPageProps) {
  const params = await props.params;
  return <DashboardShell sessionId={params.id} />;
}
