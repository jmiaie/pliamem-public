/**
 * BaseAdapter — interface contract for pliamem memory adapters
 *
 * All adapters must implement:
 *   search(query, opts) → Promise<SearchResult[]>
 *   status()            → Promise<{ ok, stats }>
 */

/**
 * @typedef {Object} SearchResult
 * @property {string} layer    - Layer name (e.g. 'brain', 'kg', 'docs')
 * @property {string} path     - Source path or URI for the result
 * @property {number} score    - Relevance score (0–1)
 * @property {string} excerpt  - Text excerpt (max 300 chars)
 * @property {Object} metadata - Adapter-specific metadata
 * @property {number} [finalScore] - Computed after ranking (score × weight × recency)
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
  }

  /**
   * Search this memory layer.
   * @param {string} query - Search query
   * @param {object} opts - Search options { limit, recent, ... }
   * @returns {Promise<SearchResult[]>}
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
   * Normalize a result to the standard SearchResult format.
   * @param {Partial<SearchResult>} result
   * @param {Partial<SearchResult>} [defaults]
   * @returns {SearchResult}
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
