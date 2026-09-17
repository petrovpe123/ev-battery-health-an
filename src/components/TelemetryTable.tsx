import React, { useEffect, useMemo, useState } from 'react';
import { BatteryReading, TemperatureUnit } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { format } from 'date-fns';

interface TelemetryTableProps {
  readings: BatteryReading[];
  temperatureUnit: TemperatureUnit;
}

const ROWS_PER_PAGE = 25;

function toNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function TelemetryTable({ readings, temperatureUnit }: TelemetryTableProps) {
  const [timestampQuery, setTimestampQuery] = useState('');
  const [minVoltage, setMinVoltage] = useState('');
  const [maxVoltage, setMaxVoltage] = useState('');
  const [minTemperature, setMinTemperature] = useState('');
  const [maxTemperature, setMaxTemperature] = useState('');
  const [page, setPage] = useState(1);

  const celsiusToFahrenheit = (celsius: number) => (celsius * 9 / 5) + 32;
  const convertTemperature = (celsius: number) => (
    temperatureUnit === 'C' ? celsius : celsiusToFahrenheit(celsius)
  );
  const displayTemperatureToCelsius = (temperature: number) => (
    temperatureUnit === 'C' ? temperature : (temperature - 32) * 5 / 9
  );

  const filteredReadings = useMemo(() => {
    const minimumVoltage = toNumber(minVoltage);
    const maximumVoltage = toNumber(maxVoltage);
    const minimumTemperature = toNumber(minTemperature);
    const maximumTemperature = toNumber(maxTemperature);
    const minimumTemperatureCelsius = minimumTemperature === null
      ? null
      : displayTemperatureToCelsius(minimumTemperature);
    const maximumTemperatureCelsius = maximumTemperature === null
      ? null
      : displayTemperatureToCelsius(maximumTemperature);
    const normalizedQuery = timestampQuery.trim().toLowerCase();

    return readings.filter((reading) => {
      const timestampMatches = normalizedQuery === '' || reading.timestamp.toLowerCase().includes(normalizedQuery);
      const voltageMatches = (minimumVoltage === null || reading.voltage >= minimumVoltage)
        && (maximumVoltage === null || reading.voltage <= maximumVoltage);
      const temperatureMatches = (minimumTemperatureCelsius === null || reading.temperature >= minimumTemperatureCelsius)
        && (maximumTemperatureCelsius === null || reading.temperature <= maximumTemperatureCelsius);

      return timestampMatches && voltageMatches && temperatureMatches;
    });
  }, [maxTemperature, maxVoltage, minTemperature, minVoltage, readings, timestampQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredReadings.length / ROWS_PER_PAGE));
  const visibleReadings = filteredReadings.slice(
    (page - 1) * ROWS_PER_PAGE,
    page * ROWS_PER_PAGE
  );

  useEffect(() => {
    setPage(1);
  }, [maxTemperature, maxVoltage, minTemperature, minVoltage, timestampQuery]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const clearFilters = () => {
    setTimestampQuery('');
    setMinVoltage('');
    setMaxVoltage('');
    setMinTemperature('');
    setMaxTemperature('');
  };

  const hasFilters = [timestampQuery, minVoltage, maxVoltage, minTemperature, maxTemperature]
    .some((value) => value !== '');

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Telemetry Explorer</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Inspect individual readings and narrow the dataset by timestamp, voltage, or temperature.
            </p>
          </div>
          {hasFilters && (
            <Button onClick={clearFilters} variant="outline" size="sm" className="gap-2 self-start">
              <X size={16} />
              Clear filters
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-1">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search timestamps"
              value={timestampQuery}
              onChange={(event) => setTimestampQuery(event.target.value)}
              placeholder="Search timestamp"
              className="pl-9"
            />
          </div>
          <Input
            aria-label="Minimum voltage"
            type="number"
            min="0"
            step="0.01"
            value={minVoltage}
            onChange={(event) => setMinVoltage(event.target.value)}
            placeholder="Min voltage (V)"
          />
          <Input
            aria-label="Maximum voltage"
            type="number"
            min="0"
            step="0.01"
            value={maxVoltage}
            onChange={(event) => setMaxVoltage(event.target.value)}
            placeholder="Max voltage (V)"
          />
          <Input
            aria-label={`Minimum temperature in ${temperatureUnit}`}
            type="number"
            step="0.1"
            value={minTemperature}
            onChange={(event) => setMinTemperature(event.target.value)}
            placeholder={`Min temp (°${temperatureUnit})`}
          />
          <Input
            aria-label={`Maximum temperature in ${temperatureUnit}`}
            type="number"
            step="0.1"
            value={maxTemperature}
            onChange={(event) => setMaxTemperature(event.target.value)}
            placeholder={`Max temp (°${temperatureUnit})`}
          />
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {filteredReadings.length === 0 ? 0 : (page - 1) * ROWS_PER_PAGE + 1}
            -{Math.min(page * ROWS_PER_PAGE, filteredReadings.length)} of {filteredReadings.length} matching readings
          </span>
          <span>{readings.length} total</span>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead className="text-right">Voltage</TableHead>
                <TableHead className="text-right">Temperature</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleReadings.length > 0 ? visibleReadings.map((reading) => (
                <TableRow key={`${reading.timestamp}-${reading.voltage}-${reading.temperature}`}>
                  <TableCell className="font-mono text-xs">
                    {format(new Date(reading.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                  </TableCell>
                  <TableCell className="text-right font-mono">{reading.voltage.toFixed(2)}V</TableCell>
                  <TableCell className="text-right font-mono">
                    {convertTemperature(reading.temperature).toFixed(1)}°{temperatureUnit}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    No readings match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              disabled={page === 1}
              variant="outline"
              size="sm"
            >
              Previous
            </Button>
            <Button
              onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
              disabled={page === totalPages}
              variant="outline"
              size="sm"
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}