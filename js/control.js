// control.js
import { 
    db, doc, getDoc, updateDoc, setDoc, serverTimestamp, onSnapshot, isPlaceholder 
} from "./firebase.js";

// --- BACKGROUND CANVAS INTERACTIVE SYSTEM (Copy of script.js background logic) ---
const canvas = document.getElementById("bg-canvas");
const ctx = canvas.getContext("2d");

let width = (canvas.width = window.innerWidth);
let height = (canvas.height = window.innerHeight);

window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
});

const particles = [];
const particleCount = 45;

class Particle {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.45;
        this.vy = (Math.random() - 0.5) * 0.45;
        this.radius = Math.random() * 2.2 + 1.2;
        const colorRand = Math.random();
        if (colorRand > 0.75) {
            this.color = "rgba(0, 229, 255, 0.5)"; // Bright Cyan
        } else if (colorRand > 0.5) {
            this.color = "rgba(0, 136, 255, 0.4)"; // Electric Blue
        } else if (colorRand > 0.25) {
            this.color = "rgba(139, 92, 246, 0.4)"; // Soft Purple
        } else {
            this.color = "rgba(255, 255, 255, 0.55)"; // Elegant White
        }
        this.isQubit = Math.random() > 0.85;
        this.angle = Math.random() * Math.PI * 2;
        this.orbitSpeed = (Math.random() * 0.02 + 0.01) * (Math.random() > 0.5 ? 1 : -1);
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.angle += this.orbitSpeed;
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();

        if (this.isQubit) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 2.8, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(0, 229, 255, 0.12)";
            ctx.lineWidth = 0.5;
            ctx.stroke();

            const ox = this.x + Math.cos(this.angle) * this.radius * 2.8;
            const oy = this.y + Math.sin(this.angle) * this.radius * 2.8;
            ctx.beginPath();
            ctx.arc(ox, oy, 1, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(139, 92, 246, 0.6)";
            ctx.fill();
        }
    }
}

for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
}

function animateBackground() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach((p, idx) => {
        p.update();
        p.draw();
        for (let j = idx + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dx = p.x - p2.x;
            const dy = p.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) {
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.strokeStyle = `rgba(0, 229, 255, ${0.1 * (1 - dist / 120)})`;
                ctx.lineWidth = 0.8;
                ctx.stroke();
            }
        }
    });
    requestAnimationFrame(animateBackground);
}
animateBackground();

// --- LOGGING SYSTEM ---
const logBox = document.getElementById("adminLogBox");
function logMessage(text, type = "info") {
    const entry = document.createElement("div");
    entry.className = `admin-log-entry ${type}`;
    entry.innerHTML = `[${new Date().toLocaleTimeString()}] > ${text}`;
    logBox.appendChild(entry);
    logBox.scrollTop = logBox.scrollHeight;
}

if (isPlaceholder) {
    logMessage("CRITICAL: Firebase SDK is using placeholder credentials! Fill credentials in firebase.js.", "danger");
}

// UI Connection status tracker
function updateConnectionStatus(isConnected) {
    const banner = document.getElementById("connectionError");
    if (banner) {
        if (isConnected) {
            banner.classList.add("hidden");
        } else {
            banner.classList.remove("hidden");
        }
    }
}

// Browser connection status listeners
window.addEventListener("online", () => {
    updateConnectionStatus(true);
    logMessage("Internet connection restored.", "success");
});
window.addEventListener("offline", () => {
    updateConnectionStatus(false);
    logMessage("Internet connection lost.", "danger");
});

// --- FIRESTORE REMOTE CONTROLLER ---
const countdownDateInput = document.getElementById("countdownDate");
const countdownTimeInput = document.getElementById("countdownTime");
const statusBadge = document.getElementById("statusBadge");

const pauseBtn = document.getElementById("pauseBtn");
const resumeBtn = document.getElementById("resumeBtn");
const resetBtn = document.getElementById("resetBtn");
const saveChangesBtn = document.getElementById("saveChangesBtn");
const set24hBtn = document.getElementById("set24hBtn");
const set36hBtn = document.getElementById("set36hBtn");

let activeConfig = null;

function setupDashboardListener() {
    if (isPlaceholder) return;
    const configDocRef = doc(db, "countdown", "config");
    onSnapshot(configDocRef, (snapshot) => {
        updateConnectionStatus(true);
        if (snapshot.exists()) {
            activeConfig = snapshot.data();
            populateInputs(activeConfig);
            updateBadgeUI(activeConfig.status);
            logMessage("Real-time countdown configuration synchronized.", "success");
        } else {
            logMessage("Config document not found. Initializing with defaults...", "warn");
            initializeDefaultDoc();
        }
    }, (error) => {
        console.error("Firestore error:", error);
        logMessage("Firestore Connection Error: " + error.message, "danger");
        updateConnectionStatus(false);
    });
}

