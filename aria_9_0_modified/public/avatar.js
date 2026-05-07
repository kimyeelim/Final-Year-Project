// ─────────────────────────────────────────────────────────────
//  AVATAR.JS – FULLY WORKING WITH BROWSER SPEECH SYNTHESIS
//  (no external TTS API, Khmer/English support)
// ─────────────────────────────────────────────────────────────

// ---------- CONSTANTS ----------
const KIRITTA_API_KEY = null; // disabled
const KIRITTA_TTS_URL = null; // disabled

// ---------- THREE.JS SETUP ----------
const canvas3D = document.getElementById("avatar-canvas");
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(280, 280);
renderer.setClearColor(0x000000, 0);
renderer.domElement.style.width = "100%";
renderer.domElement.style.height = "100%";
renderer.domElement.style.borderRadius = "50%";
canvas3D.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
camera.position.set(0, 0.2, 3.8);
camera.lookAt(0, 0.2, 0);

// Lighting
const ambient = new THREE.AmbientLight(0xffffff, 0.65);
scene.add(ambient);
const fillLight = new THREE.DirectionalLight(0xffcc99, 0.8);
fillLight.position.set(1, 2, 2);
scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xffaa88, 0.5);
rimLight.position.set(-1, 1, -2);
scene.add(rimLight);
const keyLight = new THREE.PointLight(0xffaa77, 0.6);
keyLight.position.set(0, 1, 2);
scene.add(keyLight);
const backLight = new THREE.PointLight(0x88aaff, 0.4);
backLight.position.set(0, 1, -1.5);
scene.add(backLight);

// ---------- GLOBAL STATE (shared with script.js) ----------
window.emotionTarget = window.emotionTarget || { r: 0.4, g: 0.6, b: 0.9 };
window.emotionCurrent = window.emotionCurrent || { r: 0.4, g: 0.6, b: 0.9 };
window.state = window.state || "idle";
window.mouthOpen = window.mouthOpen || 0;
window.breathCycle = window.breathCycle || 0;

// ---------- MESH REFERENCES ----------
let headMesh, headMat, leftEye, rightEye, leftBrow, rightBrow;
let mouthGroup, innerMouth, teeth, smile, body, particles;
let pVelocities = [];
const particleCount = 80;

// ---------- BLINK ----------
let blinkTimer = 0;
let nextBlink = 3000 + Math.random() * 5000;
let eyeOpenness = 1;
let blinkTimeout = null;
function randomBlink() {
  return 3000 + Math.random() * 5000;
}

// ---------- CHARACTER CONFIG ----------
let currentChar = {
  id: "aria",
  skinColor: 0xffccaa,
  earColor: null,
  bodyColor: 0x8b5cf6,
  hairColor: 0x8b5a2b,
  eyeColor: 0x4a90e2,
  hasEars: false,
  hasBill: false,
  hasCrown: false,
  hasHat: false,
  hasBow: false,
};

// ---------- HELPER: CLEAR SCENE ----------
function clearScene() {
  const keep = [];
  scene.children.forEach((o) => {
    if (o.isLight) keep.push(o);
  });
  scene.children = keep;
  headMesh = leftEye = rightEye = leftBrow = rightBrow = null;
  mouthGroup = innerMouth = teeth = smile = body = particles = null;
  pVelocities = [];
}

