# pliamem — Unified Memory Recall for AI Agents

**Version:** 0.1.0  
**Status:** Pre-release  
**License:** Micap AI LLC — All Rights Reserved  
**Author:** Jeffrey Milam / Micap AI LLC  

---

## 1. Concept & Vision

pliamem (pronounced "PLY-ah-mem") is a **pliable memory** — a unified recall layer that aggregates an AI agent's scattered memory contexts into a single, coherent query interface. It answers the question every AI agent struggles with: *"where did I last learn about X, and what do I know about it?"*

Instead of siloed memory layers (vector stores, JSON files, daily logs, notes), pliamem sits atop them and provides semantic + keyword search across everything at once. Think of it as the **hippocampus** of an AI agent — not storage, but the recall mechanism that pulls from distributed memory regions.

**The pitch:** Your AI agent has memory everywhere. pliamem makes it retrievable.

---

## 2. Design Principles

1. **Zero rewrite of existing memory stores** — pliamem adapts to whatever stores exist; it doesn't replace them
2. **Layered recall, not layered storage** — one query → all sources → ranked results
3. **Ship the tool, own the interface** — memory stores can be third-party; the recall logic and UX are the product
4. **Portable by default** — no platform lock-in, works in any Node.js environment with Python for adapter layers
5. **Transparent scoring** — every result shows which layer it came from and why it ranked high

---

## 3. Architecture

```
User Query
    │
    ▼
┌─────────────────────────────┐
│   pliamem CLI / API         │
│   (Node.js)                 │
│                             │
│  ┌───────────────────────┐  │
│  │  Ranker Engine        │  │
│  │  (score, merge, sort) │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
    │
    ├──► Memory Adapter: OMPA Brain (semantic vector search)
    ├──► Memory Adapter: Knowledge Graph (structured entities)
    ├──► Memory Adapter: Flat Files (daily logs, notes, MEMORY.md)
    ├──► Memory Adapter: Team Notices (versioned communications)
    └──► [extensible] Custom adapters
```

**Key distinction:** pliamem **does not own storage**. It owns the adapter interface, the ranking algorithm, and the CLI/API surface. Storage is delegated to whatever memory systems already exist.

---

## 4. Memory Layers (Default Adapters)

| Layer | Source | Search Type | Adapter Class |
|-------|--------|-------------|---------------|
| Brain | OMPA vector store | Semantic similarity | `OmpaAdapter` |
| Graph | JSON knowledge graph | Entity + relationship | `KgAdapter` |
| Docs | Flat markdown files | Keyword + section scoring | `FlatFileAdapter` |
| Logs | Daily session logs | Chronological grep | `DailyLogAdapter` |
| Notices | Versioned team notices | Block matching | `NoticesAdapter` |

---

## 5. Ranking Algorithm

```
final_score = base_score × layer_weight × recency_factor
```

- **base_score** — adapter-specific (semantic similarity, keyword frequency, etc.)
- **layer_weight** — user-configurable per-layer priority (default: brain=1.0, graph=0.8, docs=0.6)
- **recency_factor** — 1.0 for recent entries, decaying for older entries

Results are **deduplicated by content** and sorted descending by `final_score`.

---

## 6. Core Features

### 6.1 CLI Interface
```bash
pliamem search "<query>"             # Full recall (all layers)
pliamem search "<query>" --layer brain  # Single layer
pliamem search "<query>" --json        # Machine-readable
pliamem search "<query>" --recent      # Recent entries only
pliamem search "<query>" --top 3       # Top N results per layer
pliamem layers list                   # Show configured layers
pliamem layers status                 # Health check all adapters
pliamem config get                   # Show current config
pliamem config set brain.weight 1.5  # Adjust layer weights
```

### 6.2 Programmatic API
```javascript
const { Pliamem } = require('pliamem');

const pliamem = new Pliamem({
  layers: {
    brain: { type: 'ompa', path: './brain' },
    kg: { type: 'kg', path: './knowledge-graph.json' },
    docs: { type: 'flat', path: './memory' }
  },
  weights: { brain: 1.0, kg: 0.8, docs: 0.6 }
});

const results = await pliamem.recall('ZTB Protocol');
// → [{ layer: 'brain', score: 0.91, content: '...', path: '...' }, ...]
```

