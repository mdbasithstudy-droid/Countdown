import { db, doc, onSnapshot, getDoc, setDoc, serverTimestamp, isPlaceholder } from "./firebase.js";

// Default local configuration fallback if Firebase is not configured
const FALLBACK_CONFIG = {
    year: 2026,
    month: 7,
    day: 9,
    hour: 9,
    minute: 0,
    second: 0
};

const FALLBACK_TARGET = new Date(
    `${FALLBACK_CONFIG.year}-${String(FALLBACK_CONFIG.month).padStart(2, '0')}-${String(FALLBACK_CONFIG.day).padStart(2, '0')}T${String(FALLBACK_CONFIG.hour).padStart(2, '0')}:${String(FALLBACK_CONFIG.minute).padStart(2, '0')}:${String(FALLBACK_CONFIG.second).padStart(2, '0')}+05:30`
).getTime();

// Current active state
let countdownState = {
    targetTime: FALLBACK_TARGET,
    status: "running",
    paused: false,
    pausedRemaining: 0,
    colorMode: "auto",
    tagline: "Dive Beyond Limits"
};

// Low-end device detection (Aggressively targets 2GB-4GB RAM devices and mobile phones)
const isPerformanceMode = (function() {
    if (typeof navigator === "undefined" || typeof window === "undefined") return false;
    // 1. Check user preference for reduced motion
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
    // 2. Check device memory (<= 4 GB covers 2GB-4GB RAM phones as requested)
    if (navigator.deviceMemory && navigator.deviceMemory <= 4) return true;
    // 3. Check hardware concurrency (<= 4 cores is typical for low-to-mid range processors)
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) return true;
    // 4. Check User Agent for Android/iOS mobile devices to aggressively optimize phones
    const ua = navigator.userAgent.toLowerCase();
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    const isMobileScreen = window.innerWidth <= 1024 || window.innerHeight <= 1024;
    if (isMobileDevice || isMobileScreen) {
        // Automatically enable on mobile unless it's an exceptional high-end phone
        const isHighEndMobile = (navigator.deviceMemory && navigator.deviceMemory > 4) && 
                                (navigator.hardwareConcurrency && navigator.hardwareConcurrency > 6);
        if (!isHighEndMobile) return true;
    }
    return false;
})();

// Automatically apply class to body once DOM is ready
if (isPerformanceMode) {
    if (document.body) {
        document.body.classList.add("performance-mode");
    } else {
        document.addEventListener("DOMContentLoaded", () => {
            document.body.classList.add("performance-mode");
        });
    }
}

// Cached DOM elements
let cachedConnectionError = null;
let cachedTaglineEl = null;
let cachedCompletedOverlay = null;
let cachedSegmentsList = null;

// UI Connection status tracker
function updateConnectionStatus(isConnected) {
    if (!cachedConnectionError) {
        cachedConnectionError = document.getElementById("connectionError");
    }
    if (cachedConnectionError) {
        if (isConnected) {
            cachedConnectionError.classList.add("hidden");
        } else {
            cachedConnectionError.classList.remove("hidden");
        }
    }
}

// Browser connection status listeners
window.addEventListener("online", () => updateConnectionStatus(true));
window.addEventListener("offline", () => updateConnectionStatus(false));

