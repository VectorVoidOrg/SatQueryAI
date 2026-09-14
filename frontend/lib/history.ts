import type { AnalyzeResponse } from "@/lib/types/analyze";
import { supabase } from "@/lib/supabase/client";

export interface AnalysisHistoryItem {
  id: string;
  query: string;
  response: AnalyzeResponse;
  created_at: string;
}

export type ChatRole = "user" | "assistant";

export interface ChatHistoryItem {
  id: string;
  turn_id: string;
  user_id: string;
  role: ChatRole;
  content: string;
  response: SavedAnalyzeResponse | null;
  created_at: string;
}

export interface SavedImagePreview {
  filename: string;
  data_url: string;
  bounds?: [number, number, number, number] | null;
}

export type SavedAnalyzeResponse = AnalyzeResponse & {
  image_previews?: SavedImagePreview[];
  has_tiff_upload?: boolean;
};

export interface ChatConversation {
  turnId: string;
  createdAt: string;
  prompt: ChatHistoryItem | null;
  response: ChatHistoryItem | null;
}

export async function saveChatMessage({
  userId,
  turnId,
  role,
  content,
  response,
}: {
  userId: string;
  turnId: string;
  role: ChatRole;
  content: string;
  response?: SavedAnalyzeResponse;
}) {
  if (!supabase) return { error: new Error("Supabase is not configured") };
  const { error } = await supabase.from("chat_history").insert({
    user_id: userId,
    turn_id: turnId,
    role,
    content,
    response: response ?? null,
  });
  return { error };
}

export async function getRecentConversations(userId: string) {
  if (!supabase) return { data: [] as ChatConversation[], error: null };
  const result = await supabase
    .from("chat_history")
    .select("id, turn_id, user_id, role, content, response, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (result.error) return { data: [] as ChatConversation[], error: result.error };

  const conversations = new Map<string, ChatConversation>();
  for (const row of (result.data ?? []) as ChatHistoryItem[]) {
    const existing = conversations.get(row.turn_id) ?? {
      turnId: row.turn_id,
      createdAt: row.created_at,
      prompt: null,
      response: null,
    };
    if (row.role === "user") existing.prompt = row;
    if (row.role === "assistant") existing.response = row;
    if (new Date(row.created_at) < new Date(existing.createdAt)) {
      existing.createdAt = row.created_at;
    }
    conversations.set(row.turn_id, existing);
  }

  return {
    data: Array.from(conversations.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ).slice(0, 8),
    error: null,
  };
}

export async function deleteConversation(userId: string, conversation: ChatConversation) {
  if (!supabase) return { error: new Error("Supabase is not configured") };

  const chatResult = await supabase
    .from("chat_history")
    .delete()
    .eq("user_id", userId)
    .eq("turn_id", conversation.turnId);
  if (chatResult.error) return { error: chatResult.error };

  if (conversation.prompt?.content) {
    const analysisResult = await supabase
      .from("analysis_history")
      .delete()
      .eq("user_id", userId)
      .eq("query", conversation.prompt.content);
    if (analysisResult.error) return { error: analysisResult.error };
  }

  return { error: null };
}

export async function saveAnalysis(userId: string, query: string, response: AnalyzeResponse) {
  if (!supabase) return { error: new Error("Supabase is not configured") };
  const { error } = await supabase.from("analysis_history").insert({
    user_id: userId,
    query,
    response,
  });
  return { error };
}

export async function getRecentAnalyses(userId: string) {
  if (!supabase) return { data: [] as AnalysisHistoryItem[], error: null };
  const result = await supabase
    .from("analysis_history")
    .select("id, query, response, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(8);
  return { data: (result.data ?? []) as AnalysisHistoryItem[], error: result.error };
}
