# Copilot Instructions: EV Battery Health Analyzer

**Last Updated**: 2026-08-17  
**Project**: EV Battery Health Telemetry Analysis Tool  
**Scope**: Advanced LLM integration, prompt engineering, and AI-assisted development workflows

---

## Overview & Purpose

This document guides **GitHub Copilot** (all modes: Chat, Inline, CLI) in understanding the EV Battery Health Analyzer project's specific needs for:
- **Code Generation**: Idiomatic React/TypeScript for battery analysis workflows
- **Prompt Engineering**: Optimizing LLM calls to generate accurate battery diagnostics
- **Debugging Assistance**: Troubleshooting CSV parsing, chart rendering, and AI integration failures
- **Architecture Discussion**: Advising on state management, performance, and reliability patterns
- **Testing Strategy**: Generating test cases for edge cases in data processing

---

## Project Identity & Constraints

### What This Project IS
✅ A **professional telemetry analysis tool** for EV battery health monitoring  
✅ Single-page React application with **client-side data processing** (no server required)  
✅ Integrates **AI/LLM capabilities** (Spark SDK) for intelligent diagnostics  
✅ Focuses on **data quality, visualization, and actionable insights**  
✅ Designed for **automotive engineers & technicians** (technical audience)  

### What This Project IS NOT
❌ A real-time monitoring system (batch CSV analysis only)  
❌ A backend service (client-side only; no database)  
❌ A production vehicle telemetry system (education/analysis focused)  
❌ A replacement for OEM diagnostic tools  
❌ A generic charting application (domain-specific battery analysis)  

### Key Non-Negotiable Principles
1. **Type Safety**: All data must flow through TypeScript interfaces; no `any` types
2. **Data Validation**: Every CSV parsed must be validated against domain constraints (8-16V, -20 to 65°C)
3. **Graceful Degradation**: If AI analysis fails, fall back to statistical summary
4. **User Transparency**: Show data quality metrics and validation warnings upfront
5. **Performance**: CSV parsing and chart rendering must remain responsive (<1s for 10K rows)

---

## Code Generation Guidelines

### When Copilot Should Generate Code

**DO generate code for:**
- React component boilerplate (`interface Props`, `useState`, `useEffect` structure)
- Type definitions and interfaces from data structures
- Utility functions for data transformation (filtering, aggregation, sorting)
- Test case scaffolds with example data
- CSS/Tailwind utility classes for responsive layouts
- Error handling try-catch blocks with specific domain error messages
- localStorage serialization/deserialization helpers
- Chart configuration (Recharts props, axis setup, tooltips)
- CSV validation logic (column detection, type checking)

**DO NOT generate code for:**
- LLM prompts (must be hand-crafted to ensure scientific accuracy)
- Battery health scoring algorithms (domain expertise required; ask for guidance)
- Complex state management (provide architecture first, then generate implementations)
- Async flow coordination (discuss error scenarios before generating)

### Generation Preferences

**Style Preferences**
```typescript
// ✅ PREFERRED: Explicit typing, clear variable names
const handleAnalysis = async (readings: BatteryReading[]): Promise<BatteryAnalysis> => {
  const stats = calculateBasicStats(readings);
  if (!stats) throw new Error('Insufficient data');
  
  try {
    const analysis = await generateAIAnalysis(readings);
    return analysis;
  } catch (error) {
    return generateFallbackAnalysis(stats);
  }
};

// ❌ AVOID: Implicit types, abbreviations, arrow functions for complex logic
const handleAnalysis = async (r) => {
  const s = calculateBasicStats(r);
  if (!s) throw 'bad data';
  return (await generateAIAnalysis(r)).catch(() => generateFallbackAnalysis(s));
};
```

**React Patterns**
```typescript
// ✅ PREFERRED: Named components, props interface, dependencies array
interface BatteryChartProps {
  readings: BatteryReading[];
  onLoadingChange?: (isLoading: boolean) => void;
}

export const BatteryCharts: React.FC<BatteryChartProps> = ({ readings, onLoadingChange }) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  useEffect(() => {
    if (readings.length === 0) return;
    const transformed = transformReadingsForChart(readings);
    setChartData(transformed);
  }, [readings]);

  return <ComposedChart data={chartData} />;
};

// ❌ AVOID: Anonymous functions, prop destructuring at root level
export default ({ r, onLoad }) => {
  const [c, setC] = useState([]);
  useEffect(() => setC(transformReadingsForChart(r)), [r]);
  return <ComposedChart data={c} />;
};
```

