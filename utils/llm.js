// OpenRouter LLM client (OpenAI-compatible chat completions API).
// Docs: https://openrouter.ai/docs/api-reference/overview

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL  = 'anthropic/claude-haiku-5.5';
// Always cap output: without max_tokens OpenRouter reserves the model's full
// output budget up-front, which fails on keys with a low credit limit (HTTP 402).
const DEFAULT_MAX_TOKENS = Number(process.env.OPENROUTER_MAX_TOKENS) || 4096;

const getConfig = () => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    const err = new Error('OPENROUTER_API_KEY is not configured on the server');
    err.status = 503;
    throw err;
  }
  return { apiKey, model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL };
};

const toMessages = (input) =>
  Array.isArray(input) ? input : [{ role: 'user', content: String(input) }];

const request = async (input, { stream = false, signal, temperature = 0.4, maxTokens, json = false } = {}) => {
  const { apiKey, model } = getConfig();
  const body = {
    model,
    messages: toMessages(input),
    stream,
    temperature,
    max_tokens: maxTokens || DEFAULT_MAX_TOKENS,
    ...(json && { response_format: { type: 'json_object' } }),
  };

  const res = await fetch(OPENROUTER_URL, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:3000',
      'X-Title':      'StudyMind AI',
    },
    body:   JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data?.error?.message || detail;
    } catch { /* ignore */ }
    const err = new Error(`AI provider error (${res.status}): ${detail}`);
    err.status = res.status === 429 ? 429 : 502;
    throw err;
  }
  return res;
};

/** Non-streaming completion — returns the full text. */
const generateText = async (input, opts = {}) => {
  const res  = await request(input, opts);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'AI provider error');
  return data.choices?.[0]?.message?.content?.trim() || '';
};

/** Streaming completion — calls onChunk(text) for every delta. Returns full text. */
const generateTextStream = async (input, onChunk, opts = {}) => {
  const res     = await request(input, { ...opts, stream: true });
  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full   = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const raw of lines) {
      const line = raw.trim();
      // OpenRouter sends ": OPENROUTER PROCESSING" comments as keep-alives.
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') return full;
      let parsed;
      try { parsed = JSON.parse(payload); } catch { continue; }
      if (parsed.error) throw new Error(parsed.error.message || 'AI provider stream error');
      const text = parsed.choices?.[0]?.delta?.content;
      if (text) {
        full += text;
        onChunk(text);
      }
    }
  }
  return full;
};

/** Extract the first JSON value (object or array) from model text. */
const extractJSON = (raw) => {
  const cleaned = String(raw || '').replace(/```(?:json)?/gi, '').trim();
  try { return JSON.parse(cleaned); } catch { /* fall through */ }

  const starts = ['[', '{'].map(c => cleaned.indexOf(c)).filter(i => i >= 0);
  if (!starts.length) throw new Error('AI did not return JSON');
  const start = Math.min(...starts);
  const end   = cleaned[start] === '[' ? cleaned.lastIndexOf(']') : cleaned.lastIndexOf('}');
  if (end <= start) throw new Error('AI returned malformed JSON');
  return JSON.parse(cleaned.slice(start, end + 1));
};

/**
 * Ask for JSON and return an array. Models often wrap arrays in an object
 * ({ "items": [...] }), so we unwrap the first array property we find.
 */
const generateJSONArray = async (prompt, opts = {}) => {
  const text = await generateText(
    [
      { role: 'system', content: 'You output only valid JSON. No markdown fences, no commentary.' },
      { role: 'user',   content: prompt },
    ],
    { temperature: 0.5, ...opts }
  );
  const parsed = extractJSON(text);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    const arr = Object.values(parsed).find(Array.isArray);
    if (arr) return arr;
  }
  throw new Error('AI did not return a list');
};

module.exports = { generateText, generateTextStream, generateJSONArray, extractJSON };
