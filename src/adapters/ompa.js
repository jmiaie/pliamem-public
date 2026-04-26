/**
 * ompa.js — OMPA brain adapter for pliamem
 *
 * Searches an OMPA vault using semantic vector similarity via a Python subprocess.
 * Falls back to empty results if OMPA is unavailable.
 */

const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const { BaseAdapter } = require('./base');

const PYTHON = process.env.PLIAMEM_PYTHON || process.env.PYTHON_PATH || 'python3';

const PY_SCRIPT = `
import sys, json as _json

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

const SCRIPT_PATH = path.join(os.tmpdir(), 'pliamem_ompa_search.py');
const TIMEOUT_MS = 20000;

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
    require('fs').writeFileSync(SCRIPT_PATH, PY_SCRIPT);
    this._scriptWritten = true;
  }

  async search(query, opts = {}) {
    this._ensureScript();
    const limit = opts.limit || this._limit;

    return new Promise((resolve) => {
      let resolved = false;
      const done = (value) => {
        if (resolved) return;
        resolved = true;
        resolve(value);
      };

      const proc = spawn(PYTHON, [SCRIPT_PATH, this.vaultPath, query, String(limit)]);
      let out = '', err = '';
      proc.stdout.on('data', d => out += d.toString());
      proc.stderr.on('data', d => err += d.toString());

      proc.on('close', () => {
        const trimmed = out.trim();
        if (trimmed) {
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.ok !== false && Array.isArray(parsed.hits)) {
              return done(
                parsed.hits.map(r => this._normalize(r, { metadata: { totalNotes: parsed.total_notes } }))
              );
            }
          } catch (e) {
            console.warn(`[pliamem] ompa: failed to parse response: ${e.message}`);
          }
        }
        done([]);
      });

      proc.on('error', (e) => {
        console.warn(`[pliamem] ompa: subprocess failed: ${e.message}`);
        done([]);
      });

      setTimeout(() => {
        proc.kill();
        console.warn(`[pliamem] ompa: search timed out after ${TIMEOUT_MS}ms`);
        done([]);
      }, TIMEOUT_MS);
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
