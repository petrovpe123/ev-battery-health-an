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
  
  const response = await window.spark.llm(promptText, "gpt-4o", true);
  const aiResult = JSON.parse(response);
  
  return {
    ...stats,
    healthScore: aiResult.healthScore || 75,
    summary: aiResult.summary || 'Battery appears to be operating within normal parameters.',
    recommendations: aiResult.recommendations || ['Monitor voltage stability', 'Keep battery cool', 'Regular maintenance checks']
  };
}