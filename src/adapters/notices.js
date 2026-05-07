/**
 * notices.js — Team notices adapter for pliamem
 *
 * Searches versioned team notice files (## block structure).
 */

const fs = require('fs');
const { BaseAdapter } = require('./base');

class NoticesAdapter extends BaseAdapter {
  constructor(opts = {}) {
    super('notices', opts);
    this.filePath = opts.path;
    if (!this.filePath) throw new Error('NoticesAdapter requires opts.path');
    this._limit = opts.limit || 5;
  }

  async search(query, opts = {}) {
    const q = query.toLowerCase();
    const limit = opts.limit || this._limit;

    if (!this.filePath || !fs.existsSync(this.filePath)) return [];

    const content = fs.readFileSync(this.filePath, 'utf8');
    const blocks = content.split(/\n(?=## )/).filter(b => b.toLowerCase().includes(q));

    return blocks.slice(0, limit).map(block => {
      const header = (block.match(/^##\s+(.+)/m) || [])[1] || '';
      const score = header.toLowerCase().includes(q) ? 0.9 : 0.5;
      return this._normalize({
        path: this.filePath,
        score,
        excerpt: block.slice(0, 300),
        metadata: { header, noticeDate: (header.match(/\d{4}-\d{2}-\d{2}/) || [])[0] || '' },
      });
    });
  }

  async ingest(data) {
    if (!data.content) return { handled: false, reason: 'Missing content' };
    const headerTitle = data.header || 'Notice Update';
    const dateStr = new Date().toISOString().split('T')[0];
    const block = `\n\n## ${dateStr} — ${headerTitle}\n\n${data.content}\n`;
    try {
      const dir = require('path').dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.appendFileSync(this.filePath, block, 'utf8');
      return { handled: true, details: { path: this.filePath, appendedBytes: Buffer.byteLength(block) } };
    } catch (e) {
      return { handled: false, error: e.message };
    }
  }

  async status() {
    if (!this.filePath || !fs.existsSync(this.filePath)) {
      return { ok: false, stats: { error: 'file not found' } };
    }
    const stat = fs.statSync(this.filePath);
    return {
      ok: true,
      stats: {
        adapter: 'notices',
        path: this.filePath,
        size: stat.size,
        modified: stat.mtime.toISOString(),
      },
    };
  }
}

module.exports = { NoticesAdapter };
