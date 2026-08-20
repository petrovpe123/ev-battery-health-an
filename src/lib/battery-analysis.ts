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
      
      if (!isNaN(voltage) && !isNaN(temperature)) {
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

function generateFallbackAnalysis(readings: BatteryReading[], reason?: string): BatteryAnalysis {
  const stats = calculateBasicStats(readings);
  if (!stats) {
    throw new Error('No valid data to analyze');
  }

  const voltageSpread = stats.voltageRange.max - stats.voltageRange.min;
  const temperatureSpread = stats.temperatureRange.max - stats.temperatureRange.min;
  const voltagePenalty = Math.min(30, voltageSpread * 10);
  const temperaturePenalty = Math.min(20, temperatureSpread / 2);
  const rangePenalty = stats.avgVoltage < 10 || stats.avgVoltage > 14 ? 20 : 0;
  const healthScore = Math.max(0, Math.min(100, Math.round(90 - voltagePenalty - temperaturePenalty - rangePenalty)));

  return {
    ...stats,
    healthScore,
    summary: reason
      ? `Secure AI analysis was unavailable (${reason}). This fallback assessment is based on local voltage and temperature statistics.`
      : 'Battery telemetry was assessed using local voltage and temperature statistics.',
    recommendations: [
      'Monitor voltage stability across future telemetry uploads',
      'Keep battery temperature near the 15-25°C optimal range when possible',
      'Use the secured AI analysis endpoint for a richer diagnostic summary when authorized'
    ]
  };
}

function validateAnalysisResponse(value: unknown, readings: BatteryReading[]): BatteryAnalysis {
  if (!value || typeof value !== 'object' || !('analysis' in value)) {
    return generateFallbackAnalysis(readings, 'invalid response');
  }

  const analysis = (value as { analysis: Partial<BatteryAnalysis> }).analysis;
  const stats = calculateBasicStats(readings);
  if (!stats) {
    throw new Error('No valid data to analyze');
  }

  return {
    ...stats,
    healthScore: typeof analysis.healthScore === 'number'
      ? Math.max(0, Math.min(100, Math.round(analysis.healthScore)))
      : 75,
    summary: typeof analysis.summary === 'string' && analysis.summary.trim()
      ? analysis.summary.trim()
      : 'Battery appears to be operating within normal parameters.',
    recommendations: Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0
      ? analysis.recommendations.filter((recommendation): recommendation is string => typeof recommendation === 'string').slice(0, 5)
      : ['Monitor voltage stability', 'Keep battery cool', 'Regular maintenance checks']
  };
}

function getAnalysisAuthorizationHeader(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const token = window.sessionStorage.getItem('analysisApiToken');
  return token ? 'Bearer ' + token : undefined;
}

export async function generateAIAnalysis(
  readings: BatteryReading[],
  consentToSendTelemetry: boolean
): Promise<BatteryAnalysis> {
  const stats = calculateBasicStats(readings);
  if (!stats) {
    throw new Error('No valid data to analyze');
  }

  if (!consentToSendTelemetry) {
    return generateFallbackAnalysis(readings, 'telemetry consent not granted');
  }

  const authorization = getAnalysisAuthorizationHeader();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (authorization) {
    headers.Authorization = authorization;
  }

  try {
    const response = await fetch('/api/ai-analysis', {
      method: 'POST',
      credentials: 'same-origin',
      headers,
      body: JSON.stringify({
        consentToSendTelemetry,
        telemetryPolicyVersion: '2026-08-20',
        readings
      })
    });

    if (!response.ok) {
      const message = response.status === 401 || response.status === 403
        ? 'authorization required'
        : 'secure endpoint unavailable';
      return generateFallbackAnalysis(readings, message);
    }

    return validateAnalysisResponse(await response.json(), readings);
  } catch {
    return generateFallbackAnalysis(readings, 'secure endpoint unavailable');
  }
}