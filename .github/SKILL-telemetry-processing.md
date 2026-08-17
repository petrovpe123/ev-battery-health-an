# Skill: Automotive Telemetry Data Processing & CSV Pipeline

**Domain**: Automotive Telemetry Data Parsing, Validation, and Time-Series Transformation

**Expertise Level**: Advanced Data Engineering for Time-Series IoT Streams

**When to Use This Skill**
- Robust CSV parsing with intelligent column mapping and type inference
- Handling malformed, incomplete, or inconsistent telemetry records
- Time-series data interpolation and gap-filling strategies
- Timezone handling and timestamp normalization
- Outlier detection and smart filtering without data loss
- Batch processing of large telemetry files (>100K rows)
- Implementing data quality metrics and validation reports
- Creating derived columns from raw telemetry (e.g., rate of change, aggregates)
- Handling multiple CSV schema variations from different data sources
- Efficient memory management for streaming processing

---

## CSV Format Detection & Flexible Parsing

### Header Detection Algorithm
```typescript
// Fuzzy column matching with tolerance for variations
const columnAliases = {
  timestamp: ['time', 'datetime', 'date', 'ts', 'timestamp_iso', 'log_time'],
  voltage: ['v', 'vbat', 'battery_voltage', 'volt', 'bus_voltage'],
  temperature: ['temp', 't', 'batt_temp', 'celsius', 'tempC']
};

// Scoring mechanism:
// - Exact match: 100 points
// - Substring match: 50 points
// - Fuzzy match (Levenshtein distance < 2): 25 points
// Return highest-scored match
```

### Type Inference & Casting
- **Numeric Types**: Detect integer vs. float; handle scientific notation (1.23e-4)
- **Temporal Types**: Parse ISO8601, Unix timestamps, locale-specific formats; detect timezone info
- **String Handling**: Trim whitespace; detect quoted CSV fields with embedded delimiters
- **Missing Values**: Recognize 'null', 'N/A', '', '-' as valid null markers; preserve position for interpolation
- **Delimiter Detection**: Auto-detect comma, semicolon, tab, pipe based on first row analysis

### Encoding & Byte-Order Detection
- UTF-8 BOM handling (EF BB BF prefix)
- Latin-1 vs. UTF-8 fallback detection
- Newline normalization (CRLF/LF consistency)

---

## Data Quality & Validation Pipeline

### Pre-Processing Validation

```typescript
interface ValidationReport {
  totalRows: number;
  validRows: number;
  droppedRows: number;
  warnings: ValidationWarning[];
  qualityScore: number; // 0-100
  
  stats: {
    nullPercentage: Record<string, number>;
    outlierPercentage: Record<string, number>;
    timeGapRanges: TimeGap[];
    timestampMonotonicity: boolean;
  };
}

// Quality Score Calculation
qualityScore = (
  (validRows / totalRows) * 0.4 +  // Record retention
  (1 - avgNullRate) * 0.25 +        // Completeness
  (1 - avgOutlierRate) * 0.25 +     // Outlier impact
  monotonicity_score * 0.1           // Temporal ordering
) * 100
```

### Outlier Detection Strategies

**Statistical Methods**
- **Z-Score**: Flag |Z| > 3 as potential outliers; tunable threshold for domain-specific sensitivity
- **IQR (Interquartile Range)**: Detect points beyond 1.5 × IQR; robust to skewed distributions
- **Modified Z-Score (MAD)**: Use median absolute deviation; better for non-normal data
- **Rolling Window**: Apply local outlier factor (LOF) over sliding windows to catch contextual anomalies

**Domain-Specific Methods**
- **Rate-of-Change Thresholding**: Voltage delta > 2V in 5 seconds; temperature delta > 5°C in 10 seconds
- **Physical Impossibility Checks**: Negative voltage, temperature > 100°C (unless explicitly traction pack data)
- **Clustering Detection**: Identify sudden isolated clusters different from baseline

**Handling Strategy**
```typescript
enum OutlierAction {
  DROP,           // Remove row entirely
  INTERPOLATE,    // Linear or spline interpolation using neighbors
  PRESERVE,       // Flag with metadata but include in output
  WINSORIZE       // Cap at ±3σ from mean
}
```

### Gap-Filling & Interpolation

**Time-Series Gap Detection**
- Analyze timestamp differences; identify expected interval (e.g., 1Hz = 1s delta)
- Flag gaps > 2× expected interval as suspicious
- Quantify: "5% of data has gaps > 10 seconds"

**Interpolation Methods**
- **Linear**: Simple, preserves monotonicity; appropriate for steady-state
- **Cubic Spline**: Smooth transitions; better for physical phenomena like temperature
- **Forward-Fill**: Repeat last value; appropriate for step-change data (state changes)
- **Time-Weighted Average**: For data with varying timestamps, weight by proximity
- **Gaussian Process**: For small gaps with high uncertainty quantification

```typescript
// Adaptive interpolation selection
function selectInterpolationMethod(
  gap_duration_ms: number,
  data_variance: number,
  signal_type: 'voltage' | 'temperature'
): InterpolationMethod {
  if (gap_duration_ms > 60000) return 'forward_fill';  // >60s gaps: likely sensor dropout
  if (signal_type === 'temperature' && data_variance < 0.5) return 'cubic_spline';
  if (data_variance > 5.0) return 'forward_fill';  // High variance: risky to interpolate
  return 'linear';
}
```

