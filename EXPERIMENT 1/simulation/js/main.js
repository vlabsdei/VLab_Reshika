const labSettings = {
  expID: "EXP-01-MECH302",
  title: "Thermal Propagation & Containment Lab",
  status: "Active"
};

// Global physical state constants and variables
var kValue = 0.015;             // Heat conductivity of chosen barrier (W/m*K)
var barrierMaterial = 'Aerogel';  // Default locked-in barrier material
var specificHeat = 700;          // Specific heat capacity of barrier (J/kg*K)

// Toggle page view between stage 1 (conductivity test) and stage 2 (full runaway)
function switchPage(stageNum) {
  try {
    let s1 = document.getElementById('s1-conductivity-testbench');
    let s2 = document.getElementById('s2-propagation-sim');
    
    if (stageNum === 1) {
      if (s1) s1.style.display = 'block';
      if (s2) s2.style.display = 'none';
    } else if (stageNum === 2) {
      if (s1) s1.style.display = 'none';
      if (s2) s2.style.display = 'block';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    console.log("Navigation UI switch failed: " + err);
  }
}

// Navigation flow from step 1 to step 2 panel
let final_mat = document.getElementById('final-selected-material');
let btn_go_s2 = document.getElementById('go-to-step2-btn');
let proceed_card = document.getElementById('proceed-s2-wrapper');

if (final_mat) {
  final_mat.addEventListener('change', function() {
    try {
      if (btn_go_s2) btn_go_s2.disabled = false;
    } catch (e) {
      console.warn("Material confirmation selection error", e);
    }
  });
}

if (btn_go_s2) {
  btn_go_s2.addEventListener('click', function() {
    try {
      let selectedOption = final_mat.options[final_mat.selectedIndex];
      kValue = parseFloat(selectedOption.value);
      barrierMaterial = selectedOption.getAttribute('data-name');
      specificHeat = parseFloat(selectedOption.getAttribute('data-c'));
      
      updateInheritedValues();
      resetSimulation();
      switchPage(2);
    } catch (e) {
      console.error("Transition to stage 2 failed: " + e);
    }
  });
}

let btn_back = document.getElementById('back-to-step1-btn');
if (btn_back) {
  btn_back.addEventListener('click', function() {
    try {
      resetSimulation();
      switchPage(1);
    } catch (e) {
      console.log("Return to stage 1 error: " + e);
    }
  });
}

// Stage 1 Conductivity Test Bench State Variables
var testActive = false;
var testTime = 0.0;
var normalCellTemp = 25.0; 
var testTimerId = null;

const mat_select = document.getElementById('material-dropdown-selector');
const btn_run_test = document.getElementById('start-test-btn');
const cell_tgt = document.getElementById('normal-cell-graphic');
const temp_tgt = document.getElementById('normal-cell-temp');
const time_val = document.getElementById('elapsed-time-disp');
const verdict_lbl = document.getElementById('final-verdict-text');
const arrows_s1 = document.getElementById('heat-direction-arrows-s1');

// Color scaling helper: interpolates cell color based on current temp
function getTempBgColor(temp) {
  try {
    if (temp <= 25) {
      return '#add8e6'; // Cool state (light blue)
    }
    if (temp >= 80) {
      return '#dc3545'; // Hot runaway state (standard red)
    }
    // Interpolate rgb between cool (173, 216, 230) and hot (220, 53, 69)
    let ratio = (temp - 25) / 55;
    let r = Math.round(173 + (220 - 173) * ratio);
    let g = Math.round(216 + (53 - 216) * ratio);
    let b = Math.round(230 + (69 - 230) * ratio);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  } catch (err) {
    return '#add8e6';
  }
}

// Clear Stage 1 test run bench
function resetTestState() {
  try {
    clearInterval(testTimerId); 
    testActive = false;
    testTime = 0.0;
    normalCellTemp = 25.0;
    
    if (temp_tgt) temp_tgt.innerText = '25.0°C';
    if (time_val) time_val.innerText = '-- s';
    if (verdict_lbl) {
      verdict_lbl.innerText = '--';
      verdict_lbl.className = 'result-item-val';
      verdict_lbl.style.color = '';
    }
    if (cell_tgt) cell_tgt.style.backgroundColor = getTempBgColor(25);
    if (btn_run_test) {
      btn_run_test.innerText = 'Run Thermal Test';
      btn_run_test.disabled = false;
    }
    if (arrows_s1) arrows_s1.style.opacity = 0;
    
    if (proceed_card) proceed_card.classList.add('is-state-disabled');
    if (final_mat) {
      final_mat.disabled = true;
      final_mat.value = "";
    }
    if (btn_go_s2) btn_go_s2.disabled = true;
  } catch (err) {
    console.error("Test bench reset failed", err);
  }
}

if (mat_select) {
  mat_select.addEventListener('change', resetTestState);
}

if (btn_run_test) {
  btn_run_test.addEventListener('click', function() {
    try {
      if (testActive) { 
        resetTestState(); 
        return; 
      }
      resetTestState();
      testActive = true;
      btn_run_test.innerText = 'Stop Test';
      if (arrows_s1) arrows_s1.style.opacity = 1;
      
      var thermalConductivity = parseFloat(mat_select.value);
      testTimerId = setInterval(function() {
        try {
          testTime += 0.05; 
          var tempDifference = 120.0 - normalCellTemp;
          // Heat conduction rate approximation: deltaT = k * dt * dT
          var tempIncrease = thermalConductivity * 0.0002 * tempDifference;
          normalCellTemp += tempIncrease;
          
          if (temp_tgt) temp_tgt.innerText = normalCellTemp.toFixed(1) + '°C';
          if (cell_tgt) cell_tgt.style.backgroundColor = getTempBgColor(normalCellTemp);
          
          // Anode SEI decomposition & separator structural breakdown threshold
          if (normalCellTemp >= 80.0) {
            clearInterval(testTimerId);
            testActive = false;
            btn_run_test.innerText = 'Reset Test';
            if (arrows_s1) arrows_s1.style.opacity = 0;
            if (time_val) time_val.innerText = testTime.toFixed(1) + ' s';
            if (verdict_lbl) {
              verdict_lbl.innerText = 'FAILED\nHeats up too fast';
              verdict_lbl.style.color = '#dc3545';
            }
            if (proceed_card) proceed_card.classList.remove('is-state-disabled');
            if (final_mat) final_mat.disabled = false;
          } 
          else if (testTime >= 10.0) {
            clearInterval(testTimerId);
            testActive = false;
            btn_run_test.innerText = 'Reset Test';
            if (arrows_s1) arrows_s1.style.opacity = 0;
            if (time_val) time_val.innerText = '> 10.0 s';
            if (verdict_lbl) {
              verdict_lbl.innerText = 'SAFE\nGood Insulator';
              verdict_lbl.style.color = '#2f5d50';
            }
            if (proceed_card) proceed_card.classList.remove('is-state-disabled');
            if (final_mat) final_mat.disabled = false;
          }
        } catch (simError) {
          console.error("Test loop runtime crash", simError);
          clearInterval(testTimerId);
        }
      }, 50);
    } catch (clickError) {
      console.error("Test runner callback triggered error", clickError);
    }
  });
}

// Stage 2 DOM references and controllers
var in_temp = document.getElementById('temp-slider-input');
var in_cool = document.getElementById('cool-slider-input');
var in_dur = document.getElementById('dur-slider-input');
var chk_auto = document.getElementById('auto-deploy-checkbox');
var in_mass = document.getElementById('mass-slider-input');

var lbl_temp = document.getElementById('temp-slider-value');
var lbl_cool = document.getElementById('cool-slider-value');
var lbl_dur = document.getElementById('dur-slider-value');
var lbl_mass = document.getElementById('mass-slider-value');

var btn_fault = document.getElementById('trigger-fault-btn');
var btn_deploy = document.getElementById('deploy-emergency-barrier-btn');
var btn_reset = document.getElementById('reset-simulation-btn');

var cellsDomList = [
  document.getElementById('cell-1-source'),
  document.getElementById('cell-2-mid'),
  document.getElementById('cell-3-end')
];
var arr_1 = document.getElementById('heat-arrow-1');
var arr_2 = document.getElementById('heat-arrow-2');
var barrier_block = document.getElementById('isolation-barrier-block');

var live_eqs = document.getElementById('live-formula-panel');
var live_temps = document.getElementById('live-temperature-monitor');
var live_dmg = document.getElementById('live-damaged-cells-log');

var peak_temp = document.getElementById('peak-temp-display');
var resp_time = document.getElementById('response-time-display');
var dmg_count = document.getElementById('damaged-cells-count');

var btn_history = document.getElementById('show-history-modal-btn');
var modal_popup = document.getElementById('history-modal-backdrop');
var btn_close_modal = document.getElementById('close-history-modal-btn');
var h_dmg = document.getElementById('history-total-damaged');
var h_breach = document.getElementById('history-first-breach');
var h_recovery = document.getElementById('history-recovery-duration');

// Thermodynamic modeling constants (LiFePO4 chemistry average values)
var initialTemp = 35;
var coolingRate = 50;
var faultDuration = 7; 
var cellMass = 0.5; 
var cellSpecificHeat = 900; // standard specific heat (J/kg*K)
var thermalCapacity = cellMass * cellSpecificHeat; 

// Propagation simulation runtime states
var cellTemps = [25, 25, 25];
var maxCellTemps = [25, 25, 25];

var tickRate = 50; // interval in ms (20 updates/sec)
var dt = 0.05;     // time-step integration constant
var criticalTemp = 80; // Runaway trigger temp (C)

var simActive = false;
var barrierDropped = false;
var simTime = 0;
var simIntervalId = null;
var peakTemp = 25;

var damagedCells = new Set(); 
var totalDamaged = 0;
var firstBreachTime = null;
var fullCoolTime = null;
var failedCells = new Set(); 

var barrierGapIndex = 0; 
var barrierBtnVisible = false;
var totalHeatJ = 0; 
var toastShown = false; 

if (in_temp) {
  in_temp.addEventListener('input', function(event) {
    try {
      if (simActive) { 
        event.target.value = initialTemp; 
        return; 
      }
      initialTemp = parseInt(event.target.value);
      lbl_temp.innerText = initialTemp + '°C';
      clearStatsData();
    } catch (e) {
      console.log("Initial temperature input adjust failed", e);
    }
  });
}

if (in_mass) {
  in_mass.addEventListener('input', function(event) {
    try {
      if (simActive) { 
        event.target.value = cellMass; 
        return; 
      }
      cellMass = parseFloat(event.target.value);
      lbl_mass.innerText = cellMass.toFixed(1) + ' kg';
      thermalCapacity = cellMass * cellSpecificHeat;
      clearStatsData();
    } catch (e) {
      console.log("Mass adjustment logger error", e);
    }
  });
}

if (in_cool) {
  in_cool.addEventListener('input', function(event) {
    try {
      if (simActive) { 
        event.target.value = coolingRate; 
        return; 
      }
      coolingRate = parseInt(event.target.value);
      lbl_cool.innerText = coolingRate + '%';
      clearStatsData();
    } catch (e) {
      console.log("Cooling speed slider adjustment error", e);
    }
  });
}

if (in_dur) {
  in_dur.addEventListener('input', function(event) {
    try {
      if (simActive) { 
        event.target.value = faultDuration; 
        return; 
      }
      faultDuration = parseInt(event.target.value);
      lbl_dur.innerText = faultDuration + 's';
      clearStatsData();
    } catch (e) {
      console.log("Fault duration state update failed", e);
    }
  });
}

if (btn_fault) {
  btn_fault.addEventListener('click', function() {
    try {
      if (simActive) return; 
      simActive = true;
      btn_fault.disabled = true; 
      simTime = 0;
      if (resp_time) resp_time.innerText = '-';
      simIntervalId = setInterval(runStep, tickRate);
    } catch (e) {
      console.error("Fault event initialization crashed", e);
    }
  });
}

if (btn_deploy) {
  btn_deploy.addEventListener('click', function() {
    try {
      if (barrierDropped) return; 
      var targetGap = -1;
      for (let i = 0; i < 3; i++) {
        if (cellTemps[i] >= 80 || failedCells.has(i)) {
          targetGap = i;
        }
      }
      var finalGapIdx = targetGap === -1 ? 0 : targetGap;
      var currentGapBox;
      if (finalGapIdx === 0) {
        currentGapBox = document.getElementById('gap-block-1');
      } else if (finalGapIdx === 1) {
        currentGapBox = document.getElementById('gap-block-2');
      } else {
        currentGapBox = document.getElementById('gap-block-3');
      }
      
      if (currentGapBox && barrier_block) {
        currentGapBox.appendChild(barrier_block);
      }
      deployBarrier('Manual Intervention', finalGapIdx);
      btn_deploy.style.display = 'none'; 
    } catch (e) {
      console.error("Manual safety barrier drop crashed", e);
    }
  });
}

if (btn_reset) {
  btn_reset.addEventListener('click', function() {
    try {
      resetSimulation();
    } catch (e) {
      console.log("Reset button trigger failure", e);
    }
  });
}

if (btn_history) {
  btn_history.addEventListener('click', function() {
    try {
      if (h_dmg) h_dmg.innerText = totalDamaged;
      if (firstBreachTime !== null) {
        if (h_breach) h_breach.innerText = firstBreachTime.toFixed(2) + 's';
      } else {
        if (h_breach) h_breach.innerText = 'N/A';
      }
      if (firstBreachTime !== null && fullCoolTime !== null) {
        if (h_recovery) h_recovery.innerText = (fullCoolTime - firstBreachTime).toFixed(2) + 's';
      } else if (firstBreachTime !== null) {
        if (h_recovery) h_recovery.innerText = 'Unresolved';
      } else {
        if (h_recovery) h_recovery.innerText = 'N/A';
      }
      if (modal_popup) modal_popup.style.display = 'flex';
    } catch (e) {
      console.log("History records fetch failed", e);
    }
  });
}

if (btn_close_modal) {
  btn_close_modal.addEventListener('click', function() { 
    try {
      if (modal_popup) modal_popup.style.display = 'none'; 
    } catch (e) {
      console.log("History modal close handler error", e);
    }
  });
}

var toast_close = document.getElementById('close-warn-btn');
if (toast_close) {
  toast_close.addEventListener('click', function() {
    try {
      var warningToast = document.getElementById('warn-popup-m302');
      if (warningToast) {
        warningToast.style.display = 'none';
        warningToast.classList.remove('toast-shake-animation');
      }
    } catch (e) {
      console.log("Toast warning alert hide failed", e);
    }
  });
}

// Thermal mapping RGB bounds
var colorHeatLow  = [225, 173, 1,   0.70]; 
var colorHeatMid  = [255, 165, 0,   0.70]; 
var colorHeatHigh = [204, 119, 34,  0.70]; 

var colorCoolHigh = [4,   146, 194, 0.70]; 
var colorCoolMid  = [82,  178, 191, 0.70]; 
var colorCoolLow  = [130, 238, 253, 0.70]; 

function rgbaToString(colorArr) { 
  return 'rgba(' + colorArr[0] + ', ' + colorArr[1] + ', ' + colorArr[2] + ', ' + colorArr[3].toFixed(2) + ')'; 
}

function stringToRgba(rgbaStr) {
  var parts = rgbaStr.match(/[\d.]+/g);
  return [parseFloat(parts[0]), parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])];
}

