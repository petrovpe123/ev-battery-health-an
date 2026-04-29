import { BatteryReading } from '../lib/types';

type IncomingMessage = {
  type: 'parse';
  content: string;
};

type OutgoingMessage =
  | { type: 'progress'; progress: number }
  | { type: 'result'; readings: BatteryReading[] }
  | { type: 'error'; message: string };

const CHUNK_SIZE = 1000;

async function parseCSVInChunks(csvContent: string): Promise<BatteryReading[]> {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file is empty or missing data rows');
  }

  const headers = lines[0].toLowerCase().split(',').map(h => h.trim());

  const timestampIndex = headers.findIndex(h => h.includes('timestamp') || h.includes('time'));
  const voltageIndex = headers.findIndex(h => h.includes('voltage'));
  const temperatureIndex = headers.findIndex(h => h.includes('temperature') || h.includes('temp'));

  if (timestampIndex === -1 || voltageIndex === -1 || temperatureIndex === -1) {
    throw new Error('CSV must contain timestamp, voltage, and temperature columns');
  }

  const dataLines = lines.slice(1);
  const totalLines = dataLines.length;
  const readings: BatteryReading[] = [];

  for (let i = 0; i < totalLines; i += CHUNK_SIZE) {
    const chunk = dataLines.slice(i, i + CHUNK_SIZE);

    for (const line of chunk) {
      if (!line.trim()) continue;
      const values = line.split(',').map(v => v.trim());

      const maxIndex = Math.max(timestampIndex, voltageIndex, temperatureIndex);
      if (values.length > maxIndex) {
        const timestamp = values[timestampIndex];
        const voltage = parseFloat(values[voltageIndex]);
        const temperature = parseFloat(values[temperatureIndex]);

        if (!isNaN(voltage) && !isNaN(temperature)) {
          readings.push({ timestamp, voltage, temperature });
        }
      }
    }

    // Report progress in the 20–90 % range while parsing rows
    const parseProgress = Math.round(20 + ((i + chunk.length) / totalLines) * 70);
    const msg: OutgoingMessage = { type: 'progress', progress: Math.min(parseProgress, 90) };
    self.postMessage(msg);

    // Yield to keep the worker event-loop responsive
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  }

  return readings.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

self.onmessage = async (e: MessageEvent<IncomingMessage>) => {
  if (e.data.type !== 'parse') return;

  try {
    const readings = await parseCSVInChunks(e.data.content);
    const result: OutgoingMessage = { type: 'result', readings };
    self.postMessage(result);
  } catch (err) {
    const error: OutgoingMessage = {
      type: 'error',
      message: err instanceof Error ? err.message : 'Failed to parse CSV file',
    };
    self.postMessage(error);
  }
};
