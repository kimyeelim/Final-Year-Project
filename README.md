# 🎙️ Aria — AI Digital Friend

A real‑time AI companion that listens continuously (no wake word), generates responses using **Groq’s Llama 3.3 70B** (free tier), speaks back using your browser’s built‑in speech synthesis, and shows a fully animated 3D cartoon avatar.

🔊 **Speech recognition** (voice input)  
💬 **Real‑time AI chat** (with conversation memory)  
🗣️ **Voice output** (browser TTS, no API key)  
🧸 **Customizable 3D avatar** (10 cartoon characters, blinking, breathing, lip‑sync)  
🔐 **User authentication** (JWT + MongoDB)  
💾 **Persistent chat history** (per user, stored in MongoDB)

---

## 🧠 How It Works

```
User speaks
   ↓  (Web Speech API – continuous mode)
Transcript text
   ↓  POST /api/chat/:chatId
Backend (Express + JWT)
   ↓  (retrieve chat history from MongoDB)
Groq LLM (Llama 3.3 70B – free)
   ↓  reply text
   ↓  save to MongoDB, return JSON
Frontend displays reply & calls speakText()
   ↓  Browser SpeechSynthesis API
   ↓  (timer simulates mouth movement)
3D avatar mouth opens + idle animations (blink, breathe, eyebrows)
```

---

## 🚀 Quick Start

### 1. Clone & install
```bash
git clone https://github.com/your-username/aria-digital-friend.git
cd aria-digital-friend
npm install
```

### 2. Environment variables
Create a `.env` file in the root folder:
```env
PORT=3001
MONGODB_URI=mongodb+srv://your-username:your-password@cluster0.xxxx.mongodb.net/aria
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxx
JWT_SECRET=your-super-secret-key (generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
```

### 3. Start the server
```bash
npm start
# or: node server.js
```

### 4. Open the frontend
Visit **http://localhost:3001** in Google Chrome (required for Web Speech API).  
Register an account, log in, and start speaking or typing.

---

## 🎮 Features

- **🎙️ Continuous listening** – no button to press; auto‑submit after silence.
- **⌨️ Text input** – type messages and press Enter.
- **🧸 10 cartoon characters** – Aria, Mickey, Minnie, Donald, Evil Queen, Elsa, Simba, Moana, Goofy, Stitch. Switch anytime in Settings.
- **🌓 Light / Dark / System themes**.
- **🖼️ Custom backgrounds** – preset images + upload your own (stored in localStorage).
- **🗣️ Voice output** – uses your OS voices (English + Khmer supported if available).
- **💬 Chat history** – sidebar lists all past conversations; click to load.
- **🔐 Email/password authentication** – JWT stored in localStorage.
- **⚙️ Full settings panel** – change password, export data, delete all chats, toggle auto‑listen, message animations, etc.

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML5, CSS3, JavaScript (ES6) |
| 3D Graphics | Three.js (r128) – custom‑built cartoon avatar |
| Speech Input | Web Speech API (SpeechRecognition) |
| Speech Output | Web Speech API (SpeechSynthesis) |
| Backend | Node.js + Express.js |
| AI Model | Groq (Llama 3.3 70B) – free tier, no credit card required |
| Database | MongoDB (Mongoose ODM) |
| Authentication | JWT + bcrypt |
| Environment | dotenv |

---

## 📁 Project Structure

```
aria-digital-friend/
├── .env
├── server.js
├── models/
│   ├── User.js
│   └── Chat.js
├── routes/
│   ├── auth.js
│   └── chat.js
├── middleware/
│   └── authMiddleware.js
├── public/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── chat.html
│   ├── style.css
│   ├── script.js
│   └── avatar.js
└── package.json
```

---

## 🧪 Testing

- **Speak naturally** – after a short pause, your message is sent automatically.
- **Type & Enter** – works in the input pill.
- **Switch character** – go to Settings → Avatar Character → click a new one.
- **Change language** – Settings → Language (English / Khmer). Recognition language changes immediately.
- **Delete all chats** – in Settings → Data → “Delete all chats” (danger zone).

---

## 🐛 Known Limitations

- **Web Speech API** works best in Chrome/Edge. Firefox/Safari may have limited support.
- **Khmer TTS** depends on your operating system voices (if missing, English fallback is used).
- **Lip‑sync** is simulated (timer‑based) – not sample‑accurate, but users find it charming.
- **Session memory** – chat history per user is stored, but there is no long‑term vector memory (future work).

---

## 🤝 Acknowledgements

This project was developed with assistance from AI‑assisted programming tools:

- **[DeepSeek](https://deepseek.com)** – backend route refactoring, MongoDB queries, JWT logic.
- **[Claude AI (Anthropic)](https://claude.ai)** – Three.js avatar animations, speech recognition event handling, CSS styling.
- **[ChatGPT (OpenAI)](https://chat.openai.com)** – system architecture, error handling, Groq API integration.

Thanks to **Groq** for providing a fast, free LLM API, and to the open‑source community behind Three.js, Express, and MongoDB.

---

## 📄 License

Academic project – Final Year Project. All rights reserved.

---

## 👤 Authors

- **Lim Kimyee** (2023511)
- **Prak Channy** (2023506)

Supervised by **Dr. Tek Ming** – FYP 401 002

---

## ⭐ Future Work

- Add long‑term memory (vector database like Pinecone).
- Replace Web Speech API with offline recognition (Vosk).
- Improve lip‑sync using real‑time audio amplitude (Web Audio API).
- Deploy on cloud (Render + Vercel) for public demo.

---

**Enjoy your conversation with Aria! 🎉**
```
