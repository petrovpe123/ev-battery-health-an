import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculateBasicStats, generateAIAnalysis, parseCSV } from './battery-analysis';
import { BatteryReading } from './types';

describe('parseCSV', () => {
  it('parses case-insensitive headers and sorts readings by timestamp', () => {
    const csv = [
      'Temperature,Time,VOLTAGE',
      '20,2024-01-02T00:00:00Z,12.5',
      '19,2024-01-01T00:00:00Z,12.3'
    ].join('\n');

    expect(parseCSV(csv)).toEqual([
      { timestamp: '2024-01-01T00:00:00Z', voltage: 12.3, temperature: 19 },
      { timestamp: '2024-01-02T00:00:00Z', voltage: 12.5, temperature: 20 }
    ]);
  });

  it('throws when required columns are missing', () => {
    expect(() => parseCSV('timestamp,voltage\n2024-01-01T00:00:00Z,12.5'))
      .toThrow('CSV must contain timestamp, voltage, and temperature columns');
  });

  it('skips rows with invalid numeric values and returns no readings for header-only CSV', () => {
    expect(parseCSV('timestamp,voltage,temperature\n2024-01-01T00:00:00Z,invalid,20'))
      .toEqual([]);
    expect(parseCSV('timestamp,voltage,temperature')).toEqual([]);
  });
});

describe('calculateBasicStats', () => {
  const readings: BatteryReading[] = [
    { timestamp: '2024-01-01T00:00:00Z', voltage: 12, temperature: 18 },
    { timestamp: '2024-01-03T00:00:00Z', voltage: 14, temperature: 22 }
  ];

  it('returns null for an empty reading set', () => {
    expect(calculateBasicStats([])).toBeNull();
  });

  it('calculates averages, ranges, count, and elapsed time', () => {
    expect(calculateBasicStats(readings)).toEqual({
      avgVoltage: 13,
      avgTemperature: 20,
      voltageRange: { min: 12, max: 14 },
      temperatureRange: { min: 18, max: 22 },
      dataPoints: 2,
      timeSpan: '2 days'
    });
  });

  it('handles a single reading', () => {
    expect(calculateBasicStats([readings[0]])).toMatchObject({
      avgVoltage: 12,
      avgTemperature: 18,
      dataPoints: 1,
      timeSpan: '0 hours'
    });
  });
});

describe('generateAIAnalysis', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects an empty reading set without calling the LLM', async () => {
    const llm = vi.fn();
    vi.stubGlobal('window', { spark: { llm } });

    await expect(generateAIAnalysis([])).rejects.toThrow('No valid data to analyze');
    expect(llm).not.toHaveBeenCalled();
  });

  it('combines LLM output with calculated statistics', async () => {
    const llm = vi.fn().mockResolvedValue(JSON.stringify({
      healthScore: 92,
      summary: 'Stable battery readings.',
      recommendations: ['Continue monitoring']
    }));
    vi.stubGlobal('window', { spark: { llm } });
    const reading = {
      timestamp: '2024-01-01T00:00:00Z',
      voltage: 12.5,
      temperature: 20
    };

    await expect(generateAIAnalysis([reading])).resolves.toMatchObject({
      healthScore: 92,
      summary: 'Stable battery readings.',
      recommendations: ['Continue monitoring'],
      avgVoltage: 12.5,
      avgTemperature: 20,
      dataPoints: 1
    });
    expect(llm).toHaveBeenCalledWith(expect.stringContaining('1 readings'), 'gpt-4o', true);
  });
});
