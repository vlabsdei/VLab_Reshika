// Car physics constants
let activeVehicleMass = 1680;       
let vActual = 0.0;                  
const GRAVITY = 9.81;              
const AIR_DENSITY = 1.225;         
const DRAG_COEFF = 0.24;           
const FRONTAL_AREA = 2.2;          
const ROLLING_COEFF = 0.012;       
const BATTERY_CAPACITY_WH = 60000; 
const AUX_POWER_W = 600;           

// Simulation status variables
let isSimulating = false;          
let simTime = 0.0;                 
const simDuration = 30.0;          
const simTimeStep = 0.025;         

// active choices
let activeProfile = 'eco';
let activeTerrain = 'flat';

// values from inputs
let speedKmh = 60;
let brakeFreq = 3;

// telemetry outputs
let batteryPercent = 100.0;        
let energyConsumed = 0.0;          
let distanceTraveled = 0.0;        
let estRange = 120.0;              
let instantPowerDemand = 0.0;      
let tractiveForce = 0.0;           
let peakPowerDemand = 0.0;         
let maxTractiveForce = 0.0;        

// battery variables
let batteryTemperature = 25.0;     
let currentDrawAmps = 0.0;         
let terminalVoltage = 380.0;       
const CELL_THERMAL_OFFSETS = [0.1, 0.4, 0.5, 0.2, 0.3, 0.7, 0.8, 0.4, 0.2, 0.5, 0.6, 0.3];

// 3D variables
let targetRoadTilt = 0.0;          
let currentRoadTilt = 0.0;
let wheelRotationAngle = 0;        
let currentSimulationLoad = 0;     
let roadScrollPosition = 0;        

// DOM elements
const inputSpeed = document.getElementById('inputSpeed');
const inputMass = document.getElementById('inputMass');
const runBtn = document.getElementById('runBtn');
const resetSimulationBtn = document.getElementById('resetSimulationBtn');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const statusLabel = document.getElementById('statusLabel');

// 3D Visualizer DOM Cache
const roadElement = document.getElementById('road3D');
const wheelFL = document.getElementById('wheelFL');
const wheelFR = document.getElementById('wheelFR');
const wheelBL = document.getElementById('wheelBL');
const wheelBR = document.getElementById('wheelBR');
const carModel = document.querySelector('.car-3d-model');
const stripes = document.querySelectorAll('.road-stripe');
const hudGridAxis = document.getElementById('hudGridAxis');
const hudInclineAngle = document.getElementById('hudSlope');

// Proceed/Review buttons and variables
const proceedToExplanationBtn = document.getElementById('proceedToExplanationBtn');
const reviewUnderstandBtn = document.getElementById('reviewUnderstandBtn');
const comparisonPanel = document.getElementById('comparisonPanel');

const compSimPower = document.getElementById('compSimPower');
const compSimEnergy = document.getElementById('compSimEnergy');
const compSimRange = document.getElementById('compSimRange');
const compSimScore = document.getElementById('compSimScore');

const compTheoPower = document.getElementById('compTheoPower');
const compTheoEnergy = document.getElementById('compTheoEnergy');
const compTheoRange = document.getElementById('compTheoRange');
const compTheoScore = document.getElementById('compTheoScore');

let simFinalAvgPower = 0.0;
let simFinalEnergy = 0.0;
let simFinalRange = 0.0;
let simFinalScore = 0;

let theoFinalPower = 0.0;
let theoFinalEnergy = 0.0;
let theoFinalRange = 0;

// Saved simulation run parameters to pass to Stage 2 formulas
let simRunSpeedKmh = 60;
let simRunMass = 1680;
let simRunSlopeDeg = 0;
let simRunPassengers = 1;
let simRunProfile = 'eco';
let simRunBrakeFreq = 3;

// output fields
const rangeText = document.getElementById('rangeText');
const conclusionText = document.getElementById('conclusionText');
const verdictScoreText = document.getElementById('verdictScoreText');
const verdictStatusText = document.getElementById('verdictStatusText');

// Left calculations range elements
const liveEstRange = document.getElementById('liveEstRange');
const liveResultedRange = document.getElementById('liveResultedRange');

// E=P*t Integration Panel elements
const livePowerDraw = document.getElementById('livePowerDraw');
const liveTimeElapsed = document.getElementById('liveTimeElapsed');
const liveEnergyConsumed = document.getElementById('liveEnergyConsumed');
const liveFormulaDisplay = document.getElementById('liveFormulaDisplay');

// table elements
const reportTableBody = document.querySelector('#reportTable tbody');
const emptyHistoryRow = document.getElementById('emptyHistoryRow');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

// HUD elements
const hudStatus = document.getElementById('hudStatus');
const hudSpeed = document.getElementById('hudSpeed');
const hudRegen = document.getElementById('hudRegen');
const hudLiveForce = document.getElementById('hudLiveForce');

// Battery Monitor indicators
const socWave = document.getElementById('socWave');
const socPercentage = document.getElementById('socPercentage');
const gaugeTemp = document.getElementById('gaugeTemp');
const gaugeCurrent = document.getElementById('gaugeCurrent');
const gaugeVoltage = document.getElementById('gaugeVoltage');
const gaugeStrain = document.getElementById('gaugeStrain');
const flowIndicator = document.getElementById('flowIndicator');

// Milestone 1 elements
const labMass = document.getElementById("labMass");
const labSlope = document.getElementById("labSlope");
const labFgVal = document.getElementById("labFgVal");
const labMass2 = document.getElementById("labMass2");
const labSlope2 = document.getElementById("labSlope2");
const labFrVal = document.getElementById("labFrVal");
const labSpeed = document.getElementById("labSpeed");
const labFdVal = document.getElementById("labFdVal");
const sumFg = document.getElementById("sumFg");
const sumFr = document.getElementById("sumFr");
const sumFd = document.getElementById("sumFd");
const sumFinal = document.getElementById("sumFinal");
const dispPowerForce = document.getElementById("dispPowerForce");
const dispPowerSpeed = document.getElementById("dispPowerSpeed");
const dispPowerFinal = document.getElementById("dispPowerFinal");
const dispEnergyPower = document.getElementById("dispEnergyPower");
const dispEnergyFinal = document.getElementById("dispEnergyFinal");
const instructionTxt = document.getElementById("instructionTxt");
const goToMs2Btn = document.getElementById("go_to_ms2_btn");
const milestoneWorkspace1 = document.getElementById("milestoneWorkspace1");
const milestoneWorkspace2 = document.getElementById("milestoneWorkspace2");

// --- INITIALIZATION ---
function getSelectedPassengerCount() {
  const checkedRadio = document.querySelector('input[name="passengers"]:checked');
  return checkedRadio ? parseInt(checkedRadio.value) || 1 : 1;
}

function updateIncurredParamsPanel() {
  const incProfile = document.getElementById('incProfile');
  const incSpeed = document.getElementById('incSpeed');
  const incSpeedMs = document.getElementById('incSpeedMs');
  const incTerrain = document.getElementById('incTerrain');
  const incMass = document.getElementById('incMass');
  const incMassBreakdown = document.getElementById('incMassBreakdown');
  const incBrakeFreq = document.getElementById('incBrakeFreq');

  if (incProfile) {
    let profileName = 'Custom Sandbox';
    if (simRunProfile === 'eco') profileName = 'Eco-Driving Profile';
    else if (simRunProfile === 'city') profileName = 'City Traffic Cycle';
    else if (simRunProfile === 'aggressive') profileName = 'Aggressive Driving';
    incProfile.textContent = profileName;
  }

  if (incSpeed) {
    incSpeed.textContent = `${simRunSpeedKmh.toFixed(0)} km/h`;
  }
  if (incSpeedMs) {
    incSpeedMs.textContent = `(${(simRunSpeedKmh / 3.6).toFixed(2)} m/s)`;
  }

  if (incTerrain) {
    let terrainName = `Flat Expressway (0.0°)`;
    if (simRunSlopeDeg === 12) terrainName = `Steep Hill Climb (+12.0°)`;
    else if (simRunSlopeDeg === -10) terrainName = `Downhill Descent (-10.0°)`;
    incTerrain.textContent = terrainName;
  }

  if (incMass) {
    incMass.textContent = `${simRunMass.toFixed(0)} kg`;
  }
  if (incMassBreakdown) {
    let baseMassVal = simRunMass - simRunPassengers * 80;
    let passengerText = simRunPassengers === 1 ? '1 passenger' : `${simRunPassengers} passengers`;
    incMassBreakdown.textContent = `(${baseMassVal.toFixed(0)} kg base + ${passengerText})`;
  }

  if (incBrakeFreq) {
    incBrakeFreq.textContent = `${simRunBrakeFreq} /min`;
  }
}

