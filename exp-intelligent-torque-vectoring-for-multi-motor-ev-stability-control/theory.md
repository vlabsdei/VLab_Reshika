# Experiment 5: Intelligent Torque Vectoring Proving Ground

## 1. Objective
To study and evaluate the dynamic effects of torque distribution control strategies on electric vehicle (EV) stability, traction limits, and lateral load transfer across independent wheel configurations during severe cornering conditions.

## 2. Prerequisites & Core Concepts
Before conducting this experiment, the following fundamental engineering domains should be understood:
* **Vehicle Dynamics:** Comprehension of kinematic models, slip angle physics, and chassis roll oscillations.
* **Tire Mechanics:** Mastery of Coulomb's friction law and the friction ellipse boundary concept.
* **Electric Powertrains:** Familiarity with independent in-wheel or dual-motor drivetrain topologies that enable individualized torque wheel control.

## 3. Basic Terminologies
* **Torque Vectoring (TV):** An electronic chassis control strategy that dynamically varies the power/torque delivered to individual wheels to actively influence vehicle yaw and trajectory.
* **Lateral Load Transfer ($\Delta F_z$):** The mechanical displacement of vertical load from the inside wheels to the outside wheels during a cornering maneuver, caused by centrifugal force acting on the vehicle center of gravity.
* **Traction Limit Ceiling ($F_{	ext{limit}}$):** The maximum tractive force that a tire patch can sustain before breaking static friction and sliding.
* **Force Demand ($F_{	ext{demand}}$):** The actual longitudinal force applied to the tire patch by the electric motor's powertrain output, scaled by steering adjustments.
* **Rigid 50:50 Power Split:** A non-vectoring drivetrain configuration where torque is distributed equally to both rear wheels, regardless of dynamic steering input or uneven wheel load conditions.

## 4. Governing Mathematical Formulas

### 4.1 Lateral Load Transfer
$$\Delta F_z = F_{z,	ext{nom}} 	imes 0.5 	imes \left(rac{|	heta|}{	heta_{	ext{max}}}ight)$$
* **Where:**
    * $\Delta F_z$: Lateral Load Transfer magnitude [N]
    * $F_{z,	ext{nom}}$: Nominal static vertical tire load ($1200	ext{ N}$)
    * $|	heta|$: Absolute steering input angle [deg]
    * $	heta_{	ext{max}}$: Maximum design reference steering angle ($45^\circ$)

### 4.2 Dynamic Vertical Tire Load
$$F_{z,	ext{outer}} = F_{z,	ext{nom}} + \Delta F_z$$
$$F_{z,	ext{inner}} = F_{z,	ext{nom}} - \Delta F_z$$
* **Where:**
    * $F_{z,	ext{outer}}$: Dynamic vertical weight applied on the outer wheel during turn [N]
    * $F_{z,	ext{inner}}$: Dynamic vertical weight applied on the inner wheel during turn [N]

### 4.3 Traction Limit Ceiling
$$F_{	ext{limit}} = \mu 	imes F_z$$
* **Where:**
    * $F_{	ext{limit}}$: Friction-limited grip capacity [N]
    * $\mu$: Surface friction coefficient (dimensionless, range: $0.20 - 1.00$)
    * $F_z$: Instantaneous vertical tire load ($F_{z,	ext{outer}}$ or $F_{z,	ext{inner}}$) [N]

### 4.4 Longitudinal Tire Force Demand
$$F_{	ext{demand}} = \left(rac{	ext{Torque}}{r}ight) 	imes f_{	ext{steer}}$$
$$f_{	ext{steer}} = 1 + |	heta| 	imes 0.02$$
* **Where:**
    * $F_{	ext{demand}}$: Tractive force demand vector [N]
    * $	ext{Torque}$: Instantaneous wheel motor torque [Nm]
    * $r$: Effective tire rolling radius ($0.3	ext{ m}$)
    * $f_{	ext{steer}}$: Empirical steering penalty correction scaling factor

## 5. Stability & Grip Threshold Criteria
A wheel state transitions from stable rolling to a slip-out phenomenon based on the inequality boundary condition:
$$	ext{State} = egin{cases} 	ext{STABLE}, & 	ext{if } F_{	ext{demand}} \le F_{	ext{limit}} \ 	ext{SLIPPING}, & 	ext{if } F_{	ext{demand}} > F_{	ext{limit}} \end{cases}$$

When Intelligent Torque Vectoring is enabled and $F_{	ext{demand}} > F_{	ext{limit}}$, the system active controller steps down individual inner/outer wheel power output to adhere to the friction ceiling restriction, restoring optimal directional track stability.
