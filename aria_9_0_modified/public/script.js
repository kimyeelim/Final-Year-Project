// ─────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────
let BACKEND = window.location.origin;
let pendingDeleteId = null;
let isSpeaking = false; // ← prevents mic during speech

// ─────────────────────────────────────────────
//  APPLY SAVED SETTINGS
// ─────────────────────────────────────────────
function applyTheme() {
  const theme = localStorage.getItem("aria-theme") || "dark";
  const root = document.documentElement;
  if (theme === "light") {
    root.style.setProperty("--bg", "#f5f5f7");
    root.style.setProperty("--surface", "#ffffff");
    root.style.setProperty("--surface2", "#f0f0f3");
    root.style.setProperty("--border", "#e2e2e6");
    root.style.setProperty("--text", "#1a1a2e");
    root.style.setProperty("--muted", "#6b6b80");
    root.style.setProperty("--nav-active-bg", "#ebebef");
    root.style.setProperty("--nav-active-text", "#1a1a2e");
  } else {
    root.style.setProperty("--bg", "#0f1117");
    root.style.setProperty("--surface", "#1a1f2e");
    root.style.setProperty("--surface2", "#252b3b");
    root.style.setProperty("--border", "#2e3450");
    root.style.setProperty("--text", "#e8eaf6");
    root.style.setProperty("--muted", "#8892b0");
    root.style.setProperty("--nav-active-bg", "#252b3b");
    root.style.setProperty("--nav-active-text", "#e8eaf6");
  }
}

function applyAnimations() {
  const enabled = localStorage.getItem("messageAnimations") !== "false";
  const msgs = document.getElementById("messages");
  if (msgs) msgs.classList.toggle("no-animations", !enabled);
}

// ─────────────────────────────────────────────
//APPLY BACKGROUND IMAGE
// ─────────────────────────────────────────────
function applyBackground() {
  const savedBg = localStorage.getItem("aria-background");
  if (savedBg && savedBg !== "none") {
    document.body.style.background = `url('${savedBg}') no-repeat center center fixed`;
    document.body.style.backgroundSize = "cover";
  } else {
    document.body.style.background = "";
    document.body.style.backgroundColor = "var(--bg)";
  }
}
// ─────────────────────────────────────────────
//  AUTHENTICATION CHECK
// ─────────────────────────────────────────────
async function checkAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }
  try {
    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error();
  } catch {
    localStorage.clear();
    window.location.href = "login.html";
  }
}
checkAuth();
applyTheme();
applyAnimations();

const token = localStorage.getItem("token");

// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
let state = "idle";
let micEnabled = true;
let recognition = null;
let mouthOpen = 0;
let emotionTarget = { r: 0.4, g: 0.6, b: 0.9 };
let emotionCurrent = { r: 0.4, g: 0.6, b: 0.9 };
let currentChatId = null;

window.state = state;
window.mouthOpen = mouthOpen;
window.emotionTarget = emotionTarget;
window.emotionCurrent = emotionCurrent;

// ─────────────────────────────────────────────
//  LANGUAGE HELPERS
// ─────────────────────────────────────────────
function getSettingsLang() {
  return localStorage.getItem("aria-lang") || "en";
}

function isKhmerText(text) {
  return /[\u1780-\u17FF]/.test(text);
}

function getRecognitionLang() {
  return getSettingsLang() === "km" ? "km-KH" : "en-US";
}

let currentRecognitionLang = getRecognitionLang();
window.currentRecognitionLang = currentRecognitionLang;

function updateRecognitionLang() {
  currentRecognitionLang = getRecognitionLang();
  window.currentRecognitionLang = currentRecognitionLang;
  if (recognition) recognition.lang = currentRecognitionLang;
}

