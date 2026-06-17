**THEORY** 

## **1. Introduction to V2G Systems** 

Vehicle-to-Grid (V2G) technology defines a bidirectional electrical energy exchange system where plug-in electric vehicles (EVs) interact dynamically with the power grid. Instead of operating solely as traditional electrical loads that consume power, EV battery packs serve as distributed energy storage systems (DESS). This framework permits two primary operational modes: 

- **Grid-to-Vehicle (G2V):** The grid transfers power to the vehicle to charge the battery pack. 

- **Vehicle-to-Grid (V2G):** The vehicle discharges stored electrical energy back into the smart grid to support the power infrastructure during periods of high grid demand. 

## **2. Basic Terminologies** 

To accurately simulate and analyze the bidirectional energy exchange, several foundational parameters must be monitored and adjusted: 

- **Grid Voltage (V):** The operational voltage of the smart utility grid infrastructure, varying within a valid simulation range of 180 - 260 V. 

- **Current (I):** The rate of flow of electric charge during the exchange process, moving within a valid range of 5 – 60 A This current is positive during standard battery charging and registers as discharging current when transferring power back to the grid. 

- **State of Charge (SOC):** A percentage metric representing the instantaneous remaining capacity of the EV battery pack relative to its maximum capacity, constrained to an operational simulation window of 20% - 100%. 

- **Grid Load / Grid Demand:** The instantaneous total power consumption demanded by all connected consumers on the utility grid, categorized into normal and peak load conditions. 

- **Grid Load Reduction:** The net decrease in stress and power demand achieved on the primary power system via timely EV discharging intervention during peak hours. 

- **Charging Efficiency:** The ratio of energy successfully stored in the battery pack relative to the total energy drawn from the grid during the charging cycle. 

## **3. Governing Mathematical Formulas** 

The electrical performance and efficiency metrics of the V2G exchange interface are dictated by standard power equations: 

## **Power Equation** 

The electrical power (P), measured in Watts (W), transferred between the vehicle and the grid is 

the product of the system voltage and the flowing current: 

𝑷 =  𝑽 × 𝑰 

Where: 

P = Electrical Power (W)

V = Grid Voltage (V) 

I = Charging/Discharging Current (A) 

## **Energy Exchange Rate** 

While instantaneous power is determined by the equation above, the cumulative energy transferred over a specific timeline (t) governs the total capacity exchange, influencing the shifting State of Charge (SOC) of the battery pack. 

## **4. Working Logic & Simulation Dynamics** 

The smart energy exchange simulation operates on a dynamic load-balancing control logic: 

## **Peak Shaving and Load Balancing** 

When the smart grid experiences high grid demand (peak load), the system requests localized power support. If a connected EV maintains a high battery SOC, it triggers a V2G discharge cycle, routing power back into the system to achieve peak shaving and load balancing. 

## **Battery Dependency Guardrails** 

The quantity of power supplied back to the grid is structurally restricted by the vehicle's remaining charge. If the battery SOC drops to a low level, the power transfer capability scales down automatically to safeguard the cell chemistry from over-discharging and preserve baseline mobility requirements. 

