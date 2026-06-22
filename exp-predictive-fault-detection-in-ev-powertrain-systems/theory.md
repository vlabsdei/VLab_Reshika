## Theory

An EV powertrain consists of key electrical and mechanical components including the battery pack, power inverter, and electric motor. Monitoring the health of these systems is critical for preventing catastrophic failures, ensuring vehicle longevity, and optimization of power delivery.

Predictive fault detection models continuously analyze streaming sensor telemetry—such as motor speed (RPM), inverter temperature ($^{\circ}\text{C}$), battery voltage ($\text{V}$), and motor load ($\%$)—to identify anomalous behaviors indicating degradation or impending faults.

### 1 Efficiency Formulation

The primary indicator of system health under normal versus faulty operational states is the overall Powertrain/Motor Efficiency ($\eta$). It represents the ratio of mechanical power output to electrical power input:

$$\eta = \left( \frac{P_{\text{out}}}{P_{\text{in}}} \right) \times 100$$

Where:

- $\eta$: Powertrain / Motor Efficiency ($\%%$)
- $P_{\text{out}}$: Mechanical Output Power (W), typically derived from motor speed ($\omega$) and torque ($T$) via $P_{\text{out}} = T \times \omega$.
- $P_{\text{in}}$: Electrical Input Power (W), provided by the battery and inverter, calculated via $P_{\text{in}} = V \times I$ (Voltage $\times$ Current).

### 2 Fault Manifestations & Detection Logic

1.  **Thermal Overheating:** Excessive current draw or cooling failure elevates the Inverter Temperature beyond safe thresholds ($>100^{\circ}\text{C}$). This triggers thermal throttling or component degradation, manifesting as a sharp drop in structural efficiency ($\eta$).
2.  **Sensor Noise & Malfunction:** Real-world sensors experience degradation or electromagnetic interference. High sensor noise distorts the telemetry feed, causing unstable control loop oscillations or false readouts, leading to localized anomalies.
3.  **Sudden Load Discrepancies:** Mismatches between expected mechanical load demand and actual output profiles indicate internal rotor faults, bearing wear, or winding faults.

---

## 3. Parameter Specifications

The simulation environment dynamically scales its output responses based on student inputs across the following validated operational ranges:

### 3.1 System Variables

| Parameter Category                | Parameter Name               | Valid Variable Ranges / Specifications            |
| :-------------------------------- | :--------------------------- | :------------------------------------------------ |
| **Input Parameters**              | Motor Speed                  | 500 – 6000 RPM                                    |
|                                   | Battery Voltage              | Standard Nominal EV Operating Voltage             |
|                                   | Sensor Data Feed             | Continuous Real-time Telemetry                    |
|                                   | Inverter Temperature         | $30^{\circ}\text{C} - 120^{\circ}\text{C}$        |
| **Parameters Changed by Student** | Sensor Noise Level           | Adjustable variance bounds                        |
|                                   | Motor Mechanical Load        | 10% – 100%                                        |
|                                   | Environmental/Operating Temp | $30^{\circ}\text{C} - 120^{\circ}\text{C}$        |
| **Output Parameters**             | Motor Efficiency ($\eta$)    | Calculated % Output                               |
|                                   | Fault Status                 | Binary (Normal / Faulty)                          |
|                                   | Warning Indicators           | Status Flags (e.g., `OVERHEAT`, `SENSOR_ANOMALY`) |

---

## 4. Test Procedure & Simulation Logic (Retest Framework)

The interactive simulation executes a strict procedural pipeline to replicate real-time predictive diagnostic software:

```
[Start Simulation]
       │
       ▼
 [Read Inputs: Speed, Load, Temp, Noise]
       │
       ▼
 [Compute Input/Output Power & Efficiency (η)]
       │
       ▼
 ┌─────┴─────────────────────────────────────┐
 │       Evaluate Fault Conditions:          │
 │  - Is Temp > Threshold (e.g., 95°C)?      │
 │  - Is Noise > Critical Tolerance?         │
 │  - Is η < Expected Target for given Load? │
 └─────┬─────────────────────────────────────┘
       │
       ├─── YES ──► [Trigger Warning Indicator & Update Fault Status to True]
       │
       └─── NO  ──► [Maintain Normal Operation Status]
       │
       ▼
 [Generate Outputs & Trend Plots] ──► [End Cycle / Continuous Loop]
```

### 4.1 Steps for Interactive Retesting

1.  **Baseline Initialization:** Set the _Motor Load_ to 50%, _Inverter Temperature_ to $45^{\circ}\text{C}$, and _Sensor Noise_ to minimum. Observe the calculated `Motor Efficiency` (typically high, $approx 85-95\%$) and ensure `Fault Status` remains `NORMAL`.
2.  **Thermal Stress Test:** Incrementally increase the operating _Temperature_ above $95^{\circ}\text{C}$ while keeping load constant. Observe the rapid degradation in `Motor Efficiency` and verify if the `OVERHEAT` warning indicator triggers automatically.
3.  **Sensor Degradation Analysis:** Introduce high _Sensor Noise_. Observe how standard error profiles ripple through the computational telemetry, causing immediate spikes in error margins and shifting the `Fault Status` indicator to alert conditions.
4.  **Full System Recovery:** Restore inputs back to standard nominal operational bounds to verify whether self-healing algorithms clear warning triggers and restore standard powertrain efficiency behavior.

---

## 5. Expected Observations & Results

1.  **Efficiency Degradation:** Sensor abnormalities, high noise injection, and severe internal overheating directly compromise inverter performance and motor torque consistency, causing a noticeable downward drop in overall system efficiency.
2.  **Proactive Failure Prevention:** Implementing immediate automated threshold alerting schemes ensures early predictive fault visibility, allowing isolation or maintenance protocols to initiate before catastrophic powertrain failure occurs.
