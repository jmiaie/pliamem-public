const { BaseAdapter } = require('./base');
const { getPuter } = require('../puter-client');

const KEY_PREFIX = 'pliamem:entry:';

function scoreContent(content, query) {
  const text = content.toLowerCase();
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return 0;
  const hits = terms.filter(t => text.includes(t)).length;
  return hits / terms.length;
}

class PuterAdapter extends BaseAdapter {
  constructor(opts = {}) {
    super('cloud', opts);
  }

  async search(query, opts = {}) {
    const puter = getPuter();
    const limit = opts.limit || 5;

    const entries = await puter.kv.list({ pattern: KEY_PREFIX + '*', returnValues: true });
    if (!entries || !Array.isArray(entries)) return [];

    const results = [];
    for (const entry of entries) {
      let data;
      try {
        data = typeof entry.value === 'string' ? JSON.parse(entry.value) : entry.value;
      } catch {
        continue;
      }

      const content = data.content || '';
      const score = scoreContent(content, query);
      if (score === 0) continue;

      results.push(this._normalize({
        path: `puter:kv:${entry.key}`,
        score,
        excerpt: content.slice(0, 300),
        metadata: { ts: data.ts, tags: data.tags, source: data.source },
      }));
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async ingest(data) {
    const puter = getPuter();
    const ts = Date.now();
    const key = `${KEY_PREFIX}${ts}-${Math.random().toString(36).slice(2, 8)}`;
    const value = JSON.stringify({
      content: data.content || data.text || JSON.stringify(data),
      tags: data.tags || [],
      source: data.source || 'api',
      ts,
    });
    await puter.kv.set(key, value);
    return { handled: true, key };
  }

  async prune(days = 30) {
    const puter = getPuter();
    const entries = await puter.kv.list({ pattern: KEY_PREFIX + '*', returnValues: true });
    if (!entries || !Array.isArray(entries)) return { deleted: 0 };

    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    for (const entry of entries) {
      let data;
      try {
        data = typeof entry.value === 'string' ? JSON.parse(entry.value) : entry.value;
      } catch { continue; }

      if (data.ts && data.ts < cutoff) {
        await puter.kv.del(entry.key);
        deletedCount++;
      }
    }
    return { deleted: deletedCount };
  }

  async status() {
    try {
      const puter = getPuter();
      const entries = await puter.kv.list({ pattern: KEY_PREFIX + '*' });
      const count = Array.isArray(entries) ? entries.length : 0;
      return { ok: true, stats: { entries: count, namespace: KEY_PREFIX } };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }
}

module.exports = { PuterAdapter };
