document.addEventListener('DOMContentLoaded', () => {
  // get HTML elements
  const tempInput = document.getElementById('input-temp');
  const tempVal = document.getElementById('val-temp');
  const thermometerTrack = document.getElementById('thermometer-track');
  const thermometerFluid = document.getElementById('thermometer-fluid');
  const thermometerHandle = document.getElementById('thermometer-handle');
  
  const cyclesInput = document.getElementById('input-cycles');
  const btnNavPhase1 = document.getElementById('btn-nav-phase1');
  const btnNavPhase2 = document.getElementById('btn-nav-phase2');
  const phase1Container = document.getElementById('phase1-container');
  const phase2Container = document.getElementById('phase2-container');
  const btnBackPhase1 = document.getElementById('btn-back-phase1');

  const btnCyclesMinus = document.getElementById('btn-cycles-minus');
  const btnCyclesPlus = document.getElementById('btn-cycles-plus');
  const cycleTabs = document.querySelectorAll('.btn-cycle-tab');
  
  const loadInput = document.getElementById('input-load');
  const loadVal = document.getElementById('val-load');
  const driveModeCards = document.querySelectorAll('.drive-mode-card');
  const chargingSelect = document.getElementById('input-charging');
  
  const outCapacityFade = document.getElementById('out-capacity-fade');
  const outSoh = document.getElementById('out-soh');
  const outCapacityAh = document.getElementById('out-capacity-ah');
  const outRemainingLife = document.getElementById('out-remaining-life');
  
  const agingDescription = document.getElementById('aging-description');
  const btnRunSim = document.getElementById('btn-run-sim');
  const canvas = document.getElementById('degradation-chart');
  const ctx = canvas.getContext('2d');
  const graphContainer = document.getElementById('graph-container');

  const btnReset = document.getElementById('btn-reset');

  // global variables for simulation state
  let simIntervalId = null;
  let isSimRunning = false;
  let socVal = 100.0;
  let isDischarging = true;
  let currentCycles = 0;
  let targetCyclesLimit = NaN;

  const C_INITIAL = 100.0;     
  const D_BASE = 0.005;       
  const EOL_THRESHOLD = 70.0;  
  const R_INT_BASELINE = 10.0; 

  // battery wear physics formulas
  function calculateTelemetry(overrideN) {
    const T = parseFloat(tempInput.value);
    const N = (overrideN !== undefined) ? overrideN : (parseInt(cyclesInput.value, 10) || 0);
    const L = parseFloat(loadInput.value);
    const chargingType = chargingSelect.value;

    const m_T = Math.exp(0.06 * (T - 25));
    const m_C = (chargingType === 'fast') ? 2.5 : 1.0;
    const m_L = L / 50.0;
    const wearFactor = D_BASE * m_T * m_C * m_L;

    let capacityFade = N * wearFactor;
    if (capacityFade > 100) capacityFade = 100;

    const cCurrent = C_INITIAL * (1 - capacityFade / 100);
    let soh = 100 - capacityFade;
    if (soh < 0) soh = 0;

    const rIntIncreasePct = capacityFade * 2.0;
    const rInt = R_INT_BASELINE * (1 + rIntIncreasePct / 100.0);
    const heatFlux = 0.005 * Math.pow(L, 2) * (rInt / R_INT_BASELINE);

    const coreTemp = T + 0.15 * heatFlux;
    const coreTempDelta = coreTemp - T;

    const cyclesToEOL = 30.0 / wearFactor;
    const remainingCycles = Math.max(0, Math.round(cyclesToEOL - N));

    // multiplier for how hard the battery is working
    const stressIndex = m_T * m_C * m_L;
    
    // check how close we are to blowing up (20-65C range)
    const thermalRisk = Math.max(0, Math.min(100, Math.round(((coreTemp - 20) / 45) * 100)));
    
    // estimate mileage
    const expectedMileage = Math.round(cyclesToEOL * 250);

    return { wearFactor, capacityFade, cCurrent, soh, rInt, rIntIncreasePct, heatFlux, remainingCycles, m_T, m_C, m_L, coreTemp, coreTempDelta, stressIndex, thermalRisk, expectedMileage };
  }

  function getCellColor(soh) {
    if (soh > 85) return `hsl(${(soh - 85) * 2.33 + 135}, 65%, 42%)`; 
    if (soh >= 70) return `hsl(${(soh - 70) * 2.33 + 25}, 85%, 45%)`;  
    return `hsl(0, 60%, 40%)`; 
  }

  // updates visual thermometer bar
  function updateThermometerVisual(temp) {
    if (!thermometerFluid || !thermometerHandle) return;
    const minTemp = 20;
    const maxTemp = 70;
    const pct = (temp - minTemp) / (maxTemp - minTemp);
    thermometerFluid.style.height = `${pct * 100}%`;
    thermometerHandle.style.bottom = `calc(${pct * 100}% - 5px)`;
  }

  function setTempFromCoord(clientY) {
    if (!thermometerTrack) return;
    const rect = thermometerTrack.getBoundingClientRect();
    let pct = (rect.bottom - clientY) / rect.height;
    pct = Math.max(0, Math.min(1, pct));
    const temp = Math.round(20 + pct * 50); // range 20 to 70
    
    tempInput.value = temp;
    tempInput.dispatchEvent(new Event('input'));
    tempInput.dispatchEvent(new Event('change'));
  }

  let isDraggingTemp = false;

  if (thermometerTrack) {
    thermometerTrack.addEventListener('mousedown', (e) => {
      isDraggingTemp = true;
      setTempFromCoord(e.clientY);
      e.preventDefault();
    });

    thermometerTrack.addEventListener('touchstart', (e) => {
      isDraggingTemp = true;
      setTempFromCoord(e.touches[0].clientY);
      e.preventDefault();
    }, { passive: false });
  }

  window.addEventListener('mousemove', (e) => {
    if (isDraggingTemp) setTempFromCoord(e.clientY);
  });

  window.addEventListener('touchmove', (e) => {
    if (isDraggingTemp) setTempFromCoord(e.touches[0].clientY);
  }, { passive: false });

  window.addEventListener('mouseup', () => { isDraggingTemp = false; });
  window.addEventListener('touchend', () => { isDraggingTemp = false; });

  // highlights active drive mode card
  function updateDriveModeCardsHighlight(load) {
    if (!driveModeCards) return;
    driveModeCards.forEach(card => {
      const cardLoad = parseInt(card.getAttribute('data-load'), 10);
      if (cardLoad === load) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  }

  if (driveModeCards) {
    driveModeCards.forEach(card => {
      card.addEventListener('click', () => {
        const load = parseInt(card.getAttribute('data-load'), 10);
        loadInput.value = load;
        loadInput.dispatchEvent(new Event('input'));
        loadInput.dispatchEvent(new Event('change'));
      });
    });
  }

  // highlights selected cycles tab
  function updateCyclesTabHighlight(cycles) {
    if (!cycleTabs) return;
    cycleTabs.forEach(tab => {
      const tabVal = parseInt(tab.getAttribute('data-value'), 10);
      if (tabVal === cycles) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
  }

  if (btnCyclesMinus) {
    btnCyclesMinus.addEventListener('click', () => {
      let val = parseInt(cyclesInput.value, 10);
      if (isNaN(val)) val = 50;
      val = Math.max(50, val - 50);
      cyclesInput.value = val;
      cyclesInput.dispatchEvent(new Event('input'));
      cyclesInput.dispatchEvent(new Event('change'));
    });
  }

  if (btnCyclesPlus) {
    btnCyclesPlus.addEventListener('click', () => {
      let val = parseInt(cyclesInput.value, 10);
      if (isNaN(val)) val = 0;
      val = Math.min(2000, val + 50);
      cyclesInput.value = val;
      cyclesInput.dispatchEvent(new Event('input'));
      cyclesInput.dispatchEvent(new Event('change'));
    });
  }

  if (cycleTabs) {
    cycleTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const val = parseInt(tab.getAttribute('data-value'), 10);
        if (tab.classList.contains('active')) {
          cyclesInput.value = "";
          tab.classList.remove('active');
        } else {
          cyclesInput.value = val;
          updateCyclesTabHighlight(val);
        }
        cyclesInput.dispatchEvent(new Event('input'));
        cyclesInput.dispatchEvent(new Event('change'));
      });
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (isSimRunning) {
        clearInterval(simIntervalId);
        isSimRunning = false;
        btnRunSim.classList.remove('running');
        btnRunSim.querySelector('#run-btn-text').textContent = "Run Simulation";
      }
      tempInput.value = 25;
      cyclesInput.value = 50;
      loadInput.value = 50;
      chargingSelect.value = 'normal';
      socVal = 100.0;
      isDischarging = true;
      
      const evSocValue = document.getElementById('ev-soc-value');
      const evSocBar = document.getElementById('ev-soc-bar');
      if (evSocValue) evSocValue.textContent = '100%';
      if (evSocBar) {
        evSocBar.style.width = '100%';
        evSocBar.style.background = 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
      }

      if (btnNavPhase2) {
        btnNavPhase2.disabled = true;
        btnNavPhase2.classList.remove('unlocked');
        btnNavPhase2.style.border = '';
      }
      updateUI();
    });
  }

  // switch phases on nav click
  if (btnNavPhase1) {
    btnNavPhase1.addEventListener('click', () => {
      switchToPhase(1);
    });
  }

  if (btnNavPhase2) {
    btnNavPhase2.addEventListener('click', () => {
      if (!btnNavPhase2.disabled) {
        switchToPhase(2);
      }
    });
  }

  if (btnBackPhase1) {
    btnBackPhase1.addEventListener('click', () => {
      switchToPhase(1);
    });
  }

  function switchToPhase(phaseNum) {
    if (phaseNum === 1) {
      if (phase1Container) phase1Container.classList.add('active');
      if (phase2Container) phase2Container.classList.remove('active');
      if (btnNavPhase1) btnNavPhase1.classList.add('active');
      if (btnNavPhase2) btnNavPhase2.classList.remove('active');
    } else if (phaseNum === 2) {
      if (phase1Container) phase1Container.classList.remove('active');
      if (phase2Container) phase2Container.classList.add('active');
      if (btnNavPhase1) btnNavPhase1.classList.remove('active');
      if (btnNavPhase2) btnNavPhase2.classList.add('active');
    }
  }

  // updates all numbers and text on UI
  function updateUI(overrideN) {
    let N;
    if (overrideN !== undefined) {
      N = overrideN;
    } else if (isSimRunning) {
      N = currentCycles;
    } else {
      N = parseInt(cyclesInput.value, 10) || 0;
    }

    const results = calculateTelemetry(N);

    // Set Slider labels and highlights
    tempVal.textContent = `${tempInput.value}°C`;
    loadVal.textContent = `${loadInput.value}%`;

    updateThermometerVisual(parseInt(tempInput.value, 10));
    updateCyclesTabHighlight(cyclesInput.value === "" ? NaN : parseInt(cyclesInput.value, 10));
    updateDriveModeCardsHighlight(parseInt(loadInput.value, 10));

    // Numerical Readouts
    outCapacityFade.textContent = results.capacityFade.toFixed(1);
    outSoh.textContent = results.soh.toFixed(1);
    outCapacityAh.textContent = results.cCurrent.toFixed(1);
    outRemainingLife.textContent = results.soh <= EOL_THRESHOLD ? '0' : results.remainingCycles.toLocaleString();

    // changes cell colors inside the 3d visualizer
    const cellBaseColor = getCellColor(results.soh);
    
    // Determine dynamic fluid color based on current State of Charge (SoC %)
    let cellFluidColor = '#10b981'; // Green
    if (socVal < 20) {
      cellFluidColor = '#ef4444'; // Red (Blinking via CSS if under 20)
    } else if (socVal < 50) {
      cellFluidColor = '#f59e0b'; // Amber
    }

    // Calculate physical degradation and thermal effects
    const scaleFactor = 1.0 + Math.max(0, (100 - results.soh) / 30) * 0.12; 
    const crackOpacity = Math.max(0, Math.min(1.0, (100 - results.soh) / 30));
    
    const T = parseFloat(tempInput.value);
    const L = parseFloat(loadInput.value);
    const hasThermalStress = T > 45 || L >= 80;

    for (let i = 1; i <= 4; i++) {
      const mod = document.getElementById(`ev-mod-${i}`);
      if (mod) {
        mod.style.setProperty('--cell-color', cellBaseColor);
        mod.style.setProperty('--cell-base-color', cellBaseColor);
        mod.style.setProperty('--cell-fluid-color', cellFluidColor);
        mod.style.setProperty('--cell-fill-pct', `${Math.round(socVal)}%`);
        mod.style.setProperty('--cell-scale', scaleFactor.toFixed(3));
        mod.style.setProperty('--cell-crack-opacity', crackOpacity.toFixed(2));
        
        // Toggle low-charge blinking indicator
        if (socVal < 20) {
          mod.classList.add('low-charge');
        } else {
          mod.classList.remove('low-charge');
        }

        if (hasThermalStress) {
          mod.classList.add('thermal-stress');
        } else {
          mod.classList.remove('thermal-stress');
        }
      }
    }

    const evSohValue = document.getElementById('ev-soh-value');
    const evSohBar = document.getElementById('ev-soh-bar');
    if (evSohValue) {
      evSohValue.textContent = `${results.soh.toFixed(1)}%`;
    }
    if (evSohBar) {
      evSohBar.style.width = `${results.soh}%`;
      evSohBar.style.background = `linear-gradient(90deg, ${cellBaseColor} 0%, rgba(13, 148, 136, 0.8) 100%)`;
    }

    const evSocValue = document.getElementById('ev-soc-value');
    const evSocBar = document.getElementById('ev-soc-bar');
    if (evSocValue) evSocValue.textContent = `${Math.round(socVal)}%`;
    if (evSocBar) {
      evSocBar.style.width = `${socVal}%`;
      if (socVal > 50) {
        evSocBar.style.background = 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
      } else if (socVal > 20) {
        evSocBar.style.background = 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)';
      } else {
        evSocBar.style.background = 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)';
      }
    }

    // Dynamic Liquid Cooling loop shifts
    const coolingLoop = document.getElementById('cooling-loop');
    if (coolingLoop) {
      let coolantColor = '#2563eb'; // cool blue
      let coolantShadow = 'rgba(37, 99, 235, 0.4)';
      if (T > 55) {
        coolantColor = '#ef4444'; // hot red
        coolantShadow = 'rgba(239, 68, 68, 0.6)';
      } else if (T > 38) {
        coolantColor = '#f59e0b'; // warm amber
        coolantShadow = 'rgba(245, 158, 11, 0.5)';
      }
      coolingLoop.style.backgroundColor = coolantColor;
      coolingLoop.style.boxShadow = `inset 0 2px 3px rgba(255,255,255,0.4), 0 0 12px ${coolantShadow}`;
    }

    // Diagnostic Cards
    const diagGrade = document.getElementById('diag-grade');
    const diagGradeLbl = document.getElementById('diag-grade-lbl');
    const diagStress = document.getElementById('diag-stress');
    const diagStressLbl = document.getElementById('diag-stress-lbl');
    const diagThermalRisk = document.getElementById('diag-thermal-risk');
    const diagThermalLbl = document.getElementById('diag-thermal-lbl');
    const diagMileage = document.getElementById('diag-mileage');
    const diagMileageLbl = document.getElementById('diag-mileage-lbl');

    if (diagGrade) {
      let grade = 'Grade A';
      let desc = 'Optimal condition';
      let gradeColor = '#10b981';
      if (results.soh < 70) {
        grade = 'Grade F';
        desc = 'End of Life (Replace pack)';
        gradeColor = '#ef4444';
      } else if (results.soh < 80) {
        grade = 'Grade C';
        desc = 'Degraded (Near EOL threshold)';
        gradeColor = '#f59e0b';
      } else if (results.soh < 90) {
        grade = 'Grade B';
        desc = 'Moderate battery health';
        gradeColor = '#3b82f6';
      }
      diagGrade.textContent = grade;
      diagGrade.style.color = gradeColor;
      if (diagGradeLbl) diagGradeLbl.textContent = desc;
    }

    if (diagStress) {
      diagStress.textContent = `${results.stressIndex.toFixed(1)}x`;
      let stressDesc = 'Low stress operating zone';
      let stressColor = '#10b981';
      if (results.stressIndex > 4.0) {
        stressDesc = 'Severe aging acceleration';
        stressColor = '#ef4444';
      } else if (results.stressIndex > 1.5) {
        stressDesc = 'Moderate load/temp wear';
        stressColor = '#f59e0b';
      }
      diagStress.style.color = stressColor;
      if (diagStressLbl) diagStressLbl.textContent = stressDesc;
    }

    if (diagThermalRisk) {
      diagThermalRisk.textContent = `${results.thermalRisk}%`;
      let thermalDesc = 'Negligible runaway threat';
      let thermalColor = '#10b981';
      if (results.thermalRisk > 75) {
        thermalDesc = 'Critical! Runaway hazard';
        thermalColor = '#ef4444';
      } else if (results.thermalRisk > 40) {
        thermalDesc = 'Elevated core temperatures';
        thermalColor = '#f59e0b';
      }
      diagThermalRisk.style.color = thermalColor;
      if (diagThermalLbl) diagThermalLbl.textContent = thermalDesc;
    }

    if (diagMileage) {
      diagMileage.textContent = `${results.expectedMileage.toLocaleString()} miles`;
      if (diagMileageLbl) {
        const remainingMileage = Math.max(0, Math.round(results.remainingCycles * 250));
        diagMileageLbl.textContent = `Remaining: ${remainingMileage.toLocaleString()} miles range`;
      }
    }

    // updates warning text notes
    updateExplainer(results);

    // Render formulas & Line Chart
    updateDynamicFormulas(results, N);
    drawChart(results, N);

    // Render dynamic conclusion assessment summary
    updateConclusionSummary(results);
  }

  // student conclusion report writeup
  function updateConclusionSummary(results) {
    const summaryCard = document.getElementById('conclusion-summary-card');
    const summaryText = document.getElementById('diag-summary-text');
    if (!summaryCard || !summaryText) return;

    const T = parseFloat(tempInput.value);
    const N = parseInt(cyclesInput.value, 10) || 0;
    const L = parseFloat(loadInput.value);
    const chargingType = chargingSelect.value;

    // Set dynamic status classes for styling
    summaryCard.className = 'conclusion-summary-box'; // reset
    if (results.soh < 70) {
      summaryCard.classList.add('status-danger');
    } else if (results.soh < 85) {
      summaryCard.classList.add('status-warn');
    } else {
      summaryCard.classList.add('status-good');
    }

    // Determine what drivers were active for student summary
    let drivers = [];
    if (T > 45) drivers.push(`high temperature (${T}°C)`);
    if (chargingType === 'fast') drivers.push("fast charging (3C)");
    if (L > 60) drivers.push(`heavy loads (${L}% load)`);

    let driversList = drivers.length > 0 
      ? `due to the combined stress of ${drivers.join(', ')}` 
      : "under standard operating conditions";

    let conclusionHTML = `
      <p>
        In this experiment, we simulated battery aging over <strong>${N} cycles</strong> and observed that the State of Health (SoH) declined to <strong>${results.soh.toFixed(1)}%</strong>, resulting in a <strong>${results.capacityFade.toFixed(1)}% capacity fade</strong>. This aging was driven by a stress index of <strong>${results.stressIndex.toFixed(1)}x</strong> compared to normal conditions, ${driversList}.
      </p>
      <p>
        We also observed how chemical degradation scales physical telemetry parameters: the internal resistance rose to <strong>${results.rInt.toFixed(2)} mΩ</strong> (an increase of <strong>${results.rIntIncreasePct.toFixed(1)}%</strong>). During discharge, this increased resistance resulted in an active heat flux of <strong>${results.heatFlux.toFixed(1)} W/m²</strong>, causing the core temperature to reach <strong>${results.coreTemp.toFixed(1)}°C</strong> and elevating the runaway risk to <strong>${results.thermalRisk}%</strong>.
      </p>
      <p>
        Based on these findings, we conclude that to prolong the lifespan of this EV battery pack, it is essential to minimize exposure to high ambient temperatures, restrict fast charging, and avoid high current draw to mitigate Joule heating hotspots.
      </p>
    `;

    summaryText.innerHTML = conclusionHTML;

    // Render KaTeX inline elements in the summary card if needed
    if (window.renderMathInElement) {
      window.renderMathInElement(summaryText);
    }
  }

  // updates the active stress notes
  function updateExplainer(results) {
    const T = parseFloat(tempInput.value);
    const chargingType = chargingSelect.value;
    const L = parseFloat(loadInput.value);

    let text = '';
    if (T > 55) {
      text += '🔥 **Extreme Temperature:** Operating at ' + T + '°C triggers exponential Arrhenius growth of the solid electrolyte interphase (SEI), resulting in rapid lithium depletion. ';
    }
    if (chargingType === 'fast') {
      text += '⚡ **Fast Charge stress:** The high C-rate (3C) fast charging introduces mechanical particle volume expansions, micro-cracking, and lithium plating risks. ';
    }
    if (L > 80) {
      text += '🚙 **Severe Driving Profile:** Heavy discharge load (' + L + '%) generates elevated Joule heating flux (' + results.heatFlux.toFixed(1) + ' W/m²) due to resistance growth. ';
    }

    if (text === '') {
      text = '🟢 **Nominal Health Operation:** Moderate temperatures (20–30°C) combined with standard charging and normal driving patterns maintain stable cell structures with low degradation profiles.';
    }

    agingDescription.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }

  // handlers to drag/touch chart and adjust cycles
  // 1. chart drag to scrub timeline
  let isScrubbingGraph = false;

  function scrubCyclesFromXCoord(clientX) {
    const rect = canvas.getBoundingClientRect();
    const xMouse = clientX - rect.left;
    const paddingLeft = 50, paddingRight = 20;
    const plotWidth = rect.width - paddingLeft - paddingRight;
    
    let pct = (xMouse - paddingLeft) / plotWidth;
    pct = Math.max(0, Math.min(1, pct));
    
    let calculatedCycles = Math.round((pct * 2000) / 10) * 10;
    cyclesInput.value = Math.max(50, Math.min(2000, calculatedCycles));
    cyclesInput.dispatchEvent(new Event('input'));
  }

  canvas.style.cursor = 'crosshair';
  canvas.addEventListener('mousedown', (e) => {
    if (isSimRunning) {
      clearInterval(simIntervalId);
      isSimRunning = false;
      btnRunSim.classList.remove('running');
      btnRunSim.querySelector('#run-btn-text').textContent = "Run Simulation";
    }
    isScrubbingGraph = true;
    scrubCyclesFromXCoord(e.clientX);
  });
  window.addEventListener('mousemove', (e) => { if (isScrubbingGraph) scrubCyclesFromXCoord(e.clientX); });
  window.addEventListener('mouseup', () => { isScrubbingGraph = false; });

  // Touch support for graph scrubbing (disabling default scroll during interaction)
  canvas.addEventListener('touchstart', (e) => {
    if (isSimRunning) {
      clearInterval(simIntervalId);
      isSimRunning = false;
      btnRunSim.classList.remove('running');
      btnRunSim.querySelector('#run-btn-text').textContent = "Run Simulation";
    }
    isScrubbingGraph = true;
    scrubCyclesFromXCoord(e.touches[0].clientX);
    e.preventDefault();
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (isScrubbingGraph && e.touches.length > 0) {
      scrubCyclesFromXCoord(e.touches[0].clientX);
      e.preventDefault();
    }
  }, { passive: false });

  window.addEventListener('touchend', () => { isScrubbingGraph = false; });

  // 2. Interactive 3D High-Voltage Cable Terminals
  const posTerm = document.getElementById('terminal-pos');
  const negTerm = document.getElementById('terminal-neg');

  if (posTerm && negTerm) {
    [posTerm, negTerm].forEach(term => {
      term.style.cursor = 'pointer';
      term.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent scene dragging
        const currentLoad = parseInt(loadInput.value, 10);
        let nextLoad = 20;
        if (currentLoad < 50) nextLoad = 50;
        else if (currentLoad < 80) nextLoad = 80;
        else if (currentLoad < 100) nextLoad = 100;
        else nextLoad = 20;
        
        loadInput.value = nextLoad;
        loadInput.dispatchEvent(new Event('input'));
        loadInput.dispatchEvent(new Event('change'));
      });
    });
  }

  // 3. 3D Pack Rotational Inspector Drag Overrides
  let isDraggingScene = false;
  let previousMouseX = 0, previousMouseY = 0;
  let currentRotationX = -14, currentRotationY = 20;
  const batteryScene = document.getElementById('battery-scene');
  const batteryBox = document.getElementById('battery-box');
  let autoLevitateResumeTimer = null;
  let returnTransitionTimer = null;

  function handleSceneDragStart(clientX, clientY) {
    isDraggingScene = true;
    previousMouseX = clientX; 
    previousMouseY = clientY;
    if (autoLevitateResumeTimer) {
      clearTimeout(autoLevitateResumeTimer);
      autoLevitateResumeTimer = null;
    }
    if (returnTransitionTimer) {
      clearTimeout(returnTransitionTimer);
      returnTransitionTimer = null;
    }
    if (batteryBox) {
      batteryBox.classList.add('paused-levitation');
      batteryBox.style.transition = 'none'; // precise drag tracking
    }
  }

  function handleSceneDragMove(clientX, clientY) {
    if (!isDraggingScene) return;
    currentRotationY += (clientX - previousMouseX) * 0.4;
    currentRotationX = Math.max(-65, Math.min(25, currentRotationX - (clientY - previousMouseY) * 0.4));
    
    if (batteryBox) {
      batteryBox.style.transform = `rotateX(${currentRotationX}deg) rotateY(${currentRotationY}deg)`;
    }
    previousMouseX = clientX; 
    previousMouseY = clientY;
  }

  function handleSceneDragEnd() {
    if (isDraggingScene) {
      isDraggingScene = false;
      autoLevitateResumeTimer = setTimeout(() => { 
        if (!isDraggingScene && batteryBox) {
          // Transition smoothly back to default
          batteryBox.style.transition = 'transform 1.0s cubic-bezier(0.25, 1, 0.5, 1)';
          batteryBox.style.transform = 'rotateX(-14deg) rotateY(20deg)';
          currentRotationX = -14;
          currentRotationY = 20;
          
          returnTransitionTimer = setTimeout(() => {
            if (!isDraggingScene && batteryBox) {
              batteryBox.classList.remove('paused-levitation');
              batteryBox.style.transition = '';
              batteryBox.style.transform = '';
            }
          }, 1000);
        } 
      }, 1000); // 1 second delay
    }
  }

  if (batteryScene) {
    batteryScene.addEventListener('mousedown', (e) => {
      if (e.target.closest('.coolant-ports-row') || e.target.closest('.hv-3d-plug')) return;
      handleSceneDragStart(e.clientX, e.clientY);
    });

    window.addEventListener('mousemove', (e) => {
      handleSceneDragMove(e.clientX, e.clientY);
    });

    window.addEventListener('mouseup', () => {
      handleSceneDragEnd();
    });

    // Touch support for 3D dragging (disables scroll while dragging scene)
    batteryScene.addEventListener('touchstart', (e) => {
      const isInteractive = e.target.closest('.coolant-ports-row') || e.target.closest('.hv-3d-plug');
      if (e.touches.length > 0 && !isInteractive) {
        handleSceneDragStart(e.touches[0].clientX, e.touches[0].clientY);
        e.preventDefault();
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (isDraggingScene && e.touches.length > 0) {
        handleSceneDragMove(e.touches[0].clientX, e.touches[0].clientY);
        e.preventDefault();
      }
    }, { passive: false });

    window.addEventListener('touchend', () => {
      handleSceneDragEnd();
    });
  }

  // main simulation timer loop
  function tickSimulation() {
    const L = parseFloat(loadInput.value);
    const chargingType = chargingSelect.value;
    const coolingLoop = document.getElementById('cooling-loop');

    if (isDischarging) {
      socVal = Math.max(0, socVal - (0.3 + (L / 100) * 1.1));
      if (posTerm) posTerm.classList.add('active-load');
      if (negTerm) negTerm.classList.add('active-load');
      if (coolingLoop) coolingLoop.classList.add('active-flow');
      if (socVal <= 5.0) isDischarging = false; // Transistion at 5% safety limit
    } else {
      socVal = Math.min(100.0, socVal + (chargingType === 'fast' ? 3.0 : 1.0));
      if (posTerm) posTerm.classList.remove('active-load');
      if (negTerm) negTerm.classList.remove('active-load');
      
      // Cooling loop flow active strictly during fast charging (or discharging)
      if (coolingLoop) {
        if (chargingType === 'fast') {
          coolingLoop.classList.add('active-flow');
        } else {
          coolingLoop.classList.remove('active-flow');
        }
      }

      if (socVal >= 100.0) {
        isDischarging = true;
      }
    }

    // count cycles
    currentCycles += 2; // Increment by 2 per tick for responsive speed

    let shouldStop = false;

    if (!isNaN(targetCyclesLimit)) {
      if (currentCycles >= targetCyclesLimit) {
        currentCycles = targetCyclesLimit;
        shouldStop = true;
      }
    } else {
      // Run until battery is burnt (SoH reaches 0%)
      const currentSoh = calculateTelemetry(currentCycles).soh;
      if (currentSoh <= 0.1) { // 0% SoH threshold
        shouldStop = true;
      }
    }

    // Set the cycles input value directly so the numbers change inside the stepper bar!
    cyclesInput.value = Math.round(currentCycles);

    if (shouldStop) {
      clearInterval(simIntervalId);
      isSimRunning = false;
      btnRunSim.classList.remove('running');
      btnRunSim.querySelector('#run-btn-text').textContent = "Run Simulation";
      
      // Unlock Phase 2 navigation!
      if (btnNavPhase2) {
        btnNavPhase2.disabled = false;
        btnNavPhase2.classList.add('unlocked');
        btnNavPhase2.style.border = '1px solid #10b981';
      }

      cyclesInput.dispatchEvent(new Event('input'));
      return;
    }

    const evSocValue = document.getElementById('ev-soc-value');
    const evSocBar = document.getElementById('ev-soc-bar');
    if (evSocValue) evSocValue.textContent = `${Math.round(socVal)}%`;
    if (evSocBar) {
      evSocBar.style.width = `${socVal}%`;
      if (socVal > 50) {
        evSocBar.style.background = 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
      } else if (socVal > 20) {
        evSocBar.style.background = 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)';
      } else {
        evSocBar.style.background = 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)';
      }
    }

    // Trigger input event to update everything based on the new cyclesInput.value
    cyclesInput.dispatchEvent(new Event('input'));
  }

  if (btnRunSim) {
    btnRunSim.addEventListener('click', () => {
      if (isSimRunning) {
        clearInterval(simIntervalId);
        isSimRunning = false;
        btnRunSim.classList.remove('running');
        btnRunSim.querySelector('#run-btn-text').textContent = "Run Simulation";
        updateUI();
      } else {
        // Lock Phase 2 navigation during active run
        if (btnNavPhase2) {
          btnNavPhase2.disabled = true;
          btnNavPhase2.classList.remove('unlocked');
          btnNavPhase2.style.border = '';
        }
        const val = parseInt(cyclesInput.value, 10);
        targetCyclesLimit = isNaN(val) ? NaN : val;
        currentCycles = 0;
        cyclesInput.value = 0; // Set input value to 0 to start counting from 0 visually inside the stepper bar!
        simIntervalId = setInterval(tickSimulation, 60);
        isSimRunning = true;
        btnRunSim.classList.add('running');
        btnRunSim.querySelector('#run-btn-text').textContent = "Pause Simulation";
      }
    });
  }

  // renders formulas using katex
  function updateDynamicFormulas(results, overrideN) {
    if (!window.katex) return;
    try {
      const T = parseFloat(tempInput.value);
      const N = (overrideN !== undefined) ? overrideN : (parseInt(cyclesInput.value, 10) || 0);
      const L = parseFloat(loadInput.value);

      // 1. Wear/Degradation Rate formula
      katex.render(
        `d_{\\text{rate}} = 0.005 \\times e^{0.06 \\times (${T} - 25)} \\times ${results.m_C.toFixed(1)} \\times \\frac{${L}}{50} = ${results.wearFactor.toFixed(5)}\\% \\text{ per cycle}`,
        document.getElementById('formula-deg-rate'),
        { displayMode: true }
      );

      // 2. Capacity Fade formula
      katex.render(
        `\\begin{aligned}
        \\text{Capacity Fade (\\%)} &= \\left(\\frac{C_{\\text{initial}} - C_{\\text{current}}}{C_{\\text{initial}}}\\right) \\times 100 \\\\
        &= \\left(\\frac{100.0 - ${results.cCurrent.toFixed(1)}}{100.0}\\right) \\times 100 \\\\
        &= ${results.capacityFade.toFixed(1)}\\%
        \\end{aligned}`,
        document.getElementById('formula-cap-fade'),
        { displayMode: true }
      );

      // 3. State of Health (SoH) formula
      katex.render(
        `\\begin{aligned}
        \\text{SoH (\\%)} &= 100\\% - \\text{Capacity Fade (\\%)} \\\\
        &= 100\\% - ${results.capacityFade.toFixed(1)}\\% \\\\
        &= ${results.soh.toFixed(1)}\\%
        \\end{aligned}`,
        document.getElementById('formula-soh'),
        { displayMode: true }
      );

      // 4. Internal Resistance formula
      katex.render(
        `R_{\\text{int}} = 10.0 \\times \\left(1.0 + 2.0 \\times \\frac{${results.capacityFade.toFixed(1)}}{100}\\right) = ${results.rInt.toFixed(2)}\\text{ m}\\Omega`,
        document.getElementById('formula-r-int'),
        { displayMode: true }
      );

      // 5. Heat Flux formula
      katex.render(
        `Q_{\\text{flux}} = 0.005 \\times ${L}^2 \\times \\left(\\frac{${results.rInt.toFixed(2)}}{10.0}\\right) = ${results.heatFlux.toFixed(1)}\\text{ W/m}^2`,
        document.getElementById('formula-q-flux'),
        { displayMode: true }
      );

      // 6. Cell Core Temperature formula
      katex.render(
        `T_{\\text{core}} = T_{\\text{ambient}} + 0.15 \\times Q_{\\text{flux}} = ${T}^\\circ\\text{C} + 0.15 \\times ${results.heatFlux.toFixed(1)} = ${results.coreTemp.toFixed(1)}^\\circ\\text{C}`,
        document.getElementById('formula-core-temp'),
        { displayMode: true }
      );
    } catch (e) { console.warn(e); }
  }

  // draws the chart lines
  function drawChart(results, overrideN) {
    const rect = graphContainer.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width, h = rect.height;
    const paddingLeft = 50, paddingBottom = 40, paddingTop = 20, paddingRight = 20;
    const pw = w - paddingLeft - paddingRight, ph = h - paddingTop - paddingBottom;

    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    ctx.font = '500 10px "Inter", sans-serif';
    ctx.fillStyle = '#718096';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    // Draw horizontal grid line numbers
    for (let i = 0; i <= 5; i++) {
      const yVal = 50 + i * 10;
      const y = paddingTop + (1 - (yVal - 50) / 50) * ph;
      ctx.beginPath(); ctx.moveTo(paddingLeft, y); ctx.lineTo(w - paddingRight, y); ctx.stroke();
      let label = `${yVal}%`;
      if (yVal === 70) label = '70% EOL';
      ctx.fillText(label, paddingLeft - 8, y);
    }

    // Draw vertical timeline cycles
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const ticks = [0, 500, 1000, 1500, 2000];
    ticks.forEach(t => {
      const x = paddingLeft + (t / 2000) * pw;
      ctx.beginPath(); ctx.moveTo(x, paddingTop); ctx.lineTo(x, h - paddingBottom); ctx.stroke();
      ctx.fillText(t.toString(), x, h - paddingBottom + 8);
    });

    ctx.fillStyle = '#4a5568';
    ctx.font = '600 11px "Outfit", sans-serif';
    ctx.fillText('Applied Cycles (N)', paddingLeft + pw / 2, h - 14);

    // EOL Red dashed line
    const eolY = paddingTop + (1 - (EOL_THRESHOLD - 50) / 50) * ph;
    ctx.strokeStyle = '#f56565';
    ctx.lineWidth = 1.25;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(paddingLeft, eolY);
    ctx.lineTo(w - paddingRight, eolY);
    ctx.stroke();
    ctx.setLineDash([]); // reset

    ctx.fillStyle = '#e53e3e';
    ctx.font = 'bold 9px "Inter", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('CRITICAL CELL LIMIT (70%)', w - paddingRight, eolY - 5);

    const currentN = (overrideN !== undefined) ? overrideN : (parseInt(cyclesInput.value, 10) || 0);
    const wearFactor = results.wearFactor;
    const sohAtEnd = Math.max(0, 100 - currentN * wearFactor);

    // Draw solid active line
    ctx.strokeStyle = '#3182ce'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop);
    for (let c = 10; c <= currentN; c += 10) {
      const sVal = Math.max(0, 100 - c * wearFactor);
      const x = paddingLeft + (c / 2000) * pw;
      const y = paddingTop + (1 - (sVal - 50) / 50) * ph;
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Area Gradient Fill
    ctx.beginPath();
    ctx.moveTo(paddingLeft, h - paddingBottom);
    ctx.lineTo(paddingLeft, paddingTop);
    for (let c = 10; c <= currentN; c += 10) {
      const sVal = Math.max(50, 100 - c * wearFactor);
      const x = paddingLeft + (c / 2000) * pw;
      const y = paddingTop + (1 - (sVal - 50) / 50) * ph;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(paddingLeft + (currentN / 2000) * pw, h - paddingBottom);
    ctx.closePath();

    const areaGradient = ctx.createLinearGradient(0, paddingTop, 0, h - paddingBottom);
    areaGradient.addColorStop(0, 'rgba(49, 130, 206, 0.16)');
    areaGradient.addColorStop(1, 'rgba(49, 130, 206, 0.005)');
    ctx.fillStyle = areaGradient;
    ctx.fill();

    // Draw projection dashed line
    if (currentN < 2000) {
      ctx.strokeStyle = 'rgba(49, 130, 206, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      const startX = paddingLeft + (currentN / 2000) * pw;
      const startY = paddingTop + (1 - (sohAtEnd - 50) / 50) * ph;
      ctx.moveTo(startX, startY);
      for (let c = currentN + 10; c <= 2000; c += 10) {
        const sVal = Math.max(0, 100 - c * wearFactor);
        const x = paddingLeft + (c / 2000) * pw;
        const y = paddingTop + (1 - (sVal - 50) / 50) * ph;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Node Dot Marker
    const dotX = paddingLeft + (currentN / 2000) * pw;
    const dotY = paddingTop + (1 - (sohAtEnd - 50) / 50) * ph;

    ctx.beginPath();
    ctx.arc(dotX, dotY, 7, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(49, 130, 206, 0.25)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(dotX, dotY, 4.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#3182ce';
    ctx.lineWidth = 2.5;
    ctx.fill();
    ctx.stroke();
  }

  // bind input element events
  const inputsList = [tempInput, cyclesInput, loadInput, chargingSelect];
  inputsList.forEach(input => {
    if (input) {
      input.addEventListener('input', () => {
        updateUI();
      });
      input.addEventListener('change', updateUI);
    }
  });

  // High DPI Resize Observer
  if (graphContainer) {
    const resizeObserver = new ResizeObserver(() => {
      const results = calculateTelemetry();
      drawChart(results);
    });
    resizeObserver.observe(graphContainer);
  }

  // run initial update
  updateUI();
});