**Error Messages**
```typescript
// ✅ PREFERRED: Specific, actionable, domain-aware
throw new Error(
  `CSV validation failed: Missing required column 'voltage'. ` +
  `Expected columns: timestamp, voltage (V), temperature (°C)`
);

// ❌ AVOID: Generic, non-actionable
throw new Error('Invalid data');
```

---

## LLM Prompt & AI Integration Guidance

### Prompt Engineering Principles

**When requesting Copilot to help with LLM prompts:**

1. **Context is King**: Always include data stats, units, and expected ranges in prompts
2. **Explicit Format Specification**: Request JSON schema; provide examples
3. **Domain Grounding**: Reference typical EV battery operating parameters
4. **Confidence Boundaries**: Tell the LLM when to refuse analysis (e.g., insufficient data)
5. **Actionability**: Request specific recommendations, not generic advice

**Example Good Prompt Structure** (for Copilot reference)
```typescript
const batteryAnalysisPrompt = `
Role: You are an automotive battery diagnostics expert with 15+ years experience analyzing EV battery telemetry.

Context:
- Battery Type: Lithium-ion 12V (auxiliary) or 350-450V traction pack
- Data: ${stats.dataPoints} readings over ${stats.timeSpan}
- Voltage Range: ${stats.voltageRange.min.toFixed(2)}V - ${stats.voltageRange.max.toFixed(2)}V (nominal 10-14V for 12V battery)
- Temperature Range: ${stats.temperatureRange.min.toFixed(1)}°C - ${stats.temperatureRange.max.toFixed(1)}°C (optimal 15-25°C)
- Voltage Stability Index: ${calculateVSI(readings)}/100

