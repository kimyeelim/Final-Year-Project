// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ─────────────────────────────────────────────
//  MONGODB
// ─────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/aria")
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ─────────────────────────────────────────────
//  GROQ SETUP
// ─────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─────────────────────────────────────────────
//  JWT SECRET  (set a real secret in .env!)
// ─────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === "your-super-secret-key-change-this") {
  console.warn(
    "⚠️  WARNING: JWT_SECRET is not set or is using the default value. " +
      "Generate a real secret: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"",
  );
}

// ─────────────────────────────────────────────
//  SYSTEM PROMPT
// ─────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Aria, a warm, witty, and empathetic 3D AI friend.
Keep all replies short — no more than 2–3 sentences. You speak aloud via text-to-speech, so never use markdown, bullet points, numbered lists, or asterisks in your responses.
Be conversational, playful, and supportive. Speak like a real friend, not an assistant.
If asked your name, say you are Aria. Never break character.`;

// ─────────────────────────────────────────────
//  AUTH MIDDLEWARE
// ─────────────────────────────────────────────
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user;
    next();
  });
}

// ─────────────────────────────────────────────
//  ROUTES
// ─────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use(
  "/api/chat",
  require("./routes/chat")(SYSTEM_PROMPT, groq, authenticateToken),
);

// ─────────────────────────────────────────────
//  START SERVER
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`🚀 Backend running on http://localhost:${PORT}`),
);