async function initializeDefaultDoc() {
    const defaultDoc = {
        year: 2026,
        month: 7,
        day: 30,
        hour: 9,
        minute: 0,
        second: 0,
        status: "running",
        colorMode: "auto",
        paused: false,
        tagline: "36-Hour International Live Hackathon on Quantum Technology",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
    try {
        const configDocRef = doc(db, "countdown", "config");
        await setDoc(configDocRef, defaultDoc);
        logMessage("Default document initialized successfully.", "success");
        updateConnectionStatus(true);
    } catch (e) {
        logMessage("Initialization failed: " + e.message, "danger");
        updateConnectionStatus(false);
    }
}

function populateInputs(config) {
    const pad = (val) => String(val).padStart(2, "0");
    countdownDateInput.value = `${config.year}-${pad(config.month)}-${pad(config.day)}`;
    countdownTimeInput.value = `${pad(config.hour)}:${pad(config.minute)}:${pad(config.second)}`;
}

function updateBadgeUI(status) {
    statusBadge.textContent = status;
    statusBadge.className = "admin-status-badge";
    if (status === "paused") {
        statusBadge.classList.add("paused");
    } else if (status === "completed") {
        statusBadge.classList.add("completed");
    }
}

// Action: Save Changes
saveChangesBtn.addEventListener("click", async () => {
    if (isPlaceholder) return;
    const dateVal = countdownDateInput.value;
    const timeVal = countdownTimeInput.value;
    
    if (!dateVal || !timeVal) {
        logMessage("Failed to save: Date and Time are required.", "danger");
        return;
    }

    const [year, month, day] = dateVal.split("-").map(Number);
    const [hour, minute, second] = timeVal.split(":").map(Number);

    try {
        const configDocRef = doc(db, "countdown", "config");
        await updateDoc(configDocRef, {
            year,
            month,
            day,
            hour,
            minute,
            second: second || 0,
            updatedAt: serverTimestamp()
        });
        logMessage("Countdown configuration saved.", "success");
    } catch (e) {
        logMessage("Failed to save config: " + e.message, "danger");
    }
});

// Action: Pause Countdown
pauseBtn.addEventListener("click", async () => {
    if (isPlaceholder) return;
    if (!activeConfig) return;

    const targetTime = new Date(
        `${activeConfig.year}-${String(activeConfig.month).padStart(2, '0')}-${String(activeConfig.day).padStart(2, '0')}T${String(activeConfig.hour).padStart(2, '0')}:${String(activeConfig.minute).padStart(2, '0')}:${String(activeConfig.second).padStart(2, '0')}+05:30`
    ).getTime();
    
    const now = new Date().getTime();
    const pausedRemaining = Math.max(0, targetTime - now);

    try {
        const configDocRef = doc(db, "countdown", "config");
        await updateDoc(configDocRef, {
            status: "paused",
            paused: true,
            pausedRemaining: pausedRemaining,
            updatedAt: serverTimestamp()
        });
        logMessage(`Countdown paused. Frozen at: ${formatDuration(pausedRemaining)}`, "warn");
    } catch (e) {
        logMessage("Action failed: " + e.message, "danger");
    }
});

// Action: Resume Countdown
resumeBtn.addEventListener("click", async () => {
    if (isPlaceholder) return;
    if (!activeConfig || !activeConfig.paused) {
        logMessage("Cannot resume: System is not paused.", "warn");
        return;
    }

    const now = new Date().getTime();
    const newTargetTime = now + (activeConfig.pausedRemaining || 0);

    // Calculate details in +05:30 offset
    const tzOffset = 5.5 * 60 * 60 * 1000;
    const offsetDate = new Date(newTargetTime + tzOffset);

    const year = offsetDate.getUTCFullYear();
    const month = offsetDate.getUTCMonth() + 1;
    const day = offsetDate.getUTCDate();
    const hour = offsetDate.getUTCHours();
    const minute = offsetDate.getUTCMinutes();
    const second = offsetDate.getUTCSeconds();

    try {
        const configDocRef = doc(db, "countdown", "config");
        await updateDoc(configDocRef, {
            year,
            month,
            day,
            hour,
            minute,
            second,
            status: "running",
            paused: false,
            pausedRemaining: 0,
            updatedAt: serverTimestamp()
        });
        logMessage("Countdown resumed.", "success");
    } catch (e) {
        logMessage("Action failed: " + e.message, "danger");
    }
});

// Action: Reset Countdown
resetBtn.addEventListener("click", async () => {
    if (isPlaceholder) return;
    try {
        const configDocRef = doc(db, "countdown", "config");
        await updateDoc(configDocRef, {
            year: 2026,
            month: 7,
            day: 30,
            hour: 9,
            minute: 0,
            second: 0,
            status: "running",
            paused: false,
            pausedRemaining: 0,
            colorMode: "auto",
            tagline: "36-Hour International Live Hackathon on Quantum Technology",
            updatedAt: serverTimestamp()
        });
        logMessage("Countdown reset to default values (July 30, 2026 09:00:00).", "success");
    } catch (e) {
        logMessage("Action failed: " + e.message, "danger");
    }
});

// Action: SET 24 HOUR COUNTDOWN
set24hBtn.addEventListener("click", async () => {
    if (isPlaceholder) return;
    
    // Read local time
    const now = new Date();
    // Add exactly 24 hours
    const targetTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const year = targetTime.getFullYear();
    const month = targetTime.getMonth() + 1;
    const day = targetTime.getDate();
    const hour = targetTime.getHours();
    const minute = targetTime.getMinutes();
    const second = targetTime.getSeconds();
    
    try {
        const configDocRef = doc(db, "countdown", "config");
        await updateDoc(configDocRef, {
            year,
            month,
            day,
            hour,
            minute,
            second,
            status: "running",
            paused: false,
            pausedRemaining: 0,
            updatedAt: serverTimestamp()
        });
        logMessage(`Countdown target set to 24 hours from now (${year}-${month}-${day} ${hour}:${minute}:${second}).`, "success");
    } catch (e) {
        logMessage("Action failed: " + e.message, "danger");
    }
});

// Action: SET 36 HOUR COUNTDOWN
set36hBtn.addEventListener("click", async () => {
    if (isPlaceholder) return;
    
    // Read local time
    const now = new Date();
    // Add exactly 36 hours
    const targetTime = new Date(now.getTime() + 36 * 60 * 60 * 1000);
    
    const year = targetTime.getFullYear();
    const month = targetTime.getMonth() + 1;
    const day = targetTime.getDate();
    const hour = targetTime.getHours();
    const minute = targetTime.getMinutes();
    const second = targetTime.getSeconds();
    
    try {
        const configDocRef = doc(db, "countdown", "config");
        await updateDoc(configDocRef, {
            year,
            month,
            day,
            hour,
            minute,
            second,
            status: "running",
            paused: false,
            pausedRemaining: 0,
            updatedAt: serverTimestamp()
        });
        logMessage(`Countdown target set to 36 hours from now (${year}-${month}-${day} ${hour}:${minute}:${second}).`, "success");
    } catch (e) {
        logMessage("Action failed: " + e.message, "danger");
    }
});

// Action: Quick Countdown Buttons
document.querySelectorAll(".quick-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
        if (isPlaceholder) return;
        
        let msToAdd = 0;
        if (btn.dataset.hours) {
            msToAdd = Number(btn.dataset.hours) * 60 * 60 * 1000;
        } else if (btn.dataset.mins) {
            msToAdd = Number(btn.dataset.mins) * 60 * 1000;
        } else {
            return;
        }
        
        const now = new Date();
        const targetTime = new Date(now.getTime() + msToAdd);
        
        const year = targetTime.getFullYear();
        const month = targetTime.getMonth() + 1;
        const day = targetTime.getDate();
        const hour = targetTime.getHours();
        const minute = targetTime.getMinutes();
        const second = targetTime.getSeconds();
        
        try {
            const configDocRef = doc(db, "countdown", "config");
            await updateDoc(configDocRef, {
                year,
                month,
                day,
                hour,
                minute,
                second,
                status: "running",
                paused: false,
                pausedRemaining: 0,
                updatedAt: serverTimestamp()
            });
            logMessage(`Countdown target increased by ${btn.textContent.trim()} from now (${year}-${month}-${day} ${hour}:${minute}:${second}).`, "success");
        } catch (e) {
            logMessage("Action failed: " + e.message, "danger");
        }
    });
});

