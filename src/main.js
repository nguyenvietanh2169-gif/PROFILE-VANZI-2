import './style.css';

// ==========================================================================
// DJ VANZI - CORE INTERACTION & PARTICLE ENGINE
// ==========================================================================

// 1. DOM Elements
const container = document.getElementById('image-viewer-container');
const imgHuman = document.getElementById('img-human');
const imgRobot = document.getElementById('img-robot');
const scannerRing = document.getElementById('scanner-ring-elem');
const coordsDisplay = document.getElementById('coords-display');
const particleCanvas = document.getElementById('particle-canvas');
const soundToggle = document.getElementById('sound-toggle');
const waveformContainer = document.getElementById('waveform-visualizer');
const navLinks = document.querySelectorAll('.nav-link');

// Intro Gate DOM Elements
const introGate = document.getElementById('intro-gate');
const introEntry = document.getElementById('intro-entry');
const btnInitiate = document.getElementById('btn-initiate');

// 2. State & Interpolation Variables
let mouse = { x: 0, y: 0 };
let target = { x: 0, y: 0 };
let current = { x: 0, y: 0 };
let scanRadius = { current: 0, target: 0 };
const maxScanRadius = 120; // Matches CSS scan radius limit
const lerpFactor = 0.08; // Smoothness factor (lower = smoother)
let isHovering = false;
let mouseSpeed = 0;
let lastMousePos = { x: 0, y: 0 };

// 2.5 Developer Alignment Offsets (Calibrated values, saved as pixels of 940x788 resolution)
let offsetX = 5;
let offsetY = 11;
let offsetScale = 0.901;
let cropBottom = 39;

// Apply initial responsive percentages (relative to native 940x788 image size)
const offsetXPercent = (offsetX / 940) * 100;
const offsetYPercent = (offsetY / 788) * 100;
const cropBottomPercent = (cropBottom / 788) * 100;

imgRobot.style.transform = `translate(${offsetXPercent}%, ${offsetYPercent}%) scale(${offsetScale})`;
imgHuman.style.clipPath = `inset(0% 0% ${cropBottomPercent}% 0%)`;
imgHuman.style.webkitClipPath = `inset(0% 0% ${cropBottomPercent}% 0%)`;

// 3. Canvas Setup
const ctx = particleCanvas.getContext('2d');
let particles = [];

function resizeCanvas() {
  const rect = container.getBoundingClientRect();
  particleCanvas.width = rect.width;
  particleCanvas.height = rect.height;
}
resizeCanvas();
// Handle resize
window.addEventListener('resize', resizeCanvas);

// 4. Mouse and Touch Event Listeners
function updateCoordinates(clientX, clientY) {
  const rect = container.getBoundingClientRect();
  target.x = clientX - rect.left;
  target.y = clientY - rect.top;
}

container.addEventListener('mousemove', (e) => {
  isHovering = true;
  scanRadius.target = maxScanRadius;
  updateCoordinates(e.clientX, e.clientY);
  
  // Calculate speed for particle modulation
  const dx = target.x - lastMousePos.x;
  const dy = target.y - lastMousePos.y;
  mouseSpeed = Math.sqrt(dx * dx + dy * dy);
  lastMousePos = { x: target.x, y: target.y };
});

container.addEventListener('mouseenter', (e) => {
  isHovering = true;
  scanRadius.target = maxScanRadius;
  updateCoordinates(e.clientX, e.clientY);
  // Set current to target immediately on enter to prevent lag from center
  current.x = target.x;
  current.y = target.y;
});

container.addEventListener('mouseleave', () => {
  isHovering = false;
  scanRadius.target = 0;
  mouseSpeed = 0;
});

// Mobile Touch Support
container.addEventListener('touchmove', (e) => {
  if (e.touches.length > 0) {
    isHovering = true;
    scanRadius.target = maxScanRadius;
    updateCoordinates(e.touches[0].clientX, e.touches[0].clientY);
    
    const dx = target.x - lastMousePos.x;
    const dy = target.y - lastMousePos.y;
    mouseSpeed = Math.sqrt(dx * dx + dy * dy);
    lastMousePos = { x: target.x, y: target.y };
  }
}, { passive: true });

container.addEventListener('touchstart', (e) => {
  isHovering = true;
  scanRadius.target = maxScanRadius;
  if (e.touches.length > 0) {
    updateCoordinates(e.touches[0].clientX, e.touches[0].clientY);
    current.x = target.x;
    current.y = target.y;
  }
}, { passive: true });

container.addEventListener('touchend', () => {
  isHovering = false;
  scanRadius.target = 0;
  mouseSpeed = 0;
});


