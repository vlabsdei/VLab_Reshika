if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

// Project Constants for EV simulation
const VEHICLE_MASS = 1500; // kg (Baseline EV mass)
const BATTERY_CAPACITY_J = 216000000; // Joules (60 kWh battery pack capacity)
const MOTOR_REGEN_LIMIT = 1200; // N (Max force MGU can capture)
const BASE_REGEN_EFFICIENCY = 0.82; // 82% base efficiency
const GRAVITY = 9.81; // m/s^2

// Road friction coefficient (mu) values per terrain
const TERRAIN_MU = {
    dry: 0.85,
    wet: 0.40,
    slippery_ice: 0.10
};

// Traffic density multipliers
const TRAFFIC_MULTIPLIER = {
    free_flow: 1.0,
    stop_go: 0.85,
    heavy_congestion: 0.65
};

// Map inputs and buttons to DOM elements
const inputSpeed = document.getElementById('input-speed');
const inputSlope = document.getElementById('input-slope');
const inputBrake = document.getElementById('input-brake');
const inputTerrain = document.getElementById('input-terrain');
const inputTraffic = document.getElementById('input-traffic');
const btnReset = document.getElementById('btn-reset');
const btnClearLog = document.getElementById('btn-clear-log');

const valSpeed = document.getElementById('val-speed');
const valSlope = document.getElementById('val-slope');
const valBrake = document.getElementById('val-brake');

const telKE = document.getElementById('tel-ke');
const telRecovered = document.getElementById('tel-recovered');
const telRecRatio = document.getElementById('tel-rec-ratio');
const telBattery = document.getElementById('tel-battery');
const telStability = document.getElementById('tel-stability');
const telSlipRatio = document.getElementById('tel-slip-ratio');
const cardStability = document.getElementById('card-stability');
const stabilityIcon = document.getElementById('stability-icon');
const telEfficiency = document.getElementById('tel-efficiency');
const telEfficiencyDesc = document.getElementById('tel-efficiency-desc');

const overlayAcc = document.getElementById('overlay-acc');
const overlayDist = document.getElementById('overlay-dist');
const overlayTime = document.getElementById('overlay-time');

const tblMu = document.getElementById('tbl-mu');
const tblFmax = document.getElementById('tbl-fmax');
const tblDecel = document.getElementById('tbl-decel');
const tblRegenAlloc = document.getElementById('tbl-regen-alloc');
const tblDuration = document.getElementById('tbl-duration');
const consoleOutput = document.getElementById('console-output');

// Phase 2 DOM Elements
const valSpeedMsCopy = document.getElementById('val-speed-ms');
const valSpeedKmhCopy = document.getElementById('val-speed-kmh-copy');
const formulaKeSubstitution = document.getElementById('formula-ke-substitution');
const formulaKeResult = document.getElementById('formula-ke-result');

const valKeCopy = document.getElementById('val-ke-copy');
const valEfficiencyCopy = document.getElementById('val-efficiency-copy');
const formulaRecSubstitution = document.getElementById('formula-rec-substitution');
const formulaRecResult = document.getElementById('formula-rec-result');

const valRecCopy2 = document.getElementById('val-rec-copy2');
const formulaSocSubstitution = document.getElementById('formula-soc-substitution');
const formulaSocResult = document.getElementById('formula-soc-result');

const conclusionStatusCard = document.getElementById('conclusion-status-card');
const conclusionBadge = document.getElementById('conclusion-badge');
const conclusionText = document.getElementById('conclusion-text');

const insightSafety = document.getElementById('insight-safety');
const insightEnv = document.getElementById('insight-env');
const insightRegen = document.getElementById('insight-regen');

const togglePhase1 = document.getElementById('toggle-phase1');
const togglePhase2 = document.getElementById('toggle-phase2');
const pageWrapper = document.getElementById('page-wrapper');

const canvas = document.getElementById('flow-canvas');
const ctx = canvas.getContext('2d');

// Simulation State
let currentSimulationData = {}; // Main data struct to track simulation state variables
let simState = {
    mode: 'cruising', // 'cruising', 'braking', 'stopped', 'accelerating'
    currentSpeedMs: 70 / 3.6,
    targetSpeedMs: 70 / 3.6,
    distanceX: 0,
    wheelAngle: 0,
    stateTimer: 0,
    brakeProgress: 0,
    recoveredEnergyAccumulator: 0,
    batteryGainAccumulator: 0,
    lastBrakeForce: 100,
    brakesReleased: false
};
let lastFrameTime = performance.now();
let hasSimRun = false;

// Attach input slider change listeners
inputSpeed.addEventListener('input', () => {
    valSpeed.textContent = `${inputSpeed.value} km/h`;
    runInstantaneousCalculation();
});

inputSlope.addEventListener('input', () => {
    const slopeVal = parseInt(inputSlope.value);
    valSlope.textContent = `${slopeVal > 0 ? '+' : ''}${slopeVal}°`;
    runInstantaneousCalculation();
});

inputBrake.addEventListener('input', () => {
    valBrake.textContent = `${inputBrake.value} N`;
    const brakeForce = parseFloat(inputBrake.value);
    if (brakeForce > 150 && !hasSimRun) {
        hasSimRun = true;
        enablePhase2Toggle();
    }
    runInstantaneousCalculation();
});

