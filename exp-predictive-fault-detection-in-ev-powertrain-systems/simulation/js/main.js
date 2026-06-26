// --- Canvas Compatibility Polyfill ---
if (typeof CanvasRenderingContext2D.prototype.roundRect !== 'function') {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        if (typeof r === 'undefined') r = 0;
        if (typeof r === 'number') {
            r = { tl: r, tr: r, br: r, bl: r };
        } else if (Array.isArray(r)) {
            r = { tl: r[0], tr: r[1] || r[0], br: r[2] || r[0], bl: r[3] || r[1] || r[0] };
        } else {
            r = Object.assign({ tl: 0, tr: 0, br: 0, bl: 0 }, r);
        }
        this.beginPath();
        this.moveTo(x + r.tl, y);
        this.lineTo(x + w - r.tr, y);
        this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
        this.lineTo(x + w, y + h - r.br);
        this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
        this.lineTo(x + r.bl, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
        this.lineTo(x, y + r.tl);
        this.quadraticCurveTo(x, y, x + r.tl, y);
        this.closePath();
        return this;
    };
}

// --- Simulation State ---
const state = {
    speed: 500.0,          
    temperature: 30.0,     
    coolantFlow: 0.0,      
    brakeForce: 0.0,       
    efficiency: 95.0,      
    torque: 120.0,         
    outputPower: 6.28,     
    lossBaseline: 0.0,
    lossThermal: 0.0,      
    lossDrag: 0.0,         
    lossEmi: 0.0,          
    noise: 0.2,            
    meltdownTimer: 0.0,
    isMeltdown: false,
    isSpaceBarPressed: false,
    filterRadius: 0.0,
    flags: {
        overheat: false,
        fault: false
    }
};

// Global variables for simulation
let isPowerOn = false;
let rpm = state.speed;
let temperature = state.temperature;
let coolantFlow = state.coolantFlow;
let brakeForce = state.brakeForce;
let efficiency = state.efficiency;
let torque = state.torque;
let outputPower = state.outputPower;
let lossBaseline = state.lossBaseline;
let lossThermal = state.lossThermal;
let lossDrag = state.lossDrag;
let lossEmi = state.lossEmi;
let noise = state.noise;
let meltdownTimer = state.meltdownTimer;
let isMeltdown = state.isMeltdown;
let isSpaceBarPressed = state.isSpaceBarPressed;
let filterRadius = state.filterRadius;

// Lap simulation control variables
let isPaused = false;
let lapTimeRemaining = 30.0;
let currentLap = 1;
let isTerminated = false; // flag indicating lap has finished

// Zero-Point Field Stabilizer Calibration Mounts (Primary Core + 4 Quadrant Mounts)
const seats = [
    { id: 0, name: "PRIMARY CORE", x: 145, y: 130, isLocked: true, defaultWeight: 75 },
    { id: 1, name: "ALPHA MOUNT", x: 205, y: 130, isLocked: false },
    { id: 2, name: "BETA MOUNT", x: 145, y: 195, isLocked: false },
    { id: 3, name: "GAMMA MOUNT", x: 205, y: 195, isLocked: false },
    { id: 4, name: "DELTA MOUNT", x: 175, y: 195, isLocked: false }
];

let activeWeights = [];
let draggedWeight = null;
let payloadMass = 75.0; // starts with 75kg driver

// Canvas setup
const canvas = document.getElementById('core-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
const canvasContainer = document.getElementById('canvas-container');
const appContainer = document.getElementById('app-container');

// Sharp canvas on high-DPI displays
if (canvas && ctx) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 500 * dpr;
    canvas.height = 500 * dpr;
    ctx.scale(dpr, dpr);
}

// Event binds
const resetButton = document.getElementById('reset-button');
const modalResetBtn = document.getElementById('modal-reset-btn');
const meltdownModal = document.getElementById('meltdown-modal');
const meltdownCause = document.getElementById('meltdown-cause');
const meltdownTime = document.getElementById('meltdown-time');
const meltdownMaxRpm = document.getElementById('meltdown-max-rpm');
const meltdownMaxTemp = document.getElementById('meltdown-max-temp');
const destabilizationWarning = document.getElementById('destabilization-warning');
const countdownTimer = document.getElementById('countdown-timer');

const btnExplanation = document.getElementById('btn-explanation');
const btnReturn = document.getElementById('btn-return');
const explanationPanel = document.getElementById('explanation-panel');
const btnMainSnapshot = document.getElementById('btn-main-snapshot');

// Mobile support detection and state variables
const isMobile = window.matchMedia("(pointer: coarse)").matches || 
                 /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                 window.innerWidth <= 960;
let isMobileFilterActive = false;

// Physics interaction variables
let isSpinning = false;
let isDraggingCoolant = false;
let isDraggingBrake = false;
let spinAngle = 0.0;
let lastMouseAngle = 0.0;
let lastMouseTime = 0.0;

// Multi-touch tracking IDs
let coolantTouchId = null;
let brakeTouchId = null;
let weightTouchId = null;
let rotorTouchId = null;

// Stats logging
const stats = {
    runTime: 0.0,
    maxRpm: 500.0,
    maxTemp: 30.0
};

// Dynamic Vibration Center
let CX = 335;
let CY = 320;

// Particles
let sparkParticles = [];
let coolantParticles = [];
let explosionParticles = [];

function initCoolantParticles() {
    coolantParticles = [];
    for (let i = 0; i < 28; i++) {
        coolantParticles.push({ t: i / 28.0 });
    }
}

// Log Event Helper
function getTimestamp() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
}

function logEvent(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    const consoleEl = document.getElementById('event-log');
    if (consoleEl) {
        const entry = document.createElement('div');
        entry.style.fontFamily = 'var(--font-mono)';
        entry.style.fontSize = '9px';
        entry.style.lineHeight = '1.3';
        entry.style.marginBottom = '3px';
        
        const timestamp = document.createElement('span');
        timestamp.style.color = 'var(--text-secondary)';
        timestamp.style.marginRight = '5px';
        timestamp.textContent = `[${getTimestamp()}]`;
        
        const msg = document.createElement('span');
        if (type === 'warning') msg.style.color = 'var(--color-warning)';
        else if (type === 'fault') msg.style.color = 'var(--color-danger)';
        else if (type === 'success') msg.style.color = 'var(--color-success)';
        else msg.style.color = '#38bdf8'; // info cyan
        msg.textContent = message;
        
        entry.appendChild(timestamp);
        entry.appendChild(msg);
        consoleEl.appendChild(entry);
        consoleEl.scrollTop = consoleEl.scrollHeight;
    }
}

// --- Keyboard Bindings (Space Bar, +/- Controls) ---
window.addEventListener('keydown', (e) => {
    // Prevent default scrolling for spacebar immediately on every keydown (including repeats)
    if (e.code === 'Space') {
        e.preventDefault();
    }

    // Ignore key repeat events to avoid disrupting active interactions or spamming logs
    if (e.repeat) return;

    // Blur active buttons to prevent spacebar/keys from repeating click events on them
    if (e.code === 'Space' || e.key === '+' || e.key === '=' || e.key === '-' || e.code === 'NumpadAdd' || e.code === 'NumpadSubtract' || e.code === 'Equal' || e.code === 'Minus' || e.key.toLowerCase() === 'w' || e.key.toLowerCase() === 's') {
        if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
            document.activeElement.blur();
        }
    }

    if (e.code === 'Space') {
        if (!isMeltdown && isPowerOn && !isTerminated) {
            isSpaceBarPressed = true;
        }
    }

    // Exotic mass flow adjustments via keyboard (+ / -)
    if (!isMeltdown && isPowerOn && !isTerminated) {
        if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd' || e.code === 'Equal') {
            e.preventDefault();
            coolantFlow = Math.min(100.0, coolantFlow + 5.0);
            logEvent(`Exotic mass flow increased to ${Math.round(coolantFlow)}% via keyboard.`, "info");
        }
        if (e.key === '-' || e.code === 'NumpadSubtract' || e.code === 'Minus') {
            e.preventDefault();
            coolantFlow = Math.max(0.0, coolantFlow - 5.0);
            logEvent(`Exotic mass flow decreased to ${Math.round(coolantFlow)}% via keyboard.`, "info");
        }
        
        // Stabilizer adjustments via keyboard (W / S)
        if (e.key.toLowerCase() === 'w') {
            e.preventDefault();
            brakeForce = Math.min(100.0, brakeForce + 5.0);
            logEvent(`Stabilizer control increased to ${Math.round(brakeForce)}% via keyboard.`, "info");
        }
        if (e.key.toLowerCase() === 's') {
            e.preventDefault();
            brakeForce = Math.max(0.0, brakeForce - 5.0);
            logEvent(`Stabilizer control decreased to ${Math.round(brakeForce)}% via keyboard.`, "info");
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        isSpaceBarPressed = false;
    }
});

window.addEventListener('blur', () => {
    isSpaceBarPressed = false;
});

