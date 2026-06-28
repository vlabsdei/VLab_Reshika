# Experiment 5: Intelligent Torque Vectoring Proving Ground — Lab Procedure Guide

## 1. Overview of the Proving Ground Interface
Before starting the run, here is how our UI is broken down so we know where to look during our testing:
* **The Canvas:** The center area displays a 3D isometric viewport showing our EV chassis, active force vector arrows on each tire, a green predictive trajectory pathway, and dynamic tire footprints/skidmarks.
* **Top Center Panel:** The *Evaluation Session* timer counts down from 45.00s. Once it hits zero, a formal report modal automatically takes over the screen to evaluate our driving data.
* **Left HUD Column:** Contains our *Engineering Scenarios* control unit and the *Proving Ground Logs* (which house live force balance bar monitors for both rear wheels).
* **Right HUD Column:** Houses our *Gaming Telemetry Hub* (with a Master Switch for the Intelligent Torque Vectoring system, Stability Index percentages, and traction status badges) along with three separate, real-time math calculation panels.
* **Bottom Horizontal Bar:** Controls our primary input actuators—Steering Angle range slider, Base Motor Torque range slider, and the Surface Friction ($\mu$) coefficient setting.

---

## 2. Dynamic Calibration & Formula Panel Mapping

To successfully analyze what's going on under the hood, we need to map our experiment scenarios to the specific calculations updating in the right-side panel:

| Scenario Selected | Active Inputs Controlled | Primary Target Formula Panel | Main Physical Mechanism Observed |
| :--- | :--- | :--- | :--- |
| **Scenario A: Black Ice Curve** | Locked: $\mu = 0.20$, Torque $= 200	ext{ Nm}$, Steer $= 25^\circ$ | **Panel 2: Traction Limit Calculations** | Minimal grip capacity bounds ($F_{	ext{limit}} = \mu 	imes F_z$) causing catastrophic wheel slip if standard 50:50 distribution is applied. |
| **Scenario B: High-Torque Turn** | Locked: $\mu = 0.80$, Torque $= 400	ext{ Nm}$, Steer $= 45^\circ$ | **Panel 1: Load Transfer Calculations** | Massive lateral load shift ($\Delta F_z$) starving the inner wheel of vertical force while expanding the outer wheel ceiling. |
| **Scenario C: Custom Sandbox Run** | Fully Unlocked Sliders & Master TV Switch | **Panel 3: Force Demand Calculations** | Direct user management over tire force demands ($F_{	ext{demand}}$) versus dynamic friction ceilings across custom configurations. |

---

## 3. Step-by-Step Experimental Procedure

### Step 1: Initialize System Environment
1. Load the `index.html` file into an appropriate browser viewport.
2. Click the **Reset Sandbox** button in the Telemetry Hub to clear any previous caches, reset the evaluation timer back to `45.00s`, and center the chassis at coordinates `(250, 0)`.

### Step 2: Execute Scenario A (Black Ice Curve Analysis)
1. Click on **Scenario A: Black Ice Curve** in the left HUD column. Observe that the slider bars lock up programmatically and the affected card boundaries highlight to indicate focus.
2. Ensure the **Intelligent Torque Vectoring** toggle switch is **ON (Checked)**. Look at the canvas track and observe how the car rounds the icy bend smoothly while the rear tires indicate an orange `INTERVENING` state. 
3. Open **Panel 2 (Traction Limit Calculations)**. Note how a low friction coefficient ($\mu = 0.20$) shrinks our total traction ceiling down to roughly $192	ext{ N}$ to $288	ext{ N}$ despite nominal loading.
4. Go to the Telemetry Hub and turn the **Intelligent Torque Vectoring** toggle **OFF (Unchecked)**. 
5. *Observation:* Watch the canvas immediately fill with warm cocoa smoke particles, red tire skid marks, and an erratic fish-tailing vehicle yaw rotation. The Telemetry status badge turns to a flashing red `SLIPPING`.
6. Read the live data updating in **Panel 3 (Force Demand Calculations)**. Notice that because the system is forced into a rigid 50:50 power split, the longitudinal force demand on the inner wheel ($F_{	ext{demand}} pprox 667	ext{ N}$) severely shoots past its low friction ceiling limit, triggering an aggressive spinout.

