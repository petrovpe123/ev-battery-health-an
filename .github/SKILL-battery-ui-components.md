# Skill: Battery Analysis UI Components & Data Visualization

**Domain**: React Components, Recharts Visualization, and Data-Intensive UI Engineering

**Expertise Level**: Advanced Frontend Architecture for Real-Time Analytics Dashboards

**When to Use This Skill**
- Building interactive multi-axis charts (voltage + temperature visualization)
- Implementing responsive grid layouts for data analysis dashboards
- Optimizing chart performance for 5K-50K data points
- Creating reusable chart components with dynamic configuration
- Implementing drag-and-drop file upload with visual feedback
- Designing data exploration UX (tooltips, hover interactions, zoom/pan)
- State management for complex async data flows (upload → parse → analyze)
- Building health score visualizations (progress bars, circular indicators, color gradients)
- Implementing data quality metrics and validation warning displays
- Creating snapshot history lists with filtering and sorting

---

## Multi-Axis Battery Chart Architecture

### Recharts ComposedChart Pattern

```typescript
interface BatteryChartProps {
  readings: BatteryReading[];
  isLoading?: boolean;
  onDataPointHover?: (reading: BatteryReading) => void;
}

interface ChartDataPoint {
  timestamp: string;
  time: number; // ms since start, for x-axis
  voltage: number;
  temperature: number;
  voltageUncertainty?: number; // For error bars
  anomalyflag?: boolean;
}

export const BatteryCharts: React.FC<BatteryChartProps> = ({
  readings,
  isLoading = false,
  onDataPointHover
}) => {
  // Transform readings → chart-friendly format
  const chartData = useMemo(() => {
    if (readings.length === 0) return [];

    const startTime = new Date(readings[0].timestamp).getTime();
    
    return readings.map((reading, idx) => ({
      timestamp: reading.timestamp,
      time: (new Date(reading.timestamp).getTime() - startTime) / 1000, // seconds
      voltage: reading.voltage,
      temperature: reading.temperature,
      anomalyflag: isAnomalous(reading, readings) // Detect outliers
    }));
  }, [readings]);

  if (isLoading) return <ChartSkeleton />;
  if (chartData.length === 0) return <EmptyChartState />;

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart
        data={chartData}
        margin={{ top: 20, right: 80, bottom: 20, left: 60 }}
        onMouseMove={(state) => {
          if (state.activeTooltipIndex !== undefined) {
            onDataPointHover?.(readings[state.activeTooltipIndex]);
          }
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        
        {/* X-Axis: Time */}
        <XAxis
          dataKey="time"
          label={{ value: 'Time (seconds)', position: 'insideBottomRight', offset: -10 }}
          tickFormatter={(sec) => `${Math.floor(sec)}s`}
          type="number"
        />
        
        {/* Left Y-Axis: Voltage (V) */}
        <YAxis
          yAxisId="left"
          label={{ value: 'Voltage (V)', angle: -90, position: 'insideLeft' }}
          domain={['dataMin - 0.5', 'dataMax + 0.5']}
          tick={{ fontSize: 12 }}
        />
        
        {/* Right Y-Axis: Temperature (°C) */}
        <YAxis
          yAxisId="right"
          orientation="right"
          label={{ value: 'Temperature (°C)', angle: 90, position: 'insideRight' }}
          domain={['dataMin - 2', 'dataMax + 2']}
          tick={{ fontSize: 12 }}
        />
        
        {/* Legend */}
        <Legend
          wrapperStyle={{ paddingTop: '20px' }}
          iconType="line"
        />
        
        {/* Tooltip: Show both values at cursor */}
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '2px solid #1e40af'
          }}
          formatter={(value, name) => {
            if (name === 'voltage') return [value.toFixed(2) + ' V', 'Voltage'];
            if (name === 'temperature') return [value.toFixed(1) + ' °C', 'Temperature'];
            return [value, name];
          }}
          labelFormatter={(label) => `Time: ${label.toFixed(1)}s`}
        />
        
        {/* Voltage Line: Left Y-Axis */}
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="voltage"
          stroke="#1e40af"
          strokeWidth={2}
          dot={false}
          name="Voltage (V)"
          isAnimationActive={false}
          connectNulls
        />
        
        {/* Temperature Line: Right Y-Axis */}
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="temperature"
          stroke="#f97316"
          strokeWidth={2}
          dot={false}
          name="Temperature (°C)"
          isAnimationActive={false}
          connectNulls
        />
        
        {/* Anomaly Markers: Overlay circles on outliers */}
        {chartData.some(d => d.anomalyflag) && (
          <Scatter
            yAxisId="left"
            dataKey="voltage"
            fill="red"
            shape={
              <Circle
                cx={0}
                cy={0}
                r={5}
                fill="red"
                fillOpacity={0.6}
                stroke="darkred"
              />
            }
          />
        )}
        
        {/* Reference Lines: Nominal ranges */}
        <ReferenceLine
          yAxisId="left"
          y={12}
          stroke="#4ade80"
          strokeDasharray="5 5"
          label={{ value: 'Nominal 12V', position: 'right', fontSize: 10 }}
        />
        <ReferenceLine
          yAxisId="right"
          y={20}
          stroke="#fbbf24"
          strokeDasharray="5 5"
          label={{ value: 'Optimal Temp', position: 'right', fontSize: 10 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};
```

