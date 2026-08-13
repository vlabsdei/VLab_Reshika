### Theory

#### 1. Dual-Motor Powertrain Control
In a dual-motor EV, front ($P_1$) and rear ($P_2$) motors supply torque independently:

$$P_{\text{total}} = P_1 + P_2$$

#### 2. Dynamic Weight Transfer
Under acceleration, longitudinal mass shift alters normal axle forces:

$$F_{z, \text{front}} = f_{\text{front}} \cdot m g$$
$$F_{z, \text{rear}} = (1 - f_{\text{front}}) \cdot m g$$

Where $f_{\text{front}} = \max(0.25, \min(0.50, 0.50 - k_{\text{transfer}} \cdot P_{\text{total}}))$.

#### 3. Traction Limit Allocation
$$P_{\text{limit}} = C_{\text{scale}} \cdot \mu \cdot F_z$$
