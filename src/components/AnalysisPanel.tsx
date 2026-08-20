import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { BatteryChargingVertical, Sparkle, TrendUp, TrendDown } from '@phosphor-icons/react';
import { BatteryAnalysis, BatteryReading, TemperatureUnit } from '@/lib/types';
import { generateAIAnalysis } from '@/lib/battery-analysis';

interface AnalysisPanelProps {
  readings: BatteryReading[];
  temperatureUnit: TemperatureUnit;
  onAnalysisComplete?: (analysis: BatteryAnalysis) => void;
}

export function AnalysisPanel({ readings, temperatureUnit, onAnalysisComplete }: AnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<BatteryAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const celsiusToFahrenheit = (celsius: number) => (celsius * 9/5) + 32;

  const convertTemperature = (celsius: number) => {
    return temperatureUnit === 'C' ? celsius : celsiusToFahrenheit(celsius);
  };

  useEffect(() => {
    const runAnalysis = async () => {
      setLoading(true);
      setError(null);
      
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const result = await generateAIAnalysis(readings);
        setAnalysis(result);
        if (onAnalysisComplete) {
          onAnalysisComplete(result);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Analysis failed');
      } finally {
        setLoading(false);
      }
    };

    if (readings.length > 0) {
      runAnalysis();
    }
  }, [readings, onAnalysisComplete]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getHealthLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkle size={20} />
            AI Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          
          <div className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkle size={20} />
            AI Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-destructive">{error || 'Failed to generate analysis'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Health Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BatteryChargingVertical size={20} />
            Battery Health Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{analysis.healthScore}</span>
              <Badge variant="outline" className={`${getHealthColor(analysis.healthScore)} text-white`}>
                {getHealthLabel(analysis.healthScore)}
              </Badge>
            </div>
            <Progress value={analysis.healthScore} className="h-3" />
            <p className="text-sm text-muted-foreground">
              Score based on voltage stability, temperature patterns, and operating conditions
            </p>
          </div>
        </CardContent>
      </Card>

      {/* AI Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkle size={20} />
            AI Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm leading-relaxed typewriter">
              {analysis.summary}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Key Metrics</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Avg Voltage:</span>
                    <span className="font-mono">{analysis.avgVoltage.toFixed(2)}V</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Temperature:</span>
                    <span className="font-mono">{convertTemperature(analysis.avgTemperature).toFixed(1)}°{temperatureUnit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Data Points:</span>
                    <span className="font-mono">{analysis.dataPoints}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time Span:</span>
                    <span className="font-mono">{analysis.timeSpan}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Operating Ranges</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Voltage Range:</span>
                    <span className="font-mono">
                      {analysis.voltageRange.min.toFixed(2)}V - {analysis.voltageRange.max.toFixed(2)}V
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Temp Range:</span>
                    <span className="font-mono">
                      {convertTemperature(analysis.temperatureRange.min).toFixed(1)}°{temperatureUnit} - {convertTemperature(analysis.temperatureRange.max).toFixed(1)}°{temperatureUnit}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendUp size={20} />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {analysis.recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span className="text-sm leading-relaxed">{recommendation}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}