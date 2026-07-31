import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { cleanup, render } from '@testing-library/react';

import { AnalysisPanel } from '@/components/AnalysisPanel';
import { BatteryAnalysis, BatteryReading } from '@/lib/types';
import { generateAIAnalysis } from '@/lib/battery-analysis';

vi.mock('@/lib/battery-analysis', () => ({
  generateAIAnalysis: vi.fn(),
}));

const mockedGenerateAIAnalysis = vi.mocked(generateAIAnalysis);

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return { promise, resolve };
}

const baseReadings: BatteryReading[] = [
  { timestamp: '2026-01-01T00:00:00Z', voltage: 12.4, temperature: 20 },
  { timestamp: '2026-01-01T01:00:00Z', voltage: 12.5, temperature: 21 },
];

const analysisResult = (summary: string): BatteryAnalysis => ({
  healthScore: 88,
  summary,
  recommendations: ['Keep monitoring'],
  avgVoltage: 12.45,
  avgTemperature: 20.5,
  voltageRange: { min: 12.4, max: 12.5 },
  temperatureRange: { min: 20, max: 21 },
  dataPoints: 2,
  timeSpan: '1 hours',
});

describe('AnalysisPanel', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('does not report analysis completion after unmount', async () => {
    vi.useFakeTimers();

    const deferred = createDeferred<BatteryAnalysis>();
    mockedGenerateAIAnalysis.mockReturnValueOnce(deferred.promise);

    const onAnalysisComplete = vi.fn();
    const view = render(
      <AnalysisPanel readings={baseReadings} temperatureUnit="C" onAnalysisComplete={onAnalysisComplete} />
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(mockedGenerateAIAnalysis).toHaveBeenCalledWith(baseReadings);

    view.unmount();
    deferred.resolve(analysisResult('stale result'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(onAnalysisComplete).not.toHaveBeenCalled();
  });

  it('ignores stale async results when readings change', async () => {
    vi.useFakeTimers();

    const firstRun = createDeferred<BatteryAnalysis>();
    const secondRun = createDeferred<BatteryAnalysis>();
    mockedGenerateAIAnalysis
      .mockReturnValueOnce(firstRun.promise)
      .mockReturnValueOnce(secondRun.promise);

    const onAnalysisComplete = vi.fn();
    const nextReadings: BatteryReading[] = [
      ...baseReadings,
      { timestamp: '2026-01-01T02:00:00Z', voltage: 12.6, temperature: 22 },
    ];

    const view = render(
      <AnalysisPanel readings={baseReadings} temperatureUnit="C" onAnalysisComplete={onAnalysisComplete} />
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    view.rerender(
      <AnalysisPanel readings={nextReadings} temperatureUnit="C" onAnalysisComplete={onAnalysisComplete} />
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    secondRun.resolve(analysisResult('latest result'));

    await act(async () => {
      await Promise.resolve();
    });

    firstRun.resolve(analysisResult('stale result'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(onAnalysisComplete).toHaveBeenCalledTimes(1);
    expect(onAnalysisComplete).toHaveBeenCalledWith(
      expect.objectContaining({ summary: 'latest result' })
    );
  });
});