function interpolateColors(c1, c2, factor) {
  var r   = Math.round(c1[0] + (c2[0] - c1[0]) * factor);
  var g = Math.round(c1[1] + (c2[1] - c1[1]) * factor);
  var b  = Math.round(c1[2] + (c2[2] - c1[2]) * factor);
  var a = (c1[3] + (c2[3] - c1[3]) * factor).toFixed(2);
  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
}

function getHeatColor(temp) {
  var heatDegrees = temp - 25;
  if (heatDegrees <= 0) return rgbaToString(colorHeatLow);
  if (heatDegrees < 55) {
    return interpolateColors(colorHeatLow, colorHeatMid, heatDegrees / 55);
  }
  return interpolateColors(colorHeatMid, colorHeatHigh, Math.min(1, (heatDegrees - 55) / 40));
}

function getCellColor(currentTemp, cellIndex) {
  var hottestColor = getHeatColor(maxCellTemps[cellIndex]);
  var dropInTemp   = maxCellTemps[cellIndex] - currentTemp;
  if (dropInTemp <= 0.1 || !barrierDropped) {
    return hottestColor;
  }
  var hotColorArray = stringToRgba(hottestColor);
  if (dropInTemp < 25) {
    return interpolateColors(hotColorArray, colorCoolHigh, dropInTemp / 25);
  }
  if (dropInTemp < 60) {
    return interpolateColors(colorCoolHigh, colorCoolMid, (dropInTemp - 25) / 35);
  }
  return interpolateColors(colorCoolMid, colorCoolLow, Math.min(1, (dropInTemp - 60) / 40));
}