// Support scrolling over sliders to fine-tune inputs
[inputSpeed, inputSlope, inputBrake].forEach(slider => {
    slider.addEventListener('wheel', (event) => {
        event.preventDefault();
        
        const step = parseFloat(slider.step) || 1;
        const min = parseFloat(slider.min) || 0;
        const max = parseFloat(slider.max) || 100;
        let val = parseFloat(slider.value);
        
        if (event.deltaY < 0) {
            val = Math.min(max, val + step);
        } else {
            val = Math.max(min, val - step);
        }
        
        slider.value = val;
        slider.dispatchEvent(new Event('input'));
    }, { passive: false });
});

inputTerrain.addEventListener('change', runInstantaneousCalculation);
inputTraffic.addEventListener('change', runInstantaneousCalculation);

btnReset.addEventListener('click', resetParameters);
if (btnClearLog) {
    btnClearLog.addEventListener('click', clearLog);
}

// Resize canvas relative to its parent window size on resize
function resizeCanvas() {
    const rect = canvas.parentNode.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    drawVisualizer(); // Draw initial frame
}

window.addEventListener('resize', resizeCanvas);
setTimeout(resizeCanvas, 100);

// Loop running simulation frames continuously
function updateSimulation(now) {
    const dt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    
    const cappedDt = Math.min(dt, 0.1);
    
    tickSimulation(cappedDt);
    drawVisualizer();
    
    requestAnimationFrame(updateSimulation);
}

function tickSimulation(dt) {
    // Accumulate time for traffic cycles
    simState.stateTimer += dt;
    
    // Simulate automatic traffic brake blending based on traffic condition (frequency controller)
    const sliderBrakeForce = parseFloat(inputBrake.value);
    let trafficBrakeForce = 0;
    const traffic = inputTraffic.value;
    if (traffic === 'stop_go') {
        const cycleTime = simState.stateTimer % 6;
        if (cycleTime > 4) {
            trafficBrakeForce = 600;
        }
    } else if (traffic === 'heavy_congestion') {
        const cycleTime = simState.stateTimer % 4;
        if (cycleTime > 2) {
            trafficBrakeForce = 1200;
        }
    }
    const brakeForce = Math.max(sliderBrakeForce, trafficBrakeForce);
    
    // Store current active brake force for the visualizer
    simState.currentBrakeForce = brakeForce;
    
    const res = calculateMetrics(brakeForce);
    currentSimulationData = res;
    
    // Stop simulation if downhill gravity exceeds brake force (runaway car)
    if (res.decelRate <= 0) {
        simState.currentSpeedMs = 0;
        simState.brakeProgress = 0;
        
        // Reset active HUD fields when aborted
        valSpeed.textContent = `0 km/h (Aborted)`;
        telKE.innerHTML = `0 <span class="unit">J</span>`;
        telRecovered.innerHTML = `0 <span class="unit">J</span>`;
        telBattery.innerHTML = `0.0000 <span class="unit">%</span>`;
        if (tblDecel) {
            tblDecel.textContent = `Negative Decel`;
        }
        return;
    }
    
    const sliderSpeedMs = parseFloat(inputSpeed.value) / 3.6;
    simState.targetSpeedMs = sliderSpeedMs;
    
    // Scale brake force indicator progress (out of 2000 N max)
    simState.brakeProgress = brakeForce / 2000;
    
    // Check if brake inputs exceed minor tolerance (150 N)
    let applyBrakes = brakeForce > 150;
    
    // Let vehicle move again if user starts letting off the brakes
    if (simState.currentSpeedMs === 0) {
        if (brakeForce < simState.lastBrakeForce - 1) {
            simState.brakesReleased = true;
        }
    }
    
    // Manage brakes-released override state
    if (simState.brakesReleased) {
        applyBrakes = false;
        // Reset the override once we return close to cruising speed
        if (simState.currentSpeedMs >= simState.targetSpeedMs - 0.5) {
            simState.brakesReleased = false;
        }
        // If the user increases the brake force again, apply brakes
        if (brakeForce > simState.lastBrakeForce + 5) {
            simState.brakesReleased = false;
        }
    }
    
    // Apply deceleration if braking, else accelerate back to set speed
    if (applyBrakes) {
        // Brakes are applied: decelerate vehicle
        simState.currentSpeedMs -= res.decelRate * dt;
        if (simState.currentSpeedMs < 0) {
            simState.currentSpeedMs = 0;
        }
    } else {
        // Brakes are released: accelerate/decelerate back to the target speed slider value
        const currentSpeed = simState.currentSpeedMs;
        if (currentSpeed < sliderSpeedMs) {
            simState.currentSpeedMs += 3.0 * dt; // Accelerate at 3 m/s²
            if (simState.currentSpeedMs > sliderSpeedMs) {
                simState.currentSpeedMs = sliderSpeedMs;
            }
        } else if (currentSpeed > sliderSpeedMs) {
            simState.currentSpeedMs -= 3.0 * dt; // Decelerate at 3 m/s²
            if (simState.currentSpeedMs < sliderSpeedMs) {
                simState.currentSpeedMs = sliderSpeedMs;
            }
        }
    }
    // Integrate captured energy over time (Power = F_regen * v * efficiency)
    // Only recover energy if brakes are active
    const regenForce = Math.min(brakeForce, MOTOR_REGEN_LIMIT);
    const efficiency = res.efficiencyPercent / 100;
    const power = applyBrakes ? (regenForce * simState.currentSpeedMs * efficiency) : 0;
    simState.recoveredEnergyAccumulator += power * dt;
    
    // Save current brake force value to compare in the next frame
    simState.lastBrakeForce = brakeForce;
    
    // Increment odometer and rotate wheels based on velocity
    simState.distanceX += simState.currentSpeedMs * dt * 20; // scale factor
    const wheelRadius = 10;
    simState.wheelAngle += (simState.currentSpeedMs * dt) / (wheelRadius * 0.05);
    
    // Update labels and values on simulation HUD
    updateDynamicTelemetry();
}

