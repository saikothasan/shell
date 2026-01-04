// cloudflare/containers-demos/containers-demos-main/terminal/host/server.js
const os = require("os");
const pty = require("node-pty");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT, path: "/terminal" });

console.log(`🚀 WebSocket server started on ws://localhost:${PORT}/terminal`);

wss.on("connection", (ws, req) => {
  console.log(`🔗 Client connected: ${req.socket.remoteAddress}`);

  // 1. USE TMUX FOR PERSISTENCE
  // -u: Force UTF-8
  // new-session -A: Attach to existing session if it exists, or create new
  // -s main: Name the session "main"
  const shell = "tmux";
  const args = ["-u", "new-session", "-A", "-s", "main"];

  const ptyProcess = pty.spawn(shell, args, {
    name: "xterm-256color",
    cols: 80,
    rows: 30,
    cwd: process.env.HOME || "/home/node",
    env: { ...process.env, TERM: "xterm-256color" },
  });

  // 2. HANDLE PROTOCOL MESSAGES (JSON)
  ws.on("message", (rawMsg) => {
    try {
      const msg = JSON.parse(rawMsg);
      
      if (msg.type === "input") {
        ptyProcess.write(msg.data);
      } else if (msg.type === "resize") {
        ptyProcess.resize(msg.cols, msg.rows);
      }
    } catch (e) {
      console.error("Failed to parse message:", e);
    }
  });

  // 3. SEND RAW DATA BACK
  // We send raw strings back to client for performance/simplicity, 
  // or we could wrap this in JSON too. For now, raw is fine for output.
  ptyProcess.onData((data) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected (Session remains alive via tmux)");
    // Do NOT kill ptyProcess here. Let tmux keep it running.
  });
});

process.on("SIGINT", () => process.exit(0));
