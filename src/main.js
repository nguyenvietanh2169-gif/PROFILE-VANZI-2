import './style.css';

// Force scroll to top on load and disable automatic browser scroll restoration to prevent preloader conflicts
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

// ==========================================================================
// DJ VANZI - CORE INTERACTION & PARTICLE ENGINE
// ==========================================================================

// 1. DOM Elements
const container = document.getElementById('image-viewer-container');
const imgHuman = document.getElementById('img-human');
const imgRobot = document.getElementById('img-robot');
const robotWrapper = document.getElementById('robot-wrapper');
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



// 4. Mouse and Touch Event Listeners - Cached container bounding rect to eliminate layout thrashing
let containerRect = null;
function updateContainerRect() {
  if (container) {
    containerRect = container.getBoundingClientRect();
  }
}
// Initial rect calculation
updateContainerRect();

// Update on layout adjustments
window.addEventListener('resize', updateContainerRect);
window.addEventListener('scroll', updateContainerRect, { passive: true });

function updateCoordinates(clientX, clientY) {
  if (!containerRect) {
    updateContainerRect();
  }
  target.x = clientX - containerRect.left;
  target.y = clientY - containerRect.top;
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
  updateContainerRect(); // Refresh rect on start of interaction
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
    // Prevent default scrolling to block layout shift and scroll paint lag during drag
    e.preventDefault();
    
    isHovering = true;
    scanRadius.target = maxScanRadius;
    updateCoordinates(e.touches[0].clientX, e.touches[0].clientY);
    
    const dx = target.x - lastMousePos.x;
    const dy = target.y - lastMousePos.y;
    mouseSpeed = Math.sqrt(dx * dx + dy * dy);
    lastMousePos = { x: target.x, y: target.y };
    
    startLoop();
  }
}, { passive: false });

container.addEventListener('touchstart', (e) => {
  if (e.touches.length > 0) {
    // Prevent default tap behaviors or scrolling trigger
    e.preventDefault();
    
    isHovering = true;
    updateContainerRect(); // Refresh rect on start of interaction
    scanRadius.target = maxScanRadius;
    updateCoordinates(e.touches[0].clientX, e.touches[0].clientY);
    current.x = target.x;
    current.y = target.y;
    
    startLoop();
  }
}, { passive: false });

container.addEventListener('touchend', () => {
  isHovering = false;
  scanRadius.target = 0;
  mouseSpeed = 0;
});


// 5. Interactive Animation Loop

