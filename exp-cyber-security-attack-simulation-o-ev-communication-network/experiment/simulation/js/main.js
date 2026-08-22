const state = {
  // Config Inputs
  attackIntensity: 0,      
  packetRate: 10,          
  securityLevel: 'none',   
  drivingProfile: 'normal',

  // Real-time Telemetry Outputs
  vehicleSpeed: 0,        
  netPower: 0,            
  currentFlow: 0,         
  batteryVoltage: 375,    
  batterySOC: 80.0,       
  batteryTemp: 28,        
  
  frontMotorSpeed: 0,     
  frontMotorTorque: 0,    
  frontMotorTemp: 25,     

  rearMotorSpeed: 0,      
  rearMotorTorque: 0,     
  rearMotorTemp: 25,      

  pduDCDC: 14.1,          
  pduAuxLoad: 1.2,        
};

// SVG Particle tracking
let particles = [];
let particleGroup = null;

// Animation tick state
let lastTime = 0;
let particleSpawnTimer = 0;

// Initialize on DOM Load
function startSimulator() {
  particleGroup = document.getElementById('particle-group');
  
  initTabs();
  initEventListeners();
  initHoverTooltips();
  initInfoOverlay();
  initComponentPopups();

  // Reset and start animation loop
  resetSimulator();
  requestAnimationFrame(animationLoop);
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', startSimulator);
} else {
  startSimulator();
}

// Tab Switching setup
function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetId = tab.dataset.tab;
      document.getElementById(targetId).classList.add('active');
      
      // Update MathJax when switching to calculations tab
      if (targetId === 'calculations-tab' && window.MathJax) {
        window.MathJax.typesetPromise();
      }
    });
  });
}

// Hover tooltips handler for maximum reliability across browsers
function initHoverTooltips() {
  const blocks = document.querySelectorAll('.hardware-block');
  blocks.forEach(block => {
    const tooltip = block.querySelector('.component-tooltip');
    if (tooltip) {
      block.addEventListener('mouseenter', () => {
        tooltip.style.setProperty('opacity', '1', 'important');
        tooltip.style.setProperty('visibility', 'visible', 'important');
      });
      block.addEventListener('mouseleave', () => {
        tooltip.style.setProperty('opacity', '0', 'important');
        tooltip.style.setProperty('visibility', 'hidden', 'important');
      });
    }
  });
}

function togglePacketRateSlider() {
  const slider = document.getElementById('slider-packet-rate');
  const label = document.getElementById('val-packet-rate');
  if (!slider || !label) return;

  if (state.drivingProfile === 'custom') {
    slider.disabled = false;
    slider.style.opacity = '1';
    slider.style.pointerEvents = 'auto';
    label.innerText = state.packetRate;
  } else {
    slider.disabled = true;
    slider.style.opacity = '0.5';
    slider.style.pointerEvents = 'none';
    label.innerText = 'Preset';
  }
}

// Bind UI controls for Cyber Security Attack Simulation
function initEventListeners() {
  const sliderIntensity = document.getElementById('slider-intensity');
  const sliderPacketRate = document.getElementById('slider-packet-rate');
  const selectDrivingProfile = document.getElementById('select-driving-profile');
  const btnReset = document.getElementById('btn-reset');

  // Intensity slider
  sliderIntensity.addEventListener('input', (e) => {
    state.attackIntensity = parseInt(e.target.value);
    document.getElementById('val-intensity').innerText = state.attackIntensity;
    
    // Update physics and UI in real-time
    updatePhysics(0);
    updateUI();
  });

  // Packet rate slider
  sliderPacketRate.addEventListener('input', (e) => {
    state.packetRate = parseInt(e.target.value);
    document.getElementById('val-packet-rate').innerText = state.packetRate;
    
    // Update physics and UI in real-time
    updatePhysics(0);
    updateUI();
  });

  // Driving profile dropdown
  selectDrivingProfile.addEventListener('change', (e) => {
    state.drivingProfile = e.target.value;
    togglePacketRateSlider();
    updatePhysics(0);
    updateUI();
  });

  // Security Defence Level Preset Buttons
  const defensePresets = [
    { id: 'preset-defense-none', value: 'none' },
    { id: 'preset-defense-basic', value: 'basic' },
    { id: 'preset-defense-ids', value: 'ids' },
    { id: 'preset-defense-secoc', value: 'secoc' }
  ];

  defensePresets.forEach(preset => {
    const el = document.getElementById(preset.id);
    if (el) {
      el.addEventListener('click', () => {
        applyDefense(preset.value);
      });
    }
  });

  // Reset button
  btnReset.addEventListener('click', resetSimulator);
}

function highlightDefenseBtn(activeId) {
  ['preset-defense-none', 'preset-defense-basic', 'preset-defense-ids', 'preset-defense-secoc'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.remove('active');
  });
  const activeBtn = document.getElementById(activeId);
  if (activeBtn) activeBtn.classList.add('active');
}

function applyDefense(level) {
  state.securityLevel = level;
  highlightDefenseBtn(`preset-defense-${level}`);
  
  // Update physics and UI in real-time
  updatePhysics(0);
  updateUI();
}

// Restore default values
function resetSimulator() {
  state.batterySOC = 80.0;
  state.batteryTemp = 28;
  state.frontMotorTemp = 25;
  state.rearMotorTemp = 25;
  state.vehicleSpeed = 55;
  state.attackIntensity = 0;
  state.packetRate = 10;
  state.securityLevel = 'none';
  state.drivingProfile = 'normal';

  const selectDrivingProfile = document.getElementById('select-driving-profile');
  if (selectDrivingProfile) selectDrivingProfile.value = 'normal';

  const sliderIntensity = document.getElementById('slider-intensity');
  if (sliderIntensity) {
    sliderIntensity.value = 0;
    document.getElementById('val-intensity').innerText = '0';
  }

  const sliderPacketRate = document.getElementById('slider-packet-rate');
  if (sliderPacketRate) {
    sliderPacketRate.value = 10;
    document.getElementById('val-packet-rate').innerText = '10';
  }

  togglePacketRateSlider();

  highlightDefenseBtn('preset-defense-none');

  // Update physics and UI in real-time
  updatePhysics(0);
  updateUI();
}