// Centralized visibility manager for Stage 1 (Theoretical Calculations) and Stage 2 (Simulation)
function updateStageVisibility(stage) {
  const milestoneWorkspace1 = document.getElementById("milestoneWorkspace1");
  const milestoneWorkspace2 = document.getElementById("milestoneWorkspace2");
  
  if (stage === 1) {
    document.body.classList.add('milestone2-active');

    // Sync input values to match saved simulation run values
    const inputSpeed = document.getElementById('inputSpeed');
    const inputMass = document.getElementById('inputMass');
    if (inputSpeed) inputSpeed.value = simRunSpeedKmh;
    if (inputMass) inputMass.value = simRunMass - simRunPassengers * 80;
    
    const terrainSelect = document.getElementById('terrainSelect');
    if (terrainSelect) {
      if (simRunSlopeDeg === 0) terrainSelect.value = 'flat';
      else if (simRunSlopeDeg === 12) terrainSelect.value = 'hill';
      else if (simRunSlopeDeg === -10) terrainSelect.value = 'downhill';
    }
    
    const passengerRadios = document.getElementsByName('passengers');
    for (let i = 0; i < passengerRadios.length; i++) {
      passengerRadios[i].checked = (parseInt(passengerRadios[i].value) === simRunPassengers);
    }
    
    const profileSelect = document.getElementById('profileSelect');
    if (profileSelect) profileSelect.value = simRunProfile;

    if (milestoneWorkspace1) {
      milestoneWorkspace1.classList.remove('hidden-view');
      milestoneWorkspace1.classList.add('active-view');
    }
    if (milestoneWorkspace2) {
      milestoneWorkspace2.classList.remove('active-view');
      milestoneWorkspace2.classList.add('hidden-view');
    }
    
    updateIncurredParamsPanel();
    updateMilestone1Calculations();
  } else {
    document.body.classList.remove('milestone2-active');
    if (milestoneWorkspace2) {
      milestoneWorkspace2.classList.remove('hidden-view');
      milestoneWorkspace2.classList.add('active-view');
    }
    if (milestoneWorkspace1) {
      milestoneWorkspace1.classList.remove('active-view');
      milestoneWorkspace1.classList.add('hidden-view');
    }
  }
}

function updateMilestone1Calculations() {
  if (!labMass) return; // safety
  
  // Real-time synchronization: Always read from user inputs
  let rawSpeed = inputSpeed ? parseFloat(inputSpeed.value) : 60;
  if (isNaN(rawSpeed)) rawSpeed = 60;
  let speedKmhVal = Math.max(10, Math.min(450, rawSpeed));
  
  let slopeDeg = 0;
  const terrainSelect = document.getElementById('terrainSelect');
  if (terrainSelect) {
    const terrain = terrainSelect.value;
    if (terrain === 'hill') slopeDeg = 12;
    else if (terrain === 'downhill') slopeDeg = -10;
  }
  
  let rawMass = inputMass ? parseFloat(inputMass.value) : 1600;
  if (isNaN(rawMass)) rawMass = 1600;
  let baseMass = Math.max(1000, Math.min(3000, rawMass));
  let passengers = getSelectedPassengerCount();

  speedKmh = speedKmhVal;
  activeVehicleMass = baseMass + passengers * 80;
  targetRoadTilt = slopeDeg * (Math.PI / 180);

  // show total mass
  const totalMassDisplay = document.getElementById('totalMassDisplay');
  if (totalMassDisplay) {
    totalMassDisplay.textContent = `${activeVehicleMass.toFixed(0)} kg`;
  }

  let speedMs = speedKmhVal / 3.6;
  let slopeRad = targetRoadTilt;

  labMass.textContent = activeVehicleMass.toFixed(0);
  labMass2.textContent = activeVehicleMass.toFixed(0);
  labSlope.textContent = `${slopeDeg.toFixed(1)}°`;
  labSlope2.textContent = `${slopeDeg.toFixed(1)}°`;
  labSpeed.textContent = speedMs.toFixed(2);

  // calculate environmental forces (gravity, friction, drag)
  let fg = activeVehicleMass * GRAVITY * Math.sin(slopeRad);
  let fr = ROLLING_COEFF * activeVehicleMass * GRAVITY * Math.cos(slopeRad);
  let fd = 0.5 * AIR_DENSITY * DRAG_COEFF * FRONTAL_AREA * (speedMs * speedMs);
  
  let fgInt = Math.round(fg);
  let frInt = Math.round(fr);
  let fdInt = Math.round(fd);

  labFgVal.textContent = fgInt.toFixed(0);
  labFrVal.textContent = frInt.toFixed(0);
  labFdVal.textContent = fdInt.toFixed(0);

  sumFg.textContent = fgInt.toFixed(0);
  sumFr.textContent = frInt.toFixed(0);
  sumFd.textContent = fdInt.toFixed(0);

  // calculate total tractive force and power P
  let fTotalInt = fgInt + frInt + fdInt;
  sumFinal.textContent = fTotalInt.toFixed(0);
  if (dispPowerForce) dispPowerForce.textContent = fTotalInt.toFixed(0);
  if (dispPowerSpeed) dispPowerSpeed.textContent = speedMs.toFixed(2);

  // Sync simulation load and HUD force
  currentSimulationLoad = fTotalInt;
  if (hudLiveForce) {
    hudLiveForce.textContent = `${fTotalInt.toFixed(0)} N`;
  }

  let powerKw = (fTotalInt * speedMs) / 1000;
  if (dispPowerFinal) dispPowerFinal.textContent = powerKw.toFixed(2);
  if (dispEnergyPower) dispEnergyPower.textContent = powerKw.toFixed(2);

  // energy calculation E = P * t
  let energyWh = ((powerKw * 1000) * 30) / 3600;
  if (dispEnergyFinal) dispEnergyFinal.textContent = energyWh.toFixed(2);

  // range estimation calculation based on mass
  let safeMassForEst = Math.max(100, activeVehicleMass);
  let initialEstRange = Math.round(120 * (1680 / safeMassForEst));
  if (liveEstRange) {
    liveEstRange.textContent = `${initialEstRange.toFixed(0)} km`;
  }

  // Cache theoretical calculations for final comparison
  theoFinalPower = powerKw;
  theoFinalEnergy = energyWh;
  theoFinalRange = initialEstRange;

  // validation check to unlock next milestone
  if (instructionTxt && goToMs2Btn) {
    if (speedKmhVal >= 100) {
      instructionTxt.textContent = "Physics configuration compiled! Your calculated baseline load target (F_total) and power constraints are ready to be passed into the runtime engine.";
      instructionTxt.style.color = "#16a34a";
      goToMs2Btn.style.pointerEvents = "auto";
      goToMs2Btn.style.opacity = "1";
      goToMs2Btn.style.background = "#2563eb";
    } else {
      instructionTxt.textContent = "Increase Speed to at least 100 km/h to see the exponential drag effect before proceeding.";
      instructionTxt.style.color = "#64748b";
      goToMs2Btn.style.pointerEvents = "none";
      goToMs2Btn.style.opacity = "0.5";
      goToMs2Btn.style.background = "#94a3b8";
    }
  }

  const downhillExplBox = document.getElementById('downhillExplBox');
  if (downhillExplBox) {
    // Show explanation card for all terrains/profiles in Stage 1
    downhillExplBox.style.display = 'block';
    
    let results = getVerdictAndScore();
    let finalVerdict = results.verdict;
    let finalScore = results.calculatedEcoScore;
    
    let estEnergyWh = ((powerKw * 1000) * 30) / 3600;
    let estBatPercent = 100.0 - ((estEnergyWh / 60000.0) * 100.0 * 20.0);
    estBatPercent = Math.max(0.0, Math.min(100.0, estBatPercent));
    
    let dispBatPercent = (batteryPercent < 100 && batteryPercent > 0) ? batteryPercent : estBatPercent;
    dispBatPercent = Math.max(0.0, Math.min(100.0, dispBatPercent));
    let batDeclineVal = (100.0 - dispBatPercent).toFixed(2);
    
    let terrain = terrainSelect ? terrainSelect.value : 'flat';
    let title = "";
    let point1 = "";
    let point2 = "";
    let point3 = "";
    let boxBg = "";
    let boxBorder = "";
    let textColor = "";
    
    let failReason = "";
    if (activeProfile === 'city' && speedKmhVal >= 90) {
      failReason = `unsafe driving speeds for City Traffic (speed is <strong>${speedKmhVal} km/h</strong>, which meets or exceeds the 90 km/h safety limit)`;
    } else if (speedKmhVal >= 110) {
      failReason = `unsafe driving speeds (speed is <strong>${speedKmhVal} km/h</strong>, which meets or exceeds the 110 km/h safety limit)`;
    } else {
      failReason = `inefficient driving parameters (AI Eco-Score of <strong>${finalScore}%</strong> is below the 70% passing threshold)`;
    }
    
    if (finalVerdict === 'Pass') {
      boxBg = "#f0fdf4";
      boxBorder = "1px solid #bbf7d0";
      textColor = "#166534";
      
      if (terrain === 'downhill') {
        title = "Downhill Descent Physics & Battery Health (PASS):";
        point1 = `<strong>Why F & P are negative:</strong> Downhill gravity pushes the vehicle forward. The motor does not need to pull the car, so tractive force (<i>F</i>) and power draw (<i>P</i>) drop below zero.`;
        point2 = `<strong>Energy Recovery (State of Charge):</strong> Instead of depleting, the battery recovers charge via regenerative braking. The State of Charge remained high at <strong>${dispBatPercent.toFixed(1)}%</strong> (a decline of only ${batDeclineVal}%), showing excellent battery health and energy retention.`;
        point3 = `<strong>Why it PASSES:</strong> Because the battery recovers charge rather than depleting it, driving range is extended beyond the baseline. This highly efficient energy management yields a <strong>PASS</strong> verdict.`;
      } else if (terrain === 'hill') {
        title = "Steep Hill Climb Physics & Battery Health (PASS):";
        point1 = `<strong>High Force & Power Load:</strong> Climbing a steep +12° incline requires the motor to overcome a large gravitational resistance, significantly increasing tractive force (<i>F</i>) and power draw (<i>P</i>).`;
        point2 = `<strong>Normal Battery Depletion:</strong> The battery State of Charge declined normally from 100% to <strong>${dispBatPercent.toFixed(1)}%</strong> (a safe decline of ${batDeclineVal}%). The energy draw and cell temperatures remained within healthy, expected limits.`;
        point3 = `<strong>Why it PASSES:</strong> Despite the climbing load, the driving parameters were optimized to keep the battery health stable and range reduction minimal, yielding a <strong>PASS</strong> verdict.`;
      } else {
        title = "Flat Expressway Physics & Battery Health (PASS):";
        point1 = `<strong>Moderate Force & Power:</strong> With no gravity resistance on a flat road, the motor only needs to overcome aerodynamic drag and rolling friction. Force (<i>F</i>) and Power (<i>P</i>) remain stable.`;
        point2 = `<strong>Healthy Battery Depletion:</strong> The battery State of Charge declined safely from 100% to <strong>${dispBatPercent.toFixed(1)}%</strong> (a normal drop of ${batDeclineVal}%). This represents stable energy draw and optimal thermal conditions.`;
        point3 = `<strong>Why it PASSES:</strong> Keeping speed and braking within optimal parameters ensured a normal, healthy rate of battery depletion, yielding a <strong>PASS</strong> verdict.`;
      }
    } else {
      boxBg = "#fef2f2";
      boxBorder = "1px solid #fecaca";
      textColor = "#991b1b";
      
      if (terrain === 'downhill') {
        title = "Downhill Descent Physics & Battery Health (FAIL):";
        point1 = `<strong>Why F & P are negative:</strong> Downhill gravity pushes the vehicle forward. The motor does not need to pull the car, so tractive force (<i>F</i>) and power draw (<i>P</i>) drop below zero.`;
        point2 = `<strong>Regenerative Charging:</strong> The motor acts as a generator to recharge the battery (State of Charge at <strong>${dispBatPercent.toFixed(1)}%</strong>).`;
        point3 = `<strong>Why it FAILS:</strong> Even though the battery charge remained healthy due to regeneration, the run yields a <strong>FAIL</strong> verdict due to ${failReason}. Regenerative recovery does not override safety speed limits and overall efficiency guidelines.`;
      } else if (terrain === 'hill') {
        title = "Steep Hill Climb Physics & Battery Health (FAIL):";
        point1 = `<strong>High Force & Power Load:</strong> Climbing a steep +12° incline requires the motor to overcome a large gravitational resistance, significantly increasing tractive force (<i>F</i>) and power draw (<i>P</i>).`;
        point2 = `<strong>Abnormal Battery Decline:</strong> The battery State of Charge experienced an abnormal, excessive decline down to <strong>${dispBatPercent.toFixed(1)}%</strong> (a drop of ${batDeclineVal}%). This steep drop puts high strain on the battery cells.`;
        point3 = `<strong>Why it FAILS:</strong> The combination of steep climb loads and ${failReason} caused excessive energy drain and reduced the driving range below the acceptable threshold, yielding a <strong>FAIL</strong> verdict.`;
      } else {
        title = "Flat Expressway Physics & Battery Health (FAIL):";
        point1 = `<strong>High Aerodynamic Drag:</strong> At high speeds on a flat road, aerodynamic drag increases exponentially, forcing the motor to draw substantial force (<i>F</i>) and power (<i>P</i>).`;
        point2 = `<strong>Abnormal Battery Decline:</strong> Overcoming high drag forces caused the battery State of Charge to drop abnormally down to <strong>${dispBatPercent.toFixed(1)}%</strong> (a drop of ${batDeclineVal}%). This indicates high energy stress on the battery pack.`;
        point3 = `<strong>Why it FAILS:</strong> The run yields a <strong>FAIL</strong> verdict due to ${failReason}, causing excessive battery depletion and reducing the driving range below acceptable limits.`;
      }
    }
    
    downhillExplBox.style.backgroundColor = boxBg;
    downhillExplBox.style.borderColor = boxBorder;
    downhillExplBox.style.color = textColor;
    
    downhillExplBox.innerHTML = `
      <strong style="color: ${textColor}; display: block; margin-bottom: 8px; font-weight: bold; font-size: 0.95rem;">${title}</strong>
      <ol style="margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 8px;">
        <li>${point1}</li>
        <li>${point2}</li>
        <li>${point3}</li>
      </ol>
    `;
  }
}

