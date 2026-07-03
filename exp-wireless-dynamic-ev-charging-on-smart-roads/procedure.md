# PROCEDURE

## Phase 1: Operational Testing & Live Data Collection

### 1. Initial System Inspection and Baseline Check
* **1.1.** Launch the virtual lab environment in your browser window.
* **1.2.** Click on the **"How it Works"** button (`?`) located in the upper navigation bar to open the introductory panel. 
* **1.3.** Review the basic theoretical principles explaining **Asphalt Electromagnetic Transparency**, **Smart Segmented Coils**, and vehicle capture mechanics. 
* **1.4.** Click the **"Start Simulation"** confirmation button to close the tutorial overlay and open the workspace.
* **1.5.** Verify that the system initializes by default inside the **Phase 1: Live Lab Test** container with the status badge reading **Active**.
* **1.6.** Press the red **Reset Battery** button to wipe out all background registers.
* **1.7.** Confirm that the dashboard meters successfully clear and read exactly **0.00 kJ** for Energy Captured, **0.00s** for Time Spent Charging, and **SoC: 0.0%** for the State of Charge.

### 2. Evaluating the Impact of Vehicle Silhouette & Air Gap ($z$)
* **2.1.** Align the vehicle perfectly with the track centerline by setting the **Off-Center Alignment ($x$)** slider to exactly `0.0 cm`.
* **2.2.** Maintain a stable baseline transit velocity by configuring the **Driving Speed ($v$)** slider to `50 km/h`.
* **2.3.** Drag the **Ground Clearance / Height ($z$)** slider down to its lowest limit of `5.0 cm` to trigger the **Sedan Profile**.
* **2.4.** Observe the blue sedan silhouette rendering on the canvas and evaluate the high-intensity green color mapping of the animated flux waves.
* **2.5.** Click the **Save Snapshot** button to record this low-clearance operational state in the memory array.
* **2.6.** Adjust the **Ground Clearance / Height ($z$)** slider upward into an intermediate range of `15.0 cm` to switch the system into the **Crossover SUV Profile**.
* **2.7.** Track the visual transition to a green vehicle frame on the canvas and observe the changes in magnetic flux field density.
* **2.8.** Click the **Save Snapshot** button to capture this intermediate clearance baseline.
* **2.9.** Move the **Ground Clearance / Height ($z$)** slider to its maximum bounds of `25.0 cm` or higher to activate the **Delivery Van Profile**.
* **2.10.** Note the charcoal-grey cargo chassis profile and the severe visual decay in the rendering opacity of the inductive coupling waves.
* **2.11.** Click the **Save Snapshot** button to append this high-clearance profile to your laboratory data logs.

### 3. Mapping Lateral Driving Misalignment ($x$)
* **3.1.** Reset the vehicle's height profile by moving the **Ground Clearance / Height ($z$)** slider to a static value of `15.0 cm`.
* **3.2.** Check that the **Driving Speed ($v$)** slider remains locked at `50 km/h`.
* **3.3.** Move the **Off-Center Alignment ($x$)** slider to a position between `0.1 cm` and `5.0 cm` to simulate minor steering drift.
* **3.4.** Check the top-down crosshair radar grid and note that the alignment target indicator remains a stable green color.
* **3.5.** Click the **Save Snapshot** button to document this minimal alignment deviation.
* **3.6.** Drag the **Off-Center Alignment ($x$)** slider further out into a range between `5.1 cm` and `12.0 cm` to simulate moderate lane drift.
* **3.7.** Observe that both the radar inset crosshair target and the live canvas flux field lines shift to an orange color mapping.
* **3.8.** Click the **Save Snapshot** button to lock in this moderate displacement record.
* **3.9.** Force a severe alignment error by moving the **Off-Center Alignment ($x$)** slider past `12.0 cm` up to its maximum boundary of `20.0 cm`.
* **3.10.** Watch the tracking interface elements and the animated flux lines turn a vibrant warning red, visualizing severe off-center link decay.
* **3.11.** Click the **Save Snapshot** button to capture this extreme lateral misalignment boundary condition.