// ---------- BUILD AVATAR FROM CHARACTER ----------
function buildAvatar(ch) {
  clearScene();
  currentChar = ch;

  // HEAD
  headMat = new THREE.MeshPhongMaterial({
    color: ch.skinColor,
    emissive: 0x220e00,
    emissiveIntensity: 0.1,
    shininess: 80,
  });
  headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.68, 64, 64), headMat);
  headMesh.position.y = 0.15;
  headMesh.scale.set(1, 1.05, 0.95);
  scene.add(headMesh);

  // ROUND EARS (Mickey, Minnie, Simba, Goofy, Stitch)
  if (ch.hasEars) {
    const earMat = new THREE.MeshPhongMaterial({ color: ch.earColor });
    const earSize = ch.id === "stitch" ? 0.22 : ch.id === "simba" ? 0.25 : 0.3;
    [
      [-0.65, 0.65, 0.1],
      [0.65, 0.65, 0.1],
    ].forEach(([x, y, z]) => {
      const ear = new THREE.Mesh(
        new THREE.SphereGeometry(earSize, 32, 32),
        earMat,
      );
      ear.position.set(x, y, z);
      if (ch.id === "stitch") {
        ear.scale.set(0.7, 1.4, 0.6);
        ear.position.y = 0.78;
      }
      headMesh.add(ear);
    });
  }

  // DONALD BILL
  if (ch.hasBill) {
    const billMat = new THREE.MeshPhongMaterial({ color: 0xff9900 });
    const bill = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 24, 24),
      billMat,
    );
    bill.position.set(0, -0.08, 0.72);
    bill.scale.set(1.2, 0.55, 0.9);
    headMesh.add(bill);
    for (const nx of [-0.06, 0.06]) {
      const n = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xcc6600 }),
      );
      n.position.set(nx, 0.01, 0.16);
      bill.add(n);
    }
  }

  // CROWN (Evil Queen / Elsa)
  if (ch.hasCrown) {
    const crownColor = ch.id === "elsa" ? 0xaaddff : 0xffd700;
    const crownEmit = ch.id === "elsa" ? 0x224466 : 0x443300;
    const crownMat = new THREE.MeshPhongMaterial({
      color: crownColor,
      shininess: 120,
      emissive: crownEmit,
      emissiveIntensity: 0.2,
    });
    const crownBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.5, 0.1, 6, 1, true),
      crownMat,
    );
    crownBase.position.set(0, 0.74, 0);
    headMesh.add(crownBase);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.26, 6),
        crownMat,
      );
      spike.position.set(Math.cos(a) * 0.42, 0.88, Math.sin(a) * 0.42);
      headMesh.add(spike);
    }
  }

  // DONALD SAILOR HAT
  if (ch.hasHat && ch.id === "donald") {
    const hatMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 0.05, 32),
      hatMat,
    );
    brim.position.set(0, 0.7, 0);
    headMesh.add(brim);
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.38, 0.28, 32),
      hatMat,
    );
    top.position.set(0, 0.88, 0);
    headMesh.add(top);
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.39, 0.39, 0.07, 32),
      new THREE.MeshPhongMaterial({ color: 0x0000cc }),
    );
    band.position.set(0, 0.72, 0);
    headMesh.add(band);
  }

  // GOOFY HAT
  if (ch.hasHat && ch.id === "goofy") {
    const hatMat = new THREE.MeshPhongMaterial({ color: 0x228822 });
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, 0.06, 32),
      hatMat,
    );
    brim.position.set(0, 0.68, 0);
    headMesh.add(brim);
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.38, 0.5, 32),
      hatMat,
    );
    top.position.set(0, 0.95, 0);
    headMesh.add(top);
  }

  // MINNIE BOW
  if (ch.hasBow) {
    const bowMat = new THREE.MeshPhongMaterial({
      color: 0xff0066,
      shininess: 80,
    });
    for (const side of [-1, 1]) {
      const lobe = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 24, 24),
        bowMat,
      );
      lobe.position.set(side * 0.22, 0.88, 0.4);
      lobe.scale.set(1, 0.65, 0.55);
      headMesh.add(lobe);
    }
    const ctr = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), bowMat);
    ctr.position.set(0, 0.88, 0.46);
    headMesh.add(ctr);
  }

  // BLUSH
  function addBlush(x) {
    const bm = new THREE.MeshPhongMaterial({
      color: 0xffaaaa,
      emissive: 0xff8888,
      emissiveIntensity: 0.2,
    });
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 24), bm);
    b.position.set(x, -0.05, 0.68);
    headMesh.add(b);
  }
  addBlush(-0.38);
  addBlush(0.38);

  // EYES
  function makeEye(xOff) {
    const g = new THREE.Group();
    g.position.set(xOff, ch.hasBill ? 0.32 : 0.25, 0.68);
    const white = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 48, 48),
      new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 95 }),
    );
    g.add(white);
    const iris = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 48, 48),
      new THREE.MeshPhongMaterial({
        color: ch.id === "donald" ? 0x111111 : ch.eyeColor,
        shininess: 90,
      }),
    );
    iris.position.z = 0.05;
    g.add(iris);
    const pupil = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x111122 }),
    );
    pupil.position.z = 0.09;
    g.add(pupil);
    const hl = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    hl.position.set(0.04, 0.05, 0.12);
    g.add(hl);
    const lid = new THREE.Mesh(
      new THREE.SphereGeometry(0.165, 32, 16, 0, Math.PI * 2, 0, Math.PI / 1.8),
      new THREE.MeshPhongMaterial({
        color: ch.skinColor,
        side: THREE.DoubleSide,
      }),
    );
    lid.rotation.x = -0.15;
    lid.position.z = 0.02;
    g.add(lid);
    g.userData.lid = lid;
    g.userData.iris = iris;
    headMesh.add(g);
    return g;
  }
  leftEye = makeEye(-0.32);
  rightEye = makeEye(0.32);

  // NOSE (skip if has bill)
  if (!ch.hasBill) {
    const nm = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 32, 32),
      new THREE.MeshPhongMaterial({
        color: ch.id === "simba" ? 0x883300 : 0xffaa88,
        shininess: 70,
      }),
    );
    nm.position.set(0, 0.02, 0.74);
    nm.scale.set(1, 0.85, 0.9);
    headMesh.add(nm);
  }

  // MOUTH
  mouthGroup = new THREE.Group();
  mouthGroup.position.set(
    0,
    ch.hasBill ? -0.08 : -0.15,
    ch.hasBill ? 0.62 : 0.7,
  );
  headMesh.add(mouthGroup);
  smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.13, 0.022, 16, 64, Math.PI),
    new THREE.MeshPhongMaterial({ color: 0xdd8866, shininess: 60 }),
  );
  smile.rotation.x = 0.2;
  smile.position.y = -0.02;
  mouthGroup.add(smile);
  innerMouth = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0x442233 }),
  );
  innerMouth.position.set(0, -0.03, 0.02);
  innerMouth.scale.set(0.8, 0.4, 0.3);
  innerMouth.visible = false;
  mouthGroup.add(innerMouth);
  teeth = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.04, 0.03),
    new THREE.MeshPhongMaterial({ color: 0xfff5e0, shininess: 90 }),
  );
  teeth.position.set(0, 0.01, 0.045);
  teeth.visible = false;
  mouthGroup.add(teeth);

  // EYEBROWS
  function makeBrow(xOff, angle) {
    const g = new THREE.Group();
    g.position.set(xOff, 0.48, 0.72);
    const brow = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.05, 0.06),
      new THREE.MeshPhongMaterial({ color: ch.hairColor }),
    );
    brow.rotation.z = angle;
    brow.rotation.x = -0.1;
    g.add(brow);
    headMesh.add(g);
    return g;
  }
  const ba = ch.id === "evilqueen" ? 0.35 : 0.15;
  leftBrow = makeBrow(-0.28, ba);
  rightBrow = makeBrow(0.28, -ba);

  // HAIR (unless crown or bill)
  if (!ch.hasBill && !ch.hasCrown) {
    const hm = new THREE.MeshPhongMaterial({
      color: ch.hairColor,
      shininess: 40,
    });
    const ht = new THREE.Mesh(new THREE.SphereGeometry(0.45, 32, 32), hm);
    ht.position.set(0, 0.62, 0.35);
    ht.scale.set(1.1, 0.5, 1);
    headMesh.add(ht);
    const hl2 = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 24), hm);
    hl2.position.set(-0.45, 0.48, 0.52);
    hl2.scale.set(0.8, 0.9, 0.7);
    headMesh.add(hl2);
    const hr = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 24), hm);
    hr.position.set(0.45, 0.48, 0.52);
    hr.scale.set(0.8, 0.9, 0.7);
    headMesh.add(hr);
  }
  if (ch.id === "elsa") {
    const bm2 = new THREE.MeshPhongMaterial({ color: 0xe8f4ff });
    const bt = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 32), bm2);
    bt.position.set(0, 0.65, 0.3);
    bt.scale.set(1.1, 0.45, 1);
    headMesh.add(bt);
  }
  if (ch.id === "simba") {
    const mm = new THREE.MeshPhongMaterial({ color: 0x8b4513, shininess: 15 });
    const mn = new THREE.Mesh(new THREE.SphereGeometry(0.78, 24, 24), mm);
    mn.position.set(0, 0.0, -0.05);
    mn.scale.set(1, 0.95, 0.82);
    headMesh.add(mn);
  }

  // BODY
  const bodyMat = new THREE.MeshPhongMaterial({
    color: ch.bodyColor,
    shininess: 50,
  });
  body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.65, 0.9, 24),
    bodyMat,
  );
  body.position.y = -0.45;
  scene.add(body);
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.6, 0.05, 16, 48),
    new THREE.MeshPhongMaterial({ color: ch.skinColor }),
  );
  collar.position.y = -0.15;
  collar.rotation.x = Math.PI / 2;
  body.add(collar);

  // PARTICLES
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(particleCount * 3);
  pVelocities = [];
  for (let i = 0; i < particleCount; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * 1.5;
    pPos[i * 3 + 1] = Math.random() * 1.2 - 0.2;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * 1.2 - 0.5;
    pVelocities.push({
      x: (Math.random() - 0.5) * 0.008,
      y: Math.random() * 0.01,
      z: (Math.random() - 0.5) * 0.008,
    });
  }
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  particles = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({
      color: 0xffaa88,
      size: 0.012,
      transparent: true,
      opacity: 0.5,
    }),
  );
  scene.add(particles);

  // Sync emotion target to skin colour
  const r = ((ch.skinColor >> 16) & 255) / 255;
  const g2 = ((ch.skinColor >> 8) & 255) / 255;
  const b2 = (ch.skinColor & 255) / 255;
  window.emotionTarget = { r, g: g2, b: b2 };
  window.emotionCurrent = { r, g: g2, b: b2 };
}

