import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculateBasicStats, generateAIAnalysis, parseCSV } from './battery-analysis';
import type { BatteryReading } from './types';

// Reuse a small, chronological dataset so aggregation and model-response tests
// exercise the same realistic input without depending on files or external services.
const readings: BatteryReading[] = [
  { timestamp: '2024-01-01T00:00:00Z', voltage: 12, temperature: 20 },
  { timestamp: '2024-01-03T00:00:00Z', voltage: 14, temperature: 24 },
];

afterEach(() => {
  // Restore the real global after each test so mocked Spark calls cannot leak
  // into another test or change the browser APIs seen by future suites.
  vi.unstubAllGlobals();
});

// CSV tests cover header matching and column positions, row validation,
// chronological ordering, and the valid empty-data case.
describe('parseCSV', () => {
  it('parses case-insensitive headers and sorts readings by timestamp', () => {
    const csv = [
      'Temperature,TimeStamp,Voltage',
      '24,2024-01-02T00:00:00Z,13',
      '20,2024-01-01T00:00:00Z,12',
    ].join('\n');

    expect(parseCSV(csv)).toEqual([
      { timestamp: '2024-01-01T00:00:00Z', voltage: 12, temperature: 20 },
      { timestamp: '2024-01-02T00:00:00Z', voltage: 13, temperature: 24 },
    ]);
  });

  it('skips rows with invalid numeric values', () => {
    const csv = [
      'timestamp,voltage,temperature',
      '2024-01-01T00:00:00Z,not-a-number,20',
      '2024-01-02T00:00:00Z,12.5,21',
    ].join('\n');

    expect(parseCSV(csv)).toEqual([
      { timestamp: '2024-01-02T00:00:00Z', voltage: 12.5, temperature: 21 },
    ]);
  });

  it('throws an actionable error when a required column is missing', () => {
    expect(() => parseCSV('timestamp,voltage\n2024-01-01T00:00:00Z,12.5')).toThrow(
      'CSV must contain timestamp, voltage, and temperature columns',
    );
  });

  it('returns an empty list when the header is valid but there are no data rows', () => {
    expect(parseCSV('timestamp,voltage,temperature')).toEqual([]);
  });
});

// Statistics tests cover the empty-input contract, representative aggregate
// values, the multi-day formatting boundary, and a one-reading dataset.
describe('calculateBasicStats', () => {
  it('returns null when no readings are provided', () => {
    expect(calculateBasicStats([])).toBeNull();
  });

  it('calculates averages, ranges, point count, and multi-day span', () => {
    expect(calculateBasicStats(readings)).toEqual({
      avgVoltage: 13,
      avgTemperature: 22,
      voltageRange: { min: 12, max: 14 },
      temperatureRange: { min: 20, max: 24 },
      dataPoints: 2,
      timeSpan: '2 days',
    });
  });

  it('handles a single reading', () => {
    expect(calculateBasicStats([readings[0]])).toMatchObject({
      avgVoltage: 12,
      avgTemperature: 20,
      voltageRange: { min: 12, max: 12 },
      temperatureRange: { min: 20, max: 20 },
      dataPoints: 1,
      timeSpan: '0 hours',
    });
  });
});

// The analyzer reaches the Spark SDK through window, so these tests replace
// only that boundary and verify behavior without making a network/model call.
describe('generateAIAnalysis', () => {
  it('rejects empty input without calling the language model', async () => {
    const llm = vi.fn<Window['spark']['llm']>();
    vi.stubGlobal('window', { spark: { llm } });

    await expect(generateAIAnalysis([])).rejects.toThrow('No valid data to analyze');
    expect(llm).not.toHaveBeenCalled();
  });

  it('sends a structured-analysis request and combines the response with statistics', async () => {
    const llm = vi.fn<Window['spark']['llm']>().mockResolvedValue(
      JSON.stringify({
        healthScore: 91,
        summary: 'Voltage remains stable.',
        recommendations: ['Continue monitoring.'],
      }),
    );
    vi.stubGlobal('window', { spark: { llm } });

    const analysis = await generateAIAnalysis(readings);

    expect(llm).toHaveBeenCalledWith(expect.stringContaining('2 readings over 2 days'), 'gpt-4o', true);
    expect(analysis).toEqual({
      healthScore: 91,
      summary: 'Voltage remains stable.',
      recommendations: ['Continue monitoring.'],
      avgVoltage: 13,
      avgTemperature: 22,
      voltageRange: { min: 12, max: 14 },
      temperatureRange: { min: 20, max: 24 },
      dataPoints: 2,
      timeSpan: '2 days',
    });
  });

  it('uses defaults when optional response fields are omitted', async () => {
    const llm = vi.fn<Window['spark']['llm']>().mockResolvedValue('{"healthScore":80}');
    vi.stubGlobal('window', { spark: { llm } });

    await expect(generateAIAnalysis(readings)).resolves.toMatchObject({
      healthScore: 80,
      summary: 'Battery appears to be operating within normal parameters.',
      recommendations: ['Monitor voltage stability', 'Keep battery cool', 'Regular maintenance checks'],
    });
  });
});
