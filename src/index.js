/**
 * index.js — Pliamem main class
 *
 * Usage:
 *   const { Pliamem } = require('./index');
 *   const pliamem = new Pliamem();
 *   const results = await pliamem.recall('query');
 */

const { rank } = require('./ranker');

const DEFAULT_LAYER_PATHS = {
  brain:    process.env.PLIAMEM_OMPA_VAULT    || `${process.env.HOME || ''}/.ompa/shared`,
  kg:       process.env.PLIAMEM_KG_PATH        || `${process.env.HOME || ''}/.ompa/knowledge-graph.json`,
  docs:     process.env.PLIAMEM_DOCS_DIR        || `${process.env.HOME || ''}/memory`,
  logs:     process.env.PLIAMEM_LOGS_DIR        || `${process.env.HOME || ''}/memory`,
  notices:  process.env.PLIAMEM_NOTICES_PATH   || `${process.env.HOME || ''}/vault/TEAM_NOTICES.md`,
};

const DEFAULT_WEIGHTS = { brain: 1.0, kg: 0.8, docs: 0.5, logs: 0.4, notices: 0.3 };

function getAdapterClass(type) {
  switch (type) {
    case 'ompa':     return require('./adapters/ompa').OmpaAdapter;
    case 'kg':       return require('./adapters/kg').KgAdapter;
    case 'flat':     return require('./adapters/flat').FlatFileAdapter;
    case 'dailylog': return require('./adapters/dailylog').DailyLogAdapter;
    case 'notices':  return require('./adapters/notices').NoticesAdapter;
    default:         return null;
  }
}

const LAYER_TYPE = { brain: 'ompa', kg: 'kg', docs: 'flat', logs: 'dailylog', notices: 'notices' };

class Pliamem {
  constructor(config = {}) {
    this.weights = config.weights || {};
    this.opts = config.opts || {};
    this._adapters = {};
    this._initialized = false;
  }

  _autoInit() {
    if (this._initialized) return;
    this._initialized = true;
    const fs = require('fs');
    for (const [name, path] of Object.entries(DEFAULT_LAYER_PATHS)) {
      if (!path || !fs.existsSync(path)) continue;
      const type = LAYER_TYPE[name];
      const AdapterClass = getAdapterClass(type);
      if (!AdapterClass) continue;
      try {
        this._adapters[name] = new AdapterClass({ path });
        if (this.weights[name] === undefined) {
          this.weights[name] = DEFAULT_WEIGHTS[name] || 1.0;
        }
      } catch (_) {}
    }
  }

  setLayer(name, cfg) {
    if (cfg && typeof cfg.search === 'function') {
      this._adapters[name] = cfg;
    } else if (cfg && cfg.type) {
      const AdapterClass = getAdapterClass(cfg.type);
      if (!AdapterClass) throw new Error(`Unknown adapter type: ${cfg.type}`);
      this._adapters[name] = new AdapterClass(cfg);
    }
  }

  setWeight(name, weight) {
    this.weights[name] = weight;
  }

  async recall(query, opts = {}) {
    this._autoInit();
    const layers = opts.layer ? [opts.layer] : opts.layers || Object.keys(this._adapters);
    const raw = [];
    await Promise.all(layers.map(async (name) => {
      try {
        const adapter = this._adapters[name];
        if (!adapter) return;
        const hits = await adapter.search(query, { limit: opts.limit || 5, recent: opts.recent });
        hits.forEach(r => raw.push({ ...r, layer: name }));
      } catch (e) {
        console.error(`[pliamem] adapter [${name}] error: ${e.message}`);
      }
    }));
    return rank(raw, this.weights, opts);
  }

  async status() {
    this._autoInit();
    const result = {};
    await Promise.all(Object.entries(this._adapters).map(async ([name, adapter]) => {
      try { result[name] = await adapter.status(); }
      catch (e) { result[name] = { ok: false, error: e.message }; }
    }));
    return result;
  }
}

module.exports = { Pliamem };