// Initial build (Aria)
buildAvatar(currentChar);

// Listen for character change from chat.html
window.addEventListener("aria-character-change", (e) => {
  buildAvatar(e.detail);
});

// ---------- SPEECH SYNTHESIS (no external API) ----------
function isKhmer(text) {
  return /[\u1780-\u17FF]/.test(text);
}

let speechUnlocked = false;
function unlockSpeech() {
  if (speechUnlocked) return;
  const dummy = new SpeechSynthesisUtterance("");
  dummy.volume = 0;
  window.speechSynthesis.speak(dummy);
  speechUnlocked = true;
  console.log("Speech unlocked");
}

// Main function called by script.js
// In avatar.js — replace window.speakText with this:
window.speakText = function speakText(text, forceLang) {
  console.log("speakText called:", text);
  return speakWebSpeech(text); // ← must RETURN the promise
};

// Replace speakWebSpeech with a Promise-returning version:
function speakWebSpeech(text) {
  return new Promise((resolve) => {
    unlockSpeech();

    if (!window.speechSynthesis) {
      console.warn("SpeechSynthesis not available");
      resolve();
      return;
    }

    window.speechSynthesis.cancel(); // cancel any leftover speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 1;
    const lang = isKhmer(text) ? "km-KH" : "en-US";
    utterance.lang = lang;

    let lipInterval;
    utterance.onstart = () => {
      window.state = "speaking";
      let t = 0;
      lipInterval = setInterval(() => {
        t += 0.15;
        window.mouthOpen = 0.3 + Math.sin(t * 6) * 0.25 + Math.random() * 0.15;
      }, 80);
    };

    utterance.onend = () => {
      clearInterval(lipInterval);
      window.state = "idle";
      window.mouthOpen = 0;
      resolve(); // ← resolves so script.js can restart mic
    };

    utterance.onerror = (e) => {
      console.error("Speech error:", e);
      clearInterval(lipInterval);
      window.state = "idle";
      window.mouthOpen = 0;
      resolve();
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      window.speechSynthesis.addEventListener(
        "voiceschanged",
        function onVoices() {
          window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
          const match = window.speechSynthesis
            .getVoices()
            .find((v) => v.lang.startsWith(lang.slice(0, 2)));
          if (match) utterance.voice = match;
          window.speechSynthesis.speak(utterance);
        },
      );
    } else {
      const match = voices.find((v) => v.lang.startsWith(lang.slice(0, 2)));
      if (match) utterance.voice = match;
      window.speechSynthesis.speak(utterance);
    }
  });
}