### 4. Investigating Transit Velocity ($v$) & Exposure Limits
* **4.1.** Move the **Off-Center Alignment ($x$)** slider back to `0.0 cm` and set the **Ground Clearance ($z$)** slider to `10.0 cm`.
* **4.2.** Click the **Reset Battery** button to clear the integration timers and return the state variables back to zero.
* **4.3.** Configure the **Driving Speed ($v$)** slider down to its lowest operational baseline of `10 km/h`.
* **4.4.** Observe the slow horizontal movement of the scrolling road and watch how quickly the battery indicator bar integrates energy over time.
* **4.5.** Click the **Save Snapshot** button to record this high-exposure, low-velocity test run.
* **4.6.** Click the **Reset Battery** button a second time to reset the system limits.
* **4.7.** Move the **Driving Speed ($v$)** slider up to its maximum velocity boundary of `100 km/h`.
* **4.8.** Monitor the rapid scrolling animation of the canvas and note that the reduced vehicle exposure time over individual energized zones slows down battery accumulation.
* **4.9.** Click the **Save Snapshot** button to complete your Phase 1 live data log collection.

---

## Phase 2: Mathematical Analytical Verification

### 5. Transferring Focus to Data Analytics
* **5.1.** Navigate to the top phase switcher tabs and select the **Phase 2: Check the Math** layout tab.
* **5.2.** Verify that the **Saved Snapshots & Smart Analytics** table has fully populated with all the data entries logged during your Phase 1 runs.
* **5.3.** Check that each data row successfully displays its unique Snapshot ID, Timestamp, Offset ($x$), Air Gap ($z$), Speed ($v$), Nominal Efficiency, Peak Power, and current SoC.

### 6. Empirical Sensitivity Calculations
* **6.1.** Locate the analytical text fields situated inside the panel card titled **"What the Data Tells Us"**.
* **6.2.** Locate a pair of snapshots where the alignment offset ($x$) stayed identical, but the air-gap clearance height ($z$) was modified.
* **6.3.** Read the derived **Height Sensitivity** value to find the exact percentage of power lost per centimeter of vehicle ground clearance increase.
* **6.4.** Locate another pair of snapshots where the air gap ($z$) remained identical, but the off-center alignment ($x$) was altered.
* **6.5.** Read the derived **Alignment Sensitivity** output value to quantify the efficiency degradation rate caused by driving off-center.
* **6.6.** Review the logged stats block to identify the absolute best spatial optimization setup found during your live simulation trials.

### 7. Algorithmic Verification Checks
* **7.1.** Click directly on any row item inside the data logging table to highlight that record.
* **7.2.** Confirm that the selected row turns a distinct light-blue hue, indicating it has successfully locked focus.
* **7.3.** Look to the right side of the workspace to inspect the **Verify the Math** verification panel.
* **7.4.** Compare the manual formula output for **Coupling Efficiency ($\eta$)** against the value recorded by the simulation engine to ensure they display a green **MATCH** status.
* **7.5.** Check the mathematical result for **Peak Power Transfer ($P_{\text{received}}$)** against the live data value to ensure they display a green **MATCH** status.
* **7.6.** Click on the circular information icon (`i`) located on the section header to reveal the hidden **Settings Change Log**.
* **7.7.** Review the chronological log table to verify that your structural adjustments match proper system calibration procedures.

---

## Critical Observations to be made

* **Proximity Factor Thresholds:** Students must note that active power transmission occurs **only** when the vehicle receiver plate enters a strict **90-pixel horizontal proximity window** centered over an active road coil.
* **Structural Decay Discrepancies:** Students must observe that lateral driving drift ($x$) causes a non-linear drop in efficiency compared to vertical changes, because the offset uses a squared negative exponential decay function ($e^{-0.002 \cdot x^2}$).
* **System Saturation Safe Cut-offs:** Students must verify that the simulation instantly triggers a **Charge Complete** state when the integrated battery capacity hits its maximum limit of **1000.0 kJ (SoC: 100.0%)**, automatically zeroing out further power capture to simulate battery protection circuits.
* **Velocity Exposure Inversion:** Students must notice that changing the driving speed ($v$) has **no** mathematical impact on peak power or link efficiency; instead, it scales the physical road scrolling animation, changing exposure time over active fields.