### Step 3: Execute Scenario B (High-Torque / High-G Load Shift Analysis)
1. Click the **Reset Sandbox** button to re-initialize the session.
2. Select **Scenario B: High-Torque Turn**. The inputs automatically calibrate to a high throttle load ($400	ext{ Nm}$) and max steering lock ($45^\circ$).
3. Direct your attention to **Panel 1 (Load Transfer Calculations)**. Read the lateral load transfer output ($\Delta F_z$). Because the steering wheel is rotated to its $45^\circ$ maximum limit, the equation yields an extreme load displacement of exactly $600	ext{ N}$ shifted away from the inner tire.
4. Track the resulting changes in **Panel 2**:
   * The Left Outer tire vertical load spikes to $1200	ext{ N} + 600	ext{ N} = 1800	ext{ N}$, boosting its friction limit ceiling up to $1440	ext{ N}$.
   * The Right Inner tire vertical load plunges down to $1200	ext{ N} - 600	ext{ N} = 600	ext{ N}$, shrinking its friction limit ceiling to a tiny $480	ext{ N}$.
5. Look at the left column's **Proving Ground Logs** force balance bars. Observe how the dynamic filler bars visualize the real-time demand approaching or bypassing those dark vertical limit ceilings.
6. Toggle the Torque Vectoring switch back and forth to see how the system shifts torque ratios (e.g., $68\%$ outer vs $32\%$ inner) to actively match these heavily skewed limits without breaking traction.

### Step 4: Execute Scenario C (Custom Sandbox Investigation & Hypothesis Formulation)
1. Click on **Scenario C: Custom Sandbox Run** to entirely unlock all bottom range sliders.
2. Formulate a personalized hypothesis (e.g., *"If I use a standard dry road friction of 0.80 and medium torque of 200 Nm, what is the maximum steering angle I can hold before a rigid 50:50 powertrain fails?"*).
3. Keep Torque Vectoring **OFF** initially. Gradually pull the steering slider outward from $0^\circ$ toward $45^\circ$.
4. Monitor the **Telemetry Hub Stability Index**. Record the exact angle where the system drops below $85\%$ stability or flips to a red `SLIPPING` state.
5. Re-engage the **Intelligent Torque Vectoring** switch under the same slider values. Note how the controller optimization logic backs off wheel demands to salvage handling, bringing the Stability Index back up to nominal values.

---

## 4. Reading and Interpreting the Evaluation Report

Once individual runs complete and the evaluation session clock expires at `0.00s`, the system freezes gameplay physics and drops a full-screen **Stability Control Evaluation Report** overlay. Here is how to break down the metrics:

1. **Stability Overview Section:**
   * *Average Stability Index:* Higher percentages (above $80\%$) mean the torque vectoring logic successfully managed your vehicle's trajectory. Low percentages mean prolonged sliding occurred.
   * *Total Slip Duration:* Quantifies both the absolute clock duration (seconds) and relative run percentage where wheels were experiencing traction loss. High slip percentages indicate poor handling control.
2. **Controller Profile Section:**
   * *Torque Vectoring Active vs. Rigid Power Split:* Computes the exact duration the car operated under optimized active splitting versus a standard rigid setup. Use this data to justify why certain runs stayed stable while others failed.
   * *Peak Steering Input:* Tracks your absolute maximum turning deflection to cross-reference against structural load transfer limits.
3. **Physical Verdict Interpretation:**
   * Use the generated summary text block to finalize lab observations. If $F_{	ext{demand}} \le F_{	ext{limit}}$ was maintained throughout the run, your vehicle state remains stable. If $F_{	ext{demand}} > F_{	ext{limit}}$ occurred, analyze whether it was caused by low surface grip ($\mu$) or excessive weight shift ($\Delta F_z$) robbing an inner tire of its loading capacity.