function updateDynamicTelemetry() {
    const currentSpeedMs = simState.currentSpeedMs;
    const currentSpeedKmh = currentSpeedMs * 3.6;
    
    // Update target value display during dynamic simulation
    valSpeed.textContent = `${Math.round(currentSpeedKmh)} km/h`;
    
    // Calc current KE (1/2 * m * v^2)
    const currentKE = 0.5 * VEHICLE_MASS * Math.pow(currentSpeedMs, 2);
    telKE.innerHTML = `${Math.round(currentKE).toLocaleString()} <span class="unit">J</span>`;
    
    // Calc cumulative energy recovered
    const recovered = simState.recoveredEnergyAccumulator;
    telRecovered.innerHTML = `${Math.round(recovered).toLocaleString()} <span class="unit">J</span>`;
    
    let efficiencyPercent = currentSimulationData.efficiencyPercent || 0;
    telRecRatio.textContent = `Recovery efficiency: ${efficiencyPercent.toFixed(1)}%`;
    
    // Calc battery SOC percentage gain
    const batteryGainPercent = (recovered / BATTERY_CAPACITY_J) * 100;
    telBattery.innerHTML = `${batteryGainPercent.toFixed(4)} <span class="unit">%</span>`;
    
    // Show current deceleration rate
    if (tblDecel) {
        tblDecel.textContent = `${currentSimulationData.decelRate.toFixed(2)} m/s²`;
    }
}

// Kick off animation loop
requestAnimationFrame(updateSimulation);

