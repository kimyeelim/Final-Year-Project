// const express = require("express");
// const router = express.Router();
// const Chat = require("../models/Chat");

// module.exports = (SYSTEM_PROMPT, groq, authenticateToken) => {
//   // ===============================
//   // 🧠 CREATE NEW CHAT
//   // ===============================
//   router.post("/new", authenticateToken, async (req, res) => {
//     try {
//       const chat = new Chat({
//         user: req.user.id,
//         title: "New Chat",
//         messages: [{ role: "system", content: SYSTEM_PROMPT }],
//       });
//       await chat.save();
//       res.json(chat);
//     } catch (err) {
//       res.status(500).json({ error: err.message });
//     }
//   });

//   // ===============================
//   // 📜 GET ALL CHATS (SIDEBAR)
//   // ===============================
//   router.get("/history", authenticateToken, async (req, res) => {
//     try {
//       const chats = await Chat.find({ user: req.user.id })
//         .sort({ updatedAt: -1 })
//         .select("_id title updatedAt");
//       res.json(chats);
//     } catch (err) {
//       res.status(500).json({ error: err.message });
//     }
//   });

//   // ===============================
//   // 🗑️ DELETE ALL CHATS FOR CURRENT USER
//   // ===============================
//   router.delete("/all", authenticateToken, async (req, res) => {
//     try {
//       const userId = req.user.id;
//       const result = await Chat.deleteMany({ user: userId });
//       res.json({
//         success: true,
//         deletedCount: result.deletedCount,
//         message: `Deleted ${result.deletedCount} chats`,
//       });
//     } catch (err) {
//       console.error("Delete all chats error:", err);
//       res.status(500).json({ error: err.message });
//     }
//   });

//   // ===============================
//   // 📂 GET SINGLE CHAT
//   // ===============================
//   router.get("/:id", authenticateToken, async (req, res) => {
//     try {
//       const chat = await Chat.findById(req.params.id);
//       if (!chat) return res.status(404).json({ error: "Chat not found" });
//       if (chat.user.toString() !== req.user.id) {
//         return res.status(403).json({ error: "Forbidden" });
//       }
//       res.json(chat);
//     } catch (err) {
//       res.status(500).json({ error: err.message });
//     }
//   });

//   // ===============================
//   // 💬 SEND MESSAGE (MAIN AI)
//   // ===============================
//   router.post("/:id", authenticateToken, async (req, res) => {
//     try {
//       const { message } = req.body;
//       if (!message || !message.trim()) {
//         return res.status(400).json({ error: "Message cannot be empty" });
//       }
//       const chat = await Chat.findById(req.params.id);
//       if (!chat) return res.status(404).json({ error: "Chat not found" });
//       if (chat.user.toString() !== req.user.id) {
//         return res.status(403).json({ error: "Forbidden" });
//       }
//       chat.messages.push({ role: "user", content: message });
//       const completion = await groq.chat.completions.create({
//         model: "llama-3.3-70b-versatile",
//         messages: chat.messages.map((msg) => ({
//           role: msg.role,
//           content: msg.content,
//         })),
//         temperature: 0.85,
//         max_tokens: 200,
//       });
//       const aiReply = completion.choices[0].message.content;
//       chat.messages.push({ role: "assistant", content: aiReply });
//       if (chat.title === "New Chat") {
//         chat.title = message.substring(0, 30).trim();
//       }
//       await chat.save();
//       res.json({ reply: aiReply });
//     } catch (err) {
//       console.error("Chat error:", err.message);
//       res.status(500).json({ error: err.message });
//     }
//   });

//   // ===============================
//   // 🧹 DELETE CHAT
//   // ===============================
//   router.delete("/:id", authenticateToken, async (req, res) => {
//     try {
//       const chat = await Chat.findById(req.params.id);
//       if (!chat) return res.status(404).json({ error: "Chat not found" });
//       if (chat.user.toString() !== req.user.id) {
//         return res.status(403).json({ error: "Forbidden" });
//       }
//       await Chat.findByIdAndDelete(req.params.id);
//       res.json({ success: true });
//     } catch (err) {
//       res.status(500).json({ error: err.message });
//     }
//   });

//   return router;
// };

const express = require("express");
const router = express.Router();
const Chat = require("../models/Chat");

module.exports = (SYSTEM_PROMPT, groq, authenticateToken) => {
  // ===============================
  // 🧠 CREATE NEW CHAT
  // ===============================
  router.post("/new", authenticateToken, async (req, res) => {
    try {
      const chat = new Chat({
        user: req.user.id,
        title: "New Chat",
        messages: [{ role: "system", content: SYSTEM_PROMPT }],
      });
      await chat.save();
      res.json(chat);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===============================
  // 📜 GET ALL CHATS (SIDEBAR)
  // ===============================
  router.get("/history", authenticateToken, async (req, res) => {
    try {
      const chats = await Chat.find({ user: req.user.id })
        .sort({ updatedAt: -1 })
        .select("_id title updatedAt");
      res.json(chats);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===============================
  // 🗑️ DELETE ALL CHATS FOR CURRENT USER
  // ===============================
  router.delete("/all", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const result = await Chat.deleteMany({ user: userId });
      res.json({
        success: true,
        deletedCount: result.deletedCount,
        message: `Deleted ${result.deletedCount} chats`,
      });
    } catch (err) {
      console.error("Delete all chats error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ===============================
  // 📂 GET SINGLE CHAT
  // ===============================
  router.get("/:id", authenticateToken, async (req, res) => {
    try {
      const chat = await Chat.findById(req.params.id);
      if (!chat) return res.status(404).json({ error: "Chat not found" });
      if (chat.user.toString() !== req.user.id) {
        return res.status(403).json({ error: "Forbidden" });
      }
      res.json(chat);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===============================
  // 💬 SEND MESSAGE (MAIN AI)
  // ===============================
  router.post("/:id", authenticateToken, async (req, res) => {
    try {
      const { message, respondInKhmer } = req.body;
      if (!message || !message.trim()) {
        return res.status(400).json({ error: "Message cannot be empty" });
      }
      const chat = await Chat.findById(req.params.id);
      if (!chat) return res.status(404).json({ error: "Chat not found" });
      if (chat.user.toString() !== req.user.id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Build messages — inject Khmer instruction if needed
      let messages = chat.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      if (respondInKhmer) {
        // Prepend a Khmer-language instruction to the system prompt
        const khmerInstruction = {
          role: "system",
          content:
            "ចូររៀបចំចម្លើយជាភាសាខ្មែរ។ " +
            "You MUST reply entirely in Khmer (Cambodian) script. " +
            "Do NOT use English in your response. Keep replies concise and natural.",
        };
        messages = [khmerInstruction, ...messages];
      }

      chat.messages.push({ role: "user", content: message });
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [...messages, { role: "user", content: message }],
        temperature: 0.85,
        max_tokens: 300,
      });
      const aiReply = completion.choices[0].message.content;
      chat.messages.push({ role: "assistant", content: aiReply });
      if (chat.title === "New Chat") {
        chat.title = message.substring(0, 30).trim();
      }
      await chat.save();
      res.json({ reply: aiReply });
    } catch (err) {
      console.error("Chat error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ===============================
  // 🧹 DELETE CHAT
  // ===============================
  router.delete("/:id", authenticateToken, async (req, res) => {
    try {
      const chat = await Chat.findById(req.params.id);
      if (!chat) return res.status(404).json({ error: "Chat not found" });
      if (chat.user.toString() !== req.user.id) {
        return res.status(403).json({ error: "Forbidden" });
      }
      await Chat.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