// ─────────────────────────────────────────────
//  DOM READY — modal + speech
// ─────────────────────────────────────────────
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("config-modal");
  const saveBtn = document.getElementById("modal-save-btn");

  if (modal && localStorage.getItem("welcomeSeen")) {
    modal.classList.add("hidden");
    if (localStorage.getItem("autoListen") !== "false") initSpeechRecognition();
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      if (modal) modal.classList.add("hidden");
      localStorage.setItem("welcomeSeen", "true");
      if (localStorage.getItem("autoListen") !== "false")
        initSpeechRecognition();
    });
  }
});

// ─────────────────────────────────────────────
//  STATUS / EMOTION HELPERS
// ─────────────────────────────────────────────
const EMOTIONS = {
  idle: {
    color: [0.3, 0.6, 0.9],
    badge: "😊 Friendly",
    dot: "",
    text: "Ready",
  },
  listening: {
    color: [0.2, 0.7, 1.0],
    badge: "👂 Listening",
    dot: "listening",
    text: "Listening...",
  },
  thinking: {
    color: [0.55, 0.3, 0.9],
    badge: "🤔 Thinking",
    dot: "thinking",
    text: "Thinking...",
  },
  speaking: {
    color: [0.9, 0.6, 0.2],
    badge: "💬 Speaking",
    dot: "speaking",
    text: "Speaking...",
  },
};

function setState(s) {
  state = s;
  window.state = s;
  const e = EMOTIONS[s] || EMOTIONS.idle;
  emotionTarget = { r: e.color[0], g: e.color[1], b: e.color[2] };
  window.emotionTarget = emotionTarget;
  const badge = document.getElementById("emotion-badge");
  const dot = document.getElementById("status-dot");
  const stText = document.getElementById("status-text");
  if (badge) badge.textContent = e.badge;
  if (dot) dot.className = "status-dot" + (e.dot ? ` ${e.dot}` : "");
  if (stText) stText.textContent = e.text;
  animateVoiceBars(s === "listening" || s === "speaking");
}

let barsInterval = null;
function animateVoiceBars(active) {
  const bars = document.querySelectorAll(".voice-bar");
  if (barsInterval) clearInterval(barsInterval);
  if (!active) {
    bars.forEach((b, i) => {
      b.style.height = `${[6, 10, 14, 8, 18, 10, 6, 12][i]}px`;
      b.classList.remove("active");
    });
    return;
  }
  bars.forEach((b) => b.classList.add("active"));
  barsInterval = setInterval(
    () =>
      bars.forEach((b) => {
        b.style.height = `${6 + Math.random() * 22}px`;
      }),
    100,
  );
}

// ─────────────────────────────────────────────
//  REPLY BUBBLE HELPERS
// ─────────────────────────────────────────────
let replyHideTimer = null;

function showReplyBubble(text) {
  const bubble = document.getElementById("reply-bubble");
  const replyText = document.getElementById("reply-text");
  const replyTime = document.getElementById("reply-time");
  if (!bubble || !replyText) return;
  replyText.textContent = text;
  if (replyTime) replyTime.textContent = "0";
  bubble.classList.remove("hidden");
  clearTimeout(replyHideTimer);
  replyHideTimer = setTimeout(() => bubble.classList.add("hidden"), 12000);
}

function showTypingBubble() {
  const bubble = document.getElementById("reply-bubble");
  const replyText = document.getElementById("reply-text");
  if (!bubble || !replyText) return;
  replyText.innerHTML =
    '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
  bubble.classList.remove("hidden");
  clearTimeout(replyHideTimer);
}

// ─────────────────────────────────────────────
//  SPEECH RECOGNITION
// ─────────────────────────────────────────────
let recognizing = false;
let silenceTimer = null;
let lastInterim = "";