// --- Mouse / Touch Coordinates ---
function getCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = 500.0 / rect.width;
    const scaleY = 500.0 / rect.height;
    return {
        x: ((clientX - rect.left) * scaleX - 12.5) / 0.95,
        y: ((clientY - rect.top) * scaleY - 12.5) / 0.95
    };
}

function startDrag(coords, id) {
    // 0. Center Console Power Button Hit Test (Always active)
    const distPower = Math.sqrt((coords.x - 175) ** 2 + (coords.y - 162) ** 2);
    if (distPower < 12) {
        isPowerOn = !isPowerOn;
        resetLab();
        logEvent(`Core Powertrain powered ${isPowerOn ? 'ON' : 'OFF'}.`, isPowerOn ? "success" : "warning");
        return;
    }

    // If powered OFF, lock all other canvas interactions!
    if (!isPowerOn) {
        logEvent("Powertrain core is de-energized. Press the Power Button on center console to start.", "warning");
        return;
    }

    // If lap completed/terminated, lock all other canvas interactions!
    if (isTerminated) {
        logEvent("Simulation completed. Click RESET SIMULATION to start a new lap.", "warning");
        return;
    }

    // 1a. Cooling Vent Casing Hit Test (Centered at 442, X=418-454, Y=150-370)
    if (coords.x >= 418 && coords.x <= 454 && coords.y >= 150 && coords.y <= 370) {
        coolantTouchId = id;
        isDraggingCoolant = true;
        let pct = 1.0 - (coords.y - 170) / 180.0;
        coolantFlow = Math.max(0.0, Math.min(1.0, pct)) * 100.0;
        return;
    }

    // 1b. Brake Controller Casing Hit Test (Centered at 482, X=458-494, Y=150-370)
    if (coords.x >= 458 && coords.x <= 494 && coords.y >= 150 && coords.y <= 370) {
        brakeTouchId = id;
        isDraggingBrake = true;
        let pct = 1.0 - (coords.y - 170) / 180.0;
        brakeForce = Math.max(0.0, Math.min(1.0, pct)) * 100.0;
        return;
    }

    // 2. Weights Generator Shelf Hit Test (Left side: X=16-68)
    if (coords.x >= 16 && coords.x <= 68 && weightTouchId === null) {
        let mass = 0;
        if (Math.abs(coords.y - 150) < 16) mass = 50;
        else if (Math.abs(coords.y - 205) < 16) mass = 70;
        else if (Math.abs(coords.y - 260) < 16) mass = 90;
        
        if (mass > 0) {
            weightTouchId = id;
            draggedWeight = {
                id: Date.now(),
                mass: mass,
                x: coords.x,
                y: coords.y,
                state: 'drag',
                dragOffset: { x: 0, y: 0 },
                touchId: id
            };
            return;
        }
    }

    // 3. Placed Calibration Mounts Hit Test (pickup placed weights)
    if (weightTouchId === null) {
        for (let i = activeWeights.length - 1; i >= 0; i--) {
            const w = activeWeights[i];
            const seat = seats.find(s => s.id === w.seatId);
            if (seat) {
                const seatWeights = activeWeights.filter(x => x.seatId === seat.id);
                const index = seatWeights.findIndex(x => x.id === w.id);
                const wy = seat.y - index * 10; // stack fader (aligned with rendering)
                
                if (Math.abs(coords.x - seat.x) < 16 && Math.abs(coords.y - wy) < 10) {
                    weightTouchId = id;
                    draggedWeight = w;
                    w.state = 'drag';
                    w.touchId = id;
                    w.dragOffset.x = w.x - coords.x;
                    w.dragOffset.y = w.y - coords.y;
                    
                    // Pick it up off the seat (remove from active list)
                    activeWeights.splice(i, 1);
                    logEvent(`Disengaged ${w.mass}kg passenger weight from ${seat.name}.`, "info");
                    return;
                }
            }
        }
    }

    // 4. Rotor Ring Spin Hit Test (radius 45 to 85 from center)
    const dist = Math.sqrt((coords.x - CX) ** 2 + (coords.y - CY) ** 2);
    if (dist >= 45 && dist <= 85 && rotorTouchId === null) {
        rotorTouchId = id;
        isSpinning = true;
        lastMouseAngle = Math.atan2(coords.y - CY, coords.x - CX);
        lastMouseTime = performance.now();
    }
}

function moveDrag(coords, id) {
    // 1a. Drag Coolant Knob
    if (isDraggingCoolant && coolantTouchId === id) {
        let pct = 1.0 - (coords.y - 170) / 180.0;
        coolantFlow = Math.max(0.0, Math.min(1.0, pct)) * 100.0;
    }

    // 1b. Drag Brake Knob
    if (isDraggingBrake && brakeTouchId === id) {
        let pct = 1.0 - (coords.y - 170) / 180.0;
        brakeForce = Math.max(0.0, Math.min(1.0, pct)) * 100.0;
    }

    // 2. Drag Weight Block
    if (draggedWeight && weightTouchId === id) {
        draggedWeight.x = coords.x;
        draggedWeight.y = coords.y;
    }

    // 3. Spin Motor Rotor
    if (isSpinning && rotorTouchId === id) {
        const currAngle = Math.atan2(coords.y - CY, coords.x - CX);
        const currTime = performance.now();

        let dTheta = currAngle - lastMouseAngle;

        if (dTheta > Math.PI) dTheta -= 2 * Math.PI;
        if (dTheta < -Math.PI) dTheta += 2 * Math.PI;

        const dt = (currTime - lastMouseTime) / 1000.0;
        if (dt > 0) {
            const angVel = Math.abs(dTheta) / dt;
            const speedScale = 75.0 / payloadMass;
            rpm = Math.min(6000.0, rpm + angVel * 16.0 * speedScale);
        }

        spinAngle += dTheta;
        lastMouseAngle = currAngle;
        lastMouseTime = currTime;
    }
}

function endDrag(id) {
    if (coolantTouchId === id) {
        coolantTouchId = null;
        isDraggingCoolant = false;
    }
    if (brakeTouchId === id) {
        brakeTouchId = null;
        isDraggingBrake = false;
    }
    if (rotorTouchId === id) {
        rotorTouchId = null;
        isSpinning = false;
    }

    if (draggedWeight && weightTouchId === id) {
        let droppedSeat = null;
        for (let s of seats) {
            if (s.isLocked) continue; // skip driver
            
            const dx = Math.abs(draggedWeight.x - s.x);
            const dy = Math.abs(draggedWeight.y - s.y);
            
            if (dx < 22 && dy < 22) {
                // Stacking rule: all empty seats (1, 2, 3, 4) support up to 2 weights
                const count = activeWeights.filter(w => w.seatId === s.id).length;
                if (count < 2) {
                    droppedSeat = s;
                    break;
                }
            }
        }

        if (droppedSeat) {
            draggedWeight.state = 'deck';
            draggedWeight.seatId = droppedSeat.id;
            draggedWeight.x = droppedSeat.x;
            draggedWeight.y = droppedSeat.y;
            activeWeights.push(draggedWeight);
            logEvent(`Engaged ${draggedWeight.mass}kg passenger weight onto ${droppedSeat.name}.`, "success");
        } else {
            logEvent(`Passenger weight returned to shelf.`, "info");
        }
        draggedWeight = null;
        weightTouchId = null;
    }
}

function handleMouseDown(e) {
    if (isMeltdown) return;
    const coords = getCoords(e.clientX, e.clientY);
    startDrag(coords, 'mouse');
}

function handleMouseMove(e) {
    if (isMeltdown) return;
    const coords = getCoords(e.clientX, e.clientY);
    moveDrag(coords, 'mouse');
}

function handleMouseUp(e) {
    endDrag('mouse');
}

function handleTouchStart(e) {
    if (isMeltdown) return;
    if (e.cancelable) e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const coords = getCoords(touch.clientX, touch.clientY);
        startDrag(coords, touch.identifier);
    }
}

function handleTouchMove(e) {
    if (isMeltdown) return;
    if (e.cancelable) e.preventDefault();
    for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const coords = getCoords(touch.clientX, touch.clientY);
        moveDrag(coords, touch.identifier);
    }
}

function handleTouchEnd(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        endDrag(touch.identifier);
    }
}

if (canvas) {
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
}
window.addEventListener('mouseup', handleMouseUp);
window.addEventListener('touchend', handleTouchEnd);
window.addEventListener('touchcancel', handleTouchEnd);

// --- Meltdown Isolation System ---
function triggerMeltdown(reason) {
    isMeltdown = true;
    
    if (canvasContainer) canvasContainer.classList.add('shake');
    if (appContainer) appContainer.classList.add('shake');

    for (let i = 0; i < 90; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 8;
        explosionParticles.push({
            x: CX,
            y: CY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: Math.random() > 0.4 ? '#ef4444' : (Math.random() > 0.3 ? '#f97316' : '#cbd5e1'),
            alpha: 1.0,
            size: 2 + Math.random() * 4,
            life: 60 + Math.floor(Math.random() * 60)
        });
    }

    logEvent(`CRITICAL SYSTEM SHUTDOWN: ${reason}`, 'fault');

    setTimeout(() => {
        if (canvasContainer) canvasContainer.classList.remove('shake');
        if (appContainer) appContainer.classList.remove('shake');

        meltdownCause.textContent = reason;
        meltdownTime.textContent = `${stats.runTime.toFixed(1)}s`;
        meltdownMaxRpm.textContent = `${Math.round(stats.maxRpm)} RPM`;
        meltdownMaxTemp.textContent = `${stats.maxTemp.toFixed(1)}°C`;

        if (meltdownModal) meltdownModal.classList.remove('hidden');
    }, 1200);
}