/* Dynamic HUD SVG Blueprint vector maps */
const componentBlueprints = {
  'front-motor': {
    title: 'Front Electric Motor & Inverter Assembly (FM)',
    description: `
      <ul class="nomenclature-list">
        <li><strong>SiC Inverter Module:</strong>
          <ul>
            <li><em>Why it is there:</em> Converts high-voltage DC battery power to variable-frequency 3-phase AC power.</li>
            <li><em>How it works:</em> Uses Silicon Carbide (SiC) MOSFET semiconductors to switch high voltages at high frequencies, optimizing system thermal and electrical efficiency.</li>
          </ul>
        </li>
        <li><strong>Stator Coils:</strong>
          <ul>
            <li><em>Why it is there:</em> Creates a rotating stator magnetic field.</li>
            <li><em>How it works:</em> Copper coils receive the 3-phase AC voltage from the inverter, generating electromagnetic fields that pull the rotor magnets.</li>
          </ul>
        </li>
        <li><strong>Rotor Shaft:</strong>
          <ul>
            <li><em>Why it is there:</em> Delivers mechanical rotational force directly to the front axle wheels.</li>
            <li><em>How it works:</em> Integrates rare-earth permanent magnets that lock onto and rotate in sync with the stator's magnetic field, turning electrical energy into traction.</li>
          </ul>
        </li>
      </ul>
    `,
    svg: `
      <svg viewBox="0 0 200 120">
        <path class="hud-bg-grid" d="M 0,20 L 200,20 M 0,40 L 200,40 M 0,60 L 200,60 M 0,80 L 200,80 M 0,100 L 200,100 M 40,0 L 40,120 M 80,0 L 80,120 M 120,0 L 120,120 M 160,0 L 160,120" />
        <circle cx="130" cy="60" r="28" class="hud-outline hud-outline-primary" />
        <circle cx="130" cy="60" r="16" class="hud-outline" />
        <circle cx="130" cy="60" r="6" fill="var(--flow-color-accel)" />
        <rect x="35" y="40" width="55" height="40" rx="3" class="hud-outline hud-outline-secondary" />
        <text x="62.5" y="63" class="hud-text hud-text-highlight" text-anchor="middle" font-size="5.5px">SiC INVERTER</text>
        <path d="M 90,55 L 105,55 L 105,60" stroke="#f59e0b" stroke-width="1.2" fill="none" />
        <path d="M 90,60 L 102,60" stroke="#ef4444" stroke-width="1.2" fill="none" />
        <path d="M 90,65 L 105,65 L 105,60" stroke="#3b82f6" stroke-width="1.2" fill="none" />
        <path class="hud-callout-line" d="M 45,40 L 45,18 L 20,18" />
        <circle cx="45" cy="40" r="1.5" class="hud-pointer" />
        <text x="12" y="14" class="hud-text">SiC MODULES</text>
        <path class="hud-callout-line" d="M 130,32 L 130,18 L 155,18" />
        <circle cx="130" cy="32" r="1.5" class="hud-pointer" />
        <text x="157" y="14" class="hud-text">STATOR COILS</text>
        <path class="hud-callout-line" d="M 130,60 L 155,85 L 175,85" />
        <circle cx="130" cy="60" r="1.5" class="hud-pointer" />
        <text x="152" y="93" class="hud-text">ROTOR SHAFT</text>
      </svg>
    `
  },
  'rear-motor': {
    title: 'Rear Electric Motor & Inverter Assembly (RM)',
    description: `
      <ul class="nomenclature-list">
        <li><strong>IGBT Inverter:</strong>
          <ul>
            <li><em>Why it is there:</em> Modulates and distributes massive DC currents into 3-phase AC.</li>
            <li><em>How it works:</em> Insulated Gate Bipolar Transistors (IGBTs) switch high battery power on and off under CAN speed commands.</li>
          </ul>
        </li>
        <li><strong>Traction Core:</strong>
          <ul>
            <li><em>Why it is there:</em> Acts as primary vehicle propulsion motor and harvester for regenerative braking.</li>
            <li><em>How it works:</em> Alternating AC currents create magnetic torque against the permanent-magnet rotor, driving the drivetrain forward.</li>
          </ul>
        </li>
        <li><strong>Gearbox & Differential:</strong>
          <ul>
            <li><em>Why it is there:</em> Reduces high motor speed to axle RPM and permits rear wheels to turn at different speeds during corners.</li>
            <li><em>How it works:</em> High-speed helical gear meshes step down rotation speed, channeling power split-ratio to the left and right rear axles.</li>
          </ul>
        </li>
      </ul>
    `,
    svg: `
      <svg viewBox="0 0 200 120">
        <path class="hud-bg-grid" d="M 0,20 L 200,20 M 0,40 L 200,40 M 0,60 L 200,60 M 0,80 L 200,80 M 0,100 L 200,100 M 40,0 L 40,120 M 80,0 L 80,120 M 120,0 L 120,120 M 160,0 L 160,120" />
        <circle cx="110" cy="60" r="28" class="hud-outline hud-outline-primary" />
        <rect x="25" y="40" width="50" height="40" rx="3" class="hud-outline hud-outline-secondary" />
        <text x="50" y="63" class="hud-text hud-text-highlight" text-anchor="middle" font-size="5.5px">IGBT INVERTER</text>
        <rect x="148" y="48" width="24" height="24" rx="2" class="hud-outline" />
        <text x="160" y="62" class="hud-text" text-anchor="middle" font-size="4.5px">GEARBOX</text>
        <path class="hud-callout-line" d="M 110,32 L 110,18 L 85,18" />
        <circle cx="110" cy="32" r="1.5" class="hud-pointer" />
        <text x="50" y="14" class="hud-text">TRACTION CORE</text>
        <path class="hud-callout-line" d="M 160,48 L 160,30 L 180,30" />
        <circle cx="160" cy="48" r="1.5" class="hud-pointer" />
        <text x="162" y="26" class="hud-text">DIFF GEAR</text>
      </svg>
    `
  },
  'battery-pack': {
    title: 'High-Voltage Battery Pack & BMS Unit',
    description: `
      <ul class="nomenclature-list">
        <li><strong>Lithium-Ion Cell Grid:</strong>
          <ul>
            <li><em>Why it is there:</em> Stores chemical electrical charge to feed the powertrain system.</li>
            <li><em>How it works:</em> Hundreds of cells are grouped in series blocks to raise total potential to 375V/800V, providing high discharge current capacity.</li>
          </ul>
        </li>
        <li><strong>BMS Controller:</strong>
          <ul>
            <li><em>Why it is there:</em> Acts as the primary battery computer safeguarding charge, state, and temperatures.</li>
            <li><em>How it works:</em> Monitors cell tap voltages and balances modules, relaying status data over the CAN network.</li>
          </ul>
        </li>
        <li><strong>HV Contactors:</strong>
          <ul>
            <li><em>Why it is there:</em> Fast isolation relays connecting or isolating pack voltage from the vehicle DC bus.</li>
            <li><em>How it works:</em> Controlled via low-voltage coils, these physical relays snap open during accidents or cyber-compromise alerts to make the vehicle safe.</li>
          </ul>
        </li>
      </ul>
    `,
    svg: `
      <svg viewBox="0 0 200 120">
        <path class="hud-bg-grid" d="M 0,20 L 200,20 M 0,40 L 200,40 M 0,60 L 200,60 M 0,80 L 200,80 M 0,100 L 200,100" />
        <rect x="25" y="25" width="22" height="15" rx="1" fill="#1e293b" class="hud-outline hud-outline-battery" />
        <rect x="52" y="25" width="22" height="15" rx="1" fill="#1e293b" class="hud-outline hud-outline-battery" />
        <rect x="79" y="25" width="22" height="15" rx="1" fill="#1e293b" class="hud-outline hud-outline-battery" />
        <rect x="25" y="45" width="22" height="15" rx="1" fill="#1e293b" class="hud-outline hud-outline-battery" />
        <rect x="52" y="45" width="22" height="15" rx="1" fill="#1e293b" class="hud-outline hud-outline-battery" />
        <rect x="79" y="45" width="22" height="15" rx="1" fill="#1e293b" class="hud-outline hud-outline-battery" />
        <rect x="110" y="25" width="60" height="35" rx="2" class="hud-outline hud-outline-primary" />
        <text x="140" y="46" class="hud-text hud-text-highlight" text-anchor="middle" font-size="5.5px">BMS BOARD</text>
        <circle cx="50" cy="85" r="5" class="hud-outline" />
        <circle cx="80" cy="85" r="5" class="hud-outline" />
        <path d="M 55,85 L 75,85" stroke="#ef4444" stroke-width="1.2" />
        <path class="hud-callout-line" d="M 36,25 L 36,12 L 18,12" />
        <circle cx="36" cy="25" r="1.5" class="hud-pointer" />
        <text x="8" y="8" class="hud-text hud-text-battery">CELL GRID</text>
        <path class="hud-callout-line" d="M 140,25 L 140,12 L 165,12" />
        <circle cx="140" cy="25" r="1.5" class="hud-pointer" />
        <text x="168" y="8" class="hud-text hud-text-highlight">CONTROLLER</text>
        <path class="hud-callout-line" d="M 65,85 L 65,102 L 90,102" />
        <circle cx="65" cy="85" r="1.5" class="hud-pointer" />
        <text x="92" y="105" class="hud-text">HV CONTACTORS</text>
      </svg>
    `
  },
  'pdu': {
    title: 'Power Distribution Unit (PDU)',
    description: `
      <ul class="nomenclature-list">
        <li><strong>HV Busbars:</strong>
          <ul>
            <li><em>Why it is there:</em> Conducts massive high-voltage DC power between charger, batteries, and motors.</li>
            <li><em>How it works:</em> Solid copper plates distribute currents up to 400A with minimal resistance and heating.</li>
          </ul>
        </li>
        <li><strong>HV Fuse Blocks:</strong>
          <ul>
            <li><em>Why it is there:</em> Protects secondary auxiliary hardware from current overloads.</li>
            <li><em>How it works:</em> Sacrificial metal links melt instantly when current surges occur, isolating secondary lines.</li>
          </ul>
        </li>
        <li><strong>Accessory Relays:</strong>
          <ul>
            <li><em>Why it is there:</em> Switches auxiliary systems (compressor, heater, DC-DC) on and off.</li>
            <li><em>How it works:</em> Responds to low-voltage computer pilot commands to bridge high-voltage connections.</li>
          </ul>
        </li>
      </ul>
    `,
    svg: `
      <svg viewBox="0 0 200 120">
        <path class="hud-bg-grid" d="M 0,20 L 200,20 M 0,40 L 200,40 M 0,60 L 200,60 M 0,80 L 200,80 M 0,100 L 200,100" />
        <rect x="40" y="30" width="120" height="60" rx="4" class="hud-outline hud-outline-primary" />
        <path d="M 50,45 L 150,45" stroke="#f59e0b" stroke-width="2" />
        <path d="M 50,75 L 150,75" stroke="#3b82f6" stroke-width="2" />
        <rect x="70" y="40" width="16" height="10" rx="1" fill="#1e293b" stroke="#f59e0b" />
        <rect x="70" y="70" width="16" height="10" rx="1" fill="#1e293b" stroke="#3b82f6" />
        <rect x="110" y="40" width="20" height="10" rx="1" fill="#1e293b" stroke="#10b981" />
        <text x="120" y="47" class="hud-text hud-text-battery" text-anchor="middle" font-size="4px">RELAY</text>
        <path class="hud-callout-line" d="M 78,40 L 78,15 L 55,15" />
        <circle cx="78" cy="40" r="1.5" class="hud-pointer" />
        <text x="25" y="11" class="hud-text">HV FUSES</text>
        <path class="hud-callout-line" d="M 120,40 L 120,15 L 140,15" />
        <circle cx="120" cy="40" r="1.5" class="hud-pointer" />
        <text x="143" y="11" class="hud-text">SYSTEM RELAYS</text>
        <path class="hud-callout-line" d="M 100,75 L 100,102 L 120,102" />
        <circle cx="100" cy="75" r="1.5" class="hud-pointer" />
        <text x="123" y="105" class="hud-text">DC BUSBARS</text>
      </svg>
    `
  },
  'obc': {
    title: 'On-Board Charger (OBC)',
    description: `
      <ul class="nomenclature-list">
        <li><strong>AC EMI Filter:</strong>
          <ul>
            <li><em>Why it is there:</em> Dampens electromagnetic interference generated during high-power charging.</li>
            <li><em>How it works:</em> Inductive-capacitive coils absorb high-frequency grid noise before it enters the drivetrain components.</li>
          </ul>
        </li>
        <li><strong>Active PFC Stage:</strong>
          <ul>
            <li><em>Why it is there:</em> Enhances grid charging efficiency by keeping the voltage/current in phase.</li>
            <li><em>How it works:</em> Active boost circuits shape current waveforms, preventing power factor loss during AC charging.</li>
          </ul>
        </li>
        <li><strong>Isolated DC-DC Converter:</strong>
          <ul>
            <li><em>Why it is there:</em> Steps up voltage to battery charge levels while isolating grid lines from the car chassis.</li>
            <li><em>How it works:</em> Converts DC grid potentials using high-frequency magnetic coupling transformers, providing complete galvanic isolation.</li>
          </ul>
        </li>
      </ul>
    `,
    svg: `
      <svg viewBox="0 0 200 120">
        <path class="hud-bg-grid" d="M 0,20 L 200,20 M 0,40 L 200,40 M 0,60 L 200,60 M 0,80 L 200,80 M 0,100 L 200,100" />
        <rect x="30" y="30" width="140" height="60" rx="4" class="hud-outline hud-outline-secondary" />
        <rect x="40" y="45" width="35" height="30" rx="2" fill="#1e293b" stroke="#475569" />
        <text x="57.5" y="62" class="hud-text" text-anchor="middle" font-size="4.5px">EMI FILTER</text>
        <rect x="82.5" y="45" width="35" height="30" rx="2" fill="#1e293b" stroke="#475569" />
        <text x="100" y="62" class="hud-text" text-anchor="middle" font-size="4.5px">PFC STAGE</text>
        <rect x="125" y="45" width="35" height="30" rx="2" fill="#1e293b" stroke="#475569" />
        <text x="142.5" y="62" class="hud-text" text-anchor="middle" font-size="4.5px">DC-DC CONV</text>
        <path class="hud-callout-line" d="M 57.5,45 L 57.5,18 L 40,18" />
        <circle cx="57.5" cy="45" r="1.5" class="hud-pointer" />
        <text x="10" y="14" class="hud-text">AC INPUT FILTER</text>
        <path class="hud-callout-line" d="M 142.5,45 L 142.5,18 L 160,18" />
        <circle cx="142.5" cy="45" r="1.5" class="hud-pointer" />
        <text x="163" y="14" class="hud-text">DC OUTPUT</text>
      </svg>
    `
  },
  'charging-port': {
    title: 'High-Voltage CCS Charging Port (CP)',
    description: `
      <ul class="nomenclature-list">
        <li><strong>CCS Socket Terminals:</strong>
          <ul>
            <li><em>Why it is there:</em> Standard physical connector interface for AC and DC charging.</li>
            <li><em>How it works:</em> Mates with high-current pins to feed electrical currents directly to the OBC (AC) or battery bus (DC).</li>
          </ul>
        </li>
        <li><strong>Control Pilot (CP) Pin:</strong>
          <ul>
            <li><em>Why it is there:</em> Conducts digital communication between vehicle and charger.</li>
            <li><em>How it works:</em> Transmits ISO 15118 / DIN 70121 PLC signals over a 12V pulse-width modulated (PWM) pilot wire. Vulnerable to rogue charger data injection.</li>
          </ul>
        </li>
        <li><strong>Proximity Pilot (PP) Pin:</strong>
          <ul>
            <li><em>Why it is there:</em> Senses charging connector insertion status.</li>
            <li><em>How it works:</em> Measures loop resistance changes, preventing vehicle start-up during charging and disabling arcing when cable is unplugged.</li>
          </ul>
        </li>
      </ul>
    `,
    svg: `
      <svg viewBox="0 0 200 120">
        <path class="hud-bg-grid" d="M 0,20 L 200,20 M 0,40 L 200,40 M 0,60 L 200,60 M 0,80 L 200,80 M 0,100 L 200,100" />
        <circle cx="100" cy="60" r="45" class="hud-outline hud-outline-primary" />
        <circle cx="100" cy="45" r="22" class="hud-outline" />
        <circle cx="85" cy="85" r="8" fill="#1e293b" stroke="var(--color-danger)" stroke-width="1.5" />
        <circle cx="115" cy="85" r="8" fill="#1e293b" stroke="var(--color-danger)" stroke-width="1.5" />
        <circle cx="88" cy="40" r="3.5" fill="#1e293b" stroke="#94a3b8" />
        <circle cx="112" cy="40" r="3.5" fill="#1e293b" stroke="#94a3b8" />
        <circle cx="100" cy="52" r="3" fill="#1e293b" stroke="#94a3b8" />
        <circle cx="92" cy="47" r="2" fill="#0f172a" stroke="var(--flow-color-accel)" stroke-width="1.2" />
        <circle cx="108" cy="47" r="2" fill="#0f172a" stroke="var(--flow-color-accel)" stroke-width="1.2" />
        <path class="hud-callout-line" d="M 92,47 L 70,30 L 40,30" />
        <circle cx="92" cy="47" r="1.5" class="hud-pointer" />
        <text x="10" y="26" class="hud-text hud-text-highlight">CONTROL PILOT (CP)</text>
        <path class="hud-callout-line" d="M 85,85 L 60,100 L 40,100" />
        <circle cx="85" cy="85" r="1.5" class="hud-pointer" />
        <text x="10" y="96" class="hud-text hud-text-port">DC FAST CHARGE (-)</text>
        <path class="hud-callout-line" d="M 115,85 L 140,100 L 160,100" />
        <circle cx="115" cy="85" r="1.5" class="hud-pointer" />
        <text x="162" y="96" class="hud-text hud-text-port">DC FAST CHARGE (+)</text>
      </svg>
    `
  }
};