function animate() {
  const isMobilePhone = window.innerWidth <= 600;
  
  // On mobile, coordinates track the finger directly (LERP = 1.0) to remove input delay completely.
  // Radius animation (opening/closing the circle) still transitions smoothly at LERP = 0.22.
  const currentLerp = isMobilePhone ? 1.0 : lerpFactor;
  const radiusLerp = isMobilePhone ? 0.22 : lerpFactor;

  // Linear Interpolation (LERP) formula: current += (target - current) * factor
  current.x += (target.x - current.x) * currentLerp;
  current.y += (target.y - current.y) * currentLerp;
  scanRadius.current += (scanRadius.target - scanRadius.current) * radiusLerp;

  // Apply clip path to top image wrapper (robot) to reveal it
  const clipString = `circle(${scanRadius.current}px at ${current.x}px ${current.y}px)`;
  robotWrapper.style.clipPath = clipString;
  robotWrapper.style.webkitClipPath = clipString;

  // Positioning the glowing scanner ring overlay using GPU-accelerated translate3d + scale
  if (scanRadius.current > 1) {
    scannerRing.style.display = 'block';
    const scale = scanRadius.current / maxScanRadius;
    const tx = current.x - 120; // 120 is half of 240px width
    const ty = current.y - 120; // 120 is half of 240px height
    scannerRing.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
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

  // Tilt visual card slightly towards cursor (disabled on mobile to avoid massive GPU composition bottlenecks)
  if (!isMobilePhone && isHovering) {
    if (!containerRect) {
      updateContainerRect();
    }
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;
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
    robotWrapper.style.clipPath = 'circle(0px at 0px 0px)';
    robotWrapper.style.webkitClipPath = 'circle(0px at 0px 0px)';
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
  if (soundToggle) {
    soundToggle.classList.add('playing');
    const textNode = soundToggle.querySelector('.sound-text');
    if (textNode) textNode.textContent = 'AUDIO: ON';
  }
}

function stopAudio() {
  soundOn = false;
  if (soundToggle) {
    soundToggle.classList.remove('playing');
    const textNode = soundToggle.querySelector('.sound-text');
    if (textNode) textNode.textContent = 'AUDIO: OFF';
  }
}

// Click Trigger for sound toggle
if (soundToggle) {
  soundToggle.addEventListener('click', () => {
    if (soundOn) {
      stopAudio();
    } else {
      startAudio();
      playBeep(600, 0.1); // UI toggle beep
    }
  });
}

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
    
    if (bassNorm > 0.72 && now - lastTargetChange > 320) {
      // Stronger but much sparser kicks
      const maxOffset = 95;
      logoPos.targetX = (Math.random() - 0.5) * maxOffset;
      logoPos.targetY = (Math.random() - 0.5) * maxOffset;
      lastTargetChange = now;
    } else if (now - lastTargetChange > 1200) {
      // Slow, atmospheric drifting when quiet
      const maxOffset = 30;
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
    positionLerp = 0.06 + bassNorm * 0.08; // Smooth, premium responsiveness on computers
  }
  
  logoPos.x += (logoPos.targetX - logoPos.x) * positionLerp;
  logoPos.y += (logoPos.targetY - logoPos.y) * positionLerp;
  
  // 2. Dynamic global scaling (pulsing up to 1.4x on desktop, 1.08x on mobile, shrinks to 0 during outro)
  let targetScale;
  if (isOutroPhase2) {
    targetScale = 0;
  } else if (isMobilePhone) {
    // Mobile: simulate a light scale pulse based on time-based beat rhythm
    const timeBeat = Math.sin(progressTime * 2.5 * Math.PI) > 0.6 ? 0.06 : 0;
    targetScale = 1.0 + timeBeat;
  } else {
    // Desktop/iPad: elegant, moderate dynamic scaling
    targetScale = 1.0 + bassNorm * 0.28 + volNorm * 0.12;
  }
  
  const scaleLerp = isOutroPhase2 ? 0.05 : (isMobilePhone ? 0.12 : 0.14);
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


// ==========================================================================
// 8. Neumorphic Music Player Controller Logic
// ==========================================================================
const TRACKS = [
  { id: 1, title: 'Đi Cùng Em', src: '/audio/di-cung-em.mp3', cover: '/images/performance-close.jpg', duration: '03:42', genre: 'remix' },
  { id: 2, title: 'À Thì Ra Là Vanzii', src: '/audio/a-thi-ra-la-vanzii.mp3', cover: '/images/club-stage.jpg', duration: '03:15', genre: 'remix' },
  { id: 3, title: 'Ước Gì', src: '/audio/uoc-gi.mp3', cover: '/images/about-winking.jpg', duration: '03:30', genre: 'ballad' },
  { id: 4, title: 'Vũ Điệu Hoang Dã', src: '/audio/vu-dieu-hoang-da.mp3', cover: '/images/video-thumbnail.jpg', duration: '03:52', genre: 'remix' },
  { id: 5, title: 'Yêu Đời', src: '/audio/yeu-doi-mtv.mp3', cover: '/images/club-stage.jpg', duration: '03:08', genre: 'remix' },
  { id: 6, title: 'Love Story', src: '/audio/love-story.mp3', cover: '/images/profile-scarf.jpg', duration: '03:54', genre: 'pop' },
  { id: 7, title: '50 Năm Về Sau', src: '/audio/50-nam-ve-sau.mp3', cover: '/images/balenciaga-blue.jpg', duration: '04:12', genre: 'ballad' },
  { id: 8, title: 'Đừng Hỏi Em Ổn Không', src: '/audio/dung-hoi-em-on-khong.mp3', cover: '/images/profile-scarf.jpg', duration: '03:40', genre: 'pop' },
  { id: 9, title: 'Run To You', src: '/audio/run-to-you.mp3', cover: '/images/hero-portrait.jpg', duration: '03:48', genre: 'pop' },
  { id: 10, title: 'What Makes You Beautiful', src: '/audio/what-makes-you-beautiful.mp3', cover: '/images/balenciaga-blue.jpg', duration: '03:18', genre: 'pop' },
  { id: 11, title: 'APT BLACKPINK', src: '/audio/apt-blackpink.mp3', cover: '/images/performance-close.jpg', duration: '03:02', genre: 'remix' }
];

const LYRICS = {
  1: [
    { time: 0, text: "🎶 Trình phát nhạc: Đi Cùng Em - DJ VANZI 🎶" },
    { time: 10, text: "Giai điệu lôi cuốn, ngập tràn cảm xúc..." },
    { time: 24, text: "Hãy phiêu theo âm nhạc tương lai..." },
    { time: 48, text: "Sáng tạo và bứt phá cùng VANZI ON DA BEAT!" }
  ],
  2: [
    { time: 0, text: "⚡ Bản phối: À Thì Ra Là Vanzii ⚡" },
    { time: 12, text: "Nhịp Bass cực căng, quẩy hết mình..." },
    { time: 28, text: "Giai điệu thăng hoa trong từng nốt nhạc..." }
  ],
  3: [
    { time: 0, text: "🍃 Bản ballad: Ước Gì - Acoustic Remix 🍃" },
    { time: 15, text: "Ước gì em ở đây giờ phút này..." },
    { time: 35, text: "Hoài niệm và đắm chìm trong giai điệu êm dịu..." }
  ],
  4: [
    { time: 0, text: "🔥 High Energy: Vũ Điệu Hoang Dã 🔥" },
    { time: 14, text: "Nhịp điệu bùng cháy, khuấy đảo không gian..." },
    { time: 35, text: "Trải nghiệm âm thanh vòm đỉnh cao..." }
  ],
  11: [
    { time: 0, text: "🎧 K-Pop Remix: APT BLACKPINK 🎧" },
    { time: 10, text: "Giai điệu cực hot đang lan tỏa..." },
    { time: 25, text: "Bản phối EDM độc quyền từ DJ VANZI!" }
  ]
};

// Selectors
const playerAudio = document.getElementById('player-audio-elem');
const playerTrackTitle = document.getElementById('player-track-title');
const playerTrackArtist = document.getElementById('player-track-artist');
const playerCoverArt = document.getElementById('player-cover-art');
const cdDisc = document.getElementById('cd-disc-elem');
const progressRingBar = document.getElementById('progress-ring-bar');
const playerCurrentTime = document.getElementById('player-current-time');
const playerTotalDuration = document.getElementById('player-total-duration');
const playerSliderProgress = document.getElementById('player-slider-progress');
const playerScrubBar = document.getElementById('player-scrub-bar');
const songsListContainer = document.getElementById('songs-list-container');

// Control Buttons
const playerBtnPlay = document.getElementById('player-btn-play');
const playerBtnPrev = document.getElementById('player-btn-prev');
const playerBtnNext = document.getElementById('player-btn-next');
const playerBtnShuffle = document.getElementById('player-btn-shuffle');
const playerBtnHeart = document.getElementById('player-btn-heart');

// Playlists/Genre cards
const playlistAll = document.getElementById('playlist-all');
const playlistRemix = document.getElementById('playlist-remix');
const avatarItems = document.querySelectorAll('.avatar-item');

// Player States
let currentTrackIndex = 0;
let isPlaying = false;
let isShuffle = false;
let isLooping = false;
let currentGenreFilter = 'all';
let filteredTracks = [...TRACKS];
let likedTracks = new Set();

// Helper to format time (e.g. 124s -> 02:04)
function formatTime(time) {
  if (isNaN(time)) return '00:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Render the tracklist scroll view
function renderTracklist() {
  if (!songsListContainer) return;
  songsListContainer.innerHTML = '';
  
  if (currentGenreFilter === 'remix') {
    filteredTracks = TRACKS.filter(t => t.genre === 'remix');
  } else {
    filteredTracks = [...TRACKS];
  }

  filteredTracks.forEach((track, index) => {
    const mainIndex = TRACKS.findIndex(t => t.id === track.id);
    const isActive = mainIndex === currentTrackIndex;

    const row = document.createElement('div');
    row.className = `song-row ${isActive ? 'active' : ''}`;
    row.setAttribute('data-main-index', mainIndex);

    row.innerHTML = `
      <div class="song-row-left">
        <span class="song-number">${(index + 1).toString().padStart(2, '0')}</span>
        <div class="song-thumbnail">
          <img src="${track.cover}" alt="${track.title}" />
        </div>
        <div class="song-info-text">
          <div class="song-title-row">${track.title}</div>
          <div class="song-artist-row">DJ VANZI</div>
        </div>
      </div>
      <span class="song-duration">${track.duration}</span>
    `;

    row.addEventListener('click', () => {
      selectTrack(mainIndex);
    });

    songsListContainer.appendChild(row);
  });
}

// Update play states (UI icons & rotation styles)
function setPlayState(playing) {
  isPlaying = playing;
  if (playing) {
    if (cdDisc) cdDisc.classList.add('playing');
    if (playerBtnPlay) {
      playerBtnPlay.classList.add('playing');
      // Change SVG icon to Pause
      playerBtnPlay.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
    }
  } else {
    if (cdDisc) cdDisc.classList.remove('playing');
    if (playerBtnPlay) {
      playerBtnPlay.classList.remove('playing');
      // Change SVG icon to Play
      playerBtnPlay.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
    }
  }
}

// Play/Pause toggle
function togglePlay() {
  if (!playerAudio) return;
  if (isPlaying) {
    playerAudio.pause();
    setPlayState(false);
  } else {
    // Unlock and play audio
    playerAudio.play().then(() => {
      setPlayState(true);
    }).catch(e => {
      console.warn("Playback blocked/failed: ", e);
      setPlayState(false);
    });
  }
}

// Track selection
function selectTrack(index, forcePlay = true) {
  if (index < 0 || index >= TRACKS.length) return;

  // If selecting the currently active track, toggle play/pause
  if (index === currentTrackIndex && playerAudio.src) {
    if (forcePlay) togglePlay();
    return;
  }
  
  currentTrackIndex = index;
  const track = TRACKS[currentTrackIndex];
  
  // Update UI metadata
  if (playerTrackTitle) playerTrackTitle.textContent = track.title;
  if (playerTrackArtist) playerTrackArtist.textContent = 'DJ VANZI';
  if (playerCoverArt) playerCoverArt.src = track.cover;
  
  // Set source
  if (playerAudio) {
    playerAudio.src = track.src;
    playerAudio.load();
    
    if (forcePlay) {
      setPlayState(true);
      playerAudio.play().then(() => {
        setPlayState(true);
      }).catch(e => {
        console.warn("Playback failed: ", e);
        setPlayState(false);
      });
    } else {
      setPlayState(false);
    }
  }

  // Update top track avatars active state
  avatarItems.forEach((avatar) => {
    const avatarIdx = parseInt(avatar.getAttribute('data-index'));
    if (avatarIdx === currentTrackIndex) {
      avatar.classList.add('active');
    } else {
      avatar.classList.remove('active');
    }
  });

  // Update heart active state
  if (playerBtnHeart) {
    if (likedTracks.has(track.id)) {
      playerBtnHeart.classList.add('liked');
    } else {
      playerBtnHeart.classList.remove('liked');
    }
  }

  // Re-render list
  renderTracklist();
}

// Next skip
function handleNext() {
  let nextIdx = currentTrackIndex;
  
  if (isShuffle) {
    if (filteredTracks.length > 0) {
      const randomFilteredIdx = Math.floor(Math.random() * filteredTracks.length);
      const track = filteredTracks[randomFilteredIdx];
      nextIdx = TRACKS.findIndex(t => t.id === track.id);
    } else {
      nextIdx = Math.floor(Math.random() * TRACKS.length);
    }
  } else {
    if (filteredTracks.length > 0) {
      const currentFilteredIdx = filteredTracks.findIndex(t => t.id === TRACKS[currentTrackIndex].id);
      if (currentFilteredIdx !== -1) {
        const nextFilteredIdx = (currentFilteredIdx + 1) % filteredTracks.length;
        nextIdx = TRACKS.findIndex(t => t.id === filteredTracks[nextFilteredIdx].id);
      } else {
        nextIdx = (currentTrackIndex + 1) % TRACKS.length;
      }
    } else {
      nextIdx = (currentTrackIndex + 1) % TRACKS.length;
    }
  }
  selectTrack(nextIdx, true);
}

// Previous skip
function handlePrev() {
  let prevIdx = currentTrackIndex;
  
  if (filteredTracks.length > 0) {
    const currentFilteredIdx = filteredTracks.findIndex(t => t.id === TRACKS[currentTrackIndex].id);
    if (currentFilteredIdx !== -1) {
      const prevFilteredIdx = (currentFilteredIdx - 1 + filteredTracks.length) % filteredTracks.length;
      prevIdx = TRACKS.findIndex(t => t.id === filteredTracks[prevFilteredIdx].id);
    } else {
      prevIdx = (currentTrackIndex - 1 + TRACKS.length) % TRACKS.length;
    }
  } else {
    prevIdx = (currentTrackIndex - 1 + TRACKS.length) % TRACKS.length;
  }
  selectTrack(prevIdx, true);
}

// Update scrubber slider & circular progress ring
function updateProgress(currentTime, duration) {
  if (isNaN(currentTime) || isNaN(duration) || duration === 0) return;

  if (playerCurrentTime) playerCurrentTime.textContent = formatTime(currentTime);
  if (playerTotalDuration) playerTotalDuration.textContent = formatTime(duration);

  // Update slider width
  const progressPercent = (currentTime / duration) * 100;
  if (playerSliderProgress) playerSliderProgress.style.width = `${progressPercent}%`;

  // Update circular SVG progress ring (circumference = 540.35)
  if (progressRingBar) {
    const circumference = 540.35;
    const offset = circumference - (currentTime / duration) * circumference;
    progressRingBar.style.strokeDashoffset = offset;
  }
}

// Audio Event Handlers
if (playerAudio) {
  playerAudio.addEventListener('timeupdate', () => {
    updateProgress(playerAudio.currentTime, playerAudio.duration);
    
    // Auto-update lyrics based on current playback time
    const track = TRACKS[currentTrackIndex];
    const trackLyrics = LYRICS[track.id] || [
      { time: 0, text: `🎵 Đang phát: ${track.title} 🎵` },
      { time: 10, text: "Giai điệu độc quyền từ DJ VANZI." },
      { time: 25, text: "Trải nghiệm âm thanh tương lai..." }
    ];
    
    let activeText = "";
    for (let i = 0; i < trackLyrics.length; i++) {
      if (playerAudio.currentTime >= trackLyrics[i].time) {
        activeText = trackLyrics[i].text;
      }
    }
    const lyricsDisplay = document.getElementById('player-lyrics-text');
    if (lyricsDisplay && activeText) {
      lyricsDisplay.textContent = activeText;
    }
  });

  playerAudio.addEventListener('loadedmetadata', () => {
    updateProgress(playerAudio.currentTime, playerAudio.duration);
  });

  playerAudio.addEventListener('ended', () => {
    if (isLooping) {
      playerAudio.currentTime = 0;
      playerAudio.play().catch(e => console.warn(e));
    } else {
      handleNext();
    }
  });
}

// Scrubber Click Interaction
if (playerScrubBar) {
  playerScrubBar.addEventListener('click', (e) => {
    if (!playerAudio || !playerAudio.duration) return;
    const rect = playerScrubBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newPercent = clickX / width;
    const newTime = newPercent * playerAudio.duration;
    playerAudio.currentTime = newTime;
    updateProgress(newTime, playerAudio.duration);
  });
}

// Wire Button Event Listeners
if (playerBtnPlay) playerBtnPlay.addEventListener('click', togglePlay);
if (playerBtnNext) playerBtnNext.addEventListener('click', handleNext);
if (playerBtnPrev) playerBtnPrev.addEventListener('click', handlePrev);

if (playerBtnShuffle) {
  playerBtnShuffle.addEventListener('click', () => {
    isShuffle = !isShuffle;
    playerBtnShuffle.classList.toggle('active', isShuffle);
  });
}

if (playerBtnHeart) {
  playerBtnHeart.addEventListener('click', () => {
    const track = TRACKS[currentTrackIndex];
    if (likedTracks.has(track.id)) {
      likedTracks.delete(track.id);
      playerBtnHeart.classList.remove('liked');
    } else {
      likedTracks.add(track.id);
      playerBtnHeart.classList.add('liked');
    }
  });
}

// Avatar items click
avatarItems.forEach((avatar) => {
  avatar.addEventListener('click', () => {
    const idx = parseInt(avatar.getAttribute('data-index'));
    selectTrack(idx, true);
  });
});

// Playlist genre filter triggers
if (playlistAll) {
  playlistAll.addEventListener('click', () => {
    currentGenreFilter = 'all';
    playlistAll.classList.add('active');
    if (playlistRemix) playlistRemix.classList.remove('active');
    renderTracklist();
  });
}

if (playlistRemix) {
  playlistRemix.addEventListener('click', () => {
    currentGenreFilter = 'remix';
    playlistRemix.classList.add('active');
    if (playlistAll) playlistAll.classList.remove('active');
    renderTracklist();
  });
}

// Initial load
selectTrack(0, false);

// ==========================================================================
// 10. Neumorphic Biography & Genre Selector Logic
// ==========================================================================
const GENRES_INFO = [
  {
    title: 'Melodic Techno',
    bpm: '122 - 126 BPM',
    desc: 'Ethereal synth structures, hypnotic arpeggios, and melancholic melodies built over driving basslines.'
  },
  {
    title: 'Tech House',
    bpm: '124 - 128 BPM',
    desc: 'Energetic percussion coupled with minimalist synth hooks and driving grooves designed to keep the dancefloor moving.'
  },
  {
    title: 'Progressive House',
    bpm: '120 - 124 BPM',
    desc: 'Hypnotic, long-form build-ups, layered emotional melodies, and cinematic chord sequences that tell a sonic story.'
  },
  {
    title: 'House',
    bpm: '120 - 125 BPM',
    desc: 'The classic four-on-the-floor beat coupled with soulful vocals, warm chords, and groovy basslines that form the foundation of dance music.'
  },
  {
    title: 'Hard Dance',
    bpm: '150 - 160 BPM',
    desc: 'Fast-paced, high-intensity rhythms characterized by heavy reverse bass, screeching synths, and euphoric melodies.'
  },
  {
    title: 'Psy Trance',
    bpm: '138 - 145 BPM',
    desc: 'Hypnotic rolling basslines combined with psychedelic soundscapes, rapid arpeggiated synth leads, and spiritual themes.'
  },
  {
    title: 'Drum & Bass',
    bpm: '170 - 175 BPM',
    desc: 'Fast syncopated breakbeats integrated with heavy sub-basslines, atmospheric pads, and intense rhythmic structures.'
  },
  {
    title: 'Hiphop',
    bpm: '85 - 100 BPM',
    desc: 'Urban street beats blending boom-bap rhythms or modern trap 808s with melodic samples and atmospheric textures.'
  }
];

function initGenreSelector() {
  const genreButtons = document.querySelectorAll('.genre-btn');
  const genreTitle = document.getElementById('selected-genre-title');
  const genreBpm = document.getElementById('selected-genre-bpm');
  const genreDesc = document.getElementById('selected-genre-desc');

  if (!genreButtons.length || !genreTitle || !genreBpm || !genreDesc) return;

  genreButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      // Remove active states
      genreButtons.forEach(b => {
        b.classList.remove('active');
      });

      // Set active state on clicked
      btn.classList.add('active');

      // Update text
      const idx = parseInt(btn.getAttribute('data-genre-idx'));
      const info = GENRES_INFO[idx];
      if (info) {
        genreTitle.textContent = info.title;
        genreBpm.textContent = info.bpm;
        genreDesc.textContent = info.desc;
      }
    });
  });
}