// Output diagnostics message to terminal log panel
function logToTerminal(message, type = 'system') {
    // Fallback to standard console log
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    if (!consoleOutput) return;
    
    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    
    // Add current time prefix
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    
    if (type === 'input') {
        line.innerHTML = `&gt; ${message}`;
    } else {
        line.innerHTML = `[${timeStr}] [${type.toUpperCase()}] ${message}`;
    }
    
    consoleOutput.appendChild(line);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

// Empty the terminal logs
function clearLog() {
    if (!consoleOutput) return;
    consoleOutput.innerHTML = '';
    logToTerminal('Console cleared. Ready.', 'system');
}

// Revert inputs to baseline experimental values
function resetParameters() {
    inputSpeed.value = 70;
    inputSlope.value = 0;
    inputBrake.value = 100;
    inputTerrain.value = 'dry';
    inputTraffic.value = 'free_flow';
    
    valSpeed.textContent = '70 km/h';
    valSlope.textContent = '0°';
    valBrake.textContent = '100 N';
    
    simState.mode = 'cruising';
    simState.currentSpeedMs = 70 / 3.6;
    simState.targetSpeedMs = 70 / 3.6;
    simState.brakeProgress = 0;
    simState.recoveredEnergyAccumulator = 0;
    simState.lastBrakeForce = 100;
    simState.brakesReleased = false;
    
    // Reset simulation run state and disable toggle
    hasSimRun = false;
    disablePhase2Toggle();
    
    logToTerminal('Parameters reset to experimental defaults.', 'system');
    runInstantaneousCalculation();
}

// Pure math physics calculator
function calculateMetrics(overrideBrakeForce) {
    const speedKmh = parseFloat(inputSpeed.value);
    const speedMs = speedKmh / 3.6; // convert to m/s
    const slopeDeg = parseFloat(inputSlope.value);
    const slopeRad = (slopeDeg * Math.PI) / 180;
    const brakeForce = overrideBrakeForce !== undefined ? overrideBrakeForce : parseFloat(inputBrake.value);
    const terrain = inputTerrain.value;
    const traffic = inputTraffic.value;
    
    // Starting KE
    const initialKE = 0.5 * VEHICLE_MASS * Math.pow(speedMs, 2); // Joules
    
    // Find friction coefficient
    const mu = TERRAIN_MU[terrain] || 0.85;
    
    // Find normal load (Fn = m * g * cos(slope))
    const normalForce = VEHICLE_MASS * GRAVITY * Math.cos(slopeRad);
    
    // Find slope gravity component (Fg = m * g * sin(slope))
    const gravityForce = VEHICLE_MASS * GRAVITY * Math.sin(slopeRad);
    
    // Find traction limit (Fmax = mu * Fn)
    const forceTraction = mu * VEHICLE_MASS * GRAVITY * Math.cos(slopeRad);
    
    // Check if brake force exceeds tire grip limit
    const wheelSlip = brakeForce > forceTraction;
    const stabilityStatus = wheelSlip ? "Traction Loss - Wheel Slip" : "Stable";
    
    // Calculate deceleration (a = F / m)
    const totalBrakingForce = brakeForce + gravityForce;
    const decelRate = totalBrakingForce / VEHICLE_MASS; // m/s^2
    
    // Calculate distance and time to full stop
    let stopTime = 0;
    let stopDistance = 0;
    let workDoneByBrakes = 0;
    
    if (decelRate <= 0) {
        // Vehicle will accelerate downhill, cannot stop
        stopTime = Infinity;
        stopDistance = Infinity;
        workDoneByBrakes = 0;
    } else {
        stopTime = speedMs / decelRate; // t = v / a
        stopDistance = Math.pow(speedMs, 2) / (2 * decelRate); // d = v^2 / 2a
        workDoneByBrakes = brakeForce * stopDistance; // Joules
    }
    
    // Calculate MGU split capacity
    const regenForceAllocated = Math.min(brakeForce, MOTOR_REGEN_LIMIT);
    const regenRatio = brakeForce > 0 ? (regenForceAllocated / brakeForce) : 0;
    
    // Traffic modifier
    const trafficMult = TRAFFIC_MULTIPLIER[traffic];
    
    // Calculate final energy recovery efficiency
    // Default efficiency is 82%
    let efficiency = 0.82;
    
    // Adjust for slope gradient impacts
    efficiency += slopeDeg * -0.008;
    
    // Deduct 45% penalty if wheels are slipping
    if (wheelSlip) {
        efficiency -= 0.45;
    }
    
    // Factor in Traffic density modifier
    efficiency = efficiency * trafficMult;
    
    // Keep efficiency inside bounds [0, 1]
    efficiency = Math.max(0, Math.min(1, efficiency));
    const efficiencyPercent = efficiency * 100;
    
    // Total energy captured (E = KE * efficiency)
    let recoveredEnergy = 0;
    if (decelRate > 0) {
        recoveredEnergy = initialKE * efficiency;
    }
    
    // Battery state of charge (SOC) gain
    const batteryGainPercent = (recoveredEnergy / BATTERY_CAPACITY_J) * 100;
    
    // Friction safety margin
    const slipMargin = Math.max(0, ((forceTraction - brakeForce) / forceTraction) * 100);
    
    return {
        initialKE,
        recoveredEnergy,
        efficiencyPercent,
        batteryGainPercent,
        stabilityStatus,
        wheelSlip,
        slipMargin,
        mu,
        forceTraction,
        gravityForce,
        decelRate,
        regenRatio,
        stopTime,
        stopDistance,
        workDoneByBrakes,
        speedMs,
        slopeDeg
    };
}

// Quick recalc function for real-time sliders feedback
function runInstantaneousCalculation() {
    const res = calculateMetrics();
    currentSimulationData = res;
    
    // Update Telemetry Panel (Displayed in J)
    telKE.innerHTML = `${Math.round(res.initialKE).toLocaleString()} <span class="unit">J</span>`;
    telRecovered.innerHTML = `${Math.round(res.recoveredEnergy).toLocaleString()} <span class="unit">J</span>`;
    telRecRatio.textContent = `Recovery efficiency: ${res.efficiencyPercent.toFixed(1)}%`;
    telBattery.innerHTML = `${res.batteryGainPercent.toFixed(4)} <span class="unit">%</span>`;
    
    // Update Braking Efficiency Card
    if (telEfficiency) {
        telEfficiency.innerHTML = `${res.efficiencyPercent.toFixed(1)} <span class="unit">%</span>`;
    }
    if (telEfficiencyDesc) {
        telEfficiencyDesc.textContent = res.wheelSlip ? "Degraded by slip penalty" : "Safe regenerative allocation";
    }
    
    // Update Stability UI Card
    telStability.textContent = res.stabilityStatus;
    if (res.wheelSlip) {
        cardStability.className = "card telemetry-card warning-card";
        stabilityIcon.textContent = "WARN";
        stabilityIcon.className = "red-icon";
        telSlipRatio.textContent = `Exceeds grip by: ${Math.round(Math.abs(res.forceTraction - parseFloat(inputBrake.value)))} N`;
    } else {
        cardStability.className = "card telemetry-card";
        stabilityIcon.textContent = "OK";
        stabilityIcon.className = "green-icon";
        telSlipRatio.textContent = `Tire slip safety margin: ${res.slipMargin.toFixed(1)}%`;
    }
    
    // Update Canvas Overlays (if elements exist)
    if (overlayAcc && overlayDist && overlayTime) {
        if (res.decelRate <= 0) {
            overlayAcc.textContent = "Accelerating";
            overlayDist.textContent = "Infinite (Non-stopping)";
            overlayTime.textContent = "Infinite";
        } else {
            overlayAcc.textContent = `${res.decelRate.toFixed(2)} m/s²`;
            overlayDist.textContent = `${res.stopDistance.toFixed(1)} m`;
            overlayTime.textContent = `${res.stopTime.toFixed(1)} s`;
        }
    }
    
    // Update Analytics Table
    tblMu.textContent = res.mu.toFixed(2);
    tblFmax.textContent = `${Math.round(res.forceTraction).toLocaleString()} N`;
    tblDecel.textContent = res.decelRate <= 0 ? "Negative Decel" : `${res.decelRate.toFixed(2)} m/s²`;
    tblRegenAlloc.textContent = `${Math.round(res.regenRatio * 100)}%`;
    tblDuration.textContent = res.decelRate <= 0 ? "Infinite" : `${res.stopTime.toFixed(2)} s`;
    
    // Redraw static visualizer
    drawVisualizer();
    
    // Update Phase 2 mathematical verification and conclusions
    updatePhase2();
}



// Wheel assembly rendering function
function drawWheelAssembly(ctx, x, y, r, angle, isSlipping) {
    ctx.save();
    ctx.translate(x, y);
    if (!isSlipping) {
        ctx.rotate(angle);
    }
    
    // Tire outer ring (turns red under active wheel slip)
    ctx.lineWidth = 5;
    ctx.strokeStyle = isSlipping ? '#ef4444' : '#1e293b';
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(0, 0, r - 2.5, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Rim core
    ctx.fillStyle = '#cbd5e1';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r - 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Spokes
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
        const theta = (i * Math.PI) / 2;
        ctx.moveTo(0, 0);
        ctx.lineTo((r - 5) * Math.cos(theta), (r - 5) * Math.sin(theta));
    }
    ctx.stroke();
    
    // Axle center point
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.restore();
}

// Force vector arrow rendering function
function drawArrow(ctx, x, y, dx, dy, color, label) {
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len < 2) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3.0; // thicker lines for force vectors
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx, y + dy);
    ctx.stroke();
    
    // Arrow head (double size)
    const angle = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.moveTo(x + dx, y + dy);
    ctx.lineTo(x + dx - 10 * Math.cos(angle - Math.PI/6), y + dy - 10 * Math.sin(angle - Math.PI/6));
    ctx.lineTo(x + dx - 10 * Math.cos(angle + Math.PI/6), y + dy - 10 * Math.sin(angle + Math.PI/6));
    ctx.closePath();
    ctx.fill();
    
    // Text label (larger font)
    ctx.font = 'bold 12px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + dx + 10 * Math.cos(angle), y + dy + 10 * Math.sin(angle) + 4);
    ctx.restore();
}