---

## Derived Feature Engineering

### Calculated Columns

**Rate-of-Change (dX/dt)**
```typescript
// Central difference for internal points; forward/backward for edges
const dV_dt = (voltage[i+1] - voltage[i-1]) / (2 * time_delta);

// Smooth with moving average to reduce noise
const dV_dt_smooth = rollingAverage(dV_dt, window=5);
```

**Cumulative Metrics**
- Time integral of voltage (V·s); detect low-voltage cumulative stress
- Temperature-time product (°C·s); thermal degradation correlate
- Duty cycle: fraction of time above threshold

**Aggregations**
- Hourly/daily averages and max/min
- Rolling statistics (moving average, moving median over 5-minute windows)
- Percentile calculations (P5, P25, P50, P75, P95)

### Volatility & Stability Indices

```typescript
// Voltage Stability Index (VSI): 0-100, higher = more stable
VSI = (1 - (std_dev(voltage) / mean(voltage))) * 100;

// Temperature Volatility: 0-100
TempVolatility = 100 * (1 - exp(-std_dev(temperature) / range(temperature)));

// Signal Quality Index: combines multiple factors
SignalQuality = (
  completeness * 0.3 +
  outlier_resistance * 0.3 +
  temporal_continuity * 0.2 +
  dynamic_range_utilization * 0.2
) * 100;
```

---

## Memory-Efficient Processing for Large Files

**Streaming vs. Batch Tradeoffs**
- **<1MB**: Full in-memory parsing
- **1-50MB**: Row-streaming with aggregation accumulation
- **>50MB**: Chunk-based processing; calculate stats incrementally

**Implementation**
```typescript
// Row-by-row streaming processor
function* processLargeTelemetry(fileStream: ReadableStream, chunkSize = 1000) {
  let buffer: BatteryReading[] = [];
  let runningStats = initializeStats();
  
  for await (const line of fileStream) {
    const reading = parseRow(line);
    buffer.push(reading);
    updateStats(runningStats, reading);
    
    if (buffer.length >= chunkSize) {
      yield { readings: buffer, stats: runningStats };
      buffer = [];
    }
  }
  yield { readings: buffer, stats: runningStats }; // Final chunk
}
```

**Memory Pooling**
- Reuse typed arrays (Float32Array for voltage, temperature)
- Avoid string concatenation during parsing; use string pooling
- Implement WeakMap for internal metadata to allow garbage collection

---

## Schema Evolution & Compatibility

**Versioning Strategy**
```typescript
interface CSVSchema {
  version: '1.0' | '2.0' | '3.0';
  requiredColumns: string[];
  optionalColumns?: string[];
  transformations?: {
    from: string;
    to: string;
    rule: (val: any) => any;
  }[];
}

// Example: Schema 2.0 adds optional 'current' column
// Backward compatibility: ignore current if not present
```

**Migration Paths**
- Voltage V1 (0-255 scale) → V2 (0-16V): multiply by 16/255
- Temperature Fahrenheit → Celsius: (F - 32) × 5/9
- Unix timestamp milliseconds → seconds: divide by 1000

---

## Error Reporting & Recovery

**Detailed Error Context**
```typescript
interface ParsingError {
  rowNumber: number;
  rawLine: string;
  errorType: 'encoding' | 'type_mismatch' | 'validation_fail' | 'format';
  detail: string;
  suggestion: string; // "Consider treating as missing value"
  recoveryAction: OutlierAction;
}
```

**Resilience Modes**
- **Strict**: Any error halts processing; useful for data validation
- **Permissive**: Skip invalid rows with warning log; optimizes completion
- **Interactive**: Pause on errors, allow user to decide per-error handling

---

## Performance Optimization Tactics

| Technique | Application | Speedup |
|-----------|-------------|---------|
| Typed Arrays | Temperature/voltage storage | 2-3× |
| Lazy Parsing | Defer type conversion until needed | 1.5× |
| Index Caching | Pre-compute column indices | 1.2× |
| Parallel Validation | Split file into chunks, process in workers | 4× (4-core) |
| Incremental Stats | Running mean/variance, avoid re-scanning | 5× |

---

## Validation Report Structure

```typescript
interface ComprehensiveValidationReport {
  fileMetadata: {
    fileName: string;
    fileSize: number;
    encoding: string;
    lineEnding: 'CRLF' | 'LF';
  };
  
  parsingStats: {
    totalLines: number;
    headerLine: number;
    dataLines: number;
    validRows: number;
    droppedRows: number;
    qualityScore: number; // 0-100
  };
  
  columnAnalysis: Record<string, {
    detected: boolean;
    fuzzyMatch: string | null;
    dataType: 'number' | 'string' | 'datetime';
    nullCount: number;
    uniqueValues: number;
    range: { min: any; max: any };
  }>;
  
  dataQualityIssues: ValidationWarning[];
  
  recommendations: string[];
  
  proceeedWithAnalysis: boolean; // Safe to proceed to LLM analysis?
}
```

---

## Integration with Battery Analysis Pipeline

- **Input**: Raw CSV → `parseCSV()` → `BatteryReading[]`
- **Quality Gate**: Run `generateValidationReport()` before proceeding
- **Derived Features**: Compute `dV/dt`, thermal indices via `calculateDerivedFeatures()`
- **Output**: Clean dataset → `generateAIAnalysis()` with enhanced context

