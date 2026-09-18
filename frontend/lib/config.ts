// frontend/lib/config.ts
// Central config — reads server-side env vars via Next.js public runtime.
// BACKEND_URL is server-side only (proxy routes read it directly in route.ts).
// The frontend browser code never talks to the backend directly.

export const APP_CONFIG = {
  /** Display name for the app */
  appName: "SatQuery AI",
  /** SIH problem number */
  sihCode: "SIH 26167",
};