// 5. Cyber Particle System
class Particle {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    // Velocity: burst outwards from the perimeter of the scanning circle
    const speed = 0.3 + Math.random() * 1.2;
    this.vx = Math.cos(angle) * speed + (Math.random() - 0.5) * 0.3;
    this.vy = Math.sin(angle) * speed + (Math.random() - 0.5) * 0.3;
    
    this.size = 1 + Math.random() * 2;
    this.maxLife = 15 + Math.random() * 20;
    this.life = this.maxLife;
    // Glowing cool white and light blue particles matching blue sky
    this.color = Math.random() > 0.4 ? '#ffffff' : '#76c0d0';
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.94; // slightly higher drag for subtle drift
    this.vy *= 0.94;
    this.life--;
  }

  draw() {
    const opacity = this.life / this.maxLife;
    ctx.fillStyle = this.color;
    ctx.globalAlpha = opacity * 0.7; // soft glowing sparks
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
  }
}

function spawnParticles(x, y, radius, count) {
  if (radius < 10) return;
  for (let i = 0; i < count; i++) {
    // Generate a random angle around the circle
    const angle = Math.random() * Math.PI * 2;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    particles.push(new Particle(px, py, angle));
  }
}

function updateAndDrawParticles() {
  ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
  ctx.globalCompositeOperation = 'source-over'; // draw normally over white background
  
  particles.forEach((p, index) => {
    p.update();
    p.draw();
    if (p.life <= 0) {
      particles.splice(index, 1);
    }
  });
  
  ctx.globalAlpha = 1.0;
}

// 6. Interactive Animation Loop
function animate() {
  // Linear Interpolation (LERP) formula: current += (target - current) * factor
  current.x += (target.x - current.x) * lerpFactor;
  current.y += (target.y - current.y) * lerpFactor;
  scanRadius.current += (scanRadius.target - scanRadius.current) * lerpFactor;

  // Apply clip path to top image (robot) to reveal it
  const clipString = `circle(${scanRadius.current}px at ${current.x}px ${current.y}px)`;
  imgRobot.style.clipPath = clipString;
  imgRobot.style.webkitClipPath = clipString;

  // Positioning the glowing scanner ring overlay
  if (scanRadius.current > 1) {
    scannerRing.style.display = 'block';
    scannerRing.style.left = `${current.x}px`;
    scannerRing.style.top = `${current.y}px`;
    scannerRing.style.width = `${scanRadius.current * 2}px`;
    scannerRing.style.height = `${scanRadius.current * 2}px`;
    
    // Spawn digital sparks at the border of reveal circle when scanning is active
    if (isHovering && mouseSpeed > 1) {
      const spawnCount = Math.min(Math.floor(mouseSpeed / 3), 4);
      spawnParticles(current.x, current.y, scanRadius.current, spawnCount);
    }
  } else {
    scannerRing.style.display = 'none';
  }

  // Update Coordinates in HUD (Only if element exists)
  if (coordsDisplay) {
    if (isHovering || scanRadius.current > 1) {
      const displayX = Math.round(current.x).toString().padStart(3, '0');
      const displayY = Math.round(current.y).toString().padStart(3, '0');
      coordsDisplay.textContent = `SYS.COORD: X: ${displayX} | Y: ${displayY}`;
    } else {
      coordsDisplay.textContent = 'SYS.COORD: STANDBY';
    }
  }

  // Tilt visual card slightly towards cursor
  if (isHovering) {
    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const tiltX = (target.y - centerY) / centerY * 6; // Max 6 deg tilt
    const tiltY = (target.x - centerX) / centerX * -6;
    container.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
  } else {
    container.style.transform = 'none'; // Completely clear the transform to restore 2D pixel sharpness
  }

  // Update particle engine
  updateAndDrawParticles();

  requestAnimationFrame(animate);
}

// Start visual frame loop
animate();


// ==========================================================================
// 6. Audio System (Intro Teaser & Ambient Loops from files)
// ==========================================================================
let audioCtx = null;
let soundOn = false;

// Custom audio file tags (loaded dynamically to prevent load delays)
const introAudio = new Audio('/src/assets/intro.mp3');
introAudio.crossOrigin = "anonymous";

let introSource = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function startAudio() {
  initAudio();
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  soundOn = true;
  soundToggle.classList.add('playing');
  soundToggle.querySelector('.sound-text').textContent = 'AUDIO: ON';
}

function stopAudio() {
  soundOn = false;
  soundToggle.classList.remove('playing');
  soundToggle.querySelector('.sound-text').textContent = 'AUDIO: OFF';
}

