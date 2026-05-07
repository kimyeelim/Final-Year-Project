# 🎙️ Aria — AI Digital Friend

A real-time AI companion with:
- **Continuous voice listening** (no button to press)
- **GPT-4o** conversational AI with memory
- **OpenAI TTS** (text-to-speech)
- **3D animated avatar** with real lip sync, blinking, breathing, and emotional color shifts

---

## Architecture

```
User Voice
   ↓  (Web Speech API — browser)
Transcript text
   ↓  POST /api/chat
GPT-4o (OpenAI)
   ↓  reply text
   ↓  POST /api/tts
OpenAI TTS → audio/mpeg
   ↓  (Web Audio API + AudioAnalyser)
3D Avatar lip sync + animation
```

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Create `.env`
```bash
cp .env.example .env
# Edit .env and paste your OpenAI API key
```

### 3. Start the backend
```bash
npm start
# Server runs on http://localhost:3001
```

### 4. Open the frontend
Open `index.html` in **Google Chrome** (required for Web Speech API).

> **Tip**: If you serve it via a local server (e.g. `npx serve .`), it works better. Or just open the file directly.

### 5. Configure in the UI
When the modal appears:
- Backend URL: `http://localhost:3001`
- Session ID: any string (per-user memory)
- Voice: choose Aria's TTS voice
- Click **Start Talking** — then just speak!

---

## Files
| File | Description |
|------|-------------|
| `server.js` | Express backend with `/api/chat` and `/api/tts` |
| `index.html` | Full frontend — 3D avatar, speech recognition, chat UI |
| `package.json` | Node.js dependencies |
| `.env.example` | Environment variable template |

---

## Notes
- **Browser**: Chrome/Edge required for Web Speech API
- **HTTPS**: For production, deploy behind HTTPS (required for mic access)
- **CORS**: Backend allows all origins by default — restrict in production
- **Voices**: nova, shimmer, alloy, echo, fable, onyx (OpenAI TTS voices)
- **Memory**: Conversations are stored in-memory per session — restart server to clear all




//104 line in server.js

