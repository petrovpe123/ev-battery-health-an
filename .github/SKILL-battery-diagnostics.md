# Skill: EV Battery Diagnostics & Health Assessment

**Domain**: Electric Vehicle Battery Health Assessment, Predictive Diagnostics, and Fault Detection

**Expertise Level**: Advanced Domain Knowledge for EV Battery Engineering

**When to Use This Skill**
- Analyzing battery voltage degradation patterns and capacity fade
- Detecting anomalous temperature behavior and thermal management issues
- Generating health scores with statistical confidence intervals
- Implementing predictive SOH (State of Health) estimation algorithms
- Identifying cycle count degradation and accelerated aging patterns
- Correlating voltage ripple with internal resistance changes
- Detecting lithium plating and voltage clipping events
- Implementing thermistor fault detection and sensor validation
- Generating actionable maintenance recommendations based on telemetry
- Creating multi-dimensional health scoring models

---

## Core Battery Health Indicators

### Voltage Stability Metrics
- **Nominal Range**: 10-14V for typical 12V battery systems (EV auxiliary), 350-450V for traction packs
- **Voltage Drift Analysis**: Monitor millivolt-per-hour degradation trends
- **Transient Response**: Peak voltage spike behavior under load changes
- **Ripple Frequency Analysis**: High-frequency noise (50-500Hz) indicates switching ripple; harmonic analysis reveals power converter issues
- **Voltage Variance Coefficient**: Calculate CV = StdDev/Mean; CV > 0.05 signals instability

### Temperature Characteristics
- **Optimal Operating Range**: 15-25°C for lithium-ion chemistry
- **Critical Thresholds**: 
  - Below 0°C: Reduced ion mobility, internal resistance surge (30-50% increase)
  - Above 40°C: Accelerated side reactions, cathode dissolution
  - Above 60°C: Thermal runaway risk, separator melting
- **Temperature Gradient**: Spatial variance across cells; >5°C delta indicates poor thermal management
- **Thermal Response Time**: How quickly battery reaches equilibrium after load change

### Derived Diagnostics
- **C-Rate Estimation**: Peak current pulse analysis combined with voltage drop to estimate state of charge
- **Internal Resistance (Ri)**: Calculate from voltage response to current step via Ri = ΔV/ΔI
- **Power Loss**: P_loss = I²·Ri reveals thermal generation rate
- **Impedance Spectroscopy Simulation**: Approximate EIS via frequency response of voltage/current data
- **Coulombic Efficiency**: Track how voltage recovery correlates with discharge capacity

---

## Health Score Calculation Architecture

```typescript
// Multi-factor health score with weighted components
healthScore = (
  voltage_score * 0.35 +           // Voltage stability/nominal range
  thermal_score * 0.30 +            // Temperature management + gradient
  aging_score * 0.20 +              // Capacity fade, cycle count proxy
  anomaly_score * 0.15              // Fault detection flags
) * 100

// Voltage Score (0-1)
voltage_score = 
  continuity_factor * 0.4 +         // No dropouts or spikes > threshold
  stability_factor * 0.3 +          // Low variance
  nominal_adherence * 0.3           // % of time within ±2V nominal

// Thermal Score (0-1)
thermal_score = 
  (1 - abs(avg_temp - 20) / 30) *  // Distance from optimal 20°C
  (1 - temp_gradient / 10) *        // Penalize uneven distribution
  (1 - transient_overshoot / 15)    // Penalize thermal spikes

// Aging Score (0-1)
aging_score = 
  (1 - voltage_droop_rate) *        // Historical drift velocity
  (1 - elevated_temp_hours / total_hours) *  // Thermal stress accumulation
  (1 - fast_charge_ratio)            // Aggressive charging penalty

// Anomaly Score (0-1)
anomaly_score = max(0, 1 - anomaly_count / baseline_count)
```

---

## Advanced Diagnostic Patterns

### Voltage Clipping Detection
- Monitor for flat-top voltage profiles at peak charging (>400V, >60°C)
- Indicates battery management system (BMS) voltage limit being hit
- Correlate with temperature to assess thermal throttling vs. capacity loss
- Time-to-clipping analysis reveals age progression

### Thermal Runaway Precursor Detection
- Temperature acceleration: d²T/dt² > threshold (thermal runaway produces exponential rise)
- Combined with high SOC (>95%) and high ambient temp
- Implement exponential fit detection; compare actual vs. linear baseline

### Internal Resistance Trending
- Calculate Ri at uniform load intervals
- Track Ri growth rate (mΩ/cycle); typical aging: 5-15 mΩ/1000 cycles
- Compare against lookup tables for battery age/cycle count estimation
- High Ri + normal voltage = capacity degradation; low Ri + low voltage = cell failure

### Cycle Count Proxy Estimation
- Voltage fade rate correlates with cycles: SOH ≈ 1 - (cycle_count * fade_factor)
- Temperature-accelerated aging multiplier: effective_cycles = cycles * exp(Ea/R * (1/T_avg - 1/T_ref))
- Coulombic efficiency tracking for side-reaction quantification

---

## Fault Tree Mapping

