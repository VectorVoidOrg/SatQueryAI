import type { ImageSlot } from "@/lib/types/analyze";

const DATABASE_NAME = "satquery-drafts";
const STORE_NAME = "prompts";
const DRAFT_KEY = "active";

interface StoredDraft {
  key: string;
  query: string;
  images: ImageSlot[];
}

function openDraftDatabase(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open draft storage."));
  });
}

export async function loadPromptDraft(): Promise<StoredDraft | null> {
  if (typeof window === "undefined" || !window.indexedDB) return null;
  const database = await openDraftDatabase();
  return new Promise<StoredDraft | null>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(DRAFT_KEY);
    request.onsuccess = () => resolve((request.result as StoredDraft | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Could not read prompt draft."));
  }).finally(() => database.close());
}

export async function savePromptDraft(query: string, images: ImageSlot[]) {
  if (typeof window === "undefined" || !window.indexedDB) return;
  const database = await openDraftDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = database
      .transaction(STORE_NAME, "readwrite")
      .objectStore(STORE_NAME)
      .put({ key: DRAFT_KEY, query, images } satisfies StoredDraft);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Could not save prompt draft."));
  }).finally(() => database.close());
}

export async function clearPromptDraft() {
  if (typeof window === "undefined" || !window.indexedDB) return;
  const database = await openDraftDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(DRAFT_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Could not clear prompt draft."));
  }).finally(() => database.close());
}

export async function saveConversationImages(conversationId: string, images: ImageSlot[]) {
  if (typeof window === "undefined" || !window.indexedDB || images.length === 0) return;
  const database = await openDraftDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = database
      .transaction(STORE_NAME, "readwrite")
      .objectStore(STORE_NAME)
      .put({ key: `conversation:${conversationId}`, query: "", images } satisfies StoredDraft);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Could not save conversation images."));
  }).finally(() => database.close());
}

export async function loadConversationImages(conversationId: string): Promise<ImageSlot[]> {
  if (typeof window === "undefined" || !window.indexedDB) return [];
  const database = await openDraftDatabase();
  return new Promise<ImageSlot[]>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(`conversation:${conversationId}`);
    request.onsuccess = () => resolve((request.result as StoredDraft | undefined)?.images ?? []);
    request.onerror = () => reject(request.error ?? new Error("Could not read conversation images."));
  }).finally(() => database.close());
}