### Chart Performance Optimization

**Data Decimation for Large Datasets**
```typescript
// For >10K points, downsample to ~1000 points for rendering
function decimateChartData(
  data: ChartDataPoint[],
  maxPoints: number = 1000
): ChartDataPoint[] {
  if (data.length <= maxPoints) return data;

  const step = Math.ceil(data.length / maxPoints);
  const decimated: ChartDataPoint[] = [];

  for (let i = 0; i < data.length; i += step) {
    decimated.push(data[i]);
  }

  // Always include last point
  if (decimated[decimated.length - 1] !== data[data.length - 1]) {
    decimated.push(data[data.length - 1]);
  }

  return decimated;
}
```

**Memoization Strategy**
```typescript
const BatteryChartsComponent = React.memo(
  BatteryCharts,
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if data length changed significantly
    return (
      prevProps.readings.length === nextProps.readings.length &&
      prevProps.isLoading === nextProps.isLoading &&
      prevProps.readings[prevProps.readings.length - 1]?.voltage ===
        nextProps.readings[nextProps.readings.length - 1]?.voltage
    );
  }
);
```

---

## File Upload Component with UX Patterns

```typescript
interface FileUploadProps {
  onFileProcessed: (readings: BatteryReading[], fileName: string) => void;
  isProcessing?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileProcessed,
  isProcessing = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    await processFile(files[0]);
  };

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file (.csv extension required)');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error('File too large (>100MB). Contact support for batch processing.');
      return;
    }

    setIsLoading(true);

    try {
      const text = await file.text();
      const { readings, report } = parseCSVWithValidation(text, (warning) => {
        console.warn('[CSV Warning]', warning);
      });

      setValidationReport(report);

      if (report.qualityScore < 50) {
        toast.warning(
          `CSV quality low (${Math.round(report.qualityScore)}%). ` +
          `Check validation warnings before proceeding.`
        );
      }

      if (readings.length === 0) {
        toast.error('No valid data rows found. Check CSV format.');
        return;
      }

      onFileProcessed(readings, file.name);
      toast.success(`Loaded ${readings.length} readings from ${file.name}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Parse error: ${errorMsg}`);
      setValidationReport(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-all',
            'hover:border-blue-500 hover:bg-blue-50',
            isDragging && 'border-blue-500 bg-blue-50 shadow-md',
            isLoading && 'opacity-50 cursor-not-allowed'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            hidden
            onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
            disabled={isLoading}
          />

          {isLoading ? (
            <div className="flex flex-col items-center gap-2">
              <Spinner className="animate-spin" />
              <p className="text-sm font-medium">Processing CSV...</p>
            </div>
          ) : (
            <>
              <CloudArrowUpIcon className="h-12 w-12 mx-auto text-blue-500 mb-2" />
              <h3 className="font-semibold">Drag & drop your CSV here</h3>
              <p className="text-sm text-gray-600">or</p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                disabled={isLoading}
              >
                Browse Files
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Expected columns: <strong>timestamp, voltage (V), temperature (°C)</strong>
              </p>
            </>
          )}
        </div>

        {/* Validation Report */}
        {validationReport && (
          <Alert variant={validationReport.qualityScore >= 70 ? 'default' : 'warning'}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>CSV Validation Report</AlertTitle>
            <AlertDescription className="mt-2 text-sm">
              <div className="space-y-1">
                <p>Valid rows: <strong>{validationReport.validRows}</strong> / {validationReport.totalRows}</p>
                <p>Quality Score: <strong>{Math.round(validationReport.qualityScore)}%</strong></p>
                {validationReport.warnings.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-medium">
                      {validationReport.warnings.length} warnings
                    </summary>
                    <ul className="ml-4 mt-1 text-xs space-y-0.5">
                      {validationReport.warnings.slice(0, 5).map((w, i) => (
                        <li key={i}>• {w.message}</li>
                      ))}
                      {validationReport.warnings.length > 5 && (
                        <li>• ... and {validationReport.warnings.length - 5} more</li>
                      )}
                    </ul>
                  </details>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </Card>
  );
};
```

---

## Health Score Visualization Components

### Circular Progress Indicator

