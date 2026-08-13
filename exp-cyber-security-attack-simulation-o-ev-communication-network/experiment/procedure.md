### Procedure

1. **Step 1: Network Configuration**
   - Initialize baseline CAN bus traffic between VCU, BMS, and Motor Inverter.

2. **Step 2: Attack Injection**
   - Select Attack Vector: CAN Spoofing, Denial of Service (DoS), or MiTM Interception.
   - Set Injection Frequency and Message ID payload.

3. **Step 3: Monitor Network Telemetry**
   - Observe packet collision rate, latency jitter, and fake speed/torque command responses.

4. **Step 4: IDS Security Response**
   - Enable IDS Firewall Filter and observe message filtering and bus recovery.