// Automatically initialize the Firestore document if it does not exist
async function ensureFirestoreConfig() {
    if (isPlaceholder) return;
    const docRef = doc(db, "countdown", "config");
    try {
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) {
            console.log("Config document does not exist in Firestore. Creating with defaults...");
            await setDoc(docRef, {
                year: 2026,
                month: 7,
                day: 9,
                hour: 9,
                minute: 0,
                second: 0,
                status: "running",
                colorMode: "auto",
                paused: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            console.log("Config document initialized successfully.");
        }
        updateConnectionStatus(true);
    } catch (error) {
        console.error("Error checking/creating config document: ", error);
        updateConnectionStatus(false);
    }
}

// Realtime sync listener with error fallback for offline connection loss message
function startRealtimeSync() {
    if (isPlaceholder) return;
    const docRef = doc(db, "countdown", "config");
    onSnapshot(docRef, (snapshot) => {
        updateConnectionStatus(true);
        if (snapshot.exists()) {
            const data = snapshot.data();
            const year = data.year ?? FALLBACK_CONFIG.year;
            const month = data.month ?? FALLBACK_CONFIG.month;
            const day = data.day ?? FALLBACK_CONFIG.day;
            const hour = data.hour ?? FALLBACK_CONFIG.hour;
            const minute = data.minute ?? FALLBACK_CONFIG.minute;
            const second = data.second ?? FALLBACK_CONFIG.second;

            const targetTime = new Date(
                `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}+05:30`
            ).getTime();

            countdownState = {
                targetTime: targetTime,
                status: data.status || "running",
                paused: data.paused || false,
                pausedRemaining: data.pausedRemaining || 0,
                colorMode: data.colorMode || "auto",
                tagline: data.tagline || "Dive Beyond Limits"
            };

            updateCountdown();
        }
    }, (error) => {
        console.error("Firestore sync error: ", error);
        updateConnectionStatus(false);
    });
}

// Call configuration setup and start sync listener
ensureFirestoreConfig().then(startRealtimeSync);

// 2. LOADING SCREEN EMULATION
const loaderWrapper = document.getElementById("loaderWrapper");
const loaderPercentage = document.getElementById("loaderPercentage");
const loaderRingFill = document.getElementById("loaderRingFill");
const terminalLine = document.getElementById("terminalLine");
const terminalStatus = document.getElementById("terminalStatus");
const appContainer = document.getElementById("appContainer");

const loadingTasks = [
    { text: "INITIALIZING AI CORE SYSTEM...", duration: 800 },
    { text: "LOADING ROBOTICS MODULES...", duration: 800 },
    { text: "CALIBRATING GYRO & SENSORS...", duration: 600 },
    { text: "CONNECTING VLSI NETWORK...", duration: 900 },
    { text: "MAPPING INTEGRATED CIRCUITS...", duration: 700 },
    { text: "ESTABLISHING SECURE PROTOCOLS...", duration: 500 },
    { text: "SYSTEM READY", duration: 400 }
];

let currentTaskIndex = 0;
let progress = 0;

function runLoader() {
    if (currentTaskIndex >= loadingTasks.length) {
        // Complete loading
        setTimeout(() => {
            loaderWrapper.style.opacity = "0";
            loaderWrapper.style.visibility = "hidden";
            appContainer.classList.remove("hidden");
            // Initialize main page interactive animations
            initMainApp();
        }, 600);
        return;
    }

    const task = loadingTasks[currentTaskIndex];
    terminalLine.textContent = task.text;
    terminalStatus.textContent = "[BUSY]";
    terminalStatus.style.color = "#0088FF";

    let stepProgress = 0;
    const targetProgress = Math.min(100, Math.floor(((currentTaskIndex + 1) / loadingTasks.length) * 100));
    const startProgress = progress;
    const stepTime = task.duration / (targetProgress - startProgress);

    const interval = setInterval(() => {
        if (progress >= targetProgress) {
            clearInterval(interval);
            terminalStatus.textContent = "[OK]";
            terminalStatus.style.color = "#00E5FF";
            currentTaskIndex++;
            setTimeout(runLoader, 200);
        } else {
            progress++;
            loaderPercentage.textContent = `${String(progress).padStart(2, '0')}%`;
            
            // SVG dashoffset update (283 is the total stroke dasharray of the circle)
            const offset = 283 - (283 * progress) / 100;
            loaderRingFill.style.strokeDashoffset = offset;
        }
    }, stepTime);
}

// Start Loader sequence
window.addEventListener("DOMContentLoaded", runLoader);

// 3. BACKGROUND CANVAS INTERACTIVE SYSTEM (PCB Circuits & Particles)
const canvas = document.getElementById("bg-canvas");
const ctx = canvas.getContext("2d");

let width = (canvas.width = window.innerWidth);
let height = (canvas.height = window.innerHeight);

const mouse = {
    x: null,
    y: null,
    radius: 120
};

// Handle window resizing
window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
});

