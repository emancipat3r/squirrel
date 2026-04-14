# Squirrel

A single-user, local-first PWA for interstitial journaling — timestamped quick-capture notes throughout the day to combat ADHD context loss.

Inspired by the practice of journaling each time you switch tasks, so "what was I doing?" is always answerable.

## Features

- **Sticky "Working on:" pin** — set a current task and all entries auto-associate with it
- **Quick-capture input** — open app, type, Enter, done. Shift+Enter for newlines
- **Reverse-chronological feed** — today's entries with military-time timestamps
- **Clipboard export** — copies the day's log as tab-aligned plaintext
- **Clear day** — wipe today's entries with a two-click confirm
- **PWA** — installable on desktop and Android, works offline

## Stack

- Vite + React + TypeScript
- IndexedDB via Dexie
- PWA via vite-plugin-pwa (Workbox)
- No backend, no auth, no network calls

## Getting Started

```sh
npm install
npm run dev
```

Build for production:

```sh
npm run build
npm run preview
```

Serve the `dist/` directory from any static host. HTTPS is required for the service worker and PWA install prompt.

## Android / Mobile

Navigate to the hosted URL in Chrome and tap **Menu → Add to Home Screen**. The app launches standalone with no browser chrome and works offline.

## Docker Deployment

```sh
docker compose up -d --build
```

This builds and runs the app on port 8080. The container serves the static build via nginx on port 80 internally.

HTTPS is **not** handled by the container — put a reverse proxy (Caddy, Traefik, nginx proxy manager, etc.) in front of it to terminate TLS. PWA install and service worker registration both require HTTPS.