function resetLab() {
    rpm = isPowerOn ? 500.0 : 0.0;
    temperature = 30.0;
    coolantFlow = 0.0;
    brakeForce = 0.0;
    efficiency = 95.0;
    noise = 0.2;
    lossBaseline = 0.0;
    isMeltdown = false;
    isSpaceBarPressed = false;
    filterRadius = 0.0;
    isMobileFilterActive = false;
    const mobileFilterBtn = document.getElementById('mobile-filter-btn');
    if (mobileFilterBtn) {
        mobileFilterBtn.classList.remove('active');
        mobileFilterBtn.textContent = 'EMI FILTER: OFF';
    }
    activeWeights = [];
    draggedWeight = null;
    payloadMass = 75.0;

    // Reset interaction/touch variables
    isSpinning = false;
    isDraggingCoolant = false;
    isDraggingBrake = false;
    coolantTouchId = null;
    brakeTouchId = null;
    weightTouchId = null;
    rotorTouchId = null;

    // Reset lap state
    isPaused = false;
    lapTimeRemaining = 30.0;
    currentLap = 1;
    isTerminated = false;

    sparkParticles = [];
    explosionParticles = [];
    initCoolantParticles();

    stats.runTime = 0.0;
    stats.maxRpm = isPowerOn ? 500.0 : 0.0;
    stats.maxTemp = 30.0;
    if (destabilizationWarning) destabilizationWarning.classList.add('hidden');
    if (meltdownModal) meltdownModal.classList.add('hidden');

    logEvent("Powertrain core restabilized. Telemetries set to NOMINAL.", "success");
}

if (resetButton) resetButton.addEventListener('click', resetLab);
if (modalResetBtn) modalResetBtn.addEventListener('click', resetLab);

// Initialize Mobile Filter Button behavior
const mobileFilterBtn = document.getElementById('mobile-filter-btn');
if (mobileFilterBtn) {
    if (isMobile) {
        mobileFilterBtn.classList.remove('hidden');
        mobileFilterBtn.addEventListener('click', () => {
            if (isMeltdown || !isPowerOn || isTerminated) return;
            isMobileFilterActive = !isMobileFilterActive;
            if (isMobileFilterActive) {
                mobileFilterBtn.classList.add('active');
                mobileFilterBtn.textContent = 'EMI FILTER: ON';
                logEvent("EMI noise filter shield active.", "success");
            } else {
                mobileFilterBtn.classList.remove('active');
                mobileFilterBtn.textContent = 'EMI FILTER: OFF';
                logEvent("EMI noise filter shield deactivated.", "warning");
            }
        });
    } else {
        mobileFilterBtn.classList.add('hidden');
    }
}

// Auto-trigger lap completion
function triggerLapComplete() {
    const snap = captureSnapshot();
    isPaused = true;
    isTerminated = true;
    rpm = 0.0; // Automatically go to stop state (speed falls to 0 RPM)
    
    if (explanationPanel) {
        explanationPanel.classList.remove('hidden');
        if (appContainer) appContainer.classList.add('phase-2-active');
        const dashboardLayout = document.getElementById('dashboard-layout');
        if (dashboardLayout) dashboardLayout.classList.add('phase-2-active');
        
        const pauseIndicator = document.getElementById('phase2-pause-indicator');
        if (pauseIndicator) {
            pauseIndicator.classList.remove('hidden');
            pauseIndicator.classList.remove('status-paused');
            pauseIndicator.classList.add('status-terminated');
            pauseIndicator.textContent = "SIMULATION TERMINATED: LAP COMPLETED";
        }
        
        renderSnapshotsList();
        if (snap) {
            selectSnapshot(snap.id);
        }
    }
    logEvent(`Lap ${currentLap} completed automatically. Telemetry snapshot captured.`, "success");
}

// --- 60fps Physics Updates ---
function updatePhysics(dt) {
    if (!isPowerOn) {
        rpm = 0.0;
        temperature = 30.0;
        coolantFlow = 0.0;
        brakeForce = 0.0;
        noise = 0.0;
        activeWeights = [];
        payloadMass = 75.0;
        meltdownTimer = 0.0;
        filterRadius = 0.0;
        sparkParticles = [];
        return;
    }

    if (isMeltdown) {
        explosionParticles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 1.0 / p.life;
        });
        explosionParticles = explosionParticles.filter(p => p.alpha > 0);
        return;
    }

    if (isPaused || isTerminated) {
        return;
    }

    stats.runTime += dt;
    if (rpm > stats.maxRpm) stats.maxRpm = rpm;
    if (temperature > stats.maxTemp) stats.maxTemp = temperature;

    // Tick down lap timer if not terminated
    if (!isTerminated) {
        lapTimeRemaining = Math.max(0.0, lapTimeRemaining - dt);
        if (lapTimeRemaining <= 0.0) {
            triggerLapComplete();
            return;
        }
    }

    // 1. Calculate vehicle payload
    const cargoMass = activeWeights.reduce((sum, w) => sum + w.mass, 0.0);
    payloadMass = 75.0 + cargoMass; // 75kg driver + passengers faders

    // 2. Speed updates (acceleration/deceleration) in accordance with weight
    const brakeLoad = (payloadMass / 400.0) * 30.0; // cargo friction index
    let speedChange = 0.0;
    if (rpm > 500.0) {
        const rollingResistance = 10.0 * (payloadMass / 75.0); // scales directly with weight
        const windDrag = 5.0 * (rpm / 1000.0); // scales with speed
        const coastingDecel = rollingResistance + windDrag;
        
        const brakeDecel = (brakeForce / 100.0) * 800.0 * (75.0 / payloadMass); // scales inversely with weight (inertia)
        
        speedChange = -(coastingDecel + brakeDecel) * dt;
    } else if (rpm < 500.0) {
        // Motor idle torque drives speed back to 500 RPM, affected by inertia
        const idleAccel = 200.0 * (75.0 / payloadMass);
        speedChange = idleAccel * dt;
    }
    rpm = Math.max(0.0, rpm + speedChange);

    // 3. Thermodynamic calculations (heat generated by motor power + brake friction, cooled by vent flow)
    const targetTemp = 30.0 + (rpm / 6000.0) * 110.0 - (coolantFlow / 100.0) * 70.0 + (brakeForce / 100.0) * (rpm / 1000.0) * 40.0;
    temperature += (targetTemp - temperature) * 0.85 * dt;
    temperature = Math.max(30.0, Math.min(150.0, temperature));

    // 4. Space Bar / Mobile Button EMI Noise filter activation & dynamic noise model
    const MIN_NOISE = 0.2;
    const MAX_NOISE = 2.0;
    if (isSpaceBarPressed || (isMobile && isMobileFilterActive)) {
        filterRadius = Math.min(115.0, filterRadius + 260.0 * dt);
        // Suppress noise rapidly but keep within realistic bounds
        noise = Math.max(MIN_NOISE, noise - 5.0 * dt);
    } else {
        filterRadius = Math.max(0.0, filterRadius - 380.0 * dt);
        // Fluctuating noise targeted directly to motor RPM and cargo load
        const targetNoise = MIN_NOISE + (rpm / 6000.0) * 1.4 + (brakeLoad / 30.0) * 0.4;
        const fluctuation = (Math.sin(performance.now() * 0.005) * 0.1) + (Math.random() - 0.5) * 0.08;
        const currentTarget = Math.max(MIN_NOISE, Math.min(MAX_NOISE, targetNoise + fluctuation));
        noise = noise + (currentTarget - noise) * 2.0 * dt;
    }
    noise = Math.max(MIN_NOISE, Math.min(MAX_NOISE, noise));

    // 5. Inferred Torque & output power
    torque = 120.0 * (1.0 - (temperature / 150.0) * 0.16); // Torque fades when hot
    outputPower = (torque * rpm * 2 * Math.PI) / 60000.0; // kW

    // 6. Loss Branches & Efficiency
    // --- REVAMPED REAL-TIME CONTINUOUS LOSS ENGINE ---
    
    // 1. Core Baseline Loss: Copper & core magnetic losses scaling with motor RPM
    lossBaseline = 0.15 * (rpm / 1000.0); 

    // 2. Continuous Thermal Loss: Increases as the core warms past ambient (30°C)
    // with a steep escalation safety penalty if it crosses into severe overheating over 95°C
    let thermalDelta = Math.max(0, temperature - 30.0);
    lossThermal = (thermalDelta * 0.005) + (temperature > 95.0 ? (temperature - 95.0) * 0.4 : 0.0);

    // 3. Continuous Fluid & Mechanical Drag Loss: Pumping resistance from high coolant flow,
    // rotational friction scaling with the vehicle mass, and mechanical braking friction losses.
    const payloadFrictionFactor = payloadMass / 75.0; 
    const brakeFrictionLoss = (brakeForce / 100.0) * (rpm / 1000.0) * 2.0; // kW
    lossDrag = (coolantFlow * 0.008) + ((rpm / 1000.0) * 0.05 * payloadFrictionFactor) + brakeFrictionLoss;

    // 4. Electromagnetic Interference Loss: High frequency switching distortion leaks energy continuously
    lossEmi = (noise * 0.6);

    // Aggregate loss summation
    const totalLosses = lossBaseline + lossThermal + lossDrag + lossEmi;
    const inputPower = outputPower + totalLosses;

    // Direct dynamic efficiency tracking
    if (rpm > 0 && inputPower > 0) {
        efficiency = (outputPower / inputPower) * 100.0;
    } else {
        efficiency = 95.0; // Rest state equilibrium
        outputPower = 0.0;
    }
    efficiency = Math.max(0.0, Math.min(100.0, efficiency));

    // 7. Coolant particles movement
    if (coolantFlow > 0.0) {
        coolantParticles.forEach(p => {
            p.t -= (coolantFlow / 100.0) * 0.075 * dt;
            if (p.t < 0) p.t = 1.0;
        });
    }

    // 8. Friction sparks
    if (rpm > 1200 && temperature > 95.0) {
        const sparkRate = Math.floor((rpm / 2000.0) * (temperature / 85.0));
        for (let i = 0; i < sparkRate; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 32 + Math.random() * 8;
            const sx = CX + dist * Math.cos(angle);
            const sy = CY + dist * Math.sin(angle);
            sparkParticles.push({
                x: sx,
                y: sy,
                vx: (Math.random() - 0.5) * 3 + (sx - CX) * 0.015,
                vy: (Math.random() - 0.5) * 3 + (sy - CY) * 0.015,
                alpha: 1.0,
                size: 1 + Math.random() * 2,
                life: 15 + Math.floor(Math.random() * 15)
            });
        }
    }
    sparkParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 1.0 / p.life;
    });
    sparkParticles = sparkParticles.filter(p => p.alpha > 0);

    // 9. Shutdown countdown triggers (temp > 120 or efficiency < 80)
    const isOverheat = temperature > 118.0;
    const isFault = efficiency < 80.0;

    if (isOverheat || isFault) {
        meltdownTimer += dt;
        if (destabilizationWarning) destabilizationWarning.classList.remove('hidden');
        if (countdownTimer) countdownTimer.textContent = Math.max(0.0, 3.0 - meltdownTimer).toFixed(1);

        if (meltdownTimer >= 3.0) {
            let reason = "Safety isolation trip: Core efficiency fell below 80% boundary.";
            if (temperature > 118.0) {
                reason = "THERMAL RUNAWAY: Core temperature exceeded critical safety limit (>118°C).";
            }
            triggerMeltdown(reason);
        }
    } else {
        meltdownTimer = Math.max(0.0, meltdownTimer - dt);
        if (destabilizationWarning) destabilizationWarning.classList.add('hidden');
    }

    // 10. Dynamic Vibration Center offset
    let vibrationAmp = 0.0;
    if (rpm > 100) {
        vibrationAmp = (rpm / 6000.0) * 2.5;
    }
    CX = 335 + (Math.random() - 0.5) * vibrationAmp;
    CY = 320 + (Math.random() - 0.5) * vibrationAmp;

    // 11. Stator spin angle
    spinAngle += (rpm / 6000.0) * 0.35;
}