```
Battery Fault
├── Voltage Issues
│   ├── Persistent Low Voltage
│   │   ├── Cell Open Circuit (voltage stable but low)
│   │   ├── High Internal Resistance (slow recovery)
│   │   └── Connection Corrosion (intermittent)
│   ├── Voltage Oscillation (ripple > 500mV, >100Hz)
│   │   └── Power Converter Failure
│   └── Voltage Clipping (flat-top charging curve)
│       ├── BMS Voltage Limit (if T > 40°C: thermal throttle)
│       └── Charger Fault
├── Thermal Issues
│   ├── Elevated Baseline Temp
│   │   ├── High Ambient
│   │   ├── Thermal Insulation Fault
│   │   └── High Charge Rate
│   ├── Thermal Gradient (>5°C spatial variance)
│   │   ├── Uneven Cell Balancing
│   │   ├── Internal Short (localized heat)
│   │   └── Coolant Flow Blockage
│   └── Rapid Temperature Rise (dT/dt > 2°C/min)
│       ├── Thermal Runaway Risk
│       ├── Extreme Discharge Current
│       └── Internal Short
└── Aging/Degradation
    ├── Voltage Droop (>50mV/month)
    │   ├── High Cycle Count (>3000)
    │   ├── Storage at Elevated Temp
    │   └── Frequent Deep Discharge
    └── Capacity Fade (>20% from nominal)
        ├── Calendar Aging (temperature, voltage, moisture)
        └── Cycle Aging (high C-rate, hot charging, deep DoD)
```

---

## Recommendation Engine Logic

**High Risk (Health Score < 40)**
- "Immediate inspection required. Battery may fail unexpectedly."
- "Check internal resistance (<30s pulse test recommended)."
- "Reduce load by 30% until serviced."

**Moderate Risk (40-70)**
- "Schedule maintenance within 30 days."
- "Monitor temperature gradient closely; ensure cooling system functional."
- "Avoid fast-charging; reduce C-rate by 50%."
- "Update BMS calibration if voltage reading unstable."

**Good Condition (70-85)**
- "Normal operation. Recommend quarterly health checks."
- "Consider soft-balancing if thermal gradient > 3°C."
- "Temperature management is key; maintain 15-25°C when possible."

**Excellent (>85)**
- "Battery performing within specification."
- "Continue standard maintenance cycle."

---

## Data Validation Thresholds

| Metric | Min | Max | Unit | Severity |
|--------|-----|-----|------|----------|
| Voltage | 8.0 | 16.0 | V | Warn >16V, Fail <6V |
| Temperature | -20 | 65 | °C | Warn >55°C, Fail >70°C |
| Voltage Slew Rate | N/A | 500 | mV/100ms | Warn if exceeded |
| Temp Slew Rate | N/A | 10 | °C/min | Warn if exceeded |
| Data Point Interval | 10 | 60 | sec | Warn if >300s gaps |
| Readings Required | 30 | N/A | count | Warn if <30 points |

---

## Battery Health Score Interpretation Guide

```typescript
interface HealthScoreInterpretation {
  score: number;
  condition: string;
  riskLevel: 'critical' | 'high' | 'moderate' | 'low';
  actionableRecommendations: string[];
  inspectionFrequency: string;
  usageRestrictions?: string[];
}

// Implementation reference
const interpretHealthScore = (score: number): HealthScoreInterpretation => {
  if (score < 30) {
    return {
      score,
      condition: 'Critical - Imminent Failure Risk',
      riskLevel: 'critical',
      actionableRecommendations: [
        'Do not operate. Immediate replacement required.',
        'Conduct emergency diagnostic to identify failure mode',
        'Replace battery before next use'
      ],
      inspectionFrequency: 'Immediately',
      usageRestrictions: ['No operation', 'No charging', 'Store safely']
    };
  }
  // ... additional ranges
};
```

---

## Key Terms & Abbreviations

| Term | Definition | Typical Value |
|------|-----------|----------------|
| **SOH** | State of Health (battery capacity vs. new) | 0-100% |
| **SOC** | State of Charge (current energy level) | 0-100% |
| **C-Rate** | Discharge rate relative to capacity | 0.5C-2C typical |
| **Ri** | Internal Resistance | 10-100 mΩ |
| **DoD** | Depth of Discharge per cycle | 10-80% typical |
| **Thermal Runaway** | Uncontrolled exothermic reaction | >60°C risk |
| **Voltage Clipping** | Flat-top charging curve | BMS throttle indicator |
| **Coulombic Efficiency** | Charge out / Charge in ratio | >99% healthy |
| **Cycle Count** | Charge-discharge cycles | Proxy for age |
| **Calendar Aging** | Time-based degradation | Independent of use |

---

## Integration with UI Components

- **BatteryCharts**: Reference health score color gradient (Red <40, Yellow 40-70, Green >70)
- **AnalysisPanel**: Display fault tree diagnosis with expandable detail nodes
- **AIAnalysis**: Seed LLM prompts with calculated Ri, cycle count proxy, thermal metrics
- **HealthTrend**: Track health score progression across multiple snapshots

