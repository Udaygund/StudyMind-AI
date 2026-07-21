const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

const tokenize = (text) =>
  text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

const scoreChunk = (chunkTokens, queryTokens) => {
  if (!queryTokens.length) return 1;
  const set = new Set(chunkTokens);
  let hits = 0;
  for (const t of queryTokens) {
    if (set.has(t)) hits++;
  }
  return hits / queryTokens.length;
};

const chunkText = (text) => {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  const chunks = [];
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(start + CHUNK_SIZE, cleaned.length);
    chunks.push(cleaned.slice(start, end));
    if (end >= cleaned.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
};

const retrieveRelevantChunks = (chunks, query, topK = 4) => {
  const list = Array.isArray(chunks) ? chunks : [];
  if (!list.length) return '';

  const queryTokens = tokenize(query || '');
  const ranked = list
    .map((chunk, index) => ({
      index,
      chunk,
      score: scoreChunk(tokenize(chunk), queryTokens),
    }))
    .sort((a, b) => b.score - a.score);

  const selected = queryTokens.length
    ? ranked.slice(0, topK)
    : list.slice(0, topK).map((chunk, index) => ({ index, chunk, score: 1 }));

  return selected
    .sort((a, b) => a.index - b.index)
    .map((r) => r.chunk)
    .join('\n\n---\n\n');
};

module.exports = { chunkText, retrieveRelevantChunks };