// --- 60fps Blueprint Canvas drawing ---
function drawSpringSuspension(sx, sy, ex, ey) {
    if (!ctx) return;
    ctx.save();

    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
    ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
    ctx.fill();

    const dx = ex - sx;
    const dy = ey - sy;
    const len = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;

    const cyLen = len * 0.55;
    const cx1 = sx + ux * cyLen;
    const cy1 = sy + uy * cyLen;
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(cx1, cy1);
    ctx.stroke();

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(sx + ux * (len * 0.35), sy + uy * (len * 0.35));
    ctx.lineTo(ex, ey);
    ctx.stroke();

    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2.0;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const coils = 7;
    const springWidth = 8;
    for (let i = 0; i <= coils * 2; i++) {
        const pct = 0.15 + 0.7 * (i / (coils * 2));
        const dist = len * pct;
        const baseX = sx + ux * dist;
        const baseY = sy + uy * dist;
        const offsetDir = (i % 2 === 0) ? 1 : -1;
        const scale = (i === 0 || i === coils * 2) ? 0.3 : 1.0;
        const ox = baseX + px * offsetDir * springWidth * scale;
        const oy = baseY + py * offsetDir * springWidth * scale;

        if (i === 0) ctx.moveTo(ox, oy);
        else ctx.lineTo(ox, oy);
    }
    ctx.stroke();
    ctx.restore();
}

function drawLeaderLine(fromX, fromY, toX, toY, text, alignLeft = true) {
    if (!ctx) return;
    ctx.save();
    
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(fromX, fromY, 3, 0, Math.PI * 2);
    ctx.fill();
    
    const elbowLength = 20;
    const endX = alignLeft ? toX - elbowLength : toX + elbowLength;
    
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 4.0;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.lineTo(endX, toY);
    ctx.stroke();

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.lineTo(endX, toY);
    ctx.stroke();
    
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.textAlign = alignLeft ? 'right' : 'left';
    ctx.textBaseline = 'bottom';
    
    const textX = alignLeft ? toX - 3 : toX + 3;
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 4;
    ctx.strokeText(text, textX, toY - 2);
    ctx.fillStyle = '#0f172a';
    ctx.fillText(text, textX, toY - 2);
    ctx.restore();
}

function drawCanvasLapTimer(ex, ey) {
    if (!ctx) return;
    ctx.save();

    // Draw a premium dark digital badge to clear grid lines
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(ex - 40, ey - 18, 80, 36, 6);
    ctx.fill();
    ctx.stroke();

    // Draw glowing countdown text
    let textColor = '#10b981'; // Green
    if (lapTimeRemaining <= 10.0) {
        textColor = '#f87171'; // Red
    } else if (lapTimeRemaining <= 20.0) {
        textColor = '#fbbf24'; // Amber
    }
    
    ctx.shadowColor = textColor;
    ctx.shadowBlur = 4;
    ctx.fillStyle = textColor;
    ctx.font = '700 16px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${lapTimeRemaining.toFixed(1)}s`, ex, ey);

    ctx.restore();
}