// ---------- ANIMATION LOOP ----------
let lastTime = performance.now();

function animate(now) {
  requestAnimationFrame(animate);
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  if (!headMesh || !headMat) return;

  // Emotion colour lerp
  window.emotionCurrent.r +=
    (window.emotionTarget.r - window.emotionCurrent.r) * 0.03;
  window.emotionCurrent.g +=
    (window.emotionTarget.g - window.emotionCurrent.g) * 0.03;
  window.emotionCurrent.b +=
    (window.emotionTarget.b - window.emotionCurrent.b) * 0.03;
  headMat.color.setRGB(
    window.emotionCurrent.r,
    window.emotionCurrent.g,
    window.emotionCurrent.b,
  );

  // Blush intensity based on state
  const bi =
    window.state === "speaking"
      ? 0.5
      : window.state === "listening"
        ? 0.3
        : 0.2;
  headMat.emissiveIntensity = 0.08 + bi * 0.08;

  // Breathing
  window.breathCycle += dt * (window.state === "speaking" ? 2.2 : 1.2);
  const breathY = Math.sin(window.breathCycle) * 0.008;
  headMesh.position.y = 0.15 + breathY;
  if (body) body.position.y = -0.45 + breathY * 0.3;

  // Idle sway
  headMesh.rotation.z = Math.sin(Date.now() * 0.003) * 0.04;
  headMesh.rotation.x = Math.sin(Date.now() * 0.002) * 0.03;

  // Eyebrows
  if (leftBrow && rightBrow) {
    const base = currentChar.id === "evilqueen" ? 0.35 : 0.15;
    const raise =
      window.state === "listening"
        ? 0.1
        : window.state === "thinking"
          ? 0.15
          : 0;
    leftBrow.rotation.z = base + raise;
    rightBrow.rotation.z = -base + raise;
    leftBrow.position.y = rightBrow.position.y = 0.48 + raise * 0.05;
  }

  // Blink
  if (leftEye && rightEye) {
    blinkTimer += dt * 1000;
    if (blinkTimer >= nextBlink) {
      eyeOpenness = 0;
      if (blinkTimeout) clearTimeout(blinkTimeout);
      blinkTimeout = setTimeout(() => {
        eyeOpenness = 1;
      }, 100);
      blinkTimer = 0;
      nextBlink = randomBlink();
    }
    const targetLidX = eyeOpenness < 0.5 ? -Math.PI / 2 : -0.15;
    [leftEye, rightEye].forEach((eye) => {
      if (eye.userData.lid) {
        eye.userData.lid.rotation.x +=
          (targetLidX - eye.userData.lid.rotation.x) * 0.3;
      }
    });
  }

  // Lip sync
  if (mouthGroup) {
    const to = window.mouthOpen > 0.2 ? Math.min(0.6, window.mouthOpen) : 0;
    if (innerMouth) {
      innerMouth.visible = to > 0.1;
      innerMouth.scale.y = 0.3 + to * 0.8;
      innerMouth.scale.x = 0.8 + to * 0.3;
    }
    if (teeth) teeth.visible = to > 0.15;
    if (smile) {
      smile.scale.y = 1 - to * 0.4;
      smile.position.y = -0.02 + to * 0.02;
    }
  }

  // Particles
  if (particles && pVelocities.length) {
    const pm = particles.material;
    const pos = particles.geometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] += pVelocities[i].x;
      pos[i * 3 + 1] += pVelocities[i].y;
      pos[i * 3 + 2] += pVelocities[i].z;
      if (
        Math.abs(pos[i * 3]) > 1.2 ||
        pos[i * 3 + 1] > 0.8 ||
        pos[i * 3 + 1] < -0.6 ||
        Math.abs(pos[i * 3 + 2]) > 1
      ) {
        pos[i * 3] = (Math.random() - 0.5) * 1.2;
        pos[i * 3 + 1] = Math.random() * 0.8 - 0.2;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 1;
      }
    }
    particles.geometry.attributes.position.needsUpdate = true;
    pm.color.setRGB(
      window.emotionCurrent.r * 0.8 + 0.5,
      window.emotionCurrent.g * 0.6 + 0.4,
      0.9,
    );
    pm.opacity = 0.4 + Math.sin(Date.now() * 0.005) * 0.15;
  }

  renderer.render(scene, camera);
}

animate(performance.now());
