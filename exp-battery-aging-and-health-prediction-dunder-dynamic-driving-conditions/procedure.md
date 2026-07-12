## Procedure

### 1. Detailed Experimental Simulation Procedure

Use these step-by-step guidelines to configure the environment, run the visual cycles, and gather degradation data:

1.  **Set Up the Baseline Run:**
    *   Head to the control panel sidebar and use the vertical thermometer slider to set the temperature to a standard room-temperature baseline of $25^\circ\text{C}$.
    *   Click the **50** quick-tab button in the cycles panel to queue up a brief starting runtime.
    *   Pick the **Normal Commute** card under driving patterns, which automatically sets the vehicle load draw to $50\%$.
    *   Make sure the Charging Type dropdown menu is set to **Normal Charging (1C-rate)**.

2.  **Run the Baseline Test:**
    *   Hit the green **Run Simulation** button to begin the cycle loop.
    *   Watch the center 3D battery module render screen to see the State of Charge (SoC) progress bar actively drop and refill as the cells charge and discharge.
    *   When the cycle counter finishes counting up to the target number ($50$), the simulator will pause on its own, unlocking the **Phase 2: Conclusion** report panel at the top.

3.  **Run Stress Parameter Tests (Accelerated Wear):**
    *   Click the **Reset Parameters** button to clear out the previous simulation values.
    *   Simulate a hot climate: Click and drag the thermometer level up to **$55^\circ\text{C}$**.
    *   Simulate high-stress performance driving: Choose the **Extreme Track** card, which bumps the operating discharge load to a maxed-out $100\%$.
    *   Simulate dynamic fast charging: Set the charging dropdown menu to **Fast Charging (3C-rate)**.
    *   Select the **1000** cycles quick-tab option.
    *   Hit **Run Simulation** and track the accelerated damage as it processes.

4.  **Manually Scrub the Timeline:**
    *   Move your cursor over to the line graph shown on the right panel.
    *   Click and drag your mouse horizontally along the X-axis timeline (Applied Cycles) to scrub back and forth across different cycle indices.
    *   Watch how the live digital gauges, mathematical results, and battery cell colors instantly shift to show exactly how worn out the pack was at that precise moment in time.

5.  **Review the Final Diagnostic Output:**
    *   Once the simulation run concludes, click the **Phase 2: Conclusion** navigation link at the top of the application wrapper to inspect the final stress index evaluations and student summary write-up.

---

### 2. Observation Guide and Data Inference Framework

#### Critical Visuals to Monitor During the Lab
*   **Volumetric 3D Module Grid:** Keep an eye on the internal cell cylinders labeled $M\text{-}01$ through $M\text{-}04$. As the State of Health (SoH) degrades, the base cell fills drop from green to amber, and eventually turn a solid deep red with visible micro-crack overlays overlaying the textures.
*   **Pulsing Plugs & Active Coolant Flow:** The main high-voltage cable connectors ($+$ and $-$) will pulse with an orange light during discharge sequences. At the same time, the liquid cooling plate plate loop running underneath the box flows light blue under safe operation but shifts to an amber/red warning color if heat flux spikes.
*   **Analytical Line Graph Canvas:** This area plots out the live trajectory of the solid blue SoH curve as it descends closer to the bright red dashed **End of Life (EOL) limit boundary line ($70\%$)**.

#### Data Interpretation and Health Inference Look-Up Table

Use this reference framework to map out your observations and decide what maintenance steps are needed based on the simulation outputs:

| Live SoH Reading | Calculated Stress Index ($\psi$) | Thermal Runaway Risk Index | Final Expected Battery Grade | Practical Laboratory Assessment & Action Plan |
| :--- | :--- | :--- | :--- | :--- |
| **$90\% - 100\%$** | $1.0\text{x} - 1.5\text{x}$ | Low ($0\% - 25\%$) | **Grade A** (Optimal Condition) | Excellent status. Anode SEI layer growth is nominal. Safe for continuous, multi-cycle operation. |
| **$80\% - 89\%$** | $1.6\text{x} - 3.0\text{x}$ | Moderate ($26\% - 50\%$) | **Grade B** (Moderate Wear) | Minor capacity fade is setting in. Internal resistance has risen noticeably. Recommend reducing reliance on fast chargers. |
| **$70\% - 79\%$** | $3.1\text{x} - 4.0\text{x}$ | High ($51\% - 75\%$) | **Grade C** (Degraded State) | Battery is worn out and closing in on operational limits. Crystalline micro-cracking is present. Cap dynamic current draw to avoid thermal spikes. |
| **$< 70\%$** | $> 4.0\text{x}$ | Critical ($> 75\%$) | **Grade F** (End-of-Life status) | **End of Life boundary reached.** Severe internal resistance spikes risk major Joule heating hazards. Take pack offline immediately for decommissioning and recycling. |