const componentCoords = {
  'front-motor': { x: 20, y: 73 },
  'battery-pack': { x: 47, y: 83 },
  'pdu': { x: 35, y: 43 },
  'obc': { x: 60, y: 50 },
  'rear-motor': { x: 74, y: 73 },
  'charging-port': { x: 85, y: 50 }
};

function createThoughtTail(overlay, componentId) {
  // Clear any existing thought bubble tail elements
  const oldTails = overlay.querySelectorAll('.thought-tail-circle');
  oldTails.forEach(t => t.remove());
}


function initInfoOverlay() {
  const closeBtn = document.getElementById('btn-close-info');
  const triggerBtn = document.getElementById('btn-info');
  const overlay = document.getElementById('info-overlay');

  if (overlay) {
    // Generate the initial thought tail on load since info-overlay starts in active state
    createThoughtTail(overlay, 'charging-port');
    
    // Hide the legend on load because overlay is active
    const legend = document.getElementById('flow-packet-legend');
    if (legend) legend.style.display = 'none';
  }

  if (closeBtn && overlay) {
    closeBtn.addEventListener('click', () => {
      overlay.classList.remove('active');
      const oldTails = overlay.querySelectorAll('.thought-tail-circle');
      oldTails.forEach(t => t.remove());
      
      // Show the legend when overlay closes
      const legend = document.getElementById('flow-packet-legend');
      if (legend) legend.style.display = 'flex';
    });
  }

  if (triggerBtn && overlay) {
    triggerBtn.addEventListener('click', () => {
      const compOverlay = document.getElementById('component-popup-overlay');
      if (compOverlay) compOverlay.classList.remove('active');
      
      createThoughtTail(overlay, 'charging-port');
      overlay.classList.add('active');
      
      // Hide the legend when overlay opens
      const legend = document.getElementById('flow-packet-legend');
      if (legend) legend.style.display = 'none';
    });
  }
}

