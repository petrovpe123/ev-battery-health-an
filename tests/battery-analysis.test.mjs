import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const sourceUrl = new URL('../src/lib/battery-analysis.ts', import.meta.url);
const source = await readFile(sourceUrl, 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString('base64')}`;
const { generateAIAnalysis, parseCSV } = await import(moduleUrl);

const readings = [
  { timestamp: '2026-01-01T00:00:00Z', voltage: 12.4, temperature: 20 },
  { timestamp: '2026-01-01T01:00:00Z', voltage: 12.6, temperature: 22 },
];

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

test.afterEach(() => {
  if (originalWindow) {
    Object.defineProperty(globalThis, 'window', originalWindow);
  } else {
    Reflect.deleteProperty(globalThis, 'window');
  }
});

test('parseCSV parses valid input and sorts readings by timestamp', () => {
  const csv = [
    'timestamp,voltage,temperature',
    '2026-01-01T01:00:00Z,12.6,22',
    '2026-01-01T00:00:00Z,12.4,20',
  ].join('\n');

  assert.deepEqual(parseCSV(csv), [
    { timestamp: '2026-01-01T00:00:00Z', voltage: 12.4, temperature: 20 },
    { timestamp: '2026-01-01T01:00:00Z', voltage: 12.6, temperature: 22 },
  ]);
});

test('parseCSV throws when a required column is missing', () => {
  const csv = [
    'timestamp,voltage',
    '2026-01-01T00:00:00Z,12.4',
  ].join('\n');

  assert.throws(
    () => parseCSV(csv),
    /CSV must contain timestamp, voltage, and temperature columns/,
  );
});

test('parseCSV skips rows with invalid timestamps', () => {
  const csv = [
    'timestamp,voltage,temperature',
    'not-a-timestamp,12.4,20',
    '2026-01-01T00:00:00Z,12.5,21',
  ].join('\n');

  assert.deepEqual(parseCSV(csv), [
    { timestamp: '2026-01-01T00:00:00Z', voltage: 12.5, temperature: 21 },
  ]);
});

test('parseCSV rejects invalid timestamps and out-of-range readings', () => {
  const csv = [
    'timestamp,voltage,temperature',
    '2026-01-01T00:00:00Z,12.4,20',
    'not-a-timestamp,12.4,20',
    '2026-01-01T01:00:00Z,7.9,20',
    '2026-01-01T02:00:00Z,16.1,20',
    '2026-01-01T03:00:00Z,12.4,-20.1',
    '2026-01-01T04:00:00Z,12.4,65.1',
  ].join('\n');

  assert.deepEqual(parseCSV(csv), [
    { timestamp: '2026-01-01T00:00:00Z', voltage: 12.4, temperature: 20 },
  ]);
});

test('parseCSV accepts voltage and temperature boundary values', () => {
  const csv = [
    'timestamp,voltage,temperature',
    '2026-01-01T00:00:00Z,8,-20',
    '2026-01-01T01:00:00Z,16,65',
  ].join('\n');

  assert.deepEqual(parseCSV(csv), [
    { timestamp: '2026-01-01T00:00:00Z', voltage: 8, temperature: -20 },
    { timestamp: '2026-01-01T01:00:00Z', voltage: 16, temperature: 65 },
  ]);
});

test('parseCSV skips voltage and temperature values outside allowed ranges', () => {
  const csv = [
    'timestamp,voltage,temperature',
    '2026-01-01T00:00:00Z,7.999,20',
    '2026-01-01T01:00:00Z,16.001,20',
    '2026-01-01T02:00:00Z,12.4,-20.001',
    '2026-01-01T03:00:00Z,12.4,65.001',
  ].join('\n');

  assert.deepEqual(parseCSV(csv), []);
});

test('parseCSV handles CRLF input', () => {
  const csv = [
    'timestamp,voltage,temperature',
    '2026-01-01T00:00:00Z,12.4,20',
    '2026-01-01T01:00:00Z,12.6,22',
  ].join('\r\n');

  assert.deepEqual(parseCSV(csv), [
    { timestamp: '2026-01-01T00:00:00Z', voltage: 12.4, temperature: 20 },
    { timestamp: '2026-01-01T01:00:00Z', voltage: 12.6, temperature: 22 },
  ]);
});

test('parseCSV throws for an empty file', () => {
  assert.throws(
    () => parseCSV(''),
    /CSV must contain timestamp, voltage, and temperature columns/,
  );
});

test('returns statistical analysis when the Spark SDK is unavailable', async () => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {},
  });

  const analysis = await generateAIAnalysis(readings);

  assert.equal(analysis.dataPoints, 2);
  assert.equal(analysis.avgVoltage, 12.5);
  assert.ok(analysis.healthScore >= 0 && analysis.healthScore <= 100);
  assert.match(analysis.summary, /Spark SDK is not available/);
  assert.ok(analysis.recommendations.length > 0);
});

test('returns statistical analysis when the Spark service call fails', async () => {
  let calls = 0;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      spark: {
        llm: async () => {
          calls += 1;
          throw new Error('offline');
        },
      },
    },
  });

  const analysis = await generateAIAnalysis(readings);

  assert.equal(calls, 1);
  assert.match(analysis.summary, /AI service call failed/);
  assert.equal(analysis.dataPoints, readings.length);
});

test('uses a valid Spark response when the SDK is available', async () => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      spark: {
        llm: async () => JSON.stringify({
          healthScore: 82,
          summary: 'AI-generated assessment.',
          recommendations: ['Continue routine monitoring.'],
        }),
      },
    },
  });

  const analysis = await generateAIAnalysis(readings);

  assert.equal(analysis.healthScore, 82);
  assert.equal(analysis.summary, 'AI-generated assessment.');
  assert.deepEqual(analysis.recommendations, ['Continue routine monitoring.']);
});