function init() {
  // Set Stage 2 (Simulation) to active on page load
  updateStageVisibility(2);
  updateSpeedInputState();
  registerEvents();
  resetReadouts();
  animate();
}

function updateMilestone2ControlVisibility() {
  const brakeFreqGroup = document.getElementById('brakeFreqGroup');
  if (brakeFreqGroup) {
    brakeFreqGroup.style.display = 'flex';
  }
}

function updateSpeedInputState() {
  const inputSpeed = document.getElementById('inputSpeed');
  const profileSelect = document.getElementById('profileSelect');
  
  if (profileSelect && (profileSelect.value === 'eco' || profileSelect.value === 'aggressive')) {
    if (inputSpeed) inputSpeed.disabled = true;
  } else {
    if (inputSpeed) inputSpeed.disabled = false;
  }
  updateBrakeFreqInputState();
}

function updateBrakeFreqInputState() {
  const inputBrakeFreq = document.getElementById('inputBrakeFreq');
  const badgeBrake = document.getElementById('badgeBrake');
  const profileSelect = document.getElementById('profileSelect');
  
  if (profileSelect && (profileSelect.value === 'city' || profileSelect.value === 'eco')) {
    if (inputBrakeFreq) {
      inputBrakeFreq.disabled = true;
      inputBrakeFreq.value = 2; // Fixed to 2 for exactly 1 brake (Math.round(2 * 0.5) = 1)
    }
    brakeFreq = 2;
    if (badgeBrake) {
      badgeBrake.textContent = "Disabled (Fixed)";
    }
  } else {
    if (inputBrakeFreq) {
      if (!isSimulating) {
        inputBrakeFreq.disabled = false;
      }
      brakeFreq = parseInt(inputBrakeFreq.value) || 3;
    }
    if (badgeBrake) {
      badgeBrake.textContent = `${brakeFreq} /min`;
    }
  }
}

