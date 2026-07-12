## Theory

### 1. Objective
The goal of this experiment is to test how an electric vehicle's high-voltage lithium-ion battery pack degrades over time under different driving and environmental conditions. We will simulate how factors like high ambient temperatures, aggressive driving profiles, and fast charging speeds speed up capacity loss and internal resistance growth. Ultimately, this data will help us calculate the battery's remaining operational lifetime and set standard baseline rules for tracking health in real-world EV fleets.

---

### 2. Basic Terminologies

*   **State of Health (SoH):** This is a percentage score that shows how much performance the battery has left compared to when it was brand new.
*   **Capacity Fade:** The gradual drop in the maximum amount of energy the battery can store, which we measure in Ampere-hours (Ah) as it gets used over multiple cycles.
*   **C-Rate:** A standard unit that measures how fast a battery charges or discharges relative to its full capacity. For example, a 1C rate takes 1 hour to charge it fully, while a 3C fast charge speeds that up to just 20 minutes.
*   **Joule Heating (Thermal Flux):** The heat power generated ($W/m^2$) inside the cell matrices because of electric current trying to push through the battery's internal electrical resistance.
*   **Solid Electrolyte Interphase (SEI) Layer:** A chemical film that builds up on the battery's anode during charging. While it helps stabilize the cell, its continuous growth ends up trapping active lithium ions, which permanently reduces battery capacity.
*   **End-of-Life (EOL):** The point where an EV battery drops to $70\%$ of its original capacity. At this stage, it can no longer provide an acceptable driving range and needs to be replaced.

---

### 3. Pre-Requisite Concepts

#### A. Temperature-Driven Kinetics (Arrhenius Degradation)
Lithium-ion batteries do not do well in high heat. As operating temperatures climb, the chemical activity inside accelerates non-linearly. This added thermal energy breaks down the liquid organic electrolytes and speeds up the growth of the SEI layer. In our simulator, we model this thermal degradation using an exponential multiplier to reflect true electrochemical stress behavior.

#### B. C-Rate and Micro-Cracking Mechanics
When we hook a battery up to a high-current fast charger (like a 3C-rate), lithium ions are forced to rush into the electrode structures at extreme speeds. This aggressive charging expands and strains the active particles, leading to micro-cracking and lithium plating. Over time, parts of the cell become completely isolated, accelerating capacity drop.

#### C. Internal Resistance Escalation and Dynamic Overpotentials
As cyclable lithium ions get permanently trapped inside the thickening SEI layer, the cell experiences a massive spike in internal resistance. This sets off a dangerous loop: the higher resistance forces the battery to work harder, causing dynamic overpotentials that dump massive amounts of heat into the pack via Joule heating.

---

### 4. Mathematical Modeling and Governing Formulas

The simulator handles the underlying physics and computes aging tracking indicators using these specific equations:

#### 1. Accelerated Degradation Wear Factor ($d_{\text{rate}}$)
$$\psi = m_T \times m_C \times m_L$$
$$d_{\text{rate}} = D_{\text{base}} \times e^{0.06 \times (T_{\text{ambient}} - 25)} \times m_C \times \frac{L}{50}$$

*   **Definition:** The exact percentage of total capacity that the battery pack loses during each complete charge and discharge run.
*   **What the variables mean:**
    *   $D_{\text{base}} = 0.005\%$ (The fixed baseline wear factor per cycle).
    *   $T_{\text{ambient}}$: The outside environmental temperature in $^\circ\text{C}$.
    *   $m_C$: Charging speed modifier ($1.0$ for standard 1C, $2.5$ for heavy 3C fast charging).
    *   $m_L$: Driving load factor scaled from the specific drive configuration load percentage ($L$).
*   **Experiment Context:** We use this to see how hard environmental variables and harsh driving profiles multiply the wear rate on the cell chemistry.

#### 2. Capacity Fade Matrix
$$\text{Capacity Fade (\%)} = \left(\frac{C_{\text{initial}} - C_{\text{current}}}{C_{\text{initial}}}\right) \times 100 = N \times d_{\text{rate}}$$

*   **Definition:** The running total percentage of maximum storage capacity lost after racking up $N$ total cycles.
*   **Experiment Context:** This tells us exactly how much the current usable capacity ($C_{\text{current}}$) has dropped from our fresh $100\text{ Ah}$ starting baseline ($C_{\text{initial}}$).

#### 3. State of Health (SoH Calculation)
$$\text{SoH (\%)} = 100\% - \text{Capacity Fade (\%)} = 100 - (N \times d_{\text{rate}})$$

*   **Definition:** The primary percentage grade showing the current operational life left in the pack.
*   **Experiment Context:** Once this value dips below our critical limit line ($70\%$), the app marks the battery pack as completely spent.

#### 4. Electrochemical Internal Resistance Scaling
$$R_{\text{int}} = R_{\text{baseline}} \times \left(1.0 + 2.0 \times \frac{\text{Capacity Fade (\%)}}{100}\right)$$

*   **Definition:** The real-time internal resistance value of the battery pack, measured in milli-ohms ($\text{m}\Omega$).
*   **What the variables mean:**
    *   $R_{\text{baseline}} = 10.0\text{ m}\Omega$ (The factory resistance rating of a brand new pack).
*   **Experiment Context:** This tracks the progressive degradation of our electrode networks and structural connectivity due to internal wear.

#### 5. Volumetric Heat Flux ($Q_{\text{flux}}$)
$$Q_{\text{flux}} = 0.005 \times L^2 \times \left(\frac{R_{\text{int}}}{R_{\text{baseline}}}\right)$$

*   **Definition:** The heat flux density generated within the stack layout during operation.
*   **Experiment Context:** This lets us model real-time Joule heating conditions when swapping between slow highway cruising and heavy racetrack acceleration.

#### 6. Battery Cell Core Temperature ($T_{\text{core}}$)
$$T_{\text{core}} = T_{\text{ambient}} + 0.15 \times Q_{\text{flux}}$$

*   **Definition:** The absolute internal core temperature calculated inside the cell matrices.
*   **Experiment Context:** We use this to flag safety issues, update our warning dashboards, and calculate the overall **Thermal Runaway Risk Index (\%)**.
