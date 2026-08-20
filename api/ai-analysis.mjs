import { createHash } from 'node:crypto';

const DEFAULT_RATE_LIMIT = 10;
const DEFAULT_RATE_WINDOW_MS = 60_000;
const DEFAULT_MAX_BODY_BYTES = 512 * 1024;
const DEFAULT_MAX_READING_COUNT = 5_000;
const DEFAULT_PROVIDER_SAMPLE_POINTS = 10;
const DEFAULT_PROVIDER_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o';

export const rateLimitStore = new Map();

class SafeHttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function getEnvNumber(env, name, fallback) {
  const value = Number(env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeHeaders(headers = {}) {
  const normalized = new Map();

  if (typeof headers.get === 'function') {
    for (const [key, value] of headers.entries()) {
      normalized.set(key.toLowerCase(), String(value));
    }
    return normalized;
  }

  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined) {
      normalized.set(key.toLowerCase(), Array.isArray(value) ? value.join(',') : String(value));
    }
  }

  return normalized;
}

function getHeader(headers, name) {
  return headers.get(name.toLowerCase()) ?? '';
}

function getBearerToken(headers) {
  const authorization = getHeader(headers, 'authorization');
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}

function getCookieValue(headers, name) {
  const cookieHeader = getHeader(headers, 'cookie');
  const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
  const prefix = `${name}=`;
  const cookie = cookies.find((entry) => entry.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : '';
}

function authorize(headers, env) {
  const configuredBearer = env.ANALYSIS_API_TOKEN;
  const configuredSessionCookie = env.ANALYSIS_SESSION_COOKIE;
  const bearerToken = getBearerToken(headers);
  const sessionCookie = getCookieValue(headers, 'analysis_session');

  if (!configuredBearer && !configuredSessionCookie) {
    throw new SafeHttpError(503, 'AI analysis is not configured.');
  }

  if (configuredBearer && bearerToken === configuredBearer) {
    return `bearer:${bearerToken}`;
  }

  if (configuredSessionCookie && sessionCookie === configuredSessionCookie) {
    return `cookie:${sessionCookie}`;
  }

  throw new SafeHttpError(401, 'Authentication is required for AI analysis.');
}

function getClientKey(authIdentity, request) {
  const forwardedFor = getHeader(request.headers, 'x-forwarded-for').split(',')[0].trim();
  const ip = request.ip || forwardedFor || 'unknown';
  return createHash('sha256').update(`${authIdentity}:${ip}`).digest('hex');
}

function enforceRateLimit(clientKey, env, now = Date.now()) {
  const maxRequests = getEnvNumber(env, 'AI_ANALYSIS_RATE_LIMIT', DEFAULT_RATE_LIMIT);
  const windowMs = getEnvNumber(env, 'AI_ANALYSIS_RATE_WINDOW_MS', DEFAULT_RATE_WINDOW_MS);
  const current = rateLimitStore.get(clientKey);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(clientKey, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (current.count >= maxRequests) {
    throw new SafeHttpError(429, 'AI analysis rate limit exceeded. Please try again later.');
  }

  current.count += 1;
}

function parseBody(body) {
  if (typeof body === 'string') {
    return JSON.parse(body);
  }

  if (body && typeof body === 'object') {
    return body;
  }

  throw new SafeHttpError(400, 'Invalid request body.');
}

function validateRequestBody(body, env, contentLength) {
  const maxBodyBytes = getEnvNumber(env, 'AI_ANALYSIS_MAX_BODY_BYTES', DEFAULT_MAX_BODY_BYTES);
  const maxReadings = getEnvNumber(env, 'AI_ANALYSIS_MAX_READING_COUNT', DEFAULT_MAX_READING_COUNT);

  if (contentLength > maxBodyBytes) {
    throw new SafeHttpError(413, 'Telemetry request is too large.');
  }

  if (!body || body.consentToSendTelemetry !== true) {
    throw new SafeHttpError(400, 'Explicit telemetry analysis consent is required.');
  }

  if (!Array.isArray(body.readings)) {
    throw new SafeHttpError(400, 'Telemetry readings are required.');
  }

  if (body.readings.length > maxReadings) {
    throw new SafeHttpError(413, 'Telemetry contains too many readings for AI analysis.');
  }

  const readings = body.readings
    .map((reading) => ({
      timestamp: typeof reading?.timestamp === 'string' ? reading.timestamp.slice(0, 64) : '',
      voltage: Number(reading?.voltage),
      temperature: Number(reading?.temperature)
    }))
    .filter((reading) => (
      reading.timestamp.length > 0
      && Number.isFinite(reading.voltage)
      && Number.isFinite(reading.temperature)
      && reading.voltage >= 8
      && reading.voltage <= 16
      && reading.temperature >= -20
      && reading.temperature <= 65
    ))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (readings.length === 0) {
    throw new SafeHttpError(400, 'No valid telemetry readings were provided.');
  }

  return readings;
}

function calculateBasicStats(readings) {
  const voltages = readings.map((reading) => reading.voltage);
  const temperatures = readings.map((reading) => reading.temperature);
  const avgVoltage = voltages.reduce((sum, voltage) => sum + voltage, 0) / voltages.length;
  const avgTemperature = temperatures.reduce((sum, temperature) => sum + temperature, 0) / temperatures.length;
  const firstTime = new Date(readings[0].timestamp);
  const lastTime = new Date(readings[readings.length - 1].timestamp);
  const timeSpanHours = (lastTime.getTime() - firstTime.getTime()) / (1000 * 60 * 60);

  return {
    avgVoltage,
    avgTemperature,
    voltageRange: {
      min: Math.min(...voltages),
      max: Math.max(...voltages)
    },
    temperatureRange: {
      min: Math.min(...temperatures),
      max: Math.max(...temperatures)
    },
    dataPoints: readings.length,
    timeSpan: timeSpanHours > 24 ? `${Math.round(timeSpanHours / 24)} days` : `${Math.round(timeSpanHours)} hours`
  };
}

function selectProviderSamples(readings, env) {
  const sampleLimit = getEnvNumber(env, 'AI_ANALYSIS_PROVIDER_SAMPLE_POINTS', DEFAULT_PROVIDER_SAMPLE_POINTS);
  const step = Math.max(1, Math.ceil(readings.length / sampleLimit));
  return readings.filter((_, index) => index % step === 0).slice(0, sampleLimit);
}

function buildPrompt(stats, samples) {
  const sampleReadings = samples
    .map((reading) => `${reading.timestamp}: ${reading.voltage.toFixed(2)}V, ${reading.temperature.toFixed(1)}°C`)
    .join('\n');

  return `Analyze this EV battery telemetry summary and provide a technical health assessment.

Telemetry governance:
- The user explicitly consented to AI analysis.
- Raw telemetry is not retained by this endpoint.
- Provider input is minimized to aggregate statistics and a capped representative sample only.

Data Summary:
- ${stats.dataPoints} valid readings over ${stats.timeSpan}
- Average voltage: ${stats.avgVoltage.toFixed(2)}V (range: ${stats.voltageRange.min.toFixed(2)}V - ${stats.voltageRange.max.toFixed(2)}V)
- Average temperature: ${stats.avgTemperature.toFixed(1)}°C (range: ${stats.temperatureRange.min.toFixed(1)}°C - ${stats.temperatureRange.max.toFixed(1)}°C)

Representative samples:
${sampleReadings}

Return JSON only with this structure:
{
  "healthScore": <number 0-100>,
  "summary": "<brief technical summary>",
  "recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"]
}

Focus on voltage stability, temperature patterns, and concerning trends. Consider typical EV battery operating ranges (10-14V, optimal temp 15-25°C).`;
}

function parseProviderAnalysis(text) {
  const trimmed = text.trim();
  const jsonText = trimmed.startsWith('{') ? trimmed : trimmed.match(/\{[\s\S]*\}/)?.[0];

  if (!jsonText) {
    throw new Error('Provider response did not include JSON.');
  }

  const parsed = JSON.parse(jsonText);
  return {
    healthScore: typeof parsed.healthScore === 'number'
      ? Math.max(0, Math.min(100, Math.round(parsed.healthScore)))
      : 75,
    summary: typeof parsed.summary === 'string' && parsed.summary.trim()
      ? parsed.summary.trim()
      : 'Battery telemetry appears to be operating within expected parameters.',
    recommendations: Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0
      ? parsed.recommendations.filter((recommendation) => typeof recommendation === 'string').slice(0, 5)
      : ['Monitor voltage stability', 'Keep battery cool', 'Schedule regular maintenance checks']
  };
}

async function callProvider(prompt, env, fetchImpl) {
  const apiKey = env.AI_PROVIDER_API_KEY;

  if (!apiKey) {
    throw new SafeHttpError(503, 'AI analysis is temporarily unavailable.');
  }

  const response = await fetchImpl(env.AI_PROVIDER_URL || DEFAULT_PROVIDER_URL, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: env.AI_PROVIDER_MODEL || DEFAULT_MODEL,
      messages: [
        { role: 'system', content: 'You are an automotive battery diagnostics expert. Return safe, concise JSON only.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500,
      temperature: 0.2
    })
  });

  if (!response.ok) {
    throw new SafeHttpError(502, 'AI provider failed to complete the analysis.');
  }

  const providerResult = await response.json();
  const content = providerResult?.choices?.[0]?.message?.content;

  if (typeof content !== 'string') {
    throw new SafeHttpError(502, 'AI provider returned an invalid analysis.');
  }

  return parseProviderAnalysis(content);
}

function json(status, body) {
  return {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    },
    body
  };
}

