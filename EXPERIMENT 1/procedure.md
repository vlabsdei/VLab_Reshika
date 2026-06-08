## **PROCEDURE** 

## **Milestone 1: Isolation Barrier Material Selection** 
1. Open the simulation workspace and navigate to the material selection settings. 

2. Check the available material options (Aluminium, Steel, Air Gap, Aerogel) from the drop-down menu and note down their thermal conductivity ($k$) values. 

3. Click **Run Thermal Test** to observe how heat transfers from the faulty cell (at 120 °C) to the normal cell (at 25 °C). 

4. Compare the performance based on how long it takes to reach the critical temperature (80 °C) and the given verdict. Choose the most effective insulating material, lock it in, and click **Proceed to Milestone 2**. 

---

## **Milestone 2: Multi-Variable Containment Simulation** 
1. Verify the selected isolation material carried over properly. Use the sliders to set up the following test parameters within their allowable ranges: 
   * Mass of Cell ($m$): 0.1 kg to 3.0 kg 
   * Initial Battery Temp: 20 °C to 60 °C 
   * Cooling Efficiency: 40% to 95% 
   * Fault Duration: 1 sec to 20 sec 

2. Set the Emergency Isolation System toggle switch to **ON** if you want automated safety loops, or leave it **OFF** if you want to test manual intervention times. 

3. Click **Trigger Fault** to induce an internal short circuit in Cell 1. 

4. Monitor the dashboard data and the changing colors of Cells 1, 2, and 3 to track heat generation calculation ($Q = mc\Delta T$), elapsed time, and total energy released. 

5. If running in manual mode (System set to **OFF**), wait for the cell temperature to hit the critical threshold (80 °C), then immediately click the **DEPLOY EMERGENCY BARRIER** button to engage the barrier and stop conductive heat transfer. 

6. Observe the physical status of the cells; any cell that surpasses 120 °C will turn black, indicating burnout. 

7. Review the final performance data after the simulation finishes, noting down the **Peak Temp**, **Response Time**, and number of **Damaged Cells**. Click **History** to log the overall data fields (Total Damaged Cells, First Breach Timestamp, and Cooling Recovery Duration). 

8. Check the event log at the bottom of the page for the thermodynamic breakdown of the test run. Click **Reset Simulation** if you need to modify variables and run another test.
