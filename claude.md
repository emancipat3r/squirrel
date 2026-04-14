# Interstitial Journal

A single-user, local-first PWA for interstitial journaling — timestamped quick-capture notes throughout the day to combat ADHD context loss. Inspired by the practice of journaling each time you switch tasks, so "what was I doing?" is always answerable.

## Philosophy

- **Ephemeral, not a system of record.** The tool's job is keeping the user on task *in the moment*. End-of-day export to plaintext is how anything persists long-term. Don't build features that assume the log lives forever.
- **Low-friction capture is everything.** Every extra click or field is a reason not to journal the next thing. Default to zero-config: open app, type, Enter, done.
- **Local-first, no backend.** No server, no auth, no sync. Each device has its own log. Export + paste is the sync mechanism and that's a feature, not a bug.

## Stack

- Vite + React + TypeScript
- IndexedDB via Dexie for persistence
- PWA: service worker + manifest, installable on Linux desktop (Chromium/Firefox) and Android (Chrome "Add to Home Screen")
- Single-page, no routing needed
- Static deploy target (any static host; will likely self-host on homelab nginx)
- No backend, no auth, no network calls

## Data Model

```ts
type Entry = {
  id: string;           // uuid
  timestamp: number;    // unix ms, device-local, assigned on submit
  text: string;
  taskId: string | null; // pinned task at time of entry, if any
};

type Task = {
  id: string;
  label: string;
  startedAt: number;
  endedAt: number | null;
};
```

## v1 Feature Scope

1. **Sticky "Working on:" pin** at the top of the viewport. Shows current task label with inline edit + clear. When set, new entries auto-associate with that task's id.
2. **Quick-capture input** directly below the pin. Multiline textarea. Enter submits, Shift+Enter inserts newline. Auto-focuses on app load.
3. **Reverse-chronological feed** of today's entries below the input. Each row: timestamp column + text column, tab-aligned with `font-variant-numeric: tabular-nums` and a fixed timestamp column width.
4. **Timestamp format:** `M/D/YYYY\tHHMM` (military time, no colon — e.g., `4/13/2026\t2148`). This format is load-bearing; the user has muscle memory for it.
5. **Export button:** copies today's full log to clipboard as tab-aligned plaintext in the exact format above. Multi-line entries indent continuation lines with a leading tab so columns stay aligned (see example below).
6. **"Clear day" button** with confirm dialog. Wipes today's entries from IndexedDB.
7. **PWA install:** manifest, icons (generate simple ones), service worker caching the app shell for offline use.

## Export Format (exact)
4/13/2026	2047	Forgot about laundry - pausing to do that
4/13/2026	2049	JK was building puredns - now doing laundry
4/13/2026	2143	Done with folding laundry and putting away going
to turn the water off outside (watering trees)

Note: tab between date and time, tab between time and text, continuation lines start with two tabs to align under the text column.

## Explicitly Out of Scope for v1

- Sync across devices
- Search / tags / filtering
- Multi-day views or history (today only in the UI; older entries stay in IndexedDB but aren't rendered)
- Notifications / nudges
- Auth / multi-user
- Native binaries (PWA only; Tauri shim is a possible v2 if global hotkeys ever become desirable — keep architecture compatible by not coupling to browser-only APIs unnecessarily)

## UX Details That Matter

- Input never loses focus except when the user clicks away deliberately.
- Submitting an entry clears the input and scrolls the feed to top (newest first).
- The "Working on:" pin persists across reloads (IndexedDB).
- The pin is visually distinct — not just another row. It's the anchor.
- Dark theme default. Glassmorphism is fine but legibility > aesthetic.
- Monospace or tabular-numeric font for timestamps; body text can be sans.

## Dev Notes

- Use Dexie for IndexedDB — raw IndexedDB is miserable.
- Service worker: Workbox via `vite-plugin-pwa` is the path of least resistance.
- No React Router; everything is one view.
- Keep dependencies minimal. No UI kit; hand-rolled CSS or Tailwind is fine. 
