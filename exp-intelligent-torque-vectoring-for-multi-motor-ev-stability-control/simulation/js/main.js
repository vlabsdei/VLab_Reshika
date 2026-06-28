// --- Target HTML HUD interaction elements ---
const steeringInput = document.getElementById('input-steering');
const torqueInput = document.getElementById('input-torque');
const frictionInput = document.getElementById('input-friction');
const vectoringInput = document.getElementById('input-vectoring');
const btnReset = document.getElementById('btn-reset');

const valSteering = document.getElementById('val-steering');
const valTorque = document.getElementById('val-torque');
const valFriction = document.getElementById('val-friction');
const valStability = document.getElementById('val-stability');
const valTorqueLeft = document.getElementById('val-torque-left');
const valTorqueRight = document.getElementById('val-torque-right');
const pctTorqueLeft = document.getElementById('pct-torque-left');
const pctTorqueRight = document.getElementById('pct-torque-right');

const statusBadge = document.getElementById('status-badge');
const statusDetail = document.getElementById('status-detail');
const observationsBox = document.getElementById('observations-box');

// HUD Cards for border glowing states
const cardTelemetry = document.getElementById('hud-telemetry-card');
const cardObservations = document.getElementById('hud-observations-card');
const cardSteering = document.getElementById('hud-steering-card');
const cardPower = document.getElementById('hud-power-card');
const cardFriction = document.getElementById('hud-friction-card');
const cardScenarios = document.getElementById('hud-scenarios-card');

const canvas = document.getElementById('simulation-canvas');
const ctx = canvas.getContext('2d');

// --- Physics Constants ---
const TIRE_RADIUS = 0.3; // r = 0.3 meters
const WEIGHT_NOMINAL = 1200; // nominal vertical load component per wheel (Newtons)

// --- Proving Ground States & Buffers ---
const trailSegments = [];
const smokeParticles = [];
let roadOffset = 0;

let carX = 250;
let carZ = 0;
let carYaw = 0; // heading angle (spins out under uncontrolled slip)
let slideVelocity = 0;
let rollAngle = 0;

let centerX = window.innerWidth / 2;
let centerY = window.innerHeight / 2;

// --- State Variables ---
let leftTorque = 75;
let rightTorque = 75;
let leftPercent = 50;
let rightPercent = 50;
let leftCombined = 0, rightCombined = 0;
let ceilingL = 0, ceilingR = 0;
let isSlipping = false;
let stabilityIndex = 100;
let steerRad = 0;
let weightTransfer = 0;
let weightL = 1200, weightR = 1200; // global variables for Live Formula UI
let steerScaleFactor = 1.0; // global variable for Live Formula UI

let steeringAngle = 0;
let baseTorque = 150;
let surfaceFriction = 0.8;
let vectoringEnabled = true;
let isProgrammaticChange = false; // Guard flag for programmatic value sets

// --- Timer & Evaluation Stats ---
let timeRemaining = 45.0;
let isTimerRunning = true;
let evaluationStats = {
  tvOnTime: 0,
  tvOffTime: 0,
  stableTicks: 0,
  slipTicks: 0,
  totalTicks: 0,
  maxSteering: 0,
  accumulatedStability: 0
};

// Handle Canvas Resize
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  centerX = canvas.width / 2;
  centerY = canvas.height / 2 - 380; // Shift projection center up by 380px to clear bottom controls without stretching
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- 3D Perspective Projection Matrix Math ---
function project(x, y, z) {
  const pitch = 13 * Math.PI / 180; // look down slightly
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  
  // y is vertical, z is depth (distance away), x is lateral
  // Camera height offset: 70 units
  const yCam = y - 70;
  const zCam = z + 240; // camera is 240 units behind the vehicle origin

  // Rotate around X axis (Pitch)
  const yRot = yCam * cosP - zCam * sinP;
  const zRot = yCam * sinP + zCam * cosP;

  const scale = 500; // perspective scale factor
  const xProj = centerX + (x * scale) / zRot;
  const yProj = centerY - (yRot * scale) / zRot;

  return { x: xProj, y: yProj, depth: zRot };
}

// --- Active Engineering Calculations Engine ---
function calculatePhysics() {
  steeringAngle = parseInt(steeringInput.value);
  baseTorque = parseInt(torqueInput.value);
  surfaceFriction = parseFloat(frictionInput.value);
  vectoringEnabled = vectoringInput.checked;

  steerRad = (steeringAngle * Math.PI) / 180;

  // Lateral load transfer due to steering
  weightTransfer = WEIGHT_NOMINAL * 0.5 * (Math.abs(steeringAngle) / 45);
  
  if (steeringAngle > 0) {
    // Steer Right: Left wheel is outer (gains load), Right wheel is inner (loses load)
    weightL = WEIGHT_NOMINAL + weightTransfer;
    weightR = WEIGHT_NOMINAL - weightTransfer;
  } else {
    // Steer Left: Right wheel is outer (gains load), Left wheel is inner (loses load)
    weightL = WEIGHT_NOMINAL - weightTransfer;
    weightR = WEIGHT_NOMINAL + weightTransfer;
  }

  // Traction ceiling boundaries (F_limit = mu * Load)
  ceilingL = surfaceFriction * weightL;
  ceilingR = surfaceFriction * weightR;

  const tDemand = baseTorque / 2;

  // Torque Vectoring split optimization
  steerScaleFactor = 1 + Math.abs(steeringAngle) * 0.02;
  const maxTorqueL = (ceilingL * TIRE_RADIUS) / steerScaleFactor;
  const maxTorqueR = (ceilingR * TIRE_RADIUS) / steerScaleFactor;

  if (vectoringEnabled) {
    if (tDemand > maxTorqueL && tDemand <= maxTorqueR) {
      leftTorque = maxTorqueL;
      rightTorque = baseTorque - leftTorque;
      if (rightTorque > maxTorqueR) rightTorque = maxTorqueR;
    } else if (tDemand > maxTorqueR && tDemand <= maxTorqueL) {
      rightTorque = maxTorqueR;
      leftTorque = baseTorque - rightTorque;
      if (leftTorque > maxTorqueL) leftTorque = maxTorqueL;
    } else if (tDemand > maxTorqueL && tDemand > maxTorqueR) {
      leftTorque = maxTorqueL;
      rightTorque = maxTorqueR;
    } else {
      leftTorque = tDemand;
      rightTorque = tDemand;
    }
  } else {
    // Rigid 50:50 distribution
    leftTorque = tDemand;
    rightTorque = tDemand;
  }

  // Combined force demands
  leftCombined = (leftTorque / TIRE_RADIUS) * steerScaleFactor;
  rightCombined = (rightTorque / TIRE_RADIUS) * steerScaleFactor;

  const tolerance = 0.5;
  isSlipping = (leftCombined > ceilingL + tolerance) || (rightCombined > ceilingR + tolerance);

  // Stability index calculations
  let slipExcess = 0;
  if (leftCombined > ceilingL) slipExcess += (leftCombined - ceilingL);
  if (rightCombined > ceilingR) slipExcess += (rightCombined - ceilingR);

  const baseStability = 100 - Math.round((Math.abs(steeringAngle) / 45) * 10);
  if (isSlipping) {
    if (vectoringEnabled) {
      stabilityIndex = Math.max(70, baseStability - Math.round(slipExcess * 0.02));
    } else {
      stabilityIndex = Math.max(10, baseStability - Math.round(slipExcess * 0.1));
    }
  } else {
    stabilityIndex = baseStability;
  }

  leftPercent = Math.round((leftTorque / baseTorque) * 100) || 50;
  rightPercent = Math.round((rightTorque / baseTorque) * 100) || 50;

  // Calculate body roll angle based on torque and steering angle
  rollAngle = -0.00045 * baseTorque * steerRad;

  updateUIElements();
}