// Draw slope angle dial widget
function drawSlopeCompass(ctx, cx, cy, slopeRad) {
    const r = 30; // scaled up from 22
    ctx.save();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.stroke();
    
    ctx.translate(cx, cy);
    ctx.rotate(-slopeRad);
    ctx.strokeStyle = '#1d4ed8'; // Royal Blue
    ctx.lineWidth = 3.5; // thicker compass needle
    ctx.beginPath();
    ctx.moveTo(-r + 4, 0);
    ctx.lineTo(r - 4, 0);
    ctx.stroke();
    
    ctx.fillStyle = '#1d4ed8';
    ctx.beginPath();
    ctx.arc(r - 4, 0, 3.5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
    
    ctx.fillStyle = '#64748b';
    ctx.font = '10px Outfit'; // larger label
    ctx.textAlign = 'center';
    ctx.fillText('Slope Angle', cx, cy - r - 6);
}

// Draw visualizer framework on canvas
function drawVisualizer() {
    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;
    
    ctx.clearRect(0, 0, w, h);
    
    // Draw background grid with scrolling offset
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    const gridSpacing = 40;
    const gridOffset = simState.distanceX % gridSpacing;
    for (let x = -gridOffset; x < w + gridSpacing; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }
    
    const slopeDeg = currentSimulationData.slopeDeg || 0;
    const slopeRad = (slopeDeg * Math.PI) / 180;
    const brakeForce = simState.currentBrakeForce !== undefined ? simState.currentBrakeForce : parseFloat(inputBrake.value);
    const isSlipping = currentSimulationData.wheelSlip && simState.currentSpeedMs > 0.1;
    
    // Draw Road Slope Line
    ctx.save();
    ctx.translate(w / 2, h / 2 + 30);
    ctx.rotate(-slopeRad);
    
    // Draw Asphalt Road
    ctx.fillStyle = '#334155';
    ctx.fillRect(-w, 0, w * 2, 200);
    
    // Draw road markings with scrolling offset
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    const dashLength = 15;
    const gapLength = 15;
    const cycleLength = dashLength + gapLength;
    const roadOffset = simState.distanceX % cycleLength;
    ctx.beginPath();
    for (let rx = -w - cycleLength; rx < w + cycleLength; rx += cycleLength) {
        ctx.moveTo(rx - roadOffset, 15);
        ctx.lineTo(rx - roadOffset + dashLength, 15);
    }
    ctx.stroke();
    
    // Draw terrain overlays
    if (inputTerrain.value === 'wet') {
        ctx.fillStyle = 'rgba(14, 165, 233, 0.15)';
        ctx.fillRect(-w, 0, w * 2, 10);
    } else if (inputTerrain.value === 'slippery_ice') {
        ctx.fillStyle = 'rgba(241, 245, 249, 0.4)';
        ctx.fillRect(-w, 0, w * 2, 10);
        ctx.fillStyle = 'rgba(186, 230, 253, 0.3)';
        ctx.fillRect(-w, 0, w * 2, 3);
    }
    
    // Calculate vehicle position (stays centered or slightly offset based on brake progress)
    const baseVehicleX = -w / 12;
    const vehicleX = baseVehicleX - 15 * simState.brakeProgress;
    // 1. Wheels (drawn behind the body arches)
    const wheelRadius = 14;
    const wheelY = -14;
    const rotationAngle = simState.wheelAngle;
    drawWheelAssembly(ctx, vehicleX - 33, wheelY, wheelRadius, rotationAngle, isSlipping);
    drawWheelAssembly(ctx, vehicleX + 33, wheelY, wheelRadius, rotationAngle, isSlipping);
    
    // 2. Realistic EV Silhouette (Opaque sports sedan body)
    const bodyGrad = ctx.createLinearGradient(vehicleX, -60, vehicleX, -18);
    bodyGrad.addColorStop(0, '#3b82f6'); // bright royal highlight
    bodyGrad.addColorStop(0.5, '#1d4ed8'); // rich royal blue
    bodyGrad.addColorStop(1, '#1e3a8a'); // dark navy shadow
    
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    // Start at front bumper bottom
    ctx.moveTo(vehicleX - 65, -18);
    // Up to front nose
    ctx.lineTo(vehicleX - 65, -30);
    ctx.lineTo(vehicleX - 62, -34);
    // Sloping hood
    ctx.lineTo(vehicleX - 42, -37);
    // Windshield
    ctx.lineTo(vehicleX - 20, -56);
    // Roof
    ctx.lineTo(vehicleX + 20, -56);
    // Rear windshield
    ctx.lineTo(vehicleX + 44, -39);
    // Trunk deck
    ctx.lineTo(vehicleX + 60, -39);
    // Rear tail bumper
    ctx.lineTo(vehicleX + 65, -30);
    ctx.lineTo(vehicleX + 65, -18);
    
    // Bottom edge with wheel arches:
    // Line to rear wheel arch edge
    ctx.lineTo(vehicleX + 50, -18);
    // Rear wheel arch (from +50 to +16, center at +33)
    ctx.arc(vehicleX + 33, -18, 17, 0, Math.PI, true); // counter-clockwise
    // Line between wheels
    ctx.lineTo(vehicleX - 16, -18);
    // Front wheel arch (from -16 to -50, center at -33)
    ctx.arc(vehicleX - 33, -18, 17, 0, Math.PI, true);
    // Line to front bumper bottom
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Cabin Windows (Opaque glass fill)
    const winGrad = ctx.createLinearGradient(vehicleX, -53, vehicleX, -38);
    winGrad.addColorStop(0, '#eff6ff'); // light sky tint
    winGrad.addColorStop(1, '#bfdbfe'); // soft blue tint
    
    ctx.fillStyle = winGrad;
    ctx.strokeStyle = '#1e40af'; // dark blue pane dividers
    ctx.lineWidth = 1.5;
    
    // Front Window
    ctx.beginPath();
    ctx.moveTo(vehicleX - 17, -53);
    ctx.lineTo(vehicleX - 2, -53);
    ctx.lineTo(vehicleX - 2, -38);
    ctx.lineTo(vehicleX - 36, -38);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Rear Window
    ctx.beginPath();
    ctx.moveTo(vehicleX + 2, -53);
    ctx.lineTo(vehicleX + 22, -53);
    ctx.lineTo(vehicleX + 41, -38);
    ctx.lineTo(vehicleX + 2, -38);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // 4. Headlight (Yellow wedge representing glow)
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(vehicleX - 65, -28);
    ctx.lineTo(vehicleX - 60, -25);
    ctx.lineTo(vehicleX - 64, -22);
    ctx.closePath();
    ctx.fill();
    
    // 5. Taillight (Red LED bar)
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(vehicleX + 62, -32, 3, 6);
    
    // 9. Slip Skid Sparks / Warning Text
    if (isSlipping && simState.currentSpeedMs > 0.1) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(vehicleX - 33, 0);
        ctx.lineTo(vehicleX - 58, 0);
        ctx.moveTo(vehicleX + 33, 0);
        ctx.lineTo(vehicleX + 8, 0);
        ctx.stroke();
        
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 12px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ ACTIVE SLIP DETECTED', vehicleX, -70);
    }
    
    // 10. Regen Energy Current pulses
    if (brakeForce > 0 && simState.currentSpeedMs > 0.1 && !isSlipping) {
        ctx.fillStyle = '#14532d'; // British Racing Green
        const pulseT = (performance.now() / 300) % 1;
        const p1X = (vehicleX - 36) + (36 * pulseT);
        const p1Y = -33 - (12 * pulseT);
        ctx.beginPath();
        ctx.arc(p1X, p1Y, 3, 0, 2 * Math.PI);
        ctx.fill();
        
        const p2X = vehicleX;
        const p2Y = -42 + (2 * pulseT);
        ctx.beginPath();
        ctx.arc(p2X, p2Y, 3, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    // 11. Physics Vector Arrows (at Center of Gravity CG)
    const cgX = vehicleX;
    const cgY = -45;
    
    // Weight (W) and Normal Force (Fn)
    drawArrow(ctx, cgX, cgY, 0, 38, '#64748b', 'W');
    drawArrow(ctx, cgX, cgY, 0, -38, '#64748b', 'Fn');
    
    // Braking Force vector
    const brakeArrowLen = -25 * (brakeForce / 1000);
    if (brakeForce > 0) {
        drawArrow(ctx, cgX, cgY, brakeArrowLen, 0, '#ef4444', 'Fb');
    }
    
    // Parallel gravity force along slope
    const slopeVal = parseFloat(inputSlope.value);
    if (slopeVal !== 0) {
        const gravityArrowLen = -25 * (currentSimulationData.gravityForce / 1000 || 0);
        drawArrow(ctx, cgX, cgY - 12, gravityArrowLen, 0, '#8b5cf6', 'Fg');
    }
    
    ctx.restore();
    
    // 12. Slope compass in bottom corner
    drawSlopeCompass(ctx, 50, h - 50, slopeRad);

    // 13. Simulation Abort Message Overlay (if vehicle cannot stop)
    if (currentSimulationData.decelRate <= 0) {
        ctx.save();
        
        const boxW = Math.min(w - 40, 420);
        const boxH = 32;
        const boxX = (w - boxW) / 2;
        const boxY = 16;
        
        // Background with soft red fill
        ctx.fillStyle = 'rgba(254, 242, 242, 0.95)';
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(boxX, boxY, boxW, boxH, 6);
        } else {
            ctx.rect(boxX, boxY, boxW, boxH);
        }
        ctx.fill();
        ctx.stroke();
        
        // Red indicator accent line on the left side
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(boxX, boxY, 4, boxH, [6, 0, 0, 6]);
        } else {
            ctx.rect(boxX, boxY, 4, boxH);
        }
        ctx.fill();
        
        // Abort Text
        ctx.fillStyle = '#991b1b';
        ctx.font = 'bold 11px Outfit';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚠️ Simulation Aborted: Gravity exceeds brake force. Vehicle cannot stop.', boxX + 16, boxY + boxH / 2);
        
        ctx.restore();
    }
}