// Capture mouse movements for background canvas interaction
window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

window.addEventListener("mouseleave", () => {
    mouse.x = null;
    mouse.y = null;
});

// Particles Configuration (Reduce count by > 80% under performance mode)
const particles = [];
const particleCount = isPerformanceMode ? 12 : 65;

class Particle {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.radius = Math.random() * 2 + 1;
        this.color = Math.random() > 0.5 ? "rgba(0, 229, 255, 0.4)" : "rgba(0, 136, 255, 0.3)";
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce back from boundaries
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        // Interaction with mouse
        if (mouse.x !== null && mouse.y !== null) {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < mouse.radius) {
                const force = (mouse.radius - dist) / mouse.radius;
                const angle = Math.atan2(dy, dx);
                this.x -= Math.cos(angle) * force * 1.5;
                this.y -= Math.sin(angle) * force * 1.5;
            }
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}

// Generate Static PCB Traces (Reduce complexity under performance mode)
const traces = [];
const traceCount = isPerformanceMode ? 2 : 12;

class PCBTrace {
    constructor() {
        this.init();
    }

    init() {
        this.points = [];
        this.activePoint = 0;
        this.progress = 0;
        this.speed = Math.random() * 0.02 + 0.01;

        // Define circuit path starting from borders
        let cx = Math.random() > 0.5 ? 0 : width;
        let cy = Math.random() * height;
        this.points.push({ x: cx, y: cy });

        // Add 3-4 segments of 45/90 degrees
        const segments = Math.floor(Math.random() * 3) + 3;
        for (let i = 0; i < segments; i++) {
            const length = Math.random() * 150 + 50;
            const angleType = Math.floor(Math.random() * 4); // 0: 0, 1: 90, 2: 45, 3: -45
            let nextX = cx;
            let nextY = cy;

            if (angleType === 0) {
                nextX = cx + (cx < width / 2 ? length : -length);
            } else if (angleType === 1) {
                nextY = cy + (cy < height / 2 ? length : -length);
            } else if (angleType === 2) {
                const offset = length * 0.707;
                nextX = cx + (cx < width / 2 ? offset : -offset);
                nextY = cy + (cy < height / 2 ? offset : -offset);
            } else {
                const offset = length * 0.707;
                nextX = cx + (cx < width / 2 ? offset : -offset);
                nextY = cy + (cy > height / 2 ? -offset : offset);
            }

            // Bind values to viewport
            nextX = Math.max(10, Math.min(width - 10, nextX));
            nextY = Math.max(10, Math.min(height - 10, nextY));

            this.points.push({ x: nextX, y: nextY });
            cx = nextX;
            cy = nextY;
        }
    }

    update() {
        this.progress += this.speed;
        if (this.progress >= 1) {
            this.progress = 0;
            this.activePoint++;
            if (this.activePoint >= this.points.length - 1) {
                this.init(); // Reset to new path
            }
        }
    }

    draw() {
        // Draw static path lines
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        ctx.strokeStyle = "rgba(0, 136, 255, 0.04)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw glowing nodes at connections
        for (let i = 0; i < this.points.length; i++) {
            ctx.beginPath();
            ctx.arc(this.points[i].x, this.points[i].y, 2, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(0, 229, 255, 0.1)";
            ctx.fill();
        }

        // Draw animated pulse trace
        if (this.activePoint < this.points.length - 1) {
            const p1 = this.points[this.activePoint];
            const p2 = this.points[this.activePoint + 1];
            
            const currentX = p1.x + (p2.x - p1.x) * this.progress;
            const currentY = p1.y + (p2.y - p1.y) * this.progress;

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(currentX, currentY);
            ctx.strokeStyle = "rgba(0, 229, 255, 0.6)";
            ctx.lineWidth = 2;
            if (!isPerformanceMode) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = "#00E5FF";
            }
            ctx.stroke();
            if (!isPerformanceMode) {
                ctx.shadowBlur = 0; // reset shadow
            }

            // Glowing moving head
            ctx.beginPath();
            ctx.arc(currentX, currentY, 3, 0, Math.PI * 2);
            ctx.fillStyle = "#F8FAFC";
            if (!isPerformanceMode) {
                ctx.shadowBlur = 8;
                ctx.shadowColor = "#00E5FF";
            }
            ctx.fill();
            if (!isPerformanceMode) {
                ctx.shadowBlur = 0;
            }
        }
    }
}