// --- UI Panel Updater ---
function updateUIElements() {
  valSteering.innerText = steeringAngle;
  valTorque.innerText = baseTorque;
  valFriction.innerText = surfaceFriction.toFixed(2);
  valStability.innerText = stabilityIndex;

  valTorqueLeft.innerText = leftTorque.toFixed(1);
  valTorqueRight.innerText = rightTorque.toFixed(1);
  pctTorqueLeft.innerText = `${leftPercent}%`;
  pctTorqueRight.innerText = `${rightPercent}%`;

  // Update stability index color glows
  const valWrapper = document.getElementById('val-stability-wrapper');
  if (stabilityIndex < 60) {
    valWrapper.style.color = 'var(--color-neon-danger)';
    valWrapper.style.textShadow = 'var(--shadow-neon-danger)';
  } else if (stabilityIndex < 85) {
    valWrapper.style.color = 'var(--color-neon-warning)';
    valWrapper.style.textShadow = 'none';
  } else {
    valWrapper.style.color = 'var(--color-neon-safe)';
    valWrapper.style.textShadow = 'var(--shadow-neon-safe)';
  }

  // Update status badge & cards border glows
  statusBadge.className = "status-badge";
  const allCards = [cardTelemetry, cardObservations, cardSteering, cardPower, cardFriction, cardScenarios];

  if (!isSlipping) {
    statusBadge.className = "status-badge green";
    statusBadge.innerText = "STABLE";
    statusDetail.innerText = "Everything is stable! The car is going exactly where we're steering.";
    allCards.forEach(c => {
      if (c) c.className = c.classList.contains('hud-card') ? "hud-card card-border-safe" : "hud-bar-card card-border-safe";
    });
  } else if (vectoringEnabled) {
    statusBadge.className = "status-badge orange";
    statusBadge.innerText = "INTERVENING";
    statusDetail.innerText = "Tires are starting to slide, but torque vectoring is dynamic splitting to keep us straight.";
    allCards.forEach(c => {
      if (c) c.className = c.classList.contains('hud-card') ? "hud-card card-border-warning" : "hud-bar-card card-border-warning";
    });
  } else {
    statusBadge.className = "status-badge red";
    statusBadge.innerText = "SLIPPING";
    statusDetail.innerText = "We're spinning out! The tires have lost grip and the chassis is fish-tailing.";
    allCards.forEach(c => {
      if (c) c.className = c.classList.contains('hud-card') ? "hud-card card-border-danger" : "hud-bar-card card-border-danger";
    });
  }

  // Generate visual Force Balance Bars
  const maxBarForce = 1200; // Newtons (corresponds to 100% width)
  
  // Left Wheel values
  const pctDemandL = Math.min(100, (leftCombined / maxBarForce) * 100);
  const pctCeilingL = Math.min(100, (ceilingL / maxBarForce) * 100);
  let badgeClassL = 'green';
  let badgeTextL = 'Safe';
  let fillClassL = 'green';
  if (leftCombined > ceilingL) {
    if (vectoringEnabled) {
      badgeClassL = 'amber';
      badgeTextL = 'TV Intervening';
      fillClassL = 'amber';
    } else {
      badgeClassL = 'red';
      badgeTextL = 'Slipping';
      fillClassL = 'red';
    }
  }

  // Right Wheel values
  const pctDemandR = Math.min(100, (rightCombined / maxBarForce) * 100);
  const pctCeilingR = Math.min(100, (ceilingR / maxBarForce) * 100);
  let badgeClassR = 'green';
  let badgeTextR = 'Safe';
  let fillClassR = 'green';
  if (rightCombined > ceilingR) {
    if (vectoringEnabled) {
      badgeClassR = 'amber';
      badgeTextR = 'TV Intervening';
      fillClassR = 'amber';
    } else {
      badgeClassR = 'red';
      badgeTextR = 'Slipping';
      fillClassR = 'red';
    }
  }

  observationsBox.innerHTML = `
    <div class="force-bar-wrapper">
      <!-- Left Rear Wheel -->
      <div class="force-bar-item">
        <div class="force-bar-header">
          <span class="force-bar-label">Left Rear Grip Limit</span>
          <span class="force-status-badge ${badgeClassL}">${badgeTextL}</span>
        </div>
        <div class="force-bar-track">
          <div class="force-bar-fill ${fillClassL}" style="width: ${pctDemandL}%"></div>
          <div class="force-bar-ceiling-marker" style="left: ${pctCeilingL}%"></div>
        </div>
        <div class="force-bar-header" style="margin-top: 2px;">
          <span class="force-bar-stats">Demand: ${leftCombined.toFixed(0)} N</span>
          <span class="force-bar-stats">Limit: ${ceilingL.toFixed(0)} N</span>
        </div>
      </div>

      <!-- Right Rear Wheel -->
      <div class="force-bar-item">
        <div class="force-bar-header">
          <span class="force-bar-label">Right Rear Grip Limit</span>
          <span class="force-status-badge ${badgeClassR}">${badgeTextR}</span>
        </div>
        <div class="force-bar-track">
          <div class="force-bar-fill ${fillClassR}" style="width: ${pctDemandR}%"></div>
          <div class="force-bar-ceiling-marker" style="left: ${pctCeilingR}%"></div>
        </div>
        <div class="force-bar-header" style="margin-top: 2px;">
          <span class="force-bar-stats">Demand: ${rightCombined.toFixed(0)} N</span>
          <span class="force-bar-stats">Limit: ${ceilingR.toFixed(0)} N</span>
        </div>
      </div>
    </div>
  `;
  updateFormulaUI();
}

// Helper to update formula panel live calculations
function updateFormulaUI() {
  const calcLoadTransfer = document.getElementById('calc-load-transfer');
  const calcWheelLoads = document.getElementById('calc-wheel-loads');
  const calcGripCeiling = document.getElementById('calc-grip-ceiling');
  const calcForceDemand = document.getElementById('calc-force-demand');

  // Determine outer/inner wheel labels dynamically for clarity
  let labelL = "Left";
  let labelR = "Right";
  let shiftDetail = "No weight shift";

  if (steeringAngle > 0) {
    labelL = "Left (Outer Wheel)";
    labelR = "Right (Inner Wheel)";
    shiftDetail = "Weight shifts to the Left outer wheel";
  } else if (steeringAngle < 0) {
    labelL = "Left (Inner Wheel)";
    labelR = "Right (Outer Wheel)";
    shiftDetail = "Weight shifts to the Right outer wheel";
  } else {
    labelL = "Left (Equal Load)";
    labelR = "Right (Equal Load)";
  }

  if (calcLoadTransfer) {
    calcLoadTransfer.innerHTML = `ΔF<sub>z</sub> = 1200 × 0.5 × (|${steeringAngle}°| / 45) = <strong>${weightTransfer.toFixed(0)} N</strong><br>
      <span style="font-size: 10px; color: var(--color-text-muted);">${shiftDetail}</span>`;
  }
  
  if (calcWheelLoads) {
    const signL = steeringAngle > 0 ? '+' : '-';
    const signR = steeringAngle > 0 ? '-' : '+';
    calcWheelLoads.innerHTML = `${labelL}: F<sub>z,nom</sub> ${signL} ΔF<sub>z</sub> = 1200 ${signL} ${weightTransfer.toFixed(0)} = <strong>${weightL.toFixed(0)} N</strong><br>
      ${labelR}: F<sub>z,nom</sub> ${signR} ΔF<sub>z</sub> = 1200 ${signR} ${weightTransfer.toFixed(0)} = <strong>${weightR.toFixed(0)} N</strong>`;
  }
  
  if (calcGripCeiling) {
    calcGripCeiling.innerHTML = `${labelL}: μ × F<sub>z</sub> = ${surfaceFriction.toFixed(2)} × ${weightL.toFixed(0)} = <strong>${ceilingL.toFixed(0)} N</strong><br>
      ${labelR}: μ × F<sub>z</sub> = ${surfaceFriction.toFixed(2)} × ${weightR.toFixed(0)} = <strong>${ceilingR.toFixed(0)} N</strong>`;
  }
  
  if (calcForceDemand) {
    calcForceDemand.innerHTML = `${labelL}: (T / r) × f<sub>steer</sub> = (${leftTorque.toFixed(1)} / 0.3) × ${steerScaleFactor.toFixed(2)} = <strong>${leftCombined.toFixed(0)} N</strong><br>
      ${labelR}: (T / r) × f<sub>steer</sub> = (${rightTorque.toFixed(1)} / 0.3) × ${steerScaleFactor.toFixed(2)} = <strong>${rightCombined.toFixed(0)} N</strong>`;
  }
}

