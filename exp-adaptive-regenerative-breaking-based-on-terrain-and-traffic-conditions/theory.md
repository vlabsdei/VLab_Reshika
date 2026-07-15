## 1. Objective
Analyze regenerative braking energy recovery efficiency, battery State of Charge ($\Delta\text{SOC}$) gains, and vehicle deceleration stability under dynamically varying environment parameters, including initial velocities, road grading profiles, and specialized surface traction coefficients.

---

## 2. Basic Terminologies
* **Regenerative Braking:** An energy recovery mechanism that slows a vehicle by converting its kinetic energy into electrical energy, which can be stored immediately or used right away.
* **Motor-Generator Unit (MGU):** The electric machine acting as a motor to propel the vehicle, or a generator during coasting/braking to convert torque into electric current.
* **Brake Blending:** The algorithmic coordination of friction braking (traditional pads/discs) and regenerative braking to achieve the driver's requested deceleration safely.
* **State of Charge (SOC):** The equivalent of a fuel gauge for the battery pack in an electric vehicle, expressed as a percentage ($0\%$ to $100\%$).
* **Traction Coefficient ($\mu$):** A dimensionless ratio representing the friction force between two surfaces relative to the normal force pressing them together.

---

## 3. Pre-requisite Concepts

### Translational Kinetic Energy
Any moving object possesses kinetic energy ($KE$) directly proportional to its mass and the square of its velocity. In the context of an Electric Vehicle (EV), this energy represents the total theoretical pool available for recovery. When the vehicle brakes, this energy must either be dissipated as waste thermal energy through friction or recaptured through the drivetrain.

### Road Grade Mechanics
When a vehicle travels along a non-level plane, gravity ($g$) splits into two distinct force vectors relative to the inclined road surface:
1.  **Normal Load ($F_n$):** The perpendicular component pushing the tires against the asphalt. On steep slopes, this force drops, thereby lowering total maximum tire grip.
2.  **Parallel Gradient Force ($F_g$):** The component acting parallel to the road. Uphill slopes introduce a resistive drag force that assists braking, while downhill slopes generate a propulsive runaway force that opposes braking efforts.

---

## 4. Advanced System Concepts

### The Traction Limit & Wheel Lockup
The maximum possible braking force a road surface can support before a tire loses static friction is known as the traction limit ($F_{\max}$). If the driver demands a braking force ($F_b$) that exceeds $F_{\max}$, the wheel slips or locks completely. In an EV, this triggers a strict ABS/stability blend penalty because slipping tires cannot efficiently transfer kinetic torque back to the MGU.

### Regenerative Allocation Bounds
An MGU has strict physical, thermal, and electrical limits. Even if a driver stomps on the brakes with $2000\text{ N}$ of force, a specific MGU may only be rated to harvest up to a certain maximum threshold (e.g., $1200\text{ N}$). Any force requested beyond this boundary is handled exclusively by mechanical friction brakes, which generate zero electrical return.

### Traffic Density Modulation
Real-world urban environments degrade ideal energy harvesting metrics. Continuous, steady deceleration profiles yield optimal conversions. In contrast, heavy congestion or stop-and-go profiles force high-frequency cycling and harsh transitions, introducing electrical conversion losses inside the motor controllers and battery chemistry.

---

## 5. Governing Formulas and Mathematical Modeling

### Initial Kinetic Energy ($KE$)
$$KE = \frac{1}{2} m v^2$$
* **Where:** $m = 1500\text{ kg}$ (Constant vehicle baseline mass), and $v$ is velocity in $\text{m/s}$ ($\text{km/h} \div 3.6$).
* **Application:** Establishes the definitive maximum energy boundary entering the experimental trial.

### Normal Force ($F_n$) & Grade Incline Force ($F_g$)
$$F_n = m \cdot g \cdot \cos(\theta)$$
$$F_g = m \cdot g \cdot \sin(\theta)$$
* **Where:** $g = 9.81\text{ m/s}^2$ and $\theta$ is the road slope angle in radians.
* **Application:** Used to continuously evaluate changing grip limits and down-slope acceleration vectors.

### Maximum Available Traction Force ($F_{\max}$)
$$F_{\max} = \mu \cdot F_n$$
* **Where:** $\mu$ is dictated by surface types ($\text{Dry} = 0.85$, $\text{Wet} = 0.40$, $\text{Ice} = 0.10$).
* **Application:** Acts as the threshold condition where if $F_b > F_{\max}$, the vehicle enters `Traction Loss` status.

### Total System Deceleration ($a$)
$$a = \frac{F_b + F_g}{m}$$
* **Application:** Computes the dynamic stopping rate. If $a \le 0$, a downhill runaway state is triggered.

### System Harvesting Efficiency ($\eta$)
$$\eta = (\eta_{\text{base}} + [\theta^{\circ} \cdot -0.008] - \text{Penalty}_{\text{slip}}) \cdot \text{Multiplier}_{\text{traffic}}$$
* **Where:** $\eta_{\text{base}} = 0.82$, $\text{Penalty}_{\text{slip}} = 0.45$ (if slipping), and traffic multipliers range from $1.0$ down to $0.65$.
* **Application:** Computes the true physical conversion factor for system recovery.

### Energy Recovered ($E_{\text{recovered}}$) & Battery State Gain ($\Delta\text{SOC}$)
$$E_{\text{recovered}} = KE \cdot \eta$$
$$\Delta\text{SOC} = \left(\frac{E_{\text{recovered}}}{E_{\text{battery}}}\right) \cdot 100$$
* **Where:** $E_{\text{battery}} = 216,000,000\text{ J}$ ($60\text{ kWh}$).
* **Application:** Derives the cumulative environmental return value output to the telemetry array.
