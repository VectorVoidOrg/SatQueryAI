"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Search, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { deleteConversation, getRecentConversations, type ChatConversation } from "@/lib/history";
import { toast } from "@/store/useToastStore";

export function RecentAnalyses({ refreshKey = 0, embedded = false, searchRequest = 0 }: { refreshKey?: number; embedded?: boolean; searchRequest?: number }) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ChatConversation[]>([]);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingTurnId, setDeletingTurnId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (searchRequest > 0) searchInputRef.current?.focus();
  }, [searchRequest]);

  useEffect(() => {
    if (user) {
      void getRecentConversations(user.id).then(({ data, error }) => {
        if (error) {
          console.error("Could not load analysis history:", error.message);
          toast.error("History unavailable", error.message);
          return;
        }
        setItems(data);
      });
    }
  }, [user, refreshKey]);

  const handleDelete = async (conversation: ChatConversation) => {
    if (!user || deletingTurnId) return;
    setDeletingTurnId(conversation.turnId);
    const result = await deleteConversation(user.id, conversation);
    setDeletingTurnId(null);
    if (result.error) {
      toast.error("Conversation was not deleted", result.error.message);
      return;
    }
    setItems((current) => current.filter((item) => item.turnId !== conversation.turnId));
    toast.success("Conversation deleted");
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleItems = normalizedSearch
    ? items.filter((item) => item.messages.some((message) => message.content.toLowerCase().includes(normalizedSearch)))
    : items;

  return (
    <div className={embedded ? "relative min-h-0" : "relative flex items-center gap-2"}>
      {!embedded && <button type="button" onClick={() => setOpen((value) => !value)} className="glass-pill rounded-full px-3 py-1.5 text-xs text-secondary hover:text-primary" title="Recent conversations">History{items.length > 0 && <span className="ml-1 text-accent">{items.length}</span>}</button>}
      {(embedded || open) && <div className={embedded ? "w-full" : "absolute right-0 top-10 z-30 w-80 rounded-xl border border-stone-300/70 bg-[#FAF6F0] p-3 shadow-xl dark:border-white/10 dark:bg-[#171512]"}>
        {embedded && searchRequest > 0 && <div className="mb-3 flex items-center gap-2 rounded-lg border border-stone-300/60 bg-white/45 px-2 py-1.5 dark:border-white/10 dark:bg-white/5"><Search className="h-3.5 w-3.5 shrink-0 text-secondary" /><input ref={searchInputRef} value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search conversations" className="min-w-0 flex-1 bg-transparent text-xs text-primary outline-none placeholder:text-secondary/60" aria-label="Search conversations" /><button type="button" onClick={() => setSearchQuery("")} className="rounded p-0.5 text-secondary hover:text-primary" aria-label="Clear conversation search" title="Clear search"><X className="h-3.5 w-3.5" /></button></div>}
        <p className="mb-2 px-1 text-[10px] font-mono uppercase tracking-wider text-secondary">{normalizedSearch ? "Search results" : "Recent"}</p>
        {items.length === 0 ? <p className="px-1 text-xs text-secondary">No saved conversations yet.</p> : visibleItems.length === 0 ? <p className="px-1 text-xs text-secondary">No matching conversations.</p> : <div className="max-h-[min(48vh,24rem)] space-y-1 overflow-y-auto">{visibleItems.map((item) => <div key={item.turnId} className="group flex items-start gap-2 rounded-lg px-1 py-1.5 hover:bg-black/5 dark:hover:bg-white/5"><button type="button" onClick={() => router.push(`/chat/${item.turnId}`)} className="min-w-0 flex-1 text-left"><div className="flex items-start gap-2"><MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" /><p className="truncate text-xs text-primary">{item.prompt?.content ?? "Conversation"}</p></div><p className="mt-1 pl-5 text-[10px] text-secondary">{item.messages.length} messages · {new Date(item.createdAt).toLocaleString()}</p></button><button type="button" onClick={() => void handleDelete(item)} disabled={deletingTurnId === item.turnId} className="mt-0.5 rounded p-1 text-secondary opacity-0 transition-opacity hover:bg-rose-500/10 hover:text-rose-600 group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-50" title="Delete conversation" aria-label="Delete conversation"><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div>}
      </div>}
    </div>
  );
}