// --- 3D Proving Ground Physics Logic ---
function updateCarPhysics() {
  // Speed is proportional to the total torque delivered to the rear wheels
  const speed = (leftTorque + rightTorque) * 0.015 + 2.0;
  
  if (isSlipping && !vectoringEnabled) {
    // Fish-tailing and spinning out (Critical Yaw Fault / loss of control)
    const slipSeverity = Math.max(leftCombined - ceilingL, rightCombined - ceilingR);
    
    // Fish-tail yaw oscillation
    const time = Date.now() * 0.005;
    const fishTail = Math.sin(time) * 0.12 * (slipSeverity / 220);
    
    // Continuous yaw spin if steering is active
    let spin = 0;
    if (Math.abs(steeringAngle) > 8) {
      spin = (steeringAngle > 0 ? 0.04 : -0.04) * (baseTorque / 140) * (slipSeverity / 150);
    }
    
    carYaw += fishTail + spin;
    
    // Slide sideways
    slideVelocity += Math.sin(carYaw) * 1.5 - (steeringAngle * 0.04);
    slideVelocity = Math.max(-12, Math.min(12, slideVelocity));
    
    // Move in direction of heading + slide velocity
    carX += speed * Math.sin(carYaw) - slideVelocity * Math.cos(carYaw);
    carZ += speed * Math.cos(carYaw) + slideVelocity * Math.sin(carYaw);
    
    slideVelocity *= 0.95; // damp sideways friction slide
  } else {
    // Stable condition (Nominal or Torque Vectoring intervening)
    // Yaw rate is determined by front wheel steering angle and speed (Kinematic Bicycle Model)
    const yawRate = (speed * Math.sin(steerRad)) / 100;
    carYaw += yawRate;
    
    // Move forward in the direction of the car's heading
    carX += speed * Math.sin(carYaw);
    carZ += speed * Math.cos(carYaw);
    slideVelocity = 0;
  }
}

// --- Dynamic Car Vertex 3D Calculator ---
function getCarVertex3D(xLocal, yLocal, zLocal, applyRoll) {
  let x = xLocal;
  let y = yLocal;
  let z = zLocal;
  
  if (applyRoll) {
    // Rotate around Z axis (rollAngle) relative to chassis bottom y = 0
    let rx = x * Math.cos(rollAngle) - y * Math.sin(rollAngle);
    let ry = x * Math.sin(rollAngle) + y * Math.cos(rollAngle);
    
    // Add jitter shake on slip
    if (isSlipping && !vectoringEnabled) {
      rx += (Math.random() - 0.5) * 4;
      ry += (Math.random() - 0.5) * 4;
    }
    x = rx;
    y = ry;
  }
  
  // In camera-relative space, the chassis matches the camera orientation directly
  return {
    x: x,
    y: -15 + y,
    z: z
  };
}

// Draw 3D Line
function drawLine3D(x1, y1, z1, x2, y2, z2, color, width = 1.5) {
  const p1 = project(x1, y1, z1);
  const p2 = project(x2, y2, z2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
}

// Draw 3D Suspension spring (projected 2D zigzag)
function drawSpring3D(xChassis, yChassis, zChassis, xWheel, yWheel, zWheel, color) {
  const pChassis = project(xChassis, yChassis, zChassis);
  const pWheel = project(xWheel, yWheel, zWheel);
  
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(pChassis.x, pChassis.y);

  const segments = 8;
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    let px = pChassis.x + (pWheel.x - pChassis.x) * t;
    let py = pChassis.y + (pWheel.y - pChassis.y) * t;

    if (i < segments) {
      const dx = pWheel.x - pChassis.x;
      const dy = pWheel.y - pChassis.y;
      const len = Math.sqrt(dx*dx + dy*dy);
      const nx = -dy / len;
      const ny = dx / len;
      const offset = (i % 2 === 0 ? 5 : -5);
      px += nx * offset;
      py += ny * offset;
    }
    ctx.lineTo(px, py);
  }
  ctx.stroke();
}

