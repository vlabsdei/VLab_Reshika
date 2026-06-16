## **Part 1: Setting Up and Running the Dynamic Telemetry Simulation** 

1. Initialize the Parameters: 

   - On the left control panel, select a Driving Profile from the dropdown menu (choose between Eco-Driving Profile (Stable speed), City Traffic Cycle (Stop-and-go), Aggressive Driving (High speed, harsh braking), or Custom Sandbox). 

   - Input the target Speed (v) in km/h using the numerical input field (ranges from 10 to 450 km/h). 

   - Choose a Terrain Profile from the "Select Terrain" dropdown menu to establish your road angle slope (Flat Expressway (0° slope), Steep Hill Climb (+12° slope), or Downhill Descent (-10° slope)). 

   - Enter the Vehicle Base Mass within the 1000–3000 kg range (default is 1600 kg). 

   - Choose the Number of Passengers (1 to 5) using the provided passenger selector radio buttons, and verify the updated load value via the Total Simulation Mass (m) readout box. 

   - Adjust the Brake Frequency slider (ranging from 2 to 10 /min) to configure how many times per minute the vehicle brakes, which impacts dynamic energy integration and regenerative braking metrics. 

## 2. Execute the Simulation: 

   - Click the Run Telemetry Test Simulation button. 

   - Monitor the 3D viewport canvas (including the Status overlay, live speed readout, and tire/road animations) and the Live Battery Pack Monitor to track real-time changes. Observe the State of Charge liquid wave gauge, the live battery cells temperature heatmap (C1 through C12), and the live gauge cards indicating Cell Temperature, Current Draw, Terminal Voltage, and Thermal Strain. 

   - Track dynamic calculations in real-time within the Live Energy & Power Integration sub-panel, observing the rolling values for Power (P), Time (t), Energy (E), and the live text formula string. 

   - Wait for the green progress bar inside the simulation block to reach completion. 

3. Record the Verdict and Logs: 

   - Once the simulation cycle stops, check the Verdict section to evaluate your final calculated AI ECO-SCORE, VERDICT STATUS, and the concluding descriptive summary text. 

   - Look over the Live Calculations block to record final steady-state assessments including Tractive Force (𝐹𝑡𝑜𝑡𝑎𝑙), Motor Power (𝑃𝑚𝑜𝑡𝑜𝑟), Estimated Driving Range, and Resulted Driving Range. 

   - Scroll down to the Simulated Performance Matrix History table and record the logged row entries for the Driving Profile Tested, Terrain Profile, Unladen Mass, Wh Energy Consumed, Peak Power, Resulted Range, AI Eco-Score (%), and its respective pass/fail Verdict. 

## **Part 2: Verifying with Static Theoretical Calculations** 

1. Access the Analysis Workspace: 

   - Click the Proceed to Explanation button to transition interfaces and open up the Milestone 1 structural breakdown workspace. 

2. Calculate Tractive Forces manually using the Constants Legend: 

   - Gravity Force (𝐹𝑔𝑟𝑎𝑣𝑖𝑡𝑦): Locate your parameters inside the blue panel breakout formula (𝐹𝑔𝑟𝑎𝑣𝑖𝑡𝑦 = 𝑚× 𝑔× 𝑠𝑖𝑛𝜃). Multiply your total mass by gravity (𝑔= 9.81 𝑚[2] ) and the sine of your terrain's slope angle (𝜃). 

   - Rolling Friction Force (𝐹𝑟𝑜𝑙𝑙𝑖𝑛𝑔): Locate parameters inside the green panel breakout formula (𝐹𝑟𝑜𝑙𝑙𝑖𝑛𝑔 = 𝜇× 𝑚× 𝑔× 𝑐𝑜𝑠𝜃). Multiply the static rolling friction coefficient (𝜇= 0.012) by your total simulation mass, gravity, and the cosine of your terrain's slope angle (𝜃). 

   - Aerodynamic Drag Force (𝐹𝑑𝑟𝑎𝑔): Locate parameters inside the red panel breakout formula 𝑚 

   - (𝐹𝑑𝑟𝑎𝑔):  = 0.5 × 𝜌× 𝐶𝑑 × 𝐴× 𝑣[2] ). Ensure speed is converted to meters per second 𝑠 ~~)~~ . 0.125𝑘𝑔 

   - Compute using air density (𝜌= ~~)~~ , drag coefficient (𝐶𝑑 = 0.24), and vehicle frontal area 𝑚 

   - (𝐴= 2.2𝑚[2] ). 

   - Total Resistance Force Summation: Combine these individual calculation values inside the yellow summary element to establish your total baseline resistance force (𝐹𝑡𝑜𝑡𝑎𝑙 = 𝐹𝑔𝑟𝑎𝑣𝑖𝑡𝑦 + 𝐹𝑟𝑜𝑙𝑙𝑖𝑛𝑔 + 𝐹𝑑𝑟𝑎𝑔) 

3. Verify Power and Energy Demand: 

   - Reference the purple calculation block (𝑃= 𝐹× 𝑣) to calculate baseline motor power by multiplying your calculated total force by velocity in 𝑚/𝑠, converting the absolute output value into kilowatts (𝑘𝑊) 

   - Reference the light blue calculation block (𝐸= 𝑃× 𝑡) to calculate baseline energy consumed over the fixed 30-second testing interval duration to yield final theoretical Watt-hours (𝑊ℎ) 

   - Note: If working with a Downhill Descent, reference the special dynamic physics explanation window to see how negative force, power, and energy entries indicate forward gravity assist and regenerative braking battery capture. 

## **Compare Outputs:** 

- Look at the Simulation Run vs. Theoretical Calculations comparison grid dashboard layout. 

- Contrast the Dynamic Simulation Output indicators (Avg Power, Total Energy, Resulted Range, AI EcoScore) against the Static Theoretical Formula values (Calculated Power, Calculated Energy, Estimated Range, Baseline Score). 

- Analyze the differences caused by real-world dynamic variables present in the simulation (such as profile variations, cell thermal shifts, and braking losses) compared to static arithmetic formulas. 

- Click either Review and Understand, Return to Test Simulation, or use the red Reset Simulation button to clear workspace variables or execute a brand new simulation configuration profile. 