function initComponentPopups() {
  const overlay = document.getElementById('component-popup-overlay');
  const closeBtn = document.getElementById('popup-close-btn');
  const svgContainer = document.getElementById('popup-svg-container');
  const titleEl = document.getElementById('popup-title');
  const descEl = document.getElementById('popup-description');

  if (!overlay || !closeBtn || !svgContainer || !titleEl || !descEl) return;

  document.querySelectorAll('.hardware-block').forEach(block => {
    block.addEventListener('click', () => {
      if (block.id === 'security-gateway') return;

      const details = componentBlueprints[block.id];
      if (details) {
        titleEl.innerText = details.title;
        descEl.innerHTML = details.description;
        svgContainer.innerHTML = details.svg;

        const infoOverlay = document.getElementById('info-overlay');
        if (infoOverlay) infoOverlay.classList.remove('active');

        // Draw the comic thought bubble tail circles
        createThoughtTail(overlay, block.id);
        overlay.classList.add('active');
        
        // Hide the legend when popup opens
        const legend = document.getElementById('flow-packet-legend');
        if (legend) legend.style.display = 'none';
      }
    });
  });

  closeBtn.addEventListener('click', () => {
    overlay.classList.remove('active');
    const oldTails = overlay.querySelectorAll('.thought-tail-circle');
    oldTails.forEach(t => t.remove());
    
    // Show the legend when popup closes
    const legend = document.getElementById('flow-packet-legend');
    if (legend) legend.style.display = 'flex';
  });

  overlay.addEventListener('click', (e) => {
    if (e.target.id === 'component-popup-overlay') {
      overlay.classList.remove('active');
      const oldTails = overlay.querySelectorAll('.thought-tail-circle');
      oldTails.forEach(t => t.remove());
      
      // Show the legend when popup closes
      const legend = document.getElementById('flow-packet-legend');
      if (legend) legend.style.display = 'flex';
    }
  });
}