// Draw 3D Wheel cylinder (Tire) with realistic alloy rim, tire treads, and spokes
function drawWheel3D(cx, cy, cz, radius, width, color, torque, isSlippingInner, steerAngle = 0) {
  const segments = 12;
  const halfW = width / 2;
  
  // Align wheel direction with local steer angle
  const angle = steerAngle;
  const cosY = Math.cos(angle);
  const sinY = Math.sin(angle);

  const outerVertices = [];
  const innerVertices = [];
  
  // Rim circles are slightly offset outward from tread edge to prevent clipping/z-fighting
  const rimOuterVertices = [];
  const rimInnerVertices = [];
  
  const rimRadius = radius * 0.65;
  const hubRadius = radius * 0.22;
  
  const wheelSpeed = torque * 0.05;
  const rotOffset = (Date.now() * 0.003 * wheelSpeed) % (2 * Math.PI);
  
  const spokeCount = 5;
  const spokesOuter = [];
  const spokesInner = [];
  const spokesHubOuter = [];
  const spokesHubInner = [];

  for (let i = 0; i < segments; i++) {
    const phi = (i / segments) * 2 * Math.PI;
    const dy = radius * Math.cos(phi);
    const dz = radius * Math.sin(phi);

    // Yaw rotation
    const oxRot = halfW * cosY + dz * sinY;
    const ozRot = -halfW * sinY + dz * cosY;
    outerVertices.push({ x: cx + oxRot, y: cy + dy, z: cz + ozRot });

    const ixRot = -halfW * cosY + dz * sinY;
    const izRot = -(-halfW) * sinY + dz * cosY;
    innerVertices.push({ x: cx + ixRot, y: cy + dy, z: cz + izRot });
    
    // Rim vertices
    const rdy = rimRadius * Math.cos(phi);
    const rdz = rimRadius * Math.sin(phi);
    const roxRot = (halfW + 0.15) * cosY + rdz * sinY;
    const rozRot = -(halfW + 0.15) * sinY + rdz * cosY;
    rimOuterVertices.push({ x: cx + roxRot, y: cy + rdy, z: cz + rozRot });

    const rixRot = -(halfW + 0.15) * cosY + rdz * sinY;
    const rizRot = -(-(halfW + 0.15)) * sinY + rdz * cosY;
    rimInnerVertices.push({ x: cx + rixRot, y: cy + rdy, z: cz + rizRot });
  }

  // Spoke vertices
  for (let s = 0; s < spokeCount; s++) {
    const phi = rotOffset + (s / spokeCount) * 2 * Math.PI;
    const sdy = rimRadius * Math.cos(phi);
    const sdz = rimRadius * Math.sin(phi);
    const hdy = hubRadius * Math.cos(phi);
    const hdz = hubRadius * Math.sin(phi);

    // Outer spokes
    const sRotX_out = (halfW + 0.2) * cosY + sdz * sinY;
    const sRotZ_out = -(halfW + 0.2) * sinY + sdz * cosY;
    spokesOuter.push({ x: cx + sRotX_out, y: cy + sdy, z: cz + sRotZ_out });
    
    const hRotX_out = (halfW + 0.2) * cosY + hdz * sinY;
    const hRotZ_out = -(halfW + 0.2) * sinY + hdz * cosY;
    spokesHubOuter.push({ x: cx + hRotX_out, y: cy + hdy, z: cz + hRotZ_out });

    // Inner spokes
    const sRotX_in = -(halfW + 0.2) * cosY + sdz * sinY;
    const sRotZ_in = -(-(halfW + 0.2)) * sinY + sdz * cosY;
    spokesInner.push({ x: cx + sRotX_in, y: cy + sdy, z: cz + sRotZ_in });
    
    const hRotX_in = -(halfW + 0.2) * cosY + hdz * sinY;
    const hRotZ_in = -(-(halfW + 0.2)) * sinY + hdz * cosY;
    spokesHubInner.push({ x: cx + hRotX_in, y: cy + hdy, z: cz + hRotZ_in });
  }

  // Project all points to 2D screen space
  const outerProj = outerVertices.map(v => project(v.x, v.y, v.z));
  const innerProj = innerVertices.map(v => project(v.x, v.y, v.z));
  const rimOuterProj = rimOuterVertices.map(v => project(v.x, v.y, v.z));
  const rimInnerProj = rimInnerVertices.map(v => project(v.x, v.y, v.z));
  const spokesOuterProj = spokesOuter.map(v => project(v.x, v.y, v.z));
  const spokesInnerProj = spokesInner.map(v => project(v.x, v.y, v.z));
  const spokesHubOuterProj = spokesHubOuter.map(v => project(v.x, v.y, v.z));
  const spokesHubInnerProj = spokesHubInner.map(v => project(v.x, v.y, v.z));

  // Build faces list for painter's algorithm
  const faces = [];
  
  // Add 12 tread faces
  for (let i = 0; i < segments; i++) {
    const avgDepth = (outerProj[i].depth + outerProj[(i+1)%12].depth + innerProj[(i+1)%12].depth + innerProj[i].depth) / 4;
    faces.push({
      type: 'tread',
      index: i,
      depth: avgDepth
    });
  }
  
  // Add caps
  const outerCapDepth = outerProj.reduce((sum, p) => sum + p.depth, 0) / segments;
  faces.push({
    type: 'outer_cap',
    depth: outerCapDepth
  });
  
  const innerCapDepth = innerProj.reduce((sum, p) => sum + p.depth, 0) / segments;
  faces.push({
    type: 'inner_cap',
    depth: innerCapDepth
  });
  
  // Sort back-to-front (largest depth rendered first)
  faces.sort((a, b) => b.depth - a.depth);

  // Render each face
  faces.forEach(face => {
    if (face.type === 'tread') {
      const i = face.index;
      ctx.fillStyle = '#1e293b'; // charcoal tread rubber
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(outerProj[i].x, outerProj[i].y);
      ctx.lineTo(outerProj[(i+1)%12].x, outerProj[(i+1)%12].y);
      ctx.lineTo(innerProj[(i+1)%12].x, innerProj[(i+1)%12].y);
      ctx.lineTo(innerProj[i].x, innerProj[i].y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (face.type === 'outer_cap') {
      // Dark tire sidewall
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      outerProj.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Draw alloy rim on outward facing side (Right wheels, cx > 0)
      if (cx > 0) {
        drawRimAndSpokes(rimOuterProj, spokesOuterProj, spokesHubOuterProj);
      }
    } else if (face.type === 'inner_cap') {
      // Dark tire sidewall
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      innerProj.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Draw alloy rim on outward facing side (Left wheels, cx < 0)
      if (cx < 0) {
        drawRimAndSpokes(rimInnerProj, spokesInnerProj, spokesHubInnerProj);
      }
    }
  });

  // Alloy rim & spoke drawing helper (GT Edition two-tone satin black / silver lip with red calipers)
  function drawRimAndSpokes(rimProj, spokesProj, spokesHubProj) {
    const centerProj = project(cx, cy, cz);

    // 1. Draw outer rim circle (tire bead/flange - black)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    rimProj.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.fill();

    // 2. Draw machined silver outer lip ring
    ctx.strokeStyle = '#f1f5f9'; // high-end silver
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    rimProj.forEach((p, idx) => {
      const px = centerProj.x + (p.x - centerProj.x) * 0.95;
      const py = centerProj.y + (p.y - centerProj.y) * 0.95;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.stroke();

    // 3. Draw satin black inner barrel face
    ctx.fillStyle = '#1e293b'; // Satin dark slate/black
    ctx.beginPath();
    rimProj.forEach((p, idx) => {
      const px = centerProj.x + (p.x - centerProj.x) * 0.92;
      const py = centerProj.y + (p.y - centerProj.y) * 0.92;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();

    // 4. Draw high-performance red GT brake caliper (Brembo style, behind spokes)
    ctx.fillStyle = '#ef4444'; // Brembo GT Red
    ctx.beginPath();
    // Caliper spans from index 2 to 5 (about 90 degrees)
    rimProj.forEach((p, idx) => {
      if (idx >= 2 && idx <= 5) {
        const px = centerProj.x + (p.x - centerProj.x) * 0.82;
        const py = centerProj.y + (p.y - centerProj.y) * 0.82;
        if (idx === 2) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    });
    for (let idx = 5; idx >= 2; idx--) {
      const p = rimProj[idx];
      const px = centerProj.x + (p.x - centerProj.x) * 0.58;
      const py = centerProj.y + (p.y - centerProj.y) * 0.58;
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // 5. Draw center hubcap (chrome silver center cap)
    ctx.fillStyle = '#64748b'; // chrome cap
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    rimProj.forEach((p, idx) => {
      const px = centerProj.x + (p.x - centerProj.x) * 0.24;
      const py = centerProj.y + (p.y - centerProj.y) * 0.24;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 6. Draw GT Spokes (Stealth Satin Black spokes)
    ctx.strokeStyle = '#334155'; // Satin black spokes
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    for (let s = 0; s < spokesProj.length; s++) {
      ctx.beginPath();
      ctx.moveTo(spokesHubProj[s].x, spokesHubProj[s].y);
      ctx.lineTo(spokesProj[s].x, spokesProj[s].y);
      ctx.stroke();
    }
    
    // 7. Draw black lug nuts around the center hubcap
    ctx.fillStyle = '#0f172a'; // Black lug nuts
    for (let s = 0; s < spokesProj.length; s++) {
      ctx.beginPath();
      const lx = centerProj.x + (spokesProj[s].x - centerProj.x) * 0.40;
      const ly = centerProj.y + (spokesProj[s].y - centerProj.y) * 0.40;
      ctx.arc(lx, ly, 1.5, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
}

// Helper to get styling config based on vehicle track state (Optimized for Light Theme & Thicker footprint)
function getTrackStyle(state) {
  switch (state) {
    case 1: // Active Adjustment State (Amber TV active skids)
      return { color: '#d97706', width: 9.0, shadowColor: '#d97706', shadowBlur: 8 };
    case 2: // Critical Override State (Red critical slips)
      return { color: '#dc2626', width: 11.0, shadowColor: '#dc2626', shadowBlur: 12 };
    case 0: // Nominal State (Green nominal tires footprints)
    default:
      return { color: '#16a34a', width: 7.0, shadowColor: '#16a34a', shadowBlur: 4 };
  }
}

/// Transform world coordinate to camera space (relative to car) and project
function worldToCar(wx, wy, wz) {
  const tx = wx - carX;
  const tz = wz - carZ;
  
  // Rotate around Y axis by -carYaw (counter-clockwise)
  const cosY = Math.cos(-carYaw);
  const sinY = Math.sin(-carYaw);
  
  const rx = tx * cosY + tz * sinY;
  const rz = -tx * sinY + tz * cosY;
  
  return { x: rx, y: wy, z: rz };
}

function projectWorld(wx, wy, wz) {
  const local = worldToCar(wx, wy, wz);
  return project(local.x, local.y, local.z);
}

// Draw friction ellipse (traction boundary) and force vector for a wheel in local space
function drawFrictionEllipse3D(cx, cz, torque, ceiling, weightTransfer, isLeftWheel, steerAngle = 0) {
  const forceScale = 0.025;
  const contactY = -25;
  const radius = ceiling * forceScale;

  // Calculate forward force (torque)
  const fz_long = (torque / TIRE_RADIUS) * forceScale;
  
  // Calculate lateral force (centrifugal force component) acting on the wheel
  const centrifugalForce = 800 * (steeringAngle / 45); 
  const fx_lat = -centrifugalForce * forceScale;

  // Rotate force vector by steerAngle if the wheel is steered
  const cosS = Math.cos(steerAngle);
  const sinS = Math.sin(steerAngle);
  const fxRot = fx_lat * cosS - fz_long * sinS;
  const fzRot = fx_lat * sinS + fz_long * cosS;

  const f_len = Math.sqrt(fx_lat * fx_lat + fz_long * fz_long);
  const isWheelSlipping = f_len > radius;

  // Determine state color (Light Theme optimized)
  let color = '#16a34a'; // green (Safe)
  if (isWheelSlipping) {
    if (vectoringEnabled) {
      color = '#d97706'; // amber (Intervening)
    } else {
      color = '#dc2626'; // red (Slipping)
    }
  }

  // Draw 3D Circle on ground plane (Friction Ellipse boundary)
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const segments = 24;
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * 2 * Math.PI;
    const px = cx + radius * Math.cos(theta);
    const pz = cz + radius * Math.sin(theta);
    const pProj = project(px, contactY, pz);
    if (i === 0) ctx.moveTo(pProj.x, pProj.y);
    else ctx.lineTo(pProj.x, pProj.y);
  }
  ctx.stroke();

  // Draw Force Vector arrow starting at tire contact patch
  const pStart = project(cx, contactY, cz);
  const pEnd = project(cx + fxRot, contactY, cz + fzRot);

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  
  // Apply a glowing shadow for active/slipping vectors
  if (isWheelSlipping) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
  } else {
    ctx.shadowBlur = 0;
  }

  ctx.beginPath();
  ctx.moveTo(pStart.x, pStart.y);
  ctx.lineTo(pEnd.x, pEnd.y);
  ctx.stroke();

  // Draw Arrowhead at the tip of force vector
  const dx = pEnd.x - pStart.x;
  const dy = pEnd.y - pStart.y;
  const angle = Math.atan2(dy, dx);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(pEnd.x, pEnd.y);
  ctx.lineTo(pEnd.x - 8 * Math.cos(angle - Math.PI / 6), pEnd.y - 8 * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(pEnd.x - 8 * Math.cos(angle + Math.PI / 6), pEnd.y - 8 * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
}

// --- Animation Loop ---
let lastTime = null;
function animate(timestamp) {
  if (!lastTime) lastTime = timestamp || performance.now();
  const now = timestamp || performance.now();
  const dt = Math.min(0.1, (now - lastTime) / 1000); // Cap dt at 100ms
  lastTime = now;

  calculatePhysics();
  updateCarPhysics();

  // Timer countdown logic
  if (isTimerRunning) {
    timeRemaining -= dt;
    if (timeRemaining <= 0) {
      timeRemaining = 0;
      isTimerRunning = false;
      triggerConclusion();
    }
    const timerDigits = document.getElementById('timer-digits');
    if (timerDigits) {
      timerDigits.innerText = timeRemaining.toFixed(2);
      // Alert state color for digits if under 10 seconds
      if (timeRemaining < 10) {
        timerDigits.style.color = 'var(--color-neon-danger)';
        const timerStatus = document.getElementById('timer-status');
        if (timerStatus) {
          timerStatus.innerText = 'CRITICAL LIMITS';
          timerStatus.style.color = 'var(--color-neon-danger)';
        }
      } else {
        timerDigits.style.color = 'var(--color-text-primary)';
        const timerStatus = document.getElementById('timer-status');
        if (timerStatus) {
          timerStatus.innerText = 'Simulation Active';
          timerStatus.style.color = 'var(--color-neon-safe)';
        }
      }
    }
    
    // Accumulate evaluation statistics
    evaluationStats.totalTicks++;
    if (vectoringEnabled) {
      evaluationStats.tvOnTime += dt;
    } else {
      evaluationStats.tvOffTime += dt;
    }
    if (isSlipping) {
      evaluationStats.slipTicks++;
    } else {
      evaluationStats.stableTicks++;
    }
    evaluationStats.maxSteering = Math.max(evaluationStats.maxSteering, Math.abs(steeringAngle));
    evaluationStats.accumulatedStability += stabilityIndex;
  }

  // 1. Proving Ground concrete scroll speed (we still compute it for particles/smoke)
  let speed = (leftTorque + rightTorque) * 0.015 + 2.0;
  if (isSlipping && !vectoringEnabled) speed = Math.max(0.5, speed * 0.3);

  // 2. Clear Canvas (Off-white ground)
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 3. Draw Scrolling Ground Grid (Light slate grid lines)
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)'; // light slate gray grid lines
  ctx.lineWidth = 1;
  const gridSize = 80; // grid cells are 80 units wide
  const gridRange = 8; // draw 8 cells in each direction from vehicle coordinates
  
  const startX = Math.floor((carX - gridRange * gridSize) / gridSize) * gridSize;
  const endX = Math.ceil((carX + gridRange * gridSize) / gridSize) * gridSize;
  const startZ = Math.floor((carZ - gridRange * gridSize) / gridSize) * gridSize;
  const endZ = Math.ceil((carZ + gridRange * gridSize) / gridSize) * gridSize;
  
  // Draw Z-parallel lines in segments
  for (let gx = startX; gx <= endX; gx += gridSize) {
    for (let gz = startZ; gz < endZ; gz += gridSize) {
      const p1 = projectWorld(gx, -25, gz);
      const p2 = projectWorld(gx, -25, gz + gridSize);
      if (p1.depth > 10 && p2.depth > 10) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
  }
  
  // Draw X-parallel lines in segments
  for (let gz = startZ; gz <= endZ; gz += gridSize) {
    for (let gx = startX; gx < endX; gx += gridSize) {
      const p1 = projectWorld(gx, -25, gz);
      const p2 = projectWorld(gx + gridSize, -25, gz);
      if (p1.depth > 10 && p2.depth > 10) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
  }

  // 3b. Draw predictive pathway ahead of the vehicle (Thicker Force-field Vector Path)
  let px = carX;
  let pz = carZ;
  let pyaw = carYaw;
  const stepDist = 8;
  const steps = 35;

  let pathColor = '#16a34a'; // green (Safe)
  if (isSlipping) {
    if (vectoringEnabled) {
      pathColor = '#d97706'; // amber (Intervening)
    } else {
      const isFlashing = Math.floor(Date.now() / 150) % 2 === 0;
      pathColor = isFlashing ? '#f87171' : '#dc2626'; // flashing red (Slipping)
    }
  }

  for (let s = 0; s < steps; s++) {
    const px_next = px + stepDist * Math.sin(pyaw);
    const pz_next = pz + stepDist * Math.cos(pyaw);
    const pyaw_next = pyaw + (stepDist * Math.sin(steerRad)) / 100;

    const p1 = projectWorld(px, -25, pz);
    const p2 = projectWorld(px_next, -25, pz_next);

    if (p1.depth > 10 && p2.depth > 10) {
      const alpha = 1.0 - (s / steps);
      ctx.strokeStyle = pathColor;
      ctx.lineWidth = 8.0; // Thicker predictive path
      
      ctx.shadowColor = pathColor;
      ctx.shadowBlur = isSlipping ? 12 : 6;

      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    px = px_next;
    pz = pz_next;
    pyaw = pyaw_next;
  }
  ctx.globalAlpha = 1.0;
  ctx.shadowBlur = 0;

  // 4. Update and Record tyre skidmarks buffer (in world coordinates)
  const cosY = Math.cos(carYaw);
  const sinY = Math.sin(carYaw);
  
  // Local positions of rear wheels are (-45, -25, -50) and (45, -25, -50)
  const rxL = -45, rzL = -50;
  const rxR = 45, rzR = -50;
  
  const wlX = carX + (rxL * cosY + rzL * sinY);
  const wlZ = carZ + (-rxL * sinY + rzL * cosY);
  
  const wrX = carX + (rxR * cosY + rzR * sinY);
  const wrZ = carZ + (-rxR * sinY + rzR * cosY);

  // Map control states conditionally for left & right paths
  let leftState = 0;
  if (leftCombined > ceilingL) {
    leftState = vectoringEnabled ? 1 : 2;
  }
  let rightState = 0;
  if (rightCombined > ceilingR) {
    rightState = vectoringEnabled ? 1 : 2;
  }

  trailSegments.push({
    lx: wlX, ly: -25, lz: wlZ,
    rx: wrX, ry: -25, rz: wrZ,
    leftState: leftState,
    rightState: rightState
  });

  // Limit skidmarks buffer to prevent performance degradation
  if (trailSegments.length > 500) {
    trailSegments.shift();
  }

  // Draw skidmarks with dynamic multi-colored vector path overlays in world coordinates
  for (let i = 1; i < trailSegments.length; i++) {
    const p1 = trailSegments[i - 1];
    const p2 = trailSegments[i];

    const pl1 = projectWorld(p1.lx, p1.ly, p1.lz);
    const pl2 = projectWorld(p2.lx, p2.ly, p2.lz);
    if (pl1.depth > 10 && pl2.depth > 10) {
      const style = getTrackStyle(p2.leftState);
      ctx.strokeStyle = style.color;
      ctx.lineWidth = style.width;
      if (style.shadowBlur > 0) {
        ctx.shadowColor = style.shadowColor;
        ctx.shadowBlur = style.shadowBlur;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.beginPath();
      ctx.moveTo(pl1.x, pl1.y);
      ctx.lineTo(pl2.x, pl2.y);
      ctx.stroke();
    }

    const pr1 = projectWorld(p1.rx, p1.ry, p1.rz);
    const pr2 = projectWorld(p2.rx, p2.ry, p2.rz);
    if (pr1.depth > 10 && pr2.depth > 10) {
      const style = getTrackStyle(p2.rightState);
      ctx.strokeStyle = style.color;
      ctx.lineWidth = style.width;
      if (style.shadowBlur > 0) {
        ctx.shadowColor = style.shadowColor;
        ctx.shadowBlur = style.shadowBlur;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.beginPath();
      ctx.moveTo(pr1.x, pr1.y);
      ctx.lineTo(pr2.x, pr2.y);
      ctx.stroke();
    }
  }
  ctx.shadowBlur = 0;

  // 5. Emit & Draw tire smoke particles (in world coordinates)
  if (isSlipping && !vectoringEnabled) {
    if (leftCombined > ceilingL) {
      smokeParticles.push({
        x: wlX, y: -25, z: wlZ,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 2 + 1.5,
        vz: (Math.random() - 0.5) * 4,
        size: Math.random() * 5 + 3,
        alpha: 0.65
      });
    }
    if (rightCombined > ceilingR) {
      smokeParticles.push({
        x: wrX, y: -25, z: wrZ,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 2 + 1.5,
        vz: (Math.random() - 0.5) * 4,
        size: Math.random() * 5 + 3,
        alpha: 0.65
      });
    }
  }

  // Render and update smoke particles
  for (let i = smokeParticles.length - 1; i >= 0; i--) {
    const p = smokeParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.z += p.vz;
    p.alpha -= 0.022;
    p.size += 0.28;

    if (p.alpha <= 0) {
      smokeParticles.splice(i, 1);
    } else {
      const proj = projectWorld(p.x, p.y, p.z);
      if (proj.depth > 10) {
        ctx.fillStyle = `rgba(229, 220, 214, ${p.alpha * 0.45})`; // Warm cocoa smoke dust
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, p.size, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }

  // 6. Draw 3D Proving Ground Wheels (Original GT tires)
  // Rear Left Wheel (local coords)
  const rlCenter = getCarVertex3D(-45, -10, -50, false);
  drawWheel3D(rlCenter.x, rlCenter.y, rlCenter.z, 15, 10, '#334155', leftTorque, leftCombined > ceilingL, 0);
  
  // Rear Right Wheel (local coords)
  const rrCenter = getCarVertex3D(45, -10, -50, false);
  drawWheel3D(rrCenter.x, rrCenter.y, rrCenter.z, 15, 10, '#334155', rightTorque, rightCombined > ceilingR, 0);

  // Front Left Wheel (local coords, with steering)
  const flCenter = getCarVertex3D(-45, -10, 50, false);
  drawWheel3D(flCenter.x, flCenter.y, flCenter.z, 15, 8, '#475569', baseTorque/2, false, steerRad);

  // Front Right Wheel (local coords, with steering)
  const frCenter = getCarVertex3D(45, -10, 50, false);
  drawWheel3D(frCenter.x, frCenter.y, frCenter.z, 15, 8, '#475569', baseTorque/2, false, steerRad);

  // 6b. Draw Friction Circles (Traction Boundary Ellipse) & Force Vectors at each wheel
  drawFrictionEllipse3D(-45, -50, leftTorque, ceilingL, weightTransfer, true, 0);
  drawFrictionEllipse3D(45, -50, rightTorque, ceilingR, weightTransfer, false, 0);
  drawFrictionEllipse3D(-45, 50, baseTorque/2, (ceilingL + ceilingR)/2, weightTransfer, true, steerRad);
  drawFrictionEllipse3D(45, 50, baseTorque/2, (ceilingL + ceilingR)/2, weightTransfer, false, steerRad);

  // 7. Calculate rotated 3D chassis body corners (apply roll tilt)
  const bodyLocal = [
    { x: -35, y: 0, z: -70 },   // RLB (0) - Rear Left Bottom
    { x: 35, y: 0, z: -70 },    // RRB (1) - Rear Right Bottom
    { x: -35, y: 0, z: 70 },    // FLB (2) - Front Left Bottom
    { x: 35, y: 0, z: 70 },     // FRB (3) - Front Right Bottom
    { x: -30, y: 1, z: 75 },    // Splitter L (4)
    { x: 30, y: 1, z: 75 },     // Splitter R (5)
    { x: -32, y: 1, z: -73 },   // Rear Splitter L (6)
    { x: 32, y: 1, z: -73 },    // Rear Splitter R (7)
    { x: -33, y: 16, z: -70 },  // Rear Deck L (8)
    { x: 33, y: 16, z: -70 },   // Rear Deck R (9)
    { x: -32, y: 16, z: -45 },  // Rear Window Base L (10)
    { x: 32, y: 16, z: -45 },   // Rear Window Base R (11)
    { x: -30, y: 16, z: 35 },   // Windshield Base L (12)
    { x: 30, y: 16, z: 35 },    // Windshield Base R (13)
    { x: -28, y: 8, z: 70 },    // Hood Nose L (14)
    { x: 28, y: 8, z: 70 },     // Hood Nose R (15)
    { x: -20, y: 34, z: -15 },  // Rear Roof L (16)
    { x: 20, y: 34, z: -15 },   // Rear Roof R (17)
    { x: -20, y: 34, z: 22 },   // Front Roof L (18)
    { x: 20, y: 34, z: 22 },    // Front Roof R (19)
    { x: -35, y: 19, z: -72 },  // Spoiler Wing L (20)
    { x: 35, y: 19, z: -72 }    // Spoiler Wing R (21)
  ];

  const worldPoints = bodyLocal.map(v => getCarVertex3D(v.x, v.y, v.z, true));

  // Draw rear suspension springs (linking rotated chassis bottom corners to hubs)
  drawSpring3D(worldPoints[0].x, worldPoints[0].y, worldPoints[0].z, rlCenter.x, rlCenter.y, rlCenter.z, '#64748b');
  drawSpring3D(worldPoints[1].x, worldPoints[1].y, worldPoints[1].z, rrCenter.x, rrCenter.y, rrCenter.z, '#64748b');

  // 8. Draw 3D Shaded Chassis Shell polygons (Original Daytona Grey GT Painting)
  const faces = [
    { indices: [14, 15, 5, 4], color: '#4b5563', edge: '#374151' },   // Front bumper/nose - Daytona Grey
    { indices: [0, 1, 3, 2], color: '#111827', edge: '#030712' },     // Underbody bottom
    { indices: [0, 1, 7, 6], color: '#18181b', edge: '#090d16' },     // Carbon Rear Diffuser
    { indices: [6, 7, 9, 8], color: '#1f2937', edge: '#111827' },     // Rear Bumper - Dark Shadow Grey
    { indices: [8, 9, 11, 10], color: '#374151', edge: '#1f2937' },   // Rear Boot Deck - Stealth Grey
    { indices: [10, 11, 17, 16], color: '#030712', edge: '#1e293b' }, // Rear windshield - Obsidian Black
    { indices: [16, 17, 19, 18], color: '#030712', edge: '#0f172a' }, // Panoramic Glass Roof
    { indices: [18, 19, 13, 12], color: '#030712', edge: '#1e293b' }, // Front Windshield
    { indices: [12, 13, 15, 14], color: '#4b5563', edge: '#374151' }, // Sloping Hood - Daytona Grey
    { indices: [4, 5, 3, 2], color: '#18181b', edge: '#090d16' },     // Carbon Front Splitter
    
    // Left Side Panels
    { indices: [12, 14, 4, 2], color: '#374151', edge: '#1f2937' },   // Front Left Fender - Stealth Grey
    { indices: [10, 12, 2, 0], color: '#374151', edge: '#1f2937' },   // Left Doors - Stealth Grey
    { indices: [8, 10, 0], color: '#1f2937', edge: '#111827' },       // Left Rear Fender - Dark Shadow Grey
    { indices: [12, 18, 16, 10], color: '#0f172a', edge: '#020617' }, // Left Side Glass
    
    // Right Side Panels
    { indices: [13, 15, 5, 3], color: '#374151', edge: '#1f2937' },   // Front Right Fender
    { indices: [11, 13, 3, 1], color: '#374151', edge: '#1f2937' },   // Right Doors
    { indices: [9, 11, 1], color: '#1f2937', edge: '#111827' },       // Right Rear Fender
    { indices: [13, 19, 17, 11], color: '#0f172a', edge: '#020617' }, // Right Side Glass

    // Rear Spoiler
    { indices: [8, 9, 21, 20], color: '#18181b', edge: '#090d16' }    // Carbon Spoiler Wing
  ];

  faces.forEach(f => {
    f.avgZ = f.indices.reduce((sum, idx) => sum + worldPoints[idx].z, 0) / f.indices.length;
  });
  faces.sort((a, b) => b.avgZ - a.avgZ);

  faces.forEach(f => {
    ctx.fillStyle = f.color;
    ctx.strokeStyle = f.edge;
    ctx.lineWidth = 1.0;
    
    ctx.beginPath();
    f.indices.forEach((idx, i) => {
      const p = project(worldPoints[idx].x, worldPoints[idx].y, worldPoints[idx].z);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  // 9. Draw rear taillights, red flares, and custom posh LED lighting overlays
  const pl8 = project(worldPoints[8].x, worldPoints[8].y, worldPoints[8].z);
  const pr9 = project(worldPoints[9].x, worldPoints[9].y, worldPoints[9].z);
  
  let lightColor = '#a63a50'; // Rich Raspberry Red tail lamps
  let lightGlow = 'rgba(166, 58, 80, 0.45)';
  if (isSlipping && !vectoringEnabled) {
    const flash = Math.floor(Date.now() / 150) % 2 === 0;
    lightColor = flash ? '#e07a5f' : '#a63a50'; // flash between warm orange/caramel & raspberry
    lightGlow = flash ? 'rgba(224, 122, 95, 0.7)' : 'rgba(166, 58, 80, 0.2)';
  } else if (isSlipping && vectoringEnabled) {
    lightColor = '#c97a3e'; // Caramel gold taillights warning
    lightGlow = 'rgba(201, 122, 62, 0.5)';
  }

  // Draw full-width trunk LED strip
  ctx.strokeStyle = lightColor;
  ctx.lineWidth = 3.5;
  ctx.shadowColor = lightColor;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(pl8.x, pl8.y);
  ctx.lineTo(pr9.x, pr9.y);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Draw outer taillight flares at the ends of the strip
  if (pl8.depth > 10) {
    ctx.fillStyle = lightColor;
    ctx.beginPath(); ctx.arc(pl8.x, pl8.y, 4, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = lightGlow;
    ctx.beginPath(); ctx.arc(pl8.x, pl8.y, 15, 0, 2 * Math.PI); ctx.fill();
  }
  if (pr9.depth > 10) {
    ctx.fillStyle = lightColor;
    ctx.beginPath(); ctx.arc(pr9.x, pr9.y, 4, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = lightGlow;
    ctx.beginPath(); ctx.arc(pr9.x, pr9.y, 15, 0, 2 * Math.PI); ctx.fill();
  }

  // Draw front LED headlights strips
  const pl14 = project(worldPoints[14].x, worldPoints[14].y, worldPoints[14].z);
  const pl4 = project(worldPoints[4].x, worldPoints[4].y, worldPoints[4].z);
  const pr15 = project(worldPoints[15].x, worldPoints[15].y, worldPoints[15].z);
  const pr5 = project(worldPoints[5].x, worldPoints[5].y, worldPoints[5].z);

  if (pl14.depth > 10 && pr15.depth > 10) {
    ctx.strokeStyle = '#dda15e'; // Caramel DRLs
    ctx.lineWidth = 3.0;
    ctx.shadowColor = '#dd9c3c'; // Warm Gold shadow glow
    ctx.shadowBlur = 8;
    ctx.beginPath();
    // Left DRL
    ctx.moveTo(pl14.x, pl14.y);
    ctx.lineTo(pl14.x + (pl4.x - pl14.x) * 0.45, pl14.y + (pl4.y - pl14.y) * 0.45);
    // Right DRL
    ctx.moveTo(pr15.x, pr15.y);
    ctx.lineTo(pr15.x + (pr5.x - pr15.x) * 0.45, pr15.y + (pr5.y - pr15.y) * 0.45);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Draw sleek aerodynamic side mirrors
  if (worldPoints[12] && worldPoints[13]) {
    const pMirrorL_Start = project(worldPoints[12].x, worldPoints[12].y, worldPoints[12].z);
    const pMirrorL_End = project(worldPoints[12].x - 8, worldPoints[12].y + 1, worldPoints[12].z - 2);
    const pMirrorR_Start = project(worldPoints[13].x, worldPoints[13].y, worldPoints[13].z);
    const pMirrorR_End = project(worldPoints[13].x + 8, worldPoints[13].y + 1, worldPoints[13].z - 2);

    if (pMirrorL_Start.depth > 10 && pMirrorR_Start.depth > 10) {
      // Mirror stems (matching satin black stems)
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(pMirrorL_Start.x, pMirrorL_Start.y);
      ctx.lineTo(pMirrorL_End.x, pMirrorL_End.y);
      ctx.moveTo(pMirrorR_Start.x, pMirrorR_Start.y);
      ctx.lineTo(pMirrorR_End.x, pMirrorR_End.y);
      ctx.stroke();

      // Mirror caps (Daytona Grey accent caps)
      ctx.fillStyle = '#4b5563';
      ctx.beginPath();
      ctx.arc(pMirrorL_End.x, pMirrorL_End.y, 2.5, 0, 2 * Math.PI);
      ctx.arc(pMirrorR_End.x, pMirrorR_End.y, 2.5, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  requestAnimationFrame(animate);
}

// Reset button handler (Second handler - Main Sandbox Reset)
btnReset.addEventListener('click', () => {
  isProgrammaticChange = true;
  steeringInput.value = 0;
  torqueInput.value = 150;
  frictionInput.value = 0.8;
  vectoringInput.checked = true;
  isProgrammaticChange = false;
  carX = 250;
  carZ = 0;
  carYaw = 0;
  slideVelocity = 0;
  trailSegments.length = 0;
  clearScenarioActive();
  
  // Reset Timer
  timeRemaining = 45.0;
  isTimerRunning = true;
  evaluationStats = {
    tvOnTime: 0,
    tvOffTime: 0,
    stableTicks: 0,
    slipTicks: 0,
    totalTicks: 0,
    maxSteering: 0,
    accumulatedStability: 0
  };
  const timerDigits = document.getElementById('timer-digits');
  if (timerDigits) {
    timerDigits.style.color = 'var(--color-text-primary)';
  }
  const timerStatus = document.getElementById('timer-status');
  if (timerStatus) {
    timerStatus.innerText = 'Simulation Active';
    timerStatus.style.color = 'var(--color-neon-safe)';
  }
  const modal = document.getElementById('conclusion-modal');
  if (modal) modal.classList.remove('active');
  
  calculatePhysics();
});

// Close Modal event listener
const btnCloseModal = document.getElementById('btn-close-modal');
if (btnCloseModal) {
  btnCloseModal.addEventListener('click', () => {
    document.getElementById('conclusion-modal').classList.remove('active');
    // Reset timer for another run
    timeRemaining = 45.0;
    isTimerRunning = true;
    evaluationStats = {
      tvOnTime: 0,
      tvOffTime: 0,
      stableTicks: 0,
      slipTicks: 0,
      totalTicks: 0,
      maxSteering: 0,
      accumulatedStability: 0
    };
    const timerDigits = document.getElementById('timer-digits');
    if (timerDigits) {
      timerDigits.style.color = 'var(--color-text-primary)';
    }
    const timerStatus = document.getElementById('timer-status');
    if (timerStatus) {
      timerStatus.innerText = 'Simulation Active';
      timerStatus.style.color = 'var(--color-neon-safe)';
    }
  });
}

// Trigger formal evaluation conclusion report
function triggerConclusion() {
  const modal = document.getElementById('conclusion-modal');
  const report = document.getElementById('conclusion-report');
  if (!modal || !report) return;

  const avgStability = Math.round(evaluationStats.accumulatedStability / evaluationStats.totalTicks) || 100;
  const totalDuration = evaluationStats.tvOnTime + evaluationStats.tvOffTime;
  const tvRatio = totalDuration > 0 ? (evaluationStats.tvOnTime / totalDuration * 100).toFixed(0) : 0;
  const slipRatio = evaluationStats.totalTicks > 0 ? (evaluationStats.slipTicks / evaluationStats.totalTicks * 100).toFixed(0) : 0;
  const slipTime = (evaluationStats.slipTicks / evaluationStats.totalTicks * totalDuration) || 0;
  
  let engineeringSummary = "";
  if (tvRatio > 70 && slipRatio < 10) {
    engineeringSummary = "<strong>Torque Vectoring Works Great!</strong> The car completed the run with an awesome average stability index of <strong>" + avgStability + "%</strong>. When cornering, weight shifts to the outside wheel, giving it more grip. The TV system is smart enough to feed more power to that outside wheel, keeping the inside wheel from spinning out. This kept our tire force demands below the grip limits (F_demand &le; F_limit), so the car stayed completely stable and didn't slide.";
  } else if (tvRatio < 30) {
    engineeringSummary = "<strong>Car Spun Out due to 50:50 Split:</strong> Without torque vectoring active (50:50 power split), weight transfer during the turn starved the inner tire of vertical load, shrinking its grip ceiling. Since both motors kept pushing the same torque, the force demand quickly exceeded the traction limit (F_demand > F_limit), causing massive slip (<strong>" + slipRatio + "%</strong> of the run) and multiple critical spinouts.";
  } else {
    engineeringSummary = "<strong>Comparison Run Complete:</strong> My testing shows a clear physical difference. When I turned Torque Vectoring on, it dynamically sent torque to the tires with the most weight on them, keeping us stable. But when I turned vectoring off, the rigid power split under load transfer pushed the inner tire past its available grip (F_demand > F_limit), causing us to lose traction and slide.";
  }

  report.innerHTML = `
    <div class="report-section">
      <h3>Stability Overview</h3>
      <div class="report-metrics">
        <div class="report-row">
          <span class="report-label">Average Stability Index</span>
          <span class="report-value">${avgStability}%</span>
        </div>
        <div class="report-row">
          <span class="report-label">Total Slip Duration</span>
          <span class="report-value ${slipRatio > 15 ? 'danger' : ''}">${slipTime.toFixed(1)}s (${slipRatio}%)</span>
        </div>
      </div>
    </div>
    
    <div class="report-section">
      <h3>Controller Profile</h3>
      <div class="report-metrics">
        <div class="report-row">
          <span class="report-label">Torque Vectoring Active</span>
          <span class="report-value">${evaluationStats.tvOnTime.toFixed(1)}s (${tvRatio}%)</span>
        </div>
        <div class="report-row">
          <span class="report-label">Rigid 50:50 Power Split</span>
          <span class="report-value">${evaluationStats.tvOffTime.toFixed(1)}s (${(100 - tvRatio).toFixed(0)}%)</span>
        </div>
        <div class="report-row">
          <span class="report-label">Peak Steering Input</span>
          <span class="report-value">${evaluationStats.maxSteering.toFixed(0)}°</span>
        </div>
      </div>
    </div>

    <div class="report-section">
      <h3>Physical Verdict</h3>
      <p class="report-text">${engineeringSummary}</p>
    </div>
  `;
  
  modal.classList.add('active');
}

// Helper to highlight relevant panels for each scenario
function highlightRelevantPanels(scenario) {
  const allCards = document.querySelectorAll('.hud-card, .hud-bar-card');
  allCards.forEach(card => card.classList.remove('active-highlight'));

  // Always highlight scenarios selection panel
  document.getElementById('hud-scenarios-card')?.classList.add('active-highlight');

  if (scenario === 'A') {
    document.getElementById('hud-formula-limit-card')?.classList.add('active-highlight');
    document.getElementById('hud-friction-card')?.classList.add('active-highlight');
  } else if (scenario === 'B') {
    document.getElementById('hud-formula-load-card')?.classList.add('active-highlight');
    document.getElementById('hud-steering-card')?.classList.add('active-highlight');
    document.getElementById('hud-power-card')?.classList.add('active-highlight');
  } else if (scenario === 'C') {
    document.getElementById('hud-telemetry-card')?.classList.add('active-highlight');
    document.getElementById('hud-formula-demand-card')?.classList.add('active-highlight');
  }
}

// --- Engineering Scenarios Logic ---
const btnScenarioA = document.getElementById('btn-scenario-a');
const btnScenarioB = document.getElementById('btn-scenario-b');
const btnScenarioC = document.getElementById('btn-scenario-c');
const scenarioDescBox = document.getElementById('scenario-description-box');

function clearScenarioActive() {
  if (btnScenarioA) btnScenarioA.classList.remove('active');
  if (btnScenarioB) btnScenarioB.classList.remove('active');
  if (btnScenarioC) btnScenarioC.classList.remove('active');
  if (scenarioDescBox) scenarioDescBox.innerHTML = "Pick a scenario to set up the road parameters and test how stability control works.";
  
  // Clear all highlights
  const allCards = document.querySelectorAll('.hud-card, .hud-bar-card');
  allCards.forEach(card => card.classList.remove('active-highlight'));

  // Enable all inputs
  steeringInput.disabled = false;
  torqueInput.disabled = false;
  frictionInput.disabled = false;
  vectoringInput.disabled = false;

  document.getElementById('hud-steering-card')?.classList.remove('disabled');
  document.getElementById('hud-power-card')?.classList.remove('disabled');
  document.getElementById('hud-friction-card')?.classList.remove('disabled');
  document.getElementById('hud-telemetry-card')?.querySelector('.switch-container')?.classList.remove('disabled');
}

if (btnScenarioA) {
  btnScenarioA.addEventListener('click', () => {
    clearScenarioActive(); // Clear states first
    btnScenarioA.classList.add('active');

    isProgrammaticChange = true;
    frictionInput.value = 0.20;
    torqueInput.value = 200;
    steeringInput.value = 25;
    isProgrammaticChange = false;
    
    // Disable inputs for Scenario A
    steeringInput.disabled = true;
    torqueInput.disabled = true;
    frictionInput.disabled = true;
    vectoringInput.disabled = true;

    document.getElementById('hud-steering-card')?.classList.add('disabled');
    document.getElementById('hud-power-card')?.classList.add('disabled');
    document.getElementById('hud-friction-card')?.classList.add('disabled');
    document.getElementById('hud-telemetry-card')?.querySelector('.switch-container')?.classList.add('disabled');

    // Highlight relevant cards
    highlightRelevantPanels('A');

    scenarioDescBox.innerHTML = `<strong>Selected: Ice Cornering Test</strong><br>
      Friction (μ) is down to 0.20 (like driving on wet ice!), motor torque is at 200 Nm, and we steer by 25°.<br>
      - <strong>If Torque Vectoring is OFF:</strong> The equal 50:50 torque split overloads the tires, and we immediately spin out off the track.<br>
      - <strong>If Torque Vectoring is ON:</strong> The controller backs off the power on the inner wheel to prevent wheelspin, keeping the car stable.`;
    
    // Reset timer for evaluation run
    timeRemaining = 45.0;
    isTimerRunning = true;
    evaluationStats = { tvOnTime: 0, tvOffTime: 0, stableTicks: 0, slipTicks: 0, totalTicks: 0, maxSteering: 0, accumulatedStability: 0 };
    
    calculatePhysics();
  });
}

if (btnScenarioB) {
  btnScenarioB.addEventListener('click', () => {
    clearScenarioActive(); // Clear states first
    btnScenarioB.classList.add('active');

    isProgrammaticChange = true;
    frictionInput.value = 0.80;
    torqueInput.value = 400;
    steeringInput.value = 45;
    isProgrammaticChange = false;
    
    // Disable inputs for Scenario B
    steeringInput.disabled = true;
    torqueInput.disabled = true;
    frictionInput.disabled = true;
    vectoringInput.disabled = true;

    document.getElementById('hud-steering-card')?.classList.add('disabled');
    document.getElementById('hud-power-card')?.classList.add('disabled');
    document.getElementById('hud-friction-card')?.classList.add('disabled');
    document.getElementById('hud-telemetry-card')?.querySelector('.switch-container')?.classList.add('disabled');

    // Highlight relevant cards
    highlightRelevantPanels('B');

    scenarioDescBox.innerHTML = `<strong>Selected: Power Slide Cornering</strong><br>
      Friction is 0.80 (dry concrete road), torque is maxed at 400 Nm, and we steer hard at 45°.<br>
      - <strong>What's happening:</strong> Turning this hard at high throttle causes massive weight transfer to the outside wheel, starving the inside wheel of grip. You can see how the inner tire's traction limit shrinks!`;
    
    // Reset timer for evaluation run
    timeRemaining = 45.0;
    isTimerRunning = true;
    evaluationStats = { tvOnTime: 0, tvOffTime: 0, stableTicks: 0, slipTicks: 0, totalTicks: 0, maxSteering: 0, accumulatedStability: 0 };

    calculatePhysics();
  });
}

if (btnScenarioC) {
  btnScenarioC.addEventListener('click', () => {
    clearScenarioActive(); // Clear states first
    btnScenarioC.classList.add('active');

    // Unlock parameters to current state or clean default values
    isProgrammaticChange = true;
    frictionInput.value = 0.80;
    torqueInput.value = 150;
    steeringInput.value = 0;
    isProgrammaticChange = false;
    
    // Highlight relevant cards (and inputs are active)
    highlightRelevantPanels('C');

    scenarioDescBox.innerHTML = `<strong>Selected: Custom Sandbox Run</strong><br>
      Sliders are fully unlocked! Drag steering, base torque, and surface friction values as the EV drives.<br>
      - <strong>Experiment:</strong> Test your own hypotheses! Try toggling torque vectoring on and off during high-speed turns and see how the final Stability Report conclusions adapt!`;
    
    // Reset timer for a fresh custom run
    timeRemaining = 45.0;
    isTimerRunning = true;
    evaluationStats = { tvOnTime: 0, tvOffTime: 0, stableTicks: 0, slipTicks: 0, totalTicks: 0, maxSteering: 0, accumulatedStability: 0 };
    const timerDigits = document.getElementById('timer-digits');
    if (timerDigits) {
      timerDigits.style.color = 'var(--color-text-primary)';
    }

    calculatePhysics();
  });
}

// Bind sliders listeners
steeringInput.addEventListener('input', () => {
  if (isProgrammaticChange) return;
  if (!btnScenarioC?.classList.contains('active')) {
    clearScenarioActive();
  }
  calculatePhysics();
});
torqueInput.addEventListener('input', () => {
  if (isProgrammaticChange) return;
  if (!btnScenarioC?.classList.contains('active')) {
    clearScenarioActive();
  }
  calculatePhysics();
});
frictionInput.addEventListener('input', () => {
  if (isProgrammaticChange) return;
  if (!btnScenarioC?.classList.contains('active')) {
    clearScenarioActive();
  }
  calculatePhysics();
});
vectoringInput.addEventListener('change', () => {
  if (!btnScenarioC?.classList.contains('active')) {
    clearScenarioActive();
  }
  calculatePhysics();
});

// Initialize calculations and kick off render loop
calculatePhysics();
animate();