// Initialize on page load
initGenreSelector();

// ==========================================================================
// 11. Scroll transitions, ambient glows, and scroll-reveal triggers
// ==========================================================================

function initScrollTransitions() {
  // 1. Reveal Elements on Scroll
  const revealElements = document.querySelectorAll('.reveal-element');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px' // Trigger slightly before it fully enters to look responsive
  });

  revealElements.forEach(el => revealObserver.observe(el));

  // 2. Body section classes (for ambient glow position/color shifting) and navbar synchronization
  const sections = [
    { id: 'scanner', class: 'active-scanner' },
    { id: 'releases', class: 'active-releases' },
    { id: 'about', class: 'active-about' },
    { id: 'gallery', class: 'active-gallery' },
    { id: 'extra', class: 'active-extra' }
  ];

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        const currentSection = sections.find(s => s.id === id);
        
        if (currentSection) {
          // Update body class
          sections.forEach(s => document.body.classList.remove(s.class));
          document.body.classList.add(currentSection.class);

          // Synchronize navigation active link
          const navLinks = document.querySelectorAll('.nav-link');
          navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === `#${id}` || (id === 'scanner' && href === '#')) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      }
    });
  }, {
    threshold: 0.3 // Trigger when 30% of the section is visible
  });

  sections.forEach(s => {
    const el = document.getElementById(s.id);
    if (el) sectionObserver.observe(el);
  });
}

