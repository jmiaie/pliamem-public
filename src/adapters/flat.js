/**
 * flat.js — Flat file adapter for pliamem
 *
 * Scans directories of markdown files with section scoring.
 */

const fs = require('fs');
const path = require('path');
const { BaseAdapter } = require('./base');

class FlatFileAdapter extends BaseAdapter {
  constructor(opts = {}) {
    super('docs', opts);
    this.dir = opts.path;
    if (!this.dir) throw new Error('FlatFileAdapter requires opts.path (directory)');
    this.pattern = opts.pattern || /\.md$/;
    this.maxDepth = opts.maxDepth !== undefined ? opts.maxDepth : 3;
    this._limit = opts.limit || 5;
  }

  /**
   * Walk the directory tree up to maxDepth, calling visitor for each matching file.
   * @param {function(string, fs.Stats): void} visitor - Called with (fullPath, stat)
   */
  _walk(visitor) {
    const recurse = (dir, depth) => {
      if (depth > this.maxDepth) return;
      let entries;
      try { entries = fs.readdirSync(dir); } catch (_) { return; }

      for (const entry of entries) {
        const full = path.join(dir, entry);
        try {
          const stat = fs.statSync(full);
          if (stat.isDirectory()) recurse(full, depth + 1);
          else if (this.pattern.test(entry)) visitor(full, stat);
        } catch (_) { continue; }
      }
    };
    recurse(this.dir, 0);
  }

  async search(query, opts = {}) {
    const q = query.toLowerCase();
    const limit = opts.limit || this._limit;
    const results = [];

    this._walk((full, stat) => {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      const matchedLines = lines.filter(l => l.toLowerCase().includes(q));
      if (matchedLines.length > 0) {
        const score = content.slice(0, 200).toLowerCase().includes(q) ? 0.8 : 0.3;
        results.push(this._normalize({
          path: full,
          score: score + (matchedLines.length * 0.05),
          excerpt: matchedLines[0].trim().slice(0, 200),
          metadata: { matchedLines: matchedLines.length, size: stat.size },
        }));
      }
    });

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  async ingest(data) {
    if (!data.path || !data.content) {
      return { handled: false, reason: 'Missing path or content in ingest data' };
    }
    const safePath = path.basename(data.path); // prevent directory traversal
    const fullPath = path.join(this.dir, safePath);
    try {
      fs.writeFileSync(fullPath, data.content, 'utf8');
      return { handled: true, details: { path: fullPath, bytes: Buffer.byteLength(data.content) } };
    } catch (e) {
      return { handled: false, error: e.message };
    }
  }

  async status() {
    let count = 0;
    this._walk(() => { count++; });
    return { ok: true, stats: { adapter: 'flat', files: count, dir: this.dir } };
  }
}

module.exports = { FlatFileAdapter };