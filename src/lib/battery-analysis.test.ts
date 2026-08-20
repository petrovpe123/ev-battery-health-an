import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseCSV, calculateBasicStats, generateAIAnalysis } from './battery-analysis';
import { BatteryReading } from './types';

describe('battery-analysis.ts', () => {
  // Test 1: parseCSV with valid CSV data
  it('should parse valid CSV with standard headers', () => {
    const csv = `timestamp,voltage,temperature
2024-01-01T00:00:00Z,12.5,20
2024-01-01T01:00:00Z,12.6,21`;
    
    const result = parseCSV(csv);
    
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      timestamp: '2024-01-01T00:00:00Z',
      voltage: 12.5,
      temperature: 20
    });
    expect(result[1]).toEqual({
      timestamp: '2024-01-01T01:00:00Z',
      voltage: 12.6,
      temperature: 21
    });
  });

  // Test 2: parseCSV with case-insensitive headers
  it('should handle case-insensitive headers', () => {
    const csv = `TimeStamp,VOLTAGE,Temperature
2024-01-01T00:00:00Z,12.5,20`;
    
    const result = parseCSV(csv);
    
    expect(result).toHaveLength(1);
    expect(result[0].voltage).toBe(12.5);
    expect(result[0].temperature).toBe(20);
  });

  // Test 3: parseCSV throws error when required columns are missing
  it('should throw error if required columns missing', () => {
    const csv = `timestamp,voltage
2024-01-01T00:00:00Z,12.5`;
    
    expect(() => parseCSV(csv)).toThrow('CSV must contain timestamp, voltage, and temperature columns');
  });

  // Test 4: parseCSV skips rows with invalid numeric values
  it('should skip rows with invalid numeric values', () => {
    const csv = `timestamp,voltage,temperature
2024-01-01T00:00:00Z,12.5,20
2024-01-01T01:00:00Z,abc,21
2024-01-01T02:00:00Z,12.7,22`;
    
    const result = parseCSV(csv);
    
    expect(result).toHaveLength(2);
    expect(result[0].voltage).toBe(12.5);
    expect(result[1].voltage).toBe(12.7);
  });

  // Test 5: parseCSV sorts readings by timestamp
  it('should sort readings by timestamp', () => {
    const csv = `timestamp,voltage,temperature
2024-01-01T02:00:00Z,12.7,22
2024-01-01T00:00:00Z,12.5,20
2024-01-01T01:00:00Z,12.6,21`;
    
    const result = parseCSV(csv);
    
    expect(result[0].timestamp).toBe('2024-01-01T00:00:00Z');
    expect(result[1].timestamp).toBe('2024-01-01T01:00:00Z');
    expect(result[2].timestamp).toBe('2024-01-01T02:00:00Z');
  });

  // Test 6: calculateBasicStats computes correct statistics
  it('should compute min/max voltage and temperature correctly', () => {
    const readings: BatteryReading[] = [
      { timestamp: '2024-01-01T00:00:00Z', voltage: 12.0, temperature: 20 },
      { timestamp: '2024-01-01T01:00:00Z', voltage: 13.5, temperature: 25 },
      { timestamp: '2024-01-01T02:00:00Z', voltage: 12.5, temperature: 22 }
    ];
    
    const stats = calculateBasicStats(readings);
    
    expect(stats).not.toBeNull();
    expect(stats!.voltageRange.min).toBe(12.0);
    expect(stats!.voltageRange.max).toBe(13.5);
    expect(stats!.temperatureRange.min).toBe(20);
    expect(stats!.temperatureRange.max).toBe(25);
    expect(stats!.avgVoltage).toBeCloseTo(12.67, 1);
    expect(stats!.avgTemperature).toBeCloseTo(22.33, 1);
  });

  // Test 7: calculateBasicStats returns null for empty readings
  it('should return null for empty readings array', () => {
    const readings: BatteryReading[] = [];
    
    const stats = calculateBasicStats(readings);
    
    expect(stats).toBeNull();
  });

  // Test 8: calculateBasicStats handles single data point
  it('should handle single data point correctly', () => {
    const readings: BatteryReading[] = [
      { timestamp: '2024-01-01T00:00:00Z', voltage: 12.5, temperature: 20 }
    ];
    
    const stats = calculateBasicStats(readings);
    
    expect(stats).not.toBeNull();
    expect(stats!.dataPoints).toBe(1);
    expect(stats!.avgVoltage).toBe(12.5);
    expect(stats!.avgTemperature).toBe(20);
    expect(stats!.voltageRange.min).toBe(12.5);
    expect(stats!.voltageRange.max).toBe(12.5);
  });

  // Test 9: generateAIAnalysis handles valid LLM response
  it('should successfully parse valid AI response and return analysis', async () => {
    const readings: BatteryReading[] = [
      { timestamp: '2024-01-01T00:00:00Z', voltage: 12.5, temperature: 20 },
      { timestamp: '2024-01-01T01:00:00Z', voltage: 12.6, temperature: 21 }
    ];
    
    // Mock window.spark.llm
    const mockResponse = JSON.stringify({
      healthScore: 85,
      summary: 'Battery is in excellent condition',
      recommendations: ['Keep battery cool', 'Regular monitoring', 'Avoid deep discharge']
    });
    
    (window as any).spark = {
      llm: vi.fn().mockResolvedValue(mockResponse)
    };
    
    const result = await generateAIAnalysis(readings);
    
    expect(result.healthScore).toBe(85);
    expect(result.summary).toBe('Battery is in excellent condition');
    expect(result.recommendations).toHaveLength(3);
    expect(result.avgVoltage).toBe(12.55);
    expect(result.dataPoints).toBe(2);
  });

  // Test 10: generateAIAnalysis falls back on invalid JSON response
  it('should fallback to default analysis when AI response is invalid JSON', async () => {
    const readings: BatteryReading[] = [
      { timestamp: '2024-01-01T00:00:00Z', voltage: 12.5, temperature: 20 },
      { timestamp: '2024-01-01T01:00:00Z', voltage: 12.6, temperature: 21 }
    ];
    
    // Mock window.spark.llm to return invalid JSON
    (window as any).spark = {
      llm: vi.fn().mockResolvedValue('This is not valid JSON {invalid}')
    };
    
    // Suppress console.warn for this test
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const result = await generateAIAnalysis(readings);
    
    // Should use fallback values
    expect(result.healthScore).toBe(75);
    expect(result.summary).toBe('Unable to parse AI analysis. Battery appears normal.');
    expect(result.recommendations).toContain('Unable to generate specific recommendations');
    expect(result.avgVoltage).toBe(12.55);
    expect(result.dataPoints).toBe(2);
    
    warnSpy.mockRestore();
  });
});
