### Theory

#### 1. Powertrain Mechanical Output Power
$$P_{\text{out}} = \frac{\tau \cdot N \cdot 2\pi}{60000} \quad [\text{kW}]$$

#### 2. Loss Breakdown & Thermal Creep
$$P_{\text{loss}} = P_{\text{baseline}} + P_{\text{thermal}} + P_{\text{drag}} + P_{\text{emi}}$$

Where thermal loss accelerates above critical temperature boundaries:

$$P_{\text{thermal}} = \begin{cases} 0 & T \le 95^\circ\text{C} \\ 0.4 \cdot (T - 95) & T > 95^\circ\text{C} \end{cases}$$

#### 3. Core Efficiency
$$\eta = \frac{P_{\text{out}}}{P_{\text{out}} + P_{\text{loss}}} \cdot 100\%$$
