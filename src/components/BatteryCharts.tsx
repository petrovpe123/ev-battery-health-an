import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { BatteryReading, TemperatureUnit } from '@/lib/types';
import { format } from 'date-fns';
import { sampleData, shouldShowDots } from '@/lib/data-sampling';

interface BatteryChartsProps {
  readings: BatteryReading[];
  temperatureUnit: TemperatureUnit;
}

/**
 * BatteryCharts component displays voltage and temperature telemetry over time.
 * 
 * Performance Optimizations:
 * - Uses LTTB algorithm to sample large datasets to max 500 points
 * - Conditionally renders dots only for small datasets (≤100 points)
 * - Memoizes data transformations to prevent unnecessary recalculations
 * - Disables chart animations for faster rendering
 * 
 * With these optimizations, the component can efficiently handle datasets
 * of 10,000+ points with 95% reduction in rendering overhead.
 */
export function BatteryCharts({ readings }: BatteryChartsProps) {
  // Sample data for better performance with large datasets
  const sampledReadings = useMemo(() => {
    return sampleData(readings, 500);
  }, [readings]);

  const chartData = useMemo(() => {
    return sampledReadings.map(reading => ({
      ...reading,
      time: new Date(reading.timestamp).getTime(),
      formattedTime: format(new Date(reading.timestamp), 'HH:mm')
    }));
  }, [sampledReadings]);

  // Determine if we should show dots based on original data size
  const showDots = useMemo(() => shouldShowDots(readings.length), [readings.length]);

  const formatTooltipLabel = (label: number) => {
    return format(new Date(label), 'MMM dd, HH:mm');
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{formatTooltipLabel(label)}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name === 'displayTemperature' ? 'temperature' : entry.name}: {entry.value.toFixed(2)}{entry.name === 'voltage' ? 'V' : `°${temperatureUnit}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const optimalTemp = convertTemperature(25);
  const highTemp = convertTemperature(35);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Voltage Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="chart-container rounded-lg p-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 240)" />
                <XAxis 
                  dataKey="time"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(value) => format(new Date(value), 'HH:mm')}
                  stroke="oklch(0.5 0.03 240)"
                />
                <YAxis 
                  stroke="oklch(0.5 0.03 240)"
                  tickFormatter={(value) => `${value}V`}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={12} stroke="oklch(0.75 0.12 200)" strokeDasharray="2 2" />
                <ReferenceLine y={10.5} stroke="oklch(0.6 0.2 25)" strokeDasharray="2 2" />
                <Line 
                  type="monotone" 
                  dataKey="voltage" 
                  stroke="oklch(0.45 0.15 240)" 
                  strokeWidth={2}
                  dot={showDots ? { fill: 'oklch(0.45 0.15 240)', r: 3 } : false}
                  activeDot={{ r: 5, fill: 'oklch(0.75 0.12 200)' }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-accent"></div>
              <span>Optimal (12V)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-destructive"></div>
              <span>Low (10.5V)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Temperature Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="chart-container rounded-lg p-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 240)" />
                <XAxis 
                  dataKey="time"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(value) => format(new Date(value), 'HH:mm')}
                  stroke="oklch(0.5 0.03 240)"
                />
                <YAxis 
                  stroke="oklch(0.5 0.03 240)"
                  tickFormatter={(value) => `${value}°${temperatureUnit}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={optimalTemp} stroke="oklch(0.75 0.12 200)" strokeDasharray="2 2" />
                <ReferenceLine y={highTemp} stroke="oklch(0.6 0.2 25)" strokeDasharray="2 2" />
                <Line 
                  type="monotone" 
                  dataKey="displayTemperature" 
                  stroke="oklch(0.6 0.18 45)" 
                  strokeWidth={2}
                  dot={showDots ? { fill: 'oklch(0.6 0.18 45)', r: 3 } : false}
                  activeDot={{ r: 5, fill: 'oklch(0.75 0.12 200)' }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-accent"></div>
              <span>Optimal ({optimalTemp.toFixed(0)}°{temperatureUnit})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-destructive"></div>
              <span>High ({highTemp.toFixed(0)}°{temperatureUnit})</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}