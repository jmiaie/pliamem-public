/**
 * remote.js — Remote adapter for pliamem
 *
 * Forwards recall queries to another Pliamem instance via its REST API.
 */

const { BaseAdapter } = require('./base');

class RemoteAdapter extends BaseAdapter {
  constructor(opts = {}) {
    super(opts.name || 'remote', opts);
    this.url = opts.url || opts.path;
    if (!this.url) throw new Error('RemoteAdapter requires opts.url or opts.path');
    this.apiKey = opts.apiKey || process.env.PLIAMEM_REMOTE_API_KEY;
  }

  _request(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      try {
        const parsedUrl = new URL(this.url + endpoint);
        const protocol = parsedUrl.protocol === 'https:' ? require('https') : require('http');
        
        const reqOpts = {
          method,
          headers: { 'Accept': 'application/json' },
          timeout: 10000
        };
        
        if (this.apiKey) {
          reqOpts.headers['Authorization'] = `Bearer ${this.apiKey}`;
        }
        
        if (body) {
          reqOpts.headers['Content-Type'] = 'application/json';
        }

        const req = protocol.request(parsedUrl, reqOpts, (res) => {
          let rawData = '';
          res.on('data', chunk => rawData += chunk);
          res.on('end', () => {
            try {
              if (res.statusCode >= 400) {
                return reject(new Error(`HTTP ${res.statusCode}: ${rawData}`));
              }
              resolve(JSON.parse(rawData));
            } catch (e) {
              reject(e);
            }
          });
        });

        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        
        if (body) req.write(JSON.stringify(body));
        req.end();
      } catch (e) {
        reject(e);
      }
    });
  }

  async search(query, opts = {}) {
    try {
      const top = opts.limit || 5;
      const recent = opts.recent ? 'true' : 'false';
      const response = await this._request(`/v1/recall?query=${encodeURIComponent(query)}&top=${top}&recent=${recent}`);
      
      if (!response || !Array.isArray(response.results)) return [];
      
      return response.results.map(r => this._normalize({
        path: `remote://${this.url}${r.path ? '/' + r.path : ''}`,
        score: r.score || r.finalScore || 0,
        excerpt: r.excerpt,
        metadata: { ...r.metadata, remoteLayer: r.layer }
      }));
    } catch (e) {
      console.warn(`[pliamem] remote adapter [${this.name}] search failed: ${e.message}`);
      return [];
    }
  }

  async ingest(data) {
    try {
      const response = await this._request('/v1/webhooks/ingest', 'POST', data);
      return { handled: true, details: response };
    } catch (e) {
      return { handled: false, error: e.message };
    }
  }

  async status() {
    try {
      const start = Date.now();
      const response = await this._request('/v1/status');
      return { 
        ok: true, 
        stats: { 
          adapter: 'remote', 
          url: this.url, 
          pingMs: Date.now() - start,
          remoteStatus: response.status 
        } 
      };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }
}

module.exports = { RemoteAdapter };