// Spawns particle on specific SVG flow path
function spawnParticle(pathId, type) {
  const pathEl = document.getElementById(pathId);
  if (!pathEl || !particleGroup) return;

  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  
  // Style malicious packets red if an attack is active and not fully defended
  let mitigation = 0;
  if (state.securityLevel === 'secoc') mitigation = 1.0;
  else if (state.securityLevel === 'ids') mitigation = 0.85;
  else if (state.securityLevel === 'basic') mitigation = 0.3;

  let isMalicious = false;
  let willBeCorrupted = false;

  if (state.attackIntensity > 0) {
    if (pathId === 'flow-port-pdu') {
      // Injected packets always start as malicious red at CP
      isMalicious = true;
    } else if (pathId === 'flow-pdu-battery') {
      // Leaked packets from PDU to Battery are red if attack penetrates
      if (Math.random() >= mitigation) {
        isMalicious = true;
      }
    } else if (pathId.startsWith('flow-battery')) {
      // Traction lines (BMS -> Motors) spawn blue, but degrade mid-flight if attack penetrates
      if (Math.random() >= mitigation) {
        willBeCorrupted = true;
      }
    }
  }

  let particleClass = `flow-particle ${type}`;
  if (isMalicious) {
    particleClass += ' malicious'; // Adds .malicious styling
  }
  
  circle.setAttribute('class', particleClass);
  particleGroup.appendChild(circle);

  let startProgress = 0;
  if (pathId === 'flow-pdu-battery' && !isMalicious) {
    startProgress = 1; // Normal aux flow goes Battery -> PDU (reverse)
  }

  let speed = type === 'aux' ? 0.008 : 0.015;
  if (isMalicious) {
    speed = 0.018; // Injected attack packets move faster to show high-speed CAN flood
  }

  particles.push({
    pathEl: pathEl,
    element: circle,
    progress: startProgress,
    speed: speed,
    type: type,
    isMalicious: isMalicious,
    willBeCorrupted: willBeCorrupted,
    hasBeenFiltered: false
  });
}

// Animates particles along SVG paths
function updateParticles() {
  const baseRateMap = { eco: 10, normal: 30, sport: 80, custom: 0 };
  const totalRate = baseRateMap[state.drivingProfile] + (state.drivingProfile === 'custom' ? state.packetRate : 0);
  const intensity = totalRate / 200 + 0.15;

  let mitigation = 0;
  if (state.securityLevel === 'secoc') mitigation = 1.0;
  else if (state.securityLevel === 'ids') mitigation = 0.85;
  else if (state.securityLevel === 'basic') mitigation = 0.3;

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    // If packet is moving along charging path and hits the secure gateway firewall
    if (p.pathEl.id === 'flow-port-pdu' && p.isMalicious && !p.hasBeenFiltered) {
      if (p.progress >= 0.74) {
        p.hasBeenFiltered = true;
        if (Math.random() < mitigation) {
          // Packet blocked by firewall!
          p.element.remove();
          particles.splice(i, 1);
          continue;
        }
      }
    }
    // Swap dynamic class mid-flight on BMS -> Motors traction lines if flagged for corruption
    if (p.willBeCorrupted && !p.isMalicious && p.progress >= 0.4) {
      p.isMalicious = true;
      p.speed = 0.018; // Speed up to match the malicious injection rate!
      p.element.setAttribute('class', `flow-particle ${p.type} malicious`);
    }

    let isReverse = (p.pathEl.id === 'flow-pdu-battery' && !p.isMalicious);
    if (isReverse) {
      p.progress -= p.speed * intensity;
      if (p.progress <= 0) {
        p.element.remove();
        particles.splice(i, 1);
        continue;
      }
    } else {
      p.progress += p.speed * intensity;
      if (p.progress >= 1) {
        p.element.remove();
        particles.splice(i, 1);
        continue;
      }
    }

    try {
      const totalLength = p.pathEl.getTotalLength();
      const distance = p.progress * totalLength;
      const pt = p.pathEl.getPointAtLength(distance);
      p.element.setAttribute('cx', pt.x);
      p.element.setAttribute('cy', pt.y);
    } catch (e) {
      // ignore
    }
  }
}

function clearParticles() {
  particles.forEach(p => p.element.remove());
  particles = [];
}

