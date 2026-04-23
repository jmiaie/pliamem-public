/**
 * BaseAdapter — interface contract for pliamem memory adapters
 *
 * All adapters must implement:
 *   search(query, opts) → Promise<SearchResult[]>
 *   status()            → Promise<{ ok, stats }>
 */

class BaseAdapter {
  /**
   * @param {string} name - Layer identifier (e.g. 'brain', 'kg', 'docs')
   * @param {object} opts - Adapter-specific options
   */
  constructor(name, opts = {}) {
    if (!name) throw new Error('Adapter must have a name');
    this.name = name;
    this.opts = opts;
    this._weight = opts.weight !== undefined ? opts.weight : 1.0;
  }

  /**
   * Search this memory layer.
   * @param {string} query - Search query
   * @param {object} opts - Search options { limit, recent, ... }
   * @returns {Promise<SearchResult[]>}
   * @example
   *   // Returns: [{
   *   //   path:    'brain/memory-2026-03-25.md',
   *   //   score:   0.91,
   *   //   excerpt: 'ZTB Protocol v2.2 — routing hierarchy...',
   *   //   metadata: { ... }
   *   // }]
   */
  async search(query, opts = {}) {
    throw new Error(`Adapter [${this.name}] must implement search()`);
  }

  /**
   * Health check for this adapter.
   * @returns {Promise<{ ok: boolean, stats: object }>}
   */
  async status() {
    throw new Error(`Adapter [${this.name}] must implement status()`);
  }

  /**
   * Normalize a result to the internal format.
   * @protected
   */
  _normalize(result, defaults = {}) {
    return {
      layer: this.name,
      path: result.path || '',
      score: result.score !== undefined ? result.score : 0,
      excerpt: (result.excerpt || result.content || '').slice(0, 300),
      metadata: result.metadata || {},
      ...defaults,
    };
  }
}

module.exports = { BaseAdapter };
