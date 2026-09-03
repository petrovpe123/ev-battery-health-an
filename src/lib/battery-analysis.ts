import { BatteryReading, BatteryAnalysis } from './types';

export function parseCSV(csvContent: string): BatteryReading[] {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
  
  const timestampIndex = headers.findIndex(h => h.includes('timestamp') || h.includes('time'));
  const voltageIndex = headers.findIndex(h => h.includes('voltage'));
  const temperatureIndex = headers.findIndex(h => h.includes('temperature') || h.includes('temp'));
  
  if (timestampIndex === -1 || voltageIndex === -1 || temperatureIndex === -1) {
    throw new Error('CSV must contain timestamp, voltage, and temperature columns');
  }
  
  const readings: BatteryReading[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    
    if (values.length >= 3) {
      const timestamp = values[timestampIndex];
      const voltage = parseFloat(values[voltageIndex]);
      const temperature = parseFloat(values[temperatureIndex]);
      const timestampIsValid = !Number.isNaN(Date.parse(timestamp));
      const voltageIsValid = !Number.isNaN(voltage) && voltage >= 8 && voltage <= 16;
      const temperatureIsValid = !Number.isNaN(temperature) && temperature >= -20 && temperature <= 65;
      
      if (timestampIsValid && voltageIsValid && temperatureIsValid) {
        readings.push({
          timestamp,
          voltage,
          temperature
        });
      }
    }
  }
  
  return readings.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
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

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function createFallbackAnalysis(
  stats: NonNullable<ReturnType<typeof calculateBasicStats>>,
  reason: string
): BatteryAnalysis {
  const voltageSpreadPercent = ((stats.voltageRange.max - stats.voltageRange.min) / Math.max(stats.avgVoltage, 0.1)) * 100;
  const tempOutOfRange = stats.temperatureRange.min < 15 || stats.temperatureRange.max > 25;

  const healthScore = clampScore(
    90 -
    Math.min(voltageSpreadPercent * 3, 35) -
    (tempOutOfRange ? 15 : 0)
  );

  const recommendations: string[] = [];
  if (voltageSpreadPercent > 10) {
    recommendations.push('Inspect battery connections and charging system for voltage instability.');
  } else {
    recommendations.push('Continue monitoring voltage trends during normal driving and charging cycles.');
  }
  if (tempOutOfRange) {
    recommendations.push('Review thermal management because temperatures moved outside the optimal 15-25°C range.');
  } else {
    recommendations.push('Thermal behavior looks stable; keep the battery operating near 15-25°C when possible.');
  }
  recommendations.push('Run regular maintenance checks and compare this dataset with future telemetry snapshots.');

  return {
    ...stats,
    healthScore,
    summary: `AI analysis unavailable (${reason}). Generated a statistical fallback from ${stats.dataPoints} readings over ${stats.timeSpan}.`,
    recommendations
  };
}

function extractAIResult(response: string): unknown {
  try {
    return JSON.parse(response);
  } catch {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('LLM response did not contain valid JSON');
    }
    return JSON.parse(jsonMatch[0]);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

type SparkLlm = (prompt: string, modelName?: string, jsonMode?: boolean) => Promise<string>;

function getSparkLlm(): SparkLlm | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const spark = window.spark;
  return typeof spark?.llm === 'function' ? spark.llm.bind(spark) : null;
}

export async function generateAIAnalysis(readings: BatteryReading[]): Promise<BatteryAnalysis> {
  const stats = calculateBasicStats(readings);
  if (!stats) {
    throw new Error('No valid data to analyze');
  }
  
  const sampleReadings = readings.slice(0, 10).map(r => `${r.timestamp}: ${r.voltage}V, ${r.temperature}°C`).join('\n');
  
  const promptText = `Analyze this EV battery telemetry data and provide a comprehensive health assessment:
    
    Data Summary:
    - ${stats.dataPoints} readings over ${stats.timeSpan}
    - Average voltage: ${stats.avgVoltage.toFixed(2)}V (range: ${stats.voltageRange.min.toFixed(2)}V - ${stats.voltageRange.max.toFixed(2)}V)
    - Average temperature: ${stats.avgTemperature.toFixed(1)}°C (range: ${stats.temperatureRange.min.toFixed(1)}°C - ${stats.temperatureRange.max.toFixed(1)}°C)
    
    Sample readings:
    ${sampleReadings}
    
    Please provide a JSON response with exactly this structure:
    {
      "healthScore": <number 0-100>,
      "summary": "<brief technical summary>",
      "recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"]
    }
    
    Focus on voltage stability, temperature patterns, and any concerning trends. Consider typical EV battery operating ranges (10-14V, optimal temp 15-25°C).`;
  
  const sparkLlm = getSparkLlm();

  if (!sparkLlm) {
    return createFallbackAnalysis(stats, 'Spark SDK is not available');
  }

  try {
    const response = await sparkLlm(promptText, "gpt-4o", true);
    const parsed = extractAIResult(response);
    const fallback = createFallbackAnalysis(stats, 'invalid AI response');

    if (!isRecord(parsed)) {
      return fallback;
    }

    const parsedScore = typeof parsed.healthScore === 'number' ? clampScore(parsed.healthScore) : fallback.healthScore;
    const parsedSummary = typeof parsed.summary === 'string' && parsed.summary.trim().length > 0
      ? parsed.summary.trim()
      : fallback.summary;

    const parsedRecommendations = Array.isArray(parsed.recommendations)
      ? parsed.recommendations.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];

    return {
      ...stats,
      healthScore: parsedScore,
      summary: parsedSummary,
      recommendations: parsedRecommendations.length > 0 ? parsedRecommendations : fallback.recommendations
    };
  } catch {
    return createFallbackAnalysis(stats, 'AI service call failed');
  }
}