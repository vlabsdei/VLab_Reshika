# PROCEDURE
## 1. Cross-Platform Interface & Control References

The simulation dynamically adapts its control mechanics depending on whether you are accessing the laboratory via a Laptop/Desktop or a Mobile device. 

| Control Target | Laptop (Desktop) Interface Mechanics | Mobile Touch Interface Mechanics |
| :--- | :--- | :--- |
| **Workspace Layout** | Standard side-by-side view (75% Stage / 25% Telemetry Deck). | Vertically stacked layout; horizontal telemetry cards wrap at the top of the screen. |
| **Rotor Speed ($N$)** | Click, hold, and sweep the mouse in a circle over the central rotor hub. | Tap, hold, and trace a circular gesture with your finger over the rotor ring. |
| **Cooling Vent Flow** | Click and drag the blue valve handle node, or tap the physical **`+` (Plus)** and **`-` (Minus)`** keys. | Drag the blue valve handle vertically with a fingertip touch target. |
| **Brake Force** | Click and drag the amber valve handle node, or tap the physical **`W`** and **`S`** keys. | Drag the amber valve handle vertically with a fingertip touch target. |
| **Noise Filter Shield** | **Press and hold the physical Spacebar**. The shield drops instantly when the key is released. | Tap the floating **`EMI SHIELD: OFF`** button on the canvas to toggle it **ON** (locks in place). |

---

## 2. Step-by-Step Simulation Routine

### Step 1: System Power Initialization
1. Ensure your browser focus is inside the active simulation canvas framework.
2. Locate the **Center Console Power Button** positioned exactly in the middle of the graphical engine grid (the small circular toggle icon marked with a white power symbol `⏻`).
3. Click this button to transition the system from its de-energized dark state to **ON**. 
4. Verify that the dashboard status badge changes to green, reading **NORMAL (Safe)**, and the motor stabilizes at an idle speed of **500 RPM**.

### Step 2: Manual Rotation Velocity Control
1. **On Desktop:** Click and hold your primary mouse button over the large central **Rotating Flux Rotor Ring** (marked with magnetic pole indicators **N** and **S**), then sweep the pointer in a smooth circular path around the center core axis.
2. **On Mobile:** Long-press your finger on the **Rotating Flux Rotor Ring** and trace a continuous circular gesture.
3. Observe that sweeping gestures accelerate motor speeds upwards from the idle threshold toward the top velocity ceiling of **6000 RPM**. Check your vertical telemetry layout cards to view real-time changes.

### Step 3: Interactive Constraint Injection
Test the diagnostic fault limits by directly modifying your operational bounds on the dual vertical control valves built into the right-hand canvas side deck:

1. **Manipulate Cooling Vent Flow (Left Track - Blue Handle):**
   * *Desktop:* Click and drag the handle vertically, or use your keyboard **`+` / `-`** keys.
   * *Mobile:* Drag the blue knob node vertically with your finger.
   * Observe how cutting off flow causes core thermal limits to escalate under sustained motor RPM.
2. **Manipulate Brake Force (Right Track - Amber Handle):**
   * *Desktop:* Click and drag the handle vertically, or use your keyboard **`W` / `S`** keys.
   * *Mobile:* Drag the amber knob node vertically with your finger.
   * Notice that hard braking causes motor speed to drop rapidly while generating severe internal friction drag and thermal stresses.

### Step 4: Deploying the Vacuum Noise Shield
1. When high ambient electromagnetic interference degrades core efficiency, activate your filter shield:
   * *Desktop:* **Press and hold down the physical Spacebar**.
   * *Mobile:* Tap the glowing purple **`EMI SHIELD: OFF`** canvas badge once to lock it **ON**.
2. Observe a purple protective filter boundary bubble expand outward from the core axis center.
3. While active, track the **EMI Noise** variable as it drops back down to its clean baseline minimum of **$0.20$**, helping recover falling core efficiency performance.

### Step 5: Monitoring Predictive Failure Isolation
1. Force a critical failure state by allowing the core temperature to climb past the severe safety boundary of **$118^\circ\text{C}$**, or allow the real-time efficiency calculation to sink below the safe **$80\%$** boundary limit.
2. Track the red **PREDICTIVE SYSTEM FAULT DETECTED** alarm text block flashing inside the viewport.
3. If you do not quickly restore clean inputs, apply your shield, or ramp up cooling variables to recover safety metrics within **3.0 seconds**, the simulation will isolate the core automatically. Read your performance telemetry limits on the generated *Meltdown Debrief Card*, then click **RE-ENGAGE & RESTABILIZE CORE** to reset the system back to normal.