// Update Phase 2 equations display values
function updatePhase2() {
    const res = currentSimulationData;
    if (!res || res.speedMs === undefined) return;

    const speedKmh = parseFloat(inputSpeed.value);
    const speedMs = speedKmh / 3.6;
    
    // 1. Kinetic Energy Update
    if (valSpeedMsCopy) valSpeedMsCopy.textContent = `${speedMs.toFixed(2)} m/s`;
    if (valSpeedKmhCopy) valSpeedKmhCopy.textContent = Math.round(speedKmh);
    
    if (formulaKeSubstitution) {
        formulaKeSubstitution.innerHTML = `0.5 &times; 1500 &times; (${speedMs.toFixed(2)})<sup>2</sup>`;
    }
    if (formulaKeResult) {
        formulaKeResult.textContent = `${Math.round(res.initialKE).toLocaleString()} J`;
    }
    
    // 2. Recovered Energy Update
    if (valKeCopy) valKeCopy.textContent = `${Math.round(res.initialKE).toLocaleString()} J`;
    if (valEfficiencyCopy) valEfficiencyCopy.textContent = `${res.efficiencyPercent.toFixed(1)}%`;
    
    const efficiencyDecimal = (res.efficiencyPercent / 100).toFixed(3);
    if (formulaRecSubstitution) {
        formulaRecSubstitution.innerHTML = `${Math.round(res.initialKE).toLocaleString()} J &times; ${efficiencyDecimal}`;
    }
    if (formulaRecResult) {
        formulaRecResult.textContent = `${Math.round(res.recoveredEnergy).toLocaleString()} J`;
    }
    
    // 3. Battery Gain Update
    if (valRecCopy2) valRecCopy2.textContent = `${Math.round(res.recoveredEnergy).toLocaleString()} J`;
    if (formulaSocSubstitution) {
        formulaSocSubstitution.innerHTML = `${Math.round(res.recoveredEnergy).toLocaleString()} / 216,000,000 &times; 100`;
    }
    if (formulaSocResult) {
        formulaSocResult.textContent = `${res.batteryGainPercent.toFixed(4)}%`;
    }
    
    // 4. Conclusion & Insights Update
    updateConclusion(res);
}