// ==========================================================================
// 12. Neumorphic Media Gallery & Lightbox Logic
// ==========================================================================

const GALLERY_IMAGES = [
  {
    src: '/images/f1-racer.jpg',
    title: 'Viet Anh Nguyen F1 Poster',
    subtitle: 'Mercedes AMG Petronas - 2026'
  },
  {
    src: '/images/club-stage.jpg',
    title: 'Kaizen Club Show',
    subtitle: 'Can Tho, Vietnam - 2026'
  },
  {
    src: '/images/hero-portrait.jpg',
    title: 'Noise Off Studio',
    subtitle: 'Promotional Shot - 2026'
  },
  {
    src: '/images/performance-close.jpg',
    title: 'Mainstage Set',
    subtitle: 'Underground Electronic - 2026'
  },
  {
    src: '/images/balenciaga-blue.jpg',
    title: 'Balenciaga Campaign',
    subtitle: 'Fashion Editorial - 2026'
  },
  {
    src: '/images/kaizen-club.jpg',
    title: 'Kaizen Club Performance',
    subtitle: 'Can Tho, Vietnam - 2026'
  },
  {
    src: '/images/friends-booth-1.jpg',
    title: 'Friends Night Club Set',
    subtitle: 'Buon Ma Thuot, Vietnam - 2026'
  },
  {
    src: '/images/friends-stage.jpg',
    title: 'Friends Night Club Stage',
    subtitle: 'Buon Ma Thuot, Vietnam - 2026'
  },
  {
    src: '/images/friends-booth-2.jpg',
    title: 'Friends Club DJ Booth',
    subtitle: 'Buon Ma Thuot, Vietnam - 2026'
  },
  {
    src: '/images/penthouse-portrait.jpg',
    title: 'Penthouse Club Set',
    subtitle: 'Artist Portrait - 2026'
  }
];

