### Theory

#### 1. Controller Area Network (CAN Bus) Architecture
Modern Electric Vehicles rely on CAN bus networks for inter-ECU communication (BMS, Motor Controller, VCU, Telemetry).

#### 2. Cyber-Security Attack Vectors in EVs
- **CAN Message Spoofing**: Injecting forged CAN frames with arbitrary IDs to manipulate torque or battery telemetry.
- **Denial of Service (DoS)**: Flooding the CAN bus with high-priority dominant identifier bits ($0x000$) to starve legitimate communication traffic.
- **Man-in-the-Middle (MiTM)**: Intercepting and altering sensor signals between VCU and Motor Inverter.

#### 3. Intrusion Detection System (IDS) Defense
$$\text{Anomaly Index} = \frac{|f_{\text{received}} - f_{\text{expected}}|}{\sigma_{\text{baseline}}}$$

If Anomaly Index exceeds threshold $\tau$, the IDS triggers emergency bus isolation and fallback modes.
