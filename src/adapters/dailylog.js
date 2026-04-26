/**
 * dailylog.js — Daily log adapter for pliamem
 *
 * Searches memory/YYYY-MM-DD.md session logs. Sorts newest-first.
 */

const fs = require('fs');
const path = require('path');
const { BaseAdapter } = require('./base');

class DailyLogAdapter extends BaseAdapter {
  constructor(opts = {}) {
    super('logs', opts);
    this.dir = opts.path;
    this._limit = opts.limit || 5;
    this._recentDays = opts.recentDays || 3;
  }

  async search(query, opts = {}) {
    const q = query.toLowerCase();
    const limit = opts.limit || this._limit;
    const recentDays = opts.recent ? (opts.recentDays || this._recentDays) : Infinity;

    if (!this.dir) return [];
    if (!fs.existsSync(this.dir)) return [];

    let files = fs.readdirSync(this.dir)
      .filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
      .sort()
      .reverse();

    // Limit to recent days if requested
    if (recentDays !== Infinity) {
      files = files.slice(0, recentDays);
    }

    const results = [];

    for (const file of files) {
      const full = path.join(this.dir, file);
      try {
        const content = fs.readFileSync(full, 'utf8');
        const matchedLines = content.split('\n').filter(l => l.toLowerCase().includes(q));
        if (matchedLines.length > 0) {
          results.push(this._normalize({
            path: full,
            score: matchedLines.length * 0.2,
            excerpt: matchedLines[0].trim().slice(0, 200),
            metadata: {
              date: file.replace('.md', ''),
              matches: matchedLines.length,
            },
          }));
        }
        if (results.length >= limit * 3) break; // early exit
      } catch (_) { continue; }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async status() {
    if (!this.dir || !fs.existsSync(this.dir)) {
      return { ok: false, stats: { error: 'directory not found' } };
    }
    let count = 0;
    try {
      count = fs.readdirSync(this.dir).filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f)).length;
    } catch (_) {}
    return { ok: true, stats: { adapter: 'dailylog', logs: count, dir: this.dir } };
  }
}

module.exports = { DailyLogAdapter };
