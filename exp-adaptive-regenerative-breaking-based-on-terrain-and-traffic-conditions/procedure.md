## PROCEDURE
### Step 1: Baseline Verification
1. Open the interactive simulation dashboard (`index.html`).
2. Verify default initialization parameters inside the **Controls Panel (Column 1)**:
   * **Vehicle Speed ($v$):** $70\text{ km/h}$
   * **Road Slope Angle:** $0^{\circ}$
   * **Brake Force ($F_b$):** $100\text{ N}$
   * **Terrain Surface Grip:** `Dry (mu = 0.85)`
   * **Traffic Condition:** `Free Flow (Continuous Regen)`

### Step 2: Triggering Deceleration and Unlocking Phase 2
1. Locate the **Brake Force ($F_b$)** slider interface.
2. Left-click and drag the slider past the minimum deadband window to an operational value (e.g., $1000\text{ N}$). Alternatively, place your cursor over the slider track and use your mouse wheel to fine-tune values.
3. Observe the **Telemetry Stack (Column 3)** jump to active life, accumulating electrical data.
4. Note that the **Phase 2: Math** application toggle button in the top navigation header is now active.

### Step 3: Environmental Parameter Sweeps
1. **Friction Boundary Stress Test:** Leave brake force at $1000\text{ N}$. Drop the **Terrain Surface Grip** dropdown to `Wet (mu = 0.40)` and then `Slippery Ice (mu = 0.10)`. Observe changes on the canvas car chassis.
2. **Gradient Analysis:** Return terrain to `Dry`. Move the **Road Slope Angle** slider to maximum downhill limits ($-15^{\circ}$). Observe the overlay system alert box status.
3. **Congestion Stress Test:** Set slope back to $0^{\circ}$. Modify **Traffic Condition** across `Stop & Go` and `Heavy Congestion` profiles. Look for green charging pulse changes on the animated display.

### Step 4: Mathematical Output Extraction
1. Select a custom configuration (e.g., $90\text{ km/h}$, $+5^{\circ}$ slope, $850\text{ N}$ braking force, Dry surface).
2. Click **Phase 2: Math** on the top header bar to slide the viewport down to the verification sheet.
3. Record the exact calculated raw values, mathematical substitutions, and physical expressions derived from your current variables.

---

## 2. Telemetry Inferences and Observation Points


To evaluate performance correctly, focus your analysis on these specific regions:

### The 2D Dynamic Visualizer Canvas (Center Column)
* **Vector Analysis:** Observe the force arrows drawn at the Center of Gravity ($CG$). Verify that the friction braking vector arrow ($F_b$) points leftward against motion, and look for the violet gravity vector arrow ($F_g$) extending when slope deviations occur.
* **Slip Indicator:** If the tire outer rings transform into a red color contour alongside an active text warning (`⚠️ ACTIVE SLIP DETECTED`), it indicates that $F_b > F_{\max}$, signaling an immediate traction loss state.
* **Energy Pulses:** Monitor the green particle vectors flowing from the wheels to the chassis core during deceleration. A complete halt in these green pulses indicates that energy harvesting has dropped to zero due to system configurations.

### Real-Time System Parameters Summary (Lower Center Panel)
* Compare the output **Deceleration Rate** directly against the **Safe Range** marker limit ($\le 8.0\text{ m/s}^2$).
* Observe the **Regen Allocation** column. If it reads $100\%$, the MGU is harvesting the entirety of the braking torque. If it drops, calculate how much remainder torque is being lost as pure heat through mechanical friction blending.

### The Telemetry Column (Right Column)
* **Initial Kinetic Energy vs. Recovered Energy:** Review the relationship between the blue `KE` dashboard value and the green `REC` block value. The difference reflects the total energy lost to environmental friction, grade steepness, and wheel slip factors.
* **Battery Charge Gain ($\Delta\text{SOC}$):** Notice how minor adjustments to speed drastically alter this value due to its squared relationship ($v^2$) in the kinetic energy equation.