function updateConclusion(res) {
    if (!conclusionStatusCard || !conclusionBadge || !conclusionText) return;
    
    const brakeForce = parseFloat(inputBrake.value);
    const slopeDeg = parseFloat(inputSlope.value);
    
    // Reset conclusion card state classes
    conclusionStatusCard.className = "card conclusion-card";
    
    if (res.decelRate <= 0) {
        // Downhill Runaway
        conclusionStatusCard.classList.add("state-runaway");
        conclusionBadge.textContent = "RUNAWAY";
        conclusionBadge.className = "status-badge danger-badge";
        
        conclusionText.innerHTML = `
            <strong>Critical Danger:</strong> The vehicle cannot stop under current conditions. 
            At a downhill slope of ${slopeDeg}°, the gravity force along the incline 
            (${Math.round(Math.abs(res.gravityForce)).toLocaleString()} N) exceeds the applied braking force 
            (${brakeForce} N). The vehicle will continue to accelerate downhill. 
            Energy recovery is disabled under positive acceleration runaway states.
        `;
        
        if (insightSafety) {
            insightSafety.innerHTML = `<strong>Traction Safety:</strong> Braking force is insufficient to overcome downhill gravitational acceleration.`;
        }
        if (insightEnv) {
            insightEnv.innerHTML = `<strong>Slope Gravity:</strong> Incline gravity acting downhill (${Math.round(Math.abs(res.gravityForce)).toLocaleString()} N) pulls the vehicle faster than braking can slow it.`;
        }
        if (insightRegen) {
            insightRegen.innerHTML = `<strong>Regen Disengaged:</strong> Continuous acceleration prevents regenerative speed reduction and battery capture.`;
        }
    } else if (res.wheelSlip) {
        // Wheel Slip
        conclusionStatusCard.classList.add("state-slip");
        conclusionBadge.textContent = "SLIP DETECTED";
        conclusionBadge.className = "status-badge warning-badge";
        
        conclusionText.innerHTML = `
            <strong>Warning (Active Slip):</strong> The braking force of ${brakeForce} N 
            exceeds the road traction grip limit (${Math.round(res.forceTraction).toLocaleString()} N) 
            for the current ${inputTerrain.value} surface (&mu; = ${res.mu.toFixed(2)}). 
            This triggers tire lockup. To preserve steering, a <strong>45% efficiency penalty</strong> 
            is active, dropping recovery efficiency to <strong>${res.efficiencyPercent.toFixed(1)}%</strong> 
            and total energy recovered to <strong>${Math.round(res.recoveredEnergy).toLocaleString()} J</strong>.
        `;
        
        if (insightSafety) {
            insightSafety.innerHTML = `<strong>Traction Overlimit:</strong> Applied force (${brakeForce} N) exceeds maximum road grip (${Math.round(res.forceTraction).toLocaleString()} N), causing slip.`;
        }
        if (insightEnv) {
            insightEnv.innerHTML = `<strong>Surface Slip:</strong> Low grip surface (&mu; = ${res.mu.toFixed(2)}) significantly reduces the deceleration threshold.`;
        }
        if (insightRegen) {
            insightRegen.innerHTML = `<strong>Regen Penalty:</strong> ABS blending operates at a reduced efficiency to prioritize directional vehicle stability.`;
        }
    } else {
        // Stable
        conclusionStatusCard.classList.add("state-stable");
        conclusionBadge.textContent = "STABLE";
        conclusionBadge.className = "status-badge stable-badge";
        
        const slopeDesc = slopeDeg > 0 ? `uphill grade of ${slopeDeg}°` : (slopeDeg < 0 ? `downhill grade of ${Math.abs(slopeDeg)}°` : `flat road`);
        const regenPercentText = Math.round(res.regenRatio * 100);
        
        conclusionText.innerHTML = `
            <strong>Optimal Braking:</strong> Deceleration is stable. 
            The applied braking force (${brakeForce} N) is below the road grip limit 
            (${Math.round(res.forceTraction).toLocaleString()} N), maintaining a safety margin of ${res.slipMargin.toFixed(1)}%. 
            On the ${inputTerrain.value} surface, the motor-generator harvested 
            <strong>${regenPercentText}%</strong> of the braking effort, achieving 
            <strong>${res.efficiencyPercent.toFixed(1)}%</strong> system efficiency and recovering 
            <strong>${Math.round(res.recoveredEnergy).toLocaleString()} J</strong> back to the battery (+${res.batteryGainPercent.toFixed(4)}% SOC).
        `;
        
        if (insightSafety) {
            insightSafety.innerHTML = `<strong>Optimal Control:</strong> Braking force is safely within traction limits, preventing tire lockup or stability loss.`;
        }
        if (insightEnv) {
            insightEnv.innerHTML = `<strong>Grade Effect:</strong> The ${slopeDesc} adjusts the stop timeline, modifying regeneration efficiency by ${(slopeDeg * -0.8).toFixed(1)}%.`;
        }
        if (insightRegen) {
            insightRegen.innerHTML = `<strong>Max Yield:</strong> Safe regenerative allocation enables optimal capture of vehicle kinetic energy.`;
        }
    }
}

