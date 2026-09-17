import { BatteryAnalysis, BatteryMetrics, BatteryReading, HealthScoreBreakdown } from './types';
import { z } from 'zod';
import { parseCSVWithValidation } from './csv-validator';

const NOMINAL_VOLTAGE_MIN = 10;
const NOMINAL_VOLTAGE_MAX = 14;
const OPTIMAL_TEMPERATURE_MIN = 15;
const OPTIMAL_TEMPERATURE_MAX = 25;
const VOLTAGE_SPIKE_THRESHOLD = 1;
const VOLTAGE_CLIPPING_DELTA = 0.05;
const VOLTAGE_CLIPPING_SAMPLES = 5;
const CRITICAL_TEMPERATURE = 55;

// AI output is explanatory; deterministic metrics remain the reproducible score source.
const aiAnalysisSchema = z.object({
  healthScore: z.number().int().min(0).max(100),
  summary: z.string().trim().min(1).max(2000),
  recommendations: z.array(z.string().trim().min(1).max(500)).min(1).max(10)
});

export function parseCSV(csvContent: string): BatteryReading[] {
  return parseCSVWithValidation(csvContent).readings;
}

export function calculateBasicStats(readings: BatteryReading[]) {
  if (readings.length === 0) return null;
  
  const voltages = readings.map(r => r.voltage);
  const temperatures = readings.map(r => r.temperature);
  
  const avgVoltage = voltages.reduce((sum, v) => sum + v, 0) / voltages.length;
  const avgTemperature = temperatures.reduce((sum, t) => sum + t, 0) / temperatures.length;
  
  const voltageRange = {
    min: Math.min(...voltages),
    max: Math.max(...voltages)
  };
  
  const temperatureRange = {
    min: Math.min(...temperatures),
    max: Math.max(...temperatures)
  };
  
  const firstTime = new Date(readings[0].timestamp);
  const lastTime = new Date(readings[readings.length - 1].timestamp);
  const timeSpanHours = (lastTime.getTime() - firstTime.getTime()) / (1000 * 60 * 60);
  
  return {
    avgVoltage,
    avgTemperature,
    voltageRange,
    temperatureRange,
    dataPoints: readings.length,
    timeSpan: timeSpanHours > 24 ? `${Math.round(timeSpanHours / 24)} days` : `${Math.round(timeSpanHours)} hours`
  };
}

function getSortedReadings(readings: BatteryReading[]): BatteryReading[] {
  return [...readings].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
}