### 6.3 Extensible Adapters
Implement the `Adapter` interface:
```javascript
class MyAdapter {
  async search(query, opts) {
    // Returns: [{ path, score, excerpt, metadata }]
  }
  async status() {
    // Returns: { ok: boolean, stats: object }
  }
}
```

---

## 7. Default Memory Layers

### 7.1 OMPA Brain Adapter (`OmpaAdapter`)
- Wraps [OMPA](https://github.com/jmiaie/ompa) vector memory
- Uses semantic similarity search
- Configurable vault path
- Falls back to keyword if semantic fails

### 7.2 Knowledge Graph Adapter (`KgAdapter`)
- Reads structured JSON knowledge graphs
- Scores: name match (×3), type match (×2), content match (×1)
- Returns entity + relationship matches

### 7.3 Flat File Adapter (`FlatFileAdapter`)
- Scans directories of markdown files
- Scores sections by keyword frequency
- Configurable: which directories, file patterns, max depth

### 7.4 Daily Log Adapter (`DailyLogAdapter`)
- Specifically designed for `memory/YYYY-MM-DD.md` patterns
- Sorts newest-first
- Matches by date proximity + keyword

### 7.5 Notices Adapter (`NoticesAdapter`)
- Scans versioned notice files
- Matches by block structure (## headers)
- Returns notice headers + excerpts

---

## 8. Product Specifications

### 8.1 Positioning
- **Tagline:** "Your AI's memory, unified."
- **Category:** Developer tools / AI infrastructure
- **Target:** AI agent developers, AI engineering teams, solo developers running local AI setups

### 8.2 Competitive Landscape
- **vs. simple vector DBs:** pliamem aggregates multiple sources, not just embeddings
- **vs. note-taking tools:** pliamem is for AI agents, not humans
- **vs. context management:** pliamem is the recall layer beneath context construction

### 8.3 Open Source Strategy
- Core CLI/API: MIT / Apache 2.0
- Default adapters (OMPA, KG, Flat): bundled, documented as integrations
- Commercial: enterprise adapters, hosted recall API, SLA support

### 8.4 Roadmap
- [ ] v0.1: CLI + default adapters (current)
- [ ] v0.2: REST API server mode
- [ ] v0.3: Webhook triggers for memory updates
- [ ] v0.4: Distributed recall (multiple agents sharing memory)
- [ ] v0.5: pliamem cloud (hosted recall as a service)

---

## 9. File Structure

```
pliamem/
├── SPEC.md
├── README.md
├── LICENSE
├── package.json
├── src/
│   ├── index.js              # Main entry — Pliamem class
│   ├── cli.js                # CLI entry point
│   ├── ranker.js             # Ranking + merge engine
│   ├── adapters/
│   │   ├── base.js           # Adapter interface
│   │   ├── ompa.js           # OMPA brain adapter
│   │   ├── kg.js             # Knowledge graph adapter
│   │   ├── flat.js           # Flat file adapter
│   │   ├── dailylog.js       # Daily log adapter
│   │   └── notices.js        # Team notices adapter
│   └── config.js             # Config loader
├── scripts/
│   └── ompa_search.py        # Python helper for OMPA adapter
├── docs/
│   ├── adapter-guide.md      # How to write custom adapters
│   ├── api-reference.md      # Programmatic API docs
│   └── architecture.md       # System design
├── tests/
│   ├── ranker.test.js
│   ├── adapters.test.js
│   └── integration.test.js
└── config/
    └── default.json          # Default layer config
```

---

## 10. Ownership & Licensing

- **Owner:** Jeffrey Milam / Micap AI LLC
- **All documentation:** © Micap AI LLC
- **License:** Proprietary — All Rights Reserved (source available for inspection)
- **Third-party integrations:** OMPA (attributed), Node.js, Python standard library

---

## 11. Open Questions

- [ ] Should pliamem manage its own lightweight KV store for metadata, or fully delegate?
- [ ] Do we ship a default `memory/` directory structure, or assume it already exists?
- [ ] Authentication layer for distributed recall — yes/no?