function initSpeechRecognition() {
  if (!SpeechRecognition) {
    setInfoText("❌ Speech recognition not supported (use Chrome)");
    return;
  }
  if (recognition) return;

  recognition = new SpeechRecognition();
  window.recognition = recognition;
  recognition.lang = getRecognitionLang();
  recognition.interimResults = true;
  recognition.continuous = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    recognizing = true;
    setState("listening");
    const lang = getSettingsLang();
    setInfoText(lang === "km" ? "🎙️ កំពុងស្តាប់... (Listening in Khmer)" : "🎙️ Listening — speak in English");
  };

  recognition.onresult = (e) => {
    if (isSpeaking || state === "speaking" || state === "thinking") return;
    let interim = "",
      final = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) final += t;
      else interim += t;
    }
    const combined = (final || interim).trim();
    if (combined) {
      const bar = document.getElementById("transcript-bar");
      if (bar) {
        bar.textContent = combined;
        bar.classList.add("active");
      }
      lastInterim = combined;
      clearTimeout(silenceTimer);
      if (final) {
        lastInterim = "";
        handleUserInput(final.trim());
      } else {
        silenceTimer = setTimeout(() => {
          if (lastInterim && state === "listening") {
            const text = lastInterim;
            lastInterim = "";
            handleUserInput(text.trim());
          }
        }, 1400);
      }
    }
  };

  recognition.onerror = (e) => {
    if (e.error !== "no-speech" && e.error !== "aborted")
      setInfoText(`⚠️ Mic error: ${e.error}`);
  };
  recognition.onend = () => {
    recognizing = false;
    if (
      micEnabled &&
      state !== "thinking" &&
      state !== "speaking" &&
      !isSpeaking
    ) {
      setTimeout(() => {
        if (micEnabled && !isSpeaking) safeStart();
      }, 400);
    }
  };
  safeStart();
}

function safeStart() {
  if (isSpeaking) return; // ← BLOCK MIC DURING SPEECH
  if (!recognition || recognizing) return;
  try {
    recognition.start();
  } catch (e) {}
}

function safeStop() {
  if (!recognition || !recognizing) return;
  try {
    recognition.stop();
  } catch (e) {}
}

// ─────────────────────────────────────────────
//  MIC TOGGLE
// ─────────────────────────────────────────────
const micBtn = document.getElementById("mic-btn");
if (micBtn) {
  micBtn.addEventListener("click", () => {
    micEnabled = !micEnabled;
    micBtn.classList.toggle("active", !micEnabled);
    if (micEnabled) safeStart();
    else {
      safeStop();
      setState("idle");
    }
  });
}