// Statistical calculator for logs and simulation data
function updateSimulationStats() {
  try {
    var maxCurrentTemp = Math.max(cellTemps[0], cellTemps[1], cellTemps[2]);
    if (maxCurrentTemp > peakTemp) {
      peakTemp = maxCurrentTemp;
      if (peak_temp) peak_temp.innerText = Math.round(peakTemp) + '°C';
    }
    
    var newDamage = false;
    for (let i = 0; i < cellTemps.length; i++) {
      if (cellTemps[i] >= 120 && !damagedCells.has(i)) { 
        damagedCells.add(i); 
        newDamage = true; 
      }
    }
    
    if (newDamage && firstBreachTime === null) {
      firstBreachTime = simTime;
    }
    
    var allCooled = true;
    for (let i = 0; i < cellTemps.length; i++) {
      var t = cellTemps[i];
      if (!failedCells.has(i) && t > initialTemp + 2) {
        allCooled = false; 
      }
    }
    
    if (allCooled && firstBreachTime !== null && fullCoolTime === null && barrierDropped) {
      fullCoolTime = simTime;
    }
    
    totalDamaged = damagedCells.size;
    if (dmg_count) dmg_count.innerText = totalDamaged;
  } catch (err) {
    console.warn("Real-time stats updates error: " + err);
  }
}