function calculateStandardDeviation(values: number[], mean: number): number {
  if (values.length === 0) return 0;

  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function calculateObservationHours(readings: BatteryReading[]): number {
  if (readings.length < 2) return 0;

  const sortedReadings = getSortedReadings(readings);
  const firstTimestamp = Date.parse(sortedReadings[0].timestamp);
  const lastTimestamp = Date.parse(sortedReadings[sortedReadings.length - 1].timestamp);
  return Math.max(0, (lastTimestamp - firstTimestamp) / (1000 * 60 * 60));
}

function calculateVoltageDriftRate(readings: BatteryReading[]): number {
  if (readings.length < 2) return 0;

  // Regression handles irregular sampling intervals more accurately than first-to-last change.
  const points = readings.map((reading) => ({
    timeHours: Date.parse(reading.timestamp) / (1000 * 60 * 60),
    voltage: reading.voltage
  }));
  const meanTime = points.reduce((sum, point) => sum + point.timeHours, 0) / points.length;
  const meanVoltage = points.reduce((sum, point) => sum + point.voltage, 0) / points.length;
  const denominator = points.reduce((sum, point) => sum + (point.timeHours - meanTime) ** 2, 0);

  if (denominator === 0) return 0;

  const slopeVoltsPerHour = points.reduce(
    (sum, point) => sum + (point.timeHours - meanTime) * (point.voltage - meanVoltage),
    0
  ) / denominator;

  return slopeVoltsPerHour * 1000;
}

function calculateThermalStressHours(readings: BatteryReading[]): number {
  let stressHours = 0;

  for (let index = 0; index < readings.length - 1; index += 1) {
    const current = readings[index];
    const next = readings[index + 1];
    const intervalHours = Math.max(0, (Date.parse(next.timestamp) - Date.parse(current.timestamp)) / (1000 * 60 * 60));
    const isStressed = current.temperature < OPTIMAL_TEMPERATURE_MIN
      || current.temperature > OPTIMAL_TEMPERATURE_MAX;

    // Attribute each interval to the preceding reading because it represents the observed state.
    if (isStressed) stressHours += intervalHours;
  }

  return stressHours;
}

function detectVoltageClipping(voltages: number[]): boolean {
  let consecutiveSamples = 1;

  // Repeated near-identical samples can indicate a flat-top or clipped voltage signal.
  for (let index = 1; index < voltages.length; index += 1) {
    if (Math.abs(voltages[index] - voltages[index - 1]) <= VOLTAGE_CLIPPING_DELTA) {
      consecutiveSamples += 1;
      if (consecutiveSamples >= VOLTAGE_CLIPPING_SAMPLES) return true;
    } else {
      consecutiveSamples = 1;
    }
  }

  return false;
}

export function calculateBatteryMetrics(readings: BatteryReading[]): BatteryMetrics {
  if (readings.length < 2) {
    throw new Error('At least two readings are required to calculate battery metrics');
  }

  const sortedReadings = getSortedReadings(readings);
  const voltages = sortedReadings.map((reading) => reading.voltage);
  const temperatures = sortedReadings.map((reading) => reading.temperature);
  const averageVoltage = voltages.reduce((sum, voltage) => sum + voltage, 0) / voltages.length;
  const averageTemperature = temperatures.reduce((sum, temperature) => sum + temperature, 0) / temperatures.length;
  const voltageStandardDeviation = calculateStandardDeviation(voltages, averageVoltage);
  const temperatureStandardDeviation = calculateStandardDeviation(temperatures, averageTemperature);
  const maximumVoltageChange = voltages.slice(1).reduce(
    (maximum, voltage, index) => Math.max(maximum, Math.abs(voltage - voltages[index])),
    0
  );

  return {
    voltageCoefficientOfVariation: averageVoltage === 0 ? 0 : voltageStandardDeviation / Math.abs(averageVoltage),
    nominalVoltageAdherence: voltages.filter(
      (voltage) => voltage >= NOMINAL_VOLTAGE_MIN && voltage <= NOMINAL_VOLTAGE_MAX
    ).length / voltages.length,
    voltageDriftRateMillivoltsPerHour: calculateVoltageDriftRate(sortedReadings),
    temperatureStandardDeviation,
    thermalStressHours: calculateThermalStressHours(sortedReadings),
    voltageSpikeDetected: maximumVoltageChange > VOLTAGE_SPIKE_THRESHOLD,
    voltageClippingDetected: detectVoltageClipping(voltages),
    criticalTemperatureDetected: temperatures.some((temperature) => temperature >= CRITICAL_TEMPERATURE)
  };
}

export function calculateDeterministicHealthScore(
  metrics: BatteryMetrics,
  readings: BatteryReading[]
): { score: number; confidence: number; breakdown: HealthScoreBreakdown } {
  // These weights are heuristic operating-condition indicators, not a certified SOH model.
  const voltageStabilityScore = Math.max(0, 100 - metrics.voltageCoefficientOfVariation * 1000);
  const voltageScore = metrics.nominalVoltageAdherence * 60 + voltageStabilityScore * 0.4;
  const stressRatio = metrics.thermalStressHours / Math.max(1, calculateObservationHours(readings));
  const thermalScore = Math.max(0, 100 - metrics.temperatureStandardDeviation * 8 - stressRatio * 40);
  const driftScore = Math.max(0, 100 - Math.abs(metrics.voltageDriftRateMillivoltsPerHour) * 2);
  const anomalyPenalty = (metrics.voltageSpikeDetected ? 25 : 0)
    + (metrics.voltageClippingDetected ? 15 : 0)
    + (metrics.criticalTemperatureDetected ? 40 : 0);
  const anomalyScore = Math.max(0, 100 - anomalyPenalty);
  const score = Math.round(voltageScore * 0.35 + thermalScore * 0.3 + driftScore * 0.2 + anomalyScore * 0.15);
  const confidence = Math.min(1, readings.length / 100) * Math.min(1, calculateObservationHours(readings) / 24);

  return {
    score: Math.max(0, Math.min(100, score)),
    confidence: Number.isFinite(confidence) ? confidence : 0,
    breakdown: {
      voltage: Math.round(Math.max(0, Math.min(100, voltageScore))),
      thermal: Math.round(Math.max(0, Math.min(100, thermalScore))),
      drift: Math.round(Math.max(0, Math.min(100, driftScore))),
      anomalies: Math.round(anomalyScore)
    }
  };
}

export async function generateAIAnalysis(readings: BatteryReading[]): Promise<BatteryAnalysis> {
  const stats = calculateBasicStats(readings);
  if (!stats) {
    throw new Error('No valid data to analyze');
  }

  const metrics = calculateBatteryMetrics(readings);
  const deterministicScore = calculateDeterministicHealthScore(metrics, readings);
  
  const sampleReadings = readings.slice(0, 10).map(r => `${r.timestamp}: ${r.voltage}V, ${r.temperature}°C`).join('\n');
  
  const promptText = `Analyze this EV battery telemetry data and provide a comprehensive health assessment:
    
    Data Summary:
    - ${stats.dataPoints} readings over ${stats.timeSpan}
    - Average voltage: ${stats.avgVoltage.toFixed(2)}V (range: ${stats.voltageRange.min.toFixed(2)}V - ${stats.voltageRange.max.toFixed(2)}V)
    - Average temperature: ${stats.avgTemperature.toFixed(1)}°C (range: ${stats.temperatureRange.min.toFixed(1)}°C - ${stats.temperatureRange.max.toFixed(1)}°C)
    - Voltage stability: ${(metrics.voltageCoefficientOfVariation * 100).toFixed(2)}% coefficient of variation
    - Nominal voltage adherence: ${(metrics.nominalVoltageAdherence * 100).toFixed(1)}%
    - Voltage drift: ${metrics.voltageDriftRateMillivoltsPerHour.toFixed(2)}mV/hour
    - Thermal stress duration: ${metrics.thermalStressHours.toFixed(2)} hours
    - Deterministic health score: ${deterministicScore.score}/100
    
    Sample readings:
    ${sampleReadings}
    
    Please provide a JSON response with exactly this structure:
    {
      "healthScore": <number 0-100>,
      "summary": "<brief technical summary>",
      "recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"]
    }
    
    Focus on voltage stability, temperature patterns, and any concerning trends. Consider typical EV battery operating ranges (10-14V, optimal temp 15-25°C).`;
  
  try {
    const response = await window.spark.llm(promptText, "gpt-4o", true);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI response contains no JSON object');
    }

    const aiResult = aiAnalysisSchema.parse(JSON.parse(jsonMatch[0]));

    return {
      ...stats,
      healthScore: deterministicScore.score,
      aiHealthScore: aiResult.healthScore,
      deterministicConfidence: deterministicScore.confidence,
      scoreBreakdown: deterministicScore.breakdown,
      metrics,
      summary: aiResult.summary,
      recommendations: aiResult.recommendations
    };
  } catch (error) {
    console.warn('AI analysis validation failed; using statistical fallback', error);
    return createFallbackAnalysis(stats, metrics, deterministicScore);
  }
}
  
function createFallbackAnalysis(
  stats: NonNullable<ReturnType<typeof calculateBasicStats>>,
  metrics: BatteryMetrics,
  deterministicScore: ReturnType<typeof calculateDeterministicHealthScore>
): BatteryAnalysis {
  const recommendations = [
    ...(metrics.voltageSpikeDetected ? ['Investigate voltage spikes and charging stability.'] : []),
    ...(metrics.thermalStressHours > 0 ? ['Review thermal management and operating conditions.'] : []),
    ...(metrics.criticalTemperatureDetected ? ['Critical temperature readings require immediate investigation.'] : []),
    'Continue monitoring voltage and temperature trends over time.'
  ];

  return {
    ...stats,
    healthScore: deterministicScore.score,
    deterministicConfidence: deterministicScore.confidence,
    scoreBreakdown: deterministicScore.breakdown,
    metrics,
    summary: `Statistical assessment based on ${stats.dataPoints} readings: average voltage was ${stats.avgVoltage.toFixed(2)}V and average temperature was ${stats.avgTemperature.toFixed(1)}°C.`,
    recommendations
  };
}