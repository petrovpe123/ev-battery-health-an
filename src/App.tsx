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
  const featureHighlights = [
    { label: 'CSV', description: 'Import logs' },
    { label: 'AI', description: 'Health analysis' },
    { label: 'PDF', description: 'Export reports' },
  ];

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
    <div className="app-shell min-h-screen bg-background">
      <Toaster />
      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
        <header className="glass-panel mb-10 flex flex-col gap-5 rounded-3xl p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
              <BatteryChargingVertical size={26} weight="bold" />
            </div>
            <div>
              <p className="eyebrow">Telemetry studio</p>
              <h1 className="text-xl font-bold tracking-tight">EV Battery Health</h1>
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
          <main className="mx-auto max-w-3xl">
            <div className="mb-8 text-center">
              <p className="eyebrow mb-3 text-sm tracking-[0.25em]">Battery intelligence, unlocked</p>
              <h2 className="text-4xl font-bold tracking-tight sm:text-6xl">Turn raw telemetry<br />into clear insights.</h2>
              <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
                Visualize voltage stability, thermal behavior, and AI-powered battery health in one focused workspace.
              </p>
            </div>
            <FileUpload onDataParsed={handleDataParsed} />
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              {featureHighlights.map(({ label, description }) => (
                <div key={label} className="glass-panel rounded-2xl p-4">
                  <div className="text-lg font-bold text-primary">{label}</div>
                  <div className="text-xs text-muted-foreground">{description}</div>
                </div>
              ))}
            </div>
          </main>
        ) : (
          <main className="space-y-10">
            <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="metric-card">
                <div className="metric-value">{displayData.length}</div>
                <div className="metric-label">Data points</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">
                  {(displayData.reduce((sum, r) => sum + r.voltage, 0) / displayData.length).toFixed(2)}V
                </div>
                <div className="metric-label">Average voltage</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">
                  {getAvgTemperature().toFixed(1)}°{temperatureUnit}
                </div>
                <div className="metric-label">Average temperature</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">
                  {(() => {
                    const firstTime = new Date(displayData[0].timestamp);
                    const lastTime = new Date(displayData[displayData.length - 1].timestamp);
                    const hours = (lastTime.getTime() - firstTime.getTime()) / (1000 * 60 * 60);
                    return hours > 24 ? `${Math.round(hours / 24)}d` : `${Math.round(hours)}h`;
                  })()}
                </div>
                <div className="metric-label">Time span</div>
              </div>
            </section>

            <section>
              <div className="mb-4">
                <p className="eyebrow">Live view</p>
                <h2 className="text-2xl font-bold tracking-tight">Telemetry trends</h2>
              </div>
              <BatteryCharts readings={displayData} temperatureUnit={temperatureUnit || 'C'} />
            </section>

            <Separator />

            <section>
              <div className="mb-4">
                <p className="eyebrow">Diagnosis</p>
                <h2 className="text-2xl font-bold tracking-tight">Health analysis</h2>
              </div>
              <AnalysisPanel 
                readings={displayData} 
                temperatureUnit={temperatureUnit || 'C'} 
                onAnalysisComplete={setCurrentAnalysis}
              />
            </section>

            <section className="glass-panel rounded-3xl p-5 sm:p-6">
              <h2 className="mb-1 text-xl font-bold">Analyze another log</h2>
              <p className="mb-5 text-sm text-muted-foreground">Replace the current dataset with a new telemetry CSV.</p>
              <FileUpload onDataParsed={handleDataParsed} />
            </section>
          </main>
        )}
      </div>
    </div>
  );
}

export default App;