// event listeners
function registerEvents() {
  if (inputMass) {
    inputMass.addEventListener('input', updateMilestone1Calculations);
    inputMass.addEventListener('change', () => {
      let rawMass = parseFloat(inputMass.value) || 1600;
      let clampedMass = Math.max(1000, Math.min(3000, rawMass));
      inputMass.value = clampedMass;
      updateMilestone1Calculations();
    });
  }

  const terrainSelect = document.getElementById('terrainSelect');
  if (terrainSelect) {
    terrainSelect.addEventListener('change', () => {
      activeTerrain = terrainSelect.value;
      updateMilestone1Calculations();
    });
  }

  const profileSelect = document.getElementById('profileSelect');
  if (profileSelect) {
    profileSelect.addEventListener('change', () => {
      activeProfile = profileSelect.value;
      if (activeProfile === 'eco') {
        if (inputSpeed) inputSpeed.value = 60;
      } else if (activeProfile === 'city') {
        if (inputSpeed) inputSpeed.value = 40;
      } else if (activeProfile === 'aggressive') {
        if (inputSpeed) inputSpeed.value = 110;
      }
      updateMilestone1Calculations();
      updateMilestone2ControlVisibility();
      updateSpeedInputState();
    });
  }

  if (inputSpeed) {
    inputSpeed.addEventListener('input', () => {
      if (profileSelect) {
        if (profileSelect.value !== 'city' && profileSelect.value !== 'custom') {
          profileSelect.value = 'custom';
          activeProfile = 'custom';
          updateMilestone2ControlVisibility();
          updateSpeedInputState();
        }
      }
      updateMilestone1Calculations();
    });

    inputSpeed.addEventListener('change', () => {
      let rawSpeed = parseFloat(inputSpeed.value) || 60;
      let clampedSpeed = Math.max(10, Math.min(450, rawSpeed));
      inputSpeed.value = clampedSpeed;
      updateMilestone1Calculations();
    });
  }

  const passengerRadios = document.getElementsByName('passengers');
  for (let i = 0; i < passengerRadios.length; i++) {
    passengerRadios[i].addEventListener('change', () => {
      updateMilestone1Calculations();
      updateSpeedInputState();
    });
  }

  const inputBrakeFreq = document.getElementById('inputBrakeFreq');
  const badgeBrake = document.getElementById('badgeBrake');
  if (inputBrakeFreq) {
    inputBrakeFreq.addEventListener('input', () => {
      brakeFreq = parseInt(inputBrakeFreq.value) || 3;
      if (badgeBrake) {
        badgeBrake.textContent = `${brakeFreq} /min`;
      }
    });
  }

  if (runBtn) {
    runBtn.addEventListener('click', startSimulationTest);
  }

  if (resetSimulationBtn) {
    resetSimulationBtn.addEventListener('click', () => {
      resetReadouts();
    });
  }

  if (goToMs2Btn) {
    goToMs2Btn.addEventListener('click', () => {
      if (milestoneWorkspace1 && milestoneWorkspace2) {
        // save force for milestone 2
        currentSimulationLoad = parseFloat(sumFinal.textContent) || 0;
        if (hudLiveForce) {
          hudLiveForce.textContent = Math.round(currentSimulationLoad) + " N";
        }

        // save terrain
        const terrainSelect = document.getElementById('terrainSelect');
        activeTerrain = terrainSelect ? terrainSelect.value : 'flat';

        // save profile
        const profileSelect = document.getElementById('profileSelect');
        if (profileSelect) {
          activeProfile = profileSelect.value;
        }

        // check panel visibility
        updateMilestone2ControlVisibility();
        
        // switch body classes
        updateStageVisibility(2); // Go to Stage 2
        
        updateSpeedInputState();
      }
    });
  }

  const returnToMs1Btn = document.getElementById('returnToMs1Btn');
  if (returnToMs1Btn) {
    returnToMs1Btn.addEventListener('click', () => {
      if (milestoneWorkspace1 && milestoneWorkspace2) {
        updateStageVisibility(2); // returnToMs1Btn in Stage 1 Formulas actually proceeds to Stage 2 Simulation
        updateSpeedInputState();
      }
    });
  }

  if (proceedToExplanationBtn) {
    proceedToExplanationBtn.addEventListener('click', () => {
      if (milestoneWorkspace1 && milestoneWorkspace2) {
        // Transition back to Stage 1 Formulas
        updateStageVisibility(1);
        updateSpeedInputState();
        updateMilestone1Calculations();
      }
    });
  }

  if (reviewUnderstandBtn) {
    reviewUnderstandBtn.addEventListener('click', () => {
      if (comparisonPanel) {
        if (comparisonPanel.style.display === 'block') {
          comparisonPanel.style.display = 'none';
        } else {
          comparisonPanel.style.display = 'block';
          
          // Populate comparison values with strict formatting
          if (compSimPower) compSimPower.textContent = `${simFinalAvgPower.toFixed(2)} kW`;
          if (compSimEnergy) compSimEnergy.textContent = `${simFinalEnergy.toFixed(0)} Wh`;
          if (compSimRange) compSimRange.textContent = `${simFinalRange.toFixed(0)} km`;
          if (compSimScore) compSimScore.textContent = `${simFinalScore.toFixed(0)}%`;

          if (compTheoPower) compTheoPower.textContent = `${theoFinalPower.toFixed(2)} kW`;
          if (compTheoEnergy) compTheoEnergy.textContent = `${theoFinalEnergy.toFixed(2)} Wh`;
          if (compTheoRange) compTheoRange.textContent = `${theoFinalRange.toFixed(0)} km`;
          if (compTheoScore) compTheoScore.textContent = `100%`;
        }
      }
    });
  }

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      reportTableBody.innerHTML = `
        <tr id="emptyHistoryRow">
          <td colspan="8" style="text-align: center; color: #777777; font-style: italic;">No telemetry test simulations logged yet. Press "Run Telemetry Test" to start.</td>
        </tr>
      `;
    });
  }
}

// start simulation
function startSimulationTest() {
  if (isSimulating) return;

  // sync brake frequency
  const inputBrakeFreqInput = document.getElementById('inputBrakeFreq');
  if (inputBrakeFreqInput) {
    brakeFreq = parseInt(inputBrakeFreqInput.value) || 3;
  }

  // Save current parameters of the main simulation run
  simRunSpeedKmh = inputSpeed ? parseFloat(inputSpeed.value) || 0 : 60;
  if (simRunSpeedKmh > 450) simRunSpeedKmh = 450;
  if (simRunSpeedKmh < 10) simRunSpeedKmh = 10;
  
  let slopeDeg = 0;
  const terrainSelect = document.getElementById('terrainSelect');
  if (terrainSelect) {
    const terrain = terrainSelect.value;
    if (terrain === 'hill') slopeDeg = 12;
    else if (terrain === 'downhill') slopeDeg = -10;
    activeTerrain = terrain;
  }
  simRunSlopeDeg = slopeDeg;
  
  let baseMass = inputMass ? parseFloat(inputMass.value) || 1600 : 1600;
  if (baseMass < 1000) baseMass = 1000;
  if (baseMass > 3000) baseMass = 3000;
  simRunPassengers = getSelectedPassengerCount();
  simRunMass = baseMass + simRunPassengers * 80;
  simRunProfile = activeProfile;
  simRunBrakeFreq = brakeFreq;

  isSimulating = true;
  document.body.classList.add('simulating-active');
  simTime = 0.0;
  batteryPercent = 100.0;
  energyConsumed = 0.0;
  distanceTraveled = 0.0;
  peakPowerDemand = 0.0;
  maxTractiveForce = 0.0;
  batteryTemperature = 25.0;
  currentDrawAmps = 0.0;
  terminalVoltage = 380.0;
  vActual = 0.0;

  // disable inputs while running
  if (inputSpeed) inputSpeed.disabled = true;
  if (inputMass) inputMass.disabled = true;
  
  if (terrainSelect) terrainSelect.disabled = true;

  const profileSelect = document.getElementById('profileSelect');
  if (profileSelect) profileSelect.disabled = true;
  
  const inputBrakeFreq = document.getElementById('inputBrakeFreq');
  if (inputBrakeFreq) inputBrakeFreq.disabled = true;
  
  const passengerRadios = document.getElementsByName('passengers');
  for (let i = 0; i < passengerRadios.length; i++) {
    passengerRadios[i].disabled = true;
  }

  runBtn.disabled = true;

  if (resetSimulationBtn) {
    resetSimulationBtn.style.display = 'none';
  }

  if (proceedToExplanationBtn) {
    proceedToExplanationBtn.style.display = 'none';
  }

  if (comparisonPanel) {
    comparisonPanel.style.display = 'none';
  }

  // show progress indicators
  progressContainer.style.display = 'block';
  statusLabel.style.display = 'block';
  hudStatus.textContent = "[SIMULATION ACTIVE]";

  conclusionText.textContent = "Telemetry analysis running. Iterating tractive equations...";
}

// end simulation
function endSimulationTest() {
  isSimulating = false;

  // re-enable inputs
  updateSpeedInputState();
  if (inputMass) inputMass.disabled = false;

  const terrainSelect = document.getElementById('terrainSelect');
  if (terrainSelect) terrainSelect.disabled = false;

  const profileSelect = document.getElementById('profileSelect');
  if (profileSelect) profileSelect.disabled = false;

  const inputBrakeFreq = document.getElementById('inputBrakeFreq');
  if (inputBrakeFreq && (!profileSelect || profileSelect.value !== 'city')) {
    inputBrakeFreq.disabled = false;
  }

  const passengerRadios = document.getElementsByName('passengers');
  for (let i = 0; i < passengerRadios.length; i++) {
    passengerRadios[i].disabled = false;
  }

  runBtn.disabled = false;

  hudStatus.textContent = "[TEST COMPLETED]";

  // reset braking visual effects
  const carModel = document.querySelector('.car-3d-model');
  if (carModel) carModel.classList.remove('braking');
  const viewport = document.querySelector('.viewport-3d-wrapper');
  if (viewport) {
    viewport.classList.remove('viewport-braking');
    viewport.classList.remove('braking-active');
  }

  generateVerdictText();
  logRunHistory();
  updateBatteryMonitorUI();

  let results = getVerdictAndScore();
  simFinalAvgPower = simTime > 0.0001 ? (energyConsumed * 3.6 / simTime) : 0;
  simFinalEnergy = energyConsumed;
  simFinalRange = estRange;
  simFinalScore = results.calculatedEcoScore;

  if (resetSimulationBtn) {
    resetSimulationBtn.style.display = 'block';
  }

  if (proceedToExplanationBtn) {
    proceedToExplanationBtn.style.display = 'block';
  }
  document.body.classList.remove('simulating-active');
}

