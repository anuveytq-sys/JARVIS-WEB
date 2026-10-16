import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ALLOWED_ORIGINS = new Set([
  "https://anuveytq-sys.github.io",
  (process.env.ALLOWED_ORIGIN || "").trim()
].filter(Boolean));
const MAX_REQUESTS_PER_MINUTE = 20;
const requestCounts = new Map();
const JARVIS_MODEL = "gemini-2.5-flash";

app.disable("x-powered-by");
app.use(express.json({ limit: "16kb" }));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = !origin || ALLOWED_ORIGINS.has(origin);
  if (origin && allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") return res.sendStatus(allowed ? 204 : 403);
  if (!allowed) return res.status(403).json({ ok: false, error: "Origin not allowed." });
  next();
});

app.use("/api", (req, res, next) => {
  const now = Date.now();
  const key = req.ip || "unknown";
  const current = requestCounts.get(key);
  if (!current || now - current.startedAt >= 60_000) {
    requestCounts.set(key, { startedAt: now, count: 1 });
    return next();
  }
  current.count += 1;
  if (current.count > MAX_REQUESTS_PER_MINUTE) {
    return res.status(429).json({ ok: false, reply: "JARVIS is receiving too many requests. Please wait a minute." });
  }
  next();
});

app.get("/api/status", (_req, res) => {
  res.json({ online: true, name: "JARVIS", mode: "web-ai", voice: "browser", model: JARVIS_MODEL });
});

app.post("/api/command", async (req, res) => {
  const command = String(req.body?.command || "").trim();
  if (!command) return res.status(400).json({ ok: false, reply: "Please enter a message." });
  if (command.length > 4000) return res.status(413).json({ ok: false, reply: "That message is too long. Please keep it under 4,000 characters." });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ ok: false, reply: "JARVIS AI is not configured yet. The backend owner must add GEMINI_API_KEY in the host's private environment settings." });

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: JARVIS_MODEL,
      contents: command,
      config: {
        systemInstruction: "You are JARVIS, a helpful, concise, respectful personal AI assistant with a calm futuristic style. Interpret ambiguous requests in a reasonable, benign, lawful, educational way; do not label ordinary safe tasks as unsafe. If a request genuinely raises a safety concern, briefly explain it and offer a safe alternative. Never bypass safety rules. This is a hosted web version. You cannot access the visitor's device, run commands, open apps, inspect files, or perform actions unless a specific connected tool is available. Never claim to have performed an action you did not perform."
      }
    });
    return res.json({ ok: true, reply: response.text || "I couldn't generate a response. Please try again.", model: JARVIS_MODEL });
  } catch (error) {
    console.error("[JARVIS AI] Request failed:", error?.message || error);
    return res.status(502).json({ ok: false, reply: "My Gemini 2.5 Flash core is temporarily unavailable. Please check the backend Gemini key/model access and try again." });
  }
});

app.get("/api/timers", (_req, res) => {
  res.json({ ok: true, timers: [], note: "Web timers are not synchronized in this safe web backend yet." });
});

app.post("/api/voice", (_req, res) => {
  res.json({ ok: true, reply: "Voice recognition runs in your browser when supported." });

});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`JARVIS web AI backend listening on port ${PORT} using ${JARVIS_MODEL}`);
});
