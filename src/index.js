/**
 * index.js — Pliamem main class
 *
 * Usage:
 *   const { Pliamem } = require('./pliamem');
 *   const pliamem = new Pliamem({ layers, weights });
 *   const results = await pliamem.recall('query');
 */

const { rank } = require('./ranker');
const { OmpaAdapter } = require('./adapters/ompa');
const { KgAdapter } = require('./adapters/kg');
const { FlatFileAdapter } = require('./adapters/flat');
const { DailyLogAdapter } = require('./adapters/dailylog');
const { NoticesAdapter } = require('./adapters/notices');

const ADAPTER_MAP = {
  ompa: OmpaAdapter,
  kg: KgAdapter,
  flat: FlatFileAdapter,
  dailylog: DailyLogAdapter,
  notices: NoticesAdapter,
};

/**
 * Pliamem — Unified Memory Recall
 *
 * @param {object} config
 * @param {object} config.layers       - Layer name -> adapter config or adapter instance
 * @param {object} config.weights     - Layer name -> numeric weight (default 1.0)
 * @param {object} config.opts         - Global search options { limit, recent, ... }
 */
class Pliamem {
  constructor(config = {}) {
    this.weights = config.weights || {};
    this.opts = config.opts || {};
    this._adapters = {};
    this._initialized = false;
  }

  /**
   * Initialize adapters from config.
   * @private
   */
  _init() {
    if (this._initialized) return;
    this._initialized = true;
  }

  /**
   * Get or create an adapter by name.
   * @private
   */
  _getAdapter(name, cfg) {
    if (this._adapters[name]) return this._adapters[name];

    if (typeof cfg === 'object' && !(cfg instanceof BaseAdapter)) {
      // cfg is a plain config object { type, path, ... }
      const AdapterClass = ADAPTER_MAP[cfg.type || name];
      if (!AdapterClass) throw new Error(`Unknown adapter type: ${cfg.type}`);
      this._adapters[name] = new AdapterClass(cfg);
    } else if (typeof cfg === 'object' && cfg.search) {
      // cfg is already an adapter instance
      this._adapters[name] = cfg;
    } else {
      throw new Error(`Adapter [${name}] must be an instance or { type, path } config`);
    }

    return this._adapters[name];
  }

  /**
   * Register or update a layer adapter.
   * @param {string} name - Layer name
   * @param {object|BaseAdapter} adapter - Adapter instance or config
   */
  setLayer(name, adapter) {
    this._getAdapter(name, adapter);
  }

  /**
   * Set the weight for a layer.
   * @param {string} name - Layer name
   * @param {number} weight - Score multiplier
   */
  setWeight(name, weight) {
    this.weights[name] = weight;
  }

  /**
   * Perform unified recall across all configured layers.
   * @param {string} query - Search query
   * @param {object} searchOpts - { layer, layers, limit, recent, json }
   * @returns {Promise<Result[]>}
   */
  async recall(query, searchOpts = {}) {
    this._init();

    const layers = searchOpts.layer
      ? [searchOpts.layer]
      : searchOpts.layers || Object.keys(this._adapters);

    const rawResults = [];

    await Promise.all(
      layers.map(async (name) => {
        try {
          const adapter = this._adapters[name];
          if (!adapter) return;
          const results = await adapter.search(query, {
            limit: searchOpts.limit || 5,
            recent: searchOpts.recent,
          });
          for (const r of results) {
            rawResults.push({ ...r, layer: name });
          }
        } catch (e) {
          // Adapter failed — skip silently, other layers still respond
          console.error(`[pliamem] adapter [${name}] error: ${e.message}`);
        }
      })
    );

    return rank(rawResults, this.weights, searchOpts);
  }

  /**
   * Check health of all configured layers.
   * @returns {Promise<object>} - { layerName: { ok, stats } }
   */
  async status() {
    this._init();
    const result = {};
    const entries = Object.entries(this._adapters);

    await Promise.all(
      entries.map(async ([name, adapter]) => {
        try {
          result[name] = await adapter.status();
        } catch (e) {
          result[name] = { ok: false, error: e.message };
        }
      })
    );

    return result;
  }
}

// Make BaseAdapter available for custom adapter injection
const { BaseAdapter } = require('./adapters/base');

module.exports = { Pliamem, BaseAdapter };