// reset values
function resetReadouts() {
  if (isSimulating) return;

  simTime = 0.0;
  batteryPercent = 100.0;
  energyConsumed = 0.0;
  distanceTraveled = 0.0;
  instantPowerDemand = 0.0;
  tractiveForce = 0.0;
  peakPowerDemand = 0.0;
  maxTractiveForce = 0.0;
  batteryTemperature = 25.0;
  currentDrawAmps = 0.0;
  terminalVoltage = 380.0;
  wheelRotationAngle = 0;
  roadScrollPosition = 0;
  vActual = 0.0;

  // reset wheel angle
  if (wheelFL) wheelFL.style.transform = 'rotateX(0deg)';
  if (wheelFR) wheelFR.style.transform = 'rotateX(0deg)';
  if (wheelBL) wheelBL.style.transform = 'rotateX(0deg)';
  if (wheelBR) wheelBR.style.transform = 'rotateX(0deg)';

  // delete green dots
  const particles = document.querySelectorAll('.regen-particle');
  particles.forEach(p => p.remove());

  // remove class names for braking
  const carModel = document.querySelector('.car-3d-model');
  if (carModel) carModel.classList.remove('braking');
  const viewport = document.querySelector('.viewport-3d-wrapper');
  if (viewport) {
    viewport.classList.remove('viewport-braking');
    viewport.classList.remove('braking-active');
  }

  progressContainer.style.display = 'none';
  statusLabel.style.display = 'none';
  progressBar.style.width = '0%';

  if (rangeText) rangeText.textContent = "-- km";
  conclusionText.textContent = "--";

  if (verdictScoreText) verdictScoreText.textContent = "--%";
  if (verdictStatusText) {
    verdictStatusText.textContent = "--";
    verdictStatusText.style.color = "#777777";
  }

  if (liveResultedRange) liveResultedRange.textContent = "-- km";

  if (livePowerDraw) livePowerDraw.textContent = "0.00 kW";
  if (liveTimeElapsed) liveTimeElapsed.textContent = "0.0s";
  if (liveEnergyConsumed) liveEnergyConsumed.textContent = "0 Wh";
  if (liveFormulaDisplay) liveFormulaDisplay.innerHTML = "E = P &times; t &rArr; 0 Wh = 0.00 kW &times; 0.0s";

  hudStatus.textContent = "[STANDBY MODE]";
  hudSpeed.textContent = "0.0 km/h";
  hudRegen.textContent = "--";
  hudRegen.style.color = "#000000";

  const liveFaccel = document.getElementById('liveFaccel');
  const liveFload = document.getElementById('liveFload');
  const liveFtotal = document.getElementById('liveFtotal');
  const livePmotor = document.getElementById('livePmotor');
  const livePaux = document.getElementById('livePaux');
  const livePtotal = document.getElementById('livePtotal');
  const liveEnergy = document.getElementById('liveEnergy');

  if (liveFaccel) liveFaccel.textContent = "0 N";
  if (liveFload) liveFload.textContent = "0 N";
  if (liveFtotal) liveFtotal.textContent = "0 N";
  if (livePmotor) livePmotor.textContent = "0.00 kW";
  if (livePaux) livePaux.textContent = "0.60 kW";
  if (livePtotal) livePtotal.textContent = "0.60 kW";
  if (liveEnergy) liveEnergy.textContent = "0 Wh";

  updateBatteryMonitorUI();
  updateMilestone1Calculations();

  if (resetSimulationBtn) {
    resetSimulationBtn.style.display = 'none';
  }
  if (proceedToExplanationBtn) {
    proceedToExplanationBtn.style.display = 'none';
  }
  if (comparisonPanel) {
    comparisonPanel.style.display = 'none';
  }
  document.body.classList.remove('simulating-active');
}

// math physics solver
function runPhysicsStep() {
  simTime += simTimeStep;
  if (simTime >= simDuration) {
    simTime = simDuration;
    updateUIValues(true);
    endSimulationTest();
    return;
  }

  // calculate new speed and accel
  let v_target = 0;
  let a_target = 0;
  let isBraking = false;

  let t = simTime;
  let v_max = speedKmh / 3.6;

  // Determine dynamic braking parameters based on speed threshold (90 km/h)
  let isBrakeAggressive = (speedKmh >= 90);
  let brakeDuration = isBrakeAggressive ? 1.0 : 0.5;
  let brakeDecel = isBrakeAggressive ? -10.0 : -3.0;
  if (activeProfile === 'custom' && isBrakeAggressive) {
    brakeDecel = -6.0; // custom aggressive decel
  } else if (activeProfile === 'eco' && isBrakeAggressive) {
    brakeDecel = -8.0; // eco aggressive decel
  }

  // Calculate if currently in a braking window (for eco, aggressive, and custom profiles)
  let numBrakes = Math.round(brakeFreq * 0.5);
  numBrakes = Math.max(1, numBrakes);
  let inBrakePeriod = false;
  if (numBrakes >= 1) {
    let eventInterval = 30.0 / (numBrakes + 1);
    for (let i = 1; i <= numBrakes; i++) {
      let bStart = i * eventInterval - (brakeDuration / 2);
      let bEnd = bStart + brakeDuration;
      if (t >= bStart && t < bEnd) {
        inBrakePeriod = true;
        break;
      }
    }
  }

  if (activeProfile === 'eco') {
    if (inBrakePeriod) {
      a_target = brakeDecel;
      v_target = 0;
      isBraking = true;
    } else {
      if (vActual < v_max) {
        a_target = 1.5;
        v_target = vActual + a_target * simTimeStep;
      } else {
        a_target = 0;
        v_target = v_max;
      }
    }
  } else if (activeProfile === 'city') {
    // city profile calculations dynamically determined by brakeFreq
    let numBrakesCity = Math.round(brakeFreq * 0.5);
    numBrakesCity = Math.max(1, numBrakesCity); // ensure at least 1 cycle
    
    let cycleDuration = 30.0 / numBrakesCity;
    let cycleIdx = Math.floor(t / cycleDuration);
    if (cycleIdx >= numBrakesCity) cycleIdx = numBrakesCity - 1; // clamp to last cycle
    
    let t_cycle = t - (cycleIdx * cycleDuration);
    let v_max_city = speedKmh / 3.6;
    let v_peak = (cycleIdx % 2 === 0) ? v_max_city : v_max_city * 0.9;
    
    let t_accel = cycleDuration * 0.25;
    let t_cruise = cycleDuration * 0.65;
    let t_decel = cycleDuration * 0.80;

    if (t_cycle < t_accel) {
      a_target = v_peak / t_accel;
      v_target = a_target * t_cycle;
    } else if (t_cycle < t_cruise) {
      a_target = 0;
      v_target = v_peak;
    } else if (t_cycle < t_decel) {
      a_target = -v_peak / (t_decel - t_cruise);
      v_target = v_peak + a_target * (t_cycle - t_cruise);
      isBraking = true;
    } else {
      a_target = 0;
      v_target = 0;
      isBraking = true; // Still holding brakes while stopped
    }
  } else if (activeProfile === 'aggressive') {
    if (inBrakePeriod) {
      a_target = brakeDecel;
      v_target = 0;
      isBraking = true;
    } else {
      if (vActual < v_max) {
        a_target = 4.5; // harsh acceleration
        v_target = vActual + a_target * simTimeStep;
      } else {
        a_target = 0;
        v_target = v_max;
      }
    }
  } else {
    if (inBrakePeriod) {
      a_target = brakeDecel;
      v_target = 0;
      isBraking = true;
    } else {
      if (vActual < v_max) {
        a_target = 2.5; 
        v_target = vActual + a_target * simTimeStep;
      } else {
        a_target = 0;
        v_target = v_max;
      }
    }
  }

  // cap motor force and power
  let F_accel_req = activeVehicleMass * a_target;

  let F_req = F_accel_req + currentSimulationLoad;
  let F_actual = F_req;
  let a_actual = a_target;

  let forceLimitScale = 1.0;
  let powerLimitScale = 1.0;
  if (speedKmh > 150) {
    forceLimitScale = Math.pow(speedKmh / 150, 2);
    powerLimitScale = Math.pow(speedKmh / 150, 3);
  }
  const maxMotorForce = 5000 * forceLimitScale;
  const maxMotorPower = 120000 * powerLimitScale;

  if (F_req > 0) {
    let F_limit = maxMotorForce;
    if (vActual > 0.1) {
      F_limit = Math.min(maxMotorForce, maxMotorPower / vActual);
    }
    F_actual = Math.min(F_req, F_limit);
    a_actual = (F_actual - currentSimulationLoad) / activeVehicleMass;
  } else {
    a_actual = a_target; // deceleration in braking / regen
  }

  let v_prev = vActual;
  vActual += a_actual * simTimeStep;
  if (vActual < 0) vActual = 0;
  
  // limit speed overshoot
  if (a_target >= 0) {
    if (vActual > v_target) vActual = v_target;
  } else {
    // only clamp if we were previously above target speed
    if (v_prev >= v_target && vActual < v_target) {
      vActual = v_target;
    }
  }

  let v = vActual;
  let a = a_actual;

  // calculate force
  tractiveForce = activeVehicleMass * a + currentSimulationLoad;

  // calculate power demand
  let mechanicalPowerW = tractiveForce * v;
  let electricalPowerW = mechanicalPowerW + AUX_POWER_W;

  // check motor/regen efficiency
  let batteryDrawW = 0;
  let regenEfficiency = 0.70;

  if (electricalPowerW < 0) {
    if (activeProfile === 'city' || activeProfile === 'eco') {
      regenEfficiency = 0.75;
    } else {
      if (a < -1.5) {
        regenEfficiency = 0.15; // heat friction loss
      } else if (a < -0.8) {
        regenEfficiency = 0.45;
      }
    }
    batteryDrawW = electricalPowerW * regenEfficiency;
  } else {
    batteryDrawW = electricalPowerW / 0.90;
  }

  instantPowerDemand = batteryDrawW / 1000.0; // kW

  // voltage sag math
  let voc = 350 + 30 * (batteryPercent / 100); // voc drops with soc
  let R_int = 0.12; // internal resistance
  let safeVoc = Math.max(1.0, voc);
  let discriminant = safeVoc * safeVoc - 4 * R_int * batteryDrawW;
  if (discriminant >= 0) {
    currentDrawAmps = (safeVoc - Math.sqrt(discriminant)) / (2 * R_int);
  } else {
    currentDrawAmps = batteryDrawW / safeVoc;
  }
  terminalVoltage = safeVoc - currentDrawAmps * R_int;

  // cell heating calculations
  let batteryHeatingRate = (currentDrawAmps * currentDrawAmps * R_int) * 0.00018; // °C/sec
  let batteryCoolingRate = (batteryTemperature - 25.0) * 0.025; // °C/sec
  batteryTemperature += (batteryHeatingRate - batteryCoolingRate) * simTimeStep;
  batteryTemperature = Math.max(25.0, Math.min(85.0, batteryTemperature));

  // track peak demand
  if (Math.abs(instantPowerDemand) > Math.abs(peakPowerDemand)) {
    peakPowerDemand = instantPowerDemand;
  }
  if (Math.abs(tractiveForce) > Math.abs(maxTractiveForce)) {
    maxTractiveForce = tractiveForce;
  }

  // energy integration
  let stepEnergyWh = (batteryDrawW * simTimeStep) / 3600.0;
  energyConsumed += stepEnergyWh;
  if (energyConsumed < 0 && activeTerrain !== 'downhill') {
    energyConsumed = 0;
  }

  // Scale battery percent depletion by 20x to visually reflect a realistic trip drop
  batteryPercent = 100.0 - ((energyConsumed / BATTERY_CAPACITY_WH) * 100.0 * 20.0);
  batteryPercent = Math.max(0.0, Math.min(100.0, batteryPercent));

  distanceTraveled += (v * simTimeStep) / 1000.0;

  let whPerKm = 310;
  if (distanceTraveled > 0.0001 && energyConsumed > 0.0001) {
    whPerKm = energyConsumed / distanceTraveled;
  }
  whPerKm = Math.max(90, Math.min(500, whPerKm));
  let baselineRange = Math.round(120 * (1680 / activeVehicleMass));
  let capacityWh = baselineRange * 310;
  estRange = Math.round((batteryPercent / 100.0) * (capacityWh / whPerKm));

  // update hud text
  hudSpeed.textContent = `${(v * 3.6).toFixed(1)} km/h`;

  if (instantPowerDemand < 0) {
    hudRegen.textContent = `${Math.round(regenEfficiency * 100)}%`;
    hudRegen.style.color = "#27ae60";
  } else {
    hudRegen.textContent = "--";
    hudRegen.style.color = "#0f172a";
  }

  // update progress
  let progressPercent = (simTime / simDuration) * 100;
  progressBar.style.width = `${progressPercent}%`;
  statusLabel.textContent = `Simulating: ${simTime.toFixed(1)}s / ${simDuration.toFixed(1)}s`;

  // update live values
  const liveFaccel = document.getElementById('liveFaccel');
  const liveFload = document.getElementById('liveFload');
  const liveFtotal = document.getElementById('liveFtotal');
  const livePmotor = document.getElementById('livePmotor');
  const livePaux = document.getElementById('livePaux');
  const livePtotal = document.getElementById('livePtotal');
  const liveEnergy = document.getElementById('liveEnergy');

  let f_accel = activeVehicleMass * a;
  
  if (liveFaccel) liveFaccel.textContent = `${Math.round(f_accel)} N`;
  if (liveFload) liveFload.textContent = `${Math.round(currentSimulationLoad)} N`;
  if (liveFtotal) liveFtotal.textContent = `${Math.round(tractiveForce)} N`;
  
  if (livePmotor) livePmotor.textContent = `${(mechanicalPowerW / 1000).toFixed(2)} kW`;
  if (livePaux) livePaux.textContent = `${(AUX_POWER_W / 1000).toFixed(2)} kW`;
  if (livePtotal) {
    livePtotal.textContent = `${instantPowerDemand.toFixed(2)} kW`;
  }
  if (liveEnergy) liveEnergy.textContent = `${Math.round(energyConsumed)} Wh`;

  // update E=P*t integration panel gauges
  if (livePowerDraw) livePowerDraw.textContent = `${instantPowerDemand.toFixed(2)} kW`;
  if (liveTimeElapsed) liveTimeElapsed.textContent = `${simTime.toFixed(1)}s`;
  if (liveEnergyConsumed) liveEnergyConsumed.textContent = `${Math.round(energyConsumed)} Wh`;
  if (liveFormulaDisplay) {
    let pAvg = simTime > 0.0001 ? (energyConsumed * 3.6 / simTime) : 0;
    liveFormulaDisplay.innerHTML = `E = P<sub>avg</sub> &times; t &rArr; <strong>${Math.round(energyConsumed)} Wh</strong> = ${pAvg.toFixed(2)} kW &times; ${simTime.toFixed(1)}s`;
  }

  // update styling and text
  const carModel = document.querySelector('.car-3d-model');
  const viewport = document.querySelector('.viewport-3d-wrapper');
  const isBrakingActive = isBraking || (a < -0.05 && vActual > 0.1);
  if (isBrakingActive) {
    hudStatus.textContent = "[BRAKING ACTIVE]";
    hudStatus.style.borderLeftColor = "#ef4444";
    hudStatus.style.color = "#ef4444";
    if (carModel) carModel.classList.add('braking');
    if (viewport) {
      viewport.classList.add('viewport-braking');
      viewport.classList.add('braking-active');
    }
  } else {
    hudStatus.textContent = "[SIMULATION ACTIVE]";
    hudStatus.style.borderLeftColor = "#04519b";
    hudStatus.style.color = "#0f172a";
    if (carModel) carModel.classList.remove('braking');
    if (viewport) {
      viewport.classList.remove('viewport-braking');
      viewport.classList.remove('braking-active');
    }
  }

  updateLiveFeedback();
  updateUIValues(false);
}