// Populate systems
for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
}
for (let i = 0; i < traceCount; i++) {
    traces.push(new PCBTrace());
}

// Viewport visibility flags for pausing off-screen animations
let isCanvasVisible = true;
let isCountdownVisible = true;

// Background Animation Loop
function animateBackground() {
    if (!isCanvasVisible) {
        requestAnimationFrame(animateBackground);
        return;
    }

    ctx.clearRect(0, 0, width, height);

    // Draw Traces
    traces.forEach((trace) => {
        trace.update();
        trace.draw();
    });

    // Draw and Connect Particles
    particles.forEach((p, idx) => {
        p.update();
        p.draw();

        // Connect lines only in Full Mode to maximize CPU performance
        if (!isPerformanceMode) {
            // Check distance to other particles and connect
            for (let j = idx + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 100) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(0, 229, 255, ${0.12 * (1 - dist / 100)})`;
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }
        }
    });

    requestAnimationFrame(animateBackground);
}

// 4. LIVE COUNTDOWN TIMER ENGINE
const segments = {
    hours: { container: document.getElementById("digits-hours") },
    minutes: { container: document.getElementById("digits-minutes") },
    seconds: { container: document.getElementById("digits-seconds") }
};

// Helper to create split-flap digit HTML structure with cached numEl
function createFlipDigit(value) {
    const digitEl = document.createElement("div");
    digitEl.className = "flip-digit";
    digitEl.innerHTML = `<span class="digit-num">${value}</span>`;
    digitEl._numEl = digitEl.querySelector(".digit-num");
    return digitEl;
}

// Function to update a split-flap digit card with 3D folding animation
function updateFlipDigit(digitEl, newValue) {
    if (!digitEl._numEl) {
        digitEl._numEl = digitEl.querySelector(".digit-num");
    }
    const numEl = digitEl._numEl;
    const oldValue = numEl.textContent;
    if (oldValue === newValue) return; // No change, keep still

    // Trigger folding animation
    numEl.classList.remove("flipping");
    void numEl.offsetWidth; // Trigger reflow
    numEl.classList.add("flipping");

    // Swap text content exactly at the 90-degree flat angle (45% mark)
    setTimeout(() => {
        numEl.textContent = newValue;
    }, 225); // Half of 500ms animation duration
}

// Check and adjust structure length dynamically
function syncSegmentDigits(segmentKey, targetString) {
    const seg = segments[segmentKey];
    const container = seg.container;
    const targetLength = targetString.length;
    
    // Add/remove digit elements to match target length
    while (container.children.length < targetLength) {
        const nextVal = targetString[container.children.length];
        const newDigit = createFlipDigit(nextVal);
        container.appendChild(newDigit);
    }
    while (container.children.length > targetLength) {
        container.removeChild(container.lastChild);
    }

    // Update each digit card
    for (let i = 0; i < targetLength; i++) {
        const digitEl = container.children[i];
        updateFlipDigit(digitEl, targetString[i]);
    }
}

function updateCountdown() {
    const now = new Date().getTime();
    let distance = 0;

    const isPaused = countdownState.status === "paused";
    if (isPaused) {
        distance = countdownState.pausedRemaining;
    } else {
        distance = countdownState.targetTime - now;
    }

    const twoHours = 2 * 60 * 60 * 1000;
    const oneHour = 1 * 60 * 60 * 1000;
    let targetMode = "blue-mode";

    if (countdownState.colorMode === "blue") {
        targetMode = "blue-mode";
    } else if (countdownState.colorMode === "orange") {
        targetMode = "warning-mode";
    } else if (countdownState.colorMode === "red") {
        targetMode = "critical-mode";
    } else {
        // Auto Mode
        if (distance <= oneHour) {
            targetMode = "critical-mode";
        } else if (distance <= twoHours) {
            targetMode = "warning-mode";
        } else {
            targetMode = "blue-mode";
        }
    }

    // Dynamically apply stylesheet class overrides on body without overwriting performance-mode
    const currentMode = document.body.classList.contains("blue-mode") ? "blue-mode" :
                        document.body.classList.contains("warning-mode") ? "warning-mode" :
                        document.body.classList.contains("critical-mode") ? "critical-mode" : "";
    if (currentMode !== targetMode) {
        if (currentMode) {
            document.body.classList.remove(currentMode);
        }
        document.body.classList.add(targetMode);
    }

    // Tagline management
    if (!cachedTaglineEl) {
        cachedTaglineEl = document.querySelector(".tagline");
    }
    if (cachedTaglineEl) {
        const targetTagline = countdownState.tagline || "Dive Beyond Limits";
        if (cachedTaglineEl.textContent !== targetTagline) {
            cachedTaglineEl.textContent = targetTagline;
        }
    }

    if (!cachedCompletedOverlay) {
        cachedCompletedOverlay = document.getElementById("completedOverlay");
    }
    if (!cachedSegmentsList) {
        cachedSegmentsList = document.querySelectorAll(".countdown-segment, .countdown-divider");
    }

    const isCompleted = distance <= 0 || countdownState.status === "completed";

    if (isCompleted) {
        // Hide segments
        cachedSegmentsList.forEach(el => {
            if (el.style.display !== "none") el.style.display = "none";
        });
        if (cachedCompletedOverlay && !cachedCompletedOverlay.classList.contains("active")) {
            cachedCompletedOverlay.classList.add("active");
        }
        if (!document.body.classList.contains("critical-mode")) {
            document.body.classList.remove("blue-mode", "warning-mode");
            document.body.classList.add("critical-mode");
        }
        return;
    } else {
        // Show segments
        cachedSegmentsList.forEach(el => {
            if (el.style.display !== "") el.style.display = "";
        });
        if (cachedCompletedOverlay && cachedCompletedOverlay.classList.contains("active")) {
            cachedCompletedOverlay.classList.remove("active");
        }
    }

    // Calculations
    const h = Math.floor(distance / (1000 * 60 * 60));
    const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const s_val = Math.floor((distance % (1000 * 60)) / 1000);

    // Format values
    const formatted = {
        hours: String(h).padStart(2, "0"),
        minutes: String(m).padStart(2, "0"),
        seconds: String(s_val).padStart(2, "0")
    };

    // Update each segment digits
    syncSegmentDigits("hours", formatted.hours);
    syncSegmentDigits("minutes", formatted.minutes);
    syncSegmentDigits("seconds", formatted.seconds);
}

// 5. INITIALIZE MAIN APP
function initMainApp() {
    // Cache DOM references
    cachedTaglineEl = document.querySelector(".tagline");
    cachedCompletedOverlay = document.getElementById("completedOverlay");
    cachedSegmentsList = document.querySelectorAll(".countdown-segment, .countdown-divider");
    cachedConnectionError = document.getElementById("connectionError");

    // Setup intersection observer to pause off-screen animations
    const countdownSection = document.querySelector(".countdown-section");
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.target === canvas) {
                isCanvasVisible = entry.isIntersecting;
            } else if (entry.target === countdownSection) {
                isCountdownVisible = entry.isIntersecting;
                if (entry.isIntersecting) {
                    entry.target.classList.remove("off-screen");
                } else {
                    entry.target.classList.add("off-screen");
                }
            }
        });
    }, { threshold: 0.05 });

    if (canvas) {
        observer.observe(canvas);
    }
    if (countdownSection) {
        observer.observe(countdownSection);
    }

    // Start background simulation
    animateBackground();

    // Start live countdown interval
    updateCountdown();
    setInterval(updateCountdown, 1000);
}
