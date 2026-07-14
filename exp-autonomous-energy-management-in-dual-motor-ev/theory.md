# THEORY
## 1. Objective
To analyze the power sharing, torque vectoring, and traction distribution between the front ($P_1$) and rear ($P_2$) electric motors of a dual-motor electric vehicle under dynamically shifting physical loads and varying surface friction coefficients ($\mu$). The experiment mathematically models, visualizes, and verifies how autonomous torque allocation prevents wheel slip and optimizes energy efficiency compared to uncoordinated manual power distribution.

---

## 2. Basic Terminologies
* **P1 Powertrain Layout:** An EV architecture where an electric drive motor is situated on the front axle, providing traction exclusively to the front wheels.
* **P2 Powertrain Layout:** An EV architecture where an electric drive motor is situated on the rear axle, providing traction exclusively to the rear wheels.
* **Surface Friction Coefficient ($\mu$):** A dimensionless scalar value representing the ratio of the force of friction between two bodies (tires and road) to the normal force pressing them together.
* **Torque Vectoring (Power Allocation):** The electronic modulation of power delivered to individual wheels or axles to dynamically alter vehicle handling, performance, and stability characteristics.
* **Wheel Slip ($S$):** The relative difference between the linear velocity of the vehicle chassis and the rotational peripheral velocity of the tire treads, expressed when tire grip limits are breached.

---

## 3. Pre-Requisite Concepts
### Normal Force and Weight Distribution
The normal force ($F_N$) acting on a vehicle's axles is a direct manifestation of its static mass ($M_{\text{total}}$) combined with gravitational acceleration ($g$). Under static, leveled conditions on a standard vehicle chassis, this mass is distributed evenly ($50\% / 50\%$) between the front and rear axles. Adding physical cargo or occupants shifts the absolute values of these normal forces based on their geometric location relative to the axles.

### Coulomb's Friction Law in Vehicles
The ultimate tractive capacity (or grip limit) of a tire tread on a road surface is governed primarily by Coulomb's law of dry friction:

$$F_{\text{friction, max}} = \mu \cdot F_N$$

If the tractive force applied by an electric motor exceeds this maximum threshold ($F_{\text{tractive}} > F_{\text{friction, max}}$), the tire breaks static cohesion with the surface, entering a kinetic friction state known as **wheel slip** (or burnout), which heavily degrades directional stability and efficiency.

---

## 4. Advanced Concepts Applied in This Simulation
### Dynamic Longitudinal Weight Transfer
When a dual-motor electric vehicle accelerates forward, the forward tractive forces act at the tire-road contact patches, while the inertia of the vehicle mass acts through its Center of Gravity (CG). This mismatch creates a longitudinal pitch moment that dynamically shifts weight from the front axle to the rear axle. 


In this lab simulation, this phenomenon is modeled mathematically where high total power demands directly diminish the front axle normal load while complementing the rear axle load. 

### Saturated Axle Optimization (Autonomous Mode)
In classic traction control systems, power is cut entirely when a slip is detected. Advanced autonomous energy management systems, however, employ proactive mathematical constraints. When one axle reaches its saturation limit, the system calculates the peak safe threshold for that axle, locks its power output at that limit, and seamlessly redirects the remaining driver power demand to the unsaturated axle—maximizing performance without inducing wheel spin.

---

## 5. Governing Governing Physical Equations

### Equation 1: Total Power Demand Allocation
$$P_{\text{total}} = P_1 + P_2$$
* **Explanation:** The absolute power request is a sum of the target inputs assigned to the front motor ($P_1$) and rear motor ($P_2$). In manual mode, this is directly user-driven; in autonomous mode, the allocation shifts dynamically while keeping the sum uniform.

### Equation 2: Dynamic Axle Load Allocation
The dynamic front weight fraction ($f_{\text{front}}$) is calculated by capturing the deceleration/thrust pitch effect using a calibrated weight transfer coefficient 

($k_{\text{transfer}} = 0.001 \text{ kW}^{-1}$):
$$f_{\text{front}} = \max\left(0.25, \min\left(0.5, 0.5 - (k_{\text{transfer}} \cdot P_{\text{total}})\right)\right)$$

$$M_{\text{front}} = M_{\text{total}} \cdot f_{\text{front}}$$

$$M_{\text{rear}} = M_{\text{total}} \cdot (1.0 - f_{\text{front}})$$
* **Explanation:** This formula calculates the dynamic shifting of mass (in kg) between axles under load. The model enforces a hard constraint keeping the front weight ratio bounded strictly between $25\%$ and $50\%$.

### Equation 3: Axle Grip Tractive Capacity Limits
$$P_{\text{limit, f}} = M_{\text{front}} \cdot \mu \cdot C_{\text{scale}}$$
$$P_{\text{limit, r}} = M_{\text{rear}} \cdot \mu \cdot C_{\text{scale}}$$
* **Explanation:** Defines the maximum power (in kW) each motor can safely deliver before breaking traction. It incorporates $C_{\text{scale}} = 0.15$, which serves as the force-to-power calibration factor mapping the dynamic normal force into electrical power thresholds.
