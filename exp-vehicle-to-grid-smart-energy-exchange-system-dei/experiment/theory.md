### Theory

#### 1. Bidirectional Power Transfer
Vehicle-to-Grid (V2G) enables bidirectional electrical energy exchange between EV batteries and the utility grid:

$$P_{\text{grid}} = V_{\text{AC}} \cdot I_{\text{AC}} \cdot \cos(\phi)$$

#### 2. Inverter Efficiency Model
$$\eta_{\text{inverter}} = \frac{P_{\text{AC}}}{P_{\text{DC}}} \cdot 100\%$$

#### 3. BMS Low-SOC Override Safety Threshold
When State of Charge ($\text{SOC}$) drops to $\le 50\%$, V2G discharge mode is automatically disengaged to preserve vehicle mobility:

$$\text{Mode} = \begin{cases} \text{V2G (Discharge)} & \text{SOC} > 50\% \\ \text{G2V (Charge)} & \text{SOC} \le 50\% \end{cases}$$
