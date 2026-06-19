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

- **Vehicle-to-Grid (V2G):** A bidirectional system that allows parked electric vehicles to discharge electricity from their battery packs back into the public power grid during high peak demand. 

- **Grid-to-Vehicle (G2V):** The traditional unidirectional or bidirectional mode where power flows from the utility grid into the EV to charge the battery under normal or low demand conditions. 

- **Peak Demand:** Periods of high aggregate electrical load on the power grid that strain generation and distribution equipment, requiring immediate external balancing. 

- **Bidirectional Inverter:** The power electronics component responsible for converting Alternating Current (AC) from the grid to Direct Current (DC) for the battery, and vice versa, while synchronizing phase and voltage parameters. 

## **3. Governing Mathematical Formulas** 

The electrical performance and efficiency metrics of the V2G exchange interface are dictated by standard power equations: 

## **Power Equation** 

The electrical power (P), measured in Watts (W), transferred between the vehicle and the grid is the product of the system voltage and the flowing current: 

**P=V x I**

Where: 

P = Electric Power (W)

G = Grid Voltage (V)

I = Charging/Discharging Current (A)

This formula calculates the exact amount of electrical energy being transferred between the vehicle and the substation per second. 

## **2. Charging Efficiency Formula** 

**𝜂 = (𝑃<sub>𝑠𝑡𝑜𝑟𝑒𝑑</sub>/𝑃<sub>𝑠𝑢𝑝𝑝𝑙𝑖𝑒𝑑</sub>) X 100**

Where: 

𝜂 = Overall conversion Energy as per percentage (%) 

𝑃<sub>𝑠𝑡𝑜𝑟𝑒𝑑</sub> = Net power successfully absorbed by the target battery or grid infrastructure. 

𝑃<sub>𝑠𝑢𝑝𝑝𝑙𝑖𝑒𝑑</sub> = Gross input power fed through the bidirectional inverter system. 

It determines the energy lost as heat during the high-voltage conversion process, exposing how system quality alters operational performance. 

## **4. Working Logic & Simulation Dynamics** 

- **State of Charge (SOC) Depletion Loop:** Once V2G mode is fully synced and active, a time-based loop executes in main.js. For every 1 second of simulation runtime, the EV Battery State of Charge (SOC) decreases by exactly 1% as energy is drained and transferred to the grid. 

- **50% SOC Reverse-Flow Safety Trigger:** To demonstrate autonomous protection loops, a hard comparison threshold is checked continuously during depletion: 

**𝑪𝒖𝒓𝒓𝒆𝒏𝒕 𝑺𝒐𝑪 ≤𝟓𝟎%** 

The exact millisecond the SOC counts down to 50%, the backend script overrides all user inputs. It forces the simulation to exit Discharging (V2G) mode and executing an absolute flip into Charging (G2V) mode. The current direction is instantly inverted to draw power from the grid back into the vehicle to safeguard baseline mobility, locking out the student's discharge controls and printing a critical safety override log to the user interface. 