// Click Trigger for sound toggle
soundToggle.addEventListener('click', () => {
  if (soundOn) {
    stopAudio();
  } else {
    startAudio();
    playBeep(600, 0.1); // UI toggle beep
  }
});

// UI Sound Synthesis helper (clicks & enter scan beeps)
function playBeep(frequency, duration) {
  if (!soundOn || !audioCtx) return;
  
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
  
  gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
  // Exponential decay
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

// Play beeps when navigation items are clicked
navLinks.forEach(link => {
  link.addEventListener('click', () => {
    playBeep(1400, 0.15);
    navLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');
  });
});


// ==========================================================================
// Equalizer Footer Visualizer Simulator
// ==========================================================================
const numBars = 40;
let bars = [];

// Create visualizer bar elements in DOM
function createVisualizer() {
  if (!waveformContainer) return;
  waveformContainer.innerHTML = '';
  for (let i = 0; i < numBars; i++) {
    const bar = document.createElement('div');
    bar.classList.add('wave-bar');
    waveformContainer.appendChild(bar);
    bars.push(bar);
  }
}
createVisualizer();

// Simple animated waveform simulation
function animateWaveform() {
  if (!waveformContainer) return;
  bars.forEach((bar, index) => {
    let height = 4; // Idle height
    
    if (soundOn) {
      // Create a complex dynamic waveform when sound is enabled
      const t = Date.now() * 0.004;
      const speedMod = isHovering ? (1 + mouseSpeed * 0.05) : 1;
      
      const wave1 = Math.sin(index * 0.3 + t * speedMod) * 10;
      const wave2 = Math.cos(index * 0.1 - t * 1.5 * speedMod) * 8;
      height = Math.max(4, 12 + wave1 + wave2);
      
      bar.classList.add('animating');
    } else {
      // Gentle idle wave when sound is disabled
      const t = Date.now() * 0.001;
      height = Math.max(4, 6 + Math.sin(index * 0.25 + t) * 3);
      bar.classList.remove('animating');
    }
    
    bar.style.height = `${height}px`;
  });
  
  setTimeout(animateWaveform, 50);
}
animateWaveform();

// ==========================================================================
// 7. Immersive Intro Gate Overlay & Preloader Logic
// ==========================================================================
let isIntroActive = true;
let introTimeout = null;
let introAnalyser = null;
let introAnimationId = null;

function playIntroAudio(ctx, onComplete) {
  if (!introSource) {
    try {
      introSource = ctx.createMediaElementSource(introAudio);
      introAnalyser = ctx.createAnalyser();
      introAnalyser.fftSize = 64;
      introSource.connect(introAnalyser);
      introAnalyser.connect(ctx.destination);
    } catch (e) {
      console.warn("Intro audio context routing warning:", e);
    }
  }
  
  introAudio.currentTime = 0;
  introAudio.play().catch(err => {
    console.warn("Intro music file (/src/assets/intro.mp3) not found. Proceeding silently.", err);
  });
  
  // Audio duration fallback: 15 seconds
  let duration = 15;
  if (introAudio.duration && !isNaN(introAudio.duration)) {
    duration = introAudio.duration;
  }
  
  introAudio.onended = () => {
    onComplete();
  };
  
  // Set safety timeout in case audio fails to load or play
  introTimeout = setTimeout(onComplete, duration * 1000);
}

// State variables for dynamic logo movement & scaling
let logoPos = { x: 0, y: 0, targetX: 0, targetY: 0 };
let logoScale = { current: 1 };
let lastTargetChange = 0;
let startTime = 0;

// Draw and animate the logo + clones according to the music frequencies
function animateIntroLogo() {
  if (!isIntroActive) return;
  introAnimationId = requestAnimationFrame(animateIntroLogo);
  
  if (!introAnalyser) return;
  
  const bufferLength = introAnalyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  introAnalyser.getByteFrequencyData(dataArray);
  
  // Calculate average volume
  let sum = 0;
  for (let i = 0; i < bufferLength; i++) {
    sum += dataArray[i];
  }
  const avgVolume = sum / bufferLength; // 0 to 255
  
  // Bass frequencies (first 4 bins)
  const bass = (dataArray[0] + dataArray[1] + dataArray[2] + dataArray[3]) / 4;
  
  // Normalize parameters
  const bassNorm = bass / 255;
  const volNorm = avgVolume / 255;
  
  const logoContainer = document.querySelector('.intro-logo-container');
  const logoMain = document.querySelector('.logo-main');
  
  const now = Date.now();
  const elapsed = (now - startTime) / 1000;
  
  // Get actual music duration or fallback to 9.0 seconds
  const duration = (introAudio.duration && !isNaN(introAudio.duration) && introAudio.duration > 0) ? introAudio.duration : 9.0;
  
  // Use audio currentTime if playing, else fallback to elapsed timer
  const progressTime = (introAudio.currentTime > 0) ? introAudio.currentTime : elapsed;
  
  // Define transition phases near the end of the song
  const isOutroPhase1 = progressTime >= (duration - 5.1); // Drawing lines & Snap logo (last 5.1s)
  const isOutroPhase2 = progressTime >= (duration - 3.9); // Slide slices & Fade logo (last 3.9s)
  
  if (isOutroPhase1) {
    if (!introGate.classList.contains('draw-lines')) {
      introGate.classList.add('draw-lines');
    }
    // Snap logo target to center and lock
    logoPos.targetX = 0;
    logoPos.targetY = 0;
    lastTargetChange = Infinity;
  } else if (bassNorm > 0.65 && now - lastTargetChange > 250) {
    // Jump rapidly to a new location on heavy beats
    const maxOffset = window.innerWidth < 600 ? 50 : 130;
    logoPos.targetX = (Math.random() - 0.5) * maxOffset * 2.2;
    logoPos.targetY = (Math.random() - 0.5) * maxOffset * 2.2;
    lastTargetChange = now;
  } else if (now - lastTargetChange > 1000) {
    // Slow drifting if there are no heavy beats
    const maxOffset = window.innerWidth < 600 ? 25 : 55;
    logoPos.targetX = (Math.random() - 0.5) * maxOffset * 2;
    logoPos.targetY = (Math.random() - 0.5) * maxOffset * 2;
    lastTargetChange = now;
  }
  
  if (isOutroPhase2) {
    if (!introGate.classList.contains('outro-active')) {
      introGate.classList.add('outro-active');
    }
  }
  
  // Smoothly interpolate position (dashes/snaps faster during outro)
  const positionLerp = isOutroPhase1 ? 0.35 : (0.05 + bassNorm * 0.09);
  logoPos.x += (logoPos.targetX - logoPos.x) * positionLerp;
  logoPos.y += (logoPos.targetY - logoPos.y) * positionLerp;
  
  // 2. Dynamic global scaling (pulsing up to 1.6x, shrinks to 0 during outro)
  const targetScale = isOutroPhase2 ? 0 : (1.0 + bassNorm * 0.45 + volNorm * 0.15);
  logoScale.current += (targetScale - logoScale.current) * (isOutroPhase2 ? 0.05 : 0.16);
  
  if (logoContainer) {
    logoContainer.style.transform = `translate3d(${logoPos.x}px, ${logoPos.y}px, 0) scale(${logoScale.current})`;
  }
  
  if (logoMain) {
    // 3. Playful blinking/flickering effect on high bass beats
    let opacity = isOutroPhase2 ? 0 : 1;
    if (!isOutroPhase2 && bassNorm > 0.6 && Math.random() > 0.35) {
      opacity = Math.random() > 0.5 ? 0.1 : 0.4 + Math.random() * 0.6; // Rapid neon flash
    }
    
    // Smoothly fade out opacity in Outro Phase 2
    if (isOutroPhase2) {
      const currentOpacity = parseFloat(logoMain.style.opacity || 1);
      logoMain.style.opacity = Math.max(0, currentOpacity - 0.02);
    } else {
      logoMain.style.opacity = opacity;
    }
  }
}

// Transition from Intro Gate to Main Experience
function enterExperience() {
  if (!isIntroActive) return;
  isIntroActive = false;
  
  // Stop and clear intro audio
  introAudio.pause();
  introAudio.currentTime = 0;
  
  // Clear timeouts and animation frames
  clearTimeout(introTimeout);
  cancelAnimationFrame(introAnimationId);
  
  // Restore body scroll
  document.body.classList.remove('intro-active');
  
  // Fade out preloader gate container
  introGate.classList.add('fade-out');
  
  // Clean up DOM after transition ends to prevent click blocking
  setTimeout(() => {
    introGate.style.display = 'none';
  }, 1200);
}

// Click to initiate system and play intro audio
btnInitiate.addEventListener('click', () => {
  // Setup audio context
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  // Hide the initiation button container completely immediately
  introEntry.style.display = 'none';
  
  // Track start time
  startTime = Date.now();
  
  // Play intro audio and start beat animation loop
  playIntroAudio(audioCtx, enterExperience);
  animateIntroLogo();
});