// Parallax sticky scroll effects for media gallery
function updateGalleryParallax() {
  const gallerySection = document.getElementById('gallery');
  const blurOverlay = document.getElementById('gallery-blur-overlay');
  const heroText = document.getElementById('gallery-hero-text-elem');

  if (!gallerySection || !blurOverlay) return;

  const rect = gallerySection.getBoundingClientRect();
  const sectionHeight = rect.height;
  const viewportHeight = window.innerHeight;

  // How far the top of the section is from the top of the viewport
  const scrolled = -rect.top;

  if (scrolled >= 0 && scrolled <= sectionHeight - viewportHeight) {
    // We want the overlay blur to start immediately and reach full blur at 450px of scroll
    const maxScroll = 450;
    const progress = Math.min(scrolled / maxScroll, 1);

    const blurValue = progress * 12; // Max 12px blur
    const opacityValue = progress * 0.82; // Max 0.82 opacity

    blurOverlay.style.backdropFilter = `blur(${blurValue}px)`;
    blurOverlay.style.webkitBackdropFilter = `blur(${blurValue}px)`;
    blurOverlay.style.opacity = opacityValue;

    if (heroText) {
      heroText.style.opacity = 1 - progress * 1.5;
      heroText.style.transform = `translateY(${-progress * 40}px)`;
    }
  } else if (scrolled < 0) {
    blurOverlay.style.backdropFilter = 'blur(0px)';
    blurOverlay.style.webkitBackdropFilter = 'blur(0px)';
    blurOverlay.style.opacity = '0';
    if (heroText) {
      heroText.style.opacity = '1';
      heroText.style.transform = 'translateY(0px)';
    }
  } else {
    // Keep fully blurred when below the section scrolling range
    blurOverlay.style.backdropFilter = 'blur(12px)';
    blurOverlay.style.webkitBackdropFilter = 'blur(12px)';
    blurOverlay.style.opacity = '0.82';
    if (heroText) {
      heroText.style.opacity = '0';
    }
  }
}

