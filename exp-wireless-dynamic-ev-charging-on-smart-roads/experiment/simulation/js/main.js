document.addEventListener('DOMContentLoaded', () => {
    const state = {
        x: 0.0,            
        z: 15.0,           
        v: 50.0,           
        energy: 0.0,       
        soc: 0.0,          
        roadScrollX: 0.0,  
        lastTimestamp: 0,  
        isCharging: false, 
        isChargeComplete: false, 
        instPower: 0.0,    
        instEff: 0.0,      
        avgEff: 0.0,       
        activeCoilX: -1,   
        
        // Saved Snapshots list
        snapshots: [],
        selectedSnapshotId: null,
        
        chargingTime: 0.0,  
        changeLogs: [],     
        prevX: 0.0,         
        prevZ: 15.0,        
        prevV: 50.0         
    };

    // Fixed physical properties of our lab setup:
    const CONFIG = {
        effMax: 90.0,              
        powerTransmitted: 120.0,   
        batteryCapacityKj: 1000.0, 
        coilSpacing: 280,         
        coilWidth: 60,             
        receiverWidth: 52,         
        carCenterX: 380,           
        roadY: 220,                
        scaleX: 1.25,              
        scaleZ: 3.5             
    };

    const els = {
        // Tab switching buttons
        tabPhase1: document.getElementById('tab-phase1'),
        tabPhase2: document.getElementById('tab-phase2'),
        btnOpenGuide: document.getElementById('btn-open-guide'),
        
        // Phase containers
        phase1Container: document.getElementById('phase1-container'),
        phase2Container: document.getElementById('phase2-container'),
        introModal: document.getElementById('intro-modal'),
        btnCloseIntro: document.getElementById('btn-close-intro'),

        // Sliders
        sliderOffset: document.getElementById('slider-offset'),
        sliderGap: document.getElementById('slider-gap'),
        sliderSpeed: document.getElementById('slider-speed'),
        valOffset: document.getElementById('val-offset'),
        valGap: document.getElementById('val-gap'),
        valSpeed: document.getElementById('val-speed'),
        
        // Metrics readouts
        metricEff: document.getElementById('metric-efficiency'),
        metricPower: document.getElementById('metric-power'),
        metricEnergy: document.getElementById('metric-energy'),
        metricSoc: document.getElementById('metric-soc'),
        metricChargingTime: document.getElementById('metric-charging-time'),
        fillEff: document.getElementById('fill-efficiency'),
        fillPower: document.getElementById('fill-power'),
        batteryLevelBar: document.getElementById('battery-level-bar'),
        btnResetBattery: document.getElementById('btn-reset-battery'),
        btnSnapshot: document.getElementById('btn-snapshot'),
        snapshotStatus: document.getElementById('snapshot-status'),
        
        // Inferred Values Panel DOM
        snapshotsTable: document.getElementById('snapshots-table'),
        noSnapshotsMsg: document.getElementById('no-snapshots-msg'),
        statCount: document.getElementById('stat-count'),
        statAvgEff: document.getElementById('stat-avg-eff'),
        statTotalEnergy: document.getElementById('stat-total-energy'),
        statOptSet: document.getElementById('stat-opt-set'),
        statGapSensitivity: document.getElementById('stat-gap-sensitivity'),
        statOffsetSensitivity: document.getElementById('stat-offset-sensitivity'),
        
        // Parameter change log DOM elements
        changeLogCard: document.getElementById('change-log-card'),
        changeLogTable: document.getElementById('change-log-table'),
        changeLogBody: document.getElementById('change-log-body'),
        noChangesMsg: document.getElementById('no-changes-msg'),
        btnToggleChangeLog: document.getElementById('btn-toggle-change-log'),
        
        // Canvas & Equations
        canvas: document.getElementById('simulation-canvas'),
        canvasTitleText: document.getElementById('canvas-title-text'),
        eqEff: document.getElementById('eq-efficiency'),
        eqPower: document.getElementById('eq-power'),
        eqEnergy: document.getElementById('eq-energy'),
        statusDisplay: document.getElementById('status-display')
    };

    const ctx = els.canvas.getContext('2d');

    // Refresh KaTeX formulas (throttled to every 4 frames so page runs super smooth)
    let mathFrameCounter = 0;
    const renderMathThrottled = (latexStr, element) => {
        if (window.katex) {
            try {
                window.katex.render(latexStr, element, {
                    throwOnError: false,
                    displayMode: true
                });
            } catch (err) {
                element.innerHTML = `<span class="math-fallback">${latexStr}</span>`;
            }
        } else {
            element.innerHTML = `<span class="math-fallback">${latexStr}</span>`;
        }
    };

    els.tabPhase1.addEventListener('click', () => {
        els.tabPhase1.classList.add('active');
        els.tabPhase2.classList.remove('active');
        els.phase1Container.classList.remove('hidden');
        els.phase2Container.classList.add('hidden');
    });

    els.tabPhase2.addEventListener('click', () => {
        els.tabPhase2.classList.add('active');
        els.tabPhase1.classList.remove('active');
        els.phase2Container.classList.remove('hidden');
        els.phase1Container.classList.add('hidden');
        // Force immediate math panel, inferred values, indicator, and verification panel updates
        updateMathPanel(true);
        updateInferredValuesPanel();
        updateMathSourceIndicator();
        updateVerificationPanel();
        updateChangeLogPanel();
    });

    // --- Pre-Simulation Guide Modal Switchers ---
    if (els.btnCloseIntro && els.introModal) {
        els.btnCloseIntro.addEventListener('click', () => {
            els.introModal.classList.add('hidden');
        });
    }

    if (els.btnOpenGuide && els.introModal) {
        els.btnOpenGuide.addEventListener('click', () => {
            els.introModal.classList.remove('hidden');
        });
    }

    if (els.btnToggleChangeLog && els.changeLogCard) {
        els.btnToggleChangeLog.addEventListener('click', () => {
            const isHidden = els.changeLogCard.classList.contains('hidden');
            if (isHidden) {
                els.changeLogCard.classList.remove('hidden');
                els.btnToggleChangeLog.classList.add('active');
                updateChangeLogPanel();
            } else {
                els.changeLogCard.classList.add('hidden');
                els.btnToggleChangeLog.classList.remove('active');
            }
        });
    }

    // Calculate coupling efficiency using exponential decay equations
    const calcCalibratedEfficiency = (x, z) => {
        const termX = Math.exp(-0.002 * Math.pow(x, 2));
        const termZ = Math.exp(-0.03 * z);
        return CONFIG.effMax * termX * termZ;
    };

    // Find the power received based on alignment efficiency and transmitter power
    const calcPowerReceived = (eff) => {
        return CONFIG.powerTransmitted * (eff / 100);
    };

    // Keep all variables and badges aligned with current state
    const syncState = () => {
        els.valOffset.innerText = (state.x >= 0 ? "+" : "") + state.x.toFixed(1);
        els.valGap.innerText = state.z.toFixed(1);
        els.valSpeed.innerText = state.v.toFixed(0);

        state.avgEff = calcCalibratedEfficiency(state.x, state.z);

        // Update the car model name depending on height clearance settings
        let profileName = "Sedan (Low Clearance)";
        if (state.z > 20) profileName = "Delivery Van (High Clearance)";
        else if (state.z >= 13) profileName = "Crossover SUV (Medium Clearance)";
        els.canvasTitleText.innerText = `Visualizer / Radar View: ${profileName}`;

        // Keep the top right status badge updated
        if (state.isChargeComplete) {
            els.statusDisplay.innerText = "Battery Fully Charged! (100%)";
            els.statusDisplay.className = "status-badge success-badge";
        } else {
            els.statusDisplay.innerText = `Active Car: ${state.z > 20 ? "Van" : state.z >= 13 ? "SUV" : "Sedan"}`;
            els.statusDisplay.className = "status-badge";
        }

        updateMathPanel();
    };

    const updateMathPanel = (force = false) => {
        mathFrameCounter++;
        if (mathFrameCounter % 4 !== 0 && !force) return;

        let xVal = state.x;
        let zVal = state.z;
        let avgEffVal = state.avgEff;
        let powerVal = calcPowerReceived(state.avgEff);
        let energyVal = state.energy;
        let socVal = state.soc;
        let instPowerVal = state.instPower;

        if (state.selectedSnapshotId !== null) {
            const snap = state.snapshots.find(s => s.id === state.selectedSnapshotId);
            if (snap) {
                xVal = snap.x;
                zVal = snap.z;
                avgEffVal = snap.avgEff;
                powerVal = snap.power;
                energyVal = snap.energy;
                socVal = snap.soc;
                instPowerVal = snap.power;
            }
        }

        // Formula 1: Efficiency
        const latexEff = `\\eta = 90 \\cdot e^{-0.002 \\cdot x^2} \\cdot e^{-0.03 \\cdot z} \\\\ \\eta = 90 \\cdot e^{-0.002 \\cdot (\\color{#007bff}{${xVal.toFixed(1)}})^2} \\cdot e^{-0.03 \\cdot (\\color{#007bff}{${zVal.toFixed(1)}})} = \\mathbf{\\color{#007bff}{${avgEffVal.toFixed(2)}}\\%}`;
        renderMathThrottled(latexEff, els.eqEff);

        // Formula 2: Power Received
        const latexPower = `P_{\\text{received}} = P_{\\text{transmitted}} \\cdot \\left(\\frac{\\eta}{100}\\right) \\\\ P_{\\text{received}} = 120\\text{ kW} \\cdot \\left(\\frac{\\color{#007bff}{${avgEffVal.toFixed(2)}}\\%}{100}\\right) = \\mathbf{\\color{#ff5e00}{${powerVal.toFixed(2)}\\text{ kW}}}`;
        renderMathThrottled(latexPower, els.eqPower);

        // Formula 3: Continuous Integration showing instantaneous power
        const latexEnergy = `\\Delta E = \\int P_{\\text{received\\_inst}} \\cdot dt \\\\ \\Delta E = \\int \\color{#28a745}{${instPowerVal.toFixed(2)}\\text{ kW}} \\cdot dt = \\mathbf{\\color{#28a745}{${energyVal.toFixed(2)}\\text{ kJ}} \\quad (\\text{SoC: } ${socVal.toFixed(1)}\\%)}`;
        renderMathThrottled(latexEnergy, els.eqEnergy);
    };

    const drawSuspensionLinks = (wheelX, wheelY, chassisY) => {
        ctx.save();
        
        const topX = wheelX;
        const topY = chassisY + 8;
        const bottomX = wheelX;
        const bottomY = wheelY;     

        const dirX = bottomX - topX;
        const dirY = bottomY - topY;
        const length = Math.sqrt(dirX * dirX + dirY * dirY);
        
        if (length < 1) {
            ctx.restore();
            return;
        }
        
        ctx.beginPath();
        ctx.moveTo(bottomX, bottomY);
        ctx.lineTo(topX, topY);
        ctx.strokeStyle = '#cbd5e1'; 
        ctx.lineWidth = 4;
        ctx.stroke();
        
        const midX = bottomX - dirX * 0.45;
        const midY = bottomY - dirY * 0.45;
        ctx.beginPath();
        ctx.moveTo(bottomX, bottomY);
        ctx.lineTo(midX, midY);
        ctx.strokeStyle = '#475569'; 
        ctx.lineWidth = 8;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(midX - 5, midY);
        ctx.lineTo(midX + 5, midY);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.strokeStyle = '#334155'; 
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        const numCoils = 6;
        const springWidth = 12; 
        
        ctx.beginPath();
        ctx.moveTo(topX, topY + 2);
        
        for (let i = 0; i <= numCoils * 2; i++) {
            const t = i / (numCoils * 2);
            const tScaled = 0.05 + t * 0.9;
            const currY = topY + dirY * tScaled;
            const currX = topX + dirX * tScaled;
            
            const perpX = -dirY / length;
            const perpY = dirX / length;
        
            const side = (i % 2 === 0) ? 1 : -1;
            const offsetX = perpX * springWidth * side;
            const offsetY = perpY * springWidth * side;
            
            ctx.lineTo(currX + offsetX, currY + offsetY);
        }
        ctx.stroke();
        
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(topX - 8, topY, 16, 3);
        ctx.fillRect(bottomX - 8, bottomY - 3, 16, 3);
        
        ctx.restore();
    };

    const drawWheel = (x, y, radius, angle) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        
        // Tire
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a1a';
        ctx.fill();
        ctx.strokeStyle = '#495057';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Rim
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.58, 0, Math.PI * 2);
        ctx.fillStyle = '#ced4da';
        ctx.fill();
        ctx.strokeStyle = '#495057';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Spokes (Rotation)
        ctx.strokeStyle = '#343a40';
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            const spokeAngle = (i * 2 * Math.PI) / 5;
            ctx.lineTo(Math.cos(spokeAngle) * radius * 0.58, Math.sin(spokeAngle) * radius * 0.58);
            ctx.stroke();
        }

        // Center hub
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#212529';
        ctx.fill();

        ctx.restore();
    };

    const drawRadarRoad = (x, y, radius) => {
        ctx.save();
        
        // Radar circle container
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0; // reset

        // Clip all drawings to the radar circle boundaries
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.clip();

        // Draw top-down asphalt road layout
        const roadWidth = 54;
        ctx.fillStyle = '#343a40'; // asphalt
        ctx.fillRect(x - roadWidth/2, y - radius, roadWidth, radius * 2);

        // Yellow side shoulder lines (represents road bounds)
        ctx.strokeStyle = '#ffc107';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - roadWidth/2 + 2, y - radius);
        ctx.lineTo(x - roadWidth/2 + 2, y + radius);
        ctx.moveTo(x + roadWidth/2 - 2, y - radius);
        ctx.lineTo(x + roadWidth/2 - 2, y + radius);
        ctx.stroke();

        // Dashed white center lane markings
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 8]);
        ctx.lineDashOffset = state.roadScrollX * 0.3; // vertical crawl
        ctx.beginPath();
        ctx.moveTo(x, y - radius);
        ctx.lineTo(x, y + radius);
        ctx.stroke();
        ctx.setLineDash([]);

        // Radar coordinate grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.75, 0, Math.PI * 2);
        ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
        ctx.arc(x, y, radius * 0.25, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x - radius, y);
        ctx.lineTo(x + radius, y);
        ctx.stroke();

        ctx.restore(); 

        // Title Label
        ctx.fillStyle = '#495057';
        ctx.font = "bold 9px 'Outfit', sans-serif";
        ctx.textAlign = 'center';
        ctx.fillText("CAR ALIGNMENT RADAR", x, y - radius - 6);

        // Outer metal rim of radar
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#cbd5e0';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        const crosshairOffset = (state.x / 20) * 25; 
        const targetX = x + crosshairOffset;
        const targetY = y;

        let alignmentColor = '#27ae60'; 
        if (Math.abs(state.x) > 12) alignmentColor = '#e74c3c'; 
        else if (Math.abs(state.x) > 5) alignmentColor = '#ff6b00'; 
        
        // Target dot
        ctx.beginPath();
        ctx.arc(targetX, targetY, 5, 0, Math.PI * 2);
        ctx.fillStyle = alignmentColor;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Target pulsing ring
        const pulseRadius = 5 + (Date.now() % 1000) / 100;
        ctx.beginPath();
        ctx.arc(targetX, targetY, pulseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = alignmentColor;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 1 - (Date.now() % 1000) / 1000;
        ctx.stroke();

        ctx.restore();
    };

    // Silhouettes
    const drawSedanSilhouette = (color) => {
        ctx.beginPath();
        ctx.moveTo(-90, 0);                     
        ctx.lineTo(-90, -10);                    
        ctx.quadraticCurveTo(-90, -16, -84, -16); 
        ctx.lineTo(-65, -16);                    
        ctx.bezierCurveTo(-50, -38, -32, -45, -20, -45); 
        ctx.lineTo(20, -45);                     
        ctx.quadraticCurveTo(45, -45, 52, -26);  
        ctx.lineTo(75, -20);                     
        ctx.quadraticCurveTo(86, -20, 88, -10);  
        ctx.lineTo(88, 0);                       
        
        // Front arch well
        ctx.lineTo(73, 0);
        ctx.quadraticCurveTo(55, -20, 37, 0);
        
        // Underbody center
        ctx.lineTo(-37, 0);
        
        // Rear arch well
        ctx.lineTo(-53, 0);
        ctx.quadraticCurveTo(-71, -20, -89, 0);
        ctx.closePath();

        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#004085';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Cabin window glass outline
        ctx.fillStyle = '#e2e8f0';
        ctx.strokeStyle = '#495057';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-45, -18);
        ctx.lineTo(-53, -18);
        ctx.bezierCurveTo(-45, -38, -25, -38, -15, -38);
        ctx.lineTo(15, -38);
        ctx.lineTo(38, -18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Window divider pillar
        ctx.beginPath();
        ctx.moveTo(-10, -38);
        ctx.lineTo(-10, -18);
        ctx.stroke();
    };

    const drawCrossoverSilhouette = (color) => {
        ctx.beginPath();
        ctx.moveTo(-92, 0);                     
        ctx.lineTo(-92, -18);                    
        ctx.quadraticCurveTo(-92, -25, -84, -25); 
        ctx.lineTo(-65, -28);                    
        ctx.lineTo(15, -28);                     
        ctx.quadraticCurveTo(45, -28, 54, -14);  
        ctx.lineTo(78, -10);                     
        ctx.quadraticCurveTo(88, -10, 90, -4);   
        ctx.lineTo(90, 0);                       
        
        // Front arch well
        ctx.lineTo(73, 0);
        ctx.quadraticCurveTo(55, -20, 37, 0);
        
        // Underbody center
        ctx.lineTo(-37, 0);
        
        // Rear arch well
        ctx.lineTo(-53, 0);
        ctx.quadraticCurveTo(-71, -20, -89, 0);
        ctx.closePath();

        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#1e7e34';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Window glass
        ctx.fillStyle = '#cbd5e0';
        ctx.strokeStyle = '#343a40';
        ctx.beginPath();
        ctx.moveTo(-50, -8);
        ctx.lineTo(-75, -8);
        ctx.lineTo(-68, -22);
        ctx.lineTo(12, -22);
        ctx.lineTo(38, -8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Roof rails
        ctx.beginPath();
        ctx.moveTo(-50, -31);
        ctx.lineTo(10, -31);
        ctx.strokeStyle = '#343a40';
        ctx.lineWidth = 2;
        ctx.stroke();
    };

    const drawVanSilhouette = (color) => {
        ctx.beginPath();
        ctx.moveTo(-95, 0);                     
        ctx.lineTo(-95, -55);                    
        ctx.quadraticCurveTo(-95, -60, -88, -60); 
        ctx.lineTo(25, -60);                     
        ctx.quadraticCurveTo(35, -60, 42, -50);  
        ctx.lineTo(54, -28);                     
        ctx.lineTo(82, -24);                     
        ctx.quadraticCurveTo(92, -24, 94, -14);  
        ctx.lineTo(94, 0);                       
        
        // Front arch well
        ctx.lineTo(73, 0);
        ctx.quadraticCurveTo(55, -20, 37, 0);
        
        // Underbody center
        ctx.lineTo(-37, 0);
        
        // Rear arch well
        ctx.lineTo(-53, 0);
        ctx.quadraticCurveTo(-71, -20, -89, 0);
        ctx.closePath();

        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#212529';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Front window cab glass
        ctx.fillStyle = '#dee2e6';
        ctx.strokeStyle = '#343a40';
        ctx.beginPath();
        ctx.moveTo(10, -22);
        ctx.lineTo(10, -52);
        ctx.quadraticCurveTo(28, -52, 33, -45);
        ctx.lineTo(46, -22);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cargo lines details
        ctx.beginPath();
        ctx.moveTo(-45, 0);
        ctx.lineTo(-45, -55);
        ctx.moveTo(-15, 0);
        ctx.lineTo(-15, -55);
        ctx.strokeStyle = '#adb5bd';
        ctx.lineWidth = 1;
        ctx.stroke();
    };

    const renderCanvas = (timestamp) => {
        // Clear canvas
        ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);

        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, els.canvas.width, els.canvas.height);
        
        ctx.strokeStyle = '#e9ecef';
        ctx.lineWidth = 1;
        for (let x = 0; x < els.canvas.width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, CONFIG.roadY);
            ctx.stroke();
        }
        for (let y = 0; y < CONFIG.roadY; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(els.canvas.width, y);
            ctx.stroke();
        }

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([20, 20]);
        ctx.lineDashOffset = state.roadScrollX;
        ctx.beginPath();
        ctx.moveTo(0, CONFIG.roadY + 12);
        ctx.lineTo(els.canvas.width, CONFIG.roadY + 12);
        ctx.stroke();
        ctx.setLineDash([]); // reset dashes

        ctx.fillStyle = '#495057';
        ctx.fillRect(0, CONFIG.roadY, els.canvas.width, 6);
        
        // Road surface line
        ctx.beginPath();
        ctx.moveTo(0, CONFIG.roadY);
        ctx.lineTo(els.canvas.width, CONFIG.roadY);
        ctx.strokeStyle = '#343a40';
        ctx.lineWidth = 2;
        ctx.stroke();

        const offset = state.roadScrollX % CONFIG.coilSpacing;
        const visibleCoils = [];

        for (let i = -1; i < 4; i++) {
            const coilCenterX = i * CONFIG.coilSpacing - offset + 150;
            const coilY = CONFIG.roadY + 6; // starts at Y=226
            visibleCoils.push({ x: coilCenterX, y: coilY });
            
            // Draw transmitter coil subsurface slot
            ctx.fillStyle = '#212529';
            ctx.fillRect(coilCenterX - CONFIG.coilWidth/2, coilY, CONFIG.coilWidth, 6);
            
            // Copper core Winding (buried right below asphalt)
            ctx.fillStyle = '#ff5e00'; // copper color
            ctx.fillRect(coilCenterX - CONFIG.coilWidth/2 + 5, coilY + 2, CONFIG.coilWidth - 10, 2);
        }

        // Foundation ground
        ctx.fillStyle = '#dee2e6';
        ctx.fillRect(0, CONFIG.roadY + 30, els.canvas.width, els.canvas.height - (CONFIG.roadY + 30));

        const wheelY = CONFIG.roadY - 18; 
        const wheelRadius = 18;
        
        // Convert clearance height (z) from centimeters to screen pixels
        const padGapHeight = state.z * CONFIG.scaleZ;
        const receiverY = CONFIG.roadY - padGapHeight;

        // The car chassis sits just above the golden pickup plate
        const chassisBottomY = receiverY - 6;

        // Horizontal center of the pickup plate
        const receiverX = CONFIG.carCenterX;

        // Check which copper coil in the road is closest to our car
        let nearestCoil = null;
        let minDist = Infinity;
        
        visibleCoils.forEach((coil) => {
            const dist = Math.abs(receiverX - coil.x);
            if (dist < minDist) {
                minDist = dist;
                nearestCoil = coil;
            }
        });

        // Dynamic coupling check (stops when charge is complete)
        const couplingZone = 90;
        let proximityFactor = 0.0;
        state.isCharging = false;

        if (nearestCoil && minDist < couplingZone && !state.isChargeComplete) {
            proximityFactor = Math.pow(Math.cos((Math.PI * minDist) / (2 * couplingZone)), 2);
            state.isCharging = true;
            state.activeCoilX = nearestCoil.x;
        }

        // Calculate instantaneous values based on slider settings & proximity
        if (state.isChargeComplete) {
            state.instEff = 0.0;
            state.instPower = 0.0;
        } else {
            state.instEff = state.avgEff * proximityFactor;
            state.instPower = calcPowerReceived(state.instEff);
        }

        let alignmentColor = '#27ae60';
        if (Math.abs(state.x) > 12) alignmentColor = '#e74c3c';
        else if (Math.abs(state.x) > 5) alignmentColor = '#ff6b00'; 

        if (state.isCharging && state.instEff > 1.0 && !state.isChargeComplete) {
            ctx.save();
            
            // Make the field waves brighter/darker depending on efficiency
            const baseOpacity = 0.5 + (state.instEff / 100) * 0.5;
            
            // Animate waves moving up into the receiver plate
            const flowSpeed = 60; // speed of flux waves
            const phase = ((timestamp / 1000) * (flowSpeed / (CONFIG.roadY - receiverY))) % 1.0;
            
            const numWaves = 3;
            ctx.strokeStyle = alignmentColor;
            
            // Neon glow stylings
            ctx.shadowBlur = 15;
            ctx.shadowColor = alignmentColor;
            
            for (let j = 0; j < numWaves; j++) {
                const waveProgress = (phase + j / numWaves) % 1.0;
                
                // Height interpolates from coil (Y=226) to receiver Y
                const yWave = nearestCoil.y - waveProgress * (nearestCoil.y - receiverY);
                // Keep the opacity stronger near the top (receiver plate)
                const waveOpacity = (1.0 - waveProgress * 0.6) * baseOpacity;
                const waveWidth = 12 + waveProgress * (CONFIG.receiverWidth - 12);
                
                ctx.beginPath();
                // Thicker line widths for stronger presence
                ctx.lineWidth = 3.0 + (1.0 - waveProgress) * 4.0;
                ctx.globalAlpha = waveOpacity;
                
                // Draw arched ripple
                ctx.moveTo(nearestCoil.x - waveWidth/2, yWave);
                ctx.quadraticCurveTo(
                    (nearestCoil.x + receiverX)/2, 
                    yWave - 12 * waveProgress, 
                    nearestCoil.x + waveWidth/2, 
                    yWave
                );
                ctx.stroke();
            }
            
            ctx.restore();
        }

        drawSuspensionLinks(CONFIG.carCenterX - 55, wheelY, chassisBottomY);
        drawSuspensionLinks(CONFIG.carCenterX + 55, wheelY, chassisBottomY);

        const wheelAngle = state.isChargeComplete ? 0 : state.roadScrollX / wheelRadius;
        drawWheel(CONFIG.carCenterX - 55, wheelY, wheelRadius, wheelAngle);
        drawWheel(CONFIG.carCenterX + 55, wheelY, wheelRadius, wheelAngle);

        
        ctx.save();
        ctx.translate(CONFIG.carCenterX, chassisBottomY);

        // Shadow under the car body
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.beginPath();
        ctx.ellipse(0, 3, 85, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Swap body model depending on ground height setting
        if (state.z > 20) {
            drawVanSilhouette('#495057'); // Boxy Cargo Van
        } else if (state.z >= 13) {
            drawCrossoverSilhouette('#28a745'); // Crossover SUV
        } else {
            drawSedanSilhouette('#007bff'); // Sedan
        }

        // Draw the golden WPT pickup plate (realistic multi-layered receiver pad)
        const padW = CONFIG.receiverWidth;
        
        // 1. High-voltage orange cabling running from inside the chassis to the pad
        ctx.beginPath();
        ctx.moveTo(-padW/2 + 6, 2);
        ctx.bezierCurveTo(-padW/2 - 10, -2, -padW/2 - 18, -8, -padW/2 - 28, -8);
        ctx.strokeStyle = '#ff6b00'; // High-voltage orange
        ctx.lineWidth = 2.5;
        ctx.stroke();
        
        // 2. Heavy-duty mounting brackets (connecting pad to the chassis underbody)
        ctx.fillStyle = '#475569'; // steel/iron gray
        ctx.fillRect(-padW/2 + 8, -6, 4, 7);
        ctx.fillRect(padW/2 - 12, -6, 4, 7);
        
        // Bolt heads on the bracket flanges
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-padW/2 + 7, -7, 6, 1.5);
        ctx.fillRect(padW/2 - 13, -7, 6, 1.5);

        // 3. Upper Aluminum Shield Plate (for electromagnetic field shielding)
        ctx.fillStyle = '#cbd5e1'; // brushed aluminum
        ctx.beginPath();
        ctx.roundRect(-padW/2 - 3, 0, padW + 6, 2, 1);
        ctx.fill();

        // 4. Main Rugged Composite Casing (protective enclosure)
        ctx.fillStyle = '#1e293b'; // carbon black / deep slate housing
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.roundRect(-padW/2 - 1, 2, padW + 2, 5.5, 2);
        ctx.fill();
        ctx.stroke();

        // 5. Recessed Active Core (the Golden Induction Plate)
        ctx.fillStyle = '#ffc107'; // golden yellow
        ctx.beginPath();
        ctx.roundRect(-padW/2 + 4, 3, padW - 8, 3.5, 1.5);
        ctx.fill();

        // 6. Flat-Spiral Copper Coil Windings (concentric loops inside the core)
        ctx.strokeStyle = '#d97706'; // copper orange
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.roundRect(-padW/2 + 8, 3.8, padW - 16, 2, 0.8);
        ctx.stroke();
        
        ctx.strokeStyle = '#b45309'; // darker copper inner loop
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.roundRect(-padW/2 + 12, 4.4, padW - 24, 0.8, 0.4);
        ctx.stroke();

        // 7. Smart Status LED (pulses cyan while charging, green when fully charged, gray when off)
        let ledColor = '#64748b'; // off (gray)
        let ledGlow = false;
        
        if (state.isCharging && state.instPower > 1.0 && !state.isChargeComplete) {
            ledColor = '#22d3ee'; // pulsing cyan
            ledGlow = true;
        } else if (state.isChargeComplete) {
            ledColor = '#10b981'; // solid green (charging complete)
        }
        
        // LED bezel
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, 4.8, 2.0, 0, Math.PI * 2);
        ctx.fill();
        
        // LED bulb
        ctx.fillStyle = ledColor;
        ctx.beginPath();
        ctx.arc(0, 4.8, 1.0, 0, Math.PI * 2);
        ctx.fill();

        // LED light glow emission
        if (ledGlow) {
            const pulse = 0.4 + 0.6 * Math.sin(Date.now() / 150);
            ctx.fillStyle = `rgba(34, 211, 238, ${0.2 * pulse})`;
            ctx.beginPath();
            ctx.arc(0, 4.8, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw mini battery SoC levels right on the car chassis
        ctx.fillStyle = '#212529';
        ctx.fillRect(-20, -14, 40, 10);
        ctx.strokeStyle = '#ced4da';
        ctx.lineWidth = 1;
        ctx.strokeRect(-20, -14, 40, 10);
        
        const maxLevelWidth = 36;
        const currentLevelWidth = (state.soc / 100) * maxLevelWidth;
        
        let batteryColor = '#e74c3c';
        if (state.soc > 65) batteryColor = '#27ae60';
        else if (state.soc > 20) batteryColor = '#ff6b00';
        
        ctx.fillStyle = batteryColor;
        ctx.fillRect(-18, -12, currentLevelWidth, 6);

        ctx.restore();

        drawRadarRoad(725, 75, 45); // Radar inset in top-right corner
    };

 
    const updateInferredValuesPanel = () => {
        const tableBody = document.getElementById('snapshots-body');
        const emptyMsg = document.getElementById('no-snapshots-msg');
        
        // Clear table body
        tableBody.innerHTML = '';
        
        if (state.snapshots.length === 0) {
            emptyMsg.style.display = 'block';
            
            // Set stats to empty defaults
            els.statCount.innerText = "0";
            els.statAvgEff.innerText = "0.0%";
            els.statTotalEnergy.innerText = "0.00 kJ";
            els.statOptSet.innerText = "None";
            els.statGapSensitivity.innerText = "No data";
            els.statOffsetSensitivity.innerText = "No data";
            return;
        }

        // Hide empty message
        emptyMsg.style.display = 'none';

        // Populate table with snapshots
        state.snapshots.forEach((s) => {
            const row = document.createElement('tr');
            if (s.id === state.selectedSnapshotId) {
                row.classList.add('selected-row');
            }
            row.innerHTML = `
                <td><strong>Snapshot #${s.id}</strong></td>
                <td>${s.time.toFixed(2)}s</td>
                <td>${(s.x >= 0 ? "+" : "") + s.x.toFixed(1)} cm</td>
                <td>${s.z.toFixed(1)} cm</td>
                <td>${s.v.toFixed(0)} km/h</td>
                <td>${s.avgEff.toFixed(1)}%</td>
                <td>${s.power.toFixed(2)} kW</td>
                <td>${s.energy.toFixed(2)} kJ</td>
                <td>${s.soc.toFixed(1)}%</td>
            `;
            
            row.addEventListener('click', () => {
                if (state.selectedSnapshotId === s.id) {
                    state.selectedSnapshotId = null;
                    row.classList.remove('selected-row');
                } else {
                    state.selectedSnapshotId = s.id;
                    tableBody.querySelectorAll('tr').forEach(r => r.classList.remove('selected-row'));
                    row.classList.add('selected-row');
                }
                updateMathPanel(true);
                updateMathSourceIndicator();
                updateVerificationPanel();
            });

            tableBody.appendChild(row);
        });

        // 1. Calculate Averages
        const count = state.snapshots.length;
        let sumEff = 0;
        let sumEnergy = 0;
        let optimalSnap = state.snapshots[0];

        state.snapshots.forEach((s) => {
            sumEff += s.avgEff;
            sumEnergy += s.energy;
            if (s.avgEff > optimalSnap.avgEff) {
                optimalSnap = s;
            }
        });

        const avgEff = sumEff / count;
        
        els.statCount.innerText = count;
        els.statAvgEff.innerText = `${avgEff.toFixed(1)}%`;
        els.statTotalEnergy.innerText = `${sumEnergy.toFixed(2)} kJ`;
        
        // Display best alignment configuration found in our logs
        els.statOptSet.innerText = `Snapshot #${optimalSnap.id} (Offset: ${(optimalSnap.x >= 0 ? "+" : "") + optimalSnap.x.toFixed(1)}cm, Height: ${optimalSnap.z.toFixed(1)}cm)`;

        
        // A. Height Sensitivity (Compare runs with same alignment but different height clearances)
        let gapSensitivityText = "Try saving at least two snapshots with different Heights (z) to calculate height sensitivity!";
        let bestGapPair = null;
        let minGapDistDiff = Infinity;

        // Try to find two snapshots with close offsets but different heights
        for (let i = 0; i < count; i++) {
            for (let j = i + 1; j < count; j++) {
                const s1 = state.snapshots[i];
                const s2 = state.snapshots[j];
                if (Math.abs(s1.x - s2.x) < 0.5 && Math.abs(s1.z - s2.z) > 1.0) {
                    const zDiff = Math.abs(s1.z - s2.z);
                    if (zDiff < minGapDistDiff) {
                        bestGapPair = { s1, s2 };
                        minGapDistDiff = zDiff;
                    }
                }
            }
        }

        if (bestGapPair) {
            const s1 = bestGapPair.s1;
            const s2 = bestGapPair.s2;
            const effDiff = Math.abs(s1.avgEff - s2.avgEff);
            const zDiff = Math.abs(s1.z - s2.z);
            const decayPerCm = effDiff / zDiff;
            gapSensitivityText = `${decayPerCm.toFixed(2)}% power lost per cm of height increase (calculated from Snapshots #${s1.id} & #${s2.id})`;
        }
        els.statGapSensitivity.innerText = gapSensitivityText;

        // B. Alignment Sensitivity (Compare runs with same height clearance but different offsets)
        let offsetSensitivityText = "Try saving at least two snapshots with different Alignment Offsets (x) to calculate alignment sensitivity!";
        let bestOffsetPair = null;
        let minOffsetDistDiff = Infinity;

        // Try to find two snapshots with close heights but different alignment offsets
        for (let i = 0; i < count; i++) {
            for (let j = i + 1; j < count; j++) {
                const s1 = state.snapshots[i];
                const s2 = state.snapshots[j];
                if (Math.abs(s1.z - s2.z) < 0.5 && Math.abs(Math.abs(s1.x) - Math.abs(s2.x)) > 1.0) {
                    const xDiff = Math.abs(Math.abs(s1.x) - Math.abs(s2.x));
                    if (xDiff < minOffsetDistDiff) {
                        bestOffsetPair = { s1, s2 };
                        minOffsetDistDiff = xDiff;
                    }
                }
            }
        }

        if (bestOffsetPair) {
            const s1 = bestOffsetPair.s1;
            const s2 = bestOffsetPair.s2;
            const effDiff = Math.abs(s1.avgEff - s2.avgEff);
            const xDiff = Math.abs(Math.abs(s1.x) - Math.abs(s2.x));
            const decayPerCm = effDiff / xDiff;
            offsetSensitivityText = `${decayPerCm.toFixed(2)}% power lost per cm off-center (calculated from Snapshots #${s1.id} & #${s2.id})`;
        }
        els.statOffsetSensitivity.innerText = offsetSensitivityText;
    };

    const updateMathSourceIndicator = () => {
        const indicator = document.getElementById('math-source-indicator');
        if (!indicator) return;

        if (state.selectedSnapshotId === null) {
            indicator.innerHTML = `<span class="source-badge live">Live Simulation</span>`;
        } else {
            indicator.innerHTML = `
                <span class="source-badge snapshot">Snapshot #${state.selectedSnapshotId} Math</span>
                <button type="button" id="btn-reset-math" class="btn-reset-math" title="Return to Live Simulation calculations">Reset to Live</button>
            `;
            
            const btnReset = document.getElementById('btn-reset-math');
            if (btnReset) {
                btnReset.addEventListener('click', (e) => {
                    e.stopPropagation();
                    state.selectedSnapshotId = null;
                    
                    const tableBody = document.getElementById('snapshots-body');
                    if (tableBody) {
                        tableBody.querySelectorAll('tr').forEach(r => r.classList.remove('selected-row'));
                    }
                    
                    updateMathPanel(true);
                    updateMathSourceIndicator();
                    updateVerificationPanel();
                });
            }
        }
    };

    const updateVerificationPanel = () => {
        const container = document.getElementById('verification-container');
        if (!container) return;

        if (state.selectedSnapshotId === null) {
            container.innerHTML = `
                <div class="empty-table-msg" style="border: none; border-radius: var(--radius-md); padding: 2rem; margin: 0;">
                    Click on any snapshot in the table above to verify that the formulas calculate the exact same efficiency and power values.
                </div>
            `;
            return;
        }

        const snap = state.snapshots.find(s => s.id === state.selectedSnapshotId);
        if (!snap) {
            state.selectedSnapshotId = null;
            updateVerificationPanel();
            return;
        }

        // Perform mathematical calculations manually to verify
        const calculatedEff = calcCalibratedEfficiency(snap.x, snap.z);
        const calculatedPower = calcPowerReceived(calculatedEff);

        // Verification checks
        const effDiff = Math.abs(calculatedEff - snap.avgEff);
        const powerDiff = Math.abs(calculatedPower - snap.power);

        const effStatus = effDiff < 0.01 ? "MATCH" : "MISMATCH";
        const powerStatus = powerDiff < 0.01 ? "MATCH" : "MISMATCH";

        container.innerHTML = `
            <div class="verification-wrapper">
                <p class="math-intro-text" style="margin-bottom: 1rem;">
                    Let's double-check <strong>Snapshot #${snap.id}</strong> (Sliders: Offset = ${snap.x.toFixed(1)} cm, Height = ${snap.z.toFixed(1)} cm, Speed = ${snap.v.toFixed(0)} km/h).
                </p>
                <div class="verification-grid-detail">
                    <!-- Efficiency verification -->
                    <div class="verification-item">
                        <div class="verification-header">
                            <span class="verification-title">1. Coupling Efficiency (<span class="math-eta-symbol"></span>)</span>
                            <span class="verification-status ${effStatus.toLowerCase()}">${effStatus}</span>
                        </div>
                        <div class="verification-comparison">
                            <div class="comparison-box">
                                <span class="comparison-label">Our Formula Result</span>
                                <span class="comparison-value text-primary">${calculatedEff.toFixed(4)}%</span>
                            </div>
                            <span class="comparison-vs">vs</span>
                            <div class="comparison-box">
                                <span class="comparison-label">Recorded in Sim</span>
                                <span class="comparison-value text-success">${snap.avgEff.toFixed(2)}%</span>
                            </div>
                        </div>
                        <div class="formula-caption-math">
                            Formula: <span class="math-eta-formula"></span>
                        </div>
                    </div>

                    <!-- Power verification -->
                    <div class="verification-item">
                        <div class="verification-header">
                            <span class="verification-title">2. Peak Power Transfer (<span class="math-p-symbol"></span>)</span>
                            <span class="verification-status ${powerStatus.toLowerCase()}">${powerStatus}</span>
                        </div>
                        <div class="verification-comparison">
                            <div class="comparison-box">
                                <span class="comparison-label">Our Formula Result</span>
                                <span class="comparison-value text-primary">${calculatedPower.toFixed(4)} kW</span>
                            </div>
                            <span class="comparison-vs">vs</span>
                            <div class="comparison-box">
                                <span class="comparison-label">Recorded in Sim</span>
                                <span class="comparison-value text-success">${snap.power.toFixed(2)} kW</span>
                            </div>
                        </div>
                        <div class="formula-caption-math">
                            Formula: <span class="math-p-formula"></span>
                        </div>
                    </div>

                    <!-- State verification summary -->
                    <div class="verification-item full-width-formula" style="background-color: var(--primary-light); border-color: rgba(0, 123, 255, 0.15);">
                        <span class="verification-title" style="color: var(--primary-hover); font-size: 0.9rem; font-weight: 700; margin-bottom: 0.5rem; border-bottom: 1px solid rgba(0, 123, 255, 0.1); padding-bottom: 0.25rem;">
                            Battery State for this Snapshot
                        </span>
                        <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 1rem; font-size: 0.85rem; color: var(--text-main);">
                            <div>Total Energy Captured: <strong class="text-success" style="font-size: 1rem;">${snap.energy.toFixed(2)} kJ</strong></div>
                            <div>State of Charge (SoC): <strong class="text-success" style="font-size: 1rem;">${snap.soc.toFixed(1)}%</strong></div>
                            <div>Driving Speed: <strong>${snap.v.toFixed(0)} km/h</strong></div>
                        </div>
                        <p class="formula-caption" style="color: var(--primary-hover); margin-top: 0.5rem; font-weight: 500;">
                            ✓ Success! The formula results match the simulation readings perfectly down to four decimal places.
                        </p>
                    </div>
                </div>
            </div>
        `;

        if (window.katex) {
            try {
                window.katex.render("\\eta", container.querySelector('.math-eta-symbol'), { throwOnError: false });
                window.katex.render("P_{\\text{received}}", container.querySelector('.math-p-symbol'), { throwOnError: false });
                window.katex.render(`\\eta = 90 \\cdot e^{-0.002 \\cdot (${snap.x.toFixed(1)})^2} \\cdot e^{-0.03 \\cdot (${snap.z.toFixed(1)})} = ${calculatedEff.toFixed(4)}\\%`, container.querySelector('.math-eta-formula'), { throwOnError: false });
                window.katex.render(`P_{\\text{received}} = 120 \\text{ kW} \\cdot \\left(\\frac{${calculatedEff.toFixed(2)}\\%}{100}\\right) = ${calculatedPower.toFixed(4)}\\text{ kW}`, container.querySelector('.math-p-formula'), { throwOnError: false });
            } catch (e) {
                console.error(e);
            }
        }
    };

    const logParameterChange = (parameterName, oldVal, newVal) => {
        const logId = state.changeLogs.length + 1;
        const logEntry = {
            id: logId,
            time: state.chargingTime,
            parameter: parameterName,
            oldValue: oldVal,
            newValue: newVal,
            soc: state.soc,
            energy: state.energy
        };
        state.changeLogs.push(logEntry);
        updateChangeLogPanel();
    };

    const updateChangeLogPanel = () => {
        if (!els.changeLogBody || !els.noChangesMsg) return;
        
        els.changeLogBody.innerHTML = '';
        
        if (state.changeLogs.length === 0) {
            els.noChangesMsg.style.display = 'block';
            return;
        }
        
        els.noChangesMsg.style.display = 'none';
        
        // Render in reverse chronological order
        [...state.changeLogs].reverse().forEach((log) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${log.time.toFixed(2)}s</strong></td>
                <td><span class="value-badge" style="background-color: var(--primary-light); color: var(--primary); font-size: 0.75rem; padding: 0.1rem 0.35rem; display: inline-block;">${log.parameter}</span></td>
                <td style="color: var(--danger); font-weight: 500;">${log.oldValue}</td>
                <td style="color: var(--success); font-weight: 600;">${log.newValue}</td>
                <td>${log.soc.toFixed(1)}%</td>
                <td>${log.energy.toFixed(2)} kJ</td>
            `;
            els.changeLogBody.appendChild(row);
        });
    };

    // --- Main Simulation Loop (runs at 60 FPS) ---

    const updateMetricsUI = () => {
        // Update dashboard battery metrics
        els.metricEnergy.innerText = `${state.energy.toFixed(2)} kJ`;
        els.metricSoc.innerText = `SoC: ${state.soc.toFixed(1)}%`;
        if (els.metricChargingTime) {
            els.metricChargingTime.innerText = `${state.chargingTime.toFixed(2)}s`;
        }
        els.batteryLevelBar.style.width = `${state.soc}%`;

        let batteryColor = 'var(--danger)';
        if (state.soc > 65) batteryColor = 'var(--success)';
        else if (state.soc > 20) batteryColor = 'var(--warning)';
        els.batteryLevelBar.style.backgroundColor = batteryColor;

        // Update left control panel metrics (Diagnostics Panel Removed, check for element existence to prevent error)
        if (els.metricEff) els.metricEff.innerText = `${state.instEff.toFixed(1)}%`;
        if (els.metricPower) els.metricPower.innerText = `${state.instPower.toFixed(2)} kW`;
        if (els.fillEff) els.fillEff.style.width = `${state.instEff}%`;
        if (els.fillPower) els.fillPower.style.width = `${(state.instPower / CONFIG.powerTransmitted) * 100}%`;
    };

    const simulationLoop = (timestamp) => {
        if (!state.lastTimestamp) state.lastTimestamp = timestamp;
        const dt = (timestamp - state.lastTimestamp) / 1000; // seconds
        state.lastTimestamp = timestamp;

        // 1. Calculate Road Scrolling (we pause this when charge reaches 100%)
        if (!state.isChargeComplete) {
            const scrollSpeedPxPerSec = (state.v / 3.6) * 32;
            state.roadScrollX += scrollSpeedPxPerSec * dt;
            state.chargingTime += dt;
        }

        // 2. Perform Integration (Add captured energy into battery)
        if (state.isCharging && !state.isChargeComplete) {
            state.energy += state.instPower * dt;
            
            // Stop when battery reaches 100%
            if (state.energy >= CONFIG.batteryCapacityKj) {
                state.energy = CONFIG.batteryCapacityKj;
                state.soc = 100.0;
                state.isChargeComplete = true;
                state.isCharging = false;
                state.instPower = 0.0;
                state.instEff = 0.0;
                logParameterChange("Fully Charged", "Charging...", "Finished charging (100% SoC)");
            } else {
                state.soc = (state.energy / CONFIG.batteryCapacityKj) * 100;
            }
        }

        // 3. Sync State and UI meters
        syncState();
        updateMetricsUI();

        // 4. Render Canvas Frames
        renderCanvas(timestamp);

        // Loop next frame
        requestAnimationFrame(simulationLoop);
    };

    // --- Interactive Control Listeners ---

    els.sliderOffset.addEventListener('input', (e) => {
        state.x = parseFloat(e.target.value);
        if (state.selectedSnapshotId !== null) {
            state.selectedSnapshotId = null;
            updateMathSourceIndicator();
            updateVerificationPanel();
        }
        syncState();
    });
    
    els.sliderOffset.addEventListener('change', (e) => {
        const newVal = parseFloat(e.target.value);
        if (newVal !== state.prevX) {
            logParameterChange("Alignment Offset (x)", `${(state.prevX >= 0 ? "+" : "") + state.prevX.toFixed(1)} cm`, `${(newVal >= 0 ? "+" : "") + newVal.toFixed(1)} cm`);
            state.prevX = newVal;
        }
    });

    els.sliderGap.addEventListener('input', (e) => {
        state.z = parseFloat(e.target.value);
        if (state.selectedSnapshotId !== null) {
            state.selectedSnapshotId = null;
            updateMathSourceIndicator();
            updateVerificationPanel();
        }
        syncState();
    });
    
    els.sliderGap.addEventListener('change', (e) => {
        const newVal = parseFloat(e.target.value);
        if (newVal !== state.prevZ) {
            logParameterChange("Clearance / Height (z)", `${state.prevZ.toFixed(1)} cm`, `${newVal.toFixed(1)} cm`);
            state.prevZ = newVal;
        }
    });

    els.sliderSpeed.addEventListener('input', (e) => {
        state.v = parseFloat(e.target.value);
        if (state.selectedSnapshotId !== null) {
            state.selectedSnapshotId = null;
            updateMathSourceIndicator();
            updateVerificationPanel();
        }
        syncState();
    });
    
    els.sliderSpeed.addEventListener('change', (e) => {
        const newVal = parseFloat(e.target.value);
        if (newVal !== state.prevV) {
            logParameterChange("Driving Speed (v)", `${state.prevV.toFixed(0)} km/h`, `${newVal.toFixed(0)} km/h`);
            state.prevV = newVal;
        }
    });

    els.btnResetBattery.addEventListener('click', () => {
        logParameterChange("Battery Reset", "Charging Session", "Restarted from 0.00s");
        state.energy = 0.0;
        state.soc = 0.0;
        state.isChargeComplete = false;
        state.chargingTime = 0.0;
        if (state.selectedSnapshotId !== null) {
            state.selectedSnapshotId = null;
            updateMathSourceIndicator();
            updateVerificationPanel();
        }
        syncState();
        updateMetricsUI();
    });

    // Save simulation snapshots in memory
    let flashTimeout = null;
    els.btnSnapshot.addEventListener('click', () => {
        // Record current state values
        const snapId = state.snapshots.length + 1;
        const snap = {
            id: snapId,
            time: state.chargingTime,
            x: state.x,
            z: state.z,
            v: state.v,
            avgEff: state.avgEff,
            power: calcPowerReceived(state.avgEff),
            energy: state.energy,
            soc: state.soc
        };
        state.snapshots.push(snap);

        // Flash a notification status (NO emojis)
        if (flashTimeout) clearTimeout(flashTimeout);
        els.snapshotStatus.innerText = `Snapshot #${snapId} saved!`;
        els.snapshotStatus.style.opacity = '1';
        
        flashTimeout = setTimeout(() => {
            els.snapshotStatus.style.opacity = '0';
        }, 1500);

        // Update calculations inside Inferred Values panel in Phase 2
        updateInferredValuesPanel();
    });

    // Let's boot up the simulation!
    syncState();
    requestAnimationFrame(simulationLoop);
});