// Core Math Drivetrain Dynamics Simulator
function updatePhysics(dt) {
  // 1. Drivetrain baseline constants depending on driving profile
  let baseSpeed = 55; // km/h
  let baseTorque = 15; // Nm (low torque required for constant speed cruise)
  if (state.drivingProfile === 'eco') {
    baseSpeed = 40;
    baseTorque = 10;
  } else if (state.drivingProfile === 'sport') {
    baseSpeed = 80;
    baseTorque = 25;
  } else if (state.drivingProfile === 'custom') {
    baseSpeed = 60;
    baseTorque = 18;
  }
  let baseAuxLoad = 1.4; // kW
  
  // Calculate mitigation factor
  let mitigation = 0;
  if (state.securityLevel === 'secoc') {
    mitigation = 1.0;
  } else if (state.securityLevel === 'ids') {
    mitigation = 0.85;
  } else if (state.securityLevel === 'basic') {
    mitigation = 0.3;
  }

  const effectiveIntensity = state.attackIntensity * (1 - mitigation);

  // 2. Apply Attack Effects on Drivetrain Physics
  let speed = baseSpeed;
  let frontTorque = Math.round(baseTorque * 0.45);
  let rearTorque = Math.round(baseTorque * 0.55);
  let auxLoad = baseAuxLoad;

  if (effectiveIntensity > 0) {
    // Replay attack injects full throttle torque frames, causing uncontrolled acceleration
    const targetSpeed = 140; // max speed
    if (dt > 0) {
      const accelRate = (effectiveIntensity / 100) * 20; // km/h per sec
      state.vehicleSpeed += accelRate * dt;
      if (state.vehicleSpeed > targetSpeed) state.vehicleSpeed = targetSpeed;
    }
    speed = state.vehicleSpeed;
    
    const maxTorque = 300; // max motor torque under full acceleration
    frontTorque = Math.round((maxTorque * 0.45) * (effectiveIntensity / 100));
    rearTorque = Math.round((maxTorque * 0.55) * (effectiveIntensity / 100));

    // MitM manipulates OBC/PDU aux commands to overload auxiliary heater
    auxLoad = baseAuxLoad + (effectiveIntensity / 100) * 23.6; // max out aux load up to 25 kW
  } else {
    // Return to baseline cruise speed
    if (dt > 0) {
      if (state.vehicleSpeed > baseSpeed) {
        state.vehicleSpeed -= 15 * dt;
        if (state.vehicleSpeed < baseSpeed) state.vehicleSpeed = baseSpeed;
      } else if (state.vehicleSpeed < baseSpeed) {
        state.vehicleSpeed += 10 * dt;
        if (state.vehicleSpeed > baseSpeed) state.vehicleSpeed = baseSpeed;
      }
    }
    speed = state.vehicleSpeed;
  }

  state.pduAuxLoad = auxLoad;

  // Motor RPM mapping
  const rpmRatio = 75;
  state.frontMotorSpeed = Math.round(speed * rpmRatio);
  state.rearMotorSpeed = Math.round(speed * rpmRatio);
  state.frontMotorTorque = frontTorque;
  state.rearMotorTorque = rearTorque;

  // Power Calculations
  const pFrontMech = (state.frontMotorTorque * state.frontMotorSpeed) / 9549;
  const pRearMech = (state.rearMotorTorque * state.rearMotorSpeed) / 9549;
  const totalMechPower = pFrontMech + pRearMech;
  const efficiency = 0.94;

  state.netPower = (totalMechPower / efficiency) + state.pduAuxLoad;

  // Battery Pack Updates
  const nominalVoltage = 375;
  const voltageDropFactor = 0.025;
  const estCurrent = (state.netPower * 1000) / nominalVoltage;
  state.batteryVoltage = Math.round(nominalVoltage - estCurrent * voltageDropFactor);
  state.currentFlow = parseFloat(((state.netPower * 1000) / state.batteryVoltage).toFixed(1));

  // Battery SOC Depletion & Thermal updates only during active simulation ticks (dt > 0)
  if (dt > 0) {
    const timeMultiplier = 20;
    const socChangeRate = (state.currentFlow / 360000) * 100;
    state.batterySOC -= socChangeRate * dt * timeMultiplier;
    state.batterySOC = Math.max(0, Math.min(100, state.batterySOC));

    // Thermal Simulation
    const coolRate = 0.6 * dt;
    const frontHeat = Math.abs(state.frontMotorTorque) * 0.028 * dt;
    state.frontMotorTemp += frontHeat - coolRate;
    state.frontMotorTemp = Math.max(25, Math.min(95, state.frontMotorTemp));

    const rearHeat = Math.abs(state.rearMotorTorque) * 0.028 * dt;
    state.rearMotorTemp += rearHeat - coolRate;
    state.rearMotorTemp = Math.max(25, Math.min(95, state.rearMotorTemp));

    const battHeat = Math.abs(state.currentFlow) * 0.015 * dt;
    state.batteryTemp += battHeat - (0.08 * dt);
    state.batteryTemp = Math.max(28, Math.min(65, state.batteryTemp));
  }
}

// Render dynamic physics variables onto DOM layout
function updateUI() {
  // Calculate defense mitigation
  let mitigation = 0;
  if (state.securityLevel === 'secoc') mitigation = 1.0;
  else if (state.securityLevel === 'ids') mitigation = 0.85;
  else if (state.securityLevel === 'basic') mitigation = 0.3;
  const effectiveIntensity = state.attackIntensity * (1 - mitigation);

  const baseRateMap = { eco: 10, normal: 30, sport: 80, custom: 0 };
  const totalRate = baseRateMap[state.drivingProfile] + (state.drivingProfile === 'custom' ? state.packetRate : 0);

  // 1. Apply display corruptions based on active attacks
  let displaySpeed = state.vehicleSpeed;
  let displayTorque = state.frontMotorTorque + state.rearMotorTorque;
  let displaySoC = state.batterySOC;
  let displayPower = state.netPower;
  let displayCurrent = state.currentFlow;
  let displayEfficiency = 94.5;

  if (effectiveIntensity > 0) {
    // Attackers spoof Speed to extreme readings and fake a low battery SOC
    displaySpeed = state.vehicleSpeed + (145 - state.vehicleSpeed) * (effectiveIntensity / 100);
    // Add tiny, realistic sensor noise (+/- 0.4 km/h) for authentic telemetry feel
    displaySpeed += (Math.random() - 0.5) * 0.8;
    displaySpeed = Math.max(0, displaySpeed);

    displaySoC = Math.max(0, state.batterySOC * (1 - (effectiveIntensity / 100) * 0.7));

    // Power draw matches physical consumption + minor high-frequency bus noise
    displayPower = state.netPower + (Math.random() - 0.5) * 0.6;
    displayPower = Math.max(0, displayPower);

    displayCurrent = parseFloat(((displayPower * 1000) / state.batteryVoltage).toFixed(1));
  } else {
    // Under normal cruise, add very tiny realistic telemetry jitter to speed (+/- 0.1 km/h) and power (+/- 0.05 kW)
    displaySpeed = state.vehicleSpeed + (Math.random() - 0.5) * 0.2;
    displaySpeed = Math.max(0, displaySpeed);
    
    displayPower = state.netPower + (Math.random() - 0.5) * 0.1;
    displayPower = Math.max(0, displayPower);
    
    displayCurrent = parseFloat(((displayPower * 1000) / state.batteryVoltage).toFixed(1));
  }

  // 2. Container Classes
  const visualizerPane = document.getElementById('visualizer-pane');
  if (effectiveIntensity === 0) {
    visualizerPane.className = `visualizer-container state-none`;
  } else if (effectiveIntensity <= 20) {
    visualizerPane.className = `visualizer-container state-mitigated`;
  } else {
    visualizerPane.className = `visualizer-container state-dos state-spoof state-replay state-mitm attack-active`;
  }
  visualizerPane.classList.add('awd'); // dual motor layout always active

  // Toggle attack-in-progress class for top floating banner
  if (state.attackIntensity > 0) {
    visualizerPane.classList.add('attack-in-progress');
  } else {
    visualizerPane.classList.remove('attack-in-progress');
  }


  // Manage Secure Gateway Visibility & Details
  const gateway = document.getElementById('security-gateway');
  const gatewaySymbol = document.getElementById('gateway-symbol');
  const gatewayTooltip = document.getElementById('gateway-tooltip');

  if (gateway && gatewaySymbol && gatewayTooltip) {
    if (state.securityLevel === 'none') {
      visualizerPane.classList.remove('defense-active');
    } else {
      visualizerPane.classList.add('defense-active');
      
      let symbol = 'FW';
      let tooltipText = 'CAN Firewall Filtering';
      if (state.securityLevel === 'secoc') {
        symbol = 'MAC';
        tooltipText = 'SecOC Frame Authenticator (MAC Validation)';
      } else if (state.securityLevel === 'ids') {
        symbol = 'IDS';
        tooltipText = 'IDS Traffic Anomaly Filter';
      } else if (state.securityLevel === 'basic') {
        symbol = 'ENC';
        tooltipText = 'Basic Payload Decryption Gate';
      }

      gatewaySymbol.innerText = symbol;
      gatewayTooltip.innerText = tooltipText;
    }
  }

  // Speed up/down flow animation dash lines
  const flowVal = totalRate / 5;
  const duration = flowVal > 0 ? (2.8 - (flowVal / 100) * 2.5).toFixed(2) + 's' : '9999s';
  visualizerPane.style.setProperty('--flow-dur', duration);

  // Rotate wheels
  if (state.vehicleSpeed > 0 && !(effectiveIntensity > 50 && Math.random() > 0.5)) {
    visualizerPane.classList.add('moving');
    const wheelDur = (2.0 - (state.vehicleSpeed / 140) * 1.85).toFixed(2) + 's';
    visualizerPane.style.setProperty('--wheel-dur', wheelDur);
  } else {
    visualizerPane.classList.remove('moving');
  }

  // 3. Telemetry Cards (Right Panel)
  document.getElementById('inst-speed').innerText = Math.round(displaySpeed);
  document.getElementById('inst-speed-bar').style.width = `${Math.min(100, (displaySpeed / 140) * 100)}%`;

  document.getElementById('telemetry-power').innerText = displayPower.toFixed(1);
  const maxPowerEst = 100;
  document.getElementById('inst-power-bar').style.width = `${Math.min(100, (Math.abs(displayPower) / maxPowerEst) * 100)}%`;

  document.getElementById('inst-soc').innerText = `${displaySoC.toFixed(1)}%`;
  document.getElementById('inst-soc-bar').style.width = `${displaySoC}%`;

  // CAN Bus Security Integrity Toggles
  const statusTextEl = document.getElementById('inst-network-status');
  const statusBarEl = document.getElementById('inst-status-bar');
  if (statusTextEl && statusBarEl) {
    statusTextEl.className = 'telemetry-value'; // reset classes
    if (effectiveIntensity === 0) {
      statusTextEl.innerText = 'SECURE';
      statusTextEl.classList.add('status-secure');
      statusBarEl.style.width = '100%';
      statusBarEl.className = 'gauge-bar-fill secure-fill';
    } else if (effectiveIntensity <= 20) {
      statusTextEl.innerText = 'MITIGATED';
      statusTextEl.classList.add('status-mitigated');
      statusBarEl.style.width = '85%';
      statusBarEl.className = 'gauge-bar-fill mitigated-fill';
    } else {
      statusTextEl.innerText = 'ATTACK ACTIVE';
      statusTextEl.classList.add('status-compromised');
      const integrity = Math.max(0, 100 - effectiveIntensity);
      statusBarEl.style.width = `${integrity}%`;
      statusBarEl.className = 'gauge-bar-fill compromised-fill';
    }
  }

  // 5. Update Dynamic Math Formulas (Calculations Tab)
  const pFrontMech = (state.frontMotorTorque * state.frontMotorSpeed) / 9549;
  const pRearMech = (state.rearMotorTorque * state.rearMotorSpeed) / 9549;
  const totalMechPower = pFrontMech + pRearMech;
  updateMathTab(pFrontMech, pRearMech, totalMechPower, displayEfficiency);

  // 6. Update Security & Health Conclusion Panel
  const conclusionPanel = document.getElementById('security-conclusion-panel');
  const threatBadge = document.getElementById('conclusion-threat-badge');
  const integrityVal = document.getElementById('conclusion-integrity-val');
  const healthVal = document.getElementById('conclusion-health-val');
  const advisoryText = document.getElementById('conclusion-advisory-text');

  if (conclusionPanel && threatBadge && integrityVal && healthVal && advisoryText) {
    let threatLevelClass = 'level-secure';
    let threatText = 'SECURE';
    let integrityPercent = 100;
    let healthText = 'NOMINAL';
    let advisory = 'Drivetrain is fully protected. Authentication checks are active.';

    if (effectiveIntensity === 0) {
      if (state.attackIntensity > 0) {
        threatLevelClass = 'level-secure';
        threatText = 'SECURE (SecOC)';
        integrityPercent = 100;
        healthText = 'NOMINAL';
        advisory = 'Attack detected but blocked by SecOC. Dynamic frame signatures verified.';
      } else {
        threatLevelClass = 'level-secure';
        threatText = 'SECURE';
        integrityPercent = 100;
        healthText = 'NOMINAL';
        advisory = 'Drivetrain is running normally. No packet anomalies detected.';
      }
    } else if (effectiveIntensity <= 20) {
      threatLevelClass = 'level-mitigated';
      threatText = 'MITIGATED';
      integrityPercent = Math.round(100 - effectiveIntensity);
      healthText = 'STABILIZED';
      advisory = `Firewall active. Blocked ${Math.round(mitigation * 100)}% of attack frames. Drivetrain is functional.`;
    } else if (effectiveIntensity <= 50) {
      threatLevelClass = 'level-warning';
      threatText = 'HIGH RISK';
      integrityPercent = Math.round(100 - effectiveIntensity);
      healthText = 'DEGRADED';
      advisory = 'Unmitigated packet injection detected. Telemetry jitter and auxiliary load increases observed.';
    } else {
      threatLevelClass = 'level-critical';
      threatText = 'COMPROMISED';
      integrityPercent = Math.max(10, Math.round(100 - effectiveIntensity));
      
      if (state.vehicleSpeed > 100) {
        healthText = 'UNCONTROLLED ACCEL';
        advisory = 'CRITICAL: Replay injection causing runaway motor acceleration! Enable SecOC immediately.';
      } else if (state.pduAuxLoad > 10) {
        healthText = 'AUX OVERLOAD';
        advisory = 'CRITICAL: Man-in-the-Middle overloading battery circuits! Activate firewall filtering.';
      } else {
        healthText = 'BUS JAMMED / OFFLINE';
        advisory = 'CRITICAL: DoS flooding causing network dropouts. Enable Intrusion Detection filtering.';
      }
    }

    conclusionPanel.className = `conclusion-panel ${threatLevelClass}`;
    threatBadge.innerText = threatText;
    integrityVal.innerText = `${integrityPercent}%`;
    healthVal.innerText = healthText;
    advisoryText.innerText = advisory;
  }
}