function initGallery() {
  const grid = document.getElementById('gallery-grid-container');
  if (!grid) return;

  // Filter out Kaizen Club image from the grid to avoid duplication
  const gridImages = GALLERY_IMAGES.filter(img => !img.src.includes('kaizen-club.jpg'));

  grid.innerHTML = gridImages.map((img) => {
    // Find original index in GALLERY_IMAGES array
    const originalIdx = GALLERY_IMAGES.findIndex(orig => orig.src === img.src);
    return `
      <div class="gallery-item reveal-element delay-${(originalIdx % 3) + 1}" data-index="${originalIdx}">
        <div class="gallery-img-wrapper">
          <img src="${img.src}" alt="${img.title}" loading="lazy" />
        </div>
        <div class="gallery-item-details">
          <p>${img.subtitle}</p>
          <h5>${img.title}</h5>
        </div>
      </div>
    `;
  }).join('');

  // Register parallax scroll listener
  window.addEventListener('scroll', updateGalleryParallax, { passive: true });
}

function initLightbox() {
  let currentLightboxIdx = null;
  const lightbox = document.getElementById('gallery-lightbox');
  const mainImg = document.getElementById('lightbox-main-img');
  const title = document.getElementById('lightbox-title');
  const subtitle = document.getElementById('lightbox-subtitle');
  const counter = document.getElementById('lightbox-counter');

  if (!lightbox || !mainImg || !title || !subtitle || !counter) return;

  function openLightbox(idx) {
    currentLightboxIdx = idx;
    const img = GALLERY_IMAGES[idx];
    mainImg.src = img.src;
    title.textContent = img.title;
    subtitle.textContent = img.subtitle;
    counter.textContent = `${idx + 1} / ${GALLERY_IMAGES.length}`;
    lightbox.style.display = 'flex';
    document.body.classList.add('intro-active'); // Lock body scroll during lightbox
  }

  function closeLightbox() {
    lightbox.style.display = 'none';
    document.body.classList.remove('intro-active');
  }

  function navigateLightbox(dir) {
    if (currentLightboxIdx === null) return;
    currentLightboxIdx = (currentLightboxIdx + dir + GALLERY_IMAGES.length) % GALLERY_IMAGES.length;
    openLightbox(currentLightboxIdx);
  }

  // Click handlers
  const items = document.querySelectorAll('.gallery-item');
  items.forEach(item => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.getAttribute('data-index'));
      openLightbox(idx);
    });
  });

  const closeBtn = document.getElementById('lightbox-btn-close');
  const prevBtn = document.getElementById('lightbox-btn-prev');
  const nextBtn = document.getElementById('lightbox-btn-next');

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); navigateLightbox(-1); });
  if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); navigateLightbox(1); });

  lightbox.addEventListener('click', closeLightbox);
  
  const boxElem = document.getElementById('lightbox-box-elem');
  if (boxElem) {
    boxElem.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    if (lightbox.style.display === 'flex') {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') navigateLightbox(-1);
      if (e.key === 'ArrowRight') navigateLightbox(1);
    }
  });
}

// Initial load order: render gallery, bind lightbox, then observe scroll reveals
initGallery();
initLightbox();
initScrollTransitions();
