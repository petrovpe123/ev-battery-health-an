export type TemperatureUnit = 'C' | 'F';

export interface BatteryReading {
  timestamp: string;
  voltage: number;
  temperature: number;
}

export interface BatteryAnalysis {
  healthScore: number;
  summary: string;
  recommendations: string[];
  avgVoltage: number;
  avgTemperature: number;
  voltageRange: { min: number; max: number };
  temperatureRange: { min: number; max: number };
  dataPoints: number;
  timeSpan: string;
}

export interface AnalysisSnapshot {
  id: string;
  timestamp: string;
  fileName?: string;
  analysis: BatteryAnalysis;
  readings: BatteryReading[];
}

export interface HealthTrend {
  date: string;
  healthScore: number;
  fileName: string;
}