// Helper to calculate AI Eco-Score and Pass/Fail Verdict status
function getVerdictAndScore() {
  let safeMass = Math.max(100, parseFloat(activeVehicleMass) || 1680);
  let baselineRange = Math.round(120 * (1680 / safeMass));
  
  // 1. Calculate resulted range dynamically based on inputs
  let safeSpeed = Math.max(1.0, parseFloat(speedKmh) || 60);
  let speedFactor = 1.0;
  if (safeSpeed > 60) {
    // Compress speed above 120 km/h using a log scale to reflect resistance safely
    let cappedSpeed = safeSpeed;
    if (safeSpeed > 120) {
      cappedSpeed = 120 + 40 * Math.log(safeSpeed / 120);
    }
    speedFactor = Math.pow(60 / cappedSpeed, 1.1);
    // Hard clamp to prevent uncharacteristic single-digit results
    speedFactor = Math.max(0.25, speedFactor);
  } else {
    speedFactor = Math.min(1.4, Math.pow(60 / safeSpeed, 0.5));
  }
  
  let brakeFactor = 1.0;
  if (activeProfile === 'aggressive' || activeProfile === 'custom') {
    brakeFactor = Math.max(0.5, 1.0 - (brakeFreq - 3) * 0.04);
  } else if (activeProfile === 'city') {
    brakeFactor = 0.85;
  }
  
  let terrainFactor = 1.0;
  if (activeTerrain === 'hill') {
    terrainFactor = 0.65;
  } else if (activeTerrain === 'downhill') {
    terrainFactor = 1.30;
  }
  
  let profileFactor = 1.0;
  if (activeProfile === 'eco') {
    profileFactor = 1.05;
  } else if (activeProfile === 'aggressive') {
    profileFactor = 0.80;
  }
  
  let resultedRange = Math.max(1, Math.round(baselineRange * speedFactor * brakeFactor * terrainFactor * profileFactor));
  
  // Sync global estRange variable
  estRange = resultedRange;
  
  let rangeRetention = baselineRange > 0 ? (resultedRange / baselineRange) : 0;
  let baseScore = Math.round(100 * rangeRetention);
  
  let speedPenalty = 0;
  if (safeSpeed > 70) {
    speedPenalty = (safeSpeed - 70) * 0.8;
  }
  
  let cityPenalty = 0;
  if (activeProfile === 'city' && safeSpeed > 50) {
    cityPenalty = (safeSpeed - 50) * 1.2;
  }
  
  let brakePenalty = 0;
  if (activeProfile === 'aggressive' || activeProfile === 'custom') {
    brakePenalty = brakeFreq * 3;
  }
  
  let profilePenalty = 0;
  if (activeProfile === 'aggressive') {
    profilePenalty = 15;
  }
  
  let finalScore = baseScore - speedPenalty - cityPenalty - brakePenalty - profilePenalty;
  let calculatedEcoScore = Math.max(10, Math.min(100, Math.round(finalScore)));
  
  let rangeDiff = baselineRange - resultedRange;
  let verdict;
  
  // Apply profile-specific verdict rules
  if (activeProfile === 'eco') {
    verdict = 'Pass';
    calculatedEcoScore = Math.max(75, calculatedEcoScore); // Ensure score is healthy and passing
  } else if (activeProfile === 'city') {
    if (safeSpeed >= 90) {
      verdict = 'Fail';
      calculatedEcoScore = Math.min(65, calculatedEcoScore); // Ensure score reflects failure
    } else {
      verdict = 'Pass';
      calculatedEcoScore = Math.max(70, calculatedEcoScore); // Ensure score is passing
    }
  } else {
    // For aggressive and custom profiles
    if (safeSpeed >= 110) {
      verdict = 'Fail';
    } else {
      let isRangePass = (rangeDiff <= 15);
      let isScorePass = (calculatedEcoScore >= 70);
      verdict = (isRangePass && isScorePass) ? 'Pass' : 'Fail';
    }
  }
  
  return {
    baselineRange,
    calculatedEcoScore,
    verdict
  };
}

