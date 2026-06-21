document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const gridStatusDisplay = document.getElementById('gridStatusDisplay');
  const voltageSlider = document.getElementById('voltageSlider');
  const voltageVal = document.getElementById('voltageVal');
  const currentSlider = document.getElementById('currentSlider');
  const currentVal = document.getElementById('currentVal');
  const currentLabel = document.getElementById('currentLabel');
  const currentSliderLimitLabel = document.getElementById('currentSliderLimitLabel');
  const socSlider = document.getElementById('socSlider');
  const socVal = document.getElementById('socVal');
  const syncPhaseBtn = document.getElementById('syncPhaseBtn');
  const syncStatusBadge = document.getElementById('syncStatusBadge');
  const overrideBanner = document.getElementById('overrideBanner') || document.getElementById('safetyAlert');
  const safetyAlert = overrideBanner;
  
  // Progress elements (if they exist)
  const reductionProgressBar = document.getElementById('reductionProgressBar');
  const reductionProgressVal = document.getElementById('reductionProgressVal');
  const nodeSocText = document.getElementById('nodeSocText');

  // Telemetry Box fields
  const teleCalcPower = document.getElementById('teleCalcPower');
  const teleTargetPower = document.getElementById('teleTargetPower');
  const teleEfficiency = document.getElementById('teleEfficiency');
  const teleNetPower = document.getElementById('teleNetPower');
  const teleTemp = document.getElementById('teleTemp');

  // Logging and Reset
  const logTableBody = document.getElementById('logTableBody');
  const clearLogBtn = document.getElementById('clearLogBtn');
  const resetBenchBtn = document.getElementById('resetBenchBtn');

  // Advanced features DOM elements
  const stopSyncBtn = document.getElementById('stopSyncBtn');
  const statePanel = document.getElementById('statePanel');
  const stateLabel = document.getElementById('stateLabel');

  // --- Constants ---
  const SAFETY_TOLERANCE = 100;  // Safety sync range (W)

  // --- Simulation State ---
  const state = {
    stage: 1, // 1 = Tuning/Standby (Breaker Open), 2 = Active Loop (Breaker Closed)
    voltage: parseFloat(voltageSlider.value),
    currentSetting: parseFloat(currentSlider.value),
    batterySoc: parseFloat(socSlider.value),
    calculatedPower: 0,
    gridFluctuation: 0,
    arrowOffset: 0,
    socAccumulator: 0,
    isThrottled: false,
    lastTime: 0,
    loadReductionStatus: 0,
    
    // Mechanical Plug and Live Status Panel Integration
    IS_PLUG_CONNECTED: false,
    CURRENT_MODE: 'G2V', // Determined dynamically by Voltage slider
    SOC: parseFloat(socSlider.value),
    TARGET_POWER: 11500,
    GRID_STRESS_LEVEL: 100,
    CHART_INSTANCE: null,
    chartData: [],

    // Advanced features
    inverterFreq: 49.0,
    inverterPhase: -90.0,
    gridFreq: 50.0,
    gridPhase: 0.0,
    temp: 25.0,
    isThermalThrottled: false,
    isSynced: false,
    phaseDiff: -90.0,
    
    // Loophole Fix: Hysteresis emergency charge lock
    isLockedInEmergencyCharging: false,
    
    // Camera Zooming System
    targetCameraPos: new THREE.Vector3(10, 8, 10),
    targetControlsTarget: new THREE.Vector3(0, 0.5, 0),
    isAnimatingCamera: false,
    pointerDownPos: new THREE.Vector2(),
    pointerDownTime: 0
  };

  // Run initial parameter-driven flow direction logic setup
  if (state.voltage < 210) {
    if (state.SOC <= 50) {
      state.CURRENT_MODE = 'G2V';
    } else {
      state.CURRENT_MODE = 'V2G';
    }
  } else {
    state.CURRENT_MODE = 'G2V';
  }

  // --- Three.js Globals ---
  let scene, camera, renderer, controls;
  let carChassis, breakerArmGroup;
  let busbar1, busbar2, busbar3;
  let pilotBusbar1, pilotBusbar2, pilotBusbar3;
  let plugMesh, cableMesh;
  let batteryCanvas, batteryTexture;
  let invCanvas, invTexture;
  let gridCanvas, gridTexture;
  let statusCanvas, statusTexture;
  let statusMesh;
  let energyParticles = [];
  let batteryCasingMesh, batteryFillMesh;
  let greenLED, redLED, orangeLED;
  let inverterGlowL, inverterGlowR;
  let evGroup, inverterGroup, gridGroup;
  
  // Interaction variables
  let isDragging = false;
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const dragOffset = new THREE.Vector3();
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.6); // Drag plane at connection height
  const socketPos = new THREE.Vector3(-3.25, 0.6, 0.72);
  const bracketPos = new THREE.Vector3(0.5, 0.25, 1.8);
  const cableStartPos = new THREE.Vector3(3.7, 0.4, 0.4);

  // --- Helper: Format Power values nicely ---
  function formatPower(watts) {
    return Math.round(Math.abs(watts)).toLocaleString() + ' W';
  }

  // --- Helper: Format Power values with positive/negative direction signs ---
  function formatPowerWithSign(watts, mode) {
    if (Math.round(Math.abs(watts)) === 0) return '0 W';
    const sign = mode === 'V2G' ? '+' : '-';
    return sign + Math.round(Math.abs(watts)).toLocaleString() + ' W';
  }

  // --- Helper: Display Toast notices ---
  function showToast(message) {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.style.position = 'fixed';
      container.style.top = '20px';
      container.style.right = '20px';
      container.style.zIndex = '9999';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.gap = '10px';
      container.style.maxWidth = '300px';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast show';
    toast.style.background = '#1e293b';
    toast.style.color = '#ffffff';
    toast.style.padding = '12px 16px';
    toast.style.borderRadius = '4px';
    toast.style.fontSize = '12px';
    toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    toast.style.fontFamily = 'sans-serif';
    toast.innerHTML = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s ease';
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }

  // --- Helper: Add record row to Test Bench Log ---
  function appendLogRecord(modeText, v, i, netP, resultText, isOverride = false) {
    const emptyRow = logTableBody.querySelector('.empty-row');
    if (emptyRow) {
      emptyRow.remove();
    }

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const row = document.createElement('tr');
    
    let modeClass = 'log-v2g';
    if (modeText === 'G2V') modeClass = 'log-g2v';
    if (isOverride) modeClass = 'log-override';

    row.innerHTML = `
      <td>${timestamp}</td>
      <td><span class="${modeClass}">${modeText}</span></td>
      <td>${v} V</td>
      <td>${i} A</td>
      <td>${netP === 0 ? '0 W' : formatPowerWithSign(netP, modeText)}</td>
      <td>${resultText}</td>
    `;
    logTableBody.insertBefore(row, logTableBody.firstChild);

    if (logTableBody.children.length > 25) {
      logTableBody.removeChild(logTableBody.lastChild);
    }
  }

  // --- Three.js 3D Visualizer Initialization ---
  function init3DScene() {
    const container = document.getElementById('canvas3dContainer');
    if (!container) return;

    // Fluid sizing calculations
    const rect = container.getBoundingClientRect();
    const width = rect.width || container.clientWidth || 800;
    const height = rect.height || container.clientHeight || 400;
    const aspect = width / height;

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    // Scene setup
    scene = new THREE.Scene();

    // Camera setup (Perspective Projection for rich visual realism)
    camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 100);
    camera.position.set(10, 8, 10);
    camera.lookAt(0, 0.5, 0);

    // OrbitControls setup
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Keep above floor
    controls.minDistance = 3.0;
    controls.maxDistance = 25.0;
    controls.target.set(0, 0.5, 0);
    controls.update();

    // Cancel camera focus animation on manual controls interaction
    controls.addEventListener('start', () => {
      state.isAnimatingCamera = false;
    });

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(10, 15, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Grid floor
    const gridHelper = new THREE.GridHelper(15, 20, 0xcbd5e1, 0xe2e8f0);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // --- Dynamic Offscreen Canvases & Textures ---
    // 1. Battery HUD
    batteryCanvas = document.createElement('canvas');
    batteryCanvas.width = 128;
    batteryCanvas.height = 64;
    batteryTexture = new THREE.CanvasTexture(batteryCanvas);

    // 2. Inverter Panel
    invCanvas = document.createElement('canvas');
    invCanvas.width = 256;
    invCanvas.height = 256;
    invTexture = new THREE.CanvasTexture(invCanvas);

    // 3. Grid Console Panel
    gridCanvas = document.createElement('canvas');
    gridCanvas.width = 256;
    gridCanvas.height = 256;
    gridTexture = new THREE.CanvasTexture(gridCanvas);

    // 4. Status Panel
    statusCanvas = document.createElement('canvas');
    statusCanvas.width = 256;
    statusCanvas.height = 64;
    statusTexture = new THREE.CanvasTexture(statusCanvas);

    // --- Create Mesh Elements ---
    
    // 1. EV Storage Node (3D Car Structure)
    evGroup = new THREE.Group();
    evGroup.position.set(-4.5, 0, 0);

    // Chassis Box
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.6, 1.4), bodyMat);
    chassis.position.y = 0.5;
    chassis.castShadow = true;
    evGroup.add(chassis);

    // Cabin Box
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.2), new THREE.MeshLambertMaterial({ color: 0xe2e8f0 }));
    cabin.position.set(0.1, 0.95, 0);
    cabin.castShadow = true;
    evGroup.add(cabin);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.18, 16);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const wheels = [];
    const wheelPositions = [
      [-0.7, 0.32, 0.71],
      [0.7, 0.32, 0.71],
      [-0.7, 0.32, -0.71],
      [0.7, 0.32, -0.71]
    ];
    wheelPositions.forEach(pos => {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(pos[0], pos[1], pos[2]);
      w.rotation.x = Math.PI / 2;
      w.castShadow = true;
      evGroup.add(w);
      wheels.push(w);
    });

    // Receptacle target socket
    const socketMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.15, 0.05, 8, 16),
      new THREE.MeshLambertMaterial({ color: 0x3b82f6 })
    );
    socketMesh.position.set(1.25, 0.6, 0.72); // world position: (-4.5 + 1.25, 0.6, 0.72) = (-3.25, 0.6, 0.72)
    socketMesh.rotation.y = Math.PI / 2;
    evGroup.add(socketMesh);

    // 3D battery indicator on EV roof
    const casingGeo = new THREE.BoxGeometry(0.35, 0.5, 0.35);
    const casingMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35
    });
    batteryCasingMesh = new THREE.Mesh(casingGeo, casingMat);
    batteryCasingMesh.position.set(0.1, 1.45, 0); // on top of cabin roof (cabin y is 0.95, height is 0.5 => roof y is 1.2)
    evGroup.add(batteryCasingMesh);

    const fillGeo = new THREE.BoxGeometry(0.31, 0.46, 0.31);
    const fillMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    batteryFillMesh = new THREE.Mesh(fillGeo, fillMat);
    batteryFillMesh.position.set(0.1, 1.45, 0);
    evGroup.add(batteryFillMesh);

    scene.add(evGroup);

    // Battery plane on car hood
    const batteryPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.45),
      new THREE.MeshBasicMaterial({ map: batteryTexture, side: THREE.DoubleSide })
    );
    batteryPlane.position.set(-0.6, 0.81, 0);
    batteryPlane.rotation.x = -Math.PI / 2 + 0.15;
    evGroup.add(batteryPlane);

    // 2. Inverter Cabinet Node (Detailed Group)
    inverterGroup = new THREE.Group();
    inverterGroup.position.set(0, 0, 0);

    // Dark-gray base plinth
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 1.7), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8, metalness: 0.2 }));
    plinth.position.set(0, 0.06, 0);
    plinth.castShadow = true;
    inverterGroup.add(plinth);

    // Main cabinet body (sleek grey chassis)
    const cabinetBody = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.8, 1.5), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.6 }));
    cabinetBody.position.set(0, 1.02, 0);
    cabinetBody.castShadow = true;
    cabinetBody.receiveShadow = true;
    inverterGroup.add(cabinetBody);

    // Back Heat Sink Fins
    const heatsinkGroup = new THREE.Group();
    heatsinkGroup.position.set(0, 1.02, -0.76);
    for (let xOffset = -0.6; xOffset <= 0.6; xOffset += 0.12) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.6, 0.08), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9, metalness: 0.1 }));
      fin.position.set(xOffset, 0, 0);
      heatsinkGroup.add(fin);
    }
    inverterGroup.add(heatsinkGroup);

    // Left and Right Ventilation Vents / Cooling Slots
    for (let side = -1; side <= 1; side += 2) {
      const ventGroup = new THREE.Group();
      ventGroup.position.set(side * 0.76, 1.02, 0);
      ventGroup.rotation.y = side * Math.PI / 2;
      for (let yOffset = -0.5; yOffset <= 0.5; yOffset += 0.15) {
        const slot = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.02), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 }));
        slot.position.set(0, yOffset, 0);
        ventGroup.add(slot);
      }
      inverterGroup.add(ventGroup);
    }

    // Side Ventilation Vent Mesh for Thermal / Power Glow
    const glowMatL = new THREE.MeshBasicMaterial({ color: 0xff5500, transparent: true, opacity: 0.0, side: THREE.DoubleSide });
    const glowMatR = new THREE.MeshBasicMaterial({ color: 0xff5500, transparent: true, opacity: 0.0, side: THREE.DoubleSide });
    
    inverterGlowL = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), glowMatL);
    inverterGlowL.position.set(-0.765, 1.02, 0);
    inverterGlowL.rotation.y = Math.PI / 2;
    inverterGroup.add(inverterGlowL);

    inverterGlowR = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), glowMatR);
    inverterGlowR.position.set(0.765, 1.02, 0);
    inverterGlowR.rotation.y = -Math.PI / 2;
    inverterGroup.add(inverterGlowR);

    // Tilted Control Panel Screen Frame
    const controlFrame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.15), new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.3 }));
    controlFrame.position.set(0, 1.35, 0.77);
    controlFrame.rotation.x = -0.15;
    inverterGroup.add(controlFrame);

    // Recessed Screen showing invTexture
    const screenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 0.8),
      new THREE.MeshBasicMaterial({ map: invTexture, side: THREE.DoubleSide })
    );
    screenMesh.position.set(0, 1.35, 0.85);
    screenMesh.rotation.x = -0.15;
    inverterGroup.add(screenMesh);

    // Front Metal Handles
    const handleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
    
    const handleL = new THREE.Mesh(handleGeo, handleMat);
    handleL.position.set(-0.65, 0.7, 0.76);
    inverterGroup.add(handleL);

    const handleR = new THREE.Mesh(handleGeo, handleMat);
    handleR.position.set(0.65, 0.7, 0.76);
    inverterGroup.add(handleR);

    // Front Status Indicator LEDs
    greenLED = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), new THREE.MeshBasicMaterial({ color: 0x053e2b }));
    greenLED.position.set(-0.35, 0.85, 0.78);
    inverterGroup.add(greenLED);

    orangeLED = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), new THREE.MeshBasicMaterial({ color: 0x3d2b05 }));
    orangeLED.position.set(-0.45, 0.85, 0.78);
    inverterGroup.add(orangeLED);

    redLED = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    redLED.position.set(-0.55, 0.85, 0.78);
    inverterGroup.add(redLED);

    // Emergency Stop Button
    const estopBase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12), new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 }));
    estopBase.position.set(0.45, 0.85, 0.78);
    estopBase.rotation.x = Math.PI / 2;
    inverterGroup.add(estopBase);

    const estopButton = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 12), new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 }));
    estopButton.position.set(0.45, 0.85, 0.81);
    estopButton.rotation.x = Math.PI / 2;
    inverterGroup.add(estopButton);

    scene.add(inverterGroup);

    // 3. Substation Grid cabinet node (Detailed Group)
    gridGroup = new THREE.Group();
    gridGroup.position.set(4.5, 0, 0);

    // Dark base plinth
    const gridPlinth = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 1.9), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }));
    gridPlinth.position.set(0, 0.06, 0);
    gridPlinth.castShadow = true;
    gridGroup.add(gridPlinth);

    // Large main Oil-Cooled Transformer Cylindrical Tank
    const transformerTank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 1.4, 16),
      new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.5, roughness: 0.4 })
    );
    transformerTank.position.set(0, 0.82, 0);
    transformerTank.castShadow = true;
    transformerTank.receiveShadow = true;
    gridGroup.add(transformerTank);

    // Cooling radiator manifolds on left & right sides
    for (let side = -1; side <= 1; side += 2) {
      const radGroup = new THREE.Group();
      radGroup.position.set(side * 0.75, 0.82, 0);
      
      // Radiator header pipes
      const pipeGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.3, 8);
      pipeGeo.rotateX(Math.PI / 2);
      const pipe = new THREE.Mesh(pipeGeo, new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6 }));
      pipe.position.set(side * 0.05, 0.5, 0);
      radGroup.add(pipe);

      const pipe2 = pipe.clone();
      pipe2.position.y = -0.5;
      radGroup.add(pipe2);

      // Radiator cooling fins
      for (let zOffset = -0.5; zOffset <= 0.5; zOffset += 0.2) {
        const fin = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 1.0, 0.03),
          new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 })
        );
        fin.position.set(side * 0.08, 0, zOffset);
        radGroup.add(fin);
      }
      gridGroup.add(radGroup);
    }

    // Conservator tank on top
    const tankGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.1, 12);
    tankGeo.rotateX(Math.PI / 2);
    const tankMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.4, roughness: 0.5 });
    const tank = new THREE.Mesh(tankGeo, tankMat);
    tank.position.set(-0.35, 1.7, 0);
    tank.castShadow = true;
    gridGroup.add(tank);

    // Pipes connecting conservator tank to main transformer
    const connectingPipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.25, 8),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6 })
    );
    connectingPipe.position.set(-0.35, 1.45, 0);
    gridGroup.add(connectingPipe);

    // Front Control Panel Frame (housing the screen)
    const gridControlFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 1.0, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 })
    );
    gridControlFrame.position.set(0, 0.8, 0.73);
    gridGroup.add(gridControlFrame);

    // Recessed Screen showing gridTexture
    const gridScreenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.9),
      new THREE.MeshBasicMaterial({ map: gridTexture, side: THREE.DoubleSide })
    );
    gridScreenMesh.position.set(0, 0.8, 0.81);
    gridGroup.add(gridScreenMesh);

    // T-Gantry support structure/Utility pole nearby
    const gantry = new THREE.Group();
    gantry.position.set(0.6, 0, -0.6);
    
    // Vertical steel pole
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.06, 2.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.3 })
    );
    pole.position.y = 1.4;
    gantry.add(pole);

    // Horizontal T-crossbar
    const crossbar = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.06, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7 })
    );
    crossbar.position.set(0, 2.6, 0);
    gantry.add(crossbar);

    // Small T-crossbar insulators
    for (let zOffset = -0.5; zOffset <= 0.5; zOffset += 0.5) {
      const ins = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.03, 0.12, 8),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.1 })
      );
      ins.position.set(0, 2.7, zOffset);
      gantry.add(ins);
    }
    gridGroup.add(gantry);

    // 3 high-voltage corrugated insulator bushing columns
    const bushingGroup = new THREE.Group();
    bushingGroup.position.set(0.3, 1.4, 0);
    for (let z = -0.4; z <= 0.4; z += 0.4) {
      // Main central core pin
      const centralPin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.45, 8),
        new THREE.MeshStandardMaterial({ color: 0xb58900, metalness: 0.8, roughness: 0.2 })
      );
      centralPin.position.set(0, 0.225, z);
      bushingGroup.add(centralPin);

      // Stacked porcelain rings
      for (let yHeight = 0.05; yHeight <= 0.35; yHeight += 0.06) {
        const ring = new THREE.Mesh(
          new THREE.CylinderGeometry(0.065, 0.065, 0.025, 10),
          new THREE.MeshStandardMaterial({ color: 0x8a5a36, roughness: 0.2 })
        );
        ring.position.set(0, yHeight, z);
        bushingGroup.add(ring);

        // Flaring ring
        const flare = new THREE.Mesh(
          new THREE.CylinderGeometry(0.09, 0.05, 0.015, 10),
          new THREE.MeshStandardMaterial({ color: 0x8a5a36, roughness: 0.2 })
        );
        flare.position.set(0, yHeight - 0.02, z);
        bushingGroup.add(flare);
      }
    }
    gridGroup.add(bushingGroup);

    // Danger High Voltage sign panel on the side
    const hazardPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.5, side: THREE.DoubleSide })
    );
    hazardPlate.position.set(-0.52, 0.9, 0.52);
    hazardPlate.rotation.y = -Math.PI / 4;
    gridGroup.add(hazardPlate);

    scene.add(gridGroup);

    // 4. Floating 3D status banner
    statusMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 0.55),
      new THREE.MeshBasicMaterial({ map: statusTexture, side: THREE.DoubleSide, transparent: true })
    );
    statusMesh.position.set(0, 2.5, 0);
    scene.add(statusMesh);

    // 5. 3D Knife Breaker Switch
    const breakerGroup = new THREE.Group();
    breakerGroup.position.set(2.25, 0, 0);

    const baseplate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.6), new THREE.MeshLambertMaterial({ color: 0xe2e8f0 }));
    baseplate.position.y = 0.04;
    baseplate.castShadow = true;
    breakerGroup.add(baseplate);

    // Contacts
    const contactMat = new THREE.MeshStandardMaterial({ color: 0xb58900, metalness: 0.8, roughness: 0.2 });
    const contactGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.2, 16);
    const leftContact = new THREE.Mesh(contactGeo, contactMat);
    leftContact.position.set(-0.4, 0.18, 0);
    breakerGroup.add(leftContact);

    const rightContact = new THREE.Mesh(contactGeo, contactMat);
    rightContact.position.set(0.4, 0.18, 0);
    breakerGroup.add(rightContact);

    // Pivot Arm Group for smooth rotation around hinge contact
    breakerArmGroup = new THREE.Group();
    breakerArmGroup.position.set(-0.4, 0.25, 0); // local pivot coordinates centered on left contact

    const armMesh = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.08, 0.08), contactMat);
    armMesh.position.x = 0.4; // offset so hinge rotates edge
    breakerArmGroup.add(armMesh);

    const handleMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.15, 16), new THREE.MeshLambertMaterial({ color: 0x1e293b }));
    handleMesh.position.set(0.8, 0.05, 0);
    handleMesh.rotation.x = Math.PI / 2;
    breakerArmGroup.add(handleMesh);

    breakerArmGroup.rotation.z = -0.6; // initial open position in radians (approx -35 degrees)
    breakerGroup.add(breakerArmGroup);
    scene.add(breakerGroup);

    // 6. Busbar Conducting Cables
    // Wire 1 (EV -> Inverter)
    const busbarMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    const busbarGeo1 = new THREE.CylinderGeometry(0.03, 0.03, 2.5);
    busbar1 = new THREE.Mesh(busbarGeo1, busbarMat);
    busbar1.rotation.z = Math.PI / 2;
    busbar1.position.set(-2.0, 0.6, 0.72);
    scene.add(busbar1);

    pilotBusbar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.5), new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.1 }));
    pilotBusbar1.rotation.z = Math.PI / 2;
    pilotBusbar1.position.set(-2.0, 0.6, 0.72);
    scene.add(pilotBusbar1);

    // Wire 2 (Inverter -> Breaker)
    const busbarGeo2 = new THREE.CylinderGeometry(0.03, 0.03, 1.25);
    busbar2 = new THREE.Mesh(busbarGeo2, busbarMat);
    busbar2.rotation.z = Math.PI / 2;
    busbar2.position.set(1.22, 0.25, 0);
    scene.add(busbar2);

    pilotBusbar2 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.25), new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.1 }));
    pilotBusbar2.rotation.z = Math.PI / 2;
    pilotBusbar2.position.set(1.22, 0.25, 0);
    scene.add(pilotBusbar2);

    // Wire 3 (Breaker -> Grid)
    const busbarGeo3 = new THREE.CylinderGeometry(0.03, 0.03, 1.35);
    busbar3 = new THREE.Mesh(busbarGeo3, busbarMat);
    busbar3.rotation.z = Math.PI / 2;
    busbar3.position.set(3.22, 0.25, 0);
    scene.add(busbar3);

    pilotBusbar3 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.35), new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.1 }));
    pilotBusbar3.rotation.z = Math.PI / 2;
    pilotBusbar3.position.set(3.22, 0.25, 0);
    scene.add(pilotBusbar3);

    // 7. Draggable 3D Plug & Bracket
    const bracketMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.3), new THREE.MeshLambertMaterial({ color: 0x475569 }));
    bracketMesh.position.copy(bracketPos).sub(new THREE.Vector3(0, 0.1, 0));
    scene.add(bracketMesh);

    // Plug Handle Mesh Group
    plugMesh = new THREE.Group();
    plugMesh.position.copy(bracketPos);

    const plugBody = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.2), new THREE.MeshLambertMaterial({ color: 0xf59e0b }));
    plugBody.castShadow = true;
    plugMesh.add(plugBody);

    const plugHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.25, 16), new THREE.MeshLambertMaterial({ color: 0x1e293b }));
    plugHandle.rotation.x = Math.PI / 2;
    plugHandle.position.set(0, 0, 0.15);
    plugMesh.add(plugHandle);

    const plugPinGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.08, 16);
    const plugPinMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7 });
    const plugPin1 = new THREE.Mesh(plugPinGeo, plugPinMat);
    plugPin1.position.set(-0.05, 0, -0.1);
    plugPin1.rotation.x = Math.PI / 2;
    plugMesh.add(plugPin1);

    const plugPin2 = new THREE.Mesh(plugPinGeo, plugPinMat);
    plugPin2.position.set(0.05, 0, -0.1);
    plugPin2.rotation.x = Math.PI / 2;
    plugMesh.add(plugPin2);

    scene.add(plugMesh);

    // Initialize 3D Spline cable curve
    updateCableSpline();

    // Initialize active energy flow particles
    initEnergyParticles();

    // --- Interaction Listeners (Raycast dragging) ---
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // Window resize handler
    window.addEventListener('resize', onWindowResize);
  }

  // --- 3D Spline Cable Geometry Updater ---
  function updateCableSpline() {
    const start = cableStartPos;
    const end = plugMesh.position;
    
    const midX = (start.x + end.x) / 2;
    const midY = Math.min(start.y, end.y) - 1.2;
    const midZ = (start.z + end.z) / 2;

    const curve = new THREE.QuadraticBezierCurve3(
      start,
      new THREE.Vector3(midX, midY, midZ),
      end
    );

    const geometry = new THREE.TubeGeometry(curve, 24, 0.035, 8, false);

    if (cableMesh) {
      scene.remove(cableMesh);
      cableMesh.geometry.dispose();
      cableMesh.geometry = geometry;
      scene.add(cableMesh);
    } else {
      const material = new THREE.MeshLambertMaterial({ color: 0x475569 });
      cableMesh = new THREE.Mesh(geometry, material);
      scene.add(cableMesh);
    }
  }

  // --- Energy Flow Particles ---
  function initEnergyParticles() {
    const particleGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const particleMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

    energyParticles = [];
    
    // 16 particles: 4 segments (3 static, 1 dynamic cable) x 4 particles each
    for (let i = 0; i < 16; i++) {
      const mesh = new THREE.Mesh(particleGeo, particleMat.clone());
      mesh.visible = false;
      scene.add(mesh);
      
      const segment = Math.floor(i / 4);
      const pct = (i % 4) / 4;
      
      energyParticles.push({
        mesh: mesh,
        segment: segment,
        pct: pct
      });
    }
  }

  function updateEnergyParticles(dt) {
    const isCompleted = state.CURRENT_MODE === 'G2V' && state.SOC >= 100;
    const isLoopActive = state.stage === 2 && !isCompleted;
    
    let particleColor = 0xf59e0b; // Yellow/orange for V2G
    if (state.CURRENT_MODE === 'G2V') {
      particleColor = 0x3b82f6; // Blue for G2V
    }

    // Dynamic speed based on voltage and active current flow
    const effCurrent = (state.IS_PLUG_CONNECTED && state.stage === 2 && !isCompleted) ? state.currentSetting : 0;
    const currentNorm = effCurrent / 60; // 0.0 to 1.0
    const voltageNorm = state.voltage / 260; // 0.7 to 1.0
    const speed = (isLoopActive ? 0.00035 * (1 + currentNorm * 2.5) * (0.5 + voltageNorm * 1.5) : 0) * dt;

    // Define cable curve dynamically
    const startCable = cableStartPos;
    const endCable = state.IS_PLUG_CONNECTED ? socketPos : plugMesh.position;
    const midX = (startCable.x + endCable.x) / 2;
    const midY = Math.min(startCable.y, endCable.y) - 1.2;
    const midZ = (startCable.z + endCable.z) / 2;
    const cableCurve = new THREE.QuadraticBezierCurve3(
      startCable,
      new THREE.Vector3(midX, midY, midZ),
      endCable
    );

    energyParticles.forEach(p => {
      if (!isLoopActive || !state.IS_PLUG_CONNECTED) {
        p.mesh.visible = false;
        return;
      }
      
      p.mesh.visible = true;
      p.mesh.material.color.setHex(particleColor);

      // Move pct based on mode direction
      if (p.segment === 3) {
        // Cable: flows Grid -> EV in G2V (pct increase), EV -> Grid in V2G (pct decrease)
        if (state.CURRENT_MODE === 'G2V') {
          p.pct += speed;
          if (p.pct > 1.0) p.pct -= 1.0;
        } else {
          p.pct -= speed;
          if (p.pct < 0.0) p.pct += 1.0;
        }
      } else {
        // Busbars: flow EV -> Grid in V2G (pct increase), Grid -> EV in G2V (pct decrease)
        if (state.CURRENT_MODE === 'V2G') {
          p.pct += speed;
          if (p.pct > 1.0) p.pct -= 1.0;
        } else {
          p.pct -= speed;
          if (p.pct < 0.0) p.pct += 1.0;
        }
      }

      // Calculate position only
      if (p.segment === 3) {
        // Charging cable
        p.mesh.position.copy(cableCurve.getPointAt(p.pct));
      } else {
        let start, end;
        if (p.segment === 0) {
          // EV to Inverter busbar
          start = new THREE.Vector3(-3.25, 0.6, 0.72);
          end = new THREE.Vector3(-0.75, 0.6, 0.72);
        } else if (p.segment === 1) {
          // Inverter to Breaker busbar
          start = new THREE.Vector3(0.6, 0.25, 0);
          end = new THREE.Vector3(1.85, 0.25, 0);
        } else if (p.segment === 2) {
          // Breaker to Grid busbar
          start = new THREE.Vector3(2.65, 0.25, 0);
          end = new THREE.Vector3(3.7, 0.25, 0);
        }
        p.mesh.position.lerpVectors(start, end, p.pct);
      }
    });
  }

  // --- Drag and Drop / Raycast Focus Event Handlers ---
  function onPointerDown(e) {
    state.pointerDownPos.set(e.clientX, e.clientY);
    state.pointerDownTime = performance.now();

    if (state.IS_PLUG_CONNECTED) return;

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(plugMesh, true);

    if (intersects.length > 0) {
      isDragging = true;
      renderer.domElement.style.cursor = 'grabbing';
      if (controls) controls.enabled = false;

      const planeIntersect = new THREE.Vector3();
      raycaster.ray.intersectPlane(dragPlane, planeIntersect);
      dragOffset.copy(plugMesh.position).sub(planeIntersect);
    }
  }

  // --- Parameter-Driven Flow Direction & BMS Safety Hysteresis Override Logic ---
  function evaluateModeConstraints() {
    // 1. Handle the Hysteresis Lock Status
    if (state.isLockedInEmergencyCharging) {
      if (state.SOC >= 85) {
        state.isLockedInEmergencyCharging = false;
        if (safetyAlert) {
          safetyAlert.classList.add('hidden');
        }
        showToast("[BMS RECOVERY COMPLETE] Battery charged to 85% buffer. Parameter-driven operations resumed.");
      } else {
        state.CURRENT_MODE = 'G2V';
        if (safetyAlert) {
          safetyAlert.innerHTML = `⚠️ [BMS OVERRIDE ACTIVE] Battery in low recovery zone (${state.SOC.toFixed(1)}% < 85% SOC). Locked in Emergency Recovery Charging to prevent hunting.`;
          safetyAlert.classList.remove('hidden');
        }
        return; // Exit the function with an immediate return
      }
    }

    // 2. Normal Slider-Driven Operation Check
    if (!state.isLockedInEmergencyCharging && state.voltage < 210) {
      if (state.SOC <= 50) {
        state.isLockedInEmergencyCharging = true;
        state.CURRENT_MODE = 'G2V';
        if (safetyAlert) {
          safetyAlert.innerHTML = "⚠️ [BMS OVERRIDE ACTIVE] Battery reached 50% safety limit during V2G Export. Locked in Recovery Charging mode until 85% SOC buffer is restored.";
          safetyAlert.classList.remove('hidden');
        }
        showToast("⚠️ [BMS OVERRIDE] Battery SOC <= 50%. Locked in emergency recovery charging.");
        appendLogRecord('Safety', state.voltage, state.currentSetting, 0, 'Auto-Shift -> G2V', true);
        return; // Exit immediately
      } else {
        state.CURRENT_MODE = 'V2G';
      }
    } else if (state.voltage >= 210) {
      state.CURRENT_MODE = 'G2V';
    }
  }

  function onPointerMove(e) {
    if (!isDragging) {
      if (!state.IS_PLUG_CONNECTED) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(plugMesh, true);
        if (intersects.length > 0) {
          renderer.domElement.style.cursor = 'grab';
        } else {
          renderer.domElement.style.cursor = 'default';
        }
      } else {
        renderer.domElement.style.cursor = 'default';
      }
      return;
    }

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const planeIntersect = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane, planeIntersect);

    const newPos = planeIntersect.add(dragOffset);
    newPos.x = Math.max(-5.5, Math.min(5.5, newPos.x));
    newPos.y = 0.6;
    newPos.z = Math.max(-1.5, Math.min(2.5, newPos.z));

    plugMesh.position.copy(newPos);
    updateCableSpline();
  }

  function onPointerUp(e) {
    if (isDragging) {
      isDragging = false;
      if (controls) controls.enabled = true;

      const distance = plugMesh.position.distanceTo(socketPos);

      if (distance < 0.95) {
        plugMesh.position.copy(socketPos);
        plugMesh.rotation.y = Math.PI / 2;
        
        state.IS_PLUG_CONNECTED = true;
        renderer.domElement.style.cursor = 'default';

        voltageSlider.disabled = false;
        currentSlider.disabled = false;
        socSlider.disabled = false;

        syncPhaseBtn.textContent = '⚡ Activate Energy Loop';
        syncPhaseBtn.className = 'btn btn-ready';

        syncStatusBadge.textContent = 'PLUG CONNECTED';
        syncStatusBadge.className = 'badge badge-unlocked';

        showToast("[PLUG CONNECTED] Hardware interlock snapped. Busbars activated.");
      } else {
        plugMesh.position.copy(bracketPos);
        plugMesh.rotation.set(0, 0, 0);
        
        state.IS_PLUG_CONNECTED = false;
        renderer.domElement.style.cursor = 'default';

        voltageSlider.disabled = true;
        currentSlider.disabled = true;
        socSlider.disabled = true;

        syncPhaseBtn.textContent = '🔒 Position Cable to Begin';
        syncPhaseBtn.className = 'btn btn-ready';
      }
      updateCableSpline();
      updatePhysics(0);
    } else {
      // Check for quick click to zoom
      const dx = e.clientX - state.pointerDownPos.x;
      const dy = e.clientY - state.pointerDownPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const elapsed = performance.now() - state.pointerDownTime;
      
      if (dist < 6 && elapsed < 300) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        
        // Raycast against all major component groups
        const intersects = raycaster.intersectObjects([evGroup, inverterGroup, gridGroup], true);
        
        if (intersects.length > 0) {
          let obj = intersects[0].object;
          let clickedGroup = null;
          while (obj) {
            if (obj === evGroup) { clickedGroup = 'ev'; break; }
            if (obj === inverterGroup) { clickedGroup = 'inverter'; break; }
            if (obj === gridGroup) { clickedGroup = 'grid'; break; }
            obj = obj.parent;
          }
          
          if (clickedGroup === 'ev') {
            state.targetCameraPos.set(-4.5, 1.8, 3.8);
            state.targetControlsTarget.set(-4.5, 0.6, 0.0);
            state.isAnimatingCamera = true;
            showToast("[FOCUS] Focused on EV Node.");
          } else if (clickedGroup === 'inverter') {
            state.targetCameraPos.set(0, 1.3, 2.8);
            state.targetControlsTarget.set(0, 1.1, 0.0);
            state.isAnimatingCamera = true;
            showToast("[FOCUS] Focused on Inverter (Synchroscope).");
          } else if (clickedGroup === 'grid') {
            state.targetCameraPos.set(4.5, 1.1, 2.8);
            state.targetControlsTarget.set(4.5, 0.9, 0.0);
            state.isAnimatingCamera = true;
            showToast("[FOCUS] Focused on Substation Grid Tie.");
          }
        } else {
          // Reset to Overview
          state.targetCameraPos.set(10, 8, 10);
          state.targetControlsTarget.set(0, 0.5, 0);
          state.isAnimatingCamera = true;
          showToast("[FOCUS] Resetting camera view.");
        }
      }
    }
  }

  function onWindowResize() {
    const container = document.getElementById('canvas3dContainer');
    if (!container || !renderer || !camera) return;

    // Use getBoundingClientRect for absolute precision during container flex sizing
    const rect = container.getBoundingClientRect();
    const width = rect.width || container.clientWidth || 800;
    const height = rect.height || container.clientHeight || 400;
    const aspect = width / height;

    camera.aspect = aspect;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
  }

  // --- Telemetry SVG Line Chart Helper Functions ---
  function initChart() {
    let chartSvg = document.getElementById('telemetryChart');
    if (!chartSvg) {
      chartSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      chartSvg.id = 'telemetryChart';
      chartSvg.setAttribute('viewBox', '0 0 400 180');
      chartSvg.setAttribute('width', '100%');
      chartSvg.setAttribute('height', '180');
      chartSvg.style.background = '#ffffff';
      chartSvg.style.border = '1px solid #cbd5e1';
      chartSvg.style.borderRadius = '4px';
      chartSvg.style.marginTop = '10px';
      chartSvg.style.marginBottom = '15px';

      const visualizerContainer = document.querySelector('.visualizer-container');
      if (visualizerContainer) {
        visualizerContainer.appendChild(chartSvg);
      }
    }
    state.CHART_INSTANCE = chartSvg;
    state.chartData = [];
    updateChartVisuals();
  }

  function updateChartVisuals() {
    const chartSvg = state.CHART_INSTANCE;
    if (!chartSvg) return;

    chartSvg.innerHTML = '';

    const gridYValues = [100, 80, 60, 50, 40, 20];
    gridYValues.forEach(val => {
      const y = 10 + (1.4 * (100 - val));
      
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '35');
      line.setAttribute('y1', y);
      line.setAttribute('x2', '385');
      line.setAttribute('y2', y);
      if (val === 50) {
        line.setAttribute('stroke', '#cbd5e1');
        line.setAttribute('stroke-width', '1.5');
        line.setAttribute('stroke-dasharray', '4,4');
      } else {
        line.setAttribute('stroke', '#f1f5f9');
        line.setAttribute('stroke-width', '1');
      }
      chartSvg.appendChild(line);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', '30');
      text.setAttribute('y', y + 3);
      text.setAttribute('text-anchor', 'end');
      text.setAttribute('font-family', "'Inter', sans-serif");
      text.setAttribute('font-size', '8px');
      text.setAttribute('fill', val === 50 ? '#10b981' : '#94a3b8');
      if (val === 50) text.setAttribute('font-weight', '600');
      text.textContent = val + '%';
      chartSvg.appendChild(text);
    });

    const bottomLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    bottomLine.setAttribute('x1', '35');
    bottomLine.setAttribute('y1', '150');
    bottomLine.setAttribute('x2', '385');
    bottomLine.setAttribute('y2', '150');
    bottomLine.setAttribute('stroke', '#94a3b8');
    bottomLine.setAttribute('stroke-width', '1');
    chartSvg.appendChild(bottomLine);

    if (state.chartData.length === 0) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', '210');
      text.setAttribute('y', '90');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-family', "'Inter', sans-serif");
      text.setAttribute('font-size', '10px');
      text.setAttribute('fill', '#94a3b8');
      text.textContent = 'Awaiting synchronization data...';
      chartSvg.appendChild(text);
      return;
    }

    let socPathD = '';
    let gridPathD = '';
    const numPoints = state.chartData.length;
    for (let i = 0; i < numPoints; i++) {
      const x = 35 + (i * (350 / 29));
      const pt = state.chartData[i];
      const ySoc = 10 + (1.4 * (100 - pt.soc));
      const yGrid = 10 + (1.4 * (100 - pt.grid));

      if (i === 0) {
        socPathD += `M ${x} ${ySoc}`;
        gridPathD += `M ${x} ${yGrid}`;
      } else {
        socPathD += ` L ${x} ${ySoc}`;
        gridPathD += ` L ${x} ${yGrid}`;
      }
    }

    const socPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    socPath.setAttribute('d', socPathD);
    socPath.setAttribute('stroke', '#3b82f6');
    socPath.setAttribute('stroke-width', '2');
    socPath.setAttribute('fill', 'none');
    chartSvg.appendChild(socPath);

    const gridPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    gridPath.setAttribute('d', gridPathD);
    gridPath.setAttribute('stroke', '#ef4444');
    gridPath.setAttribute('stroke-width', '2');
    gridPath.setAttribute('fill', 'none');
    chartSvg.appendChild(gridPath);

    const legendSocColor = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    legendSocColor.setAttribute('x', '130');
    legendSocColor.setAttribute('y', '158');
    legendSocColor.setAttribute('width', '8');
    legendSocColor.setAttribute('height', '8');
    legendSocColor.setAttribute('fill', '#3b82f6');
    chartSvg.appendChild(legendSocColor);

    const legendSocText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    legendSocText.setAttribute('x', '142');
    legendSocText.setAttribute('y', '165');
    legendSocText.setAttribute('font-family', "'Inter', sans-serif");
    legendSocText.setAttribute('font-size', '8px');
    legendSocText.setAttribute('fill', '#1e293b');
    legendSocText.textContent = 'Battery SOC (%)';
    chartSvg.appendChild(legendSocText);

    const legendGridColor = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    legendGridColor.setAttribute('x', '230');
    legendGridColor.setAttribute('y', '158');
    legendGridColor.setAttribute('width', '8');
    legendGridColor.setAttribute('height', '8');
    legendGridColor.setAttribute('fill', '#ef4444');
    chartSvg.appendChild(legendGridColor);

    const legendGridText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    legendGridText.setAttribute('x', '242');
    legendGridText.setAttribute('y', '165');
    legendGridText.setAttribute('font-family', "'Inter', sans-serif");
    legendGridText.setAttribute('font-size', '8px');
    legendGridText.setAttribute('fill', '#1e293b');
    legendGridText.textContent = 'Grid Energy (%)';
    chartSvg.appendChild(legendGridText);
  }

  // --- Target Power Maintenance Loop (Every 500ms) ---
  setInterval(() => {
    state.TARGET_POWER = state.CURRENT_MODE === 'V2G' ? 11500 : 6900;
    if (state.stage === 1) {
      updatePhysics(0);
    }
  }, 500);

  // --- Main Calculation Engine & UI Sync ---
  function updatePhysics(dt) {
    // 0. Update state values from DOM sliders
    state.voltage = parseFloat(voltageSlider.value);
    state.currentSetting = parseFloat(currentSlider.value);
    state.batterySoc = parseFloat(socSlider.value);
    state.SOC = state.batterySoc;

    // --- Dynamic Flow Direction & BMS Safety Hysteresis Override Logic ---
    evaluateModeConstraints();

    // Halting G2V charging if battery hits 100% in normal operations
    const isCompleted = state.CURRENT_MODE === 'G2V' && state.SOC >= 100;
    
    // If plug is disconnected, effective current is zero (no connection)
    let effectiveCurrent = state.currentSetting;
    if (!state.IS_PLUG_CONNECTED || isCompleted) {
      effectiveCurrent = 0;
    }

    // Synchroscope automatic self-sync locked parameters
    if (state.IS_PLUG_CONNECTED) {
      if (state.stage === 1) {
        // Automatically smoothly match frequency to 50.0 Hz
        state.inverterFreq += (50.0 - state.inverterFreq) * 0.003 * dt;
        
        // Phase drifts continuously based on the frequency difference
        const df = state.inverterFreq - state.gridFreq;
        if (Math.abs(df) > 0.01) {
          state.inverterPhase += 360 * df * (dt / 1000);
        }
        
        // As frequency gets closer to 50 Hz, automatically lock phase to 0°
        if (Math.abs(state.inverterFreq - 50.0) < 0.15) {
          state.inverterPhase += (0.0 - state.inverterPhase) * 0.005 * dt;
        }

        // Keep phase between -180 and 180
        while (state.inverterPhase > 180) state.inverterPhase -= 360;
        while (state.inverterPhase < -180) state.inverterPhase += 360;
      } else {
        // In Stage 2, phase and frequency are locked to the Grid
        state.inverterFreq = 50.0;
        state.inverterPhase = 0.0;
      }
      
      state.phaseDiff = state.inverterPhase - state.gridPhase;
      state.isSynced = (Math.abs(state.inverterFreq - state.gridFreq) < 0.05) && (Math.abs(state.phaseDiff) < 10.0);
    } else {
      // Disconnected: reset unsynced values
      state.inverterFreq = 49.0;
      state.inverterPhase = -90.0;
      state.phaseDiff = -90.0; // dead rest angle
      state.isSynced = false;
    }

    // Update slider readouts
    currentVal.textContent = (!state.IS_PLUG_CONNECTED || isCompleted) ? '0 A' : state.currentSetting + ' A';
    voltageVal.textContent = state.voltage + ' V';
    socVal.textContent = state.batterySoc.toFixed(1) + '%';

    // --- Dynamic Inverter Efficiency & Temperature Calculations ---
    // 1. Calculated Power: P = V * I
    state.calculatedPower = state.voltage * effectiveCurrent;

    // 2. Inverter Power-Efficiency Curve (Quadratic curve centered at 8000W peak sweet spot)
    let efficiency = 0.985 - 3.0e-9 * Math.pow(state.calculatedPower - 8000, 2);
    // Clamp efficiency between realistic minimum of 80.0% and peak of 98.5%
    efficiency = Math.max(0.80, Math.min(0.985, efficiency));

    // 3. Net Transferred Power accounting for losses based on direction
    let netPower = 0;
    if (state.CURRENT_MODE === 'V2G') {
      // V2G (Exporting): Net Power = Calculated Power * Efficiency (losses reduce grid output)
      netPower = state.calculatedPower * efficiency;
    } else {
      // G2V (Importing): Net Power = Calculated Power / Efficiency (losses mean grid draws more)
      netPower = state.calculatedPower / efficiency;
    }

    // 4. Inverter Temperature simulation (exponential scaling from ambient 25°C baseline based on wasted power)
    // In Stage 2, heat is generated by wasted power. In Stage 1 (Breaker Open) or disconnected, no actual power flows.
    const wastedPowerForTemp = (state.stage === 2 && state.IS_PLUG_CONNECTED) ? Math.abs(netPower - state.calculatedPower) : 0;
    const targetTemp = 25.0 + 0.012 * Math.pow(wastedPowerForTemp, 1.15);
    const timeStep = dt > 0 ? dt : 16.67;
    const lerpFactor = state.stage === 2 ? 0.002 * timeStep : 0.005 * timeStep;
    state.temp += (targetTemp - state.temp) * Math.min(1.0, lerpFactor);
    if (isNaN(state.temp)) state.temp = 25.0;

    if (state.IS_PLUG_CONNECTED) {
      const baseTarget = state.CURRENT_MODE === 'V2G' ? 11500 : 6900;
      const flucScale = state.stage === 2 ? 1.0 : 0.0;
      const timeSec = performance.now() / 1000;
      state.gridFluctuation = (Math.sin(timeSec / 1.5) * 550 + Math.sin(timeSec * 3) * 120) * flucScale;
      state.TARGET_POWER = baseTarget + state.gridFluctuation;
    } else {
      state.TARGET_POWER = 11500;
      state.gridFluctuation = 0;
    }

    // Update telemetry metrics with distinct signs for energy flow directions (+ V2G, - G2V)
    teleCalcPower.textContent = state.calculatedPower === 0 ? '0 W' : formatPowerWithSign(state.calculatedPower, state.CURRENT_MODE);
    teleTargetPower.textContent = formatPower(state.TARGET_POWER);
    teleEfficiency.textContent = (efficiency * 100).toFixed(1) + '%';
    teleNetPower.textContent = netPower === 0 ? '0 W' : formatPowerWithSign(netPower, state.CURRENT_MODE);
    
    if (teleTemp) {
      teleTemp.textContent = state.temp.toFixed(1) + ' °C';
    }

    // Thermal Throttling
    if (state.temp > 75.0) {
      if (!state.isThermalThrottled) {
        state.isThermalThrottled = true;
        showToast("[THERMAL CRITICAL] Inverter temperature exceeded 75°C! Throttling current to 20A.");
      }
      if (teleTemp) {
        teleTemp.style.color = '#ef4444';
        teleTemp.style.fontWeight = 'bold';
      }
      if (state.currentSetting > 20) {
        state.currentSetting = 20;
        currentSlider.value = 20;
        currentVal.textContent = '20 A';
      }
    } else if (state.temp < 60.0) {
      state.isThermalThrottled = false;
      if (teleTemp) {
        teleTemp.style.color = 'var(--text-main)';
        teleTemp.style.fontWeight = 'normal';
      }
    }

    // --- FIX: Inverter Scale & Visual Updates ---
    // Scale the entire Inverter Cabinet group dynamically to reflect current power load
    if (inverterGroup) {
      // Baseline scale = 0.9. At max power (~15,600W), scale climbs to 1.15.
      const maxPower = 15600;
      const powerRatio = state.calculatedPower / maxPower;
      const finalScale = 0.9 + 0.25 * Math.max(0.0, Math.min(1.0, powerRatio));
      inverterGroup.scale.set(finalScale, finalScale, finalScale);
    }

    // Emissive internal heat glow intensity and color shifting reflecting temperature
    if (inverterGlowL && inverterGlowR) {
      const maxPower = 15600;
      const powerRatio = state.calculatedPower / maxPower;
      const tempFactor = Math.max(0.0, Math.min(1.0, (state.temp - 25.0) / 50.0));
      const baseGlow = 0.1 + 0.65 * powerRatio + 0.25 * tempFactor;
      const pulse = Math.sin(performance.now() * 0.003 * (1 + powerRatio * 2)) * 0.08;
      const finalGlow = Math.max(0.0, Math.min(1.0, baseGlow + pulse));
      
      const isGlowActive = state.IS_PLUG_CONNECTED && state.stage === 2 && effectiveCurrent > 0;
      inverterGlowL.material.opacity = isGlowActive ? finalGlow : 0.0;
      inverterGlowR.material.opacity = isGlowActive ? finalGlow : 0.0;

      // Color shifts to bright red if temperature exceeds 45°C, else remains amber
      if (state.temp > 45.0) {
        inverterGlowL.material.color.setHex(0xef4444); // Bright Red
        inverterGlowR.material.color.setHex(0xef4444);
      } else {
        inverterGlowL.material.color.setHex(0xff5500); // Amber/Orange
        inverterGlowR.material.color.setHex(0xff5500);
      }
    }

    // Dial Needle Angle rotation calculation
    const deltaPower = state.calculatedPower - state.TARGET_POWER;
    let dialAngle = (deltaPower / 12000) * 90;
    dialAngle = Math.max(-90, Math.min(90, dialAngle));

    // Pointer translation offset mapping
    let pointerOffset = (deltaPower / 12000) * 80;
    pointerOffset = Math.max(-80, Math.min(80, pointerOffset));

    // --- Update Dynamic Grid Status Display card ---
    if (gridStatusDisplay) {
      if (state.voltage < 210) {
        gridStatusDisplay.innerHTML = `Voltage: ${state.voltage} V | 🔴 SAG/DEFICIT (V2G)`;
        gridStatusDisplay.style.background = '#fef2f2';
        gridStatusDisplay.style.color = '#b91c1c';
        gridStatusDisplay.style.borderColor = '#fca5a5';
      } else {
        gridStatusDisplay.innerHTML = `Voltage: ${state.voltage} V | 🔵 NORMAL/SURPLUS (G2V)`;
        gridStatusDisplay.style.background = '#f0f9ff';
        gridStatusDisplay.style.color = '#0369a1';
        gridStatusDisplay.style.borderColor = '#7dd3fc';
      }
    }

    // --- Draw Offscreen Textures ---
    
    // 1. Battery HUD
    if (batteryCanvas) {
      const ctx = batteryCanvas.getContext('2d');
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 128, 64);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.strokeRect(4, 4, 120, 56);
      
      const fillW = Math.round(112 * (state.batterySoc / 100));
      let fillCol = '#10b981';
      if (state.batterySoc <= 25) fillCol = '#ef4444';
      else if (state.batterySoc <= 50) fillCol = '#f59e0b';
      
      ctx.fillStyle = fillCol;
      ctx.fillRect(8, 8, fillW, 48);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(Math.round(state.batterySoc) + '%', 64, 38);
      batteryTexture.needsUpdate = true;
    }

    // 2. Inverter Panel Canvas (Synchroscope Dial)
    if (invCanvas) {
      const ctx = invCanvas.getContext('2d');
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 256, 256);
      
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('POWER INVERTER', 128, 30);
      
      ctx.fillStyle = '#64748b';
      ctx.font = '10px sans-serif';
      ctx.fillText(state.CURRENT_MODE === 'V2G' ? 'V2G Export Active Power' : 'G2V Import Active Power', 128, 52);
      ctx.font = 'italic 11px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('P = V x I', 128, 70);

      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(state.calculatedPower === 0 ? '0 W' : formatPowerWithSign(state.calculatedPower, state.CURRENT_MODE), 128, 92);

      // Synchroscope Dial drawing
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(128, 175, 48, 0, 2 * Math.PI);
      ctx.stroke();

      // Green sync target sector (centered at 0° / straight up)
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(128, 175, 48, -Math.PI / 2 - 0.17, -Math.PI / 2 + 0.17); // +/- 10 degrees sync window
      ctx.stroke();

      // Draw tick marks
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      for (let angle = 0; angle < 360; angle += 30) {
        const rad = angle * Math.PI / 180;
        const isMajor = angle % 90 === 0;
        const length = isMajor ? 8 : 4;
        ctx.save();
        ctx.translate(128, 175);
        ctx.rotate(rad);
        ctx.beginPath();
        ctx.moveTo(0, -48);
        ctx.lineTo(0, -48 + length);
        ctx.stroke();
        ctx.restore();
      }

      // Draw dial labels
      ctx.fillStyle = '#64748b';
      ctx.font = '8px monospace';
      ctx.fillText('0°', 128, 118);
      ctx.fillText('-90°', 72, 178);
      ctx.fillText('+90°', 184, 178);
      ctx.fillText('180°', 128, 234);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('SYNC', 128, 140);

      // Rotating Needle (represents phase difference)
      ctx.save();
      ctx.translate(128, 175);
      let angleRad = 0;
      if (!state.IS_PLUG_CONNECTED) {
        angleRad = -Math.PI / 2; // Dead position
      } else {
        angleRad = state.phaseDiff * Math.PI / 180;
      }
      ctx.rotate(angleRad);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -42);
      ctx.stroke();
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();

      invTexture.needsUpdate = true;
    }

    // 3. Grid Console Panel
    if (gridCanvas) {
      const ctx = gridCanvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 256, 256);
      
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SUBSTATION TIE', 128, 30);
      
      const labelText = state.CURRENT_MODE === 'V2G' ? 'Grid Demand Target' : 'Grid Supply Capacity';
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(labelText, 128, 55);

      const targetText = formatPower(state.TARGET_POWER);
      const targetColor = state.CURRENT_MODE === 'V2G' ? '#ef4444' : '#3b82f6';
      ctx.fillStyle = targetColor;
      ctx.font = 'bold 22px monospace';
      ctx.fillText(targetText, 128, 90);

      // Draw Grid Tie Capacity percentage
      const gridEnergyPct = state.IS_PLUG_CONNECTED ? (state.CURRENT_MODE === 'V2G' ? 100 - (state.SOC - 50) : 100) : 100;
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('Grid Storage Capacity: ' + gridEnergyPct.toFixed(1) + '%', 128, 114);

      // Draw Grid Voltage status
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`Grid Voltage: ${state.voltage} V`, 128, 134);

      // Power deviation scale bar drawing
      ctx.fillStyle = '#475569';
      ctx.font = '10px sans-serif';
      ctx.fillText('Power Deviation Scale Bar', 128, 168);
      
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(38, 182, 180, 8);
      
      ctx.fillStyle = '#10b981';
      ctx.fillRect(123, 182, 10, 8);

      // Pointer triangle
      const px = 128 + pointerOffset;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(px, 194);
      ctx.lineTo(px - 6, 204);
      ctx.lineTo(px + 6, 204);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#64748b';
      ctx.font = '9px sans-serif';
      ctx.fillText('-12.0 kW', 38, 178);
      ctx.fillText('+12.0 kW', 218, 178);

      gridTexture.needsUpdate = true;
    }

    // 4. Status Panel texture
    if (statusCanvas) {
      const ctx = statusCanvas.getContext('2d');
      ctx.clearRect(0, 0, 256, 64);
      
      if (state.IS_PLUG_CONNECTED) {
        const boxCol = state.CURRENT_MODE === 'V2G' ? '#d97706' : '#2563eb';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(10, 5, 236, 54);
        ctx.strokeStyle = boxCol;
        ctx.lineWidth = 3.5;
        ctx.strokeRect(10, 5, 236, 54);
        
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(state.CURRENT_MODE === 'V2G' ? 'STATUS: V2G EXPORT' : 'STATUS: G2V IMPORT', 128, 38);
      }
      statusTexture.needsUpdate = true;
    }

    // Toggle 3D status mesh visibility
    if (statusMesh) {
      statusMesh.visible = state.IS_PLUG_CONNECTED;
    }

    // --- Mesh materials / wire coloring ---
    if (busbar1 && busbar2 && busbar3 && pilotBusbar1 && pilotBusbar2 && pilotBusbar3) {
      if (state.stage === 2) {
        if (isCompleted) {
          // Completed: open wires
          busbar1.material.color.setHex(0x64748b);
          busbar2.material.color.setHex(0x64748b);
          busbar3.material.color.setHex(0x64748b);
          pilotBusbar1.material.opacity = 0.1;
          pilotBusbar2.material.opacity = 0.1;
          pilotBusbar3.material.opacity = 0.1;
        } else {
          // Active loop: conducting green
          busbar1.material.color.setHex(0x10b981);
          busbar2.material.color.setHex(0x10b981);
          busbar3.material.color.setHex(0x10b981);
          pilotBusbar1.material.opacity = 0.8;
          pilotBusbar2.material.opacity = 0.8;
          pilotBusbar3.material.opacity = 0.8;
        }
      } else {
        // Standby
        busbar1.material.color.setHex(0x64748b);
        busbar2.material.color.setHex(0x64748b);
        busbar3.material.color.setHex(0x64748b);
        
        if (state.IS_PLUG_CONNECTED) {
          pilotBusbar1.material.opacity = 0.5;
          pilotBusbar2.material.opacity = 0.5;
          pilotBusbar3.material.opacity = 0.5;
        } else {
          pilotBusbar1.material.opacity = 0.1;
          pilotBusbar2.material.opacity = 0.1;
          pilotBusbar3.material.opacity = 0.1;
        }
      }
    }

    // Update HUD/slider labels based on mode direction
    if (currentLabel) {
      if (state.IS_PLUG_CONNECTED) {
        if (state.CURRENT_MODE === 'V2G') {
          currentLabel.textContent = 'Discharging Current';
        } else {
          currentLabel.textContent = 'Charging Current';
        }
      } else {
        currentLabel.textContent = 'Discharging Current';
      }
    }

    // Update state panel classes and text dynamically (incorporating G2V halt STANDBY mode)
    if (statePanel && stateLabel) {
      if (!state.IS_PLUG_CONNECTED) {
        statePanel.className = 'state-panel state-standby';
        stateLabel.textContent = 'STATE: DISCONNECTED';
      } else if (state.stage === 1) {
        statePanel.className = 'state-panel state-standby';
        if (state.SOC >= 100) {
          stateLabel.textContent = 'STATE: STANDBY (CHARGING COMPLETED)';
        } else {
          stateLabel.textContent = state.isSynced ? 'STATE: STANDBY (LOCKED/READY)' : 'STATE: STANDBY (UNSYNCED)';
        }
      } else {
        if (state.CURRENT_MODE === 'V2G') {
          statePanel.className = 'state-panel state-v2g';
          stateLabel.textContent = 'STATE: ACTIVE (V2G EXPORTING)';
        } else {
          if (isCompleted) {
            statePanel.className = 'state-panel state-standby';
            stateLabel.textContent = 'STATE: STANDBY (CHARGING COMPLETED)';
          } else {
            statePanel.className = 'state-panel state-g2v';
            stateLabel.textContent = 'STATE: ACTIVE (G2V CHARGING)';
          }
        }
      }
    }

    // Update synchronization states & lock sliders
    if (!state.IS_PLUG_CONNECTED) {
      voltageSlider.disabled = true;
      currentSlider.disabled = true;
      socSlider.disabled = true;

      syncStatusBadge.textContent = 'DISCONNECTED';
      syncStatusBadge.className = 'badge badge-unlocked';
      if (safetyAlert) safetyAlert.classList.add('hidden');

      syncPhaseBtn.disabled = false;
      syncPhaseBtn.className = 'btn btn-ready';
      syncPhaseBtn.textContent = '🔒 Position Cable to Begin';
      
      stopSyncBtn.disabled = true;
      stopSyncBtn.className = 'btn btn-disabled';
    } else if (state.stage === 1) {
      voltageSlider.disabled = false;
      currentSlider.disabled = false;
      socSlider.disabled = false;

      stopSyncBtn.disabled = true;
      stopSyncBtn.className = 'btn btn-disabled';
      
      if (state.isSynced) {
        syncStatusBadge.textContent = 'IN SYNC';
        syncStatusBadge.className = 'badge badge-locked';
        
        syncPhaseBtn.disabled = false;
        syncPhaseBtn.className = 'btn btn-ready';
        syncPhaseBtn.textContent = '⚡ Activate Energy Loop';
      } else {
        syncStatusBadge.textContent = 'OUT OF SYNC';
        syncStatusBadge.className = 'badge badge-unlocked';
        
        syncPhaseBtn.disabled = true;
        syncPhaseBtn.className = 'btn btn-disabled';
        syncPhaseBtn.textContent = '⚠️ Align Synchroscope to Lock Grid';
      }
      if (safetyAlert && state.SOC > 50 && !state.isLockedInEmergencyCharging) safetyAlert.classList.add('hidden');
    } else {
      // Active Loop (Stage 2)
      voltageSlider.disabled = false; // Keep voltage slider enabled so users can adjust parameters dynamically
      socSlider.disabled = true;
      currentSlider.disabled = isCompleted;

      // Activate button disabled during active run
      syncPhaseBtn.disabled = true;
      syncPhaseBtn.className = 'btn btn-disabled';
      syncPhaseBtn.textContent = isCompleted ? 'Charging Completed' : '⚡ Sync Locked / Running';
      
      // Stop button active
      stopSyncBtn.disabled = false;
      stopSyncBtn.className = 'btn btn-secondary';

      if (isCompleted) {
        syncStatusBadge.textContent = 'CHARGING COMPLETED';
        syncStatusBadge.className = 'badge badge-locked';
      } else {
        syncStatusBadge.textContent = 'ACTIVE LOOP';
        syncStatusBadge.className = 'badge badge-locked';
      }

      // 7. Battery and Grid capacity integration loop (runs every 1 second)
      state.socAccumulator += dt;
      if (state.socAccumulator >= 1000) {
        state.socAccumulator = 0;

        const socStep = (state.currentSetting / 60) * 1.5;

        if (state.CURRENT_MODE === 'V2G') {
          state.SOC -= socStep;
          state.GRID_STRESS_LEVEL += socStep;
        } else if (state.CURRENT_MODE === 'G2V') {
          if (state.SOC < 100) {
            state.SOC += socStep;
            state.GRID_STRESS_LEVEL -= socStep;
            
            if (state.SOC >= 100) {
              state.SOC = 100;
              state.batterySoc = 100;
              showToast("[COMPLETED] Battery fully replenished to 100% SOC. Returning to Standby.");
              disconnectSimulation('Success - Fully Charged');
            }
          }
        }

        state.SOC = Math.max(20, Math.min(100, state.SOC));
        state.GRID_STRESS_LEVEL = Math.max(20, Math.min(100, state.GRID_STRESS_LEVEL));
        state.batterySoc = state.SOC;

        // Push to history and redraw chart
        if (!isCompleted) {
          state.chartData.push({ soc: state.SOC, grid: state.CURRENT_MODE === 'V2G' ? 100 - (state.SOC - 50) : 100 });
          if (state.chartData.length > 30) {
            state.chartData.shift();
          }
          updateChartVisuals();
        }

        socSlider.value = state.batterySoc;
        socVal.textContent = state.batterySoc.toFixed(1) + '%';
      }

      // Grid Load Reduction accumulation
      if (state.CURRENT_MODE === 'V2G') {
        state.loadReductionStatus += (dt / 1000) * 8.5 * (Math.abs(netPower) / 10000);
        if (state.loadReductionStatus > 100) {
          state.loadReductionStatus = 100;
        }
      } else if (state.CURRENT_MODE === 'G2V' && state.SOC >= 100) {
        state.loadReductionStatus = 100;
      }

      if (reductionProgressBar) {
        reductionProgressBar.style.width = state.loadReductionStatus + '%';
      }
      if (reductionProgressVal) {
        reductionProgressVal.textContent = Math.round(state.loadReductionStatus) + '%';
      }

      // Override banner/safety alert banner management
      if (safetyAlert) {
        if (state.CURRENT_MODE === 'G2V') {
          if (state.SOC >= 100) {
            safetyAlert.innerHTML = "✨ [COMPLETED] Battery fully replenished to 100% SOC. Stable grid tie-in.";
            safetyAlert.classList.remove('hidden');
          } else if (state.isLockedInEmergencyCharging) {
            safetyAlert.innerHTML = "⚠️ [BMS OVERRIDE ACTIVE] Battery in low recovery zone (< 85% SOC). Locked in Emergency Charging to prevent hunting.";
            safetyAlert.classList.remove('hidden');
          } else {
            safetyAlert.classList.add('hidden');
          }
        } else {
          safetyAlert.classList.add('hidden');
        }
      }
    }

    // 8. Continuous electrochemical Current limits throttling
    const I_max = 60.0 * (1.0 - Math.exp(-(state.batterySoc - 20.0) / 15.0));
    const currentLimit = Math.max(5, Math.round(I_max));

    currentSlider.max = currentLimit;
    currentSliderLimitLabel.textContent = currentLimit + ' A';

    if (state.currentSetting > currentLimit) {
      state.currentSetting = currentLimit;
      currentSlider.value = currentLimit;
      currentVal.textContent = currentLimit + ' A';
    }

    // Update battery fill colors
    if (nodeSocText) {
      nodeSocText.textContent = state.batterySoc.toFixed(1) + '%';
    }

    // Update 3D battery indicator on EV roof
    if (batteryFillMesh) {
      const s = state.batterySoc / 100;
      batteryFillMesh.scale.y = s;
      batteryFillMesh.position.y = 1.22 + s * 0.23;
      
      let fillCol = 0x10b981; // Green
      if (state.batterySoc <= 25) {
        fillCol = 0xef4444; // Red
      } else if (state.batterySoc <= 50) {
        fillCol = 0xf59e0b; // Orange
      }
      batteryFillMesh.material.color.setHex(fillCol);
    }

    // Update Inverter LED Status Lights
    if (greenLED && redLED && orangeLED) {
      if (!state.IS_PLUG_CONNECTED) {
        greenLED.material.color.setHex(0x062014); // dim green
        redLED.material.color.setHex(0xef4444);   // bright red
        orangeLED.material.color.setHex(0x271c04); // dim orange
      } else if (state.stage === 1) {
        redLED.material.color.setHex(0xef4444); // bright red (not running)
        if (state.isSynced) {
          // Flashing green
          const blink = Math.floor(performance.now() / 300) % 2 === 0;
          greenLED.material.color.setHex(blink ? 0x10b981 : 0x062014);
          orangeLED.material.color.setHex(0x271c04);
        } else {
          greenLED.material.color.setHex(0x062014);
          // Flashing orange (unsynced warning)
          const blink = Math.floor(performance.now() / 400) % 2 === 0;
          orangeLED.material.color.setHex(blink ? 0xf59e0b : 0x271c04);
        }
      } else {
        // Stage 2 (Running)
        redLED.material.color.setHex(0x3b0707); // dim red
        greenLED.material.color.setHex(0x10b981); // solid green
        orangeLED.material.color.setHex(state.CURRENT_MODE === 'V2G' ? 0xf59e0b : 0x3b82f6); // solid orange or blue
      }
    }

    // Update active energy flow particles
    updateEnergyParticles(dt);
  }

  // --- Animation loop callback ---
  function animateFrame(timestamp) {
    if (!state.lastTime) {
      state.lastTime = timestamp;
    }
    const dt = timestamp - state.lastTime;
    state.lastTime = timestamp;

    updatePhysics(dt);

    // Smoothly animate the 3D breaker switch arm
    if (breakerArmGroup) {
      const targetArmAngle = (state.stage === 2 && !(state.CURRENT_MODE === 'G2V' && state.SOC >= 100)) ? 0 : -0.6;
      breakerArmGroup.rotation.z += (targetArmAngle - breakerArmGroup.rotation.z) * 0.1;
    }

    // Smooth camera focusing animation
    if (state.isAnimatingCamera) {
      camera.position.lerp(state.targetCameraPos, 0.08);
      controls.target.lerp(state.targetControlsTarget, 0.08);
      
      if (camera.position.distanceTo(state.targetCameraPos) < 0.005 && 
          controls.target.distanceTo(state.targetControlsTarget) < 0.005) {
        camera.position.copy(state.targetCameraPos);
        controls.target.copy(state.targetControlsTarget);
        state.isAnimatingCamera = false;
      }
    }

    // Render 3D Scene
    if (controls) {
      controls.update();
    }

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }

    // Keep rendering continuously
    animationFrameId = requestAnimationFrame(animateFrame);
  }

  // --- Loop Control Utilities ---
  let animationFrameId = null;
  let fluctuationInterval = null;

  // Start loop tickers
  function startSimulationLoops() {
    if (!fluctuationInterval) {
      fluctuationInterval = setInterval(() => {
        state.TARGET_POWER = state.CURRENT_MODE === 'V2G' ? 11500 : 6900;
        if (state.stage === 1) {
          updatePhysics(0);
        }
      }, 500);
    }

    if (!animationFrameId) {
      state.lastTime = performance.now();
      animationFrameId = requestAnimationFrame(animateFrame);
    }
  }

  // Stop simulation loops
  function stopSimulationLoops() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    if (fluctuationInterval) {
      clearInterval(fluctuationInterval);
      fluctuationInterval = null;
    }
  }

  function disconnectSimulation(reason = 'Deactivated') {
    state.stage = 1;
    if (safetyAlert && !state.isLockedInEmergencyCharging) {
      safetyAlert.classList.add('hidden');
    }
    
    // Calculate net power for logging
    let netPower = 0;
    const efficiency = 0.985 - 2.0e-9 * Math.pow(state.calculatedPower - 8000, 2);
    const clampedEff = Math.max(0.80, Math.min(0.985, efficiency));
    if (state.CURRENT_MODE === 'V2G') {
      netPower = state.calculatedPower * clampedEff;
    } else {
      netPower = state.calculatedPower / clampedEff;
    }

    if (reason) {
      appendLogRecord(state.CURRENT_MODE === 'V2G' ? 'V2G' : 'G2V', state.voltage, state.currentSetting, netPower, reason);
    }
    
    stopSimulationLoops();
    startSimulationLoops();
  }

  // --- Event Listeners ---

  // Slider inputs
  voltageSlider.addEventListener('input', (e) => {
    state.voltage = parseFloat(e.target.value);
    voltageVal.textContent = state.voltage + ' V';
    updatePhysics(0);
  });

  currentSlider.addEventListener('input', (e) => {
    state.currentSetting = parseFloat(e.target.value);
    currentVal.textContent = state.currentSetting + ' A';
    updatePhysics(0);
  });

  socSlider.addEventListener('input', (e) => {
    state.batterySoc = parseFloat(e.target.value);
    state.SOC = state.batterySoc;
    socVal.textContent = state.batterySoc.toFixed(1) + '%';
    updatePhysics(0);
  });

  // Switch Engage / Activate Energy Loop click
  syncPhaseBtn.addEventListener('click', () => {
    if (!state.IS_PLUG_CONNECTED) {
      showToast("[INTERLOCK ACTIVE] Please drag and drop the Charging Plug into the EV receptacle socket to initialize.");
      return;
    }

    if (!state.isSynced) {
      showToast("[SYNC ERROR] Inverter frequency and phase angle are not matched with the Grid.");
      return;
    }

    if (state.stage === 1) {
      // Activate Energy Loop (Stage 2)
      state.stage = 2;
      state.socAccumulator = 0;
      
      // Sync parameters
      state.SOC = state.batterySoc;
      state.chartData = [];
      state.chartData.push({ soc: state.SOC, grid: state.CURRENT_MODE === 'V2G' ? 100 - (state.SOC - 50) : 100 });
      updateChartVisuals();

      let netPower = 0;
      const efficiency = 0.985 - 2.0e-9 * Math.pow(state.calculatedPower - 8000, 2);
      const clampedEff = Math.max(0.80, Math.min(0.985, efficiency));
      if (state.CURRENT_MODE === 'V2G') {
        netPower = state.calculatedPower * clampedEff;
      } else {
        netPower = state.calculatedPower / clampedEff;
      }

      appendLogRecord(state.CURRENT_MODE === 'V2G' ? 'V2G' : 'G2V', state.voltage, state.currentSetting, netPower, 'Activated');
      
      // Start loops
      startSimulationLoops();
    }
    updatePhysics(0);
  });

  // Disengage Grid click
  stopSyncBtn.addEventListener('click', () => {
    disconnectSimulation();
    updatePhysics(0);
  });

  // Clear records
  clearLogBtn.addEventListener('click', () => {
    logTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">No telemetry records logged. Tune sliders and engage synchronization to capture data.</td>
      </tr>`;
  });

  // Reset Test Bench to initial conditions
  resetBenchBtn.addEventListener('click', () => {
    stopSimulationLoops();

    state.stage = 1;
    state.voltage = 220;
    state.currentSetting = 20;
    state.batterySoc = 90;
    state.arrowOffset = 0;
    state.socAccumulator = 0;
    state.loadReductionStatus = 0;
    
    // Reset capacities and chart
    state.SOC = 90;
    state.TARGET_POWER = 11500;
    state.GRID_STRESS_LEVEL = 100;
    
    // Reset loophole locks
    state.isLockedInEmergencyCharging = false;
    state.CURRENT_MODE = 'G2V';
    state.chartData = [];
    updateChartVisuals();

    // Reset advanced variables
    state.inverterFreq = 49.2;
    state.inverterPhase = -90.0;
    state.phaseDiff = -90.0;
    state.isSynced = false;
    state.temp = 25.0;
    state.isThermalThrottled = false;

    // Reset connection flags
    state.IS_PLUG_CONNECTED = false;

    // Reset 3D plug and cable in Three.js
    if (plugMesh) {
      plugMesh.position.copy(bracketPos);
      plugMesh.rotation.set(0, 0, 0);
      updateCableSpline();
    }

    // Reset camera and controls view orientation
    if (camera && controls) {
      camera.position.set(10, 8, 10);
      camera.lookAt(0, 0.5, 0);
      controls.target.set(0, 0.5, 0);
      controls.update();
    }

    // Reset sliders in DOM
    voltageSlider.value = 220;
    voltageSlider.disabled = true;
    voltageVal.textContent = '220 V';
    
    currentSlider.value = 20;
    currentSlider.max = 60;
    currentSlider.disabled = true;
    currentVal.textContent = '20 A';
    currentSliderLimitLabel.textContent = '60 A';
    
    socSlider.value = 90;
    socSlider.disabled = true;
    socVal.textContent = '90.0%';

    // Reset camera target state
    state.targetCameraPos.set(10, 8, 10);
    state.targetControlsTarget.set(0, 0.5, 0);
    state.isAnimatingCamera = false;

    // Reset structural labels
    if (currentLabel) {
      currentLabel.textContent = 'Discharging Current';
    }

    // Re-initialize buttons
    syncPhaseBtn.textContent = '🔒 Position Cable to Begin';
    syncPhaseBtn.disabled = false;
    syncPhaseBtn.className = 'btn btn-ready';

    stopSyncBtn.disabled = true;
    stopSyncBtn.className = 'btn btn-disabled';

    if (safetyAlert) safetyAlert.classList.add('hidden');

    // Reset temperatures style
    if (teleTemp) {
      teleTemp.textContent = '25.0 °C';
      teleTemp.style.color = 'var(--text-main)';
      teleTemp.style.fontWeight = 'normal';
    }

    if (inverterGlowL && inverterGlowR) {
      inverterGlowL.material.opacity = 0;
      inverterGlowR.material.opacity = 0;
      inverterGlowL.material.color.setHex(0xff5500);
      inverterGlowR.material.color.setHex(0xff5500);
    }

    // Reset breaker visual arm
    if (breakerArmGroup) {
      breakerArmGroup.rotation.z = -0.6;
    }

    logTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">No telemetry records logged. Tune sliders and engage synchronization to capture data.</td>
      </tr>`;

    // Restart loops
    startSimulationLoops();
    
    updatePhysics(0);
  });

  // --- Initial Launch ---
  init3DScene();
  initChart();
  startSimulationLoops();
  updatePhysics(0);
});
