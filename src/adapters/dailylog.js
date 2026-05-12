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
    if (!this.dir) throw new Error('DailyLogAdapter requires opts.path (directory)');
    this._limit = opts.limit || 5;
    this._recentDays = opts.recentDays || 3;
  }

  async search(query, opts = {}) {
    const q = query.toLowerCase();
    const limit = opts.limit || this._limit;
    const recentDays = opts.recent ? (opts.recentDays || this._recentDays) : Infinity;

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
      } catch (e) { 
        console.error(`[DailyLogAdapter] Failed to read log ${full}:`, e.message);
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async ingest(data) {
    if (!data.content) return { handled: false, reason: 'Missing content in ingest data' };
    try {
      if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
      const today = new Date().toISOString().split('T')[0];
      const fullPath = path.join(this.dir, `${today}.md`);
      // Add a timestamp to the log entry
      const time = new Date().toISOString().split('T')[1].slice(0, 5);
      const entry = `\n\n### [${time}]\n${data.content}\n`;
      fs.appendFileSync(fullPath, entry, 'utf8');
      return { handled: true, details: { path: fullPath, appendedBytes: Buffer.byteLength(entry) } };
    } catch (e) {
      return { handled: false, error: e.message };
    }
  }

  async export() {
    if (!fs.existsSync(this.dir)) return [];
    let files = [];
    try {
      files = fs.readdirSync(this.dir).filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f));
    } catch (e) { 
      if (e.code !== 'ENOENT') {
        console.error(`[DailyLogAdapter] Export failed to read dir:`, e.message);
      }
      return []; 
    }
    
    return files.map(file => {
      const fullPath = path.join(this.dir, file);
      return {
        path: fullPath,
        content: fs.readFileSync(fullPath, 'utf8')
      };
    });
  }

  async status() {
    if (!fs.existsSync(this.dir)) {
      return { ok: false, stats: { error: 'directory not found' } };
    }
    let count = 0;
    try {
      count = fs.readdirSync(this.dir).filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f)).length;
    } catch (e) {
      if (e.code !== 'ENOENT') {
        console.error(`[DailyLogAdapter] Status failed to read dir:`, e.message);
      }
    }
    return { ok: true, stats: { adapter: 'dailylog', logs: count, dir: this.dir } };
  }
}

module.exports = { DailyLogAdapter };
