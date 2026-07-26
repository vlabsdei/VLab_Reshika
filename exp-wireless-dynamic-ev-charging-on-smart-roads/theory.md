# Experiment 6: Wireless Dynamic EV Charging on Smart Roads

## 1. Purpose of the Experiment
The purpose of this simulation-based experiment is to analyze the electromagnetic coupling efficiency and active power transfer dynamics of Wireless Power Transfer (WPT) systems embedded beneath smart roadways. Students will investigate how real-time mechanical alignment displacements (horizontal offset) and varying vehicle chassis structures (air-gap clearances) alter energy integration rates into an electric vehicle's battery during continuous transit.

---

## 2. Basic Terminologies

* **Wireless Power Transfer (WPT):** The transmission of electrical energy from a power source to an electrical load without the use of physical interconnecting wires, utilizing electromagnetic fields.
* **Dynamic Charging:** Alternately referred to as "in-motion charging," this method powers and charges an electric vehicle while it travels along segmented, energized roadways, removing the need for stationary plug-in sessions.
* **Asphalt Electromagnetic Transparency:** The physical property of conventional road materials (like asphalt concrete) to permit high-frequency alternating magnetic fields to pass straight through without inducing eddy-current attenuation or causing thermal energy traps.
* **Segmented Active Coils:** A localized grid system where ground-based transmitter coils are excited sequentially **only** when an onboard inductive sensor detects a receiver pad passing directly above, minimizing system distribution losses.
* **Alignment Offset ($x$):** The horizontal lateral displacement error (measured in centimeters) between the true center of the underground primary road coil track and the centerline of the vehicle’s secondary receiver plate.
* **Air-Gap Distance ($z$):** The strict vertical clearance height (measured in centimeters) spanning from the surface plane of the road asphalt down to the exposed surface of the vehicle's flush-mounted underbody pickup plate.
* **State of Charge (SoC):** The relative measure of the remaining electrical capacity stored within an electrochemical battery pack, represented explicitly as a percentage value ($0\%$ to $100\%$) of its total nominal capacity.

---

## 3. Prerequisite Technical Topics & Subtopics

### 3.1 Electromagnetic Induction & Mutual Inductance
At the core of dynamic track charging is Faraday’s Law of Induction joined with Ampere's Law. An alternating current running through the subsurface transmitter coil creates a time-varying magnetic flux field. When this flux cuts across the secondary copper windings inside the vehicle's receiver plate, an electromotive force (EMF) is instantly induced. The scale of this cross-coupling depends on the mutual inductance between the two structural elements.



### 3.2 Resonant Inductive Coupling
Standard inductive coupling drops off heavily over space. To bridge multi-centimeter air gaps safely without catastrophic losses, both the transmitter and receiver circuits run tuned compensation networks (typically capacitor configurations). Matching the operating frequency to the natural resonant frequency of the system allows high power to transfer with minimized reactive losses, establishing an optimized peak baseline efficiency.

### 3.3 Air-Gap and Displacement Loss Inferences
The magnetic flux density distribution of a planar coil decays exponentially as space opens up around it. 
* **Vertical Air Gaps ($z$):** Elevating the vehicle profile increases flux leakage, meaning fewer magnetic field lines intercept the secondary loop.
* **Horizontal Offsets ($x$):** Straying out of the lane crosshair skews the geometric symmetry between the overlapping fields, causing a steep drop-off in efficiency.

---

## 4. Mathematical Formulations and Governing Models

The internal physics solver in the simulation calculates power delivery and battery tracking using three fundamental equations:

### 4.1 Coupling Efficiency Calculation ($\eta$)
Models the exponential decay of physical energy transmission efficiency caused by lateral driving drift and changing chassis elevations.

$$\eta = \eta_{\text{max}} \cdot e^{-0.002 \cdot x^2} \cdot e^{-0.03 \cdot z}$$

* **Definition:** Calculates the real-time maximum structural efficiency percentage under given positioning variables, where $\eta_{\text{max}} = 90.0\%$.
* **Purpose:** To mathematically track how misalignments ($x$) and air gaps ($z$) structurally degrade magnetic link performance.

### 4.2 Peak Power Transfer Calculation ($P_{\text{received}}$)
Calculates the absolute active power delivered out of the receiver pad into the vehicle's onboard power management electronics.

$$P_{\text{received}} = P_{\text{transmitted}} \cdot \left(\frac{\eta}{100}\right)$$

* **Definition:** Relates the source track output power to the captured load power, where $P_{\text{transmitted}} = 120.0\text{ kW}$.
* **Purpose:** Establishes the real-time rate of active work available to fuel the battery circuit.

### 4.3 Continuous Battery Energy Integration ($\Delta E$)
Accumulates the energy captured sequentially over energized track segments based on the car's driving velocity.

$$\Delta E = \int P_{\mathrm{received_inst}} \cdot dt$$

* **Definition:** The time-integral of the varying instantaneous power levels $P_{\mathrm{received_inst}}$ captured as the vehicle passes through the pulsing magnetic flux envelopes of individual road coils.
* **Purpose:** Translates power transfer into stored capacity ($\text{kJ}$), determining the final battery State of Charge ($\text{SoC}$).

---

## 5. Laboratory Analysis Framework

When conducting this virtual simulation, the environment categorizes vehicles into distinct mathematical profiles according to their air gaps:
1. **Sedan Silhouette:** Low Clearance ($5\text{ cm} \le z < 13\text{ cm}$) $\rightarrow$ Optimized for higher peak coupling efficiencies.
2. **Crossover SUV Silhouette:** Mid Clearance ($13\text{ cm} \le z \le 20\text{ cm}$) $\rightarrow$ Standard consumer baseline profile.
3. **Delivery Van Silhouette:** High Clearance ($20\text{ cm} < z \le 30\text{ cm}$) $\rightarrow$ High clearance requirement, suffering steep flux decay.

Students must gather snapshots across these diverse profiles to calculate parameter sensitivity gradients and determine the optimal calibration profiles for smart roads.