Sample Data (first 5 readings):
${readings.slice(0, 5).map(r => \`\${r.timestamp}: \${r.voltage.toFixed(2)}V @ \${r.temperature.toFixed(1)}°C\`).join('\n')}

Task: Provide a brief technical health assessment and 3-5 specific recommendations.

Response Format (JSON):
{
  "healthScore": <0-100 integer>,
  "summary": "<2-3 sentences of technical analysis>",
  "riskFactors": ["<risk 1>", "<risk 2>"],
  "recommendations": ["<actionable rec 1>", "<actionable rec 2>", ...],
  "confidence": <0-1 decimal, how confident in this analysis>
}

Important Constraints:
- If data points < 30, set confidence < 0.6
- If temperature never reaches 15-25°C optimal range, mention thermal management issue
- If voltage variance > 10% of mean, flag stability problem
- Reference typical EV battery aging rates (5-15 mΩ internal resistance increase per 1000 cycles)
`;
```

**Common Mistakes Copilot Should Avoid**
- ❌ Generic prompts without context ("Analyze this battery data")
- ❌ Vague format requests (request specific JSON schema, not "return data")
- ❌ Omitting constraints (LLM may hallucinate without boundaries)
- ❌ Treating LLM output as ground truth (always validate numbers are in sane ranges)

### Response Validation & Fallback Patterns

When Copilot generates code for LLM response handling, enforce this pattern:

```typescript
// Step 1: Try to parse response as JSON
let aiResult: PartialBatteryAnalysis;
try {
  aiResult = JSON.parse(response);
} catch (parseError) {
  // Step 2: Extract JSON from response text if direct parse fails
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('LLM response contains no JSON');
  }
  aiResult = JSON.parse(jsonMatch[0]);
}

// Step 3: Validate output ranges
if (typeof aiResult.healthScore !== 'number' || aiResult.healthScore < 0 || aiResult.healthScore > 100) {
  throw new Error(\`Invalid healthScore: \${aiResult.healthScore}\`);
}

// Step 4: Provide fallback if validation fails
if (!Array.isArray(aiResult.recommendations) || aiResult.recommendations.length === 0) {
  aiResult.recommendations = generateBasicRecommendations(stats);
}

return aiResult;
```

### LLM Model Selection Guidance

- **For Quick Analysis**: Use `gpt-4o` (fast, cost-effective for structured tasks)
- **For Complex Diagnostics**: Possible future upgrade to `gpt-4-turbo` (higher reasoning)
- **For On-Device**: Never use `gpt-3.5-turbo` (insufficient domain reasoning)
- **Fallback Strategy**: Always have statistical fallback if LLM fails

---

## Debugging & Troubleshooting Guidance

### Common Issues & Root Causes

**Issue: CSV parsing fails with "Missing required columns"**
- Root Cause 1: Headers are case-sensitive or contain whitespace; fix with `.toLowerCase()` and `.trim()`
- Root Cause 2: Delimiter is not comma (e.g., semicolon); implement delimiter detection
- Root Cause 3: Data starts with metadata rows; implement smart header detection (row scan up to 10 rows)
- Fix Strategy: Show user actual vs. expected headers; suggest column mapping UI

**Issue: Charts render but data looks wrong (flat line or huge spikes)**
- Root Cause 1: Chart data isn't sorted by timestamp; verify sort in transformation
- Root Cause 2: Y-axis scaling is auto; extreme outliers compress data; use domain prop
- Root Cause 3: Temperature and Voltage on same axis; need dual Y-axes (recharts `ComposedChart`)
- Fix Strategy: Add debug logs; console.log transformed chartData to inspect values

**Issue: AI analysis returns nonsensical health score (e.g., 999)**
- Root Cause 1: JSON parsing extracted wrong data; regex captured wrong braces
- Root Cause 2: LLM response format changed; prompt evolution drift
- Root Cause 3: LLM hallucinated a number outside 0-100; validation missing
- Fix Strategy: Add strict schema validation; clamp values; log raw LLM response for audit

**Issue: App crashes on large files (>50MB)**
- Root Cause 1: Entire file loaded into memory at once; no streaming
- Root Cause 2: Chart tries to render 1M+ data points; browser DOM thrashed
- Root Cause 3: localStorage quota exceeded; no cleanup of old snapshots
- Fix Strategy: Implement chunked processing; add file size warning; limit chart to 5K-point decimation

### Debugging Checklist

When a user reports an issue, ask Copilot to help validate:

- [ ] **Data Validation**: Run `parseCSVWithValidation()` and inspect the `report` object
- [ ] **Type Safety**: Confirm all values pass type checks (voltage: number, in range; temperature: number, in range)
- [ ] **Async Errors**: Check browser console for unhandled promise rejections or error boundaries
- [ ] **State Sync**: Verify UI state matches data state (e.g., isLoading flag vs. actual loading)
- [ ] **Chart Rendering**: Inspect Recharts props; verify `data` array structure matches schema
- [ ] **localStorage**: Check DevTools Storage tab; validate JSON structure of saved snapshots
- [ ] **LLM Integration**: Confirm `window.spark.llm()` is available and returns valid response
- [ ] **Memory Leaks**: Run with React DevTools Profiler; check component unmounting/cleanup

---

## Testing Strategy & Test Case Generation

### What Copilot Should Generate Tests For

**Unit Tests (battery-analysis.ts functions)**
```typescript
describe('parseCSV', () => {
  test('should parse valid CSV with standard headers', () => {
    const csv = `timestamp,voltage,temperature\n2024-01-01T00:00:00Z,12.5,20`;
    const result = parseCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0].voltage).toBe(12.5);
  });

  test('should throw error if required columns missing', () => {
    const csv = `timestamp,voltage\n2024-01-01T00:00:00Z,12.5`;
    expect(() => parseCSV(csv)).toThrow('CSV must contain');
  });

  test('should handle case-insensitive headers', () => {
    const csv = `TimeStamp,VOLTAGE,Temperature\n2024-01-01T00:00:00Z,12.5,20`;
    const result = parseCSV(csv);
    expect(result).toHaveLength(1);
  });

  test('should skip rows with invalid numeric values', () => {
    const csv = `timestamp,voltage,temperature\n2024-01-01T00:00:00Z,abc,20`;
    const result = parseCSV(csv);
    expect(result).toHaveLength(0); // Row skipped
  });

  test('should handle edge case: voltage at boundary (16V)', () => {
    const csv = `timestamp,voltage,temperature\n2024-01-01T00:00:00Z,16.0,20`;
    const result = parseCSV(csv);
    expect(result[0].voltage).toBe(16.0);
  });
});

describe('calculateBasicStats', () => {
  test('should compute min/max voltage correctly', () => {
    const readings = [
      { timestamp: '2024-01-01T00:00:00Z', voltage: 12.0, temperature: 20 },
      { timestamp: '2024-01-01T00:01:00Z', voltage: 13.5, temperature: 21 }
    ];
    const stats = calculateBasicStats(readings);
    expect(stats.voltageRange.min).toBe(12.0);
    expect(stats.voltageRange.max).toBe(13.5);
  });

  test('should handle single data point', () => {
    const readings = [
      { timestamp: '2024-01-01T00:00:00Z', voltage: 12.5, temperature: 20 }
    ];
    const stats = calculateBasicStats(readings);
    expect(stats.dataPoints).toBe(1);
    expect(stats.avgVoltage).toBe(12.5);
  });

  test('should calculate timeSpan correctly', () => {
    const readings = [
      { timestamp: '2024-01-01T00:00:00Z', voltage: 12.0, temperature: 20 },
      { timestamp: '2024-01-02T00:00:00Z', voltage: 12.5, temperature: 21 }
    ];
    const stats = calculateBasicStats(readings);
    expect(stats.timeSpan).toContain('24'); // "1 days" or similar
  });
});

describe('generateAIAnalysis', () => {
  test('should return fallback analysis if insufficient data', async () => {
    const readings = [];
    await expect(generateAIAnalysis(readings)).rejects.toThrow('No valid data');
  });

  test('should handle LLM response parsing failure with fallback', async () => {
    // Mock `window.spark.llm` to return invalid JSON
    window.spark.llm = jest.fn().mockResolvedValue('Invalid JSON response');
    
    const readings = [
      { timestamp: '2024-01-01T00:00:00Z', voltage: 12.5, temperature: 20 }
    ];
    const result = await generateAIAnalysis(readings);
    expect(result.healthScore).toBeDefined();
    expect(result.healthScore).toBeGreaterThanOrEqual(0);
  });
});
```

**Integration Tests (Component + Data Flow)**
```typescript
describe('FileUpload Component', () => {
  test('should parse CSV and call onFileProcessed with readings', async () => {
    const mockCallback = jest.fn();
    const { getByRole } = render(<FileUpload onFileProcessed={mockCallback} />);
    
    const file = new File(
      ['timestamp,voltage,temperature\n2024-01-01T00:00:00Z,12.5,20'],
      'battery.csv',
      { type: 'text/csv' }
    );
    
    const input = getByRole('button'); // Upload button
    fireEvent.drop(input, { dataTransfer: { files: [file] } });
    
    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ voltage: 12.5, temperature: 20 })
        ])
      );
    });
  });
});
```

### Edge Case Scenarios

Copilot should generate test cases for:
- Empty CSV (no data rows)
- Single data point (stats edge case)
- Large file (10K+ rows; performance test)
- Malformed timestamps (parsing edge case)
- Out-of-range values (validation edge case)
- Missing columns (error handling)
- Duplicate timestamps (sorting test)
- Unicode/encoding issues (BOM, Latin-1)
- localStorage quota exceeded (persistence edge case)

---

## Architecture & Design Questions

### When to Consult Copilot for Architecture

**Good Questions**
- "How should I handle errors in the CSV parsing pipeline?"
- "What's the best way to persist analysis snapshots across browser sessions?"
- "Should health score calculation be in the component or a utility function?"
- "How do I optimize chart rendering for 100K data points?"

**How Copilot Should Respond**
- Provide 2-3 options with trade-offs (code size, performance, maintainability)
- Reference existing patterns in the codebase
- Suggest TypeScript types to ensure correctness
- Provide working code examples, not just descriptions

### State Management Philosophy

**Local State (useState)**
- UI state: `isLoading`, `isDragging`, `showAdvancedOptions`
- Form inputs: `csvContent`, `selectedSnapshot`
- Transient notifications: `errorMessage`, `successToast`

**Context State (useContext + useReducer)**
- Current analysis snapshot: `{ readings, analysis }`
- All saved snapshots: `AnalysisSnapshot[]`
- User preferences: `{ unit: 'C' | 'F', theme: 'light' | 'dark' }`

**Never Store in State**
- Derived data (health score, chart data); compute on demand or memoize
- Props; this causes sync issues
- API responses that are already cached

---

## Performance Expectations & Optimizations

### Target Performance Metrics
- **CSV Parsing**: <500ms for 10K rows
- **Chart Rendering**: <1s initial render for 5K data points
- **AI Analysis Call**: <3s (network + LLM latency)
- **Page Load**: <2s (bundle size <500KB)

### Optimization Techniques Copilot Should Suggest
1. **Memoization**: `useMemo()` for chart data transformation
2. **Lazy Loading**: Split bundle for AnalysisPanel component
3. **Virtualization**: For snapshot history lists (100+ items)
4. **Debouncing**: Delay chart re-render until user finishes interactions
5. **Web Workers**: Offload heavy CSV parsing to background thread (future)

### Performance Debugging
When investigating slowness, ask Copilot to help measure:
- Chrome DevTools Performance tab: Identify bottlenecks
- React DevTools Profiler: Which components re-render unnecessarily
- Lighthouse: Accessibility and Core Web Vitals
- Bundle Analyzer: `webpack-bundle-analyzer` to find large deps

---

## Documentation & Knowledge Management

### When to Ask Copilot to Document

**DO Ask Copilot to write:**
- JSDoc comments for public functions
- README sections for setup, usage, troubleshooting
- Test case documentation
- Architecture decision records (ADRs)

**DO NOT Ask Copilot to write:**
- Battery physics explanations (domain expertise)
- Product marketing copy
- Regulatory/compliance documentation

### Documentation Template for Copilot

```typescript
/**
 * Parse battery telemetry CSV into structured readings.
 *
 * @param csvContent - Raw CSV text (comma-delimited, UTF-8)
 * @param onWarning - Optional callback for non-fatal parsing warnings
 *
 * @returns Object containing parsed readings and validation report
 *
 * @throws Error if required columns (timestamp, voltage, temperature) missing
 *
 * @example
 * const csv = `timestamp,voltage,temperature\n2024-01-01T00:00:00Z,12.5,20`;
 * const { readings } = parseCSVWithValidation(csv);
 * console.log(readings[0].voltage); // 12.5
 */
export function parseCSVWithValidation(
  csvContent: string,
  onWarning?: (msg: string) => void
): { readings: BatteryReading[]; report: ValidationReport } {
  // Implementation
}
```

---

## Key Project-Specific Terms & Abbreviations

When Copilot generates prompts or code comments, use these consistently:

| Term | Definition |
|------|-----------|
| **SOH** | State of Health (0-100%); proxy for battery capacity |
| **SOC** | State of Charge (0-100%); current energy level |
| **C-Rate** | Discharge rate relative to capacity (1C = full discharge in 1 hour) |
| **Ri** | Internal Resistance (milliohms); increases with aging |
| **DoD** | Depth of Discharge (0-100%); how much battery is drained |
| **Thermal Runaway** | Uncontrolled exothermic reaction; critical failure mode |
| **Voltage Clipping** | Flat-top charging curve indicating BMS limit |
| **Coulombic Efficiency** | Ratio of charge extracted to charge input; <100% indicates side reactions |
| **Cycle Count** | Number of charge-discharge cycles; proxy for battery age |
| **Calendar Aging** | Degradation due to time/temperature, independent of use |

---

## Copilot Persona & Tone

For this project, Copilot should adopt:
- **Expertise Level**: Intermediate-to-Advanced (assume knowledge of React, TypeScript, automotive domain)
- **Tone**: Professional, technical, direct (no overly casual language)
- **Error Messages**: Specific and actionable (not generic)
- **Code Comments**: Include *why*, not just *what*
- **Fallback Advice**: Always provide options, not dictates

---

## Project Constraints & Limitations

### Known Limitations to Reference

1. **Client-Side Only**: No server-side storage or backend API (localStorage is persistent mechanism)
2. **No Real-Time Data**: Batch CSV analysis only; not suitable for live telemetry streaming
3. **Single LLM Provider**: Dependent on `window.spark.llm()` availability
4. **Browser Dependent**: Performance varies by device/browser; no native app
5. **Data Privacy**: All data remains in browser; no telemetry sent to cloud (unless explicitly saved)

### Roadmap Considerations

Future enhancements Copilot should be aware of (but not suggest without explicit request):
- Multi-file batch processing
- Custom battery type profiles (12V vs. 48V vs. traction pack)
- Export reports as PDF
- Integration with cloud storage (iCloud, Google Drive)
- Real-time monitoring via WebSocket
- Collaborative analysis (share snapshots)

---

## Final Checklist: Before Suggesting Changes

When Copilot proposes code changes or architectural shifts, verify:

- [ ] Does it maintain TypeScript type safety (no `any`)?
- [ ] Is battery domain logic validated against actual data ranges?
- [ ] Does it handle CSV parsing edge cases (empty files, encoding issues)?
- [ ] Are error messages actionable for end users?
- [ ] Is performance acceptable (parsing <500ms, rendering <1s)?
- [ ] Does it follow existing code style and patterns?
- [ ] Are there tests covering happy path + edge cases?
- [ ] Is localStorage serialization/deserialization correct?
- [ ] Does it degrade gracefully if LLM fails?
- [ ] Is accessibility considered (ARIA labels, semantic HTML)?

