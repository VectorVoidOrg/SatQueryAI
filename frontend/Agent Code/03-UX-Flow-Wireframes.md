# UX Flow & Wireframes — SatQuery AI
### Visual direction: Clean Scientific / Lab — white surfaces, light glassmorphism, sans-serif

---

## 1. Design Language Spec

This is the equivalent of Terranova's "exact CSS values" section — kept prescriptive
so the visual system is consistent across both panels, not two different UIs stitched
together.

| Token | Value | Notes |
|---|---|---|
| Base surface | `#FAFAF9` (near-white, warm) | Not pure `#FFFFFF` — reduces glare, reads more "instrument" than "blank doc" |
| Panel glass | `background: rgba(255,255,255,0.6); backdrop-filter: blur(16px) saturate(140%); border: 1px solid rgba(15,23,42,0.08);` | Used for floating controls over the map only — chat panel itself is solid, not glass (legibility over long text) |
| Primary text | `#0F172A` (slate-900) | |
| Secondary text | `rgba(15,23,42,0.6)` | |
| Accent (AI / active states) | `#2563EB` (blue-600) | Used sparingly: active layer toggle, send button, links |
| Evidence overlay stroke | `#F59E0B` (amber-500) | Deliberately warm/high-contrast against blue basemap + white UI — spatial evidence must never be mistaken for a UI element |
| Success | `#16A34A` | Upload complete, model success |
| Error | `#DC2626` | Upload/query failure |
| Radius | `12px` panels, `9999px` pills/badges, `8px` inputs | shadcn/ui default scale, unmodified |
| Font | Inter (or system-ui fallback) via shadcn defaults | No custom webfont — legibility for dense metric tables matters more than character |
| Shadow (floating controls) | `0 4px 24px rgba(15,23,42,0.08)` | Soft, never a hard drop shadow — keeps the "lab" feel |

Glassmorphism is used **only** for elements that float over the map (layer toggle,
map attribution bar). The chat panel, audit tables, and upload zone are solid white —
this is a deliberate restraint: glass over dense text (long chat messages, metric
tables) hurts legibility, so it's reserved for the map chrome where it's decorative
and there's imagery behind it to refract.

---

## 2. Screen Layout — Wireframe (desktop, ≥1280px)

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│  SatQuery AI            AOI: Sundarbans_2026Q1        [Export Report ⬇]  [⚙ Session]│ ← top bar, 56px
├──────────────────────────────────────────────┬─────────────────────────────────────┤
│                                                │  ┌───────────┬──────────┐           │
│                                                │  │  Chat     │  Audit   │  ← tabs   │
│                                                │  └───────────┴──────────┘           │
│   ┌──────────────────────────────┐            │ ┌───────────────────────────────┐   │
│   │  ⊙ Layers            ▾        │ ← glass    │ │  You                          │   │
│   │  ● Optical Basemap             │  floating  │ │  Has this riverbank eroded    │   │
│   │  ○ SAR Overlay                 │  control,  │ │  since last quarter?          │   │
│   │  ○ AI Change Mask   [opacity ▬]│  top-right │ │                               │   │
│   └──────────────────────────────┘  of map     │ │  SatQuery AI                   │   │
│                                                 │ │  Yes — 3 segments show >2m     │   │
│                                                 │ │  retreat, highlighted in amber │   │
│              [ LEAFLET MAP CANVAS ]            │ │  on the map. Confidence 0.87.  │   │
│              (Optical / SAR / GeoJSON           │ │  [see Audit for model details] │   │
│               evidence rendered here)           │ │                                │   │
│                                                 │ │  ...                            │   │
│                                                 │ └───────────────────────────────┘   │
│                                                 │ ┌───────────────────────────────┐   │
│   ┌──────────────────────┐                     │ │ Ask about this imagery...   ➤ │   │
│   │  ⬇ Drop .tif here      │ ← upload zone,     │ └───────────────────────────────┘   │
│   │  or click to browse    │  bottom-left,       │                                     │
│   │  500MB max             │  collapses once     │                                     │
│   └──────────────────────┘  an asset is loaded  │                                     │
├────────────────────────────────────────────────┴─────────────────────────────────────┤
│  60vw — Geospatial Viewer                        40vw — AI Command Center             │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Audit Tab (right panel, tab switched)

```
┌───────────────────────────────────┐
│  Chat        │  Audit ●            │
├───────────────────────────────────┤
│  Query: "Has this riverbank..."    │
│  ───────────────────────────────   │
│  Models invoked                    │
│   • SAR-ChangeNet v2      142ms    │
│   • VLM-Reasoner (base)   890ms    │
│  ───────────────────────────────   │
│  Metrics                           │
│   IoU (change mask)       0.81     │
│   Confidence               0.87    │
│   Area affected        4,230 m²    │
│  ───────────────────────────────   │
│  [ ⬇ Export this turn ]            │
└───────────────────────────────────┘
```
Structured table, not prose — per PRD FR-11. Each row is a labeled metric, not a
paragraph the user has to parse.

---

## 3. Responsive Behavior