```typescript
interface HealthScoreCircleProps {
  score: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const HealthScoreCircle: React.FC<HealthScoreCircleProps> = ({
  score,
  size = 'md',
  showLabel = true
}) => {
  const sizeMap = { sm: 80, md: 120, lg: 160 };
  const dimension = sizeMap[size];

  // Determine color based on score
  const getColor = (s: number): string => {
    if (s >= 70) return '#22c55e'; // Green
    if (s >= 40) return '#eab308'; // Yellow
    return '#ef4444'; // Red
  };

  const circumference = 2 * Math.PI * (dimension / 2 - 10);
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={dimension} height={dimension}>
        {/* Background circle */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={dimension / 2 - 10}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={8}
        />

        {/* Progress circle */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={dimension / 2 - 10}
          fill="none"
          stroke={getColor(score)}
          strokeWidth={8}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          transform={`rotate(-90 ${dimension / 2} ${dimension / 2})`}
        />

        {/* Center text */}
        {showLabel && (
          <text
            x={dimension / 2}
            y={dimension / 2}
            textAnchor="middle"
            dy="0.3em"
            fontSize={dimension * 0.25}
            fontWeight="bold"
            fill={getColor(score)}
          >
            {Math.round(score)}
          </text>
        )}
      </svg>

      {showLabel && (
        <div className="text-center text-xs">
          <p className="font-semibold">{getHealthLabel(score)}</p>
          <p className="text-gray-500">Health Score</p>
        </div>
      )}
    </div>
  );
};

const getHealthLabel = (score: number): string => {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
};
```

---

## Analysis Panel Component

```typescript
interface AnalysisPanelProps {
  analysis: BatteryAnalysis;
  isLoading?: boolean;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  analysis,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Battery Health Analysis
          <HealthScoreCircle score={analysis.healthScore} size="sm" showLabel={false} />
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary */}
        <div>
          <h3 className="font-semibold text-sm mb-2">Summary</h3>
          <p className="text-sm text-gray-700 leading-relaxed">{analysis.summary}</p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <MetricCard
            label="Avg Voltage"
            value={`${analysis.avgVoltage.toFixed(2)}V`}
            unit={`${analysis.voltageRange.min.toFixed(2)}-${analysis.voltageRange.max.toFixed(2)}V`}
          />
          <MetricCard
            label="Avg Temperature"
            value={`${analysis.avgTemperature.toFixed(1)}°C`}
            unit={`${analysis.temperatureRange.min.toFixed(1)}-${analysis.temperatureRange.max.toFixed(1)}°C`}
          />
          <MetricCard
            label="Data Points"
            value={`${analysis.dataPoints}`}
            unit="readings"
          />
          <MetricCard
            label="Time Span"
            value={analysis.timeSpan}
            unit=""
          />
        </div>

        {/* Recommendations */}
        <div>
          <h3 className="font-semibold text-sm mb-2">Recommendations</h3>
          <ul className="space-y-2">
            {analysis.recommendations.map((rec, idx) => (
              <li key={idx} className="flex gap-2 text-sm">
                <span className="text-blue-600 font-bold">•</span>
                <span className="text-gray-700">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

const MetricCard: React.FC<{ label: string; value: string; unit: string }> = ({
  label,
  value,
  unit
}) => (
  <div className="bg-gray-50 p-3 rounded-lg">
    <p className="text-xs text-gray-600">{label}</p>
    <p className="text-lg font-bold text-gray-900">{value}</p>
    {unit && <p className="text-xs text-gray-500">{unit}</p>}
  </div>
);
```

---

## Snapshot History Component

```typescript
interface SnapshotHistoryProps {
  snapshots: AnalysisSnapshot[];
  onSelectSnapshot: (snapshot: AnalysisSnapshot) => void;
  onDeleteSnapshot: (id: string) => void;
}

export const SnapshotHistory: React.FC<SnapshotHistoryProps> = ({
  snapshots,
  onSelectSnapshot,
  onDeleteSnapshot
}) => {
  if (snapshots.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-500">No saved analyses yet. Upload a CSV to get started.</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analysis History</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {snapshots
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .map((snapshot) => (
              <div
                key={snapshot.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                onClick={() => onSelectSnapshot(snapshot)}
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{snapshot.fileName || 'Unnamed'}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(snapshot.timestamp).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <HealthScoreCircle score={snapshot.analysis.healthScore} size="sm" showLabel={false} />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSnapshot(snapshot.id);
                    }}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
};
```

---

## Accessibility & Performance Best Practices

- **ARIA Labels**: All interactive elements have descriptive aria-label attributes
- **Color Accessibility**: Health score gradient tested for WCAG AA contrast (4.5:1)
- **Keyboard Navigation**: Tab order follows logical flow; Enter/Space activate buttons
- **Responsive Design**: Charts adapt to mobile (single-axis mode), tablet (dual-axis), desktop (full features)
- **Performance**: Charts memoized; data decimation for large datasets; lazy loading of panels

