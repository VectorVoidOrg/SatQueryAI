# SatQuery AI — Next.js Frontend

The agentic operator UI for **SatQuery AI** (SIH 26167).

## Architecture & Integration

- **Zero Mock Layer**: All requests proxy directly to the FastAPI backend (`POST /analyze`).
- **Server-Side Proxy Routes**: Next.js App Router API handlers (`app/api/analyze/route.ts`, `app/api/report/[id]/route.ts`) forward multipart FormData requests directly to `${BACKEND_URL}`.
- **Auditable Visual Evidence**: Displays rendered change overlays, bounding box regions, model-vs-pixel agreement cross-checks, and downloadable per-analysis report records.

## Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env.local from .env.example and add your Supabase Project URL
#    and publishable key from Supabase Dashboard > Project Settings > API

# 3. Run dev server (uses the configured FastAPI tunnel)
npm run dev

# Or set a different backend URL
BACKEND_URL=https://your-tunnel.trycloudflare.com npm run dev
```

## Supabase Setup

1. In your Supabase organization, create or open a **project**. Organization membership alone is not an application database connection; the project contains the database and Auth instance.
2. Copy `.env.example` to `.env.local` and put `NEXT_PUBLIC_SUPABASE_URL` plus `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from that project’s **Project Settings > API** page. An older project can use `NEXT_PUBLIC_SUPABASE_ANON_KEY` instead. These are safe browser values; never put a service-role key in the frontend.
3. Open that project’s **SQL Editor**, paste [`supabase/schema.sql`](supabase/schema.sql), and run it once. It creates `profiles`, `analysis_history`, the signup trigger, indexes, and row-level security policies.
4. In Authentication > Providers, keep Email enabled. For the simplest local flow, disable **Confirm email** while developing. If it stays enabled, registration shows a confirmation message and the user must verify their email before signing in.
5. Start the frontend with `npm run dev`. The app now requires sign-in or registration, and successful analyses appear in the History menu for that account only.
6. The updated schema also creates `chat_history`. Every submitted prompt is stored as a `user` message before inference; every successful ML response is stored as an `assistant` message with its readable answer and complete structured response JSON. If the backend is unavailable, the prompt remains stored and no assistant message is fabricated.

If `chat_history` is missing, run [`supabase/chat_history_migration.sql`](supabase/chat_history_migration.sql) in the Supabase SQL Editor, then refresh the app. The migration also asks PostgREST to reload its schema cache. The multi-step loader remains visible for the entire request and stops only when the backend returns a response or an error.

The browser uses the project’s public key and RLS. No server-side secret is needed for this flow. To deploy through the Supabase CLI instead of the SQL Editor, first run `npx supabase login` in your own terminal, then link the project with `npx supabase link --project-ref YOUR_PROJECT_REF`; account authentication must happen on your machine because it requires your Supabase credentials.

## Production Build

```bash
npm run build
```
