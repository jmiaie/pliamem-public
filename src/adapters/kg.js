/**
 * kg.js — Knowledge Graph adapter for pliamem
 *
 * Searches structured JSON knowledge graphs for entity + relationship matches.
 * Scoring: name match (×3) > type match (×2) > content match (×1)
 */

const fs = require('fs');
const { BaseAdapter } = require('./base');

class KgAdapter extends BaseAdapter {
  constructor(opts = {}) {
    super('kg', opts);
    this.filePath = opts.path;
    if (!this.filePath) throw new Error('KgAdapter requires opts.path (KG JSON file)');
    this._limit = opts.limit || 5;
    this._cache = null;
  }

  _load() {
    if (this._cache) return this._cache;
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      this._cache = JSON.parse(raw);
    } catch (e) {
      this._cache = { entities: [], relationships: [], stats: {} };
    }
    return this._cache;
  }

  async search(query, opts = {}) {
    const q = query.toLowerCase();
    const limit = opts.limit || this._limit;
    const kg = this._load();

    const entityResults = (kg.entities || []).map(e => {
      const nameMatch = (e.name || '').toLowerCase().includes(q);
      const contentMatch = (e.content || '').toLowerCase().includes(q);
      const typeMatch = (e.type || '').toLowerCase().includes(q);
      const score = nameMatch ? 0.9 : typeMatch ? 0.6 : contentMatch ? 0.3 : 0;
      return { e, score };
    }).filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const relResults = (kg.relationships || [])
      .filter(r =>
        (r.subject || '').toLowerCase().includes(q) ||
        (r.predicate || '').toLowerCase().includes(q) ||
        (r.object || '').toLowerCase().includes(q)
      )
      .slice(0, limit)
      .map(r => this._normalize({
        path: `kg://rel/${r.subject || 'unknown'}-${r.object || 'unknown'}`,
        score: (r.subject || '').toLowerCase().includes(q) ? 0.7 : 0.4,
        excerpt: `${r.subject} —[${r.predicate}]→ ${r.object}`,
        metadata: { type: 'relationship' },
      }));

    const results = entityResults.map(({ e, score }) =>
      this._normalize({
        path: e.id ? `kg://${e.id}` : 'kg://entity',
        score,
        excerpt: `${e.type || 'Entity'}: ${e.name || ''} — ${(e.content || '').slice(0, 150)}`,
        metadata: { type: e.type, id: e.id },
      })
    );

    return [...results, ...relResults]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async status() {
    const kg = this._load();
    return {
      ok: true,
      stats: {
        adapter: 'kg',
        entities: kg.entities?.length || 0,
        relationships: kg.relationships?.length || 0,
      },
    };
  }
}

module.exports = { KgAdapter };
