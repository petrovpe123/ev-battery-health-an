import { describe, expect, it } from 'vitest';

import { parseCSV } from './battery-analysis';

describe('parseCSV', () => {
  it('keeps rows with voltage and temperature values inside the allowed ranges', () => {
    const readings = parseCSV(`timestamp,voltage,temperature
2026-01-01T00:00:00Z,12.4,24
2026-01-01T01:00:00Z,14.1,31`);

    expect(readings).toEqual([
      { timestamp: '2026-01-01T00:00:00Z', voltage: 12.4, temperature: 24 },
      { timestamp: '2026-01-01T01:00:00Z', voltage: 14.1, temperature: 31 },
    ]);
  });

  it('keeps rows exactly on the voltage and temperature boundaries', () => {
    const readings = parseCSV(`timestamp,voltage,temperature
2026-01-01T00:00:00Z,7,-50
2026-01-01T01:00:00Z,16,80`);

    expect(readings).toEqual([
      { timestamp: '2026-01-01T00:00:00Z', voltage: 7, temperature: -50 },
      { timestamp: '2026-01-01T01:00:00Z', voltage: 16, temperature: 80 },
    ]);
  });

  it('drops rows with voltage or temperature values outside the allowed ranges', () => {
    const readings = parseCSV(`timestamp,voltage,temperature
2026-01-01T00:00:00Z,6.99,20
2026-01-01T01:00:00Z,16.01,20
2026-01-01T02:00:00Z,12,-50.01
2026-01-01T03:00:00Z,12,80.01
2026-01-01T04:00:00Z,12,20`);

    expect(readings).toEqual([
      { timestamp: '2026-01-01T04:00:00Z', voltage: 12, temperature: 20 },
    ]);
  });
});
