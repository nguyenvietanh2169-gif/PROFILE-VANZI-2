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

let isLoopRunning = false;
function startLoop() {
  if (!isLoopRunning) {
    isLoopRunning = true;
    animate();
  }
}

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
  
  startLoop();
});

container.addEventListener('mouseenter', (e) => {
  isHovering = true;
  scanRadius.target = maxScanRadius;
  updateCoordinates(e.clientX, e.clientY);
  // Set current to target immediately on enter to prevent lag from center
  current.x = target.x;
  current.y = target.y;
  
  startLoop();
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
    
    startLoop();
  }
}, { passive: true });

container.addEventListener('touchstart', (e) => {
  isHovering = true;
  scanRadius.target = maxScanRadius;
  if (e.touches.length > 0) {
    updateCoordinates(e.touches[0].clientX, e.touches[0].clientY);
    current.x = target.x;
    current.y = target.y;
    
    startLoop();
  }
}, { passive: true });

container.addEventListener('touchend', () => {
  isHovering = false;
  scanRadius.target = 0;
  mouseSpeed = 0;
});


// 5. Interactive Animation Loop

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
  } else {
    scannerRing.style.display = 'none';
  }

  // Update Coordinates in HUD (Only if element exists)
  if (coordsDisplay) {
    if (isHovering && scanRadius.current > 1) {
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

  // Check if animation should continue running (no particles anymore)
  const needsMoreFrames = isHovering || (scanRadius.current > 0.1);
  
  if (needsMoreFrames) {
    requestAnimationFrame(animate);
  } else {
    // Reset to complete standby state to save resource consumption
    isLoopRunning = false;
    imgRobot.style.clipPath = 'circle(0px at 0px 0px)';
    imgRobot.style.webkitClipPath = 'circle(0px at 0px 0px)';
    scannerRing.style.display = 'none';
    if (coordsDisplay) {
      coordsDisplay.textContent = 'SYS.COORD: STANDBY';
    }
  }
}

// Start visual frame loop once (will auto-suspend itself immediately if not hovered)
animate();


// ==========================================================================
// 6. Audio System (Intro Teaser & Ambient Loops from files)
// ==========================================================================
let audioCtx = null;
let soundOn = false;
let introDuration = 9.0; // Fallback duration
let introAudioBuffer = null;

// Custom audio file tags (loaded dynamically to prevent load delays)
const introAudio = new Audio('/intro.mp3');
introAudio.crossOrigin = "anonymous";

// Pre-fetch and decode intro audio in the background
async function prefetchIntroAudio() {
  try {
    const response = await fetch('/intro.mp3');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    
    // Create a temporary AudioContext for background decoding
    const tempCtx = new (window.AudioContext || window.webkitAudioContext)();
    tempCtx.decodeAudioData(arrayBuffer, (decoded) => {
      introAudioBuffer = decoded;
      introDuration = decoded.duration;
      console.log("Intro audio pre-decoded in background. Duration:", introDuration);
      tempCtx.close();
    }, (err) => {
      console.error("Background decodeAudioData failed:", err);
      tempCtx.close();
    });
  } catch (err) {
    console.error("Failed to prefetch/decode intro audio:", err);
  }
}
prefetchIntroAudio();

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
let introSourceNode = null;

async function playIntroAudio(ctx, onComplete) {
  try {
    if (introAudioBuffer) {
      console.log("Using pre-decoded audio buffer.");
      introSourceNode = ctx.createBufferSource();
      introSourceNode.buffer = introAudioBuffer;
      
      introAnalyser = ctx.createAnalyser();
      introAnalyser.fftSize = 64;
      
      introSourceNode.connect(introAnalyser);
      introAnalyser.connect(ctx.destination);
      
      introSourceNode.start(0);
      
      introSourceNode.onended = () => {
        onComplete();
      };
      
      introTimeout = setTimeout(onComplete, (introDuration + 0.2) * 1000);
    } else {
      console.log("Audio buffer not pre-decoded yet. Fetching and decoding dynamically...");
      const response = await fetch('/intro.mp3');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      introDuration = audioBuffer.duration;
      
      introSourceNode = ctx.createBufferSource();
      introSourceNode.buffer = audioBuffer;
      
      introAnalyser = ctx.createAnalyser();
      introAnalyser.fftSize = 64;
      
      introSourceNode.connect(introAnalyser);
      introAnalyser.connect(ctx.destination);
      
      introSourceNode.start(0);
      introSourceNode.onended = () => {
        onComplete();
      };
      
      introTimeout = setTimeout(onComplete, (introDuration + 0.2) * 1000);
    }
  } catch (err) {
    console.warn("Web Audio playback failed, falling back to HTML5 Audio:", err);
    playIntroAudioFallback(onComplete);
  }
}

function playIntroAudioFallback(onComplete) {
  introAudio.currentTime = 0;
  introAudio.play().then(() => {
    if (introAudio.duration && !isNaN(introAudio.duration)) {
      introDuration = introAudio.duration;
    }
  }).catch(err => {
    console.warn("HTML5 audio playback failed:", err);
    onComplete();
  });
  
  introAudio.onended = () => {
    onComplete();
  };
  
  const timeoutDuration = (introAudio.duration && !isNaN(introAudio.duration)) ? introAudio.duration : 9.0;
  introTimeout = setTimeout(onComplete, (timeoutDuration + 0.2) * 1000);
}

// State variables for dynamic logo movement & scaling
let logoPos = { x: 0, y: 0, targetX: 0, targetY: 0 };
let logoScale = { current: 1 };
let lastTargetChange = 0;
let startTime = 0;

// Draw and animate the logo + clones according to the music frequencies
// Draw and animate the logo + clones according to the music frequencies
function animateIntroLogo() {
  if (!isIntroActive) return;
  introAnimationId = requestAnimationFrame(animateIntroLogo);
  
  const logoContainer = document.querySelector('.intro-logo-container');
  const logoMain = document.querySelector('.logo-main');
  
  const now = Date.now();
  const elapsed = (now - startTime) / 1000;
  
  // Get actual music duration
  const duration = introDuration;
  
  // Use elapsed timer as progress time
  const progressTime = elapsed;
  
  // Define transition phases near the end of the song
  const isOutroPhase1 = progressTime >= (duration - 5.1); // Drawing lines & Snap logo (last 5.1s)
  const isOutroPhase2 = progressTime >= (duration - 3.9); // Slide slices & Fade logo (last 3.9s)
  
  const isMobilePhone = window.innerWidth <= 600;
  
  let bassNorm = 0;
  let volNorm = 0;
  
  if (isOutroPhase1) {
    if (!introGate.classList.contains('draw-lines')) {
      introGate.classList.add('draw-lines');
    }
    // Snap logo target to center and lock
    logoPos.targetX = 0;
    logoPos.targetY = 0;
    lastTargetChange = Infinity;
  } else if (isMobilePhone) {
    // Mobile Phone: gentle wiggling with slow update frequency to save CPU
    if (now - lastTargetChange > 300) {
      // Simulate beat intensity based on sin waves
      const beatIntensity = Math.sin(progressTime * 2.5 * Math.PI) > 0.4 ? 4 : 1;
      logoPos.targetX = (Math.random() - 0.5) * beatIntensity;
      logoPos.targetY = (Math.random() - 0.5) * beatIntensity;
      lastTargetChange = now;
    }
  } else if (introAnalyser) {
    // Computer & iPad: Use actual audio frequency analyzer data
    const bufferLength = introAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    introAnalyser.getByteFrequencyData(dataArray);
    
    // Calculate average volume
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    const avgVolume = sum / bufferLength; // 0 to 255
    const bass = (dataArray[0] + dataArray[1] + dataArray[2] + dataArray[3]) / 4;
    
    bassNorm = bass / 255;
    volNorm = avgVolume / 255;
    
    if (bassNorm > 0.6 && now - lastTargetChange > 90) {
      // Fast, strong jumps on heavy beats
      const maxOffset = 200;
      logoPos.targetX = (Math.random() - 0.5) * maxOffset;
      logoPos.targetY = (Math.random() - 0.5) * maxOffset;
      lastTargetChange = now;
    } else if (now - lastTargetChange > 400) {
      // Faster drifting when music is quieter
      const maxOffset = 70;
      logoPos.targetX = (Math.random() - 0.5) * maxOffset;
      logoPos.targetY = (Math.random() - 0.5) * maxOffset;
      lastTargetChange = now;
    }
  }
  
  if (isOutroPhase2) {
    if (!introGate.classList.contains('outro-active')) {
      introGate.classList.add('outro-active');
    }
  }
  
  // Smoothly interpolate position (snaps fast and sharp on computer, very slow and cheap on mobile CPU)
  let positionLerp;
  if (isOutroPhase1) {
    positionLerp = 0.35;
  } else if (isMobilePhone) {
    positionLerp = 0.04; // Very low interpolation step: extremely light on CPU
  } else {
    positionLerp = 0.12 + bassNorm * 0.22; // Snappy, high-velocity movement on computers
  }
  
  logoPos.x += (logoPos.targetX - logoPos.x) * positionLerp;
  logoPos.y += (logoPos.targetY - logoPos.y) * positionLerp;
  
  // 2. Dynamic global scaling (pulsing up to 1.8x on desktop, 1.08x on mobile, shrinks to 0 during outro)
  let targetScale;
  if (isOutroPhase2) {
    targetScale = 0;
  } else if (isMobilePhone) {
    // Mobile: simulate a light scale pulse based on time-based beat rhythm
    const timeBeat = Math.sin(progressTime * 2.5 * Math.PI) > 0.6 ? 0.06 : 0;
    targetScale = 1.0 + timeBeat;
  } else {
    // Desktop/iPad: strong dynamic scaling
    targetScale = 1.0 + bassNorm * 0.6 + volNorm * 0.2;
  }
  
  const scaleLerp = isOutroPhase2 ? 0.05 : (isMobilePhone ? 0.12 : 0.18);
  logoScale.current += (targetScale - logoScale.current) * scaleLerp;
  
  if (logoContainer) {
    logoContainer.style.transform = `translate3d(${logoPos.x}px, ${logoPos.y}px, 0) scale(${logoScale.current})`;
  }
  
  if (logoMain) {
    // 3. Playful blinking/flickering effect on high bass beats (disabled on mobile to avoid paint storms)
    let opacity = isOutroPhase2 ? 0 : 1;
    if (!isMobilePhone && !isOutroPhase2 && bassNorm > 0.6 && Math.random() > 0.35) {
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
  if (introSourceNode) {
    try {
      introSourceNode.stop();
    } catch (e) {}
  }
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

let introPlaying = false;

// Click or Touch to initiate system and play intro audio (with proper AudioContext unlocking for iOS Safari)
const handleInitiate = async () => {
  // Hide the initiation button container completely immediately to give instant feedback
  if (introEntry) {
    introEntry.style.display = 'none';
  }
  
  if (introPlaying) return; // Prevent double-triggering
  introPlaying = true;
  
  // Track start time and start animation loop immediately
  startTime = Date.now();
  animateIntroLogo();
  
  const isMobilePhone = window.innerWidth <= 600;
  
  if (isMobilePhone) {
    // Mobile Phone: play standard HTML5 Audio directly (synchronously inside the click handler to satisfy iOS requirements)
    console.log("Mobile phone detected. Playing via standard HTML5 Audio to avoid Web Audio API bugs.");
    playIntroAudioFallback(enterExperience);
  } else {
    // Computer & iPad: Play via Web Audio API for beat-reactive visualizer
    try {
      // Setup and resume audio context to unlock Web Audio on iOS Safari
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Set audio session category to playback to override the hardware mute switch on iOS
      if (navigator.audioSession) {
        try {
          navigator.audioSession.type = 'playback';
        } catch (e) {
          console.warn("Could not set audio session category:", e);
        }
      }
      
      if (audioCtx.state === 'suspended') {
        audioCtx.resume(); // Start resuming in background without blocking
      }
      
      // Play intro audio
      playIntroAudio(audioCtx, enterExperience);
    } catch (err) {
      console.error("Audio initialization failed, falling back to HTML5 audio:", err);
      playIntroAudioFallback(enterExperience);
    }
  }
};

btnInitiate.addEventListener('click', handleInitiate);
btnInitiate.addEventListener('touchstart', (e) => {
  e.preventDefault(); // Prevent simulated click event to avoid double trigger
  handleInitiate();
}, { passive: false });


