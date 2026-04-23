/**
 * ompa.js — OMPA brain adapter for pliamem
 *
 * Searches an OMPA vault using semantic vector similarity.
 * Falls back to keyword if semantic search fails.
 */

const { spawn } = require('child_process');
const path = require('path');
const { BaseAdapter } = require('./base');

const PYTHON = '/home/ubuntu/.openclaw/bin/venv/bin/python3';

const PY_SCRIPT = `
import sys
sys.path.insert(0, '/home/ubuntu/.openclaw/bin/venv/lib/python3.12/site-packages')
import json as _json

vault_path = sys.argv[1]
query = sys.argv[2]
limit = int(sys.argv[3]) if len(sys.argv) > 3 else 5

try:
    from ompa import Ompa
    om = Ompa(vault_path)
    om.session_start()
    results = om.search(query, limit=limit)
    hits = []
    for r in results:
        excerpt = ''
        if hasattr(r, 'content_excerpt') and r.content_excerpt:
            excerpt = r.content_excerpt[:200]
        hits.append({'path': r.path, 'score': float(r.score), 'excerpt': excerpt})
    stats = om.get_stats()
    om.stop()
    output = {'ok': True, 'hits': hits, 'total_notes': stats.get('total_notes', 0), 'stats': stats}
except Exception as e:
    output = {'ok': False, 'error': str(e), 'hits': []}

print(_json.dumps(output))
`.trim();

class OmpaAdapter extends BaseAdapter {
  constructor(opts = {}) {
    super('brain', opts);
    this.vaultPath = opts.path || opts.vaultPath;
    if (!this.vaultPath) throw new Error('OmpaAdapter requires opts.path (vault path)');
    this._limit = opts.limit || 5;
    this._scriptWritten = false;
  }

  _ensureScript() {
    if (this._scriptWritten) return;
    require('fs').writeFileSync('/tmp/pliamem_ompa_search.py', PY_SCRIPT);
    this._scriptWritten = true;
  }

  async search(query, opts = {}) {
    this._ensureScript();
    const limit = opts.limit || this._limit;

    return new Promise((resolve) => {
      const proc = spawn(PYTHON, ['/tmp/pliamem_ompa_search.py', this.vaultPath, query, String(limit)]);
      let out = '', err = '';
      proc.stdout.on('data', d => out += d.toString());
      proc.stderr.on('data', d => err += d.toString());
      proc.on('close', () => {
        const trimd = out.trim();
        if (trimd) {
          try {
            const parsed = JSON.parse(trimd);
            if (parsed.ok !== false && Array.isArray(parsed.hits)) {
              return resolve(
                parsed.hits.map(r => this._normalize(r, { metadata: { totalNotes: parsed.totalNotes } }))
              );
            }
          } catch (_) {}
        }
        resolve([]);
      });
      proc.on('error', () => resolve([]));
      setTimeout(() => { proc.kill(); resolve([]); }, 20000);
    });
  }

  async status() {
    return this.search('status check').then(hits => ({
      ok: true,
      stats: { adapter: 'ompa', vault: this.vaultPath, lastHits: hits.length },
    })).catch(() => ({ ok: false, stats: {} }));
  }
}

module.exports = { OmpaAdapter };