export async function handleAnalysisRequest(request, env = process.env, fetchImpl = fetch) {
  const headers = normalizeHeaders(request.headers);

  if (request.method !== 'POST') {
    return json(405, { error: 'Method not allowed.' });
  }

  try {
    const headerContentLength = Number(getHeader(headers, 'content-length')) || 0;
    const bodyContentLength = typeof request.body === 'string' ? Buffer.byteLength(request.body, 'utf8') : 0;
    const contentLength = Math.max(headerContentLength, bodyContentLength);
    const maxBodyBytes = getEnvNumber(env, 'AI_ANALYSIS_MAX_BODY_BYTES', DEFAULT_MAX_BODY_BYTES);
    if (contentLength > maxBodyBytes) {
      throw new SafeHttpError(413, 'Telemetry request is too large.');
    }

    const authIdentity = authorize(headers, env);
    const clientKey = getClientKey(authIdentity, { ...request, headers });
    enforceRateLimit(clientKey, env);

    const body = parseBody(request.body);
    const readings = validateRequestBody(body, env, contentLength);
    const stats = calculateBasicStats(readings);
    const prompt = buildPrompt(stats, selectProviderSamples(readings, env));
    const aiAnalysis = await callProvider(prompt, env, fetchImpl);

    return json(200, {
      analysis: {
        ...stats,
        ...aiAnalysis
      },
      telemetryPolicy: {
        consentRequired: true,
        providerPayload: 'aggregate statistics plus capped representative samples',
        retained: false
      }
    });
  } catch (error) {
    if (error instanceof SafeHttpError) {
      return json(error.status, { error: error.message });
    }

    if (error instanceof SyntaxError) {
      return json(400, { error: 'Invalid JSON request body.' });
    }

    return json(502, { error: 'AI analysis failed.' });
  }
}

async function readRequestBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req, res) {
  const response = await handleAnalysisRequest({
    method: req.method,
    headers: req.headers,
    body: await readRequestBody(req),
    ip: req.socket?.remoteAddress
  });

  for (const [key, value] of Object.entries(response.headers)) {
    res.setHeader(key, value);
  }

  res.status(response.status).json(response.body);
}
