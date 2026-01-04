# Project Context for Jules

## Overview
This project is a Web-based Terminal implementation running on Cloudflare Workers (Containers) and Durable Objects.
- **Frontend:** `src/terminal.html` (xterm.js via WebSocket).
- **Backend (Worker):** `src/index.ts` (Handles Auth and Proxying).
- **Container Host:** `host/server.js` (Node.js WebSocket server wrapping `tmux` and `node-pty`).

## Architecture
- The system uses a **Durable Object** to manage the container lifecycle.
- Communication happens via a WebSocket connection at `/terminal`.
- **Auth:** Token-based authentication via `TERM_TOKEN`.

## Development Guidelines
- **Package Manager:** `pnpm`.
- **Build:** `wrangler deploy` uses `wrangler.jsonc` configuration.
- **Container:** Defined in `Dockerfile` (Alpine Linux based).

## Common Tasks
- When modifying the host, restart the container to apply changes.
- Ensure `node-pty` recompiles correctly if Node versions change.
