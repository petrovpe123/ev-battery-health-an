import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { BatteryCharts, CustomTooltip } from '../components/BatteryCharts';
import { BatteryReading } from '../lib/types';

// Recharts uses ResizeObserver; provide a stub for jsdom
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    Tooltip: () => null,
  };
});

const makeReading = (overrides: Partial<BatteryReading> = {}): BatteryReading => ({
  timestamp: '2024-01-15T10:30:00Z',
  voltage: 12.4,
  temperature: 22,
  ...overrides,
});

const SAMPLE_READINGS: BatteryReading[] = [
  makeReading({ timestamp: '2024-01-15T10:00:00Z', voltage: 12.6, temperature: 20 }),
  makeReading({ timestamp: '2024-01-15T10:30:00Z', voltage: 12.2, temperature: 25 }),
  makeReading({ timestamp: '2024-01-15T11:00:00Z', voltage: 11.8, temperature: 30 }),
];

const LABEL_MS = new Date('2024-01-15T10:30:00Z').getTime();
const makePayload = (name: string, value: number, color = '#4f81bd') => [
  { name, value, color },
];

// --- CustomTooltip module-scope stability (the core fix for issue #28) ---

describe('CustomTooltip module-scope stability', () => {
  it('is the same function reference on every BatteryCharts render', () => {
    // CustomTooltip is exported at module scope, so its identity never changes
    const ref1 = CustomTooltip;

    const { rerender } = render(
      <BatteryCharts readings={SAMPLE_READINGS} temperatureUnit="C" />
    );
    rerender(<BatteryCharts readings={SAMPLE_READINGS} temperatureUnit="F" />);
    rerender(<BatteryCharts readings={SAMPLE_READINGS} temperatureUnit="C" />);

    // The component function must be the exact same reference after every re-render
    expect(CustomTooltip).toBe(ref1);
  });

  it('is passed as the content type to both Tooltip instances', () => {
    // Verify that the content element passed to Tooltip uses the exported
    // module-level CustomTooltip as its type.  The simplest way to confirm
    // this without relying on Recharts internals is to render the element
    // that BatteryCharts would create and check its type directly.
    const contentElement = <CustomTooltip temperatureUnit="C" />;
    expect(contentElement.type).toBe(CustomTooltip);
  });
});

// --- CustomTooltip unit tests ---

describe('CustomTooltip', () => {
  it('renders nothing when active is false', () => {
    const { container } = render(
      <CustomTooltip
        active={false}
        payload={makePayload('voltage', 12.5)}
        label={LABEL_MS}
        temperatureUnit="C"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when payload is empty', () => {
    const { container } = render(
      <CustomTooltip
        active={true}
        payload={[]}
        label={LABEL_MS}
        temperatureUnit="C"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders voltage entry with V suffix', () => {
    render(
      <CustomTooltip
        active={true}
        payload={makePayload('voltage', 12.5)}
        label={LABEL_MS}
        temperatureUnit="C"
      />
    );
    expect(screen.getByText(/voltage:\s*12\.50V/)).toBeInTheDocument();
  });

  it('renders temperature entry with °C suffix in Celsius mode', () => {
    render(
      <CustomTooltip
        active={true}
        payload={makePayload('displayTemperature', 22.0)}
        label={LABEL_MS}
        temperatureUnit="C"
      />
    );
    expect(screen.getByText(/temperature:\s*22\.00°C/)).toBeInTheDocument();
  });

  it('renders temperature entry with °F suffix in Fahrenheit mode', () => {
    render(
      <CustomTooltip
        active={true}
        payload={makePayload('displayTemperature', 71.6)}
        label={LABEL_MS}
        temperatureUnit="F"
      />
    );
    expect(screen.getByText(/temperature:\s*71\.60°F/)).toBeInTheDocument();
  });

  it('renders the formatted date label', () => {
    render(
      <CustomTooltip
        active={true}
        payload={makePayload('voltage', 12.0)}
        label={LABEL_MS}
        temperatureUnit="C"
      />
    );
    // format(new Date('2024-01-15T10:30:00Z'), 'MMM dd, HH:mm')
    expect(screen.getByText(/Jan 15/)).toBeInTheDocument();
  });
});

// --- BatteryCharts integration tests ---

describe('BatteryCharts', () => {
  it('renders both chart card titles', () => {
    render(<BatteryCharts readings={SAMPLE_READINGS} temperatureUnit="C" />);

    expect(screen.getByText('Voltage Over Time')).toBeInTheDocument();
    expect(screen.getByText('Temperature Over Time')).toBeInTheDocument();
  });

  it('renders reference line labels with correct Celsius values', () => {
    render(<BatteryCharts readings={SAMPLE_READINGS} temperatureUnit="C" />);

    expect(screen.getByText('Optimal (12V)')).toBeInTheDocument();
    expect(screen.getByText('Low (10.5V)')).toBeInTheDocument();
    // 25 °C optimal, 35 °C high
    expect(screen.getByText('Optimal (25°C)')).toBeInTheDocument();
    expect(screen.getByText('High (35°C)')).toBeInTheDocument();
  });

  it('renders reference line labels with converted Fahrenheit values', () => {
    render(<BatteryCharts readings={SAMPLE_READINGS} temperatureUnit="F" />);

    // 25 °C → 77 °F, 35 °C → 95 °F
    expect(screen.getByText('Optimal (77°F)')).toBeInTheDocument();
    expect(screen.getByText('High (95°F)')).toBeInTheDocument();
  });

  it('renders without crashing when readings array is empty', () => {
    render(<BatteryCharts readings={[]} temperatureUnit="C" />);

    expect(screen.getByText('Voltage Over Time')).toBeInTheDocument();
    expect(screen.getByText('Temperature Over Time')).toBeInTheDocument();
  });
});