// Re-renders the cells block representation
function updateCellsUi() {
  try {
    for (let i = 0; i < 3; i++) {
      if (cellTemps[i] > maxCellTemps[i]) {
        maxCellTemps[i] = cellTemps[i];
      }
      
      if (failedCells.has(i)) {
        cellsDomList[i].classList.add('state-burnt-carbonized');
        cellsDomList[i].innerHTML = '<div class="cell-temp-text dmg-text">Damaged<br>Cell</div>';
      } else {
        cellsDomList[i].classList.remove('state-burnt-carbonized');
        cellsDomList[i].innerHTML = '<div class="cell-temp-text"><span id="temp-val-c' + (i+1) + '">' + Math.round(cellTemps[i]) + '</span>°C</div>';
        cellsDomList[i].style.backgroundColor = getCellColor(cellTemps[i], i);
      }
    }
    updateSimulationStats();
  } catch (err) {
    console.error("Redraw state grid failed: " + err);
  }
}

// Integration math step solver (Euler method)
function runStep() {
  try {
    simTime += dt;
    var tempCell1 = cellTemps[0];
    var tempCell2 = cellTemps[1];
    var tempCell3 = cellTemps[2];
    var powerGenerated = 0; 
    var temperatureRise = 0; 

    // Categorize collapsed runaway states
    for (let i = 0; i < cellTemps.length; i++) {
      if (cellTemps[i] >= 120) {
        failedCells.add(i);
      }
    }

    var inefficiencyRatio = (100 - coolingRate) / 100;
    var conductivityMultiplier = 1 + (kValue * 0.005);
    // localized thermal energy generation simulation
    powerGenerated = 15000 * (cellMass / 0.5) * conductivityMultiplier * Math.pow(inefficiencyRatio, 1.5);
    temperatureRise = (powerGenerated / thermalCapacity) * dt;
    
    var NORMAL_CONDUCTION = 0.012; 
    var isBarrierBlockingGap1 = barrierDropped && (barrierGapIndex === 0);
    var isBarrierBlockingGap2 = barrierDropped && (barrierGapIndex === 1);

    // Active heating phase for source cell 1
    if (!failedCells.has(0)) {
      if ((simTime <= faultDuration) || (tempCell1 >= criticalTemp)) {
        tempCell1 += temperatureRise;
        totalHeatJ += powerGenerated * dt;
      }
    }
    
    // Conduction pathway cell 1 -> cell 2
    var conductionRate1to2 = isBarrierBlockingGap1 ? (kValue * 0.002) : NORMAL_CONDUCTION;
    tempCell2 += conductionRate1to2 * (tempCell1 - tempCell2); 
    if (tempCell2 >= criticalTemp && !failedCells.has(1)) {
      tempCell2 += temperatureRise; 
      totalHeatJ += powerGenerated * dt;
    }

    // Conduction pathway cell 2 -> cell 3
    var conductionRate2to3 = isBarrierBlockingGap2 ? (kValue * 0.002) : NORMAL_CONDUCTION;
    tempCell3 += conductionRate2to3 * (tempCell2 - tempCell3); 
    if (tempCell3 >= criticalTemp && !failedCells.has(2)) {
      tempCell3 += temperatureRise;
      totalHeatJ += powerGenerated * dt;
    }

    // Directional arrows indicator triggers
    if (arr_1) arr_1.style.opacity = (tempCell1 >= criticalTemp && !barrierDropped) ? 1 : 0;
    if (arr_2) arr_2.style.opacity = (tempCell2 >= criticalTemp && !barrierDropped) ? 1 : 0;

    var totalDeltaTSoFar = Math.max(0, tempCell1 - initialTemp);
    var totalEnergyQ     = cellMass * cellSpecificHeat * totalDeltaTSoFar;
    
    // Live formulas printer
    if (live_eqs) {
      live_eqs.innerHTML = '<div style="font-weight: bold; font-size: 1.1rem; color: #2c3e50; margin-bottom: 5px;">Formula: Q = m * c * ΔT</div><div>Live: Q<sub>gen</sub> = (Mass: ' + cellMass + 'kg) * (c: ' + cellSpecificHeat + ') * (ΔT: +' + totalDeltaTSoFar.toFixed(1) + '°C) = ' + Math.round(totalEnergyQ) + ' J</div><div style="margin-top: 3px; color: #555;">Time Elapsed: ' + simTime.toFixed(1) + 's | Total Energy Released: ' + (totalHeatJ / 1000).toFixed(2) + ' kJ</div>';
    }
    if (live_temps) {
      live_temps.innerText = 'Cell 1: ' + tempCell1.toFixed(1) + '°C   |   Cell 2: ' + tempCell2.toFixed(1) + '°C   |   Cell 3: ' + tempCell3.toFixed(1) + '°C';
    }

    if (failedCells.size > 0) {
      var warningList = [];
      failedCells.forEach(function(cellIndex) {
        warningList.push('Cell ' + (cellIndex+1) + ': ' + Math.round(maxCellTemps[cellIndex]) + '°C (damaged)');
      });
      if (live_dmg) {
        live_dmg.innerText = 'Damaged: ' + warningList.join('   |   ');
        live_dmg.style.display = 'block';
      }
    } else {
      if (live_dmg) {
        live_dmg.innerText = '';
        live_dmg.style.display = 'none';
      }
    }

    var currentHottestTemp = Math.max(tempCell1, tempCell2, tempCell3);
    if (currentHottestTemp >= criticalTemp && !barrierDropped && !barrierBtnVisible && chk_auto.checked) {
      barrierBtnVisible = true;
      if (btn_deploy) btn_deploy.style.display = 'block'; 
    }

    var baselineCoolingSpeed = (coolingRate / 100) * 0.9;
    var finalCoolingSpeed = baselineCoolingSpeed * (1 + kValue * 0.05);
    var isGoodConductor = (barrierMaterial === 'Aluminum' || barrierMaterial === 'Steel');
    var isCoolingActive = (barrierDropped && !isGoodConductor) || 
                          (simTime > faultDuration && Math.max(tempCell1, tempCell2, tempCell3) < criticalTemp);
    
    if (isCoolingActive) {
      var coolingRateToUse = barrierDropped ? finalCoolingSpeed : baselineCoolingSpeed;
      if (tempCell1 > initialTemp) {
        tempCell1 -= (tempCell1 - initialTemp) * coolingRateToUse * dt;
        if (tempCell1 <= initialTemp + 0.5) tempCell1 = initialTemp;
      }
      if (tempCell2 > initialTemp) {
        tempCell2 -= (tempCell2 - initialTemp) * coolingRateToUse * dt;
        if (tempCell2 <= initialTemp + 0.5) tempCell2 = initialTemp;
      }
      if (tempCell3 > initialTemp) {
        tempCell3 -= (tempCell3 - initialTemp) * coolingRateToUse * dt;
        if (tempCell3 <= initialTemp + 0.5) tempCell3 = initialTemp;
      }
    }

    if (barrierDropped && isGoodConductor) {
      if (!toastShown) {
        toastShown = true;
        var warningToast = document.getElementById('warn-popup-m302');
        var warnBarrierName = document.getElementById('warn-mat-name');
        if (warningToast && warnBarrierName) {
          warnBarrierName.innerText = barrierMaterial;
          warningToast.style.display = 'block';
          warningToast.classList.add('toast-shake-animation');
        }
      }
    }

    var eventLogText = document.getElementById('system-event-log');
    if (eventLogText) {
      if (failedCells.size > 0) {
        eventLogText.innerText = '[ALERT] Unmitigated runaway has compromised cell structural integrity. Carbonization state triggered...';
      } else if (barrierDropped) {
        if (isGoodConductor) {
          eventLogText.innerText = '[WARNING] Conductive barrier (' + barrierMaterial + ') inserted at gap ' + (barrierGapIndex + 1) + '. Heat bridge created! Runaway propagation continuing...';
        } else {
          eventLogText.innerText = '[CONTAINMENT DETECTED] Isolation barrier inserted at gap ' + (barrierGapIndex + 1) + '. Conduction pathway severed. Cooling circulation engaged...';
        }
      } else if (tempCell1 >= criticalTemp) {
        eventLogText.innerText = '[CRITICAL ALERT] Cell 1 temperature has exceeded safety bounds. Containment systems primed...';
      } else if (simTime <= faultDuration && tempCell1 > initialTemp) {
        eventLogText.innerText = 'Cell 1 experiencing internal localized short-circuit. Rapid thermal generation Q_gen building up...';
      } else {
        eventLogText.innerText = 'System stable. Monitoring thermal levels...';
      }
    }

    cellTemps = [
      Math.max(initialTemp, tempCell1), 
      Math.max(initialTemp, tempCell2), 
      Math.max(initialTemp, tempCell3)
    ];
    updateCellsUi();

    var areAllCellsDestroyed = (failedCells.size === 3);
    var areAllSurvivingCellsCooled = true;
    for (let i = 0; i < 3; i++) {
      var isBurnt = failedCells.has(i);
      var isCooled = cellTemps[i] <= initialTemp + 2;
      if (!isBurnt && !isCooled) {
        areAllSurvivingCellsCooled = false; 
      }
    }

    var isFaultOverAndSafe = (simTime > faultDuration) && areAllSurvivingCellsCooled;
    if (areAllCellsDestroyed || isFaultOverAndSafe) {
      clearInterval(simIntervalId);
      simActive      = false;
      barrierBtnVisible = false;
      if (btn_fault) btn_fault.disabled = false;
      if (btn_deploy) btn_deploy.style.display = 'none';
    }
  } catch (err) {
    console.error("Euler numerical solver crashed on execution step:", err);
    clearInterval(simIntervalId);
  }
}

