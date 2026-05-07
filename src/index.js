/**
 * index.js — Pliamem main class
 *
 * Usage:
 *   const { Pliamem } = require('./index');
 *   const pliamem = new Pliamem();
 *   const results = await pliamem.recall('query');
 */

const { rank } = require('./ranker');
const { loadConfig } = require('./config');
const { DEFAULT_LAYER_PATHS, LAYER_TYPE } = require('./defaults');
const { KVStore } = require('./kv');
const os = require('os');
const path = require('path');

function getAdapterClass(type) {
  switch (type) {
    case 'ompa':     return require('./adapters/ompa').OmpaAdapter;
    case 'kg':       return require('./adapters/kg').KgAdapter;
    case 'flat':     return require('./adapters/flat').FlatFileAdapter;
    case 'dailylog': return require('./adapters/dailylog').DailyLogAdapter;
    case 'notices':  return require('./adapters/notices').NoticesAdapter;
    case 'remote':   return require('./adapters/remote').RemoteAdapter;
    default:         return null;
  }
}

class Pliamem {
  constructor(config = {}) {
    const resolved = loadConfig(config);
    this.weights = resolved.weights;
    this.opts = config.opts || {};
    this._adapters = {};
    this._initialized = false;
    
    const kvPath = path.join(os.homedir(), '.pliamem', 'meta.json');
    this.meta = new KVStore(kvPath);
  }

  _autoInit() {
    if (this._initialized) return;
    this._initialized = true;
    const fs = require('fs');
    for (const [name, layerPath] of Object.entries(DEFAULT_LAYER_PATHS)) {
      if (!layerPath || !fs.existsSync(layerPath)) continue;
      const type = LAYER_TYPE[name];
      const AdapterClass = getAdapterClass(type);
      if (!AdapterClass) continue;
      try {
        this._adapters[name] = new AdapterClass({ path: layerPath });
      } catch (e) {
        console.warn(`[pliamem] failed to init adapter [${name}]: ${e.message}`);
      }
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
    // track last recall in metadata
    this.meta.set('lastRecall', Date.now());
    return rank(raw, this.weights, opts);
  }

  async ingest(data) {
    this._autoInit();
    const results = {};
    await Promise.all(Object.entries(this._adapters).map(async ([name, adapter]) => {
      try {
        if (typeof adapter.ingest === 'function') {
          results[name] = await adapter.ingest(data);
        } else {
          results[name] = { handled: false, reason: 'adapter does not support ingest' };
        }
      } catch (e) {
        results[name] = { handled: false, error: e.message };
      }
    }));
    // track last ingested time in metadata
    this.meta.set('lastIngest', Date.now());
    return results;
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
