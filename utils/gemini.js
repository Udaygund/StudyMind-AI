const { GoogleGenerativeAI } = require('@google/generative-ai');

const getModel = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
};

const generateTextStream = async (prompt, onChunk) => {
  const model = getModel();
  const result = await model.generateContentStream(prompt);
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) onChunk(text);
  }
};

const generateJSON = async (prompt) => {
  const model = getModel();
  const result = await model.generateContent(
    `${prompt}\n\nRespond with valid JSON only.`
  );
  const raw = result.response.text().trim();
  const jsonStr = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '');
  return JSON.parse(jsonStr);
};

module.exports = { generateTextStream, generateJSON };
