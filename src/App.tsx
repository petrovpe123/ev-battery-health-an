import React, { useState } from 'react';
import { useKV } from '@github/spark/hooks';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sonner';
import { FileUpload } from '@/components/FileUpload';
import { BatteryCharts } from '@/components/BatteryCharts';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { BatteryReading, TemperatureUnit, BatteryAnalysis } from '@/lib/types';
import { ArrowClockwise, BatteryChargingVertical, FilePdf, Thermometer } from '@phosphor-icons/react';
import { generatePDFReport } from '@/lib/pdf-export';
import { toast } from 'sonner';

function App() {
  const [batteryData, setBatteryData] = useKV<BatteryReading[]>('battery-data', []);
  const [currentData, setCurrentData] = useState<BatteryReading[]>([]);
  const [temperatureUnit, setTemperatureUnit] = useKV<TemperatureUnit>('temperature-unit', 'C');
  const [currentAnalysis, setCurrentAnalysis] = useState<BatteryAnalysis | null>(null);

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

  const toggleTemperatureUnit = () => {
    setTemperatureUnit((current) => current === 'C' ? 'F' : 'C');
  };

  const celsiusToFahrenheit = (celsius: number) => (celsius * 9/5) + 32;

  const getAvgTemperature = () => {
    const avgCelsius = displayData.reduce((sum, r) => sum + r.temperature, 0) / displayData.length;
    return temperatureUnit === 'C' ? avgCelsius : celsiusToFahrenheit(avgCelsius);
  };

  const handleExportPDF = () => {
    if (!currentAnalysis) {
      toast.error('Analysis not available yet. Please wait for the analysis to complete.');
      return;
    }

    try {
      generatePDFReport({
        readings: displayData,
        analysis: currentAnalysis,
        temperatureUnit: temperatureUnit || 'C'
      });
      toast.success('PDF report downloaded successfully!');
    } catch (error) {
      toast.error('Failed to generate PDF report');
      console.error('PDF generation error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <header className="mb-10 flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <BatteryChargingVertical size={20} weight="bold" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">EV Battery Health</h1>
              <p className="text-sm text-muted-foreground">Telemetry analysis</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {hasData && (
              <Button 
                onClick={toggleTemperatureUnit} 
                variant="outline" 
                size="sm"
                className="gap-2"
              >
                <Thermometer size={16} />
                °{temperatureUnit}
              </Button>
            )}
            {hasData && currentAnalysis && (
              <Button 
                onClick={handleExportPDF} 
                variant="default" 
                size="sm"
                className="gap-2"
              >
                <FilePdf size={16} />
                Export PDF
              </Button>
            )}
            {hasData && (
              <Button onClick={handleReset} variant="ghost" size="sm" className="gap-2">
                <ArrowClockwise size={16} />
                Reset
              </Button>
            )}
          </div>
        </header>

        {!hasData ? (
          <main className="mx-auto max-w-xl">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold tracking-tight">Analyze a battery log</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Upload a CSV file to review voltage, temperature, and health insights.
              </p>
            </div>
            <FileUpload onDataParsed={handleDataParsed} />
          </main>
        ) : (
          <main className="space-y-10">
            <section className="grid grid-cols-2 gap-y-5 border-y border-border py-5 sm:grid-cols-4">
              <div>
                <div className="text-xl font-semibold">{displayData.length}</div>
                <div className="text-xs text-muted-foreground">Data points</div>
              </div>
              <div>
                <div className="text-xl font-semibold">
                  {(displayData.reduce((sum, r) => sum + r.voltage, 0) / displayData.length).toFixed(2)}V
                </div>
                <div className="text-xs text-muted-foreground">Average voltage</div>
              </div>
              <div>
                <div className="text-xl font-semibold">
                  {getAvgTemperature().toFixed(1)}°{temperatureUnit}
                </div>
                <div className="text-xs text-muted-foreground">Average temperature</div>
              </div>
              <div>
                <div className="text-xl font-semibold">
                  {(() => {
                    const firstTime = new Date(displayData[0].timestamp);
                    const lastTime = new Date(displayData[displayData.length - 1].timestamp);
                    const hours = (lastTime.getTime() - firstTime.getTime()) / (1000 * 60 * 60);
                    return hours > 24 ? `${Math.round(hours / 24)}d` : `${Math.round(hours)}h`;
                  })()}
                </div>
                <div className="text-xs text-muted-foreground">Time span</div>
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-base font-semibold">Telemetry</h2>
              <BatteryCharts readings={displayData} temperatureUnit={temperatureUnit || 'C'} />
            </section>

            <Separator />

            <section>
              <h2 className="mb-4 text-base font-semibold">Health analysis</h2>
              <AnalysisPanel 
                readings={displayData} 
                temperatureUnit={temperatureUnit || 'C'} 
                onAnalysisComplete={setCurrentAnalysis}
              />
            </section>

            <section className="border-t border-border pt-8">
              <h2 className="mb-4 text-base font-semibold">Replace data</h2>
              <FileUpload onDataParsed={handleDataParsed} />
            </section>
          </main>
        )}
      </div>
    </div>
  );
}

export default App;