// Drops safety barrier visual and sets thermal bridge stats
function deployBarrier(triggerType, gapIdx) {
  try {
    barrierDropped = true;
    if (gapIdx !== undefined) {
      barrierGapIndex = gapIdx;
    } else {
      barrierGapIndex = 0;
    }
    if (barrier_block) {
      barrier_block.classList.add('dropped');
    }
    if (resp_time) {
      resp_time.innerText = simTime.toFixed(2) + 's\n' + triggerType;
    }
  } catch (err) {
    console.error("Physical safety barrier animation deploy crashed:", err);
  }
}

// Inherits selection properties from Step 1 test run
function updateInheritedValues() {
  try {
    var inheritedMaterialName = document.getElementById('inherited-material-name');
    var inheritedSpecificHeat = document.getElementById('inherited-specific-heat');
    if (inheritedMaterialName) {
      inheritedMaterialName.innerText = barrierMaterial;
    }
    if (inheritedSpecificHeat) {
      inheritedSpecificHeat.innerText  = specificHeat + ' J/kg°C';
    }
  } catch (err) {
    console.error("Barrier parameter displays updates error:", err);
  }
}

// Clear statistics log
function clearStatsData() {
  try {
    cellTemps = [initialTemp, initialTemp, initialTemp];
    maxCellTemps = [initialTemp, initialTemp, initialTemp];
    peakTemp = initialTemp;
    damagedCells.clear();
    totalDamaged = 0;
    firstBreachTime = null;
    fullCoolTime = null;
    failedCells.clear();
    
    if (btn_deploy) btn_deploy.style.display = 'none';
    if (peak_temp) peak_temp.innerText = initialTemp + '°C';
    if (dmg_count) dmg_count.innerText = '0';
    totalHeatJ = 0;
    
    if (live_eqs) {
      live_eqs.innerHTML = '<div style="font-weight: bold; font-size: 1.1rem; color: #2c3e50; margin-bottom: 5px;">Formula: Q = m * c * ΔT</div><div>Live: Q<sub>gen</sub> = (Mass: ' + cellMass + 'kg) * (c: ' + cellSpecificHeat + ') * (ΔT: +0.0°C) = 0 J</div><div style="margin-top: 3px; color: #555;">Time Elapsed: 0.0s | Total Energy Released: 0.00 kJ</div>';
    }
    if (live_temps) {
      live_temps.innerText = 'Cell 1: ' + initialTemp.toFixed(1) + '°C   |   Cell 2: ' + initialTemp.toFixed(1) + '°C   |   Cell 3: ' + initialTemp.toFixed(1) + '°C';
    }
    if (live_dmg) {
      live_dmg.innerText = '';
      live_dmg.style.display = 'none';
    }
    
    toastShown = false;
    var warningToast = document.getElementById('warn-popup-m302');
    if (warningToast) {
      warningToast.style.display = 'none';
      warningToast.classList.remove('toast-shake-animation');
    }
    var eventLogText = document.getElementById('system-event-log');
    if (eventLogText) {
      eventLogText.innerText = 'System initialized. Awaiting fault trigger...';
    }
    updateCellsUi();
  } catch (err) {
    console.error("Stats reset sequence failed:", err);
  }
}

