### Theory

#### 1. Battery Degradation Kinetics
Lithium-ion battery degradation is governed by temperature-dependent Arrhenius kinetics:

$$k_{\text{aging}} = A \cdot \exp\left(-\frac{E_a}{R T}\right)$$

#### 2. Capacity Fade and Resistance Growth
$$\text{SOH}(t) = 100\% - \Delta C_{\text{fade}}(t)$$
$$R_{\text{int}}(t) = R_0 \cdot (1 + \beta \cdot \Delta C_{\text{fade}})$$

#### 3. Thermal Generation (Joule Heating)
$$Q_{\text{gen}} = I^2 R_{\text{int}} + I T \frac{\partial OCV}{\partial T}$$