function renderCore() {
    if (!ctx) return;

    // Background grid blueprint lines
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 500, 500);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let x = 25; x < 500; x += 25) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 500); ctx.stroke();
    }
    for (let y = 25; y < 500; y += 25) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(500, y); ctx.stroke();
    }

    if (isMeltdown) {
        ctx.save();
        ctx.translate(12.5, 12.5);
        ctx.scale(0.95, 0.95);
        explosionParticles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
        });
        ctx.restore();
        return;
    }

    ctx.save();
    ctx.translate(12.5, 12.5);
    ctx.scale(0.95, 0.95);

    // --- Draw Containment Generator Capsule Ring ---
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(95, 60, 160, 320, 20); // main capsule
    ctx.stroke();

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(105, 70, 140, 60, 8); // upper field guide
    ctx.roundRect(105, 310, 140, 60, 8); // lower field guide
    ctx.stroke();

    // magnetic flux rails
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(115, 60); ctx.lineTo(115, 380);
    ctx.moveTo(235, 60); ctx.lineTo(235, 380);
    ctx.stroke();

    // Magnetic Stabilizer Support Arms (Axles)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(70, 100); ctx.lineTo(280, 100); // Upper support arms
    ctx.moveTo(70, 320); ctx.lineTo(CX - 30, 320); // Lower support arms
    ctx.stroke();

    // Magnetic Stabilizer Guides (Tires)
    function drawMagneticGuide(tx, ty) {
        ctx.save();
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#38bdf8'; // glowing blue edge
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(tx - 12, ty - 30, 24, 60, 8);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    drawMagneticGuide(75, 100);
    drawMagneticGuide(275, 100);
    drawMagneticGuide(75, 320);

    // Field Dissipation Dampers (Suspension)
    drawSpringSuspension(115, 100, 80, 100);
    drawSpringSuspension(235, 100, 270, 100);
    drawSpringSuspension(115, 320, 80, 320);
    drawSpringSuspension(235, 320, CX - 30, CY);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(235, 305); ctx.lineTo(CX - 30, CY - 8);
    ctx.moveTo(235, 335); ctx.lineTo(CX - 30, CY + 8);
    ctx.stroke();

    // --- Draw Zero-Point Metric Fusion Core (Battery) ---
    const bx = 105;
    const by = 220;
    const bw = 140;
    const bh = 80;

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8'; // cyan glowing cells
    const cellW = 8;
    const cellH = 12;
    const padX = 6;
    const padY = 6;
    for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 8; c++) {
            const cellX = bx + 13 + c * (cellW + padX);
            const cellY = by + 12 + r * (cellH + padY);
            ctx.beginPath();
            ctx.roundRect(cellX, cellY, cellW, cellH, 1);
            ctx.fill();
        }
    }
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText("METRIC WARP CORE", bx + bw / 2, by + bh - 24);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText("ZERO-POINT CELLS (80GW)", bx + bw / 2, by + bh - 12);

    // --- Draw Plasma Warp Waveguides (Cables) ---
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 5.0;
    ctx.beginPath();
    ctx.moveTo(bx + bw, by + bh - 30);
    ctx.lineTo(290, by + bh - 30);
    ctx.lineTo(290, CY - 40);
    ctx.lineTo(CX - 40, CY - 40);
    ctx.stroke();

    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(bx + bw, by + bh - 30);
    ctx.lineTo(290, by + bh - 30);
    ctx.lineTo(290, CY - 40);
    ctx.lineTo(CX - 40, CY - 40);
    ctx.stroke();

    // Pulse effects
    const time = performance.now();
    const flowSpeed = 0.005 + (rpm / 6000.0) * 0.018;
    ctx.fillStyle = '#facc15';
    const progress = (time * flowSpeed) % 1.0;

    function getCablePoint(t) {
        const l1 = Math.abs(290 - (bx + bw));
        const l2 = Math.abs((CY - 40) - (by + bh - 30));
        const l3 = Math.abs((CX - 40) - 290);
        const total = l1 + l2 + l3;
        const target = t * total;
        if (target < l1) {
            return { x: bx + bw + target, y: by + bh - 30 };
        } else if (target < l1 + l2) {
            const dy = target - l1;
            return { x: 290, y: by + bh - 30 + dy };
        } else {
            const dx = target - l1 - l2;
            return { x: 290 + dx, y: CY - 40 };
        }
    }

    if (rpm > 50) {
        for (let i = 0; i < 3; i++) {
            const tVal = (progress + i / 3.0) % 1.0;
            const pt = getCablePoint(tVal);
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // --- Draw Stabilizer Mounts & Calibration Weights ---
    seats.forEach(s => {
        if (s.id === 0) {
            // Draw Primary Core Stabilizer (75kg locked)
            ctx.save();
            ctx.fillStyle = '#0f172a';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            // Core Center
            ctx.beginPath(); ctx.arc(s.x, s.y - 4, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            // Base
            ctx.beginPath(); ctx.arc(s.x, s.y + 9, 10, Math.PI, 0); ctx.fill(); ctx.stroke();
            
            ctx.fillStyle = '#38bdf8';
            ctx.font = '700 7px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.strokeStyle = '#f8fafc';
            ctx.lineWidth = 3;
            ctx.strokeText("CORE", s.x, s.y + 3);
            ctx.fillText("CORE", s.x, s.y + 3);
            ctx.strokeText("75kg", s.x, s.y + 11);
            ctx.fillText("75kg", s.x, s.y + 11);
            ctx.restore();
            return;
        }

        // Draw Mount Outlines
        ctx.fillStyle = 'rgba(14, 165, 233, 0.05)';
        ctx.strokeStyle = '#0ea5e9';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.roundRect(s.x - 14, s.y - 14, 28, 28, 6);
        ctx.fill();
        ctx.stroke();

        // Label empty mounts
        const occupants = activeWeights.filter(w => w.seatId === s.id);
        if (occupants.length === 0) {
            ctx.fillStyle = '#64748b';
            ctx.font = '6px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            let label = "";
            if (s.id === 1) label = "ALPHA";
            else if (s.id === 2) label = "BETA";
            else if (s.id === 3) label = "GAMMA";
            else if (s.id === 4) label = "DELTA";
            
            ctx.fillText(label, s.x, s.y - 2);
            ctx.fillText("(STACK)", s.x, s.y + 5);
        }
    });

    // Draw active calibration weights
    activeWeights.forEach(w => {
        const seat = seats.find(s => s.id === w.seatId);
        if (seat) {
            const seatWeights = activeWeights.filter(x => x.seatId === seat.id);
            const index = seatWeights.findIndex(x => x.id === w.id);
            const wy = seat.y - index * 10;

            ctx.save();
            ctx.translate(seat.x, wy);

            // Weight Block
            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.roundRect(-14, -6, 28, 12, 2);
            ctx.fill();
            ctx.stroke();

            // Handle loop
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.0;
            ctx.beginPath(); ctx.arc(0, -6, 3, Math.PI, 0); ctx.stroke();

            // Weight text
            ctx.fillStyle = '#f8fafc';
            ctx.font = '700 7.5px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(w.mass + "kg", 0, 0);
            ctx.restore();
        }
    });

    // Draw dragged weight block
    if (draggedWeight) {
        ctx.save();
        ctx.translate(draggedWeight.x, draggedWeight.y);
        ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-14, -6, 28, 12, 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#f8fafc';
        ctx.font = '700 7.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(draggedWeight.mass + "kg", 0, 0);
        ctx.restore();
    }

    // --- Draw EV Center Console Power Button ---
    ctx.save();
    ctx.translate(175, 162);
    
    // Glowing Outer Ring
    ctx.fillStyle = isPowerOn ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.1)';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    
    // Button Circle
    ctx.fillStyle = isPowerOn ? '#10b981' : '#ef4444'; // green when ON, red when OFF
    ctx.strokeStyle = isPowerOn ? '#047857' : '#b91c1c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Power Symbol ⏻
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    
    // Circle arc for symbol
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, -Math.PI / 3, -2 * Math.PI / 3, true);
    ctx.stroke();
    
    // Vertical line for symbol
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.lineTo(0, -5);
    ctx.stroke();

    ctx.restore();

    // Mask grid under motor rings
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(CX, CY, 78, 0, Math.PI * 2); // Reduced from 92 to 78 to mask active rotor area
    ctx.fill();
    // Concentric casing blueprint tracks
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.arc(CX, CY, 73, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    // Exotic Mass Flow Spiral Channel (Coolant Jacket)
    const thetaMax = Math.PI * 4;
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.08)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    for (let theta = 0; theta <= thetaMax; theta += 0.05) {
        const t = theta / thetaMax;
        const r = 75 + t * 9;
        const px = CX + r * Math.cos(theta);
        const py = CY + r * Math.sin(theta);
        if (theta === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Exotic flow boundaries
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.4)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let theta = 0; theta <= thetaMax; theta += 0.05) {
        const t = theta / thetaMax;
        const r = (75 + t * 9) - 3.5;
        const px = CX + r * Math.cos(theta);
        const py = CY + r * Math.sin(theta);
        if (theta === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.beginPath();
    for (let theta = 0; theta <= thetaMax; theta += 0.05) {
        const t = theta / thetaMax;
        const r = (75 + t * 9) + 3.5;
        const px = CX + r * Math.cos(theta);
        const py = CY + r * Math.sin(theta);
        if (theta === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Exotic Mass Plasma Particles
    if (coolantFlow > 0.0) {
        ctx.save();
        ctx.shadowColor = 'rgba(6, 182, 212, 0.9)'; // bright cyan plasma
        ctx.shadowBlur = 6;
        ctx.fillStyle = `rgba(34, 211, 238, ${0.45 + 0.55 * (coolantFlow / 100.0)})`;
        coolantParticles.forEach(p => {
            const theta = p.t * thetaMax;
            const r = 75 + p.t * 9;
            const px = CX + r * Math.cos(theta);
            const py = CY + r * Math.sin(theta);
            ctx.beginPath(); ctx.arc(px, py, 2.2, 0, Math.PI * 2); ctx.fill();
        });
        ctx.restore();
    }

    // Zero-Point Distortion Core Hub
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#a855f7'; // Purple core edge
    ctx.lineWidth = 2.0;
    ctx.beginPath(); ctx.arc(CX, CY, 28, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 1.0;
    ctx.beginPath(); ctx.arc(CX, CY, 20, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(CX, CY, 12, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(CX, CY, 5, 0, Math.PI * 2); ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 6.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText("MATRIX", CX, CY - 4);
    ctx.fillText("CORE", CX, CY + 4);
    ctx.restore();

    // Field Metric Stress Glow Overlay
    if (temperature > 40.0) {
        const heatPct = Math.min(1.0, (temperature - 40) / 80);
        const siphonedAlpha = heatPct * (1.0 - coolantFlow / 100.0) * 0.65;
        ctx.fillStyle = `rgba(244, 63, 94, ${siphonedAlpha})`; // pink-red warp stress
        ctx.beginPath(); ctx.arc(CX, CY, 28, 0, Math.PI * 2); ctx.fill();
    }

    // Winding coils
    const coilCount = 12;
    const spinRatio = Math.min(1.0, rpm / 4000.0);
    const rCoil = Math.round(234 - spinRatio * (234 - 14));
    const gCoil = Math.round(88 + spinRatio * (165 - 88));
    const bCoil = Math.round(12 + spinRatio * (233 - 12));
    const coilFill = `rgb(${rCoil}, ${gCoil}, ${bCoil})`;
    const coilStroke = `rgb(${Math.round(154 - spinRatio * 151)}, ${Math.round(52 + spinRatio * 53)}, ${Math.round(18 + spinRatio * 143)})`;

    for (let i = 0; i < coilCount; i++) {
        const angle = i * (Math.PI * 2 / coilCount);
        const cx = CX + 38 * Math.cos(angle);
        const cy = CY + 38 * Math.sin(angle);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.fillStyle = coilFill;
        ctx.strokeStyle = coilStroke;
        ctx.lineWidth = 1.0;
        ctx.beginPath(); ctx.roundRect(-2.0, -3.5, 4, 7, 1); ctx.fill(); ctx.stroke();
        ctx.restore();
    }

    // Rotor Segment poles
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(spinAngle);
    const segmentCount = 6;
    for (let i = 0; i < segmentCount; i++) {
        const start = i * (Math.PI * 2 / segmentCount) + 0.08;
        const end = (i + 1) * (Math.PI * 2 / segmentCount) - 0.08;
        const isNorth = i % 2 === 0;
        const poleColor = isNorth ? '#e2e8f0' : '#334155';
        const labelColor = isNorth ? '#1e293b' : '#94a3b8';
        const labelText = isNorth ? 'N' : 'S';

        const blurSteps = Math.min(10, Math.floor(rpm / 500.0));
        if (blurSteps > 0) {
            for (let b = 1; b <= blurSteps; b++) {
                const alpha = 0.25 * (1.0 - b / blurSteps);
                const offset = -b * (rpm / 6000.0) * 0.08;
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = poleColor;
                ctx.beginPath();
                ctx.arc(0, 0, 68, start + offset, end + offset);
                ctx.arc(0, 0, 48, end + offset, start + offset, true);
                ctx.closePath(); ctx.fill();
                ctx.restore();
            }
        }
        ctx.fillStyle = poleColor;
        ctx.beginPath();
        ctx.arc(0, 0, 68, start, end);
        ctx.arc(0, 0, 48, end, start, true);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1; ctx.stroke();

        const textAlpha = Math.max(0.0, 1.0 - rpm / 1500.0);
        if (textAlpha > 0.0) {
            const midAngle = (start + end) / 2;
            ctx.save();
            ctx.globalAlpha = textAlpha;
            ctx.translate(58 * Math.cos(midAngle), 58 * Math.sin(midAngle));
            ctx.rotate(midAngle + Math.PI / 2);
            ctx.fillStyle = labelColor;
            ctx.font = '700 8px "JetBrains Mono", monospace';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(labelText, 0, 0);
            ctx.restore();
        }
    }
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1.0;
    ctx.beginPath(); ctx.arc(0, 0, 48, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 68, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // Arrows
    if (rpm > 10.0) {
        ctx.save();
        ctx.translate(CX, CY);
        ctx.rotate(spinAngle);
        ctx.strokeStyle = 'rgba(14, 165, 233, 0.6)';
        ctx.fillStyle = 'rgba(14, 165, 233, 0.6)';
        ctx.lineWidth = 1.0;
        for (let i = 0; i < 3; i++) {
            ctx.save();
            ctx.rotate(i * (Math.PI * 2 / 3));
            ctx.beginPath(); ctx.arc(0, 0, 72, -0.12, 0.12); ctx.stroke();
            ctx.save();
            ctx.translate(72 * Math.cos(0.12), 72 * Math.sin(0.12));
            ctx.rotate(0.12 + Math.PI / 2);
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-2.5, -4); ctx.lineTo(0, -3); ctx.lineTo(2.5, -4);
            ctx.closePath(); ctx.fill();
            ctx.restore();
            ctx.restore();
        }
        ctx.restore();
    }

    // Aura
    if (rpm > 1000) {
        const glowFactor = (rpm / 6000.0) * (0.35 + 0.15 * Math.sin(performance.now() * 0.015));
        ctx.save();
        ctx.strokeStyle = `rgba(6, 182, 212, ${glowFactor})`;
        ctx.lineWidth = 2.0;
        ctx.shadowColor = 'rgba(6, 182, 212, 0.8)';
        ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.arc(CX, CY, 44, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(CX, CY, 72, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    }

    // --- Space Bar Telemetry Filter Shield rendering ---
    if (filterRadius > 0.0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.75)'; // Purple filter aura
        ctx.lineWidth = 2.0;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(CX, CY, filterRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = 'rgba(168, 85, 247, 0.06)';
        ctx.beginPath();
        ctx.arc(CX, CY, filterRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(CX, CY, Math.max(0, filterRadius - 12.0), 0, Math.PI * 2);
        ctx.stroke();
        
        if (filterRadius > 40) {
            ctx.font = '700 7px "JetBrains Mono", monospace';
            ctx.fillStyle = '#a855f7';
            ctx.textAlign = 'center';
            ctx.fillText("VACUUM SHIELD ACTIVE", CX, CY - filterRadius + 10);
        }
        ctx.restore();
    }

    drawLeaderLine(CX - 22, CY - 22, CX - 80, CY - 80, "ZERO-POINT METRIC EXCITERS", true);
    drawLeaderLine(CX + 54, CY - 24, 385, 210, "ROTATING MATRIX FLUX ROTOR", true);
    drawLeaderLine(CX - 62, CY + 62, CX - 130, CY + 105, "EXOTIC MASS SPIRAL JACKET", true);
    drawLeaderLine(CX + 10, CY + 10, CX + 110, CY + 105, "ZERO-POINT CONTAINMENT GENERATOR CORE", true);

    // Spark Particles
    sparkParticles.forEach(p => {
        ctx.fillStyle = `rgba(249, 115, 22, ${p.alpha})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    });

    // --- 4. Infinite Weights Shelf panel inside canvas ---
    ctx.fillStyle = 'rgba(241, 245, 249, 0.9)';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(16, 110, 52, 180, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = '700 7px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText("STABILIZERS", 42, 122);

    function drawSourceWeight(wx, wy, mass) {
        ctx.save();
        ctx.translate(wx, wy);
        ctx.fillStyle = '#e2e8f0';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.roundRect(-16, -7, 32, 14, 2); ctx.fill(); ctx.stroke();
        
        ctx.fillStyle = '#1e293b';
        ctx.font = '700 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(mass + "kg", 0, 0);
        ctx.restore();
    }
    drawSourceWeight(42, 150, 50);
    drawSourceWeight(42, 205, 70);
    drawSourceWeight(42, 260, 90);

    // --- Draw Canvas Lap Timer ---
    drawCanvasLapTimer(357, 85);

    // --- 5. Split Vertical Control Valves inside canvas on the right ---
    
    // 5a. COOLANT Slider (Centered X = 442) -> now EXOTIC FLOW
    ctx.fillStyle = 'rgba(241, 245, 249, 0.9)';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(430, 150, 24, 220, 8);
    ctx.fill();
    ctx.stroke();

    // inner track slot
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.roundRect(438, 170, 8, 180, 4);
    ctx.fill();

    // fader ticks
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    for (let ty = 170; ty <= 350; ty += 36) {
        ctx.beginPath(); ctx.moveTo(432, ty); ctx.lineTo(436, ty); ctx.stroke();
    }

    // Blue valve handle knob (bottom to top)
    const coolantY = 350 - (coolantFlow / 100.0) * 180.0;
    ctx.fillStyle = '#0ea5e9';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(442, coolantY, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath(); ctx.arc(442, coolantY, 3, 0, Math.PI * 2); ctx.fill();

    // Label (drawn above the fader casing using larger, crisp font sizes)
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 7.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText("Cooling", 442, 122);
    ctx.fillText("vent", 442, 132);
    ctx.font = '500 5.5px "JetBrains Mono", monospace';
    ctx.fillText(isMobile ? "(DRAG)" : "(KEYS +/-)", 442, 142);

    // 5b. BRAKE Slider (Centered X = 482, with 20px casing padding from coolant casing) -> now STABILIZER
    ctx.fillStyle = 'rgba(241, 245, 249, 0.9)';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(470, 150, 24, 220, 8);
    ctx.fill();
    ctx.stroke();

    // inner track slot
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.roundRect(478, 170, 8, 180, 4);
    ctx.fill();

    // fader ticks
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    for (let ty = 170; ty <= 350; ty += 36) {
        ctx.beginPath(); ctx.moveTo(472, ty); ctx.lineTo(476, ty); ctx.stroke();
    }

    // Amber valve handle knob (bottom to top)
    const brakeY = 350 - (brakeForce / 100.0) * 180.0;
    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(482, brakeY, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath(); ctx.arc(482, brakeY, 3, 0, Math.PI * 2); ctx.fill();

    // Label (drawn above the fader casing using larger, crisp font sizes)
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 7.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText("Brake", 482, 122);
    ctx.fillText("Controller", 482, 132);
    ctx.font = '500 5.5px "JetBrains Mono", monospace';
    ctx.fillText(isMobile ? "(DRAG)" : "(KEYS W/S)", 482, 142);

    // --- 6. Sensor EMI Noise static overlay on canvas ---
    if (noise > 0.3) {
        ctx.save();
        ctx.translate(12.5, 12.5);
        ctx.scale(0.95, 0.95);
        
        // Scale intensity between 0 and 1
        const intensity = (noise - 0.2) / 1.8;
        
        // Draw horizontal digital static lines
        const lineCount = Math.floor(intensity * 12);
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.22)'; // purple static
        ctx.lineWidth = 1.0;
        for (let i = 0; i < lineCount; i++) {
            const gy = Math.random() * canvas.height;
            const gx = Math.random() * (canvas.width - 60);
            const gw = 8 + Math.random() * 32;
            ctx.beginPath();
            ctx.moveTo(gx, gy);
            ctx.lineTo(gx + gw, gy);
            ctx.stroke();
        }
        
        // Draw tiny random static dust dots
        ctx.fillStyle = 'rgba(236, 72, 153, 0.28)'; // pink dust
        const dotCount = Math.floor(intensity * 24);
        for (let i = 0; i < dotCount; i++) {
            const dx = Math.random() * canvas.width;
            const dy = Math.random() * canvas.height;
            ctx.fillRect(dx, dy, 1.2, 1.2);
        }
        
        ctx.restore();
    }

    // --- 7. De-energized Screen Overlay ---
    if (!isPowerOn) {
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
        ctx.fillRect(-20, -20, 540, 540); // cover scaled canvas area fully

        const alpha = 0.55 + 0.45 * Math.sin(performance.now() * 0.007);
        ctx.fillStyle = `rgba(248, 250, 252, ${alpha})`;
        ctx.font = '700 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("EV POWERTRAIN POWERED OFF", 250, 60);
        
        ctx.font = '700 8.5px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
        ctx.fillText("PRESS CENTER CONSOLE BUTTON TO START", 250, 75);
        ctx.restore();
    }

    ctx.restore();
}

function updateDOM() {
    if (isMeltdown) return;

    // Telemetry readouts in horizontal metric cards
    document.getElementById('card-speed').textContent = `${Math.round(rpm)} RPM`;
    document.getElementById('card-temp').textContent = `${Math.round(temperature)}°C`;
    document.getElementById('card-coolant').textContent = `${Math.round(coolantFlow)}%`;
    document.getElementById('card-payload').textContent = `${Math.round(payloadMass)} kg`;
    document.getElementById('card-noise').textContent = noise.toFixed(2);

    // Telemetry readouts in Right Column inferred list (if elements exist)
    const infSpeed = document.getElementById('inferred-speed');
    if (infSpeed) infSpeed.textContent = `${Math.round(rpm)} RPM`;
    const infTemp = document.getElementById('inferred-temp');
    if (infTemp) infTemp.textContent = `${Math.round(temperature)}°C`;
    const infCoolant = document.getElementById('inferred-coolant');
    if (infCoolant) infCoolant.textContent = `${Math.round(coolantFlow)}%`;
    const infPayload = document.getElementById('inferred-payload');
    if (infPayload) infPayload.textContent = `${Math.round(payloadMass)} kg`;
    const infNoise = document.getElementById('inferred-noise');
    if (infNoise) infNoise.textContent = noise.toFixed(2);
    const infTorque = document.getElementById('inferred-torque');
    if (infTorque) infTorque.textContent = `${torque.toFixed(1)} Nm`;

    const infPout = document.getElementById('inferred-pout');
    if (infPout) infPout.textContent = `${outputPower.toFixed(2)} kW`;

    // Calculate display efficiency
    const displayEff = (rpm === 0) ? 95.0 : efficiency;

    // Update HTML circular efficiency meter
    const effFill = document.getElementById('efficiency-fill');
    const effNum = document.getElementById('efficiency-number');
    const effStatus = document.getElementById('efficiency-status');
    if (effFill && effNum && effStatus) {
        effNum.textContent = `${displayEff.toFixed(1)}%`;
        
        // Calculate dashoffset (radius is 42, circumference is 263.89)
        const offset = 263.89 - (displayEff / 100.0) * 263.89;
        effFill.style.strokeDashoffset = offset;
        
        // Style color and status based on efficiency and temperature
        if (displayEff < 80.0) {
            effFill.style.stroke = 'var(--color-danger)';
            effFill.style.filter = 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.4))';
            effStatus.textContent = 'CRITICAL';
            effStatus.style.color = 'var(--color-danger)';
        } else if (temperature > 95.0) {
            effFill.style.stroke = 'var(--color-warning)';
            effFill.style.filter = 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.4))';
            effStatus.textContent = 'WARNING';
            effStatus.style.color = 'var(--color-warning)';
        } else {
            effFill.style.stroke = 'var(--color-success)';
            effFill.style.filter = 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.4))';
            effStatus.textContent = 'NOMINAL';
            effStatus.style.color = 'var(--color-success)';
        }
    }

    // live governing relation matrix console
    document.getElementById('calc-torque').textContent = torque.toFixed(1);
    document.getElementById('calc-p-out').textContent = outputPower.toFixed(2);
    const calcBaseline = document.getElementById('calc-loss-baseline');
    if (calcBaseline) calcBaseline.textContent = lossBaseline.toFixed(2);
    document.getElementById('calc-loss-thermal').textContent = lossThermal.toFixed(2);
    document.getElementById('calc-loss-drag').textContent = lossDrag.toFixed(2);
    document.getElementById('calc-loss-emi').textContent = lossEmi.toFixed(2);

    const calcLosses = lossBaseline + lossThermal + lossDrag + lossEmi;
    const calcLossesEl = document.getElementById('calc-p-losses');
    if (calcLossesEl) calcLossesEl.textContent = calcLosses.toFixed(2);

    const calcPin = outputPower + calcLosses;
    document.getElementById('calc-p-in').textContent = calcPin.toFixed(2);
    document.getElementById('calc-p-out-val').textContent = outputPower.toFixed(2);
    document.getElementById('calc-p-in-val').textContent = calcPin.toFixed(2);
    document.getElementById('calc-eff').textContent = `${displayEff.toFixed(1)}%`;

    // Status badges
    const statusText = document.getElementById('status-text');
    const statusBadge = document.getElementById('status-badge');
    if (statusText && statusBadge) {
        if (displayEff < 80.0) {
            statusBadge.className = "status-badge status-fault";
            statusText.textContent = "CRITICAL POWERTRAIN TRIP";
        } else if (temperature > 95.0) {
            statusBadge.className = "status-badge status-warning";
            statusText.textContent = "WARNING: OVERHEATING";
        } else {
            statusBadge.className = "status-badge status-normal";
            statusText.textContent = "NORMAL (Safe)";
        }
    }

    // Static overlay opacity (noise levels)
    const scanline = document.getElementById('telemetry-static');
    if (scanline) {
        scanline.style.opacity = noise > 0.8 ? Math.min(0.7, (noise - 0.8) / 1.2) : 0.0;
    }
}

// --- 4Hz Diagnostic logs console ticks ---
function tick() {
    if (isMeltdown || isPaused) return;

    const isOverheat = temperature > 95.0;
    const isFault = efficiency < 80.0;

    if (isOverheat && !state.flags.overheat) {
        logEvent("WARNING: Distortion field thermal stress warning limit breached (>95°C). Exotic coolant flow adjustment required.", "warning");
        state.flags.overheat = true;
    } else if (!isOverheat && state.flags.overheat) {
        logEvent("INFO: Distortion field stress/temp normalized below safe limit. Thermal warning resolved.", "success");
        state.flags.overheat = false;
    }

    if (isFault && !state.flags.fault) {
        logEvent("CRITICAL FAULT: Field coherence drops below 80% boundary. Safety containment countdown active.", "fault");
        state.flags.fault = true;
    } else if (!isFault && state.flags.fault) {
        logEvent("SUCCESS: Field coherence recovered to nominal level. Isolation containment resolved.", "success");
        state.flags.fault = false;
    }
}

// --- 60fps frame loop ---
let lastFrameTime = performance.now();

function frame(time) {
    const dt = Math.min(0.05, (time - lastFrameTime) / 1000.0);
    lastFrameTime = time;

    updatePhysics(dt);
    renderCore();
    updateDOM();

    requestAnimationFrame(frame);
}

// --- Initialization ---
logEvent(isMobile ? "Virtual Powertrain Lab initialized. Mobile EMI shield filter button active." : "Virtual Powertrain Lab initialized. Space Bar EMI shield active.", "success");
resetLab();

if (canvas) {
    requestAnimationFrame(frame);
}
setInterval(tick, 250);

// --- Explanation Panel & Snapshot Toggles ---
const snapshots = [];
let snapshotIdCounter = 1;

function captureSnapshot() {
    if (isMeltdown || !isPowerOn) {
        logEvent("Cannot capture snapshot: core is inactive or melted.", "warning");
        return null;
    }
    
    // Record current lap timer time instead of real-world wall clock time
    const timestamp = `${lapTimeRemaining.toFixed(1)}s`;
    const id = snapshotIdCounter++;
    
    // Calculate values at this moment
    const totalLosses = lossBaseline + lossThermal + lossDrag + lossEmi;
    
    const snap = {
        id: id,
        timestamp: timestamp,
        rpm: rpm,
        temperature: temperature,
        coolantFlow: coolantFlow,
        payloadMass: payloadMass,
        noise: noise,
        torque: torque,
        outputPower: outputPower,
        lossBaseline: lossBaseline,
        lossThermal: lossThermal,
        lossDrag: lossDrag,
        lossEmi: lossEmi,
        totalLosses: totalLosses,
        efficiency: efficiency
    };
    
    snapshots.push(snap);
    logEvent(`Snapshot #0${id} captured successfully at [${timestamp}].`, "success");
    return snap;
}

function renderSnapshotsList() {
    const listEl = document.getElementById('snapshot-list');
    if (!listEl) return;
    
    if (snapshots.length === 0) {
        listEl.innerHTML = `<div class="no-snapshots-hint" style="color: #64748b; font-size: 0.8rem; font-style: italic; text-align: center; margin-top: 2rem;">No historical captures recorded. Click "SNAPSHOT" in Phase 1 to capture current telemetry.</div>`;
        return;
    }
    
    listEl.innerHTML = '';
    snapshots.forEach(snap => {
        const item = document.createElement('div');
        item.className = 'snapshot-item';
        item.id = `snapshot-item-${snap.id}`;
        item.addEventListener('click', () => selectSnapshot(snap.id));
        
        item.innerHTML = `
            <div class="snapshot-item-header">
                <span>[${snap.timestamp}] SNAPSHOT #0${snap.id}</span>
                <span style="color: #0ea5e9; font-weight: 700;">${snap.efficiency.toFixed(1)}%</span>
            </div>
            <div class="snapshot-item-metrics">
                <div>Speed: ${Math.round(snap.rpm)} RPM</div>
                <div>Temp: ${Math.round(snap.temperature)}°C</div>
                <div>Coolant: ${Math.round(snap.coolantFlow)}%</div>
                <div>Payload: ${Math.round(snap.payloadMass)} kg</div>
                <div>Noise: ${snap.noise.toFixed(2)}</div>
                <div>Power: ${snap.outputPower.toFixed(2)} kW</div>
            </div>
        `;
        listEl.appendChild(item);
    });
}

function selectSnapshot(id) {
    const snap = snapshots.find(s => s.id === id);
    if (!snap) return;
    
    // Highlight active element in list
    document.querySelectorAll('.snapshot-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeItem = document.getElementById(`snapshot-item-${snap.id}`);
    if (activeItem) activeItem.classList.add('active');
    
    // Live Parameter Substitution calculations
    const baselineText = snap.lossBaseline.toFixed(2);
    const thermalText = snap.lossThermal.toFixed(2);
    const dragText = snap.lossDrag.toFixed(2);
    const emiText = snap.lossEmi.toFixed(2);
    const totalLossesText = snap.totalLosses.toFixed(2);
    const efficiencyText = snap.efficiency.toFixed(1);
    const rpmText = Math.round(snap.rpm);
    const torqueText = snap.torque.toFixed(1);
    const poutText = snap.outputPower.toFixed(2);
    
    // Update MathJax Formula blocks with substitution strings
    document.getElementById('formula-pout-display').innerHTML = 
        `$$P_{\\text{out}} = \\frac{${torqueText} \\times ${rpmText} \\times 2\\pi}{60000} = ${poutText} \\text{ kW}$$`;
        
    document.getElementById('formula-plosses-display').innerHTML = 
        `$$P_{\\text{losses}} = ${baselineText} + ${thermalText} + ${dragText} + ${emiText} = ${totalLossesText} \\text{ kW}$$`;
        
    document.getElementById('formula-peff-display').innerHTML = 
        `$$\\eta = \\left(\\frac{${poutText}}{${poutText} + ${totalLossesText}}\\right) \\times 100 = ${efficiencyText}\\%$$`;
        
    // Update traces
    document.getElementById('trace-pout-eval').innerHTML = 
        `Motor Torque (\\(\\tau\\)) = ${torqueText} Nm, Speed (N) = ${rpmText} RPM &rarr; Power Output = ${poutText} kW.`;
        
    document.getElementById('trace-plosses-eval').innerHTML = 
        `P_baseline = ${baselineText} kW, P_therm = ${thermalText} kW, P_drag = ${dragText} kW, P_emi = ${emiText} kW &rarr; Total Losses = ${totalLossesText} kW.`;
        
    document.getElementById('trace-peff-eval').innerHTML = 
        `Output power: ${poutText} kW / Input power: ${(snap.outputPower + snap.totalLosses).toFixed(2)} kW &rarr; Efficiency: ${efficiencyText}%.`;
        
    // Run MathJax Typeset Smoothly
    if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise();
    }
}

function resetFormulaCardsToDefault() {
    document.getElementById('formula-pout-display').innerHTML = 
        `$$P_{\\text{out}} = \\frac{\\tau \\times N \\times 2\\pi}{60000} \\text{ kW}$$`;
    document.getElementById('formula-plosses-display').innerHTML = 
        `$$P_{\\text{losses}} = P_{\\text{baseline}} + P_{\\text{therm}} + P_{\\text{drag}} + P_{\\text{emi}}$$`;
    document.getElementById('formula-peff-display').innerHTML = 
        `$$\\eta = \\left(\\frac{P_{\\text{out}}}{P_{\\text{out}} + P_{\\text{losses}}}\\right) \\times 100$$`;
        
    document.getElementById('trace-pout-eval').textContent = "Select a historical snapshot to see evaluation.";
    document.getElementById('trace-plosses-eval').textContent = "Select a historical snapshot to see evaluation.";
    document.getElementById('trace-peff-eval').textContent = "Select a historical snapshot to see evaluation.";
    
    if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise();
    }
}

if (btnExplanation && explanationPanel) {
    btnExplanation.addEventListener('click', () => {
        isPaused = true; // Pause physics
        explanationPanel.classList.remove('hidden');
        if (appContainer) appContainer.classList.add('phase-2-active');
        const dashboardLayout = document.getElementById('dashboard-layout');
        if (dashboardLayout) dashboardLayout.classList.add('phase-2-active');
        
        const pauseIndicator = document.getElementById('phase2-pause-indicator');
        if (pauseIndicator) {
            pauseIndicator.classList.remove('hidden');
            if (lapTimeRemaining > 0.0) {
                pauseIndicator.classList.remove('status-terminated');
                pauseIndicator.classList.add('status-paused');
                pauseIndicator.textContent = "SIMULATION PAUSED: MANUAL NAVIGATION";
            } else {
                pauseIndicator.classList.remove('status-paused');
                pauseIndicator.classList.add('status-terminated');
                pauseIndicator.textContent = "SIMULATION TERMINATED: LAP COMPLETED";
            }
        }
        
        renderSnapshotsList();
        if (snapshots.length > 0) {
            // Find currently active or fallback to the latest snapshot
            const activeItem = document.querySelector('.snapshot-item.active');
            if (activeItem) {
                const activeId = parseInt(activeItem.id.replace('snapshot-item-', ''));
                selectSnapshot(activeId);
            } else {
                selectSnapshot(snapshots[snapshots.length - 1].id);
            }
        } else {
            resetFormulaCardsToDefault();
        }
    });
}

if (btnReturn && explanationPanel) {
    btnReturn.addEventListener('click', () => {
        explanationPanel.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('phase-2-active');
        const dashboardLayout = document.getElementById('dashboard-layout');
        if (dashboardLayout) dashboardLayout.classList.remove('phase-2-active');
        
        // Resume physics and return to Phase 1 exactly as is
        isPaused = false;
    });
}

// Sleek non-blocking toast notification helper
function showToastNotification(message) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.position = 'fixed';
        container.style.bottom = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.style.background = '#0f172a';
    toast.style.color = '#38bdf8';
    toast.style.border = '1px solid #0ea5e9';
    toast.style.padding = '0.65rem 1.15rem';
    toast.style.borderRadius = '6px';
    toast.style.fontFamily = 'var(--font-mono)';
    toast.style.fontSize = '0.72rem';
    toast.style.fontWeight = '600';
    toast.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(15px)';
    toast.style.transition = 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 20);
    
    // Fade out and remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            toast.remove();
        }, 250);
    }, 2200);
}

if (btnMainSnapshot) {
    btnMainSnapshot.addEventListener('click', () => {
        const snap = captureSnapshot();
        if (snap) {
            showToastNotification(`Snapshot #0${snap.id} recorded at ${snap.timestamp}`);
        }
    });
}

const btnResetSimulation = document.getElementById('btn-reset-simulation');
if (btnResetSimulation) {
    btnResetSimulation.addEventListener('click', () => {
        isPowerOn = false; // Reset to OFF state
        resetLab();
        logEvent("Simulation reset to default initial state.", "warning");
    });
}
