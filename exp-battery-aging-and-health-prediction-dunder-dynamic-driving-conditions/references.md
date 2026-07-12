## References

### 1. Core Textbook Reference

* **Title:** Battery Management Systems, Volume I: Battery Modeling
* **Author(s):** Gregory L. Plett
* **Publisher / Year:** Artech House, 2015
* **Relevance to Experiment:** This textbook serves as the foundational text for developing equivalent circuit models (ECMs) and understanding capacity fade mechanisms. Chapter 5 specifically outlines parameter estimation techniques for internal resistance expansion ($R_{\text{int}}$) and details the electrochemical degradation math underlying the State of Health (SoH) metrics tracking used directly inside the simulation environment.

---

### 2. Primary Research Papers

#### Reference Paper 1: Thermal Degradation & Arrhenius Kinetics
* **Title:** Review of degradation mechanisms and aging models for lithium-ion batteries in electric vehicles
* **Journal / Year:** Journal of Power Sources, 2016
* **Key Insight utilized in Lab:** This paper provides the empirical validation for the Arrhenius-based accelerated degradation multiplier used to model the solid electrolyte interphase (SEI) growth factor ($e^{0.06 \times (T - 25)}$). It details the non-linear coupling between high structural operating environments ($>45^\circ\text{C}$), dynamic driving cycle discharge limits ($L$), and rapid state capacity fade trajectories.

#### Reference Paper 2: C-Rate Stress & Micro-Cracking Telemetry
* **Title:** Capacity fade analysis of lithium-ion batteries under fast charging protocols and dynamic electric vehicle driving profiles
* **Journal / Year:** IEEE Transactions on Transportation Electrification, 2021
* **Key Insight utilized in Lab:** This study provides the experimental framework mapping fast charging rates (up to 3C profiles) to structural active mechanical particle volume expansions. The data gathered inside this research validates the simulation’s mathematical scaling of internal resistances, volumetric dynamic heat flux calculations ($Q_{\text{flux}}$), and subsequent core thermal runaway risk percentages.
