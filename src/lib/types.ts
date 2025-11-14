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