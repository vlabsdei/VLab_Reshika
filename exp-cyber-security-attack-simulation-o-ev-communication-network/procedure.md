# PROCEDURE
## 1. Interactive Workspace Interrogation (Pre-Simulation)

Before running the active attack sequences, explore the workspace to map the vehicle's structural components and understand its base communication framework:

### Component Nomenclature Inspection
1. **Interactive Hardware Blocks:** Navigate to the DOM-based center schematic visualizer pane. 
2. **Nomenclature Tooltips:** Hover your cursor over any circular node—**FM** (Front Motor), **BMS** (Battery Pack), **PDU** (Power Distribution Unit), **OBC** (On-Board Charger), or **CP** (Charging Port). Note the overlay tooltip that appears confirming the system identity.
3. **Deep Mechanical Description:** Click on any of these hardware nodes. An interactive popup card will trigger, displaying technical blueprint schematics alongside an exhaustive architectural breakdown:
   * Click **FM** to examine the Silicon Carbide (SiC) Inverter Module and rotor shaft layout.
   * Click **BMS** to inspect the Lithium-Ion Cell Grid configuration and high-voltage isolation contactors.
   * Click **CP** to analyze the Control Pilot (CP) and Proximity Pilot (PP) pin interfaces.
4. Close the details panel by clicking the `×` button or clicking the background mask.

### Accessing Protocol Vulnerability Logs
1. Locate the **"i" (Information) trigger button** positioned in the upper right quadrant of the canvas pane.
2. Click the button to launch the **High-Voltage Charging Port Vulnerability Overlay**.
3. Read through the protocol context outlining how modern EVs leverage ISO 15118 / DIN 70121 over Power Line Communication (PLC). Use this explanation to infer how a compromised offboard charging station can bypass physical hardware perimeter loops to inject malicious CAN frames directly into the powertrain bus.
4. Click **"Got It, Let's Start!"** to transition into active simulation mode.

---

## 2. Step-by-Step Simulation Execution

### Part 1: Establishing Baseline Nominal Performance
1. Set the **Security Defence Level** selector to **"No Defense (Vulnerable)"**.
2. Ensure both the **Attack Injection Intensity** and **CAN Packet Injection Rate** sliders are pulled to their absolute minimums (**0%** and **10 pps**).
3. Set the **Baseline Driving Profile** dropdown to **"Normal Mode"**.
4. Observe the clean, uniform **Blue particle flows** propagating down the orthogonal SVG cable traces from the Battery Pack to the Front and Rear Motor nodes.
5. Head to the **Calculations & Formulas** navigation tab. Verify that the Net System Efficiency equation ($\eta$) resolves cleanly to a normal baseline value of approximately **94.5%**.

### Part 2: Injecting Unmitigated Cyber Attacks
1. Toggle back to the **Schematic Workspace**.
2. Slide the **Attack Injection Intensity** up to **75%** and increase the **CAN Packet Injection Rate** to **350 pps**.
3. **Monitor the Floating Attack Vector Banner:** Look at the top center of the canvas layout. A high-visibility warning banner will dynamically slide into view stating: `⚠️ Cyber Attack Vector: Source (CP) ➔ Target (PDU)`.
4. Observe the structural graphic shift: **Red malicious particles** will flood forward from the Charging Port node, bypassing the invisible firewall to compromise the PDU and traction lines.
5. Review the **Telemetry & Diagnostics** sidebar: note the massive speed fluctuations, erratic power draw changes, and sharp drops in real-time integrity telemetry.
6. Check the **System Security Status Panel** beneath the canvas. Verify that the indicator shows a red **"COMPROMISED"** status and the health state reads **"UNCONTROLLED ACCEL"** or **"BUS JAMMED"**.

### Part 3: Evaluating Security Mitigations
1. With the attack sliders remaining at maximum intensity, click **"Basic Encryption"**. Observe the telemetry grid to determine if payload encryption alone stops rate floods.
2. Click **"Intrusion Detection (IDS)"**. Notice that the network firewall node (**🛡️**) becomes visible on the central bus line, filtering out a large percentage of anomalous traffic.
3. Select **"Secure Onboard (SecOC)"**. 
4. Observe the structural normalization: the red particle cascade is entirely contained at the firewall node before reaching internal hardware networks. The motor lines will transition fully back to clean blue traction flows.
5. Verify that the **System Security Status Panel** has updated to **"SECURE (SecOC)"** with a **"NOMINAL"** drivetrain health rating.

---

## 3. Observation and Inference Guidelines

### Where to Look and How to Interpret System Telemetry

| Target Interface Element | UI Event Trigger / Active State | Diagnostic Inference & Analytical Meaning |
| :--- | :--- | :--- |
| **Hardware Block Click Mask** | HUD SVG Blueprint Card Injection | Yields structural engineering details explaining *Why it is there* and *How it works* to establish system constraints. |
| **"i" Canvas Trigger Button** | Blurs canvas; triggers text frame overlay | Explains the underlying high-voltage data protocol rules (ISO 15118) exploited by the attack vector. |
| **Floating Canvas Banner** | Slid down, flashing red warning box | Confirms that an unmitigated or partially mitigated network injection sequence is currently penetrating the bus architecture. |
| **Chassis Particle Colors** | Solid Blue flow streams | Normal operation; energy is moving securely from the battery storage cells to the active motor lines. |
| **Chassis Particle Colors** | High-velocity Red particle paths | Network compromised; malicious CAN messages are overriding traction inverter parameters. |
| **CAN Bus Integrity Gauge** | Dropping down toward 10%–20% | The communication network is saturated with spoofed data frames or experiencing massive message collisions. |
| **Calculations Page: Formula 3** | Jittering efficiency values shifting to 0% | Telemetry dropouts are interrupting standard data parsing loop calculations on the dashboard. |
