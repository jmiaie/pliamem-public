const http = require('http');
const url = require('url');

function startServer(pliamem, port = 3000, host = '127.0.0.1') {
  const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Authentication Layer
    const authHeader = req.headers['authorization'];
    const apiKey = process.env.PLIAMEM_API_KEY;
    if (apiKey) {
      if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
    }

    const sendJson = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    try {
      if (req.method === 'GET' && pathname === '/v1/recall') {
        const query = parsedUrl.query.query;
        if (!query) return sendJson(400, { error: 'Missing query parameter' });

        const opts = {
          layer: parsedUrl.query.layer,
          recent: parsedUrl.query.recent === 'true',
          top: parsedUrl.query.top ? parseInt(parsedUrl.query.top, 10) : 0,
        };

        const results = await pliamem.recall(query, opts);
        return sendJson(200, { query, results });
      }

      if (req.method === 'GET' && pathname === '/v1/ask') {
        const query = parsedUrl.query.query;
        if (!query) return sendJson(400, { error: 'Missing query parameter' });

        try {
          const result = await pliamem.ask(query);
          return sendJson(200, { query, ...result });
        } catch (e) {
          if (e.message.includes('PUTER_AUTH_TOKEN')) {
            return sendJson(503, { error: 'AI features unavailable: PUTER_AUTH_TOKEN not set on server' });
          }
          throw e;
        }
      }

      if (req.method === 'GET' && pathname === '/v1/status') {
        const status = await pliamem.status();
        return sendJson(200, { status });
      }

      if (req.method === 'POST' && pathname === '/v1/webhooks/ingest') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const result = await pliamem.ingest(data);
            sendJson(200, { success: true, ingested: result });
          } catch (e) {
            sendJson(400, { error: 'Invalid JSON or ingest failed: ' + e.message });
          }
        });
        return;
      }

      sendJson(404, { error: 'Not found' });
    } catch (e) {
      console.error(e);
      sendJson(500, { error: e.message });
    }
  });

  server.listen(port, host, () => {
    console.log(`🚀 pliamem server listening on http://${host}:${port}`);
    if (process.env.PLIAMEM_API_KEY) {
      console.log(`🔒 Authentication enabled (Bearer token required)`);
    } else {
      console.warn(`⚠️  No PLIAMEM_API_KEY set. Server is open to the local network.`);
    }
  });
}

module.exports = { startServer };
