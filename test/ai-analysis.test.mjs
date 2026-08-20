import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test, beforeEach } from 'node:test';
import { handleAnalysisRequest, rateLimitStore } from '../api/ai-analysis.mjs';

const validReadings = [
  { timestamp: '2026-08-20T00:00:00Z', voltage: 12.4, temperature: 22 },
  { timestamp: '2026-08-20T01:00:00Z', voltage: 12.5, temperature: 23 },
  { timestamp: '2026-08-20T02:00:00Z', voltage: 12.6, temperature: 24 }
];

const baseEnv = {
  ANALYSIS_API_TOKEN: 'local-auth-value',
  AI_PROVIDER_API_KEY: 'provider-test-value',
  AI_PROVIDER_URL: 'https://provider.example.test/analyze',
  AI_ANALYSIS_RATE_LIMIT: '2',
  AI_ANALYSIS_RATE_WINDOW_MS: '60000',
  AI_ANALYSIS_MAX_BODY_BYTES: '10000',
  AI_ANALYSIS_MAX_READING_COUNT: '5'
};

function makeRequest(overrides = {}) {
  const defaultBody = {
    consentToSendTelemetry: true,
    readings: validReadings
  };
  const body = typeof overrides.body === 'string'
    ? overrides.body
    : {
      ...defaultBody,
      ...overrides.body
    };

  return {
    method: overrides.method || 'POST',
    ip: overrides.ip || '203.0.113.10',
    headers: {
      authorization: ['Bearer', baseEnv.ANALYSIS_API_TOKEN].join(' '),
      'content-type': 'application/json',
      'content-length': '300',
      ...overrides.headers
    },
    body
  };
}

function successfulProviderFetch() {
  return async (_url, _init) => ({
    ok: true,
    async json() {
      return {
        choices: [
          {
            message: {
              content: JSON.stringify({
                healthScore: 88,
                summary: 'Voltage and temperature remain stable.',
                recommendations: ['Continue routine monitoring']
              })
            }
          }
        ]
      };
    }
  });
}

beforeEach(() => {
  rateLimitStore.clear();
});

test('rejects unauthenticated AI analysis requests', async () => {
  const response = await handleAnalysisRequest(
    makeRequest({ headers: { authorization: '' } }),
    baseEnv,
    successfulProviderFetch()
  );

  assert.equal(response.status, 401);
  assert.match(response.body.error, /Authentication is required/);
});

test('rejects over-limit requests before calling the provider', async () => {
  let providerCalls = 0;
  const fetchImpl = async () => {
    providerCalls += 1;
    return successfulProviderFetch()();
  };

  assert.equal((await handleAnalysisRequest(makeRequest(), baseEnv, fetchImpl)).status, 200);
  assert.equal((await handleAnalysisRequest(makeRequest(), baseEnv, fetchImpl)).status, 200);

  const limited = await handleAnalysisRequest(makeRequest(), baseEnv, fetchImpl);

  assert.equal(limited.status, 429);
  assert.equal(providerCalls, 2);
});

test('rejects requests that exceed body or telemetry limits', async () => {
  const limitEnv = {
    ...baseEnv,
    AI_ANALYSIS_RATE_LIMIT: '10'
  };
  const oversizedBody = await handleAnalysisRequest(
    makeRequest({ headers: { 'content-length': '10001' } }),
    limitEnv,
    successfulProviderFetch()
  );

  const tooManyReadings = await handleAnalysisRequest(
    makeRequest({ body: { readings: [...validReadings, ...validReadings] } }),
    limitEnv,
    successfulProviderFetch()
  );

  const oversizedRawBody = await handleAnalysisRequest(
    makeRequest({
      headers: { 'content-length': '' },
      body: ' '.repeat(10_001)
    }),
    limitEnv,
    successfulProviderFetch()
  );

  assert.equal(oversizedBody.status, 413);
  assert.equal(tooManyReadings.status, 413);
  assert.equal(oversizedRawBody.status, 413);
});

test('requires explicit telemetry consent', async () => {
  const response = await handleAnalysisRequest(
    makeRequest({ body: { consentToSendTelemetry: false } }),
    baseEnv,
    successfulProviderFetch()
  );

  assert.equal(response.status, 400);
  assert.match(response.body.error, /consent/i);
});

test('returns safe errors without provider details or credentials', async () => {
  const response = await handleAnalysisRequest(
    makeRequest(),
    baseEnv,
    async () => ({
      ok: false,
      status: 500,
      async text() {
        return 'provider-test-value internal stack trace';
      },
      async json() {
        return { error: 'provider-test-value internal stack trace' };
      }
    })
  );

  assert.equal(response.status, 502);
  assert.equal(response.body.error, 'AI provider failed to complete the analysis.');
  assert.doesNotMatch(JSON.stringify(response.body), /provider-test-value/);
});

test('does not expose provider credentials or direct provider calls in client code', async () => {
  const batteryAnalysis = await readFile(
    new URL('../src/lib/battery-analysis.ts', import.meta.url),
    'utf8'
  );
  const packageJson = await readFile(new URL('../package.json', import.meta.url), 'utf8');

  assert.doesNotMatch(batteryAnalysis, /window\.spark\.llm/);
  assert.doesNotMatch(batteryAnalysis, /AI_PROVIDER_API_KEY/);
  assert.doesNotMatch(batteryAnalysis, /VITE_.*(?:KEY|TOKEN|SECRET)/);
  assert.doesNotMatch(packageJson, /VITE_.*(?:KEY|TOKEN|SECRET)/);
});
