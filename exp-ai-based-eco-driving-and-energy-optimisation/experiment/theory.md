## **1. Electric Vehicle Tractive Environment** 

- The vehicle powertrain serves as the primary mechanical driver of an electric vehicle, overcoming a combined matrix of environmental resistances to maintain target speed velocities. 

- During acceleration and constant velocity cruise cycles, the motor draws electrical energy from the battery pack to match physical torque requirements. 

- To ensure realistic range estimates, EV design loops factor in real-world payload variances, driving profile behaviors, and shifting road terrain topologies. 

- Failure to accurately model resistive tractive loads directly skews state-of-charge integration values, making environment calculations a critical branch of EV telemetry logic. 

## **2. Basic Terminologies** 

## **a. Tractive Force (** _**F**_ total **)** 

- The absolute net force vector required to propel the electric vehicle onward against combined external air, ground, and slope resistances. 

## **b. Aerodynamic Drag (** _**F**_ drag **)** 

- The resistive force acting opposite to the vehicle's vector of travel caused by atmospheric air molecules displacing across the frontal area surface layout. 

## **c. Rolling Friction (** _**F**_ rolling **)** 

- The continuous mechanical force resisting tire rotation over the road bed pavement, driven by minor mechanical wheel deformation during motion cycles. 

## **d. Dynamic Telemetry Integration** 

- The live integration of real-time power metrics over a fixed test period to map cumulative energy outputs against real-world payload scenarios. 

## **3. Governing Kinematic and Tractive Equations** 

## **A. Aerodynamic Drag Force** 

When the vehicle body displaces atmospheric air, the frontal profile forces a continuous fluid resistance opposing structural momentum. 

We calculate that resistance using: 

## 𝑭𝒅𝒓𝒂𝒈 =  𝟎. 𝟓 ×  𝝆 × 𝑪𝒅 ×  𝑨 × 𝒗[𝟐] 

Where: 

_F_ drag = Aerodynamic drag force (N) 

_ρ_ = Density of ambient air (1.225 kg/m[3] ) 

_C_ d = Dynamic drag coefficient (0.24) 

_A_ = Frontal area boundary layout (2.2 m[2] ) 

_v_ = Forward speed velocity converted to metrics (m/s) 

## **B. Rolling Friction Resistance** 

The load mass distributed across the rolling wheel surfaces experiences tire tread deformation against the underlying pavement surface mesh. 

If the slope scales up or down, the localized vertical force change is mapped via standard cosine normal values: 

## 𝑭𝒓𝒐𝒍𝒍𝒊𝒏𝒈 =  𝝁× 𝒎× 𝒈×  𝒄𝒐𝒔(𝜽) 

Where: 

_F_ rolling = Rolling resistance force (N) 

_μ_ = Friction coefficient (0.012) 

_m_ = Combined system mass including riders (kg) 

_g_ = Standard acceleration of gravity (9.81 m/s[2] ) 

_θ_ = Localized incline path angle degrees (°) 

## **C. Gravitational Grade Resistance** 

The structural weight vector pulling down along an inclined or declined grade changes based on the angle profile of the road bed. 

The longitudinal gravity vector slice relies completely on directional sine slopes: 

## 𝑭𝒈𝒓𝒂𝒗𝒊𝒕𝒚 =  𝒎 ×  𝒈 ×  𝒔𝒊𝒏(𝜽) 

Where: 

_F_ gravity = Gravitational force component (N) 

_m_ = Total vehicle simulation weight payload (kg) 

_g_ = Standard acceleration of gravity (9.81 m/s[2] ) 

_θ_ = Spatial slope angle parameter values (°) 

