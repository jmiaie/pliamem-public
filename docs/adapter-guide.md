# Writing a Custom Adapter for pliamem

pliamem's adapter interface lets you connect any memory store — a Pinecone index, a Notion API, a simple Redis cache — as a queryable layer.

## The Adapter Contract

Every adapter must implement two methods:

```javascript
class MyAdapter {
  /**
   * Search this memory layer.
   * @param {string} query - Search query
   * @param {object} opts - { limit, recent, ... }
   * @returns {Promise<SearchResult[]>}
   */
  async search(query, opts = {}) {
    return [
      {
        path: 'my-store/path/to/file.md',   // required
        score: 0.85,                          // required (0–1)
        excerpt: 'Found it here...',           // required (string)
        metadata: { custom: 'field' }         // optional
      }
    ];
  }

  /**
   * Health check.
   * @returns {Promise<{ ok: boolean, stats: object }>}
   */
  async status() {
    return { ok: true, stats: { count: 42 } };
  }
}
```

## BaseAdapter Helper

Extend `BaseAdapter` for common utilities:

```javascript
const { BaseAdapter } = require('pliamem/src/adapters/base');

class MyAdapter extends BaseAdapter {
  constructor(opts) {
    super('my-store', opts);  // name + options
    this.myPath = opts.path;
  }

  async search(query, opts = {}) {
    const results = await mySearch(query, opts.limit || 5);
    return results.map(r => this._normalize(r, { metadata: { source: 'custom' } }));
  }
}
```

## Registering Your Adapter

```javascript
const { Pliamem } = require('pliamem');
const { MyAdapter } = require('./my-adapter');

const pliamem = new Pliamem({
  layers: {
    brain: { type: 'ompa', path: './brain' },
    myStore: new MyAdapter({ path: './my-data' })
  },
  weights: { brain: 1.0, myStore: 0.7 }
});
```

## Scoring Guidelines

- **0.8–1.0:** Exact or near-exact semantic match
- **0.5–0.8:** Strong relevance (title match, topic match)
- **0.2–0.5:** Weak relevance (keyword match in body)
- **< 0.2:** Include only if results are sparse

## Example: JSON File Adapter

```javascript
const fs = require('fs');
const { BaseAdapter } = require('pliamem/src/adapters/base');

class JsonAdapter extends BaseAdapter {
  constructor(opts) {
    super('json-store', opts);
    this.filePath = opts.path;
  }

  async search(query) {
    const data = JSON.parse(fs.readFileSync(this.filePath));
    const q = query.toLowerCase();
    return (data.items || [])
      .filter(item => JSON.stringify(item).toLowerCase().includes(q))
      .slice(0, 5)
      .map(item => this._normalize({
        path: `json://${item.id}`,
        score: 0.7,
        excerpt: item.description || JSON.stringify(item).slice(0, 200),
        metadata: { id: item.id }
      }));
  }

  async status() {
    return { ok: fs.existsSync(this.filePath), stats: {} };
  }
}

module.exports = { JsonAdapter };
```

## Testing Your Adapter

```bash
# Test your adapter in isolation
node -e "
const { MyAdapter } = require('./my-adapter');
const a = new MyAdapter({ path: './test-data' });
a.search('test query').then(results => {
  console.log(JSON.stringify(results, null, 2));
});
"

# Run with pliamem CLI
node src/cli.js search 'test query' --layer=my-store
```
