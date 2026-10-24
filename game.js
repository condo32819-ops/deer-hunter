(() => {
  'use strict';

  const THREE_OK = typeof window.THREE !== 'undefined';
  const params = new URLSearchParams(location.search);
  const ROUND_SECONDS = params.get('quick') === '1' ? 12 : 150;
  const MAG = 5;
  const RESERVE_START = 10;
  const MAX_ANIMALS = 12;
  const HIP_FOV = 52;
  const SCOPE_FOV = 15;
  const START_YAW = -0.08;
  const START_PITCH = -0.1;
  const CAM = { x: 0, y: 3.42, z: 8.15 };
  const HORIZON = 0xf0d2ae;
  const BEST_KEY = 'deer-hunter-best';
  const MUTE_KEY = 'deer-hunter-muted';
  const TURN_KEY = 'deer-hunter-turn';
  const POINTS = { buck: 150, doe: 100, boar: 120, rabbit: 50, blue: 400, piglet: 80, giraffe: 200, elephant: 250 };
  const WALK = { buck: 1.35, doe: 1.55, boar: 1.15, rabbit: 2.35, blue: 2.4, piglet: 1.6, giraffe: 1.05, elephant: 0.82 };
  const FLEE = { buck: 7.2, doe: 7.6, boar: 6.2, rabbit: 9.2, blue: 11.4, piglet: 4.4, giraffe: 2.4, elephant: 1.7 };
  const DASH = { blue: 14.2, piglet: 4.9 };
  const NAMES = { buck: 'Buck', doe: 'Doe', boar: 'Boar', rabbit: 'Cottontail', blue: 'Blue deer', piglet: 'Piglet', giraffe: 'Giraffe', elephant: 'Elephant' };

  const $ = (id) => document.getElementById(id);
  const titleScreen = $('title');
  const hud = $('hud');
  const endScreen = $('end');
  const startBtn = $('start-btn');
  const againBtn = $('again-btn');
  const fireBtn = $('fire');
  const reloadBtn = $('reload');
  const scopeBtn = $('scope-btn');
  const scoreEl = $('score');
  const timerEl = $('timer');
  const pipsEl = $('pips');
  const reserveEl = $('reserve');
  const hintEl = $('hint');
  const toastEl = $('toast');
  const bootMsg = $('boot-msg');
  const bestLine = $('best-line');
  const endReason = $('end-reason');
  const endScore = $('end-score');
  const endBest = $('end-best');
  const endHarvest = $('end-harvest');
  const endStats = $('end-stats');
  const scopeEl = $('scope');
  const reticle = $('reticle');
  const rangeEl = $('range');
  const fader = $('fader');
  const tiltBtn = $('tilt-btn');
  const rotateEl = $('rotate');
  const playAnywayBtn = $('play-anyway');
  const playSidewaysBtn = $('play-sideways');
  const turnTitleBtn = $('turn-title');
  const turnHudBtn = $('turn-hud');
  const stage = $('stage');
  const bangEl = $('bang');
  const streakEl = $('streak');
  const ammoPanel = document.querySelector('.ammo-panel');
  const muteButtons = [$('mute-title'), $('mute-hud')];
  const ANDROID = /Android/i.test(navigator.userAgent || '');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let phase = 'title';
  let starting = false;
  let score = 0;
  let best = 0;
  let shots = 0;
  let hits = 0;
  let ammo = MAG;
  let reserve = RESERVE_START;
  let timeLeft = ROUND_SECONDS;
  let scoped = false;
  let scopedTime = 0;
  let reloading = false;
  let reloadLeft = 0;
  let autoReload = 0;
  let bolt = 0;
  let emptyHold = 0;
  let yaw = START_YAW;
  let pitch = START_PITCH;
  let tiltYaw = 0;
  let tiltPitch = 0;
  let recoil = 0;
  let yawKick = 0;
  let rifleKick = 0;
  let flashLife = 0;
  let userAimed = false;
  let time = 0;
  let hintTime = 0;
  let toastTime = 0;
  let spawnCooldown = 6;
  let rangeAcc = 0;
  let birdIn = 3;
  let muted = false;
  let playAnyway = false;
  let turnPref = 0;
  let turn = 0;
  let landscapeLock = 'idle';
  let vibrated = 0;
  let tiltOn = false;
  let tiltBase = null;
  let tiltListening = false;

  const harvest = { buck: 0, doe: 0, boar: 0, rabbit: 0, blue: 0, piglet: 0, giraffe: 0, elephant: 0 };
  const animals = [];
  const trees = [];
  const clouds = [];
  const birds = [];
  const mists = [];
  const blockers = [];
  const puffPool = [];

  let audioCtx = null;
  let master = null;
  let windStarted = false;

  let renderer;
  let scene;
  let camera;
  let rifle;
  let flash;
  let raycaster;
  const zeroNdc = THREE_OK ? new THREE.Vector2(0, 0) : null;
  const groundPlane = THREE_OK ? new THREE.Plane(new THREE.Vector3(0, 1, 0), 0) : null;
  const _box = THREE_OK ? new THREE.Box3() : null;
  const hitA = THREE_OK ? new THREE.Vector3() : null;
  const hitB = THREE_OK ? new THREE.Vector3() : null;
  const hitG = THREE_OK ? new THREE.Vector3() : null;
  const bestPoint = THREE_OK ? new THREE.Vector3() : null;
  const woodPoint = THREE_OK ? new THREE.Vector3() : null;

  try {
    best = Number(localStorage.getItem(BEST_KEY) || 0) || 0;
    muted = localStorage.getItem(MUTE_KEY) === '1';
    playAnyway = sessionStorage.getItem('deer-hunter-portrait-ok') === '1';
    const savedTurn = Number(sessionStorage.getItem(TURN_KEY));
    if (savedTurn === 90 || savedTurn === -90) turnPref = savedTurn;
  } catch (err) { /* private mode */ }

  for (let i = 0; i < MAG; i++) {
    const pip = document.createElement('i');
    pip.className = 'pip';
    pipsEl.appendChild(pip);
  }

  function showBoot(message) {
    bootMsg.textContent = message;
    startBtn.disabled = true;
    startBtn.textContent = 'Unavailable';
  }

  if (!THREE_OK) {
    showBoot('Could not load the 3D library. Check your connection and reload.');
    return;
  }

  function damp(current, target, lambda, dt) {
    return current + (target - current) * (1 - Math.exp(-lambda * dt));
  }

  function viewportSamples() {
    const samples = [];
    if (window.innerWidth > 0 && window.innerHeight > 0) {
      samples.push([window.innerWidth, window.innerHeight]);
    }
    const vv = window.visualViewport;
    if (vv && vv.width > 0 && vv.height > 0) samples.push([vv.width, vv.height]);
    const doc = document.documentElement;
    if (doc && doc.clientWidth > 0 && doc.clientHeight > 0) {
      samples.push([doc.clientWidth, doc.clientHeight]);
    }
    return samples;
  }

  function rawViewport() {
    const vv = window.visualViewport;
    let w = window.innerWidth || 0;
    let h = window.innerHeight || 0;
    let x = 0;
    let y = 0;
    if (vv && vv.width > 0 && vv.height > 0) {
      w = vv.width;
      h = vv.height;
      x = vv.offsetLeft || 0;
      y = vv.offsetTop || 0;
    }
    const doc = document.documentElement;
    if (doc && doc.clientWidth > 0 && doc.clientHeight > 0 && doc.clientWidth * doc.clientHeight > w * h + 40) {
      w = doc.clientWidth;
      h = doc.clientHeight;
      x = 0;
      y = 0;
    }
    return { w: Math.round(w), h: Math.round(h), x: Math.round(x), y: Math.round(y) };
  }

  // Portrait follows the real viewport, never the CSS-rotated stage.
  // The hint is stricter: one landscape reading keeps it hidden.
  function isPortraitLayout() {
    const box = rawViewport();
    return box.h > box.w + 20;
  }

  function viewBox() {
    if (stage && stage.clientWidth > 0 && stage.clientHeight > 0) {
      return { w: stage.clientWidth, h: stage.clientHeight };
    }
    const box = rawViewport();
    return { w: box.w, h: box.h };
  }

  function shouldShowHint() {
    if (playAnyway || turnPref !== 0) return false;
    const samples = viewportSamples();
    if (!samples.length) return false;
    if (samples.some(([w, h]) => w >= h)) return false;
    return samples.every(([w, h]) => h > w + 20);
  }

  function hintBlocking() {
    return rotateEl.classList.contains('show');
  }

  function updateTurnButtons() {
    const label = turnPref === 90 ? 'Turn the other way' : turnPref === -90 ? 'Upright view' : 'Rotate view';
    if (turnTitleBtn) {
      turnTitleBtn.textContent = label;
      turnTitleBtn.setAttribute('aria-pressed', turnPref ? 'true' : 'false');
    }
    if (turnHudBtn) {
      turnHudBtn.setAttribute('aria-label', label);
      turnHudBtn.setAttribute('aria-pressed', turnPref ? 'true' : 'false');
    }
  }

  function layoutStage() {
    if (!stage) return;
    const box = rawViewport();
    const portrait = box.h > box.w + 20;
    turn = portrait ? turnPref : 0;
    document.body.classList.toggle('portrait', portrait && turn === 0);
    document.body.classList.toggle('turned', turn !== 0);
    stage.style.position = 'fixed';
    stage.style.transformOrigin = 'top left';
    if (turn === 90) {
      stage.style.width = box.h + 'px';
      stage.style.height = box.w + 'px';
      stage.style.left = box.x + 'px';
      stage.style.top = (box.y + box.h) + 'px';
      stage.style.transform = 'rotate(-90deg)';
    } else if (turn === -90) {
      stage.style.width = box.h + 'px';
      stage.style.height = box.w + 'px';
      stage.style.left = (box.x + box.w) + 'px';
      stage.style.top = box.y + 'px';
      stage.style.transform = 'rotate(90deg)';
    } else {
      stage.style.width = box.w + 'px';
      stage.style.height = box.h + 'px';
      stage.style.left = box.x + 'px';
      stage.style.top = box.y + 'px';
      stage.style.transform = 'none';
    }
    updateTurnButtons();
  }

  function syncOrientation() {
    layoutStage();
    const show = shouldShowHint();
    rotateEl.classList.toggle('show', show);
    rotateEl.setAttribute('aria-hidden', show ? 'false' : 'true');
    try { window.scrollTo(0, 0); } catch (err) { /* ignore */ }
    if (renderer && camera) resize();
  }

  let syncQueued = false;
  function scheduleSync() {
    syncOrientation();
    if (syncQueued) return;
    syncQueued = true;
    [80, 240, 600, 1100].forEach((ms, index, all) => {
      setTimeout(() => {
        syncOrientation();
        if (index === all.length - 1) syncQueued = false;
      }, ms);
    });
  }

  function rememberTurn() {
    try { sessionStorage.setItem(TURN_KEY, String(turnPref)); } catch (err) { /* ignore */ }
  }

  function setTurnPref(value) {
    turnPref = value === 90 || value === -90 ? value : 0;
    if (turnPref !== 0) {
      playAnyway = true;
      try { sessionStorage.setItem('deer-hunter-portrait-ok', '1'); } catch (err) { /* ignore */ }
    }
    rememberTurn();
    syncOrientation();
  }

  function cycleTurn() {
    setTurnPref(turnPref === 0 ? 90 : turnPref === 90 ? -90 : 0);
  }

  function fallbackSideways() {
    if (!ANDROID || !isPortraitLayout()) return;
    if (turnPref === 0) setTurnPref(90);
    else syncOrientation();
  }

  // Android Chrome can turn a fullscreen page sideways even when auto-rotate
  // is off. The lock has to run inside the start-button gesture, and it
  // rejects when fullscreen is unavailable. iOS has no lock; it keeps the
  // upright layout and the optional Rotate view button.
  function engageLandscape() {
    const root = document.documentElement;
    const req = root.requestFullscreen || root.webkitRequestFullscreen;
    const already = document.fullscreenElement || document.webkitFullscreenElement;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const tryLock = () => {
      if (!ANDROID || !screen.orientation || typeof screen.orientation.lock !== 'function') {
        landscapeLock = 'skipped';
        return Promise.reject(new Error('skip'));
      }
      landscapeLock = 'pending';
      return screen.orientation.lock('landscape').then(() => {
        landscapeLock = 'locked';
        syncOrientation();
      }, () => {
        if (landscapeLock !== 'locked') landscapeLock = 'refused';
      });
    };
    if (coarse && req && !already) {
      try {
        const pending = req.call(root);
        if (pending && typeof pending.then === 'function') pending.then(() => { if (ANDROID) tryLock(); }).catch(() => {});
      } catch (err) { /* iOS Safari throws */ }
    }
    if (ANDROID) {
      tryLock().catch(() => {});
      setTimeout(() => {
        if (!isPortraitLayout()) return;
        if (landscapeLock === 'locked') {
          setTimeout(() => { if (isPortraitLayout()) fallbackSideways(); }, 480);
          return;
        }
        fallbackSideways();
      }, 700);
    }
  }

  function unscopedFov() {
    const aspect = camera && camera.aspect ? camera.aspect : 1;
    if (aspect >= 1) return HIP_FOV;
    const horizontal = THREE.MathUtils.degToRad(78);
    const vertical = 2 * Math.atan(Math.tan(horizontal / 2) / aspect);
    return THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(vertical), HIP_FOV, 100);
  }

  function scopedFov() {
    const aspect = camera && camera.aspect ? camera.aspect : 1;
    if (aspect >= 1) return SCOPE_FOV;
    const wideAspect = 2.05;
    const horizontal = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(SCOPE_FOV) / 2) * wideAspect);
    const vertical = 2 * Math.atan(Math.tan(horizontal / 2) / aspect);
    return THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(vertical), 18, 48);
  }

  function plural(n, word, pluralWord) {
    return n + ' ' + (n === 1 ? word : (pluralWord || word + 's'));
  }

  function formatTime(t) {
    const s = Math.max(0, Math.ceil(t));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + ':' + String(r).padStart(2, '0');
  }

  function toast(text, good) {
    toastEl.textContent = text;
    toastEl.className = good ? 'show good' : 'show bad';
    toastTime = good ? 1.25 : 1.1;
  }

  function applyMute() {
    if (master) master.gain.value = muted ? 0 : 0.8;
    muteButtons.forEach((btn) => {
      btn.classList.toggle('muted', muted);
      btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
      btn.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
    });
  }

  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (err) { /* ignore */ }
    ensureAudio();
    applyMute();
  }

  function ensureAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    if (!audioCtx) {
      audioCtx = new AC();
      master = audioCtx.createGain();
      master.gain.value = muted ? 0 : 0.8;
      master.connect(audioCtx.destination);
      startWind();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return true;
  }

  function envGain(startValue, duration) {
    const t = audioCtx.currentTime;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(startValue, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    g.connect(master);
    return { g, t };
  }

  function noiseBurst(duration, freqStart, freqEnd, gainVal) {
    if (!audioCtx || muted) return;
    const { g, t } = envGain(gainVal, duration);
    const n = Math.max(1, Math.floor(audioCtx.sampleRate * duration));
    const buffer = audioCtx.createBuffer(1, n, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freqStart, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t + duration);
    src.connect(filter);
    filter.connect(g);
    src.start(t);
    src.stop(t + duration + 0.02);
  }

  function tone(freq, duration, type, gainVal, freqEnd) {
    if (!audioCtx || muted) return;
    const { g, t } = envGain(gainVal, duration);
    const o = audioCtx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t + duration);
    o.connect(g);
    o.start(t);
    o.stop(t + duration + 0.02);
  }

  function playGun() {
    if (!ensureAudio() || muted) return;
    noiseBurst(0.07, 6800, 1600, 0.95);
    noiseBurst(0.22, 2400, 120, 0.8);
    tone(170, 0.16, 'sawtooth', 0.28, 48);
    tone(92, 0.28, 'sine', 0.9, 32);
    tone(480, 0.045, 'square', 0.16, 90);
  }

  function pulseShot() {
    vibrated += 1;
    try {
      if (navigator.vibrate) navigator.vibrate(60);
    } catch (err) { /* iOS and some browsers omit vibration */ }
  }

  function playDry() {
    if (!ensureAudio() || muted) return;
    tone(720, 0.04, 'square', 0.06);
  }

  function playThud() {
    if (!audioCtx || muted) return;
    tone(90, 0.12, 'sine', 0.22, 40);
  }

  function playReloadStart() {
    if (!audioCtx || muted) return;
    noiseBurst(0.08, 900, 300, 0.12);
    tone(420, 0.05, 'square', 0.05);
  }

  function playReloadEnd() {
    if (!audioCtx || muted) return;
    tone(280, 0.06, 'square', 0.07);
  }

  function playHorn() {
    if (!audioCtx || muted) return;
    const t0 = audioCtx.currentTime;
    [523.25, 659.25].forEach((freq, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      const t = t0 + i * 0.18;
      o.type = 'triangle';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.1, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + 0.4);
    });
  }

  function chirp() {
    if (!audioCtx || muted) return;
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    const f = 1700 + Math.random() * 700;
    o.type = 'sine';
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 1.25, t + 0.08);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, f * 0.9), t + 0.16);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.028, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + 0.2);
  }

  function startWind() {
    if (!audioCtx || windStarted) return;
    windStarted = true;
    const duration = 2;
    const n = Math.floor(audioCtx.sampleRate * duration);
    const buffer = audioCtx.createBuffer(1, n, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) {
      last = last * 0.98 + (Math.random() * 2 - 1) * 0.02;
      data[i] = last * 4;
    }
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 480;
    const g = audioCtx.createGain();
    g.gain.value = 0.22;
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start();
  }

  function updateHUD() {
    if (scoreEl.textContent !== String(score)) scoreEl.textContent = String(score);
    const label = formatTime(phase === 'title' ? ROUND_SECONDS : timeLeft);
    if (timerEl.textContent !== label) timerEl.textContent = label;
    timerEl.classList.toggle('warn', phase === 'playing' && timeLeft <= 20);
    const kids = pipsEl.children;
    for (let i = 0; i < kids.length; i++) kids[i].classList.toggle('out', i >= ammo);
    if (reserveEl.textContent !== String(reserve)) reserveEl.textContent = String(reserve);
    if (reloading) {
      reloadBtn.textContent = 'Reloading…';
      reloadBtn.disabled = true;
    } else {
      reloadBtn.textContent = 'Reload';
      reloadBtn.disabled = ammo >= MAG || reserve <= 0 || phase !== 'playing';
    }
    reloadBtn.classList.toggle('need', ammo === 0 && reserve > 0 && !reloading);
    fireBtn.classList.toggle('empty', ammo === 0);
    scopeBtn.setAttribute('aria-pressed', scoped ? 'true' : 'false');
  }

  function updateScopeVisuals() {
    const showScope = scoped && phase === 'playing';
    scopeEl.classList.toggle('on', showScope);
    reticle.classList.toggle('on', phase === 'playing' && !scoped);
    if (!showScope && rangeEl.textContent) rangeEl.textContent = '';
  }

  function refreshBestLine() {
    bestLine.textContent = best > 0 ? 'Best ' + best : 'Five in the magazine. Ten in your pocket.';
  }

  const geoCache = {};
  const matCache = {};

  function geo(name, build) {
    if (!geoCache[name]) geoCache[name] = build();
    return geoCache[name];
  }

  function lambert(hex) {
    const key = String(hex);
    if (!matCache[key]) matCache[key] = new THREE.MeshLambertMaterial({ color: hex });
    return matCache[key];
  }

  function glow(hex, emissive, intensity) {
    const key = 'g' + hex + ':' + emissive + ':' + intensity;
    if (!matCache[key]) {
      matCache[key] = new THREE.MeshLambertMaterial({
        color: hex,
        emissive: emissive,
        emissiveIntensity: intensity,
      });
    }
    return matCache[key];
  }

  function addMesh(parent, geometry, material, x, y, z) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  function buildDeer(isBuck, tint) {
    const root = new THREE.Group();
    const tilt = new THREE.Group();
    const bob = new THREE.Group();
    root.add(tilt);
    tilt.add(bob);
    const colors = tint || {
      body: isBuck ? 0xb8743c : 0xc48a4e,
      belly: 0xf0e2c8,
      head: isBuck ? 0x9a6236 : 0xa86e3c,
      leg: 0x7a4e30,
      tail: 0xf7f4ee,
      dark: 0x1c140f,
      scale: isBuck ? 1.22 : 1.1,
    };
    const coat = (hex) => (tint && tint.glow ? glow(hex, tint.glow, tint.glowAmount || 0.6) : lambert(hex));
    const bodyMat = coat(colors.body);
    const bellyMat = lambert(colors.belly);
    const headMat = coat(colors.head);
    const legMat = coat(colors.leg);
    const tailMat = lambert(colors.tail);
    const dark = lambert(colors.dark);

    const body = addMesh(bob, geo('deerBody', () => new THREE.CapsuleGeometry(0.27, 0.95, 3, 8)), bodyMat, 0, 1.08, 0.02);
    body.rotation.x = Math.PI / 2;
    const chest = addMesh(bob, geo('deerChest', () => new THREE.SphereGeometry(0.24, 8, 6)), bodyMat, 0, 1.0, -0.48);
    chest.scale.set(0.9, 0.85, 1);
    const rump = addMesh(bob, geo('deerRump', () => new THREE.SphereGeometry(0.28, 8, 6)), bodyMat, 0, 1.14, 0.5);
    rump.scale.set(0.95, 0.9, 1.05);
    const belly = addMesh(bob, geo('deerBelly', () => new THREE.SphereGeometry(0.2, 8, 6)), bellyMat, 0, 0.92, 0.02);
    belly.scale.set(0.7, 0.45, 1.2);

    const neck = addMesh(bob, geo('deerNeck', () => new THREE.CapsuleGeometry(0.09, 0.36, 2, 6)), bodyMat, 0, 1.42, -0.58);
    neck.rotation.x = Math.PI / 2 + 0.85;

    const head = new THREE.Group();
    head.position.set(0, 1.72, -0.78);
    bob.add(head);
    const skull = addMesh(head, geo('skull', () => new THREE.SphereGeometry(0.15, 8, 6)), headMat, 0, 0.02, -0.06);
    skull.scale.set(0.85, 0.72, 1.2);
    const snout = addMesh(head, geo('snout', () => new THREE.CapsuleGeometry(0.055, 0.16, 2, 6)), headMat, 0, -0.02, -0.22);
    snout.rotation.x = Math.PI / 2;
    addMesh(head, geo('nose', () => new THREE.SphereGeometry(0.035, 6, 5)), dark, 0, -0.02, -0.32);
    const ears = [];
    const earBase = [];
    const earGeo = geo('deerEar', () => new THREE.BoxGeometry(0.07, 0.2, 0.035));
    [-1, 1].forEach((s) => {
      const ear = addMesh(head, earGeo, headMat, s * 0.1, 0.14, 0.0);
      ear.rotation.z = s * -0.45;
      ears.push(ear);
      earBase.push(ear.rotation.z);
      addMesh(head, geo('eye', () => new THREE.SphereGeometry(0.022, 6, 5)), dark, s * 0.07, 0.03, -0.16);
    });

    if (isBuck && !tint) {
      const antler = lambert(0xe7d7b4);
      const beamGeo = geo('beam', () => new THREE.CylinderGeometry(0.018, 0.028, 0.42, 4));
      const tineGeo = geo('tine', () => new THREE.CylinderGeometry(0.012, 0.018, 0.2, 4));
      [-1, 1].forEach((s) => {
        const beam = addMesh(head, beamGeo, antler, s * 0.08, 0.16, -0.02);
        beam.rotation.z = s * -0.7;
        beam.rotation.x = 0.35;
        const tine = addMesh(head, tineGeo, antler, s * 0.22, 0.3, 0.02);
        tine.rotation.z = s * -0.15;
        tine.rotation.x = -0.4;
      });
    }

    const legs = [];
    const legGeo = geo('deerLeg', () => new THREE.CapsuleGeometry(0.045, 0.66, 2, 5));
    [[-0.12, -0.38], [0.12, -0.38], [-0.12, 0.42], [0.12, 0.42]].forEach(([x, z]) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.86, z);
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.y = -0.38;
      pivot.add(leg);
      bob.add(pivot);
      legs.push(pivot);
    });

    const tail = new THREE.Group();
    tail.position.set(0, 1.22, 0.72);
    const flag = addMesh(tail, geo('tail', () => new THREE.SphereGeometry(0.08, 6, 5)), tailMat, 0, 0.04, 0.06);
    flag.scale.set(0.7, 1, 0.5);
    bob.add(tail);

    root.add(makeShadow(0.85));
    root.scale.setScalar(colors.scale);
    return { root, tilt, bob, head, legs, tail, ears, earBase };
  }

  function buildBlueDeer() {
    return buildDeer(false, {
      body: 0x3aa6ff,
      belly: 0xd7f4ff,
      head: 0x2f8cff,
      leg: 0x1f78f0,
      tail: 0xf4fbff,
      dark: 0x062044,
      scale: 1.2,
      glow: 0x1a5cff,
      glowAmount: 0.72,
    });
  }

  function buildPiglet() {
    const root = new THREE.Group();
    const tilt = new THREE.Group();
    const bob = new THREE.Group();
    root.add(tilt);
    tilt.add(bob);
    const pink = glow(0xffb3c6, 0xe07090, 0.42);
    const snoutMat = glow(0xffd0da, 0xf0a0b4, 0.28);
    const earMat = glow(0xff9aaf, 0xe07090, 0.35);
    const hoof = lambert(0xc46b78);
    const dark = lambert(0x3a2428);

    const body = addMesh(bob, geo('pigBody', () => new THREE.SphereGeometry(0.22, 10, 8)), pink, 0, 0.34, 0.02);
    body.scale.set(1.05, 0.82, 1.35);
    const head = new THREE.Group();
    head.position.set(0, 0.42, -0.22);
    bob.add(head);
    const skull = addMesh(head, geo('pigHead', () => new THREE.SphereGeometry(0.13, 8, 6)), pink, 0, 0.02, -0.02);
    skull.scale.set(1.05, 0.9, 1.05);
    const snout = addMesh(head, geo('pigSnout', () => new THREE.CylinderGeometry(0.055, 0.06, 0.08, 8)), snoutMat, 0, -0.01, -0.14);
    snout.rotation.x = Math.PI / 2;
    addMesh(head, geo('pigNose', () => new THREE.SphereGeometry(0.012, 5, 4)), dark, -0.02, 0, -0.18);
    addMesh(head, geo('pigNose', () => new THREE.SphereGeometry(0.012, 5, 4)), dark, 0.02, 0, -0.18);
    const ears = [];
    const earBase = [];
    [-1, 1].forEach((s) => {
      const ear = addMesh(head, geo('pigEar', () => new THREE.SphereGeometry(0.06, 6, 5)), earMat, s * 0.1, 0.1, 0.02);
      ear.scale.set(0.7, 1.15, 0.35);
      ear.rotation.z = s * -0.9;
      ears.push(ear);
      earBase.push(ear.rotation.z);
      addMesh(head, geo('pigEye', () => new THREE.SphereGeometry(0.016, 6, 5)), dark, s * 0.06, 0.04, -0.1);
    });

    const legs = [];
    const legGeo = geo('pigLeg', () => new THREE.CapsuleGeometry(0.028, 0.12, 2, 4));
    [[-0.08, -0.08], [0.08, -0.08], [-0.09, 0.12], [0.09, 0.12]].forEach(([x, z]) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.22, z);
      const leg = new THREE.Mesh(legGeo, hoof);
      leg.position.y = -0.08;
      pivot.add(leg);
      bob.add(pivot);
      legs.push(pivot);
    });

    const tail = addMesh(bob, geo('pigTail', () => new THREE.TorusGeometry(0.035, 0.012, 5, 8)), pink, 0, 0.4, 0.26);
    tail.rotation.y = Math.PI / 2;

    root.add(makeShadow(0.36));
    root.scale.setScalar(1.22);
    return { root, tilt, bob, head, legs, tail, ears, earBase };
  }

  function buildGiraffe() {
    const root = new THREE.Group();
    const tilt = new THREE.Group();
    const bob = new THREE.Group();
    root.add(tilt);
    tilt.add(bob);
    const hide = lambert(0xd7a24a);
    const patch = lambert(0x6a3b22);
    const pale = lambert(0xf0d7a4);
    const dark = lambert(0x3a2418);
    const hoof = lambert(0x4a3424);

    const body = addMesh(bob, geo('girBody', () => new THREE.CapsuleGeometry(0.32, 0.95, 3, 6)), hide, 0, 1.72, 0.05);
    body.rotation.x = Math.PI / 2;
    const patchGeo = geo('girPatch', () => new THREE.SphereGeometry(0.1, 5, 4));
    [[0.24, 1.86, 0.15], [-0.22, 1.62, -0.12], [0.08, 1.78, 0.42], [-0.16, 1.95, 0.28], [0.18, 1.58, -0.22]].forEach(([x, y, z]) => {
      const spot = addMesh(bob, patchGeo, patch, x, y, z);
      spot.scale.set(1.35, 0.72, 1.05);
    });

    const neck = addMesh(bob, geo('girNeck', () => new THREE.CapsuleGeometry(0.11, 1.65, 3, 5)), hide, 0, 2.95, -0.62);
    neck.rotation.x = -0.42;
    [[0.09, 2.55, -0.48], [-0.08, 3.15, -0.72], [0.06, 3.55, -0.9]].forEach(([x, y, z]) => {
      const spot = addMesh(bob, patchGeo, patch, x, y, z);
      spot.scale.set(0.7, 0.85, 0.7);
    });
    const maneGeo = geo('girMane', () => new THREE.BoxGeometry(0.045, 0.16, 0.07));
    for (let i = 0; i < 5; i++) {
      addMesh(bob, maneGeo, dark, 0, 2.35 + i * 0.32, -0.4 - i * 0.1);
    }

    const head = new THREE.Group();
    head.position.set(0, 3.82, -1.02);
    bob.add(head);
    const skull = addMesh(head, geo('girHead', () => new THREE.SphereGeometry(0.16, 7, 6)), hide, 0, 0.02, -0.04);
    skull.scale.set(0.85, 0.72, 1.2);
    const snout = addMesh(head, geo('girSnout', () => new THREE.CapsuleGeometry(0.055, 0.18, 2, 5)), pale, 0, -0.02, -0.22);
    snout.rotation.x = Math.PI / 2;
    addMesh(head, geo('girNose', () => new THREE.SphereGeometry(0.035, 5, 4)), dark, 0, -0.01, -0.34);
    const ears = [];
    const earBase = [];
    [-1, 1].forEach((s) => {
      const horn = addMesh(head, geo('girHorn', () => new THREE.CylinderGeometry(0.018, 0.026, 0.16, 5)), dark, s * 0.07, 0.16, 0.02);
      horn.rotation.z = s * -0.12;
      addMesh(head, geo('girHornTip', () => new THREE.SphereGeometry(0.032, 5, 4)), dark, s * 0.08, 0.26, 0.02);
      const ear = addMesh(head, geo('girEar', () => new THREE.BoxGeometry(0.05, 0.12, 0.02)), hide, s * 0.14, 0.06, 0.02);
      ear.rotation.z = s * -0.7;
      ears.push(ear);
      earBase.push(ear.rotation.z);
      addMesh(head, geo('girEye', () => new THREE.SphereGeometry(0.02, 5, 4)), dark, s * 0.07, 0.02, -0.14);
    });

    const legs = [];
    const legGeo = geo('girLeg', () => new THREE.CapsuleGeometry(0.045, 1.15, 2, 4));
    [[-0.16, -0.32], [0.16, -0.32], [-0.16, 0.42], [0.16, 0.42]].forEach(([x, z]) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 1.42, z);
      const leg = new THREE.Mesh(legGeo, hoof);
      leg.position.y = -0.62;
      pivot.add(leg);
      bob.add(pivot);
      legs.push(pivot);
    });

    const tail = new THREE.Group();
    tail.position.set(0, 1.85, 0.62);
    const flag = addMesh(tail, geo('girTail', () => new THREE.SphereGeometry(0.07, 5, 4)), dark, 0, -0.28, 0.08);
    flag.scale.set(0.8, 1.4, 0.8);
    bob.add(tail);

    root.add(makeShadow(1.05));
    root.scale.setScalar(1.12);
    return { root, tilt, bob, head, legs, tail, ears, earBase, trunk: null };
  }

  function buildElephant() {
    const root = new THREE.Group();
    const tilt = new THREE.Group();
    const bob = new THREE.Group();
    root.add(tilt);
    tilt.add(bob);
    const gray = lambert(0x8e9294);
    const dark = lambert(0x5e6468);
    const earMat = lambert(0xb7b3aa);
    const inner = lambert(0xc9a59a);
    const tuskMat = lambert(0xf4f1e8);

    const body = addMesh(bob, geo('eleBody', () => new THREE.SphereGeometry(0.72, 8, 6)), gray, 0, 1.25, 0.05);
    body.scale.set(1.05, 0.82, 1.35);
    addMesh(bob, geo('eleBelly', () => new THREE.SphereGeometry(0.42, 6, 5)), lambert(0xa7aaa8), 0, 0.95, 0.05).scale.set(0.9, 0.45, 1.2);

    const head = new THREE.Group();
    head.position.set(0, 1.45, -0.95);
    bob.add(head);
    const skull = addMesh(head, geo('eleHead', () => new THREE.SphereGeometry(0.42, 8, 6)), gray, 0, 0.05, -0.08);
    skull.scale.set(1.05, 0.9, 1.05);
    const ears = [];
    const earBase = [];
    [-1, 1].forEach((s) => {
      const ear = addMesh(head, geo('eleEar', () => new THREE.SphereGeometry(0.4, 6, 5)), earMat, s * 0.48, 0.08, 0.02);
      ear.scale.set(0.28, 1.05, 0.72);
      ear.rotation.z = s * -0.35;
      ears.push(ear);
      earBase.push(ear.rotation.z);
      const flap = addMesh(head, geo('eleInner', () => new THREE.SphereGeometry(0.24, 5, 4)), inner, s * 0.52, 0.02, -0.02);
      flap.scale.set(0.16, 0.7, 0.4);
      addMesh(head, geo('eleEye', () => new THREE.SphereGeometry(0.035, 5, 4)), dark, s * 0.18, 0.08, -0.38);
      const tusk = addMesh(head, geo('eleTusk', () => new THREE.ConeGeometry(0.035, 0.28, 5)), tuskMat, s * 0.12, -0.22, -0.42);
      tusk.rotation.x = 1.15;
      tusk.rotation.z = s * 0.18;
    });

    const trunk = new THREE.Group();
    trunk.position.set(0, 0.02, -0.42);
    head.add(trunk);
    const segGeo = geo('eleTrunk', () => new THREE.CapsuleGeometry(0.07, 0.26, 2, 5));
    for (let i = 0; i < 3; i++) {
      const seg = addMesh(trunk, segGeo, i === 2 ? dark : gray, 0, -0.16 - i * 0.24, -0.02 - i * 0.06);
      seg.rotation.x = 0.45 + i * 0.28;
      seg.scale.setScalar(1 - i * 0.16);
    }

    const legs = [];
    const legGeo = geo('eleLeg', () => new THREE.CylinderGeometry(0.11, 0.13, 0.72, 6));
    [[-0.32, -0.35], [0.32, -0.35], [-0.34, 0.48], [0.34, 0.48]].forEach(([x, z]) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.78, z);
      const leg = new THREE.Mesh(legGeo, gray);
      leg.position.y = -0.36;
      pivot.add(leg);
      bob.add(pivot);
      legs.push(pivot);
    });

    const tail = addMesh(bob, geo('eleTail', () => new THREE.CapsuleGeometry(0.03, 0.28, 2, 4)), dark, 0, 1.15, 0.95);
    tail.rotation.x = 0.8;

    root.add(makeShadow(1.35));
    root.scale.setScalar(1.28);
    return { root, tilt, bob, head, legs, tail, ears, earBase, trunk };
  }

  function buildBoar() {
    const root = new THREE.Group();
    const tilt = new THREE.Group();
    const bob = new THREE.Group();
    root.add(tilt);
    tilt.add(bob);
    const hide = lambert(0x6a5048);
    const dark = lambert(0x3e312c);
    const snoutMat = lambert(0xc4a090);
    const tuskMat = lambert(0xf4efe4);

    const body = addMesh(bob, geo('boarBody', () => new THREE.CapsuleGeometry(0.28, 0.85, 3, 8)), hide, 0, 0.78, 0);
    body.rotation.x = Math.PI / 2;
    body.scale.set(1.25, 1, 1);
    const head = new THREE.Group();
    head.position.set(0, 0.86, -0.62);
    bob.add(head);
    const skull = addMesh(head, geo('boarHead', () => new THREE.SphereGeometry(0.2, 8, 6)), hide, 0, 0.02, -0.08);
    skull.scale.set(1.1, 0.85, 1.15);
    const snout = addMesh(head, geo('boarSnout', () => new THREE.CapsuleGeometry(0.09, 0.22, 2, 6)), snoutMat, 0, -0.04, -0.28);
    snout.rotation.x = Math.PI / 2;
    addMesh(head, geo('boarNose', () => new THREE.SphereGeometry(0.045, 6, 5)), dark, 0, -0.02, -0.42);
    const ears = [];
    const earBase = [];
    [-1, 1].forEach((s) => {
      const ear = addMesh(head, geo('boarEar', () => new THREE.BoxGeometry(0.1, 0.12, 0.03)), dark, s * 0.16, 0.12, 0);
      ear.rotation.z = s * -0.4;
      ears.push(ear);
      earBase.push(ear.rotation.z);
      const tusk = addMesh(head, geo('tusk', () => new THREE.ConeGeometry(0.018, 0.12, 4)), tuskMat, s * 0.07, -0.08, -0.32);
      tusk.rotation.x = 0.8;
      tusk.rotation.z = s * 0.3;
    });

    const legs = [];
    const legGeo = geo('boarLeg', () => new THREE.CapsuleGeometry(0.05, 0.32, 2, 5));
    [[-0.16, -0.28], [0.16, -0.28], [-0.16, 0.32], [0.16, 0.32]].forEach(([x, z]) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.58, z);
      const leg = new THREE.Mesh(legGeo, dark);
      leg.position.y = -0.22;
      pivot.add(leg);
      bob.add(pivot);
      legs.push(pivot);
    });

    const tail = addMesh(bob, geo('boarTail', () => new THREE.TorusGeometry(0.05, 0.018, 5, 8)), hide, 0, 0.84, 0.52);
    tail.rotation.y = Math.PI / 2;

    root.add(makeShadow(0.8));
    root.scale.setScalar(1.18);
    return { root, tilt, bob, head, legs, tail, ears, earBase };
  }

  function buildRabbit() {
    const root = new THREE.Group();
    const tilt = new THREE.Group();
    const bob = new THREE.Group();
    root.add(tilt);
    tilt.add(bob);
    const fur = lambert(0xd7b394);
    const inner = lambert(0xefb2b0);
    const white = lambert(0xfffaf4);
    const dark = lambert(0x2a211c);

    addMesh(bob, geo('rabBody', () => new THREE.SphereGeometry(0.16, 8, 6)), fur, 0, 0.28, 0.02).scale.set(1.15, 0.85, 1.35);
    const head = new THREE.Group();
    head.position.set(0, 0.4, -0.16);
    bob.add(head);
    addMesh(head, geo('rabHead', () => new THREE.SphereGeometry(0.09, 8, 6)), fur, 0, 0.02, -0.02);
    const ears = [];
    const earBase = [];
    [-1, 1].forEach((s) => {
      const ear = new THREE.Group();
      ear.position.set(s * 0.04, 0.08, 0);
      ear.rotation.z = s * -0.15;
      const outer = addMesh(ear, geo('rabEar', () => new THREE.CapsuleGeometry(0.02, 0.16, 2, 5)), fur, 0, 0.1, 0);
      outer.scale.x = 0.7;
      addMesh(ear, geo('rabInner', () => new THREE.CapsuleGeometry(0.01, 0.1, 2, 4)), inner, 0, 0.1, -0.008);
      head.add(ear);
      ears.push(ear);
      earBase.push(ear.rotation.z);
      addMesh(head, geo('rabEye', () => new THREE.SphereGeometry(0.015, 5, 4)), dark, s * 0.04, 0.03, -0.07);
    });
    addMesh(bob, geo('rabTail', () => new THREE.SphereGeometry(0.045, 6, 5)), white, 0, 0.32, 0.16);

    const legs = [];
    const hind = geo('rabHind', () => new THREE.CapsuleGeometry(0.03, 0.1, 2, 4));
    [[-0.06, 0.08], [0.06, 0.08], [-0.05, -0.08], [0.05, -0.08]].forEach(([x, z], i) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.16, z);
      const leg = new THREE.Mesh(i < 2 ? hind : geo('rabFore', () => new THREE.CapsuleGeometry(0.018, 0.06, 2, 4)), fur);
      leg.position.y = -0.06;
      pivot.add(leg);
      bob.add(pivot);
      legs.push(pivot);
    });

    root.add(makeShadow(0.32));
    root.scale.setScalar(1.45);
    return { root, tilt, bob, head, legs, tail: null, ears, earBase };
  }

  let shadowTex = null;
  function makeShadow(radius) {
    const mesh = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.035;
    mesh.renderOrder = 2;
    return mesh;
  }

  function buildAnimal(kind) {
    if (kind === 'boar') return buildBoar();
    if (kind === 'rabbit') return buildRabbit();
    if (kind === 'blue') return buildBlueDeer();
    if (kind === 'piglet') return buildPiglet();
    if (kind === 'giraffe') return buildGiraffe();
    if (kind === 'elephant') return buildElephant();
    return buildDeer(kind === 'buck');
  }

  function inPond(x, z) {
    return Math.hypot(x + 16, z + 24) < 7;
  }

  function randomMeadowPoint() {
    for (let i = 0; i < 12; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random());
      const x = Math.cos(ang) * 32 * r;
      const z = -48 + Math.sin(ang) * 24 * r;
      if (!inPond(x, z)) return { x, z };
    }
    return { x: 2, z: -28 };
  }

  function sampleEdge() {
    const side = Math.floor(Math.random() * 4);
    if (side === 0) return { x: -62 - Math.random() * 10, z: -16 - Math.random() * 70 };
    if (side === 1) return { x: 62 + Math.random() * 10, z: -16 - Math.random() * 70 };
    if (side === 2) return { x: -40 + Math.random() * 80, z: -96 - Math.random() * 10 };
    return { x: -28 + Math.random() * 56, z: -12 - Math.random() * 4 };
  }

  function placeAnimal(kind, opts) {
    const built = buildAnimal(kind);
    const animal = {
      kind,
      ...built,
      state: opts.state || 'walk',
      target: opts.target ? { x: opts.target.x, z: opts.target.z } : randomMeadowPoint(),
      timer: opts.timer != null ? opts.timer : 3 + Math.random() * 4,
      phase: Math.random() * Math.PI * 2,
      points: POINTS[kind],
      walk: WALK[kind],
      flee: FLEE[kind],
      dash: DASH[kind] || 0,
      path: opts.path ? opts.path.map((point) => ({ x: point.x, z: point.z })) : null,
      herd: !!opts.herd,
      nextTarget: null,
      fallSide: 1,
      deadFor: 0,
    };
    animal.root.position.set(opts.x, 0, opts.z);
    if (opts.broadside) faceDirection(animal.root, opts.x + 5, opts.z);
    else faceDirection(animal.root, animal.target.x, animal.target.z);
    scene.add(animal.root);
    animals.push(animal);
    return animal;
  }

  function clearAnimals() {
    for (const animal of animals) scene.remove(animal.root);
    animals.length = 0;
  }

  function removeAnimal(animal) {
    const index = animals.indexOf(animal);
    if (index < 0) return;
    animals.splice(index, 1);
    scene.remove(animal.root);
  }

  function spawnOpening() {
    clearAnimals();
    placeAnimal('buck', { x: 6, z: -24, state: 'graze', broadside: true, timer: 8 });
    placeAnimal('doe', { x: -16, z: -42, state: 'walk', target: { x: 4, z: -52 } });
    placeAnimal('boar', { x: 22, z: -58, state: 'graze', broadside: true, timer: 6 });
    placeAnimal('rabbit', { x: -2.2, z: -16, state: 'walk', target: { x: 7, z: -19 } });
    placeAnimal('doe', { x: -4, z: -82, state: 'graze', broadside: true, timer: 9 });
  }

  function countKind(kind) {
    let n = 0;
    for (const animal of animals) {
      if (animal.kind === kind && animal.state !== 'dead') n += 1;
    }
    return n;
  }

  function slotsOpen() {
    return MAX_ANIMALS - activeCount();
  }

  function pickKind() {
    const open = slotsOpen();
    if (Math.random() < 0.08 && countKind('blue') === 0) return 'blue';
    if (Math.random() < 0.12 && countKind('piglet') === 0) return 'piglet';
    if (Math.random() < 0.1 && countKind('giraffe') === 0 && open >= 1) return 'giraffe';
    if (Math.random() < 0.08 && countKind('elephant') === 0 && open >= 1) return 'elephant';
    const roll = Math.random();
    if (roll < 0.22) return 'buck';
    if (roll < 0.52) return 'doe';
    if (roll < 0.74) return 'boar';
    return 'rabbit';
  }

  function herdSize(kind, open) {
    let want;
    if (kind === 'giraffe') want = Math.random() < 0.38 ? 1 : 3 + Math.floor(Math.random() * 3);
    else {
      const roll = Math.random();
      want = roll < 0.2 ? 1 : roll < 0.6 ? 2 : 3;
    }
    return Math.max(0, Math.min(want, open));
  }

  function spawnHerd(kind, forcedCount) {
    const count = forcedCount ? Math.min(forcedCount, slotsOpen()) : herdSize(kind, slotsOpen());
    if (count < 1) return 0;
    const left = Math.random() < 0.5;
    const dir = left ? 1 : -1;
    const z0 = -34 - Math.random() * 28;
    const startX = left ? -56 : 56;
    const endX = -startX;
    const midX = (Math.random() - 0.5) * 10;
    const along = kind === 'elephant' ? 4.6 : 3.3;
    const aside = kind === 'elephant' ? 2.8 : 2.15;
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / 2);
      const col = i % 2 === 0 ? -1 : 1;
      const back = -dir * row * along;
      const side = col * aside * (i === 0 ? 0.15 : 1);
      const x = startX + back;
      const z = z0 + side;
      placeAnimal(kind, {
        x,
        z,
        state: 'walk',
        herd: true,
        target: { x: midX + back * 0.12, z },
        path: [{ x: endX + back * 0.08, z: z + (Math.random() - 0.5) * 1.2 }],
      });
    }
    return count;
  }

  function spawnDasher(kind) {
    if (kind === 'blue') {
      const left = Math.random() < 0.5;
      const z = -28 - Math.random() * 48;
      const startX = left ? -48 - Math.random() * 6 : 48 + Math.random() * 6;
      const endX = left ? 52 + Math.random() * 8 : -52 - Math.random() * 8;
      const midX = (startX + endX) * 0.5 + (Math.random() - 0.5) * 8;
      const midZ = z + (Math.random() - 0.5) * 10;
      placeAnimal('blue', {
        x: startX,
        z,
        state: 'dash',
        target: { x: midX, z: midZ },
        path: [{ x: endX, z: z + (Math.random() - 0.5) * 6 }],
      });
      return;
    }
    const startX = -18 + Math.random() * 36;
    const startZ = -18 - Math.random() * 44;
    let x = startX;
    let z = startZ;
    const hops = [];
    const count = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 6 + Math.random() * 4;
      x += Math.cos(ang) * dist;
      z += Math.sin(ang) * dist;
      if (z > -8) z = -12 - Math.random() * 8;
      hops.push({ x, z });
    }
    const first = hops.shift();
    placeAnimal('piglet', { x: startX, z: startZ, state: 'dash', target: first, path: hops });
  }

  function farAway(animal) {
    const x = animal.root.position.x;
    const z = animal.root.position.z;
    return Math.abs(x) > 78 || z < -110 || z > 4;
  }

  function setFleeTarget(animal) {
    const pos = animal.root.position;
    let dx = pos.x - CAM.x;
    let dz = pos.z - CAM.z;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    const side = Math.random() < 0.5 ? -1 : 1;
    let x = pos.x + dx * 30 - dz * side * 10;
    let z = pos.z + dz * 30 + dx * side * 10;
    if (z > -8) z = -10 - Math.random() * 10;
    animal.target = { x, z };
  }

  function moveToward(animal, dt, speed) {
    const pos = animal.root.position;
    const tgt = animal.target;
    let dx = tgt.x - pos.x;
    let dz = tgt.z - pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.45) return true;
    const step = Math.min(dist, speed * dt);
    dx /= dist;
    dz /= dist;
    pos.x += dx * step;
    pos.z += dz * step;
    faceDirection(animal.root, pos.x + dx, pos.z + dz);
    return false;
  }

  function faceDirection(root, x, z) {
    // Models are built with the head on local -Z. Object3D.lookAt aims +Z
    // at the point, which would put the tail in front. Turn 180° so the head leads.
    root.lookAt(x, root.position.y, z);
    root.rotateY(Math.PI);
  }

  function animateAnimal(animal, dt) {
    const moving = animal.state === 'walk' || animal.state === 'flee' || animal.state === 'dash';
    let freq = animal.state === 'dash' ? 16 : animal.state === 'flee' ? 13 : animal.state === 'walk' ? 6.5 : 1.6;
    let amp = animal.state === 'dash' ? 0.95 : animal.state === 'flee' ? 0.8 : animal.state === 'walk' ? 0.4 : 0.05;
    if (animal.kind === 'elephant' && animal.state === 'walk') {
      freq = 2.1;
      amp = 0.18;
    } else if (animal.kind === 'giraffe' && animal.state === 'walk') {
      freq = 2.6;
      amp = 0.28;
    }
    if (animal.kind === 'piglet' && animal.state === 'dash') freq = 9;
    animal.phase += dt * freq;
    const swing = Math.sin(animal.phase) * amp;
    if (animal.legs.length >= 4) {
      animal.legs[0].rotation.x = swing;
      animal.legs[3].rotation.x = swing;
      animal.legs[1].rotation.x = -swing;
      animal.legs[2].rotation.x = -swing;
    }
    let headTarget = -0.1;
    if (animal.state === 'graze' || animal.state === 'rest') {
      if (animal.kind === 'boar') headTarget = -0.7;
      else if (animal.kind === 'piglet') headTarget = -0.35;
      else if (animal.kind === 'giraffe') headTarget = -0.28;
      else if (animal.kind === 'elephant') headTarget = -0.16;
      else headTarget = -0.95;
    } else if (animal.state === 'alert') headTarget = 0.42;
    else if (animal.kind === 'giraffe' || animal.kind === 'elephant') headTarget = 0.02;
    else if (animal.state === 'flee' || animal.state === 'dash') headTarget = 0.18;
    animal.head.rotation.x = damp(animal.head.rotation.x, headTarget, 6, dt);
    if (animal.trunk) animal.trunk.rotation.x = -0.2 + Math.sin(time * 1.3 + animal.phase) * 0.14;
    if (animal.tail && animal.kind !== 'boar' && animal.kind !== 'piglet' && animal.kind !== 'elephant' && animal.kind !== 'giraffe') {
      const tailTarget = animal.state === 'flee' || animal.state === 'dash' ? -1.05 : -0.2;
      animal.tail.rotation.x = damp(animal.tail.rotation.x, tailTarget, 8, dt);
    }
    if ((animal.kind === 'rabbit' || animal.kind === 'piglet') && moving) {
      const hop = animal.kind === 'piglet' ? 0.16 : 0.11;
      const lift = animal.state === 'dash' ? hop * 1.45 : animal.state === 'flee' ? hop * 1.3 : hop;
      animal.bob.position.y = Math.abs(Math.sin(animal.phase)) * lift;
    } else {
      animal.bob.position.y = damp(animal.bob.position.y, 0, 8, dt);
    }
    if (animal.ears) {
      const twitch = Math.sin(time * 3.2 + animal.phase) * 0.06;
      animal.ears[0].rotation.z = animal.earBase[0] + twitch;
      animal.ears[1].rotation.z = animal.earBase[1] - twitch;
    }
  }

  function updateDead(animal, dt) {
    animal.deadFor += dt;
    const fall = Math.min(1, animal.deadFor / 0.48);
    const eased = 1 - (1 - fall) * (1 - fall);
    animal.tilt.rotation.z = animal.fallSide * eased * 1.22;
    animal.bob.position.y = damp(animal.bob.position.y, 0, 10, dt);
    if (!animal.puffed && fall >= 1) {
      animal.puffed = true;
      spawnPuff(animal.root.position.x, 0.2, animal.root.position.z, 0xcbb892);
    }
    if (animal.deadFor > 6.4) removeAnimal(animal);
  }

  function updateAnimal(animal, dt) {
    if (animal.state === 'dead') {
      updateDead(animal, dt);
      return;
    }
    if (animal.state === 'alert') {
      animal.timer -= dt;
      if (animal.timer <= 0) {
        if (animal.herd) {
          if (animal.nextTarget) {
            animal.target = animal.nextTarget;
            animal.nextTarget = null;
          }
          animal.state = 'walk';
        } else {
          animal.state = 'flee';
          setFleeTarget(animal);
        }
      }
    } else if (animal.state === 'rest') {
      animal.timer -= dt;
      if (animal.timer <= 0) {
        if (animal.path && animal.path.length) {
          animal.target = animal.path.shift();
          animal.state = 'dash';
        } else {
          removeAnimal(animal);
          return;
        }
      }
    } else if (animal.state === 'graze') {
      animal.timer -= dt;
      if (animal.timer <= 0) {
        animal.state = 'walk';
        animal.target = animal.nextTarget || randomMeadowPoint();
        animal.nextTarget = null;
      }
    } else if (animal.state === 'dash') {
      const arrived = moveToward(animal, dt, animal.dash);
      if (arrived) {
        if (animal.kind === 'piglet') {
          animal.state = 'rest';
          animal.timer = 1.8 + Math.random() * 1.7;
        } else if (animal.path && animal.path.length) animal.target = animal.path.shift();
        else {
          removeAnimal(animal);
          return;
        }
      }
    } else {
      const speed = animal.state === 'flee' ? animal.flee : animal.walk;
      const arrived = moveToward(animal, dt, speed);
      if (arrived) {
        if (animal.state === 'flee') {
          if (farAway(animal)) {
            removeAnimal(animal);
            return;
          }
          setFleeTarget(animal);
        } else if (animal.herd) {
          if (animal.path && animal.path.length) {
            animal.nextTarget = animal.path.shift();
            animal.state = 'graze';
            animal.timer = animal.kind === 'elephant' ? 2.4 + Math.random() * 2.2 : 1.7 + Math.random() * 1.8;
          } else {
            removeAnimal(animal);
            return;
          }
        } else {
          animal.state = 'graze';
          animal.timer = 3.2 + Math.random() * 4.5;
        }
      }
    }
    if (animals.indexOf(animal) >= 0) animateAnimal(animal, dt);
  }

  function updateAnimals(dt) {
    for (let i = animals.length - 1; i >= 0; i--) updateAnimal(animals[i], dt);
  }

  function activeCount() {
    let n = 0;
    for (const animal of animals) if (animal.state !== 'dead') n++;
    return n;
  }

  function updatePopulation(dt) {
    if (activeCount() >= MAX_ANIMALS) {
      spawnCooldown = 1.4;
      return;
    }
    spawnCooldown -= dt;
    if (spawnCooldown <= 0) {
      const kind = pickKind();
      if (kind === 'blue' || kind === 'piglet') spawnDasher(kind);
      else if (kind === 'giraffe' || kind === 'elephant') spawnHerd(kind);
      else {
        const spot = sampleEdge();
        placeAnimal(kind, { x: spot.x, z: spot.z, state: 'walk', target: randomMeadowPoint() });
      }
      spawnCooldown = 3.2 + Math.random() * 3.4;
    }
  }

  function killAnimal(animal) {
    if (animal.state === 'dead') return;
    animal.state = 'dead';
    animal.deadFor = 0;
    animal.fallSide = Math.random() < 0.5 ? -1 : 1;
    harvest[animal.kind] += 1;
    score += animal.points;
    hits += 1;
    const height = animal.kind === 'rabbit' || animal.kind === 'piglet' ? 0.35 : animal.kind === 'giraffe' ? 2.4 : animal.kind === 'elephant' ? 1.55 : 1.1;
    spawnPuff(animal.root.position.x, height, animal.root.position.z, 0xfff3c8, 14);
    playThud();
    toast(NAMES[animal.kind] + ' · HIT +' + animal.points, true);
  }

  function spook(impact) {
    for (const animal of animals) {
      if (animal.state === 'dead' || animal.state === 'flee' || animal.state === 'dash') continue;
      if (animal.kind === 'blue' || animal.kind === 'piglet') continue;
      if (animal.herd) {
        const near = Math.hypot(animal.root.position.x - impact.x, animal.root.position.z - impact.z);
        if (near < 22 && animal.state !== 'alert') {
          animal.state = 'alert';
          animal.timer = 0.7 + Math.random() * 0.45;
        }
        continue;
      }
      const dImpact = Math.hypot(animal.root.position.x - impact.x, animal.root.position.z - impact.z);
      const dPlayer = Math.hypot(animal.root.position.x - CAM.x, animal.root.position.z - CAM.z);
      if (dImpact < 11) {
        animal.state = 'flee';
        setFleeTarget(animal);
      } else if (dImpact < 34 || dPlayer < 38) {
        if (animal.state !== 'alert') {
          animal.state = 'alert';
          animal.timer = 0.85 + Math.random() * 0.5;
        }
      }
    }
  }

  function closestAnimal(ray) {
    let best = null;
    let bestDist = Infinity;
    for (const animal of animals) {
      if (animal.state === 'dead') continue;
      animal.root.updateWorldMatrix(true, true);
      _box.setFromObject(animal.bob);
      const pad = animal.kind === 'rabbit' || animal.kind === 'piglet' ? 0.18 : animal.kind === 'blue' ? 0.06 : 0.12;
      _box.expandByScalar(pad);
      if (ray.intersectBox(_box, hitA)) {
        const dist = hitA.distanceTo(ray.origin);
        if (dist < bestDist) {
          bestDist = dist;
          best = animal;
          bestPoint.copy(hitA);
        }
      }
    }
    return best ? { animal: best, dist: bestDist, point: bestPoint } : null;
  }

  function nearestBlocker(ray) {
    let best = Infinity;
    let found = false;
    for (const box of blockers) {
      if (ray.intersectBox(box, hitB)) {
        const dist = hitB.distanceTo(ray.origin);
        if (dist < best) {
          best = dist;
          woodPoint.copy(hitB);
          found = true;
        }
      }
    }
    return { dist: best, point: found ? woodPoint : null };
  }

  function onFire() {
    if (phase !== 'playing' || hintBlocking()) return;
    if (reloading || bolt > 0) return;
    if (ammo <= 0) {
      playDry();
      toast('EMPTY', false);
      if (reserve > 0 && autoReload <= 0) autoReload = 0.28;
      return;
    }
    ammo -= 1;
    shots += 1;
    bolt = 0.48;
    recoil = scoped ? 0.07 : 0.14;
    yawKick = (Math.random() - 0.5) * 0.02;
    rifleKick = 0.22;
    flashLife = 0.12;
    playGun();
    pulseShot();
    fireBtn.classList.remove('kick');
    void fireBtn.offsetWidth;
    fireBtn.classList.add('kick');
    if (bangEl) {
      bangEl.classList.remove('on');
      void bangEl.offsetWidth;
      bangEl.classList.add('on');
    }
    if (ammoPanel) {
      ammoPanel.classList.remove('shot');
      void ammoPanel.offsetWidth;
      ammoPanel.classList.add('shot');
    }

    camera.updateMatrixWorld(true);
    raycaster.setFromCamera(zeroNdc, camera);
    const ray = raycaster.ray;
    const wood = nearestBlocker(ray);
    const hit = closestAnimal(ray);
    let impact;
    if (hit && hit.dist < wood.dist - 0.05) {
      impact = hit.point.clone();
      killAnimal(hit.animal);
      spook(impact);
    } else {
      impact = hitG.clone();
      if (wood.point && wood.dist < 30) impact.copy(wood.point);
      else if (!ray.intersectPlane(groundPlane, impact)) impact.copy(ray.origin).addScaledVector(ray.direction, 36);
      spawnPuff(impact.x, Math.max(0.15, impact.y), impact.z, 0xfff1c4, 16);
      toast('MISS', false);
      spook(impact.clone());
    }
    showShotPath(ray.origin, impact);
    if (ammo === 0 && reserve > 0) autoReload = 0.42;
    updateHUD();
  }

  function tryReload() {
    if (phase !== 'playing' || reloading || ammo >= MAG || reserve <= 0) return;
    reloading = true;
    reloadLeft = 1.15;
    scoped = false;
    playReloadStart();
    updateHUD();
    updateScopeVisuals();
  }

  function updateReload(dt) {
    if (!reloading) return;
    reloadLeft -= dt;
    if (reloadLeft <= 0) {
      const take = Math.min(MAG - ammo, reserve);
      ammo += take;
      reserve -= take;
      reloading = false;
      playReloadEnd();
      updateHUD();
    }
  }

  function toggleScope() {
    if (phase !== 'playing' || reloading) return;
    scoped = !scoped;
    if (scoped) scopedTime = 0;
    updateScopeVisuals();
    updateHUD();
  }

  function endRound(reason) {
    if (phase !== 'playing') return;
    phase = 'ended';
    scoped = false;
    let fresh = false;
    if (score > best) {
      best = score;
      fresh = true;
      try { localStorage.setItem(BEST_KEY, String(best)); } catch (err) { /* ignore */ }
    }
    endReason.textContent = reason;
    endScore.textContent = String(score);
    endBest.textContent = fresh ? 'New best · ' + best : (best ? 'Best · ' + best : '');
    endHarvest.textContent = [
      plural(harvest.buck, 'buck'),
      plural(harvest.doe, 'doe', 'does'),
      plural(harvest.blue, 'blue deer', 'blue deer'),
      plural(harvest.boar, 'boar'),
      plural(harvest.piglet, 'piglet'),
      plural(harvest.rabbit, 'rabbit'),
      plural(harvest.giraffe, 'giraffe'),
      plural(harvest.elephant, 'elephant'),
    ].join('   ·   ');
    const acc = shots ? Math.round((hits / shots) * 100) : 0;
    endStats.textContent = plural(shots, 'shot') + '   ·   ' + plural(hits, 'hit') + '   ·   ' + acc + '% accuracy';
    hud.hidden = true;
    endScreen.hidden = false;
    titleScreen.hidden = true;
    updateScopeVisuals();
    refreshBestLine();
    playHorn();
  }

  function resetRound() {
    score = 0;
    shots = 0;
    hits = 0;
    ammo = MAG;
    reserve = RESERVE_START;
    timeLeft = ROUND_SECONDS;
    reloading = false;
    reloadLeft = 0;
    autoReload = 0;
    bolt = 0;
    emptyHold = 0;
    recoil = 0;
    yawKick = 0;
    harvest.buck = 0;
    harvest.doe = 0;
    harvest.boar = 0;
    harvest.rabbit = 0;
    harvest.blue = 0;
    harvest.piglet = 0;
    harvest.giraffe = 0;
    harvest.elephant = 0;
    clearAnimals();
    spawnOpening();
    spawnCooldown = 4.5;
  }

  function beginHunt() {
    if (phase === 'playing' || starting) return;
    ensureAudio();
    starting = true;
    titleScreen.hidden = true;
    endScreen.hidden = true;
    hud.hidden = true;
    fader.classList.add('on');
    engageLandscape();
    setTimeout(() => {
      resetRound();
      yaw = START_YAW;
      pitch = START_PITCH;
      userAimed = false;
      scoped = false;
      scopedTime = 0;
      phase = 'playing';
      hintTime = 5;
      hintEl.classList.add('show');
      hud.hidden = false;
      updateHUD();
      updateScopeVisuals();
      fader.classList.remove('on');
      starting = false;
    }, 320);
  }

  function updateCamera(dt) {
    const targetFov = scoped && phase === 'playing' ? scopedFov() : unscopedFov();
    camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-10 * dt));
    if (Math.abs(camera.fov - targetFov) < 0.04) camera.fov = targetFov;
    camera.updateProjectionMatrix();

    const swayScale = reduceMotion ? 0.35 : 1;
    let swayY = 0;
    let swayP = 0;
    let roll = 0;
    if (scoped && phase === 'playing') {
      scopedTime += dt;
      const fatigue = 1 + Math.min(1.65, scopedTime * 0.18);
      const cycle = (Math.sin(time * 2.5) + 1) / 2;
      const env = Math.pow(cycle, 1.55);
      const amp = (0.02 * fatigue * env + 0.0016) * swayScale;
      swayY = Math.sin(time * 1.9) * amp * 0.7;
      swayP = Math.cos(time * 2.5) * amp;
      roll = Math.sin(time * 0.85) * 0.005 * fatigue * env * swayScale;
    } else {
      scopedTime = 0;
      const amp = 0.0011 * swayScale;
      swayY = Math.sin(time * 0.65) * amp;
      swayP = Math.cos(time * 0.5) * amp;
    }

    if (phase === 'title' && !userAimed) {
      yaw = START_YAW + Math.sin(time * 0.17) * 0.1;
      pitch = START_PITCH + Math.sin(time * 0.12) * 0.012;
    }

    recoil += (0 - recoil) * (1 - Math.exp(-7 * dt));
    yawKick += (0 - yawKick) * (1 - Math.exp(-7 * dt));
    rifleKick += (0 - rifleKick) * (1 - Math.exp(-8 * dt));

    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw + tiltYaw + swayY + yawKick;
    camera.rotation.x = pitch + tiltPitch + swayP + recoil;
    camera.rotation.z = roll;
    camera.position.set(CAM.x, CAM.y, CAM.z);

    if (rifle) {
      rifle.visible = camera.fov > 30;
      rifle.position.z = rifleKick;
    }
    if (flash) {
      const flashMax = 0.12;
      flash.material.opacity = flashLife > 0 ? Math.max(0, flashLife / flashMax) : 0;
      const s = flashLife > 0 ? 1 + (1 - flashLife / flashMax) * 2.4 : 1;
      flash.scale.setScalar(s);
    }
    if (flashLife > 0) flashLife -= dt;
    if (tracer) {
      if (tracerLife > 0) {
        tracerLife -= dt;
        tracer.material.opacity = Math.max(0, tracerLife / 0.38);
        if (tracerLife <= 0) tracer.visible = false;
      }
    }
    if (mark) {
      if (markLife > 0) {
        markLife -= dt;
        mark.material.opacity = Math.max(0, markLife / 1.15);
        mark.lookAt(camera.position);
        if (markLife <= 0) mark.visible = false;
      }
    }
  }

  function updateRange() {
    if (!scoped || phase !== 'playing') return;
    camera.updateMatrixWorld(true);
    raycaster.setFromCamera(zeroNdc, camera);
    const ray = raycaster.ray;
    const hit = closestAnimal(ray);
    let text = '';
    if (hit) text = Math.round(hit.dist) + 'm';
    else if (ray.intersectPlane(groundPlane, hitG)) text = Math.round(hitG.distanceTo(ray.origin)) + 'm';
    if (rangeEl.textContent !== text) rangeEl.textContent = text;
  }

  function updateAmbience(dt) {
    for (const tree of trees) {
      const seed = tree.userData.seed;
      tree.rotation.x = Math.sin(time * 0.55 + seed) * 0.012;
      tree.rotation.z = Math.cos(time * 0.42 + seed) * 0.012;
    }
    for (const cloud of clouds) {
      cloud.position.x += dt * cloud.userData.speed;
      if (cloud.position.x > 130) cloud.position.x = -130;
    }
    for (const bird of birds) {
      const data = bird.userData;
      data.phase += dt * data.speed;
      const x = data.center.x + Math.cos(data.phase) * data.radius;
      const z = data.center.z + Math.sin(data.phase) * data.radius * 0.62;
      const y = data.height + Math.sin(data.phase * 2) * 1.1;
      bird.position.set(x, y, z);
      const nx = data.center.x + Math.cos(data.phase + 0.08) * data.radius;
      const nz = data.center.z + Math.sin(data.phase + 0.08) * data.radius * 0.62;
      bird.lookAt(nx, y, nz);
      const flap = Math.sin(time * 8 + data.phase) * 0.55;
      data.wings[0].rotation.z = flap;
      data.wings[1].rotation.z = -flap;
    }
    for (const mist of mists) {
      mist.material.opacity = mist.userData.base + Math.sin(time * 0.35 + mist.userData.seed) * 0.025;
    }
    if (audioCtx) {
      birdIn -= dt;
      if (birdIn <= 0) {
        chirp();
        birdIn = 4.5 + Math.random() * 6;
      }
    }
  }

  function updatePuffs(dt) {
    for (const puff of puffPool) {
      if (!puff.userData.on) continue;
      puff.userData.life -= dt;
      puff.position.addScaledVector(puff.userData.vel, dt);
      puff.userData.vel.y -= dt * 2.2;
      const t = Math.max(0, puff.userData.life / puff.userData.max);
      puff.material.opacity = t * 0.9;
      const grow = puff.userData.grow || 1;
      const s = grow * (0.8 + (1 - t) * 2.4);
      puff.scale.setScalar(s);
      if (puff.userData.life <= 0) {
        puff.userData.on = false;
        puff.visible = false;
      }
    }
  }

  function spawnPuff(x, y, z, color, count) {
    const n = count || 6;
    for (let i = 0; i < n; i++) {
      let puff = null;
      for (const item of puffPool) {
        if (!item.userData.on) { puff = item; break; }
      }
      if (!puff) {
        if (puffPool.length > 72) return;
        puff = new THREE.Mesh(
          geo('puff', () => new THREE.SphereGeometry(0.08, 5, 4)),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false })
        );
        scene.add(puff);
        puffPool.push(puff);
      }
      puff.visible = true;
      puff.userData.on = true;
      puff.material.color.setHex(color);
      puff.position.set(x, y, z);
      puff.userData.vel = new THREE.Vector3((Math.random() - 0.5) * 2.2, 0.8 + Math.random() * 1.6, (Math.random() - 0.5) * 2.2);
      puff.userData.max = 0.7 + Math.random() * 0.45;
      puff.userData.life = puff.userData.max;
      puff.userData.grow = n > 8 ? 1.8 : 1;
    }
  }

  let tracer = null;
  let tracerLife = 0;
  let mark = null;
  let markLife = 0;

  function showStreak(point) {
    if (!streakEl || !camera) return;
    const ndc = point.clone().project(camera);
    const box = viewBox();
    const x = (ndc.x * 0.5 + 0.5) * box.w;
    const y = (-ndc.y * 0.5 + 0.5) * box.h;
    const ang = Math.atan2(y - box.h / 2, x - box.w / 2);
    const dist = Math.max(140, Math.hypot(x - box.w / 2, y - box.h / 2));
    streakEl.style.width = dist + 'px';
    streakEl.style.transform = 'rotate(' + ang + 'rad)';
    streakEl.classList.remove('on');
    void streakEl.offsetWidth;
    streakEl.classList.add('on');
  }

  function showShotPath(origin, point) {
    const from = origin.clone();
    const to = point.clone();
    const dir = to.clone().sub(from);
    const len = dir.length();
    if (len > 0.3) {
      dir.multiplyScalar(1 / len);
      from.addScaledVector(dir, Math.min(0.9, len * 0.08));
      const span = Math.max(0.4, from.distanceTo(to));
      if (!tracer) {
        tracer = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.08, 1, 6),
          new THREE.MeshBasicMaterial({
            color: 0xfff6c8,
            transparent: true,
            opacity: 1,
            depthWrite: false,
            fog: false,
            blending: THREE.AdditiveBlending,
          })
        );
        scene.add(tracer);
      }
      tracer.position.copy(from.clone().lerp(to, 0.5));
      tracer.scale.set(1, span, 1);
      tracer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      tracer.visible = true;
      tracer.material.opacity = 1;
      tracerLife = 0.38;
    }
    if (!mark) {
      mark = new THREE.Mesh(
        new THREE.CircleGeometry(0.7, 18),
        new THREE.MeshBasicMaterial({
          color: 0xfff1c0,
          transparent: true,
          opacity: 1,
          depthWrite: false,
          side: THREE.DoubleSide,
          fog: false,
        })
      );
      scene.add(mark);
    }
    mark.position.copy(point);
    mark.position.y += 0.1;
    mark.lookAt(camera.position);
    mark.visible = true;
    mark.material.opacity = 1;
    markLife = 1.15;
    showStreak(point);
  }

  function grassTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const g = canvas.getContext('2d');
    g.fillStyle = '#5d863c';
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 3500; i++) {
      const shade = 80 + Math.random() * 90;
      g.fillStyle = 'rgba(' + (40 + Math.random() * 40) + ',' + shade + ',' + (30 + Math.random() * 30) + ',0.4)';
      g.fillRect(Math.random() * 512, Math.random() * 512, 3 + Math.random() * 5, 3 + Math.random() * 5);
    }
    g.lineWidth = 1;
    for (let i = 0; i < 2200; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      g.strokeStyle = 'rgba(' + (30 + Math.random() * 40) + ',' + (100 + Math.random() * 80) + ',' + (30 + Math.random() * 30) + ',0.65)';
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (Math.random() - 0.5) * 3, y - 4 - Math.random() * 7);
      g.stroke();
    }
    for (let i = 0; i < 24; i++) {
      g.fillStyle = 'rgba(168, 142, 78, ' + (0.08 + Math.random() * 0.12) + ')';
      g.beginPath();
      g.ellipse(Math.random() * 512, Math.random() * 512, 18 + Math.random() * 36, 10 + Math.random() * 20, Math.random() * 3, 0, Math.PI * 2);
      g.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(42, 42);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }

  function makeShadowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const g = canvas.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 4, 32, 32, 32);
    grad.addColorStop(0, 'rgba(0,0,0,0.4)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function makeSunTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const g = canvas.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 6, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,250,230,1)');
    grad.addColorStop(0.3, 'rgba(255,214,150,0.75)');
    grad.addColorStop(1, 'rgba(255,190,110,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function addBlocker(mesh) {
    mesh.updateWorldMatrix(true, true);
    blockers.push(new THREE.Box3().setFromObject(mesh));
  }

  function buildWorld() {
    scene.background = new THREE.Color(HORIZON);
    scene.fog = new THREE.Fog(HORIZON, 78, 230);

    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(480, 20, 14),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          topColor: { value: new THREE.Color(0x7eafd4) },
          horizonColor: { value: new THREE.Color(HORIZON) },
          bottomColor: { value: new THREE.Color(0xc5d6a6) },
        },
        vertexShader: [
          'varying float vY;',
          'void main() {',
          '  vY = normalize(position).y;',
          '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
          '}',
        ].join('\n'),
        fragmentShader: [
          'uniform vec3 topColor;',
          'uniform vec3 horizonColor;',
          'uniform vec3 bottomColor;',
          'varying float vY;',
          'void main() {',
          '  float h = smoothstep(-0.2, 0.02, vY);',
          '  float u = smoothstep(0.0, 0.55, vY);',
          '  vec3 col = mix(bottomColor, horizonColor, h);',
          '  col = mix(col, topColor, u);',
          '  gl_FragColor = vec4(col, 1.0);',
          '}',
        ].join('\n'),
      })
    );
    sky.frustumCulled = false;
    scene.add(sky);

    const sun = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeSunTexture(),
      transparent: true,
      depthWrite: false,
      fog: false,
    }));
    sun.position.set(-96, 64, -80);
    sun.scale.set(56, 56, 1);
    scene.add(sun);

    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xfffaf4, transparent: true, opacity: 0.88, depthWrite: false, fog: false });
    const puffGeo = new THREE.SphereGeometry(1, 7, 6);
    for (let i = 0; i < 7; i++) {
      const cloud = new THREE.Group();
      const blobs = 3 + Math.floor(Math.random() * 3);
      for (let b = 0; b < blobs; b++) {
        const blob = new THREE.Mesh(puffGeo, cloudMat);
        blob.position.set(b * 1.3, Math.sin(b) * 0.3, (b % 2) * 0.4);
        blob.scale.set(1.4 + Math.random(), 0.7 + Math.random() * 0.3, 1);
        cloud.add(blob);
      }
      cloud.position.set(-130 + i * 42, 34 + Math.random() * 14, -70 - Math.random() * 50);
      cloud.scale.setScalar(3 + Math.random() * 2);
      cloud.userData.speed = 0.8 + Math.random() * 0.8;
      scene.add(cloud);
      clouds.push(cloud);
    }

    scene.add(new THREE.HemisphereLight(0xffe4c4, 0x3d6a32, 0.92));
    const sunLight = new THREE.DirectionalLight(0xfff1d2, 1.18);
    sunLight.position.set(-60, 48, -18);
    scene.add(sunLight);
    const fill = new THREE.DirectionalLight(0xd5e6f8, 0.32);
    fill.position.set(30, 18, 24);
    scene.add(fill);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(460, 460),
      new THREE.MeshLambertMaterial({ map: grassTexture() })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const hillGeo = new THREE.SphereGeometry(1, 12, 8);
    const hillA = lambert(0x8eab78);
    const hillB = lambert(0x769468);
    [[-90, -38, -150, 86, 44, 58, hillA], [78, -42, -162, 100, 48, 64, hillB], [4, -54, -198, 130, 58, 74, hillA], [-24, -30, -228, 150, 42, 86, hillB]].forEach((h) => {
      const mesh = new THREE.Mesh(hillGeo, h[6]);
      mesh.position.set(h[0], h[1], h[2]);
      mesh.scale.set(h[3], h[4], h[5]);
      scene.add(mesh);
    });

    const mistMatA = new THREE.MeshBasicMaterial({ color: 0xf4ead6, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
    const mistMatB = mistMatA.clone();
    mistMatB.opacity = 0.1;
    [[0, 0.7, -36, 90, 44, mistMatA, 0.16], [12, 1.15, -62, 110, 36, mistMatB, 0.1]].forEach((m, i) => {
      const mist = new THREE.Mesh(new THREE.PlaneGeometry(m[3], m[4]), m[5]);
      mist.rotation.x = -Math.PI / 2;
      mist.position.set(m[0], m[1], m[2]);
      mist.userData.base = m[6];
      mist.userData.seed = i;
      scene.add(mist);
      mists.push(mist);
    });

    buildTrees();
    buildSavanna();
    buildPond();
    buildGrass();
    buildStand();
    buildRocks();
    buildLog();
    buildBirds();
  }

  function buildTrees() {
    const trunkGeo = new THREE.CylinderGeometry(0.16, 0.26, 2.1, 6);
    const coneGeo = new THREE.ConeGeometry(1, 1.65, 7);
    const leafGeo = new THREE.SphereGeometry(1, 7, 5);
    const trunkMat = lambert(0x7a5340);
    const pineMats = [0x234a30, 0x2c5a36, 0x1b3c28].map(lambert);
    const leafMats = [0xc47a3a, 0xd9a441, 0xb85a3a, 0x6e8f3a, 0x8ea84a, 0xa85a32].map(lambert);

    function makePine() {
      const group = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.05;
      group.add(trunk);
      const mat = pineMats[Math.floor(Math.random() * pineMats.length)];
      for (let i = 0; i < 3; i++) {
        const cone = new THREE.Mesh(coneGeo, mat);
        cone.position.y = 2.1 + i * 1.02;
        const s = 1.15 - i * 0.28;
        cone.scale.setScalar(s);
        group.add(cone);
      }
      return group;
    }

    function makeBroad() {
      const group = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.2;
      trunk.scale.set(0.8, 1.2, 0.8);
      group.add(trunk);
      const mat = leafMats[Math.floor(Math.random() * leafMats.length)];
      const crown = new THREE.Mesh(leafGeo, mat);
      crown.position.y = 3;
      crown.scale.set(1.55, 1.15, 1.45);
      group.add(crown);
      const side = new THREE.Mesh(leafGeo, mat);
      side.position.set(0.55, 2.55, 0.15);
      side.scale.setScalar(0.85);
      group.add(side);
      return group;
    }

    function addTree(x, z, scale, broad) {
      if (Math.hypot(x, z - 8) < 8) return;
      const meadow = (x * x) / (38 * 38) + ((z + 48) * (z + 48)) / (30 * 30);
      if (meadow < 1.02) return;
      const tree = broad ? makeBroad() : makePine();
      tree.position.set(x, 0, z);
      tree.scale.setScalar(scale);
      tree.rotation.y = Math.random() * Math.PI * 2;
      tree.userData.seed = Math.random() * 10;
      scene.add(tree);
      trees.push(tree);
    }

    for (let i = 0; i < 16; i++) {
      addTree(-100 + i * 13 + Math.random() * 2, -108 - Math.random() * 10, 1.5 + Math.random() * 0.8, false);
    }
    for (let i = 0; i < 22; i++) {
      const x = (Math.random() < 0.5 ? -1 : 1) * (46 + Math.random() * 64);
      const z = -8 - Math.random() * 100;
      addTree(x, z, 0.85 + Math.random() * 1.05, Math.random() < 0.45);
    }
    for (let i = 0; i < 18; i++) {
      const x = (Math.random() * 2 - 1) * 120;
      const z = -70 - Math.random() * 55;
      addTree(x, z, 1.1 + Math.random() * 0.9, Math.random() < 0.3);
    }

    const bushGeo = new THREE.SphereGeometry(0.5, 6, 5);
    const bushMats = [0x3e6a34, 0x4e7c3e, 0x2d522c].map(lambert);
    for (let i = 0; i < 22; i++) {
      const ang = Math.random() * Math.PI * 2;
      const x = Math.cos(ang) * (34 + Math.random() * 12);
      const z = -48 + Math.sin(ang) * (26 + Math.random() * 10);
      if (inPond(x, z)) continue;
      const bush = new THREE.Group();
      const mat = bushMats[i % bushMats.length];
      for (let b = 0; b < 3; b++) {
        const s = new THREE.Mesh(bushGeo, mat);
        s.position.set((b - 1) * 0.36, 0.28, (b % 2) * 0.12);
        s.scale.y = 0.62;
        bush.add(s);
      }
      bush.position.set(x, 0, z);
      bush.scale.setScalar(0.8 + Math.random() * 0.7);
      scene.add(bush);
    }
  }

  function buildSavanna() {
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(48, 28),
      new THREE.MeshLambertMaterial({ color: 0xc6b07a, transparent: true, opacity: 0.42 })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(4, 0.04, -64);
    scene.add(disc);

    const trunkGeo = geo('acaTrunk', () => new THREE.CylinderGeometry(0.12, 0.2, 2.5, 6));
    const crownGeo = geo('acaCrown', () => new THREE.SphereGeometry(1, 7, 5));
    const trunkMat = lambert(0x6b4a32);
    const crownMat = lambert(0x7d9a3e);
    [[-30, -50], [26, -54], [-10, -78], [34, -76], [-38, -72], [16, -90], [42, -60]].forEach(([x, z], i) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.25;
      tree.add(trunk);
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.y = 2.75;
      crown.scale.set(2.15, 0.36, 2.15);
      tree.add(crown);
      tree.position.set(x, 0, z);
      tree.scale.setScalar(1.05 + (i % 3) * 0.16);
      scene.add(tree);
    });
  }

  function buildPond() {
    const shore = new THREE.Mesh(
      new THREE.CircleGeometry(6.6, 22),
      lambert(0xc6b48a)
    );
    shore.rotation.x = -Math.PI / 2;
    shore.position.set(-16, 0.02, -24);
    scene.add(shore);
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(5.1, 22),
      new THREE.MeshLambertMaterial({ color: 0x6f9088, transparent: true, opacity: 0.94 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(-16, 0.04, -24);
    scene.add(water);
    const inner = new THREE.Mesh(new THREE.CircleGeometry(3.1, 18), lambert(0x4e726c));
    inner.rotation.x = -Math.PI / 2;
    inner.position.set(-16, 0.05, -24);
    scene.add(inner);
    const reedGeo = new THREE.CylinderGeometry(0.025, 0.035, 1.05, 4);
    const reedMat = lambert(0x6d9148);
    for (let i = 0; i < 10; i++) {
      const ang = Math.random() * Math.PI * 2;
      const reed = new THREE.Mesh(reedGeo, reedMat);
      reed.position.set(-16 + Math.cos(ang) * (5.3 + Math.random() * 0.6), 0.5, -24 + Math.sin(ang) * (5.3 + Math.random() * 0.6));
      reed.rotation.z = (Math.random() - 0.5) * 0.25;
      scene.add(reed);
    }
  }

  function buildGrass() {
    const cone = new THREE.ConeGeometry(0.16, 0.55, 4);
    const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const count = 260;
    const mesh = new THREE.InstancedMesh(cone, material, count);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const palette = [0x6e9a45, 0x587e38, 0x8aaa52, 0x4f7030, 0xb3c07a];
    for (let i = 0; i < count; i++) {
      const spot = randomMeadowPoint();
      const sy = 0.7 + Math.random() * 1.15;
      const s = 0.65 + Math.random() * 0.8;
      dummy.position.set(spot.x, 0.275 * sy, spot.z);
      dummy.rotation.set((Math.random() - 0.5) * 0.15, Math.random() * 6, 0);
      dummy.scale.set(s, sy, s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      color.setHex(palette[i % palette.length]);
      color.offsetHSL(0, (Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.06);
      mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    scene.add(mesh);
  }

  function buildStand() {
    const wood = lambert(0x8d5e3c);
    const dark = lambert(0x6b442c);
    for (let i = 0; i < 6; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.07, 0.34), i % 2 ? wood : dark);
      plank.position.set(0, 2.48, 7.15 + i * 0.38);
      scene.add(plank);
    }
    const supportGeo = new THREE.CylinderGeometry(0.07, 0.09, 2.48, 6);
    [[-1.02, 7.25], [1.02, 7.25], [-1.02, 9.15], [1.02, 9.15]].forEach(([x, z]) => {
      const post = new THREE.Mesh(supportGeo, dark);
      post.position.set(x, 1.24, z);
      scene.add(post);
    });
    const frameGeo = new THREE.CylinderGeometry(0.055, 0.07, 3.15, 6);
    [-1.18, 1.18].forEach((x) => {
      const post = new THREE.Mesh(frameGeo, wood);
      post.position.set(x, 1.58, 6.48);
      scene.add(post);
      addBlocker(post);
    });
    const rail = new THREE.Mesh(new THREE.BoxGeometry(2.36, 0.08, 0.08), wood);
    rail.position.set(0, 2.95, 6.48);
    scene.add(rail);
    addBlocker(rail);
    [-1.18, 1.18].forEach((x) => {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 1.35), wood);
      side.position.set(x, 2.95, 7.15);
      scene.add(side);
    });
    [-0.18, 0.18].forEach((x) => {
      const railSide = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.5, 0.05), dark);
      railSide.position.set(x, 1.15, 9.55);
      railSide.rotation.x = 0.22;
      scene.add(railSide);
    });
    for (let i = 0; i < 5; i++) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.04), wood);
      rung.position.set(0, 0.35 + i * 0.42, 9.45);
      scene.add(rung);
    }
  }

  function buildRocks() {
    const rockGeo = new THREE.DodecahedronGeometry(0.38, 0);
    const rockMat = lambert(0x8d8680);
    for (let i = 0; i < 9; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(Math.cos(ang) * (16 + Math.random() * 8), 0.12, -30 + Math.sin(ang) * (12 + Math.random() * 6));
      rock.scale.set(0.7 + Math.random(), 0.45 + Math.random() * 0.4, 0.7 + Math.random());
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      if (inPond(rock.position.x, rock.position.z)) continue;
      scene.add(rock);
    }
  }

  function buildLog() {
    const log = new THREE.Mesh(
      geo('log', () => new THREE.CylinderGeometry(0.22, 0.28, 4.4, 6)),
      lambert(0x6b4a32)
    );
    log.rotation.z = Math.PI / 2;
    log.rotation.y = 0.55;
    log.position.set(20, 0.24, -38);
    scene.add(log);
  }

  function buildBirds() {
    const mat = new THREE.MeshBasicMaterial({ color: 0x2a2724 });
    const wingGeo = new THREE.BoxGeometry(0.55, 0.04, 0.16);
    for (let i = 0; i < 3; i++) {
      const bird = new THREE.Group();
      const left = new THREE.Mesh(wingGeo, mat);
      const right = new THREE.Mesh(wingGeo, mat);
      left.position.x = -0.28;
      right.position.x = 0.28;
      bird.add(left, right);
      bird.userData.wings = [left, right];
      bird.userData.phase = Math.random() * 6;
      bird.userData.radius = 18 + Math.random() * 16;
      bird.userData.height = 16 + Math.random() * 8;
      bird.userData.speed = 0.18 + Math.random() * 0.15;
      bird.userData.center = { x: (Math.random() - 0.5) * 16, z: -28 - Math.random() * 12 };
      scene.add(bird);
      birds.push(bird);
    }
  }

  function buildRifle() {
    const group = new THREE.Group();
    const metal = lambert(0x2a2e2a);
    const wood = lambert(0x6b4228);
    const dark = lambert(0x161816);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.017, 0.76, 8), metal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0.22, -0.24, -0.62);
    group.add(barrel);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.34), wood);
    stock.position.set(0.22, -0.28, -0.2);
    stock.rotation.x = 0.28;
    group.add(stock);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8), dark);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0.22, -0.185, -0.5);
    group.add(tube);
    flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xfff1c4, transparent: true, opacity: 0, depthWrite: false, fog: false })
    );
    flash.position.set(0.22, -0.24, -1.02);
    group.add(flash);
    return group;
  }

  function resize() {
    const box = viewBox();
    if (!box.w || !box.h || !renderer) return;
    camera.aspect = box.w / box.h;
    camera.updateProjectionMatrix();
    renderer.setSize(box.w, box.h, false);
  }

  function aimNearest() {
    let best = null;
    let bestD = Infinity;
    for (const animal of animals) {
      if (animal.state === 'dead') continue;
      const dx = animal.root.position.x - camera.position.x;
      const dz = animal.root.position.z - camera.position.z;
      const d = dx * dx + dz * dz;
      if (d < bestD) {
        bestD = d;
        best = animal;
      }
    }
    if (!best) return null;
    best.root.updateWorldMatrix(true, true);
    _box.setFromObject(best.bob);
    const center = _box.getCenter(hitG);
    const dx = center.x - camera.position.x;
    const dy = center.y - camera.position.y;
    const dz = center.z - camera.position.z;
    yaw = Math.atan2(-dx, -dz);
    pitch = Math.atan2(dy, Math.hypot(dx, dz));
    userAimed = true;
    return best.kind;
  }

  function onTilt(event) {
    if (!tiltOn) return;
    if (event.gamma == null || event.beta == null) return;
    if (!tiltBase) tiltBase = { g: event.gamma, b: event.beta };
    const scale = scoped ? 0.01 : 0.016;
    tiltYaw = THREE.MathUtils.clamp(-(event.gamma - tiltBase.g) * scale, -0.7, 0.7);
    tiltPitch = THREE.MathUtils.clamp(-(event.beta - tiltBase.b) * scale * 0.65, -0.45, 0.45);
  }

  function requestTilt() {
    const DOE = window.DeviceOrientationEvent;
    if (!DOE) return Promise.resolve(false);
    const finish = () => {
      if (!tiltListening) {
        window.addEventListener('deviceorientation', onTilt);
        tiltListening = true;
      }
      tiltOn = true;
      tiltBase = null;
      tiltYaw = 0;
      tiltPitch = 0;
      return true;
    };
    if (typeof DOE.requestPermission === 'function') {
      return DOE.requestPermission().then((result) => (result === 'granted' ? finish() : false)).catch(() => false);
    }
    return Promise.resolve(finish());
  }

  function updateTiltButton() {
    tiltBtn.textContent = tiltOn ? 'Tilt aim on' : 'Tilt aim off';
    tiltBtn.setAttribute('aria-pressed', tiltOn ? 'true' : 'false');
  }

  const pointers = new Map();
  let lookId = null;
  let longTimer = null;

  function clearLong() {
    if (longTimer) {
      clearTimeout(longTimer);
      longTimer = null;
    }
  }

  function bindInput() {
    const el = renderer.domElement;
    el.addEventListener('pointerdown', (event) => {
      if (hitsFire(event.clientX, event.clientY)) return;
      if (event.button === 2) {
        event.preventDefault();
        toggleScope();
        return;
      }
      if (event.button !== 0) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, moved: 0 });
      try { el.setPointerCapture(event.pointerId); } catch (err) { /* ignore */ }
      if (pointers.size === 2) {
        clearLong();
        lookId = null;
        toggleScope();
        return;
      }
      lookId = event.pointerId;
      userAimed = true;
      clearLong();
      longTimer = setTimeout(() => {
        const p = pointers.get(event.pointerId);
        if (p && p.moved < 16) toggleScope();
      }, 460);
    });
    el.addEventListener('pointermove', (event) => {
      const p = pointers.get(event.pointerId);
      if (!p) return;
      const sx = event.clientX - p.x;
      const sy = event.clientY - p.y;
      p.x = event.clientX;
      p.y = event.clientY;
      p.moved += Math.abs(sx) + Math.abs(sy);
      if (p.moved > 16) clearLong();
      if (event.pointerId !== lookId || pointers.size >= 2) return;
      const sens = 0.00315 * (camera.fov / unscopedFov());
      const delta = lookDelta(sx, sy);
      yaw -= delta.x * sens;
      pitch -= delta.y * sens;
      pitch = Math.max(-1.15, Math.min(0.82, pitch));
      yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
    });
    const endPointer = (event) => {
      pointers.delete(event.pointerId);
      if (lookId === event.pointerId) {
        const next = pointers.keys().next();
        lookId = next.done ? null : next.value;
      }
      clearLong();
    };
    el.addEventListener('pointerup', endPointer);
    el.addEventListener('pointercancel', endPointer);
    el.addEventListener('contextmenu', (event) => event.preventDefault());

    let fireAt = 0;
    function pressFire() {
      const now = performance.now();
      if (now - fireAt < 90) return;
      fireAt = now;
      ensureAudio();
      onFire();
    }
    function hitsFire(x, y) {
      const el = document.elementFromPoint(x, y);
      return !!(el && (el === fireBtn || fireBtn.contains(el)));
    }
    function bindPress(el, fn) {
      let at = 0;
      const go = (event) => {
        if (event.button != null && event.button !== 0) return;
        event.stopPropagation();
        const now = performance.now();
        if (now - at < 90) return;
        at = now;
        ensureAudio();
        fn();
        if (event.cancelable) event.preventDefault();
      };
      el.addEventListener('pointerdown', go);
      el.addEventListener('touchstart', go, { passive: false });
      el.addEventListener('click', (event) => {
        event.preventDefault();
        if (performance.now() - at < 500) return;
        ensureAudio();
        fn();
      });
    }
    bindPress(fireBtn, onFire);
    bindPress(scopeBtn, () => toggleScope());
    bindPress(reloadBtn, () => tryReload());
    bindPress(startBtn, () => beginHunt());
    bindPress(againBtn, () => beginHunt());
    bindPress(playAnywayBtn, () => {
      playAnyway = true;
      try { sessionStorage.setItem('deer-hunter-portrait-ok', '1'); } catch (err) { /* ignore */ }
      syncOrientation();
    });
    bindPress(playSidewaysBtn, () => setTurnPref(90));
    bindPress(turnTitleBtn, () => cycleTurn());
    bindPress(turnHudBtn, () => cycleTurn());
    muteButtons.forEach((btn) => bindPress(btn, () => toggleMute()));
    window.addEventListener('touchstart', (event) => {
      ensureAudio();
      for (let i = 0; i < event.changedTouches.length; i++) {
        const t = event.changedTouches[i];
        if (hitsFire(t.clientX, t.clientY)) pressFire();
      }
    }, { capture: true, passive: false });
    window.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (hitsFire(event.clientX, event.clientY)) pressFire();
    }, true);
    tiltBtn.addEventListener('click', () => {
      if (tiltOn) {
        tiltOn = false;
        tiltYaw = 0;
        tiltPitch = 0;
        updateTiltButton();
        bootMsg.textContent = 'Drag to aim.';
        return;
      }
      requestTilt().then((ok) => {
        updateTiltButton();
        bootMsg.textContent = ok ? 'Hold the phone how you hunt, then tilt to aim. Drag still works.' : 'This browser did not allow tilt. Drag to aim.';
      });
    });

    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      if (event.code === 'Space') {
        event.preventDefault();
        if (phase !== 'playing') beginHunt();
        else onFire();
      } else if (event.code === 'KeyR') tryReload();
      else if (event.code === 'KeyF' || event.code === 'KeyC') toggleScope();
      else if (event.code === 'KeyM') toggleMute();
      else if (event.code === 'Enter' && phase !== 'playing') beginHunt();
    });

    window.addEventListener('resize', scheduleSync);
    window.addEventListener('orientationchange', scheduleSync);
    window.addEventListener('focus', syncOrientation);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) syncOrientation();
    });
    if (screen.orientation && screen.orientation.addEventListener) {
      screen.orientation.addEventListener('change', scheduleSync);
    }
    const orientMedia = window.matchMedia('(orientation: landscape)');
    if (orientMedia.addEventListener) orientMedia.addEventListener('change', scheduleSync);
    else if (orientMedia.addListener) orientMedia.addListener(scheduleSync);
    if (window.ResizeObserver) {
      const observer = new ResizeObserver(() => syncOrientation());
      observer.observe(document.documentElement);
    }
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', scheduleSync);
      window.visualViewport.addEventListener('scroll', scheduleSync);
    }
    window.addEventListener('contextmenu', (event) => event.preventDefault());
    window.addEventListener('wheel', (event) => event.preventDefault(), { passive: false });
    window.addEventListener('touchmove', (event) => {
      const target = event.target;
      if (target && target.closest && target.closest('button, #title-card, #end-card')) return;
      const card = target && target.closest && target.closest('#title-card, #end-card');
      if (card && card.scrollHeight > card.clientHeight + 4) return;
      event.preventDefault();
    }, { passive: false });
    window.addEventListener('gesturestart', (event) => event.preventDefault(), { passive: false });
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
      const target = event.target;
      if (target && target.closest && target.closest('button')) return;
      const now = Date.now();
      if (now - lastTouchEnd < 320) event.preventDefault();
      lastTouchEnd = now;
    }, { passive: false });
  }

  function lookDelta(sx, sy) {
    if (turn === 90) return { x: -sy, y: sx };
    if (turn === -90) return { x: sy, y: -sx };
    return { x: sx, y: sy };
  }

  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (document.hidden) return;
    time += dt;
    const blocked = hintBlocking();
    updateCamera(dt);
    updateAmbience(dt);
    updatePuffs(dt);
    if (phase === 'title' || phase === 'ended' || blocked) updateAnimals(dt);
    if ((phase === 'title' || phase === 'playing') && !blocked) updatePopulation(dt);
    if (phase === 'playing' && !blocked) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        endRound("Time's up");
      } else {
        updateAnimals(dt);
        updateReload(dt);
        if (bolt > 0) bolt = Math.max(0, bolt - dt);
        if (autoReload > 0) {
          autoReload -= dt;
          if (autoReload <= 0) tryReload();
        }
        if (ammo === 0 && reserve === 0 && !reloading && bolt <= 0) {
          emptyHold += dt;
          if (emptyHold > 1.25) endRound('Out of ammunition');
        } else emptyHold = 0;
        if (hintTime > 0) {
          hintTime -= dt;
          if (hintTime <= 0) hintEl.classList.remove('show');
        }
        rangeAcc += dt;
        if (rangeAcc > 0.12) {
          rangeAcc = 0;
          updateRange();
        }
        updateHUD();
      }
    }
    if (toastTime > 0) {
      toastTime -= dt;
      if (toastTime <= 0) toastEl.className = '';
    }
    renderer.render(scene, camera);
  }

  function boot() {
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false,
      });
    } catch (err) {
      showBoot('WebGL is not available in this browser.');
      return;
    }
    try {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setClearColor(HORIZON, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.id = 'view';
    stage.prepend(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(HIP_FOV, 1, 0.08, 520);
    camera.rotation.order = 'YXZ';
    scene.add(camera);
    raycaster = new THREE.Raycaster();
    shadowTex = makeShadowTexture();

    buildWorld();
    rifle = buildRifle();
    camera.add(rifle);
    spawnOpening();
    bindInput();
    applyMute();
    refreshBestLine();
    syncOrientation();
    updateCamera(0.016);
    renderer.render(scene, camera);
    requestAnimationFrame(() => renderer.domElement.classList.add('ready'));
    requestAnimationFrame(frame);
    startBtn.disabled = false;
    startBtn.textContent = 'Start the hunt';

    if (params.get('debug') === '1') {
      window.HUNT = {
        begin: beginHunt,
        end: () => endRound("Time's up"),
        scope: (value) => {
          if (phase !== 'playing') return;
          scoped = !!value;
          scopedTime = 0;
          updateScopeVisuals();
        },
        aimNearest,
        probe() {
          camera.updateMatrixWorld(true);
          const dir = new THREE.Vector3();
          camera.getWorldDirection(dir);
          return {
            yaw, pitch, fov: camera.fov, aspect: camera.aspect,
            hip: unscopedFov(), zoom: scopedFov(), scoped,
            dir: [dir.x, dir.y, dir.z],
            pos: [camera.position.x, camera.position.y, camera.position.z],
          };
        },
        aimFormula(kind) {
          const animal = animals.find((item) => item.kind === kind && item.state !== 'dead');
          if (!animal) return null;
          animal.root.updateWorldMatrix(true, true);
          _box.setFromObject(animal.bob);
          const center = _box.getCenter(new THREE.Vector3());
          const dx = center.x - camera.position.x;
          const dy = center.y - camera.position.y;
          const dz = center.z - camera.position.z;
          yaw = Math.atan2(-dx, -dz);
          pitch = Math.atan2(dy, Math.hypot(dx, dz));
          userAimed = true;
          return { kind, yaw, pitch, center: [center.x, center.y, center.z] };
        },
        aimKind(kind) {
          const animal = animals.find((item) => item.kind === kind && item.state !== 'dead');
          if (!animal) return null;
          animal.root.updateWorldMatrix(true, true);
          _box.setFromObject(animal.bob);
          const center = _box.getCenter(new THREE.Vector3());
          const dx = center.x - camera.position.x;
          const dy = center.y - camera.position.y;
          const dz = center.z - camera.position.z;
          const dummy = new THREE.Object3D();
          dummy.position.copy(camera.position);
          dummy.lookAt(center);
          const euler = new THREE.Euler().setFromQuaternion(dummy.quaternion, 'YXZ');
          yaw = euler.y;
          pitch = euler.x;
          userAimed = true;
          return { kind, center: [center.x, center.y, center.z], yaw, pitch, dx, dy, dz };
        },
        fire: onFire,
        tick(dt) {
          updateAnimals(dt || 0.05);
        },
        parade(kind) {
          for (let i = animals.length - 1; i >= 0; i--) {
            if (animals[i].kind === kind) removeAnimal(animals[i]);
          }
          const spot = kind === 'piglet' ? { x: 0.72, z: -6.6 } : { x: 2.2, z: -13 };
          placeAnimal(kind, { x: spot.x, z: spot.z, state: 'alert', broadside: true, timer: 90 });
          return { kind, x: spot.x, z: spot.z };
        },
        spawnGroup(kind, count) {
          for (let i = animals.length - 1; i >= 0; i--) {
            if (animals[i].kind === kind) removeAnimal(animals[i]);
          }
          const n = spawnHerd(kind, count || 0);
          return {
            n,
            animals: animals.filter((animal) => animal.kind === kind).map((animal) => ({
              x: +animal.root.position.x.toFixed(2),
              z: +animal.root.position.z.toFixed(2),
              state: animal.state,
            })),
          };
        },
        spawnDash(kind) {
          for (let i = animals.length - 1; i >= 0; i--) {
            if (animals[i].kind === kind) removeAnimal(animals[i]);
          }
          if (kind === 'piglet') {
            placeAnimal('piglet', { x: 0, z: -20, state: 'dash', target: { x: 14, z: -18 }, path: [{ x: 18, z: -26 }] });
          } else {
            placeAnimal('blue', { x: -10, z: -22, state: 'dash', target: { x: 24, z: -22 }, path: [] });
          }
          const animal = animals.find((item) => item.kind === kind);
          return { x: animal.root.position.x, z: animal.root.position.z, state: animal.state };
        },
        dump: () => ({
          phase, score, ammo, reserve, timeLeft, shots, hits, yaw, pitch, scoped,
          turn, turnPref, landscapeLock, vibrated, android: ANDROID,
          animals: animals.map((animal) => ({
            kind: animal.kind,
            state: animal.state,
            x: +animal.root.position.x.toFixed(2),
            z: +animal.root.position.z.toFixed(2),
          })),
        }),
      };
    }
    } catch (err) {
      console.error(err);
      showBoot('Could not start the woods. ' + (err && err.message ? err.message : 'Error'));
    }
  }

  applyMute();
  refreshBestLine();
  boot();
})();
