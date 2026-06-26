# Theory
## 1. Introduction and Experiment Overview
This experiment simulates an intelligent monitoring and diagnostic framework designed to identify operational anomalies within an electric vehicle's powertrain before catastrophic mechanical or electrical failure occurs. By tracking high-frequency sensor streams like real-time rotational speed, core temperature, and mechanical load variations, the system models continuous energy degradation path dynamics. Students manually inject severe signal noise and extreme torque constraints to observe how internal heat spikes collapse system health, ultimately triggering an automated 3.0-second safety isolation countdown mechanism.

---

## 2. Basic Terminologies

* **Motor Speed ($N$):** The rotational velocity of the magnetic flux rotor shaft, measured in Revolutions Per Minute (RPM) with a safe operational span from 500 to 6000 RPM.
* **Inverter Temperature / Core Temp ($T$):** The thermal state of the primary powertrain electronics and stator windings, operating inside an allowable window of $30^\circ\text{C}$ to $120^\circ\text{C}$.
* **Motor Load:** The external mechanical demand or resistance torque applied to the drivetrain matrix, ranging from a $10\%$ baseline up to a $100\%$ full-capacity stress limit.
* **Sensor Noise / Abnormalities:** Stochastic distortion and electromagnetic interference injected into the signal tracking paths, used to evaluate diagnostic fault tolerances.
* **Core Efficiency ($\eta$):** The percentage ratio metric quantifying how effectively the powertrain converts input electrical battery power into true forward driving work.
* **Predictive Fault Status:** A live automated diagnostic safety state that switches from "Normal" to "Fault" when efficiency curves drop or temperature thresholds fracture boundaries.

---

## 3. Mathematical Formula Blueprint

### 3.1 Core System Efficiency
System core performance is evaluated continuously via the balance between usable output work and total required electrical power input:

$$\eta = \left( \frac{P_{\text{out}}}{P_{\text{in}}} \right) \times 100$$

Where:
* $\eta$ = Powertrain Core Efficiency percentage.
* $P_{\text{out}}$ = Useful Mechanical Output Power (kW).
* $P_{\text{in}}$ = Total Electrical Input Power (kW), representing the sum of useful work and wasted system overhead ($P_{\text{in}} = P_{\text{out}} + P_{\text{losses}}$).

### 3.2 Mechanical Output Power Extraction
Useful translational power generated at the wheel hub relies directly on current shaft torque ($\tau$) and angular velocity speed vector elements ($N$):

$$P_{\text{out}} = \frac{\tau \times N \times 2\pi}{60000}$$

### 3.3 Internal Energy Losses Breakdown Matrix
Total system energy losses ($P_{\text{losses}}$) are aggregated across four distinct real-time physical degradation streams to isolate specific subsystem hardware stress:

$$P_{\text{losses}} = P_{\text{baseline}} + P_{\text{therm}} + P_{\text{drag}} + P_{\text{emi}}$$

* **Baseline Core Hysteresis Loss ($P_{\text{baseline}}$):** Simulates magnetic alternating domain resistance friction inside structural iron laminations, scaling with velocity: 
  $$P_{\text{baseline}} = 0.15 \times \left( \frac{N}{1000} \right)$$
* **Resistive Thermal Loss ($P_{\text{therm}}$):** Evaluates copper winding resistance creep as temperature climbs past ambient boundaries ($30^\circ\text{C}$). If core temp scales past a severe safety threshold of **$95^\circ\text{C}$**, a steep runaway safety penalty ($+0.4\text{ kW}/^\circ\text{C}$) triggers automatically:
  $$P_{\text{therm}} = ((\text{Temp} - 30) \times 0.005) + \text{Penalty}_{\text{overheat}}$$
* **Mechanical and Fluid Drag Loss ($P_{\text{drag}}$):** Computes internal kinetic friction from pumping fluid cooling systems along with axle shear loads scaled by gross passenger fader mass parameters:
  $$P_{\text{drag}} = (\text{Coolant Flow} \times 0.008) + \left( \frac{N}{1000} \times 0.05 \times \frac{\text{Mass}}{75} \right)$$
* **Electromagnetic Noise Distortion Loss ($P_{\text{emi}}$):** Accounts for continuous energy leakage due to high-frequency inverter switching field deformations under high unshielded noise profiles:
  $$P_{\text{emi}} = \text{Noise} \times 0.6$$

---
