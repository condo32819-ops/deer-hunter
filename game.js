(() => {
  'use strict';

  const THREE_OK = typeof window.THREE !== 'undefined';
  const params = new URLSearchParams(location.search);
  const ROUND_SECONDS = params.get('quick') === '1' ? 12 : 150;
  const MAG = 5;
  const RESERVE_START = 10;
  const MAX_ANIMALS = 20;
  const HIP_FOV = 52;
  const SCOPE_FOV = 15;
  const START_YAW = -0.08;
  const START_PITCH = -0.1;
  const CAM = { x: 0, y: 3.42, z: 8.15 };
  const HORIZON = 0xf0d2ae;
  const BEST_KEY = 'deer-hunter-best';
  const MUTE_KEY = 'deer-hunter-muted';
  const TURN_KEY = 'deer-hunter-turn';
  const POINTS = { buck: 150, doe: 100, boar: 120, rabbit: 50, blue: 400, piglet: 80, giraffe: 200, elephant: 250, lion: 300, gorilla: 160, kangaroo: 220, joey: 800, ape: 700, caveman: 140, bunny: 40, poacher: 500 };
  const WALK = { buck: 1.35, doe: 1.55, boar: 1.15, rabbit: 2.35, blue: 2.4, piglet: 1.6, giraffe: 1.05, elephant: 0.82, lion: 1.45, gorilla: 0.66, kangaroo: 3.4, joey: 2.6, ape: 2.15, caveman: 1.28, bunny: 2.15, poacher: 1.45 };
  const FLEE = { buck: 7.2, doe: 7.6, boar: 6.2, rabbit: 9.2, blue: 11.4, piglet: 4.4, giraffe: 2.4, elephant: 1.7, lion: 6.4, gorilla: 2.05, kangaroo: 4.2, joey: 3.25, ape: 3.2, caveman: 3.3, bunny: 3.35, poacher: 3.1 };
  // The blue deer is the fast crosser. The lion uses half that dash.
  // Kangaroo and caveman cross at a readable pace. Babies stay hittable.
  const BLUE_DASH = 14.2;
  const DASH = { blue: BLUE_DASH, piglet: 4.9, lion: BLUE_DASH * 0.5, kangaroo: 3.85, caveman: 1.32, poacher: 1.5 };
  // Held or tapped fire. About five shots a second, one round each.
  const FIRE_CYCLE = 0.2;
  const NAMES = { buck: 'Buck', doe: 'Doe', boar: 'Boar', rabbit: 'Cottontail', blue: 'Blue deer', piglet: 'Piglet', giraffe: 'Giraffe', elephant: 'Elephant', lion: 'Lion', gorilla: 'Gorilla', kangaroo: 'Kangaroo', joey: 'Joey', ape: 'Baby gorilla', caveman: 'Caveman', bunny: 'Bunny', poacher: 'Poacher' };

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
  const poacherEl = $('poacher');
  const poacherNote = $('poacher-note');
  const poacherFill = $('poacher-fill');
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
  let triggerHeld = false;
  let spaceHeld = false;
  let touchHold = false;
  let shotQueued = false;
  let dryLatched = false;
  let lastTriggerAt = 0;
  const firePointers = new Set();
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
  let spawnCooldown = 3.4;
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

  const harvest = { buck: 0, doe: 0, boar: 0, rabbit: 0, blue: 0, piglet: 0, giraffe: 0, elephant: 0, lion: 0, gorilla: 0, kangaroo: 0, joey: 0, ape: 0, caveman: 0, bunny: 0, poacher: 0 };
  const animals = [];
  const drops = [];
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

  function playPoacherShot() {
    if (!ensureAudio() || muted) return;
    noiseBurst(0.05, 3600, 700, 0.32);
    tone(150, 0.09, 'sawtooth', 0.1, 46);
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

  function spanMesh(parent, name, material, radius, ax, ay, az, bx, by, bz) {
    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;
    const len = Math.hypot(dx, dy, dz) || 0.001;
    const mesh = new THREE.Mesh(
      geo(name, () => new THREE.CapsuleGeometry(radius, Math.max(0.04, len - radius * 2), 2, 6)),
      material
    );
    mesh.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len));
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

  function buildLion() {
    const root = new THREE.Group();
    const tilt = new THREE.Group();
    const bob = new THREE.Group();
    root.add(tilt);
    tilt.add(bob);
    const hide = lambert(0xd39a3c);
    const bellyMat = lambert(0xf4e0b0);
    const mane = lambert(0x8a3d12);
    const maneDark = lambert(0x4e240c);
    const face = lambert(0xe0b15a);
    const dark = lambert(0x1a100c);

    const body = addMesh(bob, geo('lionBody', () => new THREE.CapsuleGeometry(0.28, 1.08, 3, 7)), hide, 0, 0.78, 0.06);
    body.rotation.x = Math.PI / 2;
    const chest = addMesh(bob, geo('lionChest', () => new THREE.SphereGeometry(0.3, 7, 6)), hide, 0, 0.84, -0.5);
    chest.scale.set(1.18, 0.92, 0.95);
    const rump = addMesh(bob, geo('lionRump', () => new THREE.SphereGeometry(0.3, 7, 6)), hide, 0, 0.86, 0.55);
    rump.scale.set(1.05, 0.86, 1.02);
    const belly = addMesh(bob, geo('lionBelly', () => new THREE.SphereGeometry(0.2, 6, 5)), bellyMat, 0, 0.6, 0.06);
    belly.scale.set(0.85, 0.38, 1.45);

    const head = new THREE.Group();
    head.position.set(0, 1.02, -0.82);
    bob.add(head);
    const ruff = addMesh(head, geo('lionRuff', () => new THREE.SphereGeometry(0.36, 8, 6)), mane, 0, 0.02, 0.04);
    ruff.scale.set(1.45, 1.28, 0.78);
    const tuftGeo = geo('lionTuft', () => new THREE.ConeGeometry(0.1, 0.32, 5));
    [
      [-0.34, 0.08, 0.08, 0.15, 0, 1.35],
      [0.34, 0.08, 0.08, 0.15, 0, -1.35],
      [-0.2, 0.36, 0.02, -0.4, 0, 0.35],
      [0.2, 0.36, 0.02, -0.4, 0, -0.35],
      [0, 0.4, 0.0, -0.7, 0, 0],
      [-0.28, -0.16, 0.1, 0.9, 0, 2.1],
      [0.28, -0.16, 0.1, 0.9, 0, -2.1],
      [0, -0.28, 0.08, 2.4, 0, 0],
    ].forEach(([x, y, z, rx, ry, rz]) => {
      const tuft = addMesh(head, tuftGeo, maneDark, x, y, z);
      tuft.rotation.set(rx, ry, rz);
    });
    const skull = addMesh(head, geo('lionSkull', () => new THREE.SphereGeometry(0.16, 8, 6)), face, 0, 0.02, -0.16);
    skull.scale.set(1.02, 0.88, 1.12);
    const snout = addMesh(head, geo('lionSnout', () => new THREE.CapsuleGeometry(0.075, 0.14, 2, 5)), face, 0, -0.05, -0.32);
    snout.rotation.x = Math.PI / 2;
    addMesh(head, geo('lionNose', () => new THREE.SphereGeometry(0.048, 6, 5)), dark, 0, 0.0, -0.42);
    addMesh(head, geo('lionMouth', () => new THREE.BoxGeometry(0.09, 0.016, 0.04)), dark, 0, -0.07, -0.38);

    const ears = [];
    const earBase = [];
    [-1, 1].forEach((s) => {
      const ear = addMesh(head, geo('lionEar', () => new THREE.ConeGeometry(0.055, 0.13, 5)), hide, s * 0.2, 0.34, 0.02);
      ear.rotation.z = s * -0.28;
      ears.push(ear);
      earBase.push(ear.rotation.z);
      addMesh(head, geo('lionEye', () => new THREE.SphereGeometry(0.028, 6, 5)), dark, s * 0.08, 0.04, -0.28);
    });

    const legs = [];
    const legGeo = geo('lionLeg', () => new THREE.CapsuleGeometry(0.055, 0.4, 2, 5));
    [[-0.16, -0.42], [0.16, -0.42], [-0.16, 0.48], [0.16, 0.48]].forEach(([x, z]) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.62, z);
      const leg = new THREE.Mesh(legGeo, hide);
      leg.position.y = -0.26;
      pivot.add(leg);
      bob.add(pivot);
      legs.push(pivot);
    });

    const tail = new THREE.Group();
    tail.position.set(0, 0.92, 0.82);
    const tailMesh = addMesh(tail, geo('lionTail', () => new THREE.CapsuleGeometry(0.025, 0.72, 2, 4)), hide, 0, 0.02, 0.34);
    tailMesh.rotation.x = 1.2;
    addMesh(tail, geo('lionTailTuft', () => new THREE.SphereGeometry(0.08, 6, 5)), maneDark, 0, -0.28, 0.66);
    bob.add(tail);

    root.add(makeShadow(1.05));
    root.scale.setScalar(1.34);
    return { root, tilt, bob, head, legs, tail, ears, earBase };
  }

  function addHeldBaby(parent) {
    const fur = lambert(0x5c564c);
    const skin = lambert(0xa07858);
    const dark = lambert(0x161310);
    const body = addMesh(parent, geo('heldBody', () => new THREE.SphereGeometry(0.13, 7, 5)), fur, 0, 0.02, 0);
    body.scale.set(1.05, 0.92, 0.88);
    addMesh(parent, geo('heldHead', () => new THREE.SphereGeometry(0.095, 7, 5)), fur, 0, 0.16, -0.02);
    const face = addMesh(parent, geo('heldFace', () => new THREE.SphereGeometry(0.055, 6, 4)), skin, 0, 0.14, -0.07);
    face.scale.set(1.05, 0.9, 0.7);
    [-1, 1].forEach((s) => {
      addMesh(parent, geo('heldEye', () => new THREE.SphereGeometry(0.018, 5, 4)), dark, s * 0.035, 0.16, -0.1);
      const arm = addMesh(parent, geo('heldArm', () => new THREE.CapsuleGeometry(0.028, 0.09, 2, 4)), fur, s * 0.13, 0.04, 0);
      arm.rotation.z = s * 1.15;
      const leg = addMesh(parent, geo('heldLeg', () => new THREE.CapsuleGeometry(0.03, 0.09, 2, 4)), fur, s * 0.05, -0.12, 0.02);
      leg.rotation.x = 0.35;
    });
  }

  function buildGorilla(silver, carrying, baby) {
    const root = new THREE.Group();
    const tilt = new THREE.Group();
    const bob = new THREE.Group();
    root.add(tilt);
    tilt.add(bob);
    bob.rotation.x = carrying ? -0.04 : -0.18;
    const fur = lambert(baby ? 0x6a6258 : silver ? 0x3a3834 : 0x2c2b28);
    const limb = lambert(baby ? 0x3a342c : 0x1c1b19);
    const skin = lambert(baby ? 0xa07858 : 0x6d5344);
    const brow = lambert(0x121110);
    const silverMat = lambert(0xc2beb6);

    const body = addMesh(bob, geo('gorBody', () => new THREE.SphereGeometry(0.46, 8, 6)), fur, 0, 0.84, 0.04);
    body.scale.set(1.22, 0.84, 0.76);
    const chest = addMesh(bob, geo('gorChest', () => new THREE.SphereGeometry(0.28, 7, 5)), skin, 0, 0.78, -0.22);
    chest.scale.set(0.85, 0.62, 0.38);
    if (silver) {
      const saddle = addMesh(bob, geo('gorSilver', () => new THREE.SphereGeometry(0.32, 7, 5)), silverMat, 0, 1.02, 0.16);
      saddle.scale.set(0.92, 0.48, 0.42);
    }
    addMesh(bob, geo('gorShoulder', () => new THREE.SphereGeometry(0.16, 6, 5)), fur, -0.4, 1.02, -0.02);
    addMesh(bob, geo('gorShoulder', () => new THREE.SphereGeometry(0.16, 6, 5)), fur, 0.4, 1.02, -0.02);

    const head = new THREE.Group();
    head.position.set(0, 1.3, -0.16);
    bob.add(head);
    const skull = addMesh(head, geo('gorHead', () => new THREE.SphereGeometry(0.24, 8, 6)), fur, 0, 0.04, 0.02);
    skull.scale.set(1.08, 0.92, 0.96);
    const ridge = addMesh(head, geo('gorBrow', () => new THREE.BoxGeometry(0.32, 0.07, 0.1)), brow, 0, 0.08, -0.16);
    ridge.rotation.x = 0.25;
    const face = addMesh(head, geo('gorFace', () => new THREE.SphereGeometry(0.13, 7, 5)), skin, 0, -0.02, -0.12);
    face.scale.set(1.15, 0.9, 0.62);
    const nose = addMesh(head, geo('gorNose', () => new THREE.SphereGeometry(0.05, 5, 4)), limb, 0, -0.04, -0.22);
    nose.scale.set(1.45, 0.7, 0.65);
    addMesh(head, geo('gorMouth', () => new THREE.BoxGeometry(0.12, 0.02, 0.03)), brow, 0, -0.12, -0.2);
    const ears = [];
    const earBase = [];
    [-1, 1].forEach((s) => {
      const ear = addMesh(head, geo('gorEar', () => new THREE.SphereGeometry(0.055, 5, 4)), skin, s * 0.22, 0.04, 0.02);
      ear.scale.set(0.42, 0.72, 0.36);
      ears.push(ear);
      earBase.push(ear.rotation.z);
      addMesh(head, geo('gorEye', () => new THREE.SphereGeometry(0.028, 5, 4)), brow, s * 0.09, 0.02, -0.2);
    });

    const arms = [];
    [-1, 1].forEach((s) => {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.44, 1.08, 0.0);
      bob.add(pivot);
      const hx = carrying ? s * -0.18 : s * 0.1;
      const hy = carrying ? 0.58 : -0.98;
      const hz = carrying ? 0.02 : -0.28;
      const len = Math.hypot(hx, hy, hz);
      const arm = new THREE.Mesh(geo('gorArm', () => new THREE.CylinderGeometry(0.078, 0.068, 1, 6)), limb);
      arm.scale.set(carrying ? 1.45 : 1, len, carrying ? 1.45 : 1);
      arm.position.set(hx * 0.5, hy * 0.5, hz * 0.5);
      arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(hx / len, hy / len, hz / len));
      pivot.add(arm);
      const hand = addMesh(pivot, geo('gorHand', () => new THREE.SphereGeometry(0.09, 6, 4)), skin, hx, hy, hz);
      hand.scale.set(carrying ? 1.55 : 1.35, carrying ? 0.62 : 0.48, carrying ? 1.2 : 1.12);
      arms.push(pivot);
    });

    let cargo = null;
    if (carrying) {
      cargo = new THREE.Group();
      cargo.position.set(0, 1.7, 0.02);
      cargo.scale.setScalar(1.7);
      bob.add(cargo);
      addHeldBaby(cargo);
    }

    const legs = [];
    [[-0.18, 0.16], [0.18, 0.16]].forEach(([x, z]) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.52, z);
      bob.add(pivot);
      const leg = new THREE.Mesh(geo('gorLeg', () => new THREE.CylinderGeometry(0.09, 0.1, 0.42, 6)), limb);
      leg.position.y = -0.21;
      pivot.add(leg);
      const foot = addMesh(pivot, geo('gorFoot', () => new THREE.SphereGeometry(0.075, 5, 4)), skin, 0, -0.44, -0.05);
      foot.scale.set(0.9, 0.4, 1.4);
      legs.push(pivot);
    });

    root.add(makeShadow(baby ? 0.7 : 0.95));
    if (baby) root.scale.setScalar(0.52);
    else root.scale.setScalar(carrying ? 1.38 : silver ? 1.42 : 1.22);
    return { root, tilt, bob, head, legs, tail: null, ears, earBase, arms, cargo };
  }

  function buildKangaroo(baby) {
    const root = new THREE.Group();
    const tilt = new THREE.Group();
    const bob = new THREE.Group();
    root.add(tilt);
    tilt.add(bob);
    const fur = lambert(baby ? 0xd7a15e : 0xc4783a);
    const belly = lambert(0xf6e2c0);
    const dark = lambert(0x241810);
    const inner = lambert(0xefb090);
    const pouchMat = lambert(0xf0d2a4);

    const hip = addMesh(bob, geo('rooHip', () => new THREE.SphereGeometry(0.26, 8, 6)), fur, 0, 0.78, 0.1);
    hip.scale.set(1.08, 0.92, 1.12);
    const torso = addMesh(bob, geo('rooTorso', () => new THREE.CapsuleGeometry(0.18, 0.42, 3, 6)), fur, 0, 1.16, -0.04);
    torso.rotation.x = 0.22;
    const tum = addMesh(bob, geo('rooBelly', () => new THREE.SphereGeometry(0.15, 7, 5)), belly, 0, 0.96, -0.16);
    tum.scale.set(0.9, 1.05, 0.55);

    const head = new THREE.Group();
    head.position.set(0, 1.5, -0.18);
    bob.add(head);
    const skull = addMesh(head, geo('rooHead', () => new THREE.SphereGeometry(0.15, 8, 6)), fur, 0, 0.02, -0.02);
    skull.scale.set(0.92, 0.84, 1.08);
    const snout = addMesh(head, geo('rooSnout', () => new THREE.CapsuleGeometry(0.05, 0.1, 2, 5)), fur, 0, -0.03, -0.16);
    snout.rotation.x = Math.PI / 2;
    addMesh(head, geo('rooNose', () => new THREE.SphereGeometry(0.032, 6, 4)), dark, 0, -0.01, -0.24);
    addMesh(head, geo('rooMouth', () => new THREE.BoxGeometry(0.055, 0.012, 0.018)), dark, 0, -0.07, -0.2);

    const ears = [];
    const earBase = [];
    [-1, 1].forEach((s) => {
      const ear = new THREE.Group();
      ear.position.set(s * 0.07, 0.12, 0.02);
      ear.rotation.z = s * -0.16;
      const outer = addMesh(ear, geo('rooEar', () => new THREE.CapsuleGeometry(0.032, 0.2, 2, 5)), fur, 0, 0.15, 0);
      outer.scale.x = 0.55;
      addMesh(ear, geo('rooEarIn', () => new THREE.CapsuleGeometry(0.016, 0.12, 2, 4)), inner, 0, 0.15, -0.012);
      head.add(ear);
      ears.push(ear);
      earBase.push(ear.rotation.z);
      addMesh(head, geo('rooEye', () => new THREE.SphereGeometry(0.02, 6, 4)), dark, s * 0.065, 0.03, -0.12);
    });

    const arms = [];
    const legs = [];
    [-1, 1].forEach((s) => {
      spanMesh(bob, 'rooArm', fur, 0.032, s * 0.16, 1.08, -0.14, s * 0.2, 0.84, -0.22);
      spanMesh(bob, 'rooThigh', fur, 0.075, s * 0.12, 0.72, 0.14, s * 0.14, 0.12, 0.02);
      const foot = addMesh(bob, geo('rooFoot', () => new THREE.CapsuleGeometry(0.048, 0.36, 2, 5)), fur, s * 0.14, 0.07, -0.1);
      foot.rotation.x = Math.PI / 2;
    });

    const tail = new THREE.Group();
    tail.position.set(0, 0.62, 0.24);
    bob.add(tail);
    spanMesh(tail, 'rooTail', fur, 0.055, 0, 0.02, 0, 0, -0.5, 0.82);

    let cargo = null;
    if (!baby) {
      cargo = new THREE.Group();
      cargo.position.set(0, 0.9, -0.24);
      bob.add(cargo);
      const pouch = addMesh(cargo, geo('rooPouch', () => new THREE.SphereGeometry(0.11, 7, 5)), pouchMat, 0, 0, 0);
      pouch.scale.set(1.15, 0.8, 0.5);
      [-1, 1].forEach((s) => {
        const peek = addMesh(cargo, geo('rooPeek', () => new THREE.CapsuleGeometry(0.016, 0.07, 2, 4)), fur, s * 0.035, 0.09, 0.02);
        peek.rotation.z = s * -0.18;
      });
    }

    root.add(makeShadow(baby ? 0.55 : 0.95));
    root.scale.setScalar(baby ? 0.8 : 1.5);
    return { root, tilt, bob, head, legs, tail, ears, earBase, arms, cargo };
  }

  function buildBunny() {
    const built = buildRabbit();
    built.root.scale.multiplyScalar(0.56);
    return built;
  }

  function buildApe() {
    return buildGorilla(false, false, true);
  }

  function buildCaveman() {
    const root = new THREE.Group();
    const tilt = new THREE.Group();
    const bob = new THREE.Group();
    root.add(tilt);
    tilt.add(bob);
    const skin = lambert(0xe8b98a);
    const fur = lambert(0x6d4a30);
    const furDark = lambert(0x3f2b1c);
    const hair = lambert(0x2a1c14);
    const wood = lambert(0x9a6232);
    const woodDark = lambert(0x6a3e1c);
    const dark = lambert(0x1c140f);
    const tooth = lambert(0xf7f3ea);

    const legs = [];
    [-1, 1].forEach((s) => {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.1, 0.64, 0);
      bob.add(pivot);
      addMesh(pivot, geo('caveLeg', () => new THREE.CapsuleGeometry(0.055, 0.46, 2, 5)), skin, 0, -0.28, 0);
      const foot = addMesh(pivot, geo('caveFoot', () => new THREE.SphereGeometry(0.055, 5, 4)), skin, 0, -0.58, -0.04);
      foot.scale.set(0.85, 0.5, 1.45);
      legs.push(pivot);
    });

    const tunic = addMesh(bob, geo('caveTunic', () => new THREE.CapsuleGeometry(0.2, 0.26, 3, 6)), fur, 0, 0.96, 0.02);
    tunic.scale.set(1.18, 1, 0.86);
    const shag = geo('caveShag', () => new THREE.ConeGeometry(0.055, 0.13, 4));
    [[-0.16, 0.74, 0.1], [0, 0.72, 0.14], [0.16, 0.74, 0.08], [-0.1, 0.74, -0.08], [0.12, 0.74, -0.06]].forEach(([x, y, z]) => {
      const tuft = addMesh(bob, shag, furDark, x, y, z);
      tuft.rotation.x = Math.PI;
    });
    addMesh(bob, geo('caveShoulder', () => new THREE.SphereGeometry(0.1, 5, 4)), fur, -0.22, 1.16, 0);
    addMesh(bob, geo('caveShoulder', () => new THREE.SphereGeometry(0.1, 5, 4)), fur, 0.22, 1.16, 0);

    const head = new THREE.Group();
    head.position.set(0, 1.42, -0.02);
    bob.add(head);
    addMesh(head, geo('caveSkull', () => new THREE.SphereGeometry(0.17, 8, 6)), skin, 0, 0.05, 0);
    const hairCap = addMesh(head, geo('caveHair', () => new THREE.SphereGeometry(0.18, 7, 5)), hair, 0, 0.12, 0.02);
    hairCap.scale.set(1.02, 0.7, 1);
    const beard = addMesh(head, geo('caveBeard', () => new THREE.SphereGeometry(0.1, 6, 5)), furDark, 0, -0.08, -0.05);
    beard.scale.set(1.15, 0.9, 0.72);
    addMesh(head, geo('caveBrow', () => new THREE.BoxGeometry(0.18, 0.035, 0.04)), hair, 0, 0.1, -0.14);
    [-1, 1].forEach((s) => {
      addMesh(head, geo('caveEye', () => new THREE.SphereGeometry(0.022, 5, 4)), dark, s * 0.06, 0.05, -0.15);
    });
    addMesh(head, geo('caveNose', () => new THREE.SphereGeometry(0.028, 5, 4)), skin, 0, 0.01, -0.17);
    addMesh(head, geo('caveMouth', () => new THREE.BoxGeometry(0.07, 0.014, 0.02)), dark, 0, -0.05, -0.16);
    addMesh(head, geo('caveTooth', () => new THREE.BoxGeometry(0.016, 0.024, 0.012)), tooth, -0.012, -0.064, -0.168);
    addMesh(head, geo('caveTooth', () => new THREE.BoxGeometry(0.016, 0.024, 0.012)), tooth, 0.014, -0.064, -0.168);

    const arms = [];
    const free = new THREE.Group();
    free.position.set(-0.26, 1.16, 0);
    bob.add(free);
    addMesh(free, geo('caveArm', () => new THREE.CapsuleGeometry(0.042, 0.24, 2, 4)), skin, 0, -0.16, 0);
    arms.push(free);

    spanMesh(bob, 'caveHold', skin, 0.046, 0.22, 1.2, 0.02, 0.26, 0.98, 0.16);

    const club = new THREE.Group();
    club.position.set(0.26, 0.98, 0.16);
    bob.add(club);
    addMesh(club, geo('caveGrip', () => new THREE.SphereGeometry(0.055, 5, 4)), skin, 0, 0.02, 0);
    const knobX = -0.02;
    const knobY = -0.74;
    const knobZ = 0.72;
    spanMesh(club, 'caveHandle', wood, 0.05, 0, 0, 0, knobX, knobY, knobZ);
    const knob = addMesh(club, geo('caveKnob', () => new THREE.SphereGeometry(0.16, 7, 5)), woodDark, knobX, knobY, knobZ);
    knob.scale.set(1.35, 1.05, 1.3);
    addMesh(club, geo('caveKnot', () => new THREE.SphereGeometry(0.04, 4, 3)), wood, knobX + 0.08, knobY + 0.04, knobZ - 0.02);

    root.add(makeShadow(0.62));
    root.scale.setScalar(1.26);
    return { root, tilt, bob, head, legs, tail: null, ears: null, earBase: null, arms, club };
  }

  function buildAnimal(kind, opts) {
    const o = opts || {};
    if (kind === 'boar') return buildBoar();
    if (kind === 'rabbit') return buildRabbit();
    if (kind === 'bunny') return buildBunny();
    if (kind === 'blue') return buildBlueDeer();
    if (kind === 'piglet') return buildPiglet();
    if (kind === 'giraffe') return buildGiraffe();
    if (kind === 'elephant') return buildElephant();
    if (kind === 'lion') return buildLion();
    if (kind === 'gorilla') return buildGorilla(o.silver !== false, !!o.carrying, false);
    if (kind === 'ape') return buildApe();
    if (kind === 'kangaroo') return buildKangaroo(false);
    if (kind === 'joey') return buildKangaroo(true);
    if (kind === 'caveman') return buildCaveman();
    if (kind === 'poacher') return buildPoacher();
    return buildDeer(kind === 'buck');
  }

  function buildPoacher() {
    const root = new THREE.Group();
    const tilt = new THREE.Group();
    const bob = new THREE.Group();
    root.add(tilt);
    tilt.add(bob);
    const skin = lambert(0xd7a878);
    const khaki = lambert(0xc4a15a);
    const vest = lambert(0x3e4a30);
    const hat = lambert(0x2a2218);
    const boot = lambert(0x3a291c);
    const ivory = lambert(0xf4ecda);
    const wood = lambert(0x6b4428);
    const metal = lambert(0x2a2c30);
    const dark = lambert(0x1a140f);

    const legs = [];
    [-1, 1].forEach((s) => {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.09, 0.64, 0);
      bob.add(pivot);
      addMesh(pivot, geo('poachLeg', () => new THREE.CapsuleGeometry(0.05, 0.4, 2, 5)), khaki, 0, -0.22, 0);
      const shoe = addMesh(pivot, geo('poachBoot', () => new THREE.SphereGeometry(0.055, 5, 4)), boot, 0, -0.48, -0.03);
      shoe.scale.set(0.85, 0.48, 1.4);
      legs.push(pivot);
    });

    const torso = addMesh(bob, geo('poachBody', () => new THREE.CapsuleGeometry(0.16, 0.28, 3, 6)), khaki, 0, 0.98, 0.02);
    torso.scale.set(1.05, 1, 0.82);
    const jacket = addMesh(bob, geo('poachVest', () => new THREE.CapsuleGeometry(0.15, 0.2, 2, 5)), vest, 0, 1.02, -0.04);
    jacket.scale.set(0.95, 0.85, 0.55);
    addMesh(bob, geo('poachShoulder', () => new THREE.SphereGeometry(0.08, 5, 4)), khaki, -0.18, 1.18, 0);
    addMesh(bob, geo('poachShoulder', () => new THREE.SphereGeometry(0.08, 5, 4)), khaki, 0.18, 1.18, 0);

    const head = new THREE.Group();
    head.position.set(0, 1.42, -0.02);
    bob.add(head);
    addMesh(head, geo('poachSkull', () => new THREE.SphereGeometry(0.13, 7, 6)), skin, 0, 0.02, 0);
    const brim = addMesh(head, geo('poachBrim', () => new THREE.CylinderGeometry(0.2, 0.2, 0.025, 8)), hat, 0, 0.12, 0);
    brim.scale.z = 1.15;
    addMesh(head, geo('poachCrown', () => new THREE.CylinderGeometry(0.09, 0.11, 0.12, 6)), hat, 0, 0.18, 0);
    addMesh(head, geo('poachBrow', () => new THREE.BoxGeometry(0.12, 0.025, 0.03)), hat, 0, 0.06, -0.1);
    [-1, 1].forEach((s) => {
      addMesh(head, geo('poachEye', () => new THREE.SphereGeometry(0.016, 5, 4)), dark, s * 0.045, 0.03, -0.11);
    });
    addMesh(head, geo('poachStash', () => new THREE.BoxGeometry(0.07, 0.018, 0.02)), dark, 0, -0.02, -0.12);

    const arms = [];
    const free = new THREE.Group();
    free.position.set(0.2, 1.16, 0.02);
    bob.add(free);
    addMesh(free, geo('poachArm', () => new THREE.CapsuleGeometry(0.04, 0.22, 2, 4)), khaki, 0, -0.14, 0);
    arms.push(free);

    const tusk = new THREE.Group();
    tusk.position.set(0.12, 1.22, 0.02);
    bob.add(tusk);
    const curve = addMesh(tusk, geo('poachTusk', () => new THREE.TorusGeometry(0.42, 0.055, 5, 12, 1.55)), ivory, 0.02, 0.08, 0.02);
    curve.rotation.set(0.35, -0.4, 1.05);

    const rifle = new THREE.Group();
    rifle.position.set(-0.16, 1.12, -0.02);
    rifle.rotation.x = -0.35;
    bob.add(rifle);
    const barrel = addMesh(rifle, geo('poachBarrel', () => new THREE.CylinderGeometry(0.022, 0.028, 0.78, 5)), metal, 0, 0.02, -0.22);
    barrel.rotation.x = Math.PI / 2;
    addMesh(rifle, geo('poachStock', () => new THREE.BoxGeometry(0.045, 0.07, 0.26)), wood, 0, -0.02, 0.16);
    const muzzle = addMesh(rifle, geo('poachFlash', () => new THREE.SphereGeometry(0.055, 6, 4)), glow(0xfff1b0, 0xffe08a, 1.6), 0, 0.02, -0.62);
    muzzle.visible = false;

    root.add(makeShadow(0.55));
    root.scale.setScalar(1.24);
    return { root, tilt, bob, head, legs, tail: null, ears: null, earBase: null, arms, tusk, rifle, muzzle };
  }

  function inPond(x, z) {
    return Math.hypot(x + 16, z + 24) < 7;
  }

  function clampMeadow(point) {
    let x = point.x;
    let z = point.z;
    if (z > -10) z = -11 - Math.random() * 6;
    if (z < -82) z = -70 - Math.random() * 8;
    if (x > 50) x = 38 + Math.random() * 8;
    if (x < -50) x = -38 - Math.random() * 8;
    if (inPond(x, z)) x += x > -16 ? 12 : -12;
    return { x, z };
  }

  function lookFlat() {
    return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
  }

  // A point in front of wherever the rifle is aimed, so new targets enter the view.
  function viewPoint(dist, side) {
    const look = lookFlat();
    const rx = -look.z;
    const rz = look.x;
    return clampMeadow({
      x: CAM.x + look.x * dist + rx * side,
      z: CAM.z + look.z * dist + rz * side,
    });
  }

  function viewCross(depthMin, depthMax, half) {
    const dist = depthMin + Math.random() * (depthMax - depthMin);
    const span = half + Math.random() * 4;
    const left = Math.random() < 0.5;
    const start = viewPoint(dist, left ? -span : span);
    const end = viewPoint(dist + (Math.random() - 0.5) * 5, left ? span * 0.9 : -span * 0.9);
    const mid = viewPoint(dist + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * span * 0.25);
    return { start, mid, end };
  }

  function wideCross(kind) {
    const gorilla = kind === 'gorilla';
    const herd = gorilla || kind === 'giraffe' || kind === 'elephant';
    const left = Math.random() < 0.5;
    const reach = kind === 'caveman' || kind === 'poacher' ? 34 : gorilla ? 30 : herd ? 56 : 46;
    const near = gorilla || kind === 'lion' || kind === 'kangaroo' || kind === 'caveman' || kind === 'poacher';
    const z0 = (near ? -18 : -34) - Math.random() * (near ? 26 : 28);
    const startX = left ? -reach - Math.random() * 8 : reach + Math.random() * 8;
    const endX = -startX;
    return {
      start: { x: startX, z: z0 },
      mid: { x: (Math.random() - 0.5) * 10, z: z0 + (Math.random() - 0.5) * 6 },
      end: { x: endX, z: z0 + (Math.random() - 0.5) * 8 },
    };
  }

  function randomMeadowPoint() {
    if (Math.random() < 0.4) return viewPoint(14 + Math.random() * 26, (Math.random() - 0.5) * 24);
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
    if (Math.random() < 0.4) {
      return viewPoint(15 + Math.random() * 22, (Math.random() - 0.5) * 26);
    }
    const side = Math.floor(Math.random() * 4);
    if (side === 0) return { x: -62 - Math.random() * 10, z: -16 - Math.random() * 70 };
    if (side === 1) return { x: 62 + Math.random() * 10, z: -16 - Math.random() * 70 };
    if (side === 2) return { x: -40 + Math.random() * 80, z: -96 - Math.random() * 10 };
    return { x: -28 + Math.random() * 56, z: -12 - Math.random() * 4 };
  }

  function placeAnimal(kind, opts) {
    const built = buildAnimal(kind, opts);
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
      carrying: !!opts.carrying,
      hopHeight: kind === 'kangaroo' ? 1.28 : kind === 'joey' ? 0.5 : 0,
      hopCycle: kind === 'kangaroo' ? 0.68 : kind === 'joey' ? 0.36 : 0,
      hopClock: Math.random(),
      hopLift: 0,
      hopTuck: 0,
      vy: 0,
      dropSlide: null,
      shadow: null,
      leg: opts.leg || 0,
      muzzleLife: 0,
      shotsLeft: 0,
    };
    animal.root.position.set(opts.x, 0, opts.z);
    if (opts.broadside) faceDirection(animal.root, opts.x + 5, opts.z);
    else faceDirection(animal.root, animal.target.x, animal.target.z);
    scene.add(animal.root);
    animals.push(animal);
    return animal;
  }

  function clearDrops() {
    for (const drop of drops) scene.remove(drop.mesh);
    drops.length = 0;
  }

  function clearAnimals() {
    for (const animal of animals) scene.remove(animal.root);
    animals.length = 0;
    clearDrops();
  }

  function removeAnimal(animal) {
    const index = animals.indexOf(animal);
    if (index < 0) return;
    animals.splice(index, 1);
    scene.remove(animal.root);
  }

  function spawnOpening() {
    clearAnimals();
    placeAnimal('buck', { x: 6, z: -22, state: 'graze', broadside: true, timer: 7 });
    placeAnimal('doe', { x: -14, z: -40, state: 'walk', target: { x: 2, z: -48 } });
    placeAnimal('boar', { x: 20, z: -52, state: 'graze', broadside: true, timer: 6 });
    placeAnimal('rabbit', { x: -2.2, z: -16, state: 'walk', target: { x: 6, z: -20 } });
    placeAnimal('doe', { x: -6, z: -64, state: 'graze', broadside: true, timer: 8 });
    placeAnimal('buck', { x: 12, z: -32, state: 'walk', target: { x: -2, z: -42 } });
    placeAnimal('rabbit', { x: 8, z: -26, state: 'walk', target: { x: -4, z: -34 } });
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
    if (Math.random() < 0.095 && countKind('blue') === 0) return 'blue';
    if (Math.random() < 0.14 && countKind('piglet') === 0) return 'piglet';
    if (Math.random() < 0.115 && countKind('giraffe') === 0 && open >= 1) return 'giraffe';
    if (Math.random() < 0.09 && countKind('elephant') === 0 && open >= 1) return 'elephant';
    if (Math.random() < 0.105 && countKind('lion') === 0) return 'lion';
    if (Math.random() < 0.078 && countKind('kangaroo') === 0) return 'kangaroo';
    if (Math.random() < 0.06 && countKind('caveman') === 0) return 'caveman';
    if (phase === 'playing' && Math.random() < 0.07 && countKind('poacher') === 0) return 'poacher';
    if (Math.random() < 0.135 && countKind('gorilla') === 0 && open >= 1) return 'gorilla';
    const roll = Math.random();
    if (roll < 0.22) return 'buck';
    if (roll < 0.52) return 'doe';
    if (roll < 0.74) return 'boar';
    return 'rabbit';
  }

  function herdSize(kind, open) {
    let want;
    if (kind === 'giraffe') want = Math.random() < 0.38 ? 1 : 3 + Math.floor(Math.random() * 3);
    else if (kind === 'gorilla') {
      const roll = Math.random();
      want = roll < 0.34 ? 1 : 2 + Math.floor(Math.random() * 3);
    } else {
      const roll = Math.random();
      want = roll < 0.2 ? 1 : roll < 0.6 ? 2 : 3;
    }
    return Math.max(0, Math.min(want, open));
  }

  function countCarrying() {
    let n = 0;
    for (const animal of animals) {
      if (animal.carrying && animal.state !== 'dead') n += 1;
    }
    return n;
  }

  function spawnHerd(kind, forcedCount) {
    const count = forcedCount ? Math.min(forcedCount, slotsOpen()) : herdSize(kind, slotsOpen());
    if (count < 1) return 0;
    const gorilla = kind === 'gorilla';
    const leadCarries = gorilla && !forcedCount && countCarrying() === 0 && Math.random() < 0.55;
    const cross = Math.random() < 0.5
      ? viewCross(gorilla ? 18 : 28, gorilla ? 34 : 46, gorilla ? 14 : 16)
      : wideCross(kind);
    const dx = cross.end.x - cross.start.x;
    const dz = cross.end.z - cross.start.z;
    const span = Math.hypot(dx, dz) || 1;
    const fx = dx / span;
    const fz = dz / span;
    const rx = -fz;
    const rz = fx;
    const spacing = kind === 'elephant' ? 4.2 : gorilla ? 2.5 : 3.1;
    const aside = kind === 'elephant' ? 2.6 : gorilla ? 1.9 : 2.05;
    for (let i = 0; i < count; i++) {
      const back = -i * spacing * 0.55;
      const side = (i % 2 === 0 ? -1 : 1) * aside * (i === 0 ? 0.15 : 1);
      const x = cross.start.x + fx * back + rx * side;
      const z = cross.start.z + fz * back + rz * side;
      const spot = clampMeadow({ x, z });
      placeAnimal(kind, {
        x: spot.x,
        z: spot.z,
        state: 'walk',
        herd: true,
        silver: gorilla && i === 0,
        carrying: leadCarries && i === 0,
        target: clampMeadow({
          x: cross.mid.x + fx * back * 0.15 + rx * side,
          z: cross.mid.z + fz * back * 0.15 + rz * side,
        }),
        path: [clampMeadow({
          x: cross.end.x + rx * side * 0.4,
          z: cross.end.z + rz * side * 0.4,
        })],
      });
    }
    return count;
  }

  function spawnDasher(kind) {
    if (kind === 'piglet') {
      const spot = Math.random() < 0.5
        ? viewPoint(14 + Math.random() * 16, (Math.random() - 0.5) * 14)
        : { x: -18 + Math.random() * 36, z: -18 - Math.random() * 44 };
      let x = spot.x;
      let z = spot.z;
      const hops = [];
      const count = 3 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = 5 + Math.random() * 3.5;
        x += Math.cos(ang) * dist;
        z += Math.sin(ang) * dist;
        const hop = clampMeadow({ x, z });
        x = hop.x;
        z = hop.z;
        hops.push(hop);
      }
      const first = hops.shift();
      placeAnimal('piglet', { x: spot.x, z: spot.z, state: 'dash', target: first, path: hops });
      return;
    }
    const poacher = kind === 'poacher';
    const near = kind === 'lion' || kind === 'kangaroo' || kind === 'caveman' || poacher;
    const depthMin = kind === 'blue' ? 22 : poacher ? 16 : near ? 18 : 22;
    const depthMax = kind === 'blue' ? 42 : poacher ? 28 : near ? 34 : 40;
    const half = kind === 'blue' ? 22 : poacher ? 13 : 16;
    const cross = Math.random() < 0.5 ? viewCross(depthMin, depthMax, half) : wideCross(kind);
    const leg = Math.hypot(cross.mid.x - cross.start.x, cross.mid.z - cross.start.z);
    placeAnimal(kind, {
      x: cross.start.x,
      z: cross.start.z,
      state: 'dash',
      target: cross.mid,
      path: [cross.end],
      leg: Math.max(8, leg),
    });
    if (poacher && phase === 'playing') toast('POACHER!', false);
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

  function arcHopper(animal) {
    return animal.kind === 'kangaroo' || animal.kind === 'joey';
  }

  // Horizontal travel stays steady. Lift is a sine arch, so the body traces a hop.
  function stepHop(animal, dt, speed, height, cycle) {
    animal.hopClock = (animal.hopClock || 0) + dt;
    const span = cycle > 0.05 ? cycle : 0.5;
    const arch = Math.sin(((animal.hopClock % span) / span) * Math.PI);
    const scale = animal.root.scale.y || 1;
    animal.hopLift = (arch * height) / scale;
    animal.hopTuck = arch;
    return moveToward(animal, dt, speed);
  }

  function pinShadow(animal) {
    if (!animal.shadow) {
      const kids = animal.root.children;
      for (let i = 0; i < kids.length; i++) {
        const child = kids[i];
        if (child.geometry && child.geometry.type === 'CircleGeometry') {
          animal.shadow = child;
          break;
        }
      }
    }
    if (animal.shadow) animal.shadow.position.y = 0.035 - animal.root.position.y;
  }

  function awayPoint(pos, dist) {
    let dx = pos.x - CAM.x;
    let dz = pos.z - CAM.z;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    const side = (Math.random() - 0.5) * dist * 0.45;
    let x = pos.x + dx * dist - dz * side;
    let z = pos.z + dz * dist + dx * side;
    if (z > -9) z = -9 - Math.random() * 8;
    return { x, z };
  }

  function updateDrop(animal, dt) {
    animal.vy = (animal.vy || 0) - 17 * dt;
    animal.root.position.y += animal.vy * dt;
    if (animal.dropSlide) {
      animal.root.position.x += animal.dropSlide.x * dt;
      animal.root.position.z += animal.dropSlide.z * dt;
    }
    animal.hopLift = 0;
    animal.hopTuck = Math.min(1, Math.abs(animal.vy) / 5);
    pinShadow(animal);
    if (animal.root.position.y <= 0) {
      animal.root.position.y = 0;
      animal.vy = 0;
      animal.dropSlide = null;
      pinShadow(animal);
      animal.state = 'flee';
      if (!animal.target) animal.target = awayPoint(animal.root.position, 16);
      spawnPuff(animal.root.position.x, 0.12, animal.root.position.z, 0xe7d7b4, 6);
    }
  }

  function releaseJoey(parent) {
    if (parent.cargo) parent.cargo.visible = false;
    parent.root.updateWorldMatrix(true, true);
    const pos = parent.root.position;
    const spot = parent.cargo ? parent.cargo.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(pos.x, 0.9, pos.z);
    const target = awayPoint(pos, 16);
    const baby = placeAnimal('joey', { x: spot.x, z: spot.z, state: 'drop', target: target });
    baby.root.position.y = Math.max(0.7, spot.y);
    baby.vy = 3.6;
    const dx = target.x - pos.x;
    const dz = target.z - pos.z;
    const len = Math.hypot(dx, dz) || 1;
    baby.dropSlide = { x: (dx / len) * 1.8, z: (dz / len) * 1.8 };
    baby.hopClock = 0;
    spawnPuff(spot.x, spot.y, spot.z, 0xfff3c8, 8);
    chirp();
  }

  function releaseApe(parent) {
    if (parent.cargo) parent.cargo.visible = false;
    parent.root.updateWorldMatrix(true, true);
    const pos = parent.root.position;
    const spot = parent.cargo ? parent.cargo.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(pos.x, 2.3, pos.z);
    const target = awayPoint(pos, 14);
    const baby = placeAnimal('ape', { x: spot.x, z: spot.z, state: 'drop', target: target });
    baby.root.position.y = Math.max(1.15, spot.y);
    baby.vy = 0.35;
    const dx = target.x - spot.x;
    const dz = target.z - spot.z;
    const len = Math.hypot(dx, dz) || 1;
    baby.dropSlide = { x: (dx / len) * 0.9, z: (dz / len) * 0.9 };
    spawnPuff(spot.x, spot.y, spot.z, 0xfff3c8, 7);
    chirp();
  }

  function releaseBunnies(parent) {
    const n = 2 + Math.floor(Math.random() * 3);
    const pos = parent.root.position;
    const base = Math.random() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const ang = base + (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
      let tz = pos.z + Math.sin(ang) * (11 + Math.random() * 5);
      if (tz > -9) tz = -9 - Math.random() * 7;
      const baby = placeAnimal('bunny', {
        x: pos.x + Math.cos(ang) * 0.3,
        z: pos.z + Math.sin(ang) * 0.3,
        state: 'flee',
        target: { x: pos.x + Math.cos(ang) * (13 + Math.random() * 5), z: tz },
      });
      baby.phase = ang;
    }
    spawnPuff(pos.x, 0.32, pos.z, 0xfff6ea, 10);
    chirp();
  }

  function animateAnimal(animal, dt) {
    const moving = animal.state === 'walk' || animal.state === 'flee' || animal.state === 'dash' || animal.state === 'drop';
    const arc = arcHopper(animal);
    const ape = animal.kind === 'ape';
    const gorillaLike = animal.kind === 'gorilla' || ape;
    let freq = animal.state === 'dash' ? 16 : animal.state === 'flee' ? 13 : animal.state === 'walk' ? 6.5 : 1.6;
    let amp = animal.state === 'dash' ? 0.95 : animal.state === 'flee' ? 0.8 : animal.state === 'walk' ? 0.4 : 0.05;
    if (animal.kind === 'elephant' && animal.state === 'walk') {
      freq = 2.1;
      amp = 0.18;
    } else if (animal.kind === 'giraffe' && animal.state === 'walk') {
      freq = 2.6;
      amp = 0.28;
    } else if (gorillaLike) {
      freq = ape ? (moving ? 8.5 : 2) : (moving ? 2.3 : 1.2);
      amp = ape ? (moving ? 0.62 : 0.05) : (moving ? 0.28 : 0.04);
    } else if (animal.kind === 'lion' && animal.state === 'dash') {
      freq = 11;
      amp = 0.72;
    } else if (animal.kind === 'caveman' || animal.kind === 'poacher') {
      freq = moving ? 5.2 : 1.4;
      amp = moving ? 0.46 : 0.04;
    } else if (arc) {
      freq = 2.2;
      amp = 0.15;
    }
    if (animal.kind === 'piglet' && animal.state === 'dash') freq = 9;
    animal.phase += dt * freq;
    const swing = Math.sin(animal.phase) * amp;
    if (gorillaLike && !(animal.kind === 'gorilla' && animal.carrying)) {
      if (animal.arms && animal.arms.length >= 2) {
        animal.arms[0].rotation.x = -swing;
        animal.arms[1].rotation.x = swing;
      }
      if (animal.legs.length >= 2) {
        animal.legs[0].rotation.x = swing * 0.7;
        animal.legs[1].rotation.x = -swing * 0.7;
      }
    } else if (animal.kind === 'gorilla' && animal.carrying) {
      if (animal.legs.length >= 2) {
        animal.legs[0].rotation.x = swing * 0.9;
        animal.legs[1].rotation.x = -swing * 0.9;
      }
      if (animal.cargo) animal.cargo.position.y = 1.7 + Math.abs(Math.sin(animal.phase)) * 0.03;
    } else if (animal.kind === 'caveman' && animal.legs.length >= 2) {
      animal.legs[0].rotation.x = swing;
      animal.legs[1].rotation.x = -swing;
      if (animal.arms && animal.arms[0]) animal.arms[0].rotation.x = -swing * 0.75;
      if (animal.club) {
        const bump = Math.abs(Math.sin(animal.phase));
        animal.club.rotation.x = bump * 0.08;
        animal.club.rotation.z = Math.sin(animal.phase * 0.5) * 0.04;
      }
    } else if (animal.kind === 'poacher' && animal.legs.length >= 2) {
      animal.legs[0].rotation.x = swing;
      animal.legs[1].rotation.x = -swing;
      if (animal.arms && animal.arms[0]) animal.arms[0].rotation.x = -swing * 0.6;
      if (animal.rifle) {
        const aim = animal.state === 'firing' ? 0.62 : -0.42;
        animal.rifle.rotation.x = damp(animal.rifle.rotation.x, aim, 9, dt);
      }
      if (animal.muzzle) {
        const flash = Math.max(0, animal.muzzleLife || 0);
        animal.muzzle.visible = flash > 0;
        animal.muzzle.scale.setScalar(0.7 + flash * 7);
      }
    } else if (arc) {
      if (animal.tail) animal.tail.rotation.x = (animal.hopTuck || 0) * 0.22;
    } else if (animal.legs.length >= 4) {
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
      else if (gorillaLike) headTarget = 0.08;
      else if (animal.kind === 'lion') headTarget = 0.02;
      else if (animal.kind === 'caveman') headTarget = 0.12;
      else if (arc) headTarget = 0.02;
      else headTarget = -0.95;
    } else if (animal.state === 'alert') headTarget = gorillaLike ? 0.24 : animal.kind === 'caveman' ? 0.16 : 0.42;
    else if (gorillaLike) headTarget = 0.12;
    else if (animal.kind === 'lion') headTarget = 0.06;
    else if (animal.kind === 'giraffe' || animal.kind === 'elephant') headTarget = 0.02;
    else if (arc) headTarget = 0.04;
    else if (animal.kind === 'caveman' || animal.kind === 'poacher') headTarget = animal.state === 'firing' ? 0.02 : moving ? 0.06 : 0.1;
    else if (animal.state === 'flee' || animal.state === 'dash') headTarget = 0.18;
    animal.head.rotation.x = damp(animal.head.rotation.x, headTarget, 6, dt);
    if (animal.trunk) animal.trunk.rotation.x = -0.2 + Math.sin(time * 1.3 + animal.phase) * 0.14;
    if (animal.kind === 'lion' && animal.tail) {
      animal.tail.rotation.y = Math.sin(time * 3.2 + animal.phase) * 0.45;
      animal.tail.rotation.x = -0.1 + Math.sin(time * 7 + animal.phase) * 0.05;
    } else if (animal.tail && !arc && animal.kind !== 'boar' && animal.kind !== 'piglet' && animal.kind !== 'elephant' && animal.kind !== 'giraffe') {
      const tailTarget = animal.state === 'flee' || animal.state === 'dash' ? -1.05 : -0.2;
      animal.tail.rotation.x = damp(animal.tail.rotation.x, tailTarget, 8, dt);
    }
    if (arc) {
      animal.bob.position.y = animal.hopLift || 0;
      animal.bob.rotation.x = -0.08 - (animal.hopTuck || 0) * 0.16;
    } else if ((animal.kind === 'rabbit' || animal.kind === 'bunny' || animal.kind === 'piglet') && moving) {
      const hop = animal.kind === 'piglet' ? 0.16 : animal.kind === 'bunny' ? 0.22 : 0.11;
      const lift = animal.state === 'dash' ? hop * 1.45 : animal.state === 'flee' ? hop * 1.3 : hop;
      animal.bob.position.y = Math.abs(Math.sin(animal.phase)) * lift;
    } else if (animal.kind === 'lion' && animal.state === 'dash') {
      animal.bob.position.y = Math.abs(Math.sin(animal.phase)) * 0.05;
    } else if ((animal.kind === 'gorilla' || ape) && moving) {
      animal.bob.position.y = Math.abs(Math.sin(animal.phase)) * (ape ? 0.05 : 0.03);
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

  function poacherBearing(animal) {
    const dx = animal.root.position.x - CAM.x;
    const dz = animal.root.position.z - CAM.z;
    let diff = Math.atan2(-dx, -dz) - yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (diff < -0.38) return 'Look right';
    if (diff > 0.38) return 'Look left';
    return 'Ahead';
  }

  function poacherProgress(animal) {
    if (animal.state === 'firing') return 1;
    const leg = animal.leg || 1;
    const dx = animal.target.x - animal.root.position.x;
    const dz = animal.target.z - animal.root.position.z;
    return Math.max(0, Math.min(1, 1 - Math.hypot(dx, dz) / leg));
  }

  function updatePoacherBanner() {
    if (!poacherEl) return;
    let man = null;
    for (const animal of animals) {
      if (animal.kind === 'poacher' && animal.state !== 'dead') {
        man = animal;
        break;
      }
    }
    if (!man || phase !== 'playing') {
      poacherEl.hidden = true;
      poacherEl.classList.remove('hot');
      return;
    }
    poacherEl.hidden = false;
    const firing = man.state === 'firing';
    poacherEl.classList.toggle('hot', firing);
    if (poacherNote) poacherNote.textContent = firing ? 'Shooting · -150 a shot' : poacherBearing(man) + ' · stop him';
    if (poacherFill) poacherFill.style.width = Math.round(poacherProgress(man) * 100) + '%';
  }

  function dropTusk(animal) {
    if (!animal.tusk) return;
    animal.root.updateWorldMatrix(true, true);
    const spot = new THREE.Vector3();
    animal.tusk.getWorldPosition(spot);
    animal.tusk.visible = false;
    const prop = new THREE.Group();
    const ivory = lambert(0xf4ecda);
    const curve = addMesh(prop, geo('poachTusk', () => new THREE.TorusGeometry(0.42, 0.055, 5, 12, 1.55)), ivory, 0, 0, 0);
    curve.rotation.set(0.4, 0.2, 0.8);
    prop.position.copy(spot);
    scene.add(prop);
    drops.push({ mesh: prop, vy: 1.4, life: 0 });
  }

  function updateDrops(dt) {
    for (let i = drops.length - 1; i >= 0; i--) {
      const drop = drops[i];
      drop.vy -= 14 * dt;
      drop.mesh.position.y += drop.vy * dt;
      drop.mesh.rotation.z += dt * 1.4;
      if (drop.mesh.position.y < 0.15) {
        drop.mesh.position.y = 0.15;
        drop.vy *= -0.25;
        if (Math.abs(drop.vy) < 0.4) drop.vy = 0;
      }
      drop.life += dt;
      if (drop.life > 7) {
        scene.remove(drop.mesh);
        drops.splice(i, 1);
      }
    }
  }

  function poacherShot(animal) {
    if (phase !== 'playing' || animal.state === 'dead') return;
    animal.muzzleLife = 0.14;
    if (animal.muzzle) {
      animal.muzzle.visible = true;
      const spot = new THREE.Vector3();
      animal.root.updateWorldMatrix(true, true);
      animal.muzzle.getWorldPosition(spot);
      spawnPuff(spot.x, spot.y, spot.z, 0xffe08a, 12);
    }
    if (bangEl) {
      bangEl.classList.remove('on', 'hostile');
      void bangEl.offsetWidth;
      bangEl.classList.add('on', 'hostile');
    }
    score = Math.max(0, score - 150);
    toast('POACHER -150', false);
    playPoacherShot();
    try { if (navigator.vibrate) navigator.vibrate(40); } catch (err) { /* ignore */ }
    updateHUD();
  }

  function startPoacherFire(animal) {
    animal.state = 'firing';
    animal.timer = 0.4;
    animal.shotsLeft = 3;
    faceDirection(animal.root, CAM.x, CAM.z);
    toast("HE'S SHOOTING!", false);
    updatePoacherBanner();
  }

  function updateAnimal(animal, dt) {
    if (animal.state === 'dead') {
      updateDead(animal, dt);
      return;
    }
    if (animal.state === 'drop') {
      updateDrop(animal, dt);
      if (animals.indexOf(animal) >= 0) animateAnimal(animal, dt);
      return;
    }
    if (animal.state === 'firing') {
      faceDirection(animal.root, CAM.x, CAM.z);
      if (animal.muzzleLife > 0) animal.muzzleLife -= dt;
      if (phase === 'playing') {
        animal.timer -= dt;
        if (animal.timer <= 0) {
          poacherShot(animal);
          animal.shotsLeft -= 1;
          animal.timer = 0.85;
          if (animal.shotsLeft <= 0) {
            animal.state = 'flee';
            setFleeTarget(animal);
            updatePoacherBanner();
            animateAnimal(animal, dt);
            return;
          }
        }
      }
      if (animals.indexOf(animal) >= 0) animateAnimal(animal, dt);
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
      const arrived = arcHopper(animal)
        ? stepHop(animal, dt, animal.dash, animal.hopHeight, animal.hopCycle)
        : moveToward(animal, dt, animal.dash);
      if (arrived) {
        if (animal.kind === 'poacher') {
          startPoacherFire(animal);
        } else if (animal.kind === 'piglet') {
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
      const arrived = arcHopper(animal)
        ? stepHop(animal, dt, speed, animal.hopHeight, animal.hopCycle)
        : moveToward(animal, dt, speed);
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
            animal.timer = animal.kind === 'elephant' ? 2.4 + Math.random() * 2.2 : animal.kind === 'gorilla' ? 0.7 + Math.random() * 0.7 : 1.7 + Math.random() * 1.8;
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
      spawnCooldown = 0.85;
      return;
    }
    spawnCooldown -= dt;
    if (spawnCooldown <= 0) {
      const kind = pickKind();
      if (kind === 'blue' || kind === 'piglet' || kind === 'lion' || kind === 'kangaroo' || kind === 'caveman' || kind === 'poacher') spawnDasher(kind);
      else if (kind === 'giraffe' || kind === 'elephant' || kind === 'gorilla') spawnHerd(kind);
      else {
        const spot = sampleEdge();
        placeAnimal(kind, { x: spot.x, z: spot.z, state: 'walk', target: randomMeadowPoint() });
      }
      spawnCooldown = 2.15 + Math.random() * 1.3;
    }
  }

  function killAnimal(animal) {
    if (animal.state === 'dead') return;
    if (animal.kind === 'kangaroo') releaseJoey(animal);
    else if (animal.kind === 'gorilla' && animal.carrying) releaseApe(animal);
    else if (animal.kind === 'rabbit') releaseBunnies(animal);
    else if (animal.kind === 'poacher') dropTusk(animal);
    animal.state = 'dead';
    animal.deadFor = 0;
    animal.fallSide = Math.random() < 0.5 ? -1 : 1;
    if (animal.root.position.y > 0.02) {
      animal.root.position.y = 0;
      pinShadow(animal);
    }
    harvest[animal.kind] += 1;
    score += animal.points;
    hits += 1;
    const height = animal.kind === 'rabbit' || animal.kind === 'piglet' || animal.kind === 'bunny' || animal.kind === 'joey'
      ? 0.35
      : animal.kind === 'ape' ? 0.5
      : animal.kind === 'giraffe' ? 2.4
      : animal.kind === 'elephant' ? 1.55
      : animal.kind === 'lion' ? 0.95
      : animal.kind === 'gorilla' ? 1.15
      : animal.kind === 'kangaroo' ? 1.45
      : animal.kind === 'caveman' ? 1.25
      : animal.kind === 'poacher' ? 1.3
      : 1.1;
    spawnPuff(animal.root.position.x, height, animal.root.position.z, 0xfff3c8, 14);
    playThud();
    toast(NAMES[animal.kind] + ' · HIT +' + animal.points, true);
    if (animal.kind === 'poacher') updatePoacherBanner();
  }

  function spook(impact) {
    for (const animal of animals) {
      if (animal.state === 'dead' || animal.state === 'flee' || animal.state === 'dash' || animal.state === 'drop' || animal.state === 'firing') continue;
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
      const pad = animal.kind === 'bunny' || animal.kind === 'joey' || animal.kind === 'ape'
        ? 0.34
        : animal.kind === 'rabbit' || animal.kind === 'piglet' ? 0.18 : animal.kind === 'blue' ? 0.06 : 0.12;
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

  function releaseFire() {
    firePointers.clear();
    touchHold = false;
    triggerHeld = false;
    spaceHeld = false;
    shotQueued = false;
    dryLatched = false;
  }

  function syncTrigger() {
    triggerHeld = firePointers.size > 0 || touchHold;
    if (!triggerHeld && !spaceHeld) dryLatched = false;
  }

  // fromRepeat is the hold loop. A fresh tap during the cycle queues one
  // follow-up so a fast finger still gets the next shot. Pointer and touch
  // both arrive for one tap; the short gap drops that duplicate only.
  function onFire(fromRepeat) {
    if (phase !== 'playing' || hintBlocking()) return;
    if (!fromRepeat) {
      const now = performance.now();
      if (now - lastTriggerAt < 48) return;
      lastTriggerAt = now;
    }
    if (reloading || bolt > 0) {
      if (!fromRepeat) shotQueued = true;
      return;
    }
    if (ammo <= 0) {
      shotQueued = false;
      if (dryLatched) return;
      dryLatched = true;
      playDry();
      toast('EMPTY', false);
      if (reserve > 0 && autoReload <= 0) autoReload = 0.28;
      return;
    }
    dryLatched = false;
    shotQueued = false;
    ammo -= 1;
    shots += 1;
    bolt = FIRE_CYCLE;
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
    releaseFire();
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
      plural(harvest.lion, 'lion'),
      plural(harvest.gorilla, 'gorilla'),
      plural(harvest.kangaroo, 'kangaroo'),
      plural(harvest.joey, 'joey'),
      plural(harvest.ape, 'baby gorilla', 'baby gorillas'),
      plural(harvest.caveman, 'caveman', 'cavemen'),
      plural(harvest.bunny, 'bunny', 'bunnies'),
      plural(harvest.poacher, 'poacher'),
    ].join('   ·   ');
    const acc = shots ? Math.round((hits / shots) * 100) : 0;
    endStats.textContent = plural(shots, 'shot') + '   ·   ' + plural(hits, 'hit') + '   ·   ' + acc + '% accuracy';
    hud.hidden = true;
    if (poacherEl) poacherEl.hidden = true;
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
    shotQueued = false;
    dryLatched = false;
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
    harvest.lion = 0;
    harvest.gorilla = 0;
    harvest.kangaroo = 0;
    harvest.joey = 0;
    harvest.ape = 0;
    harvest.caveman = 0;
    harvest.bunny = 0;
    harvest.poacher = 0;
    if (poacherEl) {
      poacherEl.hidden = true;
      poacherEl.classList.remove('hot');
    }
    clearAnimals();
    spawnOpening();
    spawnCooldown = 2.6;
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

    function hitsFire(x, y) {
      const el = document.elementFromPoint(x, y);
      return !!(el && (el === fireBtn || fireBtn.contains(el)));
    }
    function targetIsFire(event) {
      const t = event.target;
      return !!(t && t.closest && t.closest('#fire'));
    }
    function pointerHitsFire(event) {
      return hitsFire(event.clientX, event.clientY) || targetIsFire(event);
    }
    function touchHitsFire(touch, event) {
      return hitsFire(touch.clientX, touch.clientY) || targetIsFire(event);
    }
    function remainingFireTouch(event) {
      const touches = event.touches || [];
      for (let i = 0; i < touches.length; i++) {
        if (touchHitsFire(touches[i], event)) return true;
      }
      return false;
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
    fireBtn.addEventListener('selectstart', (event) => event.preventDefault());
    fireBtn.addEventListener('dragstart', (event) => event.preventDefault());
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
    window.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (!pointerHitsFire(event)) return;
      if (event.cancelable) event.preventDefault();
      firePointers.add(event.pointerId);
      triggerHeld = true;
      ensureAudio();
      onFire(false);
    }, true);
    const endFirePointer = (event) => {
      if (!firePointers.has(event.pointerId)) return;
      firePointers.delete(event.pointerId);
      if (firePointers.size === 0) touchHold = false;
      syncTrigger();
    };
    window.addEventListener('pointerup', endFirePointer, true);
    window.addEventListener('pointercancel', endFirePointer, true);
    window.addEventListener('touchstart', (event) => {
      let hit = false;
      for (let i = 0; i < event.changedTouches.length; i++) {
        if (touchHitsFire(event.changedTouches[i], event)) hit = true;
      }
      if (!hit) return;
      if (event.cancelable) event.preventDefault();
      ensureAudio();
      // Pointer events already hold the trigger on current phones. Touch is
      // the fallback for a browser that only delivers the touch.
      if (firePointers.size === 0) {
        touchHold = true;
        triggerHeld = true;
      }
      onFire(false);
    }, { capture: true, passive: false });
    const endFireTouch = (event) => {
      if (remainingFireTouch(event)) return;
      touchHold = false;
      if (!event.touches || event.touches.length === 0) firePointers.clear();
      syncTrigger();
    };
    window.addEventListener('touchend', endFireTouch, { capture: true, passive: false });
    window.addEventListener('touchcancel', endFireTouch, { capture: true, passive: false });
    window.addEventListener('blur', releaseFire);
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
      if (event.code === 'Space') {
        event.preventDefault();
        if (phase !== 'playing') {
          if (!event.repeat) beginHunt();
          return;
        }
        if (event.repeat) return;
        spaceHeld = true;
        ensureAudio();
        onFire(false);
        return;
      }
      if (event.repeat) return;
      if (event.code === 'KeyR') tryReload();
      else if (event.code === 'KeyF' || event.code === 'KeyC') toggleScope();
      else if (event.code === 'KeyM') toggleMute();
      else if (event.code === 'Enter' && phase !== 'playing') beginHunt();
    });
    window.addEventListener('keyup', (event) => {
      if (event.code !== 'Space') return;
      spaceHeld = false;
      if (!triggerHeld) dryLatched = false;
    });

    window.addEventListener('resize', scheduleSync);
    window.addEventListener('orientationchange', scheduleSync);
    window.addEventListener('focus', syncOrientation);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) releaseFire();
      else syncOrientation();
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
      const now = Date.now();
      const quick = now - lastTouchEnd < 340;
      lastTouchEnd = now;
      const target = event.target;
      const onButton = target && target.closest && target.closest('button');
      if (quick && event.cancelable) event.preventDefault();
      if (onButton) return;
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
    updateDrops(dt);
    updatePoacherBanner();
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
        if ((triggerHeld || spaceHeld || shotQueued) && bolt <= 0) onFire(true);
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
          updateDrops(dt || 0.05);
          updatePoacherBanner();
        },
        stepPop(dt) {
          updatePopulation(dt || 0.2);
          return activeCount();
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
          } else if (kind === 'lion') {
            placeAnimal('lion', { x: -10, z: -22, state: 'dash', target: { x: 24, z: -22 }, path: [] });
          } else if (kind === 'kangaroo' || kind === 'caveman') {
            placeAnimal(kind, { x: -12, z: -18, state: 'dash', target: { x: 18, z: -18 }, path: [] });
          } else if (kind === 'poacher') {
            placeAnimal('poacher', { x: -8, z: -18, state: 'dash', target: { x: 0, z: -18 }, path: [{ x: 12, z: -18 }], leg: 8 });
          } else {
            placeAnimal('blue', { x: -10, z: -22, state: 'dash', target: { x: 24, z: -22 }, path: [] });
          }
          const animal = animals.find((item) => item.kind === kind);
          return { x: animal.root.position.x, z: animal.root.position.z, state: animal.state };
        },
        wipe() {
          clearAnimals();
          return true;
        },
        dump: () => ({
          phase, score, ammo, reserve, timeLeft, shots, hits, yaw, pitch, scoped,
          bolt, reloading, triggerHeld, shotQueued,
          turn, turnPref, landscapeLock, vibrated, android: ANDROID,
          animals: animals.map((animal) => ({
            kind: animal.kind,
            state: animal.state,
            x: +animal.root.position.x.toFixed(2),
            y: +animal.root.position.y.toFixed(2),
            z: +animal.root.position.z.toFixed(2),
            lift: +animal.bob.position.y.toFixed(3),
            carrying: !!animal.carrying,
          })),
        }),
        place(kind, opts) {
          const o = opts || {};
          const animal = placeAnimal(kind, {
            x: o.x != null ? o.x : 1.6,
            z: o.z != null ? o.z : -14,
            state: o.state || 'alert',
            broadside: o.broadside !== false,
            timer: o.timer != null ? o.timer : 90,
            carrying: !!o.carrying,
            silver: o.silver,
            target: o.target,
            path: o.path,
          });
          return { kind: animal.kind, carrying: !!animal.carrying, hasClub: !!animal.club, hasCargo: !!animal.cargo };
        },
        killKind(kind, opts) {
          const wantCarry = opts && opts.carrying;
          const animal = animals.find((item) => item.kind === kind && item.state !== 'dead' && (!wantCarry || item.carrying));
          if (!animal) return null;
          const before = score;
          killAnimal(animal);
          return {
            gained: score - before,
            points: animal.points,
            animals: animals.filter((item) => item.state !== 'dead').map((item) => ({
              kind: item.kind,
              state: item.state,
              y: +item.root.position.y.toFixed(2),
              x: +item.root.position.x.toFixed(2),
              z: +item.root.position.z.toFixed(2),
            })),
          };
        },
        measure(kind) {
          const animal = animals.find((item) => item.kind === kind && item.state !== 'dead');
          if (!animal) return null;
          animal.root.updateWorldMatrix(true, true);
          _box.setFromObject(animal.bob);
          return {
            minY: +_box.min.y.toFixed(3),
            maxY: +_box.max.y.toFixed(3),
            minX: +_box.min.x.toFixed(3),
            maxX: +_box.max.x.toFixed(3),
            minZ: +_box.min.z.toFixed(3),
            maxZ: +_box.max.z.toFixed(3),
            lift: +animal.bob.position.y.toFixed(3),
            rootY: +animal.root.position.y.toFixed(3),
            state: animal.state,
          };
        },
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