// update verdict results
function updateUIValues(isFinal = false) {
  let pAvg = simTime > 0.0001 ? (energyConsumed * 3.6 / simTime) : 0;
  if (livePowerDraw) livePowerDraw.textContent = `${instantPowerDemand.toFixed(2)} kW`;
  if (liveTimeElapsed) liveTimeElapsed.textContent = `${simTime.toFixed(1)}s`;
  if (liveEnergyConsumed) liveEnergyConsumed.textContent = `${Math.round(energyConsumed)} Wh`;
  if (liveFormulaDisplay) {
    liveFormulaDisplay.innerHTML = `E = P<sub>avg</sub> &times; t &rArr; <strong>${Math.round(energyConsumed)} Wh</strong> = ${pAvg.toFixed(2)} kW &times; ${simTime.toFixed(1)}s`;
  }
  
  if (isFinal) {
    let results = getVerdictAndScore();
    let color = results.verdict === 'Pass' ? '#27ae60' : '#ef4444';

    if (liveResultedRange) {
      liveResultedRange.textContent = `${estRange.toFixed(0)} km`;
    }
    if (rangeText) rangeText.textContent = `${estRange.toFixed(0)} km`;

    if (verdictScoreText) verdictScoreText.textContent = `${results.calculatedEcoScore.toFixed(0)}%`;
    if (verdictStatusText) {
      verdictStatusText.textContent = results.verdict;
      verdictStatusText.style.color = color;
    }
  } else {
    if (liveResultedRange) liveResultedRange.textContent = "-- km";
    if (rangeText) rangeText.textContent = "-- km";
    if (verdictScoreText) verdictScoreText.textContent = "--%";
    if (verdictStatusText) {
      verdictStatusText.textContent = "--";
      verdictStatusText.style.color = "#777777";
    }
  }
}

function updateLiveFeedback() {
  conclusionText.innerHTML = `Cumulative Energy: ${Math.round(energyConsumed)} Wh<br>Power: ${(instantPowerDemand || 0).toFixed(1)} kW`;
}

function generateVerdictText() {
  let energyVal = Math.round(energyConsumed);
  let pAvg = simTime > 0.0001 ? (energyConsumed * 3.6 / simTime) : 0;
  let baselineRange = Math.round(120 * (1680 / activeVehicleMass));
  
  let analysis = "";
  let results = getVerdictAndScore();
  let finalVerdict = results.verdict;
  let finalScore = results.calculatedEcoScore;

  if (activeTerrain === 'downhill') {
    if (finalVerdict === 'Pass') {
      analysis = `<strong>Downhill Descent Analysis:</strong> Why is the verdict a <strong>PASS</strong> despite negative values?
      <br>• <strong>Negative Force & Power:</strong> Downhill gravity pushes the vehicle forward. Since the motor doesn't need to work to pull it, tractive force and average power (avg: ${pAvg.toFixed(2)} kW) drop below zero.
      <br>• <strong>Negative Energy Consumed (${energyVal} Wh):</strong> The motor operates as a generator (regenerative braking), recharging the battery. Net energy consumed is negative because you are *adding* charge back to the pack rather than using it up.
      <br>• <strong>Why it passes:</strong> This energy recovery extends your driving range to <strong>${estRange.toFixed(0)} km</strong> (surpassing the ${baselineRange} km baseline). Because the system replenishes the battery instead of draining it, the run is highly efficient and yields a <strong>PASS</strong>.`;
    } else {
      let failReason = "";
      if (activeProfile === 'city' && speedKmh >= 90) {
        failReason = `unsafe driving speeds for City Traffic (speed is <strong>${speedKmh} km/h</strong>, which meets or exceeds the 90 km/h safety limit)`;
      } else if (speedKmh >= 110) {
        failReason = `unsafe driving speeds (speed is <strong>${speedKmh} km/h</strong>, which meets or exceeds the 110 km/h safety limit)`;
      } else {
        failReason = `inefficient driving parameters (AI Eco-Score is <strong>${finalScore}%</strong>, which is below the 70% passing threshold)`;
      }
      analysis = `<strong>Downhill Descent Analysis:</strong> Why is the verdict a <strong>FAIL</strong> despite negative values?
      <br>• <strong>Negative Energy values:</strong> Downhill gravity pushes the vehicle forward, allowing the motor to act as a generator (regenerative braking) and charge the battery (net energy consumed: <strong>${energyVal} Wh</strong>).
      <br>• <strong>Why it fails:</strong> Even though energy was recovered, the simulation yields a <strong>FAIL</strong> verdict due to ${failReason}. Regenerative recovery does not override safety and overall efficiency guidelines.`;
    }
  } else if (activeProfile === 'eco') {
    analysis = `<strong>Eco-Driving Analysis:</strong> By keeping a steady speed, the motor power <i>P</i> stayed very low (avg: ${pAvg.toFixed(2)} kW). Even though duration <i>t</i> was a full ${simTime.toFixed(1)}s, the total energy <i>E</i> was optimized to only <strong>${energyVal} Wh</strong>, maximizing your resulted driving range to <strong>${estRange.toFixed(0)} km</strong> (well above the ${baselineRange} km baseline).`;
  } else if (activeProfile === 'city') {
    analysis = `<strong>City Driving Analysis:</strong> Stop-and-go driving caused spikes in acceleration power. The average power <i>P</i> was ${pAvg.toFixed(2)} kW. This variable power over ${simTime.toFixed(1)}s resulted in a total energy <i>E</i> of <strong>${energyVal} Wh</strong>, yielding a resulted driving range of <strong>${estRange.toFixed(0)} km</strong> (relative to the ${baselineRange} km baseline).`;
  } else if (activeProfile === 'aggressive') {
    analysis = `<strong>Aggressive Driving Analysis:</strong> High speeds and harsh braking caused massive power draw <i>P</i> (avg: ${pAvg.toFixed(2)} kW). Even though time <i>t</i> was the same (${simTime.toFixed(1)}s), the total energy <i>E</i> surged to <strong>${energyVal} Wh</strong>, severely reducing your resulted driving range to only <strong>${estRange.toFixed(0)} km</strong> (well below the ${baselineRange} km baseline).`;
  } else {
    analysis = `<strong>Custom Sandbox Analysis:</strong> Average power <i>P</i> was ${pAvg.toFixed(2)} kW over a duration <i>t</i> of ${simTime.toFixed(1)}s, consuming <strong>${energyVal} Wh</strong> of energy <i>E</i>. This results in a driving range of <strong>${estRange.toFixed(0)} km</strong> relative to the ${baselineRange} km baseline.`;
  }
  
  conclusionText.innerHTML = analysis;
}

// add log to table
function logRunHistory() {
  if (emptyHistoryRow) {
    emptyHistoryRow.style.display = 'none';
  }

  const row = document.createElement('tr');
  
  let results = getVerdictAndScore();
  let color = results.verdict === 'Pass' ? '#27ae60' : '#ef4444';

  let slopeText = targetRoadTilt === 0 ? "Flat" : (targetRoadTilt > 0 ? "Incline" : "Decline");
  
  let profileName = 'Custom';
  if (activeProfile === 'eco') profileName = 'Eco-Driving';
  else if (activeProfile === 'city') profileName = 'City Traffic';
  else if (activeProfile === 'aggressive') profileName = 'Aggressive';

  row.innerHTML = `
    <td><strong>${profileName}</strong></td>
    <td>${slopeText}</td>
    <td>${activeVehicleMass.toFixed(0)} kg</td>
    <td>${Math.round(energyConsumed)} Wh</td>
    <td>${peakPowerDemand.toFixed(1)} kW</td>
    <td>${estRange.toFixed(0)} km</td>
    <td><strong>${results.calculatedEcoScore.toFixed(0)}%</strong></td>
    <td style="font-weight: bold; color: ${color}">${results.verdict}</td>
  `;

  if (reportTableBody) {
    reportTableBody.appendChild(row);
  }
}

