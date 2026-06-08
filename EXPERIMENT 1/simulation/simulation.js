document.addEventListener('DOMContentLoaded', function() {

// GLOBAL VARIABLES FROM MILESTONE 1
let chosenBarrierConductivity = 0.015;     // Thermal conductivity (k). Default is Aerogel.
let chosenBarrierName         = 'Aerogel'; // The name of the material.
let chosenBarrierSpecificHeat = 700;       // Specific heat capacity (c). Default is Aerogel.

// MILESTONE NAVIGATION

function switchMilestone(milestoneNumber) {
  let milestone1Page = document.getElementById('milestone-1');
  let milestone2Page = document.getElementById('milestone-2');
  
  if (milestoneNumber === 1) {
    milestone1Page.style.display = 'block';
    milestone2Page.style.display = 'none';
  } else if (milestoneNumber === 2) {
    milestone1Page.style.display = 'none';
    milestone2Page.style.display = 'block';
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 'Proceed' Button in Milestone 1
let finalMaterialSelect = document.getElementById('ms1-final-select');
let proceedButton       = document.getElementById('ms1-continue');

finalMaterialSelect.addEventListener('change', function() {
  proceedButton.disabled = false;
});

// When the 'Proceed' button is clicked, save the material properties and go to Milestone 2!
proceedButton.addEventListener('click', function() {
  // 1. Analyse which option the user selected in the dropdown
  let selectedOption = finalMaterialSelect.options[finalMaterialSelect.selectedIndex];
  
  // 2. Save the properties of that material
  chosenBarrierConductivity = parseFloat(selectedOption.value);
  chosenBarrierName         = selectedOption.getAttribute('data-name');
  chosenBarrierSpecificHeat = parseFloat(selectedOption.getAttribute('data-c'));
  
  // 3. Update the UI in Milestone 2 to show selected material properties
  updateInheritedDisplay();
  
  // 4. Reset the simulation completely so it starts fresh with the new material
  resetSimulation();
  
  // 5. Show the Milestone 2 screen
  switchMilestone(2);
});

// Back Button from Milestone 2 to Milestone 1
let backToMs1Button = document.getElementById('btn-back-ms1');
if (backToMs1Button) {
  backToMs1Button.addEventListener('click', function() {
    resetSimulation();
    switchMilestone(1);
  });
}


// MILESTONE 1 — Thermal Conductivity (k) Explorer
let isTestRunning   = false;
let testTimer       = 0;
let normalCellTemp  = 25;
let testInterval    = null;

// Find all the HTML elements we need for the Testing Rig
const materialDropdown     = document.getElementById('ms1-mat-select');
const runTestButton        = document.getElementById('ms1-run-test-btn');
const normalCellDisplay    = document.getElementById('ms1-rig-cool-cell');
const normalCellTempText   = document.getElementById('ms1-cool-temp');
const testTimeResult       = document.getElementById('ms1-test-time');
const testVerdictResult    = document.getElementById('ms1-test-verdict');
const heatTransferArrows   = document.getElementById('ms1-rig-arrows');

// Color change in cell based on Temperature
function getCellColorBasedOnTemperature(temperature) {
  if (temperature <= 25) {
    return '#add8e6'; // Light Blue for cool
  }
  if (temperature >= 80) {
    return '#dc3545'; // Red for critical danger!
  }
  
  // Calculate the ratio between 25 and 80 degrees
  let ratio = (temperature - 25) / 55;
  
  // Blend from Light Blue to Red based on the ratio
  let red   = Math.round(173 + (220 - 173) * ratio);
  let green = Math.round(216 + (53 - 216) * ratio);
  let blue  = Math.round(230 + (69 - 230) * ratio);
  
  return 'rgb(' + red + ',' + green + ',' + blue + ')';
}

// Resets the material test back to its starting conditions
function resetMaterialTest() {
  clearInterval(testInterval); 
  isTestRunning = false;
  testTimer = 0;
  normalCellTemp = 25;
  
  // Reset the text displays
  normalCellTempText.innerText = '25.0\u00B0C';
  testTimeResult.innerText = '-- s';
  testVerdictResult.innerText  = '--';
  
  // Reset the colors and arrows
  testVerdictResult.className  = 'ms1-res-value ms1-res-sm';
  normalCellDisplay.style.backgroundColor = getCellColorBasedOnTemperature(25);
  runTestButton.innerText = 'Run Thermal Test';
  runTestButton.disabled  = false;
  heatTransferArrows.style.opacity = 0;
}

// If the user changes the dropdown while a test is running, stop and reset it!
materialDropdown.addEventListener('change', resetMaterialTest);

// Action of "Run THermal Test" button
runTestButton.addEventListener('click', function() {
  // If it's already running, stop it.
  if (isTestRunning) { 
    resetMaterialTest(); 
    return; 
  }
  
  // Start fresh
  resetMaterialTest();
  isTestRunning = true;
  runTestButton.innerText = 'Stop Test';
  heatTransferArrows.style.opacity = 1; // Show the heat arrows moving!
  
  // Get the Thermal Conductivity (k) of the material chosen
  var thermalConductivity = parseFloat(materialDropdown.value);
  
  // Start a loop that runs every 50 milliseconds to simulate time passing
  testInterval = setInterval(function() {
    testTimer += 0.05; // Add 0.05 seconds to our clock
    
    // THE PHYSICS FORMULA: Fourier's Law of Heat Conduction
    // Heat Transfer Rate depends on conductivity (k) and the temperature difference.
    // The hot cell is stuck at 120 degrees, so the difference is (120 - normalCellTemp)
    var tempDifference = 120 - normalCellTemp;
    var tempIncrease = thermalConductivity * 0.0002 * tempDifference;
    
    normalCellTemp += tempIncrease;
    
    // Update the visuals
    normalCellTempText.innerText = normalCellTemp.toFixed(1) + '\u00B0C';
    normalCellDisplay.style.backgroundColor = getCellColorBasedOnTemperature(normalCellTemp);
    
    // Check if the normal cell has reached the critical temperature of 80 degrees
    if (normalCellTemp >= 80) {
      clearInterval(testInterval); // Stop the test
      isTestRunning = false;
      runTestButton.innerText = 'Reset Test';
      heatTransferArrows.style.opacity = 0;
      
      // Update results to show failure
      testTimeResult.innerText = testTimer.toFixed(1) + ' s';
      testVerdictResult.innerText  = 'FAILED\nHeats up too fast';
      testVerdictResult.style.color = '#dc3545'; 
    } 
    // Check if the normal cell survived without reaching 80 degrees for at least 10 seconds
    else if (testTimer >= 10.0) {
      clearInterval(testInterval); // Stop the test
      isTestRunning = false;
      runTestButton.innerText = 'Reset Test';
      heatTransferArrows.style.opacity = 0;
      
      // Update results to show success!
      testTimeResult.innerText = '> 10.0 s';
      testVerdictResult.innerText  = 'SAFE\nGood Insulator';
      testVerdictResult.style.color = '#2f5d50'; 
    }
  }, 50); // 50 milliseconds interval
});


// MILESTONE 2 — Thermal Runaway Simulation

// --- Control Panel inputs ---
var inputInitialTemp = document.getElementById('inp-init-temp');
var inputCooling     = document.getElementById('inp-cooling');
var inputDuration    = document.getElementById('inp-duration');
var inputAutoIso     = document.getElementById('inp-auto-iso');
var inputMass        = document.getElementById('inp-mass');

// Labels that show the values next to the sliders
var labelInitialTemp = document.getElementById('lbl-init-temp');
var labelCooling     = document.getElementById('lbl-cooling');
var labelDuration    = document.getElementById('lbl-duration');
var labelMass        = document.getElementById('lbl-mass');

// Buttons in control panel
var buttonTrigger = document.getElementById('btn-trigger');
var buttonDeploy  = document.getElementById('btn-deploy');
var buttonReset   = document.getElementById('btn-reset');

// Visual Elements of the Battery Pack 
var batteryCells = [
  document.getElementById('c1'), // Cell 1
  document.getElementById('c2'), // Cell 2
  document.getElementById('c3')  // Cell 3
];
var redArrow1 = document.getElementById('arrow-1'); // Heat flowing from Cell 1 -> 2
var redArrow2 = document.getElementById('arrow-2'); // Heat flowing from Cell 2 -> 3
var isolationBarrierBox = document.getElementById('barrier');

// Output text displays
var outputLiveCalculation = document.getElementById('out-live-calc');
var outputLiveTemperatures = document.getElementById('out-live-temps');
var outputLiveDamagedWarning = document.getElementById('out-live-damaged');

var outputPeakTemp   = document.getElementById('out-peak');
var outputResponseTime = document.getElementById('out-response');
var outputDamagedCount = document.getElementById('out-damaged');

var buttonHistoryModal = document.getElementById('btn-history');
var historyModalBox    = document.getElementById('history-modal');
var buttonCloseHistory = document.getElementById('close-history');
var historyCountText   = document.getElementById('hist-count');
var historyBreachText  = document.getElementById('hist-breach');
var historyCoolingText = document.getElementById('hist-cooling');

// Core State Variables

var currentInitialTemp = 35;
var currentCoolingEff  = 50;
var currentFaultDuration = 7; // How long the short-circuit lasts in seconds
var currentCellMass    = 0.5; // Mass of the battery cell in kg
var currentCellSpecificHeat = 900; // Dynamic based on material choice
var currentThermalCapacity  = currentCellMass * currentCellSpecificHeat; // m * c

var currentCellTemperatures = [25, 25, 25]; // Starts at room temp
var peakCellTemperatures    = [25, 25, 25]; // Keeps track of the highest temp each cell reached

// Physics Constants
var TICK_RATE_MS = 50;  // The simulation updates every 50 milliseconds
var TIME_STEP    = 0.05; // 50ms is 0.05 seconds
var CRITICAL_TEMPERATURE = 80; // The threshold where thermal runaway begins

var isMainSimActive      = false;
var hasBarrierDropped    = false;
var activeFaultTimer     = 0;
var mainSimInterval      = null;
var highestTempReached   = 25;

var damagedCellsSet      = new Set(); // Stores which cells are destroyed
var totalDamagedCells    = 0;
var timeOfFirstBreach    = null;
var timeOfFullCooling    = null;
var completelyBurntOutCells = new Set(); // Cells that hit 120 degrees and died

var currentlyDeployedGapIndex = 0; // After which cell did the barrier fall? 0 = gap 1, 1 = gap 2.
var didBarrierButtonAppear    = false;
var totalHeatEnergyGenerated  = 0; // Keeping track of Joules
var didShowConductorWarning = false; 

// --- Record User Input on the Sliders ---

inputInitialTemp.addEventListener('input', function(event) {
  // If simulation is running, slider changes should not be made
  if (isMainSimActive) { 
    event.target.value = currentInitialTemp; 
    return; 
  }
  currentInitialTemp = parseInt(event.target.value);
  labelInitialTemp.innerText = currentInitialTemp + '\u00B0C';
  recalculateStartingMath(); // Reset the math
});

inputMass.addEventListener('input', function(event) {
  if (isMainSimActive) { 
    event.target.value = currentCellMass; 
    return; 
  }
  currentCellMass = parseFloat(event.target.value);
  labelMass.innerText = currentCellMass.toFixed(1) + ' kg';
  // If mass changes, specific heat also changes
  currentThermalCapacity = currentCellMass * currentCellSpecificHeat;
  recalculateStartingMath();
});

inputCooling.addEventListener('input', function(event) {
  if (isMainSimActive) { 
    event.target.value = currentCoolingEff; 
    return; 
  }
  currentCoolingEff = parseInt(event.target.value);
  labelCooling.innerText = currentCoolingEff + '%';
  recalculateStartingMath();
});

inputDuration.addEventListener('input', function(event) {
  if (isMainSimActive) { 
    event.target.value = currentFaultDuration; 
    return; 
  }
  currentFaultDuration = parseInt(event.target.value);
  labelDuration.innerText = currentFaultDuration + 's';
  recalculateStartingMath();
});

// --- Button Controls for the Simulation ---

// Trigger Fault: Start Simulation
buttonTrigger.addEventListener('click', function() {
  if (isMainSimActive) return; // Do nothing if already running
  
  isMainSimActive = true;
  buttonTrigger.disabled = true; // Prevent double-clicking
  activeFaultTimer = 0;
  outputResponseTime.innerText = '-';
  mainSimInterval = setInterval(runPhysicsTick, TICK_RATE_MS);
});

// Manual Barrier Deployment
buttonDeploy.addEventListener('click', function() {
  if (hasBarrierDropped) return; // Can only drop it once!
  
  // Find out which gap to drop it into to protect the remaining safe cells
  var indexOfLastDangerousCell = -1;
  for (var i = 0; i < 3; i++) {
    if (currentCellTemperatures[i] >= 80 || completelyBurntOutCells.has(i)) {
      indexOfLastDangerousCell = i;
    }
  }
  
  var targetGapIndex = indexOfLastDangerousCell === -1 ? 0 : indexOfLastDangerousCell;
  
  // Move the barrier box to the correct gap in the HTML
  var targetGapBox;
  if (targetGapIndex === 0) {
    targetGapBox = document.getElementById('gap-1');
  } else if (targetGapIndex === 1) {
    targetGapBox = document.getElementById('gap-2');
  } else {
    targetGapBox = document.getElementById('gap-3');
  }
  
  targetGapBox.appendChild(isolationBarrierBox);
  
  // Drop
  triggerBarrierDrop('Manual Intervention', targetGapIndex);
  buttonDeploy.style.display = 'none'; // Hide the button now that it's used
});

// Reset Button
buttonReset.addEventListener('click', function() {
  resetSimulation();
});

// History Modal Logic
if (buttonHistoryModal) {
  buttonHistoryModal.addEventListener('click', function() {
    historyCountText.innerText  = totalDamagedCells;
    
    if (timeOfFirstBreach !== null) {
      historyBreachText.innerText = timeOfFirstBreach.toFixed(2) + 's';
    } else {
      historyBreachText.innerText = 'N/A';
    }
    
    if (timeOfFirstBreach !== null && timeOfFullCooling !== null) {
      historyCoolingText.innerText = (timeOfFullCooling - timeOfFirstBreach).toFixed(2) + 's';
    } else if (timeOfFirstBreach !== null) {
      historyCoolingText.innerText = 'Still cooling / unresolved';
    } else {
      historyCoolingText.innerText = 'N/A';
    }
    historyModalBox.style.display = 'flex';
  });
  
  buttonCloseHistory.addEventListener('click', function() { 
    historyModalBox.style.display = 'none'; 
  });
}

// Close button in history modal
var closeWarningToast = document.getElementById('close-warning-toast');
if (closeWarningToast) {
  closeWarningToast.addEventListener('click', function() {
    var warningToast = document.getElementById('barrier-warning-toast');
    if (warningToast) {
      warningToast.style.display = 'none';
    }
  });
}

// ---Color Management for Cells ---

// Colors with 70% opacity
var COLOR_HEAT_LOW  = [225, 173, 1,   0.70]; // Yellow
var COLOR_HEAT_MID  = [255, 165, 0,   0.70]; // Orange
var COLOR_HEAT_HIGH = [204, 119, 34,  0.70]; // Red/Orange

var COLOR_COOL_HIGH = [4,   146, 194, 0.70]; // Deep blue
var COLOR_COOL_MID  = [82,  178, 191, 0.70]; // Medium blue
var COLOR_COOL_LOW  = [130, 238, 253, 0.70]; // Light cyan

// Conversion an array into a CSS string
function convertToCssRgba(colorArray) { 
  return 'rgba(' + colorArray[0] + ', ' + colorArray[1] + ', ' + colorArray[2] + ', ' + colorArray[3].toFixed(2) + ')'; 
}

// Extraction an array from a CSS string
function parseCssRgba(cssString) {
  var parts = cssString.match(/[\d.]+/g);
  return [parseFloat(parts[0]), parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])];
}

// Blends two colors together based on a ratio between 0.0 and 1.0
function mixColors(color1, color2, ratio) {
  var red   = Math.round(color1[0] + (color2[0] - color1[0]) * ratio);
  var green = Math.round(color1[1] + (color2[1] - color1[1]) * ratio);
  var blue  = Math.round(color1[2] + (color2[2] - color1[2]) * ratio);
  var alpha = (color1[3] + (color2[3] - color1[3]) * ratio).toFixed(2);
  return 'rgba(' + red + ', ' + green + ', ' + blue + ', ' + alpha + ')';
}

// Get the glowing red/orange color as it heats up
function calculateHeatingColor(temperature) {
  var heatDegrees = temperature - 25;
  if (heatDegrees <= 0) return convertToCssRgba(COLOR_HEAT_LOW);
  if (heatDegrees < 55) {
    return mixColors(COLOR_HEAT_LOW, COLOR_HEAT_MID, heatDegrees / 55);
  }
  return mixColors(COLOR_HEAT_MID, COLOR_HEAT_HIGH, Math.min(1, (heatDegrees - 55) / 40));
}

// Get the final cell color, turning blue if it is successfully cooling down
function determineFinalCellColor(currentTemp, cellIndex) {
  var hottestColor = calculateHeatingColor(peakCellTemperatures[cellIndex]);
  var dropInTemp   = peakCellTemperatures[cellIndex] - currentTemp;
  
  // If it hasn't cooled down significantly, or the barrier hasn't dropped, stay in hot color
  if (dropInTemp <= 0.1 || !hasBarrierDropped) {
    return hottestColor;
  }
  
  // If not, start turning blue based on how much it has cooled
  var hotColorArray = parseCssRgba(hottestColor);
  if (dropInTemp < 25) {
    return mixColors(hotColorArray, COLOR_COOL_HIGH, dropInTemp / 25);
  }
  if (dropInTemp < 60) {
    return mixColors(COLOR_COOL_HIGH, COLOR_COOL_MID, (dropInTemp - 25) / 35);
  }
  return mixColors(COLOR_COOL_MID, COLOR_COOL_LOW, Math.min(1, (dropInTemp - 60) / 40));
}

// Updates the metrics panel tracking peak temperatures and damage
function updateTelemetryDashboard() {
  var maximumTempRightNow = Math.max(currentCellTemperatures[0], currentCellTemperatures[1], currentCellTemperatures[2]);
  
  if (maximumTempRightNow > highestTempReached) {
    highestTempReached = maximumTempRightNow;
    outputPeakTemp.innerText = Math.round(highestTempReached) + '\u00B0C';
  }
  
  var didNewCellTakeDamage = false;
  
  for (var i = 0; i < currentCellTemperatures.length; i++) {
    // If a cell hits 120 degrees, it is structurally damaged permanently
    if (currentCellTemperatures[i] >= 120 && !damagedCellsSet.has(i)) { 
      damagedCellsSet.add(i); 
      didNewCellTakeDamage = true; 
    }
  }
  
  // Record the exact time the first cell was damaged
  if (didNewCellTakeDamage && timeOfFirstBreach === null) {
    timeOfFirstBreach = activeFaultTimer;
  }
  
  // Check if everything has safely cooled down
  var allCellsCooled = true;
  for (var i = 0; i < currentCellTemperatures.length; i++) {
    var temp = currentCellTemperatures[i];
    if (!completelyBurntOutCells.has(i) && temp > currentInitialTemp + 2) {
      allCellsCooled = false; // There is still a hot, alive cell
    }
  }

  if (allCellsCooled && timeOfFirstBreach !== null && timeOfFullCooling === null && hasBarrierDropped) {
    timeOfFullCooling = activeFaultTimer;
  }
  
  totalDamagedCells = damagedCellsSet.size;
  outputDamagedCount.innerText = totalDamagedCells;
}

// Renders the colors and numbers onto the screen
function updateVisualInterface() {
  for (var i = 0; i < 3; i++) {
    // Keep track of the peak temperature
    if (currentCellTemperatures[i] > peakCellTemperatures[i]) {
      peakCellTemperatures[i] = currentCellTemperatures[i];
    }
    
    if (completelyBurntOutCells.has(i)) {
      batteryCells[i].style.backgroundColor = 'rgba(15,15,15,0.95)'; // Burnt black
      batteryCells[i].innerHTML = '<div class="temp-display damaged-cell-text">Damaged<br>Cell</div>';
    } else {
      // Normal updating cell
      batteryCells[i].innerHTML = '<div class="temp-display"><span id="t' + (i+1) + '-val">' + Math.round(currentCellTemperatures[i]) + '</span>\u00B0C</div>';
      batteryCells[i].style.backgroundColor = determineFinalCellColor(currentCellTemperatures[i], i);
    }
  }
  updateTelemetryDashboard();
}

// ---The Core Physics Engine ---
// Calculating the flow of heat,recurrsion .

function runPhysicsTick() {
  activeFaultTimer += TIME_STEP; // Time moves forward by 0.05 seconds
  
  // Get the current temperatures of all three cells
  var tempCell1 = currentCellTemperatures[0];
  var tempCell2 = currentCellTemperatures[1];
  var tempCell3 = currentCellTemperatures[2];
  
  var powerGenerated = 0; // The energy (Q) being generated by the fault
  var temperatureRise = 0; // How much the temperature increases this tick

  // Check if any cells have just burnt out completely
  for (var i = 0; i < currentCellTemperatures.length; i++) {
    if (currentCellTemperatures[i] >= 120) {
      completelyBurntOutCells.add(i);
    }
  }

  // Calculate cooling inefficiency (lower efficiency means more heat is trapped)
  var inefficiencyRatio = (100 - currentCoolingEff) / 100;
  
  // Calculate Power Generation (baseQ). 
  var conductivityMultiplier = 1 + (chosenBarrierConductivity * 0.005);
  powerGenerated = 15000 * (currentCellMass / 0.5) * conductivityMultiplier * Math.pow(inefficiencyRatio, 1.5);
  
  // THERMAL RUNAWAY CORE FORMULA
  temperatureRise = (powerGenerated / currentThermalCapacity) * TIME_STEP;

  var NORMAL_CONDUCTION = 0.012; 
  
  // Check where the barrier is to determine if it is blocking heat
  var isBarrierBlockingGap1 = hasBarrierDropped && (currentlyDeployedGapIndex === 0);
  var isBarrierBlockingGap2 = hasBarrierDropped && (currentlyDeployedGapIndex <= 1);

  // CELL 1: The Fault Source
  if (!completelyBurntOutCells.has(0)) {
    if ((activeFaultTimer <= currentFaultDuration) || (tempCell1 >= CRITICAL_TEMPERATURE)) {
      tempCell1 += temperatureRise;
      totalHeatEnergyGenerated += powerGenerated * TIME_STEP;
    }
  }
  
  // CELL 2: Heat Propagation
  var conductionRate1to2 = isBarrierBlockingGap1 ? (chosenBarrierConductivity * 0.002) : NORMAL_CONDUCTION;
  
  tempCell2 += conductionRate1to2 * (tempCell1 - tempCell2); // Heat flows from Cell 1 to Cell 2
  if (tempCell2 >= CRITICAL_TEMPERATURE && !completelyBurntOutCells.has(1)) {
    tempCell2 += temperatureRise; 
    totalHeatEnergyGenerated += powerGenerated * TIME_STEP;
  }

  // CELL 3: Heat Propagation
  var conductionRate2to3 = isBarrierBlockingGap2 ? (chosenBarrierConductivity * 0.002) : NORMAL_CONDUCTION;
  
  tempCell3 += conductionRate2to3 * (tempCell2 - tempCell3); // Heat flows from Cell 2 to Cell 3
  if (tempCell3 >= CRITICAL_TEMPERATURE && !completelyBurntOutCells.has(2)) {
    tempCell3 += temperatureRise;
    totalHeatEnergyGenerated += powerGenerated * TIME_STEP;
  }

  // Show the red warning when heat is propagated but the barrier hasn't dropped yet
  redArrow1.style.opacity = (tempCell1 >= CRITICAL_TEMPERATURE && !hasBarrierDropped) ? 1 : 0;
  redArrow2.style.opacity = (tempCell2 >= CRITICAL_TEMPERATURE && !hasBarrierDropped) ? 1 : 0;

  // Update the Live Calculation panel
  var totalDeltaTSoFar = Math.max(0, tempCell1 - currentInitialTemp);
  var totalEnergyQ     = currentCellMass * currentCellSpecificHeat * totalDeltaTSoFar;
  
  outputLiveCalculation.innerHTML = 'Live: Q<sub>gen</sub> = (Mass: ' + currentCellMass + 'kg) &times; (c: ' + currentCellSpecificHeat + ') &times; (&Delta;T: +' + totalDeltaTSoFar.toFixed(1) + '&deg;C) = ' + Math.round(totalEnergyQ) + ' J &nbsp;|&nbsp; Time Elapsed: ' + activeFaultTimer.toFixed(1) + 's &nbsp;|&nbsp; Total Energy Released: ' + (totalHeatEnergyGenerated / 1000).toFixed(2) + ' kJ';
  
  outputLiveTemperatures.innerText = 'Cell 1: ' + tempCell1.toFixed(1) + '\u00B0C   |   Cell 2: ' + tempCell2.toFixed(1) + '\u00B0C   |   Cell 3: ' + tempCell3.toFixed(1) + '\u00B0C';

  // Update the warning banner for damaged cells
  if (completelyBurntOutCells.size > 0) {
    var warningList = [];
    completelyBurntOutCells.forEach(function(cellIndex) {
      warningList.push('Cell ' + (cellIndex+1) + ': ' + Math.round(peakCellTemperatures[cellIndex]) + '\u00B0C (damaged)');
    });
    outputLiveDamagedWarning.innerText = 'Damaged: ' + warningList.join('   |   ');
    outputLiveDamagedWarning.style.display = 'block';
  } else {
    outputLiveDamagedWarning.innerText = '';
    outputLiveDamagedWarning.style.display = 'none';
  }

  // Auto-Deploy the barrier if the system detects runaway
  var currentHottestTemp = Math.max(tempCell1, tempCell2, tempCell3);
  if (currentHottestTemp >= CRITICAL_TEMPERATURE && !hasBarrierDropped && !didBarrierButtonAppear && inputAutoIso.checked) {
    didBarrierButtonAppear = true;
    buttonDeploy.style.display = 'block'; // Make the big red deploy button visible!
  }

  // Apply the active cooling system to all cells (even burnt-out husks cool down eventually)
  var baselineCoolingSpeed = (currentCoolingEff / 100) * 0.9;
  var finalCoolingSpeed = baselineCoolingSpeed * (1 + chosenBarrierConductivity * 0.05);
  
  var isGoodConductor = (chosenBarrierName === 'Aluminum' || chosenBarrierName === 'Steel');
  var isCoolingActive = (hasBarrierDropped && !isGoodConductor) || 
                        (activeFaultTimer > currentFaultDuration && Math.max(tempCell1, tempCell2, tempCell3) < CRITICAL_TEMPERATURE);
  
  if (isCoolingActive) {
    var coolingRateToUse = hasBarrierDropped ? finalCoolingSpeed : baselineCoolingSpeed;
    // Cool down Cell 1
    if (tempCell1 > currentInitialTemp) {
      tempCell1 -= (tempCell1 - currentInitialTemp) * coolingRateToUse * TIME_STEP;
      if (tempCell1 <= currentInitialTemp + 0.5) tempCell1 = currentInitialTemp;
    }
    // Cool down Cell 2
    if (tempCell2 > currentInitialTemp) {
      tempCell2 -= (tempCell2 - currentInitialTemp) * coolingRateToUse * TIME_STEP;
      if (tempCell2 <= currentInitialTemp + 0.5) tempCell2 = currentInitialTemp;
    }
    // Cool down Cell 3
    if (tempCell3 > currentInitialTemp) {
      tempCell3 -= (tempCell3 - currentInitialTemp) * coolingRateToUse * TIME_STEP;
      if (tempCell3 <= currentInitialTemp + 0.5) tempCell3 = currentInitialTemp;
    }
  }

  // Update the barrier conductivity warning popup at the top
  if (hasBarrierDropped && isGoodConductor) {
    if (!didShowConductorWarning) {
      didShowConductorWarning = true;
      var warningToast = document.getElementById('barrier-warning-toast');
      var warnBarrierName = document.getElementById('warn-barrier-name');
      if (warningToast && warnBarrierName) {
        warnBarrierName.innerText = chosenBarrierName;
        warningToast.style.display = 'block';
      }
    }
  }

  // Log messages to the Dynamic box to tell the student what is happening at the end of the webpage
  var eventLogText = document.getElementById('event-log-text');
  if (eventLogText) {
    if (completelyBurntOutCells.size > 0) {
      eventLogText.innerText = '[ALERT] Unmitigated runaway has compromised cell structural integrity. Carbonization state triggered...';
    } else if (hasBarrierDropped) {
      if (isGoodConductor) {
        eventLogText.innerText = '[WARNING] Conductive barrier (' + chosenBarrierName + ') inserted at gap ' + (currentlyDeployedGapIndex + 1) + '. Heat bridge created! Runaway propagation continuing...';
      } else {
        eventLogText.innerText = '[CONTAINMENT DETECTED] Isolation barrier inserted at gap ' + (currentlyDeployedGapIndex + 1) + '. Conduction pathway severed. Cooling circulation engaged...';
      }
    } else if (tempCell1 >= CRITICAL_TEMPERATURE) {
      eventLogText.innerText = '[CRITICAL ALERT] Cell 1 temperature has exceeded safety bounds. Containment systems primed...';
    } else if (activeFaultTimer <= currentFaultDuration && tempCell1 > currentInitialTemp) {
      eventLogText.innerText = 'Cell 1 experiencing internal localized short-circuit. Rapid thermal generation Q_gen building up...';
    } else {
      eventLogText.innerText = 'System stable. Monitoring thermal levels...';
    }
  }

  // Save the new temperatures back to our array
  currentCellTemperatures = [Math.max(currentInitialTemp, tempCell1), Math.max(currentInitialTemp, tempCell2), Math.max(currentInitialTemp, tempCell3)];
  
  // Design the new UI
  updateVisualInterface();

  // Determine if the simulation is over
  var areAllCellsDestroyed = (completelyBurntOutCells.size === 3);
  
  var areAllSurvivingCellsCooled = true;
  for (var i = 0; i < 3; i++) {
    var isBurnt = completelyBurntOutCells.has(i);
    var isCooled = currentCellTemperatures[i] <= currentInitialTemp + 2;
    if (!isBurnt && !isCooled) {
      areAllSurvivingCellsCooled = false; // Found a cell that is still hot
    }
  }

  // Check if the fault has run its course and the remaining cells are cooled down completely
  var isFaultOverAndSafe = (activeFaultTimer > currentFaultDuration) && areAllSurvivingCellsCooled;

  // If everything is completely dead, or everything is safe and cool, end the simulation
  if (areAllCellsDestroyed || isFaultOverAndSafe) {
    clearInterval(mainSimInterval);
    isMainSimActive      = false;
    didBarrierButtonAppear = false;
    buttonTrigger.disabled   = false;
    buttonDeploy.style.display = 'none';
  }
}

// Drops the physical barrier between the cells
function triggerBarrierDrop(reason, gapIndexToDropInto) {
  hasBarrierDropped = true;
  
  // Default to Gap 1
  if (gapIndexToDropInto !== undefined) {
    currentlyDeployedGapIndex = gapIndexToDropInto;
  } else {
    currentlyDeployedGapIndex = 0;
  }
  
  // Add the CSS animation class
  isolationBarrierBox.classList.add('dropped');
  
  // Record response time
  outputResponseTime.innerText = activeFaultTimer.toFixed(2) + 's\n(' + reason + ')';
}

// Updates the small text at the top of the control panel about what we chose in Milestone 1
function updateInheritedDisplay() {
  var inheritedMaterialName = document.getElementById('inh-mat');
  var inheritedSpecificHeat = document.getElementById('inh-c');
  
  if (inheritedMaterialName) {
    inheritedMaterialName.innerText = chosenBarrierName;
  }
  if (inheritedSpecificHeat) {
    inheritedSpecificHeat.innerText  = chosenBarrierSpecificHeat + ' J/kg\u00B0C';
  }
}

// Clears all math and arrays back to 0
function recalculateStartingMath() {
  currentCellTemperatures = [currentInitialTemp, currentInitialTemp, currentInitialTemp];
  peakCellTemperatures    = [currentInitialTemp, currentInitialTemp, currentInitialTemp];
  highestTempReached      = currentInitialTemp;
  
  damagedCellsSet.clear();
  totalDamagedCells = 0;
  timeOfFirstBreach = null;
  timeOfFullCooling = null;
  completelyBurntOutCells.clear();
  
  buttonDeploy.style.display = 'none';
  outputPeakTemp.innerText   = currentInitialTemp + '\u00B0C';
  outputDamagedCount.innerText = '0';
  totalHeatEnergyGenerated = 0;
  
  outputLiveCalculation.innerHTML = 'Live: Q<sub>gen</sub> = (Mass: ' + currentCellMass + 'kg) &times; (c: ' + currentCellSpecificHeat + ') &times; (&Delta;T: +0.0&deg;C) = 0 J &nbsp;|&nbsp; Time Elapsed: 0.0s &nbsp;|&nbsp; Total Energy Released: 0.00 kJ';
  outputLiveTemperatures.innerText  = 'Cell 1: ' + currentInitialTemp.toFixed(1) + '\u00B0C   |   Cell 2: ' + currentInitialTemp.toFixed(1) + '\u00B0C   |   Cell 3: ' + currentInitialTemp.toFixed(1) + '\u00B0C';
  
  outputLiveDamagedWarning.innerText = '';
  outputLiveDamagedWarning.style.display = 'none';
  
  didShowConductorWarning = false;
  var warningToast = document.getElementById('barrier-warning-toast');
  if (warningToast) {
    warningToast.style.display = 'none';
  }
  
  var eventLogText = document.getElementById('event-log-text');
  if (eventLogText) {
    eventLogText.innerText = 'System initialized. Awaiting fault trigger...';
  }
  
  updateVisualInterface();
}

// Completely resets the UI sliders and the math to their default states
function resetSimulation() {
  clearInterval(mainSimInterval);
  isMainSimActive         = false;
  hasBarrierDropped       = false;
  didBarrierButtonAppear  = false;
  buttonTrigger.disabled  = false;
  
  isolationBarrierBox.classList.remove('dropped');
  redArrow1.style.opacity  = 0;
  redArrow2.style.opacity  = 0;
  outputResponseTime.innerText = '-';
  buttonDeploy.style.display = 'none';
  
  currentlyDeployedGapIndex = 0;
  document.getElementById('gap-1').appendChild(isolationBarrierBox);

  // Reset the UI Sliders
  inputInitialTemp.value  = 35;
  inputCooling.value      = 50;
  inputDuration.value     = 7;
  inputMass.value         = 0.5;
  inputAutoIso.checked    = true;

  // Reset the Slider Labels
  labelInitialTemp.innerText = '35\u00B0C';
  labelCooling.innerText     = '50%';
  labelDuration.innerText    = '7s';
  labelMass.innerText        = '0.5 kg';

  // Reset internal math variables
  currentInitialTemp       = 35;
  currentCoolingEff        = 50;
  currentFaultDuration     = 7;
  currentCellMass          = 0.5;
  
  // Inherit the latest specific heat from the dropdown
  currentCellSpecificHeat  = chosenBarrierSpecificHeat;
  currentThermalCapacity   = currentCellMass * currentCellSpecificHeat;

  // Apply the reset
  recalculateStartingMath();
}

// --- Run this once when the page loads! ---
recalculateStartingMath();

// End of DOMContentLoaded wrapper
});