// Evaluates the formulas step-by-step with real-time values
function updateMathTab(pFrontMech, pRearMech, totalMechPower, displayEfficiency) {
  if (!document.getElementById('calculations-tab').classList.contains('active')) return;

  // Equation 1
  document.getElementById('math-vbat').innerText = `${state.batteryVoltage} V`;
  document.getElementById('math-ibat').innerText = `${state.currentFlow} A`;
  document.getElementById('math-pelec-formula').innerText = `(${state.batteryVoltage} × ${state.currentFlow}) / 1000`;
  document.getElementById('math-pelec').innerText = `${state.netPower.toFixed(2)} kW`;

  // Equation 2
  document.getElementById('math-config').innerText = "Dual Motor (AWD)";
  document.getElementById('math-tf-val').innerText = `${state.frontMotorTorque} Nm`;
  document.getElementById('math-nf-val').innerText = `${state.frontMotorSpeed} RPM`;
  document.getElementById('math-tr-val').innerText = `${state.rearMotorTorque} Nm`;
  document.getElementById('math-nr-val').innerText = `${state.rearMotorSpeed} RPM`;
  document.getElementById('math-pmech-formula').innerText = `${pFrontMech.toFixed(2)} + ${pRearMech.toFixed(2)}`;
  document.getElementById('math-pmech').innerText = `${totalMechPower.toFixed(2)} kW`;

  // Equation 3
  const powerDiff = Math.abs(state.netPower - totalMechPower);
  
  let mitigation = 0;
  if (state.securityLevel === 'secoc') mitigation = 1.0;
  else if (state.securityLevel === 'ids') mitigation = 0.85;
  else if (state.securityLevel === 'basic') mitigation = 0.3;
  const effectiveIntensity = state.attackIntensity * (1 - mitigation);

  document.getElementById('math-flow-dir').innerText = effectiveIntensity > 0 ? 'Attacked state' : 'Normal Cruise';
  document.getElementById('math-losses').innerText = `${powerDiff.toFixed(2)} kW`;
  
  document.getElementById('math-eff-formula').innerText = `(${totalMechPower.toFixed(2)} / ${state.netPower.toFixed(2)}) × 100`;
  document.getElementById('math-eff-val').innerText = `${displayEfficiency.toFixed(1)}%`;

  // Equation 4
  const socChangeRate = (state.currentFlow / 360000) * 100;
  const timeMultiplier = 20;
  const scaledRate = socChangeRate * timeMultiplier;
  
  document.getElementById('math-soc-formula').innerText = `- (${state.currentFlow} / 360000) × 100`;
  document.getElementById('math-soc-rate').innerText = `${scaledRate >= 0 ? '+' : ''}${(-scaledRate).toFixed(4)}% / sec`;
}

// Animation tick loop
function animationLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  // Run dynamic physics updates
  updatePhysics(dt);
  updateUI();

  // Spawning particles
  particleSpawnTimer += dt;
  
  // Particle spawning frequency matches baseline + injection rate pps
  const baseRateMap = { eco: 10, normal: 30, sport: 80, custom: 0 };
  const totalRate = baseRateMap[state.drivingProfile] + (state.drivingProfile === 'custom' ? state.packetRate : 0);
  const spawnRate = 1 / (totalRate / 15); // scaled rate

  if (particleSpawnTimer >= spawnRate) {
    particleSpawnTimer = 0;
    
    // Spawn baseline telemetry packets (Battery to Motors)
    spawnParticle('flow-battery-front', 'traction');
    spawnParticle('flow-battery-rear', 'traction');
    
    let mitigation = 0;
    if (state.securityLevel === 'secoc') mitigation = 1.0;
    else if (state.securityLevel === 'ids') mitigation = 0.85;
    else if (state.securityLevel === 'basic') mitigation = 0.3;
    const effectiveIntensity = state.attackIntensity * (1 - mitigation);

    // If active cyber attack, spawn malicious charge port flow
    if (effectiveIntensity > 0) {
      spawnParticle('flow-port-pdu', 'aux');
      spawnParticle('flow-pdu-battery', 'aux');
    } else {
      spawnParticle('flow-pdu-battery', 'aux');
    }
  }

  // Update particle positions along paths
  updateParticles();

  requestAnimationFrame(animationLoop);
}
