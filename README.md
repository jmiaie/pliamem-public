# pliamem

**"Your AI's memory, unified."**

pliamem (pronounced "PLY-ah-mem") is a **pliable memory** — a unified recall layer for AI agents. One query searches your entire memory stack: vector brains, knowledge graphs, daily logs, flat files, and team notices — then returns ranked, deduplicated results.

---

## Install

```bash
git clone https://github.com/jmiaie/pliamem.git
cd pliamem
```

No `npm install` required — zero dependencies by default. OMPA adapter requires Python 3.8+ with `ompa` installed (`pip install ompa`).

## Quick Start

```bash
# Zero-config (reads PLIAMEM_* environment variables)
node src/cli.js search "ZTB Protocol"

# Search one layer
node src/cli.js search "Tai" --layer=brain

# Machine-readable output
node src/cli.js search "resource-lens" --json

# Recent entries only
node src/cli.js search "model routing" --recent

# Health check all adapters
node src/cli.js layers status
```

## Live Demo

```
$ node src/cli.js search "ZTB Protocol"

🔍 pliamem recall: "ZTB Protocol"
────────────────────────────────────────────────────────────

[1] brain (score: 0.700)
  brain/ztb-protocol.md
  ZTB Protocol v2.2...

[2] kg (score: 0.168)
  kg://memory-2026-03-25-0
  Event: 2026-03-25 — Ingested ZTB Protocol 2.0...

[3] docs (score: 0.158)
  vault/ZTB_AUDIT.md
  # ZTB Protocol Audit Report...

────────────────────────────────────────────────────────────
  12 results from 4 layers
```

## Environment Variables

pliamem auto-initializes from these environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PLIAMEM_OMPA_VAULT` | Path to OMPA shared brain vault | `~/.ompa/shared` |
| `PLIAMEM_KG_PATH` | Path to knowledge graph JSON | `~/.ompa/knowledge-graph.json` |
| `PLIAMEM_DOCS_DIR` | Directory of markdown docs | `~/memory` |
| `PLIAMEM_LOGS_DIR` | Directory of daily logs | `~/memory` |
| `PLIAMEM_NOTICES_PATH` | Path to team notices file | `~/vault/TEAM_NOTICES.md` |

## Default Memory Layers

| Layer | Type | Description |
|-------|------|-------------|
| `brain` | OMPA adapter | Semantic vector search on OMPA brain vault |
| `kg` | KG adapter | Structured entity + relationship lookup |
| `docs` | Flat file adapter | Markdown files with section scoring |
| `logs` | Daily log adapter | Chronological `YYYY-MM-DD.md` session logs |
| `notices` | Notices adapter | Versioned team notice blocks |

## As a Library

```javascript
const { Pliamem } = require('./src');

const pliamem = new Pliamem();  // auto-initializes from env

const results = await pliamem.recall('ZTB Protocol');
results.forEach(r => {
  console.log(`[${r.layer}] score: ${r.finalScore?.toFixed(2)}`);
  console.log(`  ${r.excerpt?.slice(0, 120)}`);
});

// Or with explicit config:
const pliamem = new Pliamem({
  layers: {
    brain: new OmpaAdapter({ path: './brain' }),
    kg: new KgAdapter({ path: './knowledge-graph.json' }),
  },
  weights: { brain: 1.0, kg: 0.8 }
});
```

## Requirements

- Node.js 18+
- Python 3.8+ (for OMPA adapter only)
- OMPA (`pip install ompa`) if using the brain adapter

---

## License

Copyright 2026 Micap AI LLC. All rights reserved.

---

## Integrations

pliamem ships with adapters for these systems:
- **[OMPA](https://github.com/jmiaie/ompa)** — semantic vector brain for AI agents