The dual-60/40 split is a **desktop-first, non-negotiable layout down to 1024px**
(this is an analyst tool, not a marketing page — unlike the Terranova reference, we
are not optimizing for a 375px hero). Below 1024px:

- Panels stack vertically: map on top (55vh), chat below (45vh), both full-width.
- The floating layer control collapses to an icon button that opens a bottom sheet
  (shadcn `Sheet` component) rather than staying inline, to avoid crowding a narrow map.
- Upload zone moves into the chat panel's empty state (see §4) rather than floating
  over a now-short map.

No support target below 768px in v1 — flagged as an explicit non-goal, consistent
with PRD NG4.

---

## 4. User Flow — End to End

```
[Landing / empty state]
   │  Right panel shows: "Drop a satellite image or select an existing asset"
   │  Left panel shows: base map, no imagery, muted/grayscale world basemap
   ▼
[User drags .tif onto left-panel upload zone]
   │  Immediate inline progress bar appears in the upload zone itself
   │  (no modal — matches "instrument," not "wizard")
   ▼
[Upload streaming to FastAPI] ──(network error)──▶ [Inline retry, same zone, no reload]
   │  success
   ▼
[Backend returns asset_id + bbox]
   │  Zustand: setAsset() → map flies to bbox, Optical layer auto-enabled
   │  Upload zone collapses/minimizes; layer control becomes populated
   ▼
[User types a question in chat]
   │  Message optimistically appended; assistant bubble shows a pending/thinking state
   │  (three-dot pulse — not a generic spinner, matches per-panel busy state, PRD FR-13... err FR-... US-8)
   ▼
[Middleware responds] ──(error)──▶ [Assistant bubble shows error state + retry, chat preserved]
   │  success
   ▼
[Response rendered]:
   │   text → chat bubble
   │   evidence (GeoJSON) → setEvidence() → amber polygons appear on map, auto-fit
   │       bounds to evidence IF evidence is outside current viewport, otherwise
   │       leave viewport alone (don't yank the user's pan/zoom unnecessarily)
   │   audit → stored on the message, "View in Audit tab" link shown inline
   ▼
[User optionally toggles layers / clicks a GeoJSON feature for a popup]
   ▼
[User clicks "Export Report"]
   │  Button enters loading state (per-button, not full-page)
   │  html2canvas captures map, jsPDF assembles doc
   ▼
[Browser downloads PDF] — no page navigation, no new tab
```

---

## 5. Empty / Loading / Error States (explicit, not left implicit)

| Panel | Empty | Loading | Error |
|---|---|---|---|
| Map | Muted grayscale world basemap, no controls except the collapsed layer toggle (disabled) | N/A — tiles load progressively per Leaflet default | Toast (not modal) if tile source fails; map remains interactive |
| Chat | Centered prompt: *"Drop an image or ask a question to begin"* | Pending assistant bubble, 3-dot pulse animation, 1.2s loop | Inline error bubble with retry icon, red left-border accent, message text preserved |
| Upload zone | Dashed border, upload icon, "Drop .tif here" | Solid border, progress bar fill + % + MB/MB, filename shown | Red border, error message, "Try again" button — same zone, no reset of anything else |
| Audit tab | *"Ask a question to see model details"* muted state | Skeleton rows (3, matching typical metric count) | Not applicable — audit only appears on successful query |

---

## 6. Interaction Details (equivalent to Terranova's animation inventory)

| What | Trigger | Spec |
|---|---|---|
| Panel/chat message entrance | new message appended | fade + translateY(8px→0), 200ms ease-out |
| Assistant thinking indicator | pending state | 3-dot pulse, 1.2s loop, opacity 0.3↔1 staggered 150ms per dot |
| Layer toggle switch | click | shadcn `Switch` default transition (150ms) |
| GeoJSON evidence appearing | setEvidence() fires | polygons fade-in 300ms + a single subtle 400ms pulse on stroke-width (2px→4px→2px) to draw the eye once, then static |
| Map fly-to (new asset / evidence out of view) | asset load or evidence outside viewport | Leaflet's built-in `flyToBounds`, 800ms |
| Upload progress bar | XHR progress events | width transition 100ms linear (matches actual byte progress, not eased/faked) |
| Export button | click → complete | label swaps "Export Report" → "Generating…" (with spinner) → "Downloaded ✓" for 2s → reverts |
| Tab switch (Chat/Audit) | click | shadcn `Tabs` default underline slide, 150ms |

No animation exceeds ~800ms (the map fly-to). This is intentional — an analyst tool
should feel responsive and instrument-like, not cinematic. Contrast with Terranova's
900ms card entrance, which is appropriate for a hero page but would feel sluggish here.

---

## 7. Accessibility Notes

- All map layer toggles are real `<button>`/`<Switch>` elements with `aria-pressed`,
  keyboard-reachable — the floating glass control is not a div-soup click target.
- Color is never the only signal: the amber evidence overlay also gets a distinct
  stroke-dash pattern option if colorblind-safe mode is toggled (flagged for v1.1,
  not blocking).
- Chat input supports `Enter` to send, `Shift+Enter` for newline, standard convention.
- `prefers-reduced-motion` disables the evidence pulse and reduces all transitions to
  ~0, same pattern as the Terranova reference.
