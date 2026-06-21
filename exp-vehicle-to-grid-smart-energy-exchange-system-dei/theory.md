## 1. Objective
The primary objective of this laboratory experiment is to study bidirectional Vehicle-to-Grid (V2G) and Grid-to-Vehicle (G2V) energy exchange under automated state machine transitions. 

In a modern smart grid, Electric Vehicles (EVs) are not merely passive loads; they function as distributed energy storage systems (DESS). This simulation models the interaction between an EV battery pack, a bidirectional power inverter, and the utility grid infrastructure. Students will observe how local battery states and time-dependent utility demands autonomously dictate power flow directions while maintaining strict thermal and safety thresholds.

---

## 2. Core Theoretical Definitions

* **Vehicle-to-Grid (V2G):** The operational mode where power flows bidirectionally from the Electric Vehicle's onboard battery pack back into the utility grid to support peak demand or provide ancillary grid services.
* **Grid-to-Vehicle (G2V):** The conventional operational mode where the EV acts purely as a consumer load, drawing power from the utility grid to charge its battery pack.
* **State of Charge (SOC):** The relative measure of the energy remaining in a battery pack, expressed as a percentage of its total capacity (20% to 100%).
* **Bidirectional Inverter:** A power electronics subsystem capable of converting Direct Current (DC) from the battery to Alternating Current (AC) for the grid (inversion/V2G), or converting AC from the grid to DC to charge the battery (rectification/G2V).
* **Battery Management System (BMS):** An electronic safety and control system that monitors cell parameters (such as SOC and temperature) and triggers hard overrides to protect the battery from catastrophic failure states like over-discharging.

---

## 3. Mathematical Formulations & Working Logic

The simulation operates based on fundamental electrical engineering equations governed by power conversion efficiencies. 

### Ideal Calculated Power
The theoretical power capacity configured by the user via the control sliders is defined by the basic single-phase power relation represented in the simulation workspace as the Governing Relation:

$$P_{\text{calc}} = V_{\text{AC}} \times I$$

Where:
* **$P_{\text{calc}}$** = Calculated Power (Watts, W), displayed in real-time on the telemetry bar as "Calculated Power".
* **$V_{\text{AC}}$** = Inverter AC Voltage, adjusted via the voltage slider (180 V - 260 V).
* **$I$** = Configured Discharging/Charging Current (5 A - 60 A).

### Net Transferred Power & Efficiency
In a real-world system, power electronics conversion is never perfectly lossless. The Net Transferred Power ($P_{\text{net}}$) accounts for thermal losses across the bidirectional inverter switching elements using the system's tracked Inverter Efficiency ($\eta = 98.2\%$):

* **During Discharging (V2G):** **$P_{\text{net}} = P_{\text{calc}} \times \eta$**
* **During Charging (G2V):** **$P_{\text{net}} = \frac{P_{\text{calc}}}{\eta}$**

Where:
* **$\eta$** = Inverter Efficiency expressed as a decimal (98.2% = 0.982).
* **$P_{\text{net}}$** = Net Transferred Power, displayed on the workbench telemetry bar.

### Inverter Thermal Dissipation
The energy lost during conversion is dissipated as heat, driving up the Inverter Temp ($T_{\text{inv}}$) over time from its baseline ambient value:

**$$T_{\text{inv}} = T_{\text{ambient}} + \Delta T$$**

Where:
* **$\Delta T$** is proportional to: **$P_{\text{calc}} \times (1 - \eta)$**

Higher currents ($I$) or lower operational efficiencies ($\eta$) will result in rapid thermal accumulation, which students must monitor closely via the dedicated telemetry temperature block.

---

## 4. Simulation Logic

The simulation executes using a strict Finite State Machine (FSM) that syncs the physical cable connection with autonomous utility grid commands.
