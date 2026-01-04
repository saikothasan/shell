const os = require("os");
const pty = require("node-pty");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT, path: "/terminal" });

console.log(`🚀 WebSocket server started on ws://localhost:${PORT}/terminal`);

wss.on("connection", (ws, req) => {
  console.log(`🔗 Client connected: ${req.socket.remoteAddress}`);

  // 1. PERSISTENT SHELL (TMUX)
  // Ensures session survives disconnects/refreshes
  const shell = "tmux";
  const args = ["-u", "new-session", "-A", "-s", "main"];

  const ptyProcess = pty.spawn(shell, args, {
    name: "xterm-256color",
    cols: 80,
    rows: 30,
    cwd: process.env.HOME || "/home/node",
    env: { ...process.env, TERM: "xterm-256color" },
  });

  // 2. MESSAGE HANDLING
  ws.on("message", (rawMsg) => {
    try {
      const msg = JSON.parse(rawMsg);
      
      if (msg.type === "input") {
        ptyProcess.write(msg.data);
      } else if (msg.type === "resize") {
        ptyProcess.resize(msg.cols, msg.rows);
      } else if (msg.type === "ping") {
        // [Performance] Heartbeat to keep mobile connection alive
        // No action needed, just keeps the socket active
      }
    } catch (e) {
      console.error("Failed to parse message:", e);
    }
  });

  // 3. OUTPUT HANDLING
  ptyProcess.onData((data) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });

  // 4. CLEANUP
  ws.on("close", () => {
    console.log("Client disconnected (Session remains alive via tmux)");
    // Do NOT kill ptyProcess here.
  });

  // Handle errors to prevent crash
  ws.on("error", (err) => console.error("WebSocket error:", err));
});

process.on("SIGINT", () => process.exit(0));