// Reset simulation states
function resetSimulation() {
  try {
    clearInterval(simIntervalId);
    simActive         = false;
    barrierDropped    = false;
    barrierBtnVisible = false;
    if (btn_fault) btn_fault.disabled = false;
    
    if (barrier_block) barrier_block.classList.remove('dropped');
    if (arr_1) arr_1.style.opacity = 0;
    if (arr_2) arr_2.style.opacity = 0;
    if (resp_time) resp_time.innerText = '-';
    if (btn_deploy) btn_deploy.style.display = 'none';
    
    barrierGapIndex = 0;
    var gap1Box = document.getElementById('gap-block-1');
    if (gap1Box && barrier_block) {
      gap1Box.appendChild(barrier_block);
    }
    
    if (in_temp) in_temp.value = 35;
    if (in_cool) in_cool.value = 50;
    if (in_dur) in_dur.value = 7;
    if (in_mass) in_mass.value = 0.5;
    if (chk_auto) chk_auto.checked = true;
    
    if (lbl_temp) lbl_temp.innerText = '35°C';
    if (lbl_cool) lbl_cool.innerText = '50%';
    if (lbl_dur) lbl_dur.innerText = '7s';
    if (lbl_mass) lbl_mass.innerText = '0.5 kg';
    
    initialTemp       = 35;
    coolingRate       = 50;
    faultDuration     = 7;
    cellMass          = 0.5;
    cellSpecificHeat  = specificHeat;
    thermalCapacity   = cellMass * cellSpecificHeat;
    
    clearStatsData();
  } catch (err) {
    console.error("Full simulation reset sequence crashed:", err);
  }
}

// Initial script execution
try {
  clearStatsData();
} catch (loadErr) {
  console.error("Failed to run initialization script sequence:", loadErr);
}

// Student report details modal trigger
function showLabInfo() {
  var text = "Virtual Heat Transfer Laboratory\n" +
             "Course: MECH 302\n" +
             "Experiment: Thermal Runaway Propagation & Emergency Battery Isolation\n" +
             "Status: Simulation Active\n" +
             "Version: 1.0.4 (Production)";
  alert(text);
}