// update battery pack monitor
function updateBatteryMonitorUI() {
  // set wave level and dynamic warn/critical color based on SoC
  if (socWave) {
    socWave.style.height = `${batteryPercent}%`;
    if (batteryPercent >= 95.0) {
      socWave.style.background = 'linear-gradient(to top, #2563eb, #60a5fa)';
      socWave.style.boxShadow = '0 -2px 10px rgba(59, 130, 246, 0.5)';
    } else if (batteryPercent >= 88.0) {
      socWave.style.background = 'linear-gradient(to top, #ea580c, #f97316)';
      socWave.style.boxShadow = '0 -2px 10px rgba(234, 88, 12, 0.5)';
    } else {
      socWave.style.background = 'linear-gradient(to top, #dc2626, #f87171)';
      socWave.style.boxShadow = '0 -2px 10px rgba(220, 38, 38, 0.5)';
    }
  }
  if (socPercentage) {
    socPercentage.textContent = `${batteryPercent.toFixed(1)}%`;
  }

  // set values in dials
  if (gaugeTemp) {
    gaugeTemp.textContent = `${batteryTemperature.toFixed(1)} °C`;
  }
  if (gaugeCurrent) {
    const unit = currentDrawAmps < -0.1 ? ' A (Regen)' : ' A';
    gaugeCurrent.textContent = `${Math.abs(currentDrawAmps).toFixed(1)}${unit}`;
  }
  if (gaugeVoltage) {
    gaugeVoltage.textContent = `${terminalVoltage.toFixed(0)} V`;
  }

  // strain level
  if (gaugeStrain) {
    if (batteryTemperature < 36.0) {
      gaugeStrain.textContent = "NORMAL";
      gaugeStrain.style.color = "#27ae60";
      gaugeStrain.className = "gauge-val";
    } else if (batteryTemperature < 52.0) {
      gaugeStrain.textContent = "WARM";
      gaugeStrain.style.color = "#ff6b00";
      gaugeStrain.className = "gauge-val strain-pulse";
    } else {
      gaugeStrain.textContent = "CRITICAL";
      gaugeStrain.style.color = "#ef4444";
      gaugeStrain.className = "gauge-val strain-pulse";
    }
  }

  // cells heat map
  for (let i = 0; i < 12; i++) {
    const cell = document.getElementById(`bCell${i}`);
    if (cell) {
      // hot spots calculations
      let cellTemp = batteryTemperature + CELL_THERMAL_OFFSETS[i] * (batteryTemperature - 25.0) * 0.15;
      
      if (currentDrawAmps < -0.5) {
        // cells glow green for regen
        cell.style.backgroundColor = '#10b981';
        cell.className = "battery-cell regen-pulse";
        if (Math.random() < 0.05) {
          spawnRegenParticle();
        }
      } else {
        // cell color based on temp
        cell.style.backgroundColor = getCellColor(cellTemp);
        cell.className = "battery-cell";
      }
    }
  }

  // update flow arrows
  if (flowIndicator) {
    if (currentDrawAmps > 0.5) {
      // discharging flows out
      flowIndicator.style.color = "#ef4444";
      flowIndicator.innerHTML = '<span class="flow-arrow-left strain-pulse">&larr;</span> Energy Flowing Out (Discharging)';
    } else if (currentDrawAmps < -0.5) {
      // charging flows in
      flowIndicator.style.color = "#10b981";
      flowIndicator.innerHTML = 'Energy Flowing In (Regenerating) <span class="flow-arrow-right regen-pulse">&rarr;</span>';
    } else {
      // standby
      flowIndicator.style.color = "#64748b";
      flowIndicator.innerHTML = 'Battery Pack Idle / Standby';
    }
  }
}

// map cell colors based on temperature
function getCellColor(temp) {
  if (temp <= 25.0) return '#3b82f6'; // cool blue
  if (temp >= 55.0) return '#ef4444'; // hot red
  
  if (temp < 40.0) {
    // blue to orange
    let r = (temp - 25.0) / 15.0;
    let red = Math.round(59 + (245 - 59) * r);
    let green = Math.round(130 + (158 - 130) * r);
    let blue = Math.round(246 + (11 - 246) * r);
    return `rgb(${red}, ${green}, ${blue})`;
  } else {
    // orange to red
    let r = (temp - 40.0) / 15.0;
    let red = Math.round(245 + (239 - 245) * r);
    let green = Math.round(158 + (68 - 158) * r);
    let blue = Math.round(11 + (68 - 11) * r);
    return `rgb(${red}, ${green}, ${blue})`;
  }
}

// spawn green dots
function spawnRegenParticle() {
  const wrapper = document.querySelector('.viewport-3d-wrapper');
  if (!wrapper) return;
  
  const particle = document.createElement('div');
  particle.className = 'regen-particle';
  
  // starting positions at wheels
  const positions = [
    { x: 90, y: 130 },  // Front Left
    { x: 140, y: 130 }, // Front Right
    { x: 90, y: 190 },  // Back Left
    { x: 140, y: 190 }  // Back Right
  ];
  const start = positions[Math.floor(Math.random() * positions.length)];
  
  // target center of car
  const destX = 115;
  const destY = 155;
  
  particle.style.setProperty('--sx', `${start.x}px`);
  particle.style.setProperty('--sy', `${start.y}px`);
  particle.style.setProperty('--dx', `${destX}px`);
  particle.style.setProperty('--dy', `${destY}px`);
  
  wrapper.appendChild(particle);
  
  // delete after animation
  setTimeout(() => {
    particle.remove();
  }, 800);
}

// 3D animation loop
function animate() {
  requestAnimationFrame(animate);

  // rotate road
  currentRoadTilt += (targetRoadTilt - currentRoadTilt) * 0.08;
  if (roadElement) {
    let roadTiltDeg = 60 + (currentRoadTilt * (180 / Math.PI));
    roadElement.style.transform = `translateY(-65px) rotateX(${roadTiltDeg}deg) translateZ(-40px)`;
  }

  // velocity checks
  let velocity = 0;
  if (isSimulating) {
    runPhysicsStep();
    velocity = vActual;
  }

  // update hud inclines
  if (hudGridAxis) {
    let tiltDeg = currentRoadTilt * (180 / Math.PI);
    hudGridAxis.style.transform = `rotateX(${-tiltDeg - 20}deg) rotateY(-30deg)`;
  }
  if (hudInclineAngle) {
    let tiltDeg = currentRoadTilt * (180 / Math.PI);
    hudInclineAngle.textContent = `${tiltDeg.toFixed(1)}°`;
  }

  if (velocity > 0.05) {
    let visualVelocity = velocity;

    wheelRotationAngle = (wheelRotationAngle + visualVelocity * 6.5) % 360; // spin wheels faster
    
    // Apply dynamic wheel spin blur based on velocity
    let wheelBlur = Math.min(4, velocity * 0.06);
    let wheelFilter = wheelBlur > 0.4 ? `blur(${wheelBlur}px)` : 'none';

    if (wheelFL) {
      wheelFL.style.transform = `rotateX(${wheelRotationAngle}deg)`;
      wheelFL.style.filter = wheelFilter;
    }
    if (wheelFR) {
      wheelFR.style.transform = `rotateX(${wheelRotationAngle}deg)`;
      wheelFR.style.filter = wheelFilter;
    }
    if (wheelBL) {
      wheelBL.style.transform = `rotateX(${wheelRotationAngle}deg)`;
      wheelBL.style.filter = wheelFilter;
    }
    if (wheelBR) {
      wheelBR.style.transform = `rotateX(${wheelRotationAngle}deg)`;
      wheelBR.style.filter = wheelFilter;
    }
    
    // scroll road stripes (increased multiplier from 30 to 75 for much faster visual flow)
    roadScrollPosition = (roadScrollPosition + visualVelocity * 75 * 0.016) % 1000;

    // Cockpit vibration effect at high speeds
    if (carModel) {
      if (velocity > 30) {
        let vibX = (Math.random() - 0.5) * (velocity - 30) * 0.03;
        let vibY = (Math.random() - 0.5) * (velocity - 30) * 0.03;
        let baseTransform = `translateZ(12px)`;
        if (carModel.classList.contains('braking')) {
          baseTransform = `translateZ(12px) rotateX(-12deg)`;
        }
        carModel.style.transform = `${baseTransform} translate(${vibX}px, ${vibY}px)`;
      } else {
        let baseTransform = `translateZ(12px)`;
        if (carModel.classList.contains('braking')) {
          baseTransform = `translateZ(12px) rotateX(-12deg)`;
        }
        carModel.style.transform = baseTransform;
      }
    }
  } else {
    // Reset wheels styling and filters when stopped
    if (wheelFL) wheelFL.style.filter = 'none';
    if (wheelFR) wheelFR.style.filter = 'none';
    if (wheelBL) wheelBL.style.filter = 'none';
    if (wheelBR) wheelBR.style.filter = 'none';

    if (carModel) {
      let baseTransform = `translateZ(12px)`;
      if (carModel.classList.contains('braking')) {
        baseTransform = `translateZ(12px) rotateX(-12deg)`;
      }
      carModel.style.transform = baseTransform;
    }
  }

  stripes.forEach((stripe, idx) => {
    let y = (idx * 200 + roadScrollPosition) % 1000;
    stripe.style.top = `${y}px`;

    // Dynamic stretch and blur to simulate speed lines (motion blur)
    // Capped stretch at 45px (total 90px height) to avoid stripes merging and locking the visual movement
    let stretch = Math.min(45, velocity * 0.9);
    stripe.style.height = `${45 + stretch}px`;
    
    let blurVal = Math.min(6, velocity * 0.08);
    stripe.style.filter = blurVal > 0.4 ? `blur(${blurVal}px)` : 'none';
  });

  // live battery updates
  if (isSimulating) {
    updateBatteryMonitorUI();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
