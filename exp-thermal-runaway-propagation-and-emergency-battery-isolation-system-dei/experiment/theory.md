### Theory

#### 1. Thermal Runaway Kinetics
Thermal runaway in lithium-ion cells occurs when heat generation rate ($Q_{\text{gen}}$) exceeds heat dissipation rate ($Q_{\text{diss}}$):

$$Q_{\text{gen}} = m \cdot C_p \cdot \frac{dT}{dt} + Q_{\text{reaction}}$$

#### 2. Heat Propagation to Neighboring Cells
$$Q_{\text{prop}} = \frac{k \cdot A}{d} (T_{\text{faulty}} - T_{\text{neighbor}})$$

#### 3. Emergency Battery Isolation System (EBIS)
EBIS triggers pyrotechnic or solid-state relays to isolate faulty modules within milliseconds ($\tau_{\text{iso}}$):

$$\Delta N_{\text{affected}} \propto \tau_{\text{iso}} \cdot \exp(T / T_{\text{crit}})$$
