## 1. Laboratory Setup & Controls Identification
Before commencing, locate the following UI elements in your lab workspace:
* **Telemetry Top Bar:** Tracks Calculated Power, Grid Target, Inverter Efficiency, Net Transferred Power, and Inverter Temp.
* **Control Panel (Left):** Houses the Sync Status Badge, Simulation State Panel, Autonomous Grid Status Display, and configuration sliders (Voltage, Current, EV SOC).
* **Action Buttons:** "Position Cable to Begin" (Engagement) and "Disengage Grid Tie" (Isolation).
* **Output Panels (Right/Bottom):** 3D Visualizer canvas, Telemetry Chart (Real-time SVG graph), and Test Bench Log Records.

---

## 2. Step-by-Step Simulation Procedure

### Phase I: System Initialization & Synchronization
* Ensure the simulation is in its default state. Verify that the **Sync Status Badge** reads `DISCONNECTED` and the state panel reads `STATE: DISCONNECTED`.
* Review the baseline telemetry parameters. Note that **Inverter Temp** initializes at a nominal ambient baseline of `25.0 °C`.
* Click the primary action button: **Position Cable to Begin**.
* Observe the **Sync Status Badge** change to indicate synchronization, and verify that the **Grid Clock & Status** tracker shifts from `INITIALIZING` to actively displaying utility parameters.

### Phase II: Active Energy Exchange Configuration
* Set the **EV State of Charge (SOC) Slider** to **90%** to ensure ample capacity for discharging.
* Adjust the **Inverter AC Voltage Slider** to your nominal baseline value of **220 V**.
* Adjust the **Discharging Current Slider** to **20 A**.
* Engage the physical grid line connection by tracking the state panel's progression into **ACTIVE EXCHANGE** mode.
* Confirm that data points are plotting on the **Telemetry Chart** and that a new log entry populates in the **Test Bench Log Records**.

### Phase III: Automated BMS Safety Override Testing
* With the system actively operating in a discharging state (V2G), locate the **EV State of Charge (SOC) Slider**.
* Manually drag the SOC slider down toward **51%**.
* Slowly step the slider down to **50%** or lower.
* Observe the immediate automation sequence:
  * The **BMS Safety Override Alert Banner** (`[BMS OVERRIDE ACTIVE]`) must instantly appear at the top of the interface.
  * The system status must autonomously flip the substation demand from discharging into charging (**G2V**) mode.
* Attempt to modify the current slider and verify if discharging capabilities remain locked down by the protection loop.

### Phase IV: System Isolation & Reset
* Click the **Disengage Grid Tie** button to safely isolate the EV vehicle circuit from the utility station network.
* Click **Clear Records** to flush the temporary session telemetry from the table view if necessary.
* Click **Reset Bench** to restore all voltage, current, and state variables back to their factory startup constraints.

---

## 3. Controlled Observations & Field Testing

Students must systematically adjust parameters to complete the following analytical tasks. Record all outputs inside your report documentation.

### Task 1: Parametric Power Scaling (Varying Voltage)
* **Action:** Keep Current ($I$) static at **20 A** and SOC at **90%**. Set Voltage ($V_{\text{AC}}$) to **180 V**, then **220 V**, and finally **260 V**.
* **Steps to Execute:** * Move the Voltage slider to $180\text{ V}$, wait for the chart line to stabilize, and read the values.
  * Increase the Voltage slider to $220\text{ V}$, then to $260\text{ V}$, capturing metrics at each stop.
* **What to Observe:** Track how **Calculated Power** changes strictly linearly according to $P_{\text{calc}} = V_{\text{AC}} \times I$. Note the discrepancy between the theoretical Calculated Power and the real-world **Net Transferred Power** caused by the $98.2\%$ inverter efficiency threshold.

### Task 2: Thermal Dissipation & High Load Testing
* **Action:** Keep Voltage static at **220 V**. Step Current up from **5 A** to the absolute maximum limit of **60 A**.
* **Steps to Execute:**
  * Set current to $5\text{ A}$ and log the temperature.
  * Scale the slider up in increments of $15\text{ A}$ up to $60\text{ A}$.
  * Maintain the system at $60\text{ A}$ load for 15 operational grid clock cycles.
* **What to Observe:** Monitor the **Inverter Temp** block. Observe the accelerated rate of temperature increase ($\Delta T$) when running peak current loads ($60\text{ A}$), proving that thermal power loss dissipation is directly proportional to current-heavy throughput adjustments.

### Task 3: Boundary Tracking & Log Analysis
* **Action:** Analyze the generated historical rows inside the **Test Bench Log Records**.
* **Steps to Execute:**
  * Trigger an active exchange session with variable settings.
  * Scroll down to the bottom table structure and isolate rows marked as discharging mode against those marked as override charging mode.
* **What to Observe:** Compare the columns for **Set V**, **Set I**, and **Net Power**. Mathematically verify that when the system transitions from V2G to G2V, the Net Power calculation switches its formula structure relative to efficiency ($\eta$) from multiplication to division ($P_{\text{net}} = \frac{P_{\text{calc}}}{\eta}$) to account for utility line consumption penalties.
