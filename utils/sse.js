/**
 * Server-Sent Events helpers. `openSSE` sets headers and returns an
 * AbortController that fires when the client disconnects, so we stop paying
 * for tokens nobody will read.
 */
const openSSE = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableFinished) controller.abort();
  });
  return controller;
};

const sendSSE = (res, payload) => {
  if (!res.writableEnded) res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const endSSE = (res, payload = { done: true }) => {
  sendSSE(res, payload);
  if (!res.writableEnded) res.end();
};

/** Report an error on a route that may or may not have started streaming. */
const failSSE = (res, err) => {
  if (err?.name === 'AbortError') {
    if (!res.writableEnded) res.end();
    return;
  }
  if (!res.headersSent) {
    return res.status(err.status || 500).json({ message: err.message || 'Generation failed' });
  }
  endSSE(res, { error: err.message || 'Generation failed' });
};

module.exports = { openSSE, sendSSE, endSSE, failSSE };
