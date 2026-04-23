# pliamem

**"Your AI's memory, unified."**

pliamem (pronounced "PLY-ah-mem") is a **pliable memory** — a unified recall layer for AI agents. One query searches your entire memory stack: vector brains, knowledge graphs, daily logs, flat files, and team notices — then returns ranked, deduplicated results.

---

## Install

```bash
git clone https://github.com/micap-ai/pliamem.git
cd pliamem
npm install
```

## Quick Start

```bash
# Full recall across all memory layers
node src/cli.js search "ZTB Protocol"

# Single layer
node src/cli.js search "Tai" --layer brain

# Machine-readable output
node src/cli.js search "resource-lens" --json

# Recent entries only
node src/cli.js search "model routing" --recent

# Health check all adapters
node src/cli.js layers status
```

## As a Library

```javascript
const { Pliamem } = require('./src');

const pliamem = new Pliamem({
  layers: {
    brain: { type: 'ompa', path: './brain' },
    kg: { type: 'kg', path: './knowledge-graph.json' },
    docs: { type: 'flat', path: './memory' }
  },
  weights: { brain: 1.0, kg: 0.8, docs: 0.6 }
});

const results = await pliamem.recall('ZTB Protocol');
results.forEach(r => {
  console.log(`[${r.layer}] score: ${r.score.toFixed(2)}`);
  console.log(`  ${r.excerpt.slice(0, 120)}`);
});
```

## Default Memory Layers

| Layer | Type | Description |
|-------|------|-------------|
| `brain` | OMPA adapter | Semantic vector search on OMPA brain vault |
| `kg` | KG adapter | Structured entity + relationship lookup |
| `docs` | Flat file adapter | Markdown files with section scoring |
| `logs` | Daily log adapter | Chronological `YYYY-MM-DD.md` session logs |
| `notices` | Notices adapter | Versioned team notice blocks |

## Architecture

```
pliamem
├── adapters/        # One per memory layer (swappable)
├── ranker.js        # Scores, weights, merges, dedupes
├── config.js        # Layer + weight configuration
└── cli.js           # Command-line interface
```

## Writing a Custom Adapter

```javascript
const { BaseAdapter } = require('./src/adapters/base');

class MyMemoryAdapter extends BaseAdapter {
  constructor(opts) {
    super('my-memory', opts);
    this.path = opts.path;
  }

  async search(query) {
    // Return: [{ path, score, excerpt, metadata }]
    return [
      {
        path: 'my-memory/result.md',
        score: 0.85,
        excerpt: 'Found in my custom store...',
        metadata: { source: 'custom' }
      }
    ];
  }

  async status() {
    return { ok: true, stats: { count: 42 } };
  }
}

const pliamem = new Pliamem({
  layers: { myStore: new MyMemoryAdapter({ path: './my-data' }) }
});
```

---

## Requirements

- Node.js 18+
- Python 3.8+ (for OMPA adapter)
- OMPA (`pip install ompa`) if using the brain adapter

---

## License

Copyright © 2026 Micap AI LLC. All rights reserved.

---

## Integrations

pliamem ships with adapters for these systems:
- **[OMPA](https://github.com/jmiaie/ompa)** — semantic vector brain for AI agents