// Phase Toggle Management
function enablePhase2Toggle() {
    if (togglePhase2) {
        togglePhase2.disabled = false;
        logToTerminal('Phase 2 mathematical verification is now unlocked.', 'system');
    }
}

function disablePhase2Toggle() {
    if (togglePhase2) {
        togglePhase2.disabled = true;
        togglePhase2.classList.remove('active');
    }
    if (togglePhase1) {
        togglePhase1.classList.add('active');
    }
    if (pageWrapper) {
        pageWrapper.classList.remove('show-phase2');
    }
}

// Bind Toggle Listeners
if (togglePhase1 && togglePhase2) {
    togglePhase1.addEventListener('click', () => {
        togglePhase1.classList.add('active');
        togglePhase2.classList.remove('active');
        if (pageWrapper) {
            pageWrapper.classList.remove('show-phase2');
        }
    });

    togglePhase2.addEventListener('click', () => {
        if (togglePhase2.disabled) return;
        togglePhase2.classList.add('active');
        togglePhase1.classList.remove('active');
        if (pageWrapper) {
            pageWrapper.classList.add('show-phase2');
        }
    });
}

// Run baseline calculation on load
runInstantaneousCalculation();
logToTerminal('Simulation model dynamic telemetry bound successfully.', 'system');
logToTerminal('Current active configuration: Speed: 70 km/h, Slope: 0 deg, Brake Force: 1000 N, Terrain: Dry.', 'system');
logToTerminal('Phase 2 mathematical verification and conclusions initialized.', 'system');
