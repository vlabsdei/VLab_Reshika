### Theory

#### 1. Lateral Load Transfer Mechanics
During cornering maneuvers, lateral acceleration ($a_y$) causes vertical load transfer between inner and outer tires:

$$\Delta F_z = \frac{m \cdot a_y \cdot h}{d_{\text{track}}}$$
$$F_{z, \text{inner}} = F_{z, 0} - \Delta F_z$$
$$F_{z, \text{outer}} = F_{z, 0} + \Delta F_z$$

#### 2. Tire Traction Limit Ceiling
$$F_{\text{limit}} = \mu \cdot F_z$$

#### 3. Intelligent Torque Vectoring Control
When $F_{\text{demand}} > F_{\text{limit}}$ on the inner wheel, the torque vectoring controller reduces inner motor torque and transfers drive torque to the outer wheel:

$$T_{\text{outer}} = T_{\text{base}} + \Delta T_{\text{vector}}$$
$$T_{\text{inner}} = T_{\text{base}} - \Delta T_{\text{vector}}$$