// Action: Quick Timer Buttons
document.querySelectorAll(".quick-timer-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
        if (isPlaceholder) return;
        
        let msToAdd = 0;
        if (btn.dataset.timerHours) {
            msToAdd = Number(btn.dataset.timerHours) * 60 * 60 * 1000;
        } else {
            return;
        }
        
        const now = new Date();
        const targetTime = new Date(now.getTime() + msToAdd);
        
        const year = targetTime.getFullYear();
        const month = targetTime.getMonth() + 1;
        const day = targetTime.getDate();
        const hour = targetTime.getHours();
        const minute = targetTime.getMinutes();
        const second = targetTime.getSeconds();
        
        try {
            const configDocRef = doc(db, "countdown", "config");
            await updateDoc(configDocRef, {
                year,
                month,
                day,
                hour,
                minute,
                second,
                status: "running",
                paused: false,
                pausedRemaining: 0,
                updatedAt: serverTimestamp()
            });
            logMessage(`Quick timer set target to ${btn.textContent.trim()} from now (${year}-${month}-${day} ${hour}:${minute}:${second}).`, "success");
        } catch (e) {
            logMessage("Action failed: " + e.message, "danger");
        }
    });
});

// Action: Quick Action RESET
const quickResetBtn = document.getElementById("quickResetBtn");
if (quickResetBtn) {
    quickResetBtn.addEventListener("click", async () => {
        if (isPlaceholder) return;
        try {
            const configDocRef = doc(db, "countdown", "config");
            await updateDoc(configDocRef, {
                year: 2026,
                month: 7,
                day: 30,
                hour: 9,
                minute: 0,
                second: 0,
                status: "running",
                paused: false,
                pausedRemaining: 0,
                colorMode: "auto",
                tagline: "36-Hour International Live Hackathon on Quantum Technology",
                updatedAt: serverTimestamp()
            });
            logMessage("Countdown reset to default values (July 30, 2026 09:00:00).", "success");
        } catch (e) {
            logMessage("Action failed: " + e.message, "danger");
        }
    });
}

