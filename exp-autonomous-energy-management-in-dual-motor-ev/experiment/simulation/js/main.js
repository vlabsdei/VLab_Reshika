document.addEventListener('DOMContentLoaded', () => {
  // Grabbing all the input elements from the HTML page (sliders, switches)
  const inputFriction = document.getElementById('input-friction');
  const inputAuto = document.getElementById('input-auto');
  const inputP1 = document.getElementById('input-p1');
  const inputP2 = document.getElementById('input-p2');

  // Variables for dragging weights around on the screen
  const weightShelf = document.getElementById('weight-shelf');
  const shelfBlocks = document.querySelector('.shelf-blocks');
  const cargoSlots = document.getElementById('cargo-slots');
  const cargoDropZone = document.getElementById('cargo-drop-zone');
  const draggableWeights = document.querySelectorAll('.weight-block');

  // Empty car weighs 1500kg (base weight from lab manual)
  let currentVehicleMass = 1500;

  // Labels and indicator badges on the dashboard
  const valMass = document.getElementById('val-mass');
  const valP1Target = document.getElementById('val-p1-target');
  const valP2Target = document.getElementById('val-p2-target');
  const controlModeBadge = document.getElementById('control-mode-badge');
  const manualControlsSection = document.getElementById('manual-controls-section');

  // Chassis visualizer, wheels, and motor labels
  const viewport = document.getElementById('viewport');
  const roadBadge = document.getElementById('road-badge');
  const vectorCanvas = document.getElementById('vector-canvas');
  const wheelFL = document.getElementById('wheel-fl');
  const wheelFR = document.getElementById('wheel-fr');
  const wheelRL = document.getElementById('wheel-rl');
  const wheelRR = document.getElementById('wheel-rr');
  const motorF = document.getElementById('motor-f');
  const motorR = document.getElementById('motor-r');
  const motorFTelemetry = document.getElementById('motor-f-telemetry');
  const motorRTelemetry = document.getElementById('motor-r-telemetry');
  const flowFront = document.getElementById('flow-front');
  const flowRear = document.getElementById('flow-rear');
  const loadFrontLabel = document.getElementById('load-front');
  const loadRearLabel = document.getElementById('load-rear');

  // Value boxes and progress bar elements for the power readouts
  const valP1 = document.getElementById('val-p1');
  const valP2 = document.getElementById('val-p2');
  const valPTotal = document.getElementById('val-ptotal');
  const fillP1 = document.getElementById('fill-p1');
  const fillP2 = document.getElementById('fill-p2');
  const fillPTotal = document.getElementById('fill-ptotal');
  const capFrontLabel = document.getElementById('cap-front');
  const capRearLabel = document.getElementById('cap-rear');

  // Efficiency indicators and warnings banner
  const valEfficiency = document.getElementById('val-efficiency');
  const fillEfficiency = document.getElementById('fill-efficiency');
  const tractionBanner = document.getElementById('traction-banner');
  const bannerIconSymbol = document.getElementById('banner-icon-symbol');
  const bannerStatusTitle = document.getElementById('banner-status-title');
  const bannerStatusDesc = document.getElementById('banner-status-desc');

  // DOM Elements - Phase Switcher & Phase 2
  const btnPhase1 = document.getElementById('btn-phase1');
  const btnPhase2 = document.getElementById('btn-phase2');
  const phase2Section = document.getElementById('phase2-section');

  const p2Mass = document.getElementById('p2-mass');
  const p2Friction = document.getElementById('p2-friction');
  const p2LoadFront = document.getElementById('p2-load-front');
  const p2LoadRear = document.getElementById('p2-load-rear');
  const p2LimitFront = document.getElementById('p2-limit-front');
  const p2LimitRear = document.getElementById('p2-limit-rear');
  const p2StatusBox = document.getElementById('p2-status-box');
  const p2StatusTitle = document.getElementById('p2-status-title');
  const p2ExplanationText = document.getElementById('p2-explanation-text');

  // Constant Physics Parameters
  const C_scale = 0.15; // Calibration scale factor to map force capacity to kW limits
  const k_transfer = 0.001; // Weight transfer coefficient per kW of total power

  /*
   * This function runs every time an input changes to recalculate the whole EV state
   */
  function updateSimulation() {
    // Read current settings from sliders and dropdowns
    const mass = currentVehicleMass;
    const friction = parseFloat(inputFriction.value);
    const isAuto = inputAuto.checked;
    
    // Read user sliders target power (motor demand settings)
    const p1Target = parseFloat(inputP1.value);
    const p2Target = parseFloat(inputP2.value);

    // Write vehicle weight on the screen
    valMass.textContent = `${mass} kg`;

    // Lock manual sliders if auto mode is checked
    if (isAuto) {
      inputP1.disabled = true;
      inputP2.disabled = true;
      valP1Target.classList.add('disabled-text');
      valP2Target.classList.add('disabled-text');
      controlModeBadge.textContent = 'Auto Active';
      controlModeBadge.className = 'status-indicator-badge auto-active';
      manualControlsSection.classList.add('locked');
    } else {
      inputP1.disabled = false;
      inputP2.disabled = false;
      valP1Target.classList.remove('disabled-text');
      valP2Target.classList.remove('disabled-text');
      controlModeBadge.textContent = 'Manual Mode';
      controlModeBadge.className = 'status-indicator-badge manual-active';
      manualControlsSection.classList.remove('locked');
    }

    // Change road background based on dynamic friction selection
    viewport.className = 'simulation-viewport'; // reset
    if (friction === 1.0) {
      viewport.classList.add('dry-asphalt');
      roadBadge.textContent = 'Dry Asphalt (μ = 1.0)';
    } else if (friction === 0.6) {
      viewport.classList.add('wet-asphalt');
      roadBadge.textContent = 'Wet Asphalt (μ = 0.6)';
    } else if (friction === 0.2) {
      viewport.classList.add('ice-road');
      roadBadge.textContent = 'Ice Road (μ = 0.2)';
    }

    // Formula 1: total power requested is P_total = P1 + P2
    const pTotalDemand = p1Target + p2Target;
    
    let p1 = p1Target;
    let p2 = p2Target;

    // Math for weight transfer under acceleration:
    // Load moves from front to back. Front fraction decreases, rear increases.
    let fFront = 0.5 - (k_transfer * pTotalDemand);
    fFront = Math.max(0.25, Math.min(0.5, fFront)); // keep front fraction between 25% and 50%
    let fRear = 1.0 - fFront;

    // Convert fractions into actual kg per axle
    const loadFrontKg = mass * fFront;
    const loadRearKg = mass * fRear;

    // Write dynamic load values on the screen
    loadFrontLabel.textContent = `${(fFront * 100).toFixed(1)}% (${loadFrontKg.toFixed(0)} kg)`;
    loadRearLabel.textContent = `${(fRear * 100).toFixed(1)}% (${loadRearKg.toFixed(0)} kg)`;

    // Formula 2: Axle traction grip limits (Grip = Normal Load * Friction * Calibration Factor)
    const pLimitFront = loadFrontKg * friction * C_scale;
    const pLimitRear = loadRearKg * friction * C_scale;

    capFrontLabel.textContent = `${pLimitFront.toFixed(1)} kW`;
    capRearLabel.textContent = `${pLimitRear.toFixed(1)} kW`;

    // Torque vectoring code for Auto Mode: split power based on dynamic axle weights
    if (isAuto) {
      // First, get optimal split based on dynamic weight transfer
      const p1Opt = pTotalDemand * fFront;
      const p2Opt = pTotalDemand * fRear;

      // Check if optimal allocation exceeds traction limits
      if (p1Opt > pLimitFront && p2Opt > pLimitRear) {
        // Both axles are saturated: cap both at limits to prevent slips
        p1 = pLimitFront;
        p2 = pLimitRear;
      } else if (p1Opt > pLimitFront) {
        // Front axle saturated: cap front and divert excess power to rear
        p1 = pLimitFront;
        p2 = pTotalDemand - p1;
        // Cap rear if it also exceeds its limit
        if (p2 > pLimitRear) p2 = pLimitRear;
      } else if (p2Opt > pLimitRear) {
        // Rear axle saturated: cap rear and divert excess power to front
        p2 = pLimitRear;
        p1 = pTotalDemand - p2;
        // Cap front if it also exceeds its limit
        if (p1 > pLimitFront) p1 = pLimitFront;
      } else {
        // Both are within safe traction limits
        p1 = p1Opt;
        p2 = p2Opt;
      }
    }

    // Enforce P_total = P1 + P2 formula
    const pTotal = p1 + p2;

    // Update screen readouts with calculated values
    valP1.textContent = p1.toFixed(1);
    valP2.textContent = p2.toFixed(1);
    valPTotal.textContent = pTotal.toFixed(1);

    // Update manual sliders display target text
    valP1Target.textContent = `${p1.toFixed(1)} kW`;
    valP2Target.textContent = `${p2.toFixed(1)} kW`;

    motorFTelemetry.textContent = `${p1.toFixed(1)} kW`;
    motorRTelemetry.textContent = `${p2.toFixed(1)} kW`;

    // Update progress bar percentages
    fillP1.style.width = `${(p1 / 150) * 100}%`;
    fillP2.style.width = `${(p2 / 150) * 100}%`;
    fillPTotal.style.width = `${(pTotal / 300) * 100}%`;

    // Slippage Detection: Check if wheels are slipping (Power > limit)
    const isSlippingFront = p1 > pLimitFront;
    const isSlippingRear = p2 > pLimitRear;

    // Apply red 'slip' styling to wheels if they exceed capacity
    if (isSlippingFront) {
      wheelFL.classList.add('slip');
      wheelFR.classList.add('slip');
      motorF.classList.add('slip-alert');
      flowFront.classList.add('slip-flow');
    } else {
      wheelFL.classList.remove('slip');
      wheelFR.classList.remove('slip');
      motorF.classList.remove('slip-alert');
      flowFront.classList.remove('slip-flow');
    }

    if (isSlippingRear) {
      wheelRL.classList.add('slip');
      wheelRR.classList.add('slip');
      motorR.classList.add('slip-alert');
      flowRear.classList.add('slip-flow');
    } else {
      wheelRL.classList.remove('slip');
      wheelRR.classList.remove('slip');
      motorR.classList.remove('slip-alert');
      flowRear.classList.remove('slip-flow');
    }

    // Make the road move faster/slower depending on how wheels are spinning
    if (isSlippingFront && isSlippingRear) {
      // Both axles slip: road stops moving, wheels spin furiously in place
      viewport.style.animationPlayState = 'paused';
      document.querySelectorAll('.wheel').forEach(w => w.style.animationPlayState = 'running');
    } else if (isSlippingFront || isSlippingRear) {
      // One axle slips: road animation slows down drastically (3.0s duration)
      viewport.style.animationPlayState = 'running';
      viewport.style.animationDuration = '3.0s';
      document.querySelectorAll('.wheel').forEach(w => w.style.animationPlayState = 'running');
    } else {
      // No axle slips: road speed is proportional to total power
      if (pTotal < 15) {
        viewport.style.animationPlayState = 'paused';
        document.querySelectorAll('.wheel').forEach(w => w.style.animationPlayState = 'paused');
      } else {
        viewport.style.animationPlayState = 'running';
        const duration = Math.max(0.3, 2.0 - (pTotal / 150));
        viewport.style.animationDuration = `${duration.toFixed(2)}s`;
        document.querySelectorAll('.wheel').forEach(w => w.style.animationPlayState = 'running');
      }
    }

    // Calculate vehicle overall energy efficiency (starts at 95% base, drops under load or slip)
    const loadLoss = 0.05 * Math.pow(pTotal / 300, 2);
    let efficiency = 95 - (loadLoss * 100);
    
    if (isSlippingFront) efficiency -= 20; // 20% penalty for front slip
    if (isSlippingRear) efficiency -= 20; // 20% penalty for rear slip
    
    // Keep efficiency in a reasonable 10% to 95% range
    efficiency = Math.max(10, Math.round(efficiency));

    valEfficiency.textContent = `${efficiency}%`;
    fillEfficiency.style.width = `${efficiency}%`;

    // Update the visual status banner text based on slip states
    tractionBanner.className = 'status-banner'; // reset
    if (isSlippingFront && isSlippingRear) {
      tractionBanner.classList.add('status-critical');
      bannerIconSymbol.textContent = '✗';
      bannerStatusTitle.textContent = 'DOUBLE AXLE SLIPPAGE';
      bannerStatusDesc.textContent = 'Traction loss on both axles! Vehicle stability compromised. System efficiency severely penalized.';
    } else if (isSlippingFront || isSlippingRear) {
      tractionBanner.classList.add('status-warning');
      bannerIconSymbol.textContent = '⚠';
      bannerStatusTitle.textContent = 'AXLE SLIPPAGE DETECTED';
      const slippingAxle = isSlippingFront ? 'FRONT' : 'REAR';
      bannerStatusDesc.textContent = `Excessive power on ${slippingAxle} axle exceeds dynamic friction limit. Reduce power or enable Auto Mode.`;
    } else {
      tractionBanner.classList.add('status-optimal');
      bannerIconSymbol.textContent = '✓';
      bannerStatusTitle.textContent = 'OPTIMAL TRACTION';
      bannerStatusDesc.textContent = 'All wheels maintaining contact. Dynamic weight distribution matches local friction limits.';
    }

    // Update variables on the Phase 2 page in real time
    if (p2Mass) {
      p2Mass.textContent = `${mass} kg`;
      p2Friction.textContent = friction.toFixed(1);
      p2LoadFront.textContent = `${loadFrontKg.toFixed(1)} kg (${(loadFrontKg / mass * 100).toFixed(0)}%)`;
      p2LoadRear.textContent = `${loadRearKg.toFixed(1)} kg (${(loadRearKg / mass * 100).toFixed(0)}%)`;
      p2LimitFront.textContent = `${pLimitFront.toFixed(1)} kW`;
      p2LimitRear.textContent = `${pLimitRear.toFixed(1)} kW`;

      const isSlippingFrontP2 = p1 > pLimitFront;
      const isSlippingRearP2 = p2 > pLimitRear;

      if (isSlippingFrontP2 || isSlippingRearP2) {
        p2StatusBox.className = 'verification-status-box slipping';
        p2StatusTitle.textContent = 'TRACTION SLIPPAGE DETECTED';
        
        let explanation = `On a surface with friction coefficient <strong>μ = ${friction.toFixed(1)}</strong>, the vehicle mass of <strong>${mass} kg</strong> is dynamically distributed as <strong>${loadFrontKg.toFixed(0)} kg</strong> on the front axle and <strong>${loadRearKg.toFixed(0)} kg</strong> on the rear axle. <br><br>`;
        
        if (isSlippingFrontP2 && isSlippingRearP2) {
          explanation += `The distributed power on both axles (Front P1: <strong>${p1.toFixed(1)} kW</strong>, Rear P2: <strong>${p2.toFixed(1)} kW</strong>) exceeds their respective traction capacities (Front Limit: <strong>${pLimitFront.toFixed(1)} kW</strong>, Rear Limit: <strong>${pLimitRear.toFixed(1)} kW</strong>), mathematically verifying <strong>double axle slip</strong>.`;
        } else if (isSlippingFrontP2) {
          explanation += `The front axle power (Front P1: <strong>${p1.toFixed(1)} kW</strong>) exceeds its limit of <strong>${pLimitFront.toFixed(1)} kW</strong>. The rear axle power (Rear P2: <strong>${p2.toFixed(1)} kW</strong>) is within its traction limit of <strong>${pLimitRear.toFixed(1)} kW</strong>, verifying <strong>front wheel slip</strong> only.`;
        } else {
          explanation += `The rear axle power (Rear P2: <strong>${p2.toFixed(1)} kW</strong>) exceeds its limit of <strong>${pLimitRear.toFixed(1)} kW</strong>. The front axle power (Front P1: <strong>${p1.toFixed(1)} kW</strong>) is within its traction limit of <strong>${pLimitFront.toFixed(1)} kW</strong>, verifying <strong>rear wheel slip</strong> only.`;
        }
        p2ExplanationText.innerHTML = explanation;
      } else {
        p2StatusBox.className = 'verification-status-box optimal';
        p2StatusTitle.textContent = 'TRACTION SATISFIED (NO SLIP)';
        p2ExplanationText.innerHTML = `On a surface with friction coefficient <strong>μ = ${friction.toFixed(1)}</strong>, the vehicle mass of <strong>${mass} kg</strong> is dynamically distributed as <strong>${loadFrontKg.toFixed(0)} kg</strong> front and <strong>${loadRearKg.toFixed(0)} kg</strong> rear. <br><br>The motor power outputs (Front P1: <strong>${p1.toFixed(1)} kW</strong>, Rear P2: <strong>${p2.toFixed(1)} kW</strong>) are within their respective traction limits (Front Limit: <strong>${pLimitFront.toFixed(1)} kW</strong>, Rear Limit: <strong>${pLimitRear.toFixed(1)} kW</strong>). Traction is mathematically satisfied.`;
      }
    }

    // Draw the vector canvas visualizer overlays
    const ctx = vectorCanvas.getContext('2d');
    const vRect = viewport.getBoundingClientRect();
    
    // Scale canvas to match the current viewport dimension
    vectorCanvas.width = vRect.width;
    vectorCanvas.height = vRect.height;
    
    // Clear canvas before drawing a new frame
    ctx.clearRect(0, 0, vectorCanvas.width, vectorCanvas.height);
    
    function drawWheelVectors(wheelElement, appliedPower, limitPower) {
      const wRect = wheelElement.getBoundingClientRect();
      // Center coordinates relative to the canvas viewport origin
      const cx = wRect.left - vRect.left + wRect.width / 2;
      const cy = wRect.top - vRect.top + wRect.height / 2;
      
      const powerPerWheel = appliedPower / 2;
      const limitPerWheel = limitPower / 2;
      const isSlipping = powerPerWheel > limitPerWheel;
      
      // Get the wheel normal load in kg for contact/suspension sizing
      const loadPerWheel = limitPower / (2 * friction * C_scale);
      
      // Draw tire contact footprint shadow below the tire
      const contactY = cy + wRect.height / 2;
      const rx = 13 + (loadPerWheel * 0.012);
      const ry = 4 + (loadPerWheel * 0.005);
      ctx.beginPath();
      ctx.ellipse(cx, contactY, rx, ry, 0, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(15, 23, 42, ${0.12 + (loadPerWheel / 1250) * 0.35})`; // dark footprint
      ctx.fill();
      
      // 2. Draw Suspension Load/Deflection Circle (blue ring centered on wheel)
      const compressionRadius = 22 + (loadPerWheel * 0.012);
      ctx.beginPath();
      ctx.arc(cx, cy, compressionRadius, 0, 2 * Math.PI);
      ctx.strokeStyle = `rgba(59, 130, 246, ${0.1 + (loadPerWheel / 1250) * 0.45})`; // blue compression outline
      ctx.lineWidth = 1.5 + (loadPerWheel / 1250) * 2;
      ctx.stroke();
      
      // Scale factor to translate kW to pixel lengths (comparable 1:1 scale)
      const scale = 0.55;
      const fLength = Math.max(5, Math.min(100, powerPerWheel * scale));
      const bLength = Math.max(5, Math.min(100, limitPerWheel * scale));
      
      // Parallel offsets so forward and backward arrows do not overlap
      const offset = 8;
      
      // 3. Draw FORWARD Green Arrow (Applied Motor Power Force)
      const fx = cx - offset;
      const fyStart = cy;
      const fyEnd = cy - fLength; // points UP (forward direction)
      
      ctx.beginPath();
      ctx.moveTo(fx, fyStart);
      ctx.lineTo(fx, fyEnd);
      ctx.strokeStyle = '#10b981'; // Green color for active force
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Draw forward arrow head
      ctx.beginPath();
      ctx.moveTo(fx - 4, fyEnd + 4);
      ctx.lineTo(fx, fyEnd);
      ctx.lineTo(fx + 4, fyEnd + 4);
      ctx.fillStyle = '#10b981';
      ctx.fill();
      
      // Draw BACKWARD resistance arrow (represents dynamic road friction limit)
      const bx = cx + offset;
      const byStart = cy;
      const byEnd = cy + bLength; // points DOWN (resisting force)
      
      ctx.beginPath();
      ctx.moveTo(bx, byStart);
      ctx.lineTo(bx, byEnd);
      ctx.strokeStyle = isSlipping ? '#ef4444' : '#94a3b8'; // Red if slipping, grey normally
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Draw backward arrow head
      ctx.beginPath();
      ctx.moveTo(bx - 4, byEnd - 4);
      ctx.lineTo(bx, byEnd);
      ctx.lineTo(bx + 4, byEnd - 4);
      ctx.fillStyle = isSlipping ? '#ef4444' : '#94a3b8';
      ctx.fill();
      
      // Draw a SLIP alert label on the canvas if limits are exceeded
      if (isSlipping) {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SLIP', cx, cy - fLength - 8);
      }
    }

    // Call vector drawing function for all four wheels
    drawWheelVectors(wheelFL, p1, pLimitFront);
    drawWheelVectors(wheelFR, p1, pLimitFront);
    drawWheelVectors(wheelRL, p2, pLimitRear);
    drawWheelVectors(wheelRR, p2, pLimitRear);
  }

  // Standard mouse drag and drop events for desktop browsers
  draggableWeights.forEach(block => {
    // Start drag
    block.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', e.target.id);
      e.target.classList.add('dragging');
    });
    
    // End drag
    block.addEventListener('dragend', (e) => {
      e.target.classList.remove('dragging');
    });

    // Simple click listener to return block to the shelf if clicked inside cargo slots
    block.addEventListener('click', () => {
      if (block.parentNode === cargoSlots) {
        shelfBlocks.appendChild(block);
        updateMassFromCargo();
      }
    });
  });

  // Shelf area drag handlers to put blocks back on the shelf
  weightShelf.addEventListener('dragover', (e) => {
    e.preventDefault();
  });
  
  weightShelf.addEventListener('drop', (e) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const block = document.getElementById(id);
    if (block && block.parentNode !== shelfBlocks) {
      shelfBlocks.appendChild(block);
      updateMassFromCargo();
    }
  });

  // Cargo hold drop area drag handlers
  cargoDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    cargoDropZone.classList.add('drag-over');
  });

  cargoDropZone.addEventListener('dragleave', () => {
    cargoDropZone.classList.remove('drag-over');
  });

  cargoDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    cargoDropZone.classList.remove('drag-over');
    const id = e.dataTransfer.getData('text/plain');
    const block = document.getElementById(id);
    if (block && block.parentNode !== cargoSlots) {
      cargoSlots.appendChild(block);
      updateMassFromCargo();
    }
  });

  // Touch event handlers to support mobile browsers (Safari on iOS & Chrome on Android)
  let activeTouchBlock = null;
  let touchOffsetX = 0;
  let touchOffsetY = 0;
  let originalParent = null;

  draggableWeights.forEach(block => {
    block.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      activeTouchBlock = block;
      originalParent = block.parentNode;
      
      const rect = block.getBoundingClientRect();
      touchOffsetX = touch.clientX - rect.left;
      touchOffsetY = touch.clientY - rect.top;
      
      block.style.position = 'fixed';
      block.style.width = `${rect.width}px`;
      block.style.height = `${rect.height}px`;
      block.style.zIndex = '1000';
      block.style.pointerEvents = 'none'; // so we can detect what is underneath our finger
      
      updateTouchPosition(touch.clientX, touch.clientY);
    }, { passive: false });

    block.addEventListener('touchmove', (e) => {
      if (!activeTouchBlock) return;
      e.preventDefault(); // stop page scrolling while dragging weight blocks
      const touch = e.touches[0];
      updateTouchPosition(touch.clientX, touch.clientY);
    }, { passive: false });

    block.addEventListener('touchend', (e) => {
      if (!activeTouchBlock) return;
      const touch = e.changedTouches[0];
      
      block.style.position = '';
      block.style.width = '';
      block.style.height = '';
      block.style.zIndex = '';
      block.style.pointerEvents = '';
      
      const dropZoneRect = cargoDropZone.getBoundingClientRect();
      const shelfRect = weightShelf.getBoundingClientRect();
      
      const tx = touch.clientX;
      const ty = touch.clientY;
      
      // Check coordinates to see if touch dropped inside cargo or back on shelf
      if (tx >= dropZoneRect.left && tx <= dropZoneRect.right &&
          ty >= dropZoneRect.top && ty <= dropZoneRect.bottom) {
        if (block.parentNode !== cargoSlots) {
          cargoSlots.appendChild(block);
          updateMassFromCargo();
        }
      } else if (tx >= shelfRect.left && tx <= shelfRect.right &&
                 ty >= shelfRect.top && ty <= shelfRect.bottom) {
        if (block.parentNode !== shelfBlocks) {
          shelfBlocks.appendChild(block);
          updateMassFromCargo();
        }
      } else {
        originalParent.appendChild(block); // dropped outside, return to where it was
      }
      
      activeTouchBlock = null;
    }, { passive: false });
  });

  function updateTouchPosition(clientX, clientY) {
    if (!activeTouchBlock) return;
    activeTouchBlock.style.left = `${clientX - touchOffsetX}px`;
    activeTouchBlock.style.top = `${clientY - touchOffsetY}px`;
  }

  // Helper function to sum up weights in cargo hold and recalculate vehicle mass
  function updateMassFromCargo() {
    let cargoMass = 0;
    Array.from(cargoSlots.children).forEach(block => {
      cargoMass += parseFloat(block.getAttribute('data-weight')) || 0;
    });
    currentVehicleMass = 1500 + cargoMass;
    updateSimulation();
  }

  // Scroll locking function (locks scroll on desktop but enables scrolling on mobile layout)
  function applyResponsiveScrollLock() {
    const isPhase2 = document.body.classList.contains('phase2-active');
    if (isPhase2) {
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
      document.body.style.height = 'auto';
      document.documentElement.style.height = 'auto';
    } else {
      // Phase 1 scroll rules: lock on desktop with sufficient height, allow on short screens or mobile stacks
      if (window.innerWidth > 900 && window.innerHeight > 720) {
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        document.body.style.height = '100%';
        document.documentElement.style.height = '100%';
      } else {
        document.body.style.overflow = 'auto';
        document.documentElement.style.overflow = 'auto';
        document.body.style.height = 'auto';
        document.documentElement.style.height = 'auto';
      }
    }
  }

  // Phase toggling clicks to switch screens
  btnPhase1.addEventListener('click', () => {
    btnPhase2.classList.remove('active');
    btnPhase1.classList.add('active');
    document.body.classList.remove('phase2-active');
    phase2Section.classList.remove('active');
    window.scrollTo({ top: 0 });
    applyResponsiveScrollLock();
  });

  btnPhase2.addEventListener('click', () => {
    btnPhase1.classList.remove('active');
    btnPhase2.classList.add('active');
    document.body.classList.add('phase2-active');
    phase2Section.classList.add('active');
    window.scrollTo({ top: 0 });
    applyResponsiveScrollLock();
  });

  // Run scroll lock checking on start
  applyResponsiveScrollLock();

  // Listeners for user input changes
  inputFriction.addEventListener('change', updateSimulation);
  inputAuto.addEventListener('change', updateSimulation);
  inputP1.addEventListener('input', updateSimulation);
  inputP2.addEventListener('input', updateSimulation);
  window.addEventListener('resize', () => {
    updateSimulation();
    applyResponsiveScrollLock();
  });

  // Calculate once on load to show starting state
  updateSimulation();
});
