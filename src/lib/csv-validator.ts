import Papa from 'papaparse';
import { BatteryReading } from './types';

export const CSV_LIMITS = {
  maxFileSizeBytes: 5 * 1024 * 1024,
  maxDataRows: 100_000,
  minReadings: 5,
  minVoltage: 8,
  maxVoltage: 16,
  minTemperature: -20,
  maxTemperature: 65
} as const;

export interface CSVValidationResult {
  readings: BatteryReading[];
  warnings: string[];
}

function normalizeHeader(header: string): string {
  return header.replace(/^\uFEFF/, '').trim().toLowerCase();
}

function findRequiredColumn(headers: string[], aliases: string[], label: string): number {
  const matches = headers
    .map((header, index) => ({ header, index }))
    .filter(({ header }) => aliases.some(alias => header.includes(alias)));

  if (matches.length === 0) {
    throw new Error(`CSV must contain a ${label} column`);
  }

  if (matches.length > 1) {
    throw new Error(`CSV contains multiple possible ${label} columns`);
  }

  return matches[0].index;
}

function parseNumericValue(value: string, label: string, rowNumber: number): number {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed)) {
    throw new Error(`Row ${rowNumber}: ${label} must be a finite number`);
  }

  return parsed;
}

export function parseCSVWithValidation(csvContent: string): CSVValidationResult {
  if (new TextEncoder().encode(csvContent).length > CSV_LIMITS.maxFileSizeBytes) {
    throw new Error('File size must be less than 5 MB');
  }

  const parsed = Papa.parse<string[]>(csvContent, {
    delimiter: ',',
    skipEmptyLines: 'greedy'
  });

  if (parsed.errors.length > 0) {
    const firstError = parsed.errors[0];
    throw new Error(`CSV parsing failed${firstError.message ? `: ${firstError.message}` : ''}`);
  }

  const rows = parsed.data;
  if (rows.length < 2) {
    throw new Error('CSV must contain a header row and at least one data row');
  }

  const dataRowCount = rows.length - 1;
  if (dataRowCount > CSV_LIMITS.maxDataRows) {
    throw new Error(`CSV contains too many data rows; the limit is ${CSV_LIMITS.maxDataRows.toLocaleString()}`);
  }

  const headers = rows[0].map(normalizeHeader);
  const timestampIndex = findRequiredColumn(headers, ['timestamp', 'time'], 'timestamp');
  const voltageIndex = findRequiredColumn(headers, ['voltage'], 'voltage');
  const temperatureIndex = findRequiredColumn(headers, ['temperature', 'temp'], 'temperature');

  const readings: BatteryReading[] = [];
  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index];
    const rowNumber = index + 1;
    if (row.length <= Math.max(timestampIndex, voltageIndex, temperatureIndex)) {
      throw new Error(`Row ${rowNumber}: missing one or more required values`);
    }

    const timestamp = row[timestampIndex].trim();
    if (!timestamp || !Number.isFinite(Date.parse(timestamp))) {
      throw new Error(`Row ${rowNumber}: timestamp is invalid`);
    }

    const voltage = parseNumericValue(row[voltageIndex], 'voltage', rowNumber);
    if (voltage < CSV_LIMITS.minVoltage || voltage > CSV_LIMITS.maxVoltage) {
      throw new Error(`Row ${rowNumber}: voltage must be between ${CSV_LIMITS.minVoltage}V and ${CSV_LIMITS.maxVoltage}V`);
    }

    const temperature = parseNumericValue(row[temperatureIndex], 'temperature', rowNumber);
    if (temperature < CSV_LIMITS.minTemperature || temperature > CSV_LIMITS.maxTemperature) {
      throw new Error(`Row ${rowNumber}: temperature must be between ${CSV_LIMITS.minTemperature}°C and ${CSV_LIMITS.maxTemperature}°C`);
    }

    readings.push({ timestamp, voltage, temperature });
  }

  if (readings.length < CSV_LIMITS.minReadings) {
    throw new Error(`CSV must contain at least ${CSV_LIMITS.minReadings} valid readings`);
  }

  const timestamps = new Set<string>();
  let duplicateCount = 0;
  for (const reading of readings) {
    if (timestamps.has(reading.timestamp)) {
      duplicateCount += 1;
    }
    timestamps.add(reading.timestamp);
  }

  const warnings = duplicateCount > 0
    ? [`${duplicateCount} duplicate timestamp${duplicateCount === 1 ? '' : 's'} found; all readings were retained`]
    : [];

  return {
    readings: readings.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)),
    warnings
  };
}