// Action: System Status controls
document.querySelectorAll(".status-control-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
        if (isPlaceholder) return;
        if (!activeConfig) return;
        
        const configDocRef = doc(db, "countdown", "config");
        
        if (btn.dataset.status === "running") {
            // Check if it was paused to calculate resumed date
            if (activeConfig.paused) {
                const now = new Date().getTime();
                const newTargetTime = now + (activeConfig.pausedRemaining || 0);
                const tzOffset = 5.5 * 60 * 60 * 1000;
                const offsetDate = new Date(newTargetTime + tzOffset);
                
                const year = offsetDate.getUTCFullYear();
                const month = offsetDate.getUTCMonth() + 1;
                const day = offsetDate.getUTCDate();
                const hour = offsetDate.getUTCHours();
                const minute = offsetDate.getUTCMinutes();
                const second = offsetDate.getUTCSeconds();
                
                try {
                    await updateDoc(configDocRef, {
                        year,
                        month,
                        day,
                        hour,
                        minute,
                        second,
                        status: "running",
                        paused: false,
                        pausedRemaining: 0,
                        updatedAt: serverTimestamp()
                    });
                    logMessage("System Status set to RUNNING (resumed countdown).", "success");
                } catch (e) {
                    logMessage("Action failed: " + e.message, "danger");
                }
            } else {
                try {
                    await updateDoc(configDocRef, {
                        status: "running",
                        paused: false,
                        pausedRemaining: 0,
                        updatedAt: serverTimestamp()
                    });
                    logMessage("System Status set to RUNNING.", "success");
                } catch (e) {
                    logMessage("Action failed: " + e.message, "danger");
                }
            }
        } else if (btn.dataset.status === "paused") {
            const targetTime = new Date(
                `${activeConfig.year}-${String(activeConfig.month).padStart(2, '0')}-${String(activeConfig.day).padStart(2, '0')}T${String(activeConfig.hour).padStart(2, '0')}:${String(activeConfig.minute).padStart(2, '0')}:${String(activeConfig.second).padStart(2, '0')}+05:30`
            ).getTime();
            const now = new Date().getTime();
            const pausedRemaining = Math.max(0, targetTime - now);
            
            try {
                await updateDoc(configDocRef, {
                    status: "paused",
                    paused: true,
                    pausedRemaining: pausedRemaining,
                    updatedAt: serverTimestamp()
                });
                logMessage("System Status set to PAUSED.", "warn");
            } catch (e) {
                logMessage("Action failed: " + e.message, "danger");
            }
        } else if (btn.dataset.status === "completed") {
            try {
                await updateDoc(configDocRef, {
                    status: "completed",
                    updatedAt: serverTimestamp()
                });
                logMessage("System Status set to FINISHED.", "danger");
            } catch (e) {
                logMessage("Action failed: " + e.message, "danger");
            }
        } else if (btn.dataset.color === "auto") {
            try {
                await updateDoc(configDocRef, {
                    colorMode: "auto",
                    updatedAt: serverTimestamp()
                });
                logMessage("System Status set to AUTO COLOR.", "success");
            } catch (e) {
                logMessage("Action failed: " + e.message, "danger");
            }
        }
    });
});

// Helper duration formatting
function formatDuration(ms) {
    if (ms <= 0) return "00:00:00";
    const totalSecs = Math.floor(ms / 1000);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Check on startup if config doc exists, then setup listener
async function initController() {
    if (isPlaceholder) return;
    try {
        const configDocRef = doc(db, "countdown", "config");
        const snapshot = await getDoc(configDocRef);
        if (!snapshot.exists()) {
            logMessage("Document does not exist. Initializing...", "warn");
            await initializeDefaultDoc();
        }
        setupDashboardListener();
    } catch (e) {
        logMessage("Failed to connect: " + e.message, "danger");
        updateConnectionStatus(false);
    }
}

initController();
