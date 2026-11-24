const CHUNK_SIZE    = 800;
const CHUNK_OVERLAP = 100;

const STOPWORDS = new Set((
  'a an the and or but if then else of to in on at by for with from as is are was were be been being ' +
  'it its this that these those i you he she we they me him her us them my your our their what which who ' +
  'whom how why when where do does did done can could should would will shall may might must not no yes ' +
  'so than too very just about into over under again further once here there all any both each few more ' +
  'most other some such only own same s t don now explain tell describe give please'
).split(' '));

const tokenize = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(t => t && t.length > 1 && !STOPWORDS.has(t));

/**
 * Split text into overlapping chunks, preferring to break on sentence or
 * word boundaries so chunks don't cut words in half.
 */
const chunkText = (text) => {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  const chunks = [];
  let start = 0;
  while (start < cleaned.length) {
    let end = Math.min(start + CHUNK_SIZE, cleaned.length);
    if (end < cleaned.length) {
      const window = cleaned.slice(start, end);
      const sentence = Math.max(window.lastIndexOf('. '), window.lastIndexOf('? '), window.lastIndexOf('! '));
      const space    = window.lastIndexOf(' ');
      if (sentence > CHUNK_SIZE * 0.5) end = start + sentence + 1;
      else if (space > CHUNK_SIZE * 0.5) end = start + space;
    }
    chunks.push(cleaned.slice(start, end).trim());
    if (end >= cleaned.length) break;
    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }
  return chunks.filter(Boolean);
};

/**
 * Pick `k` chunks spread evenly across the document — used for whole-note
 * tasks (summaries, quizzes) so long notes aren't summarised from page 1 only.
 */
const sampleChunks = (chunks, k = 8) => {
  const list = Array.isArray(chunks) ? chunks : [];
  if (list.length <= k) return list.join('\n\n---\n\n');
  const step = list.length / k;
  const picked = [];
  for (let i = 0; i < k; i++) picked.push(list[Math.floor(i * step)]);
  return picked.join('\n\n---\n\n');
};

/**
 * Lightweight lexical retrieval (TF-IDF-ish). Returns the top-k chunks for a
 * query, in document order.
 */
const retrieveRelevantChunks = (chunks, query, topK = 4) => {
  const list = Array.isArray(chunks) ? chunks : [];
  if (!list.length) return '';

  const queryTokens = [...new Set(tokenize(query))];
  if (!queryTokens.length) return sampleChunks(list, topK);

  const tokenized = list.map(tokenize);
  const df = {};
  for (const q of queryTokens) {
    df[q] = tokenized.reduce((n, toks) => n + (toks.includes(q) ? 1 : 0), 0);
  }

  const ranked = tokenized
    .map((toks, index) => {
      const counts = {};
      for (const t of toks) counts[t] = (counts[t] || 0) + 1;
      let score = 0;
      for (const q of queryTokens) {
        if (!counts[q]) continue;
        const idf = Math.log(1 + list.length / (df[q] || 1));
        score += (1 + Math.log(counts[q])) * idf;
      }
      return { index, chunk: list[index], score };
    })
    .sort((a, b) => b.score - a.score);

  // If nothing matched, fall back to a spread sample instead of chunk 0..k.
  if (ranked[0].score === 0) return sampleChunks(list, topK);

  return ranked
    .slice(0, topK)
    .filter(r => r.score > 0)
    .sort((a, b) => a.index - b.index)
    .map(r => r.chunk)
    .join('\n\n---\n\n');
};

module.exports = { chunkText, retrieveRelevantChunks, sampleChunks, tokenize };