// ─────────────────────────────────────────────
//  HANDLE USER INPUT → AI → TTS
// ─────────────────────────────────────────────
async function handleUserInput(text) {
  if (!text || state === "thinking" || state === "speaking") return;

  clearTimeout(silenceTimer);
  safeStop();

  const bar = document.getElementById("transcript-bar");
  const langLabel = getSettingsLang() === "km" ? " 🇰🇭" : " 🇺🇸";
  if (bar) {
    bar.textContent = `You${langLabel}: ${text}`;
    bar.classList.add("active");
  }
  lastInterim = "";

  appendMessage("user", text);

  setState("thinking");
  showTypingBubble();

  const startTime = Date.now();

  try {
    if (!currentChatId) {
      const r = await fetch("/api/chat/new", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error("Failed to create chat");
      currentChatId = (await r.json())._id;
      await loadChats();
    }

    const chatRes = await fetch(`/api/chat/${currentChatId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message: text,
        lang: getSettingsLang(),
        respondInKhmer: getSettingsLang() === "km",
      }),
    });
    if (!chatRes.ok) throw new Error(`Chat error ${chatRes.status}`);
    const { reply } = await chatRes.json();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const timeEl = document.getElementById("reply-time");
    if (timeEl) timeEl.textContent = elapsed;

    appendMessage("ai", reply);
    showReplyBubble(reply);
    ("speaking");
    // Replace the speaking block in handleUserInput:
    setState("speaking");
    isSpeaking = true;
    safeStop(); // ← stop mic immediately before speaking

    await speakText(reply);

    await new Promise((resolve) => setTimeout(resolve, 500)); // cooldown
    isSpeaking = false;
    setState("idle");

    if (micEnabled) safeStart(); // only restart AFTER speech + cooldown
  } catch (err) {
    const errMsg = err.message.includes("Failed to fetch")
      ? "Can't reach the backend. Is server.js running?"
      : `Oops: ${err.message}`;
    appendMessage("ai", errMsg);
    showReplyBubble(errMsg);
    const dot = document.getElementById("status-dot");
    if (dot) dot.classList.add("error");
    isSpeaking = false;
  }

  setState("idle");
  if (bar) {
    bar.textContent = "Say Hello!";
    bar.classList.remove("active");
  }
  if (micEnabled) setTimeout(safeStart, 200);
}

async function speakText(text) {
  return new Promise((resolve) => {
    console.log("speakText called with:", text);

    if (!window.speechSynthesis) {
      console.warn("SpeechSynthesis not available");
      resolve();
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Determine language from settings and gender from selected character
    const lang = getSettingsLang(); // "en" or "km"
    const gender = localStorage.getItem("aria-character-gender") || "female";

    function pickVoice(voiceList) {
      const langPrefix = lang === "km" ? "km" : "en";

      // Filter voices matching the language
      let candidates = voiceList.filter((v) =>
        v.lang.toLowerCase().startsWith(langPrefix)
      );

      if (candidates.length === 0) {
        // Fallback: any voice
        candidates = voiceList;
      }

      // Gender heuristics based on voice name keywords
      const femaleKeywords = /female|woman|girl|zira|samantha|victoria|karen|moira|tessa|fiona|veena|amelie|alice|alva|anna|carmit|damayanti|ellen|ioana|joana|kanya|kyoko|laura|lekha|luciana|maged|mariska|mei|milena|monica|nora|paulina|petra|sin|soledad|susan|tamar|ting-ting|xander|yelda|yuna|zhiyu|sara|nora|maja|zosia|ewa/i;
      const maleKeywords = /male|man|boy|david|alex|daniel|thomas|jorge|luca|reed|oliver|rishi|nicolas|xander|eddy|damien|grant|lee|mark|carlos|diego|gonzalo|jorge|juan|lucas|pablo|rodrigo/i;

      let gendered = candidates.filter((v) => {
        const name = v.name.toLowerCase();
        if (gender === "female") return femaleKeywords.test(name);
        if (gender === "male") return maleKeywords.test(name);
        return false;
      });

      // If no gendered match found, try platform-specific fallbacks
      if (gendered.length === 0 && lang === "en") {
        if (gender === "female") {
          // Common female English voices by name
          gendered = candidates.filter((v) =>
            /samantha|zira|victoria|karen|moira|tessa|siri/i.test(v.name)
          );
        } else {
          gendered = candidates.filter((v) =>
            /daniel|david|alex|fred|james|tom/i.test(v.name)
          );
        }
      }

      // Prefer local voices over remote
      const local = (gendered.length ? gendered : candidates).filter(
        (v) => v.localService
      );

      return (
        local[0] ||
        (gendered.length ? gendered[0] : null) ||
        candidates[0] ||
        null
      );
    }

    function applyVoiceAndSpeak() {
      const voices = window.speechSynthesis.getVoices();
      const chosen = pickVoice(voices);
      if (chosen) {
        utterance.voice = chosen;
        utterance.lang = chosen.lang;
        console.log(`Voice selected: ${chosen.name} (${chosen.lang}) [${gender}]`);
      } else {
        utterance.lang = lang === "km" ? "km-KH" : "en-US";
      }
      window.speechSynthesis.speak(utterance);
    }

    let lipInterval = null;

    utterance.onstart = () => {
      console.log("Speech started");
      lipInterval = setInterval(() => {
        mouthOpen = Math.random() * 0.6 + 0.2;
        window.mouthOpen = mouthOpen;
      }, 100);
    };

    utterance.onend = () => {
      console.log("Speech ended");
      if (lipInterval) clearInterval(lipInterval);
      mouthOpen = 0;
      window.mouthOpen = 0;
      resolve();
    };

    utterance.onerror = (e) => {
      console.error("Speech error:", e);
      if (lipInterval) clearInterval(lipInterval);
      mouthOpen = 0;
      window.mouthOpen = 0;
      resolve();
    };

    // Wait for voices to load if not ready yet
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      window.speechSynthesis.addEventListener(
        "voiceschanged",
        function onVoices() {
          window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
          applyVoiceAndSpeak();
        }
      );
    } else {
      applyVoiceAndSpeak();
    }
  });
}

// ─────────────────────────────────────────────
//  UI HELPERS
// ─────────────────────────────────────────────
function appendMessage(role, text) {
  const msgs = document.getElementById("messages");
  if (!msgs) return;
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.innerHTML = `<div class="msg-label">${role === "user" ? "You" : "Aria"}</div>${escapeHtml(text)}`;
  msgs.appendChild(div);
}

function showTyping() {
  const msgs = document.getElementById("messages");
  const div = document.createElement("div");
  div.className = "typing-indicator";
  div.innerHTML =
    '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
  msgs.appendChild(div);
  return div;
}

function setInfoText(t) {
  const bar = document.getElementById("transcript-bar");
  if (bar) bar.textContent = t;
}
function escapeHtml(t) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─────────────────────────────────────────────
//  TEXT INPUT
// ─────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const messageInput = document.getElementById("message-input");
  const sendBtn = document.getElementById("send-btn");

  function sendTextMessage() {
    if (!messageInput) return;
    const text = messageInput.value.trim();
    if (text && state !== "thinking" && state !== "speaking") {
      messageInput.value = "";
      handleUserInput(text);
    }
  }

  if (sendBtn) sendBtn.addEventListener("click", sendTextMessage);
  if (messageInput) {
    messageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        sendTextMessage();
      }
    });
  }
});

// ─────────────────────────────────────────────
//  SIDEBAR — USER
// ─────────────────────────────────────────────
async function loadUser() {
  try {
    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    const el = document.getElementById("userEmail");
    if (el) el.innerText = data.user.displayName || data.user.email;
  } catch (err) {
    console.error("User load error:", err);
  }
}

// ─────────────────────────────────────────────
//  SIDEBAR — CHATS
// ─────────────────────────────────────────────
async function loadChats() {
  try {
    const res = await fetch("/api/chat/history", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const chats = await res.json();
    const list = document.getElementById("chatList");
    if (!list) return;
    list.innerHTML = "";
    chats.forEach((chat) => {
      const div = document.createElement("div");
      div.className =
        "chat-item" + (currentChatId === chat._id ? " active" : "");
      div.dataset.id = chat._id;
      div.innerHTML = `<span>${escapeHtml(chat.title || "New Chat")}</span><button class="delete-chat" data-id="${chat._id}">❌</button>`;
      div.addEventListener("click", (e) => {
        if (!e.target.classList.contains("delete-chat")) loadChat(chat._id);
      });
      div.querySelector(".delete-chat").addEventListener("click", (e) => {
        e.stopPropagation();
        pendingDeleteId = chat._id;
        const modal = document.getElementById("deleteChatModal");
        if (modal) modal.classList.add("show");
      });
      list.appendChild(div);
    });
  } catch (err) {
    console.error("Load chats error:", err);
  }
}

async function loadChat(id) {
  try {
    const res = await fetch(`/api/chat/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load chat");
    const chat = await res.json();
    currentChatId = chat._id;
    const msgs = document.getElementById("messages");
    if (!msgs) return;
    msgs.innerHTML = "";
    const lastAI = [...chat.messages]
      .reverse()
      .find((m) => m.role === "assistant");
    if (lastAI) showReplyBubble(lastAI.content);
    else {
      const bubble = document.getElementById("reply-bubble");
      if (bubble) bubble.classList.add("hidden");
    }
    chat.messages.forEach((msg) => {
      if (msg.role !== "system")
        appendMessage(msg.role === "assistant" ? "ai" : msg.role, msg.content);
    });
    document
      .querySelectorAll(".chat-item")
      .forEach((item) =>
        item.classList.toggle("active", item.dataset.id === id),
      );
  } catch (err) {
    console.error("Load chat error:", err);
  }
}

async function deleteChat(id) {
  if (pendingDeleteId !== id) return;
  try {
    await fetch(`/api/chat/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (currentChatId === id) {
      document.getElementById("messages").innerHTML = "";
      const bubble = document.getElementById("reply-bubble");
      if (bubble) bubble.classList.add("hidden");
      currentChatId = null;
    }
    await loadChats();
  } catch (err) {
    console.error("Delete chat error:", err);
  }
}

const newChatBtn = document.getElementById("newChat");
if (newChatBtn) {
  newChatBtn.onclick = async () => {
    try {
      const res = await fetch("/api/chat/new", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const chat = await res.json();
      currentChatId = chat._id;
      document.getElementById("messages").innerHTML = "";
      const bubble = document.getElementById("reply-bubble");
      if (bubble) bubble.classList.add("hidden");
      await loadChats();
    } catch (err) {
      console.error("New chat error:", err);
    }
  };
}

// ─────────────────────────────────────────────
//  CONFIRMATION MODAL HELPERS
// ─────────────────────────────────────────────
const confirmModal = document.getElementById("confirmationModal");
const confirmTitle = document.getElementById("confirmTitle");
const confirmMessage = document.getElementById("confirmMessage");
const confirmCancel = document.getElementById("confirmCancelBtn");
const confirmOk = document.getElementById("confirmOkBtn");
let confirmCallback = null;
let messageTimeout;

function showConfirm(title, message, onConfirm) {
  if (confirmTitle) confirmTitle.textContent = title;
  if (confirmMessage) confirmMessage.textContent = message;
  confirmCallback = onConfirm;
  if (confirmModal) confirmModal.classList.add("show");
}
function showMessage(message) {
  if (confirmTitle) confirmTitle.textContent = "Success";
  if (confirmMessage) confirmMessage.textContent = message;
  if (confirmModal) confirmModal.classList.add("show");
  const orig = confirmOk ? confirmOk.onclick : null;
  if (confirmOk)
    confirmOk.onclick = () => {
      confirmModal.classList.remove("show");
      if (confirmOk) confirmOk.onclick = orig;
    };
  clearTimeout(messageTimeout);
  messageTimeout = setTimeout(() => {
    if (confirmModal) confirmModal.classList.remove("show");
    if (confirmOk) confirmOk.onclick = orig;
  }, 2000);
}

if (confirmCancel)
  confirmCancel.addEventListener("click", () => {
    confirmModal.classList.remove("show");
    confirmCallback = null;
  });
if (confirmOk)
  confirmOk.addEventListener("click", () => {
    if (confirmCallback) confirmCallback();
    confirmModal.classList.remove("show");
    confirmCallback = null;
  });

async function deleteAllChats() {
  try {
    const res = await fetch("/api/chat/all", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) {
      document.getElementById("messages").innerHTML = "";
      const bubble = document.getElementById("reply-bubble");
      if (bubble) bubble.classList.add("hidden");
      currentChatId = null;
      await loadChats();
      showMessage("All chats deleted successfully.");
    } else throw new Error(data.error || "Failed to delete chats");
  } catch (err) {
    showMessage("Error: " + err.message);
  }
}

// ─────────────────────────────────────────────
//  INITIAL LOAD
// ─────────────────────────────────────────────
loadUser();
loadChats();
