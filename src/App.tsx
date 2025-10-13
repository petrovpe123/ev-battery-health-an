import React, { useState } from 'react';
import { useKV } from '@github/spark/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FileUpload } from '@/components/FileUpload';
import { BatteryCharts } from '@/components/BatteryCharts';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { BatteryReading } from '@/lib/types';
import { Car, ArrowClockwise } from '@phosphor-icons/react';

function App() {
  const [batteryData, setBatteryData] = useKV<BatteryReading[]>('battery-data', []);
  const [currentData, setCurrentData] = useState<BatteryReading[]>([]);

  const handleDataParsed = (readings: BatteryReading[]) => {
    setCurrentData(readings);
    setBatteryData(readings);
  };

  const handleReset = () => {
    setCurrentData([]);
    setBatteryData([]);
  };

  const hasData = currentData.length > 0 || (batteryData && batteryData.length > 0);
  const displayData = currentData.length > 0 ? currentData : (batteryData || []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Car size={24} className="text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">EV Battery Health Tracker</h1>
              <p className="text-muted-foreground">
                Analyze battery telemetry data with AI-powered insights
              </p>
            </div>
          </div>
          
          {hasData && (
            <Button onClick={handleReset} variant="outline" className="gap-2">
              <ArrowClockwise size={16} />
              Reset
            </Button>
          )}
        </div>

        {/* Main Content */}
        {!hasData ? (
          <div className="max-w-2xl mx-auto">
            <FileUpload onDataParsed={handleDataParsed} />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Data Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Data Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {displayData.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Data Points</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {(displayData.reduce((sum, r) => sum + r.voltage, 0) / displayData.length).toFixed(2)}V
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Voltage</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {(displayData.reduce((sum, r) => sum + r.temperature, 0) / displayData.length).toFixed(1)}°C
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Temperature</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {(() => {
                        const firstTime = new Date(displayData[0].timestamp);
                        const lastTime = new Date(displayData[displayData.length - 1].timestamp);
                        const hours = (lastTime.getTime() - firstTime.getTime()) / (1000 * 60 * 60);
                        return hours > 24 ? `${Math.round(hours / 24)}d` : `${Math.round(hours)}h`;
                      })()}
                    </div>
                    <div className="text-sm text-muted-foreground">Time Span</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Charts */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Telemetry Visualization</h2>
              <BatteryCharts readings={displayData} />
            </div>

            <Separator />

            {/* Analysis */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Battery Health Analysis</h2>
              <AnalysisPanel readings={displayData} />
            </div>

            {/* Upload New Data */}
            <div className="pt-8 border-t">
              <h3 className="text-lg font-medium mb-4">Upload New Data</h3>
              <FileUpload onDataParsed={handleDataParsed} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;