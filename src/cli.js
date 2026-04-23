#!/usr/bin/env node
/**
 * cli.js — pliamem command-line interface
 *
 * Usage:
 *   node src/cli.js search "<query>" [--layer=<name>] [--json] [--recent]
 *   node src/cli.js layers status
 *   node src/cli.js layers list
 *   node src/cli.js config get
 *   node src/cli.js config set <key> <value>
 */

const { Pliamem } = require('./index');
const path = require('path');

// Default config — plug in your memory layer paths here
const DEFAULT_LAYERS = {
  brain: { type: 'ompa', path: process.env.PLIAMEM_OMPA_VAULT || path.join(process.env.HOME || '', '.ompa/shared') },
  kg: { type: 'kg', path: process.env.PLIAMEM_KG_PATH || path.join(process.env.HOME || '', '.ompa/knowledge-graph.json') },
  docs: { type: 'flat', path: process.env.PLIAMEM_DOCS_DIR || path.join(process.env.HOME || '', 'memory') },
  logs: { type: 'dailylog', path: process.env.PLIAMEM_LOGS_DIR || path.join(process.env.HOME || '', 'memory') },
  notices: { type: 'notices', path: process.env.PLIAMEM_NOTICES_PATH || path.join(process.env.HOME || '', 'vault/TEAM_NOTICES.md') },
};

const DEFAULT_WEIGHTS = { brain: 1.0, kg: 0.8, docs: 0.5, logs: 0.4, notices: 0.3 };

// Build pliamem instance from env or defaults
function buildPliamem() {
  const layers = {};
  for (const [name, cfg] of Object.entries(DEFAULT_LAYERS)) {
    // Only include layers whose paths exist
    const p = cfg.path || '';
    if (!p) continue;
    try {
      const fs = require('fs');
      const exists = fs.existsSync(p);
      if (exists) layers[name] = cfg;
    } catch (_) {}
  }

  return new Pliamem({ layers, weights: DEFAULT_WEIGHTS });
}

// ─── Commands ──────────────────────────────────────────────────────────────

async function cmdSearch(query, opts) {
  const pliamem = buildPliamem();

  // Initialize adapters
  const { BaseAdapter } = require('./adapters/base');
  for (const [name, cfg] of Object.entries(pliamem._adapters)) {
    if (!pliamem._adapters[name]) {
      const AdapterClass = require('./adapters/kg'); // placeholder
    }
  }

  const results = await pliamem.recall(query, opts);

  if (opts.json) {
    console.log(JSON.stringify({ query, results }, null, 2));
    return;
  }

  const sep = '─'.repeat(60);
  console.log(`\n🔍 pliamem recall: "${query}"\n${sep}`);

  if (!results.length) {
    console.log('  No results found.');
    return;
  }

  results.forEach((r, i) => {
    console.log(`\n[${i + 1}] ${r.layer} (score: ${r.finalScore?.toFixed(2) ?? r.score?.toFixed(2) ?? '?'})`);
    console.log(`  📄 ${r.path}`);
    console.log(`  ${r.excerpt?.slice(0, 120) || '(no excerpt)'}`);
  });

  console.log(`\n${sep}`);
  console.log(`  ${results.length} results from ${Object.keys(pliamem._adapters).length} layers`);
}

async function cmdLayersStatus() {
  const pliamem = buildPliamem();
  const statuses = await pliamem.status();

  console.log('\n🧩 pliamem — Layer Status\n' + '─'.repeat(40));
  for (const [name, s] of Object.entries(statuses)) {
    const icon = s.ok ? '✅' : '❌';
    console.log(`  ${icon} [${name}] ${JSON.stringify(s.stats || s.error)}`);
  }
}

async function cmdLayersList() {
  const pliamem = buildPliamem();
  const names = Object.keys(pliamem._adapters);
  console.log('\n🧩 pliamem — Configured Layers\n' + '─'.repeat(40));
  names.forEach(n => console.log(`  • ${n} (weight: ${pliamem.weights[n] ?? 1.0})`));
  console.log(`\n  ${names.length} layers configured`);
}

async function cmdConfigGet() {
  const pliamem = buildPliamem();
  console.log(JSON.stringify({ weights: pliamem.weights, layers: Object.keys(pliamem._adapters) }, null, 2));
}

async function cmdConfigSet(key, value) {
  const pliamem = buildPliamem();
  const [layer, prop] = key.split('.');
  if (prop === 'weight') {
    pliamem.setWeight(layer, parseFloat(value));
    console.log(`  Set ${layer}.weight = ${value}`);
  } else {
    console.error(`Unknown config key: ${key}`);
    process.exit(1);
  }
}

async function cmdHelp() {
  console.log(`pliamem — Unified Memory Recall

Usage:
  pliamem search "<query>"             Search all layers
  pliamem search "<query>" --layer=brain  Search one layer
  pliamem search "<query>" --json     Machine-readable output
  pliamem search "<query>" --recent    Recent entries only (last 3 days)
  pliamem layers status               Check all adapters
  pliamem layers list                 Show configured layers
  pliamem config get                  Show config
  pliamem config set <layer.weight> <value>  Set weight
  pliamem help                        Show this message

Environment variables:
  PLIAMEM_OMPA_VAULT   - Path to OMPA shared brain vault
  PLIAMEM_KG_PATH      - Path to knowledge graph JSON
  PLIAMEM_DOCS_DIR     - Directory of markdown docs
  PLIAMEM_LOGS_DIR     - Directory of daily logs
  PLIAMEM_NOTICES_PATH - Path to team notices file

Examples:
  pliamem search "ZTB Protocol"
  pliamem search "Tai" --layer=brain --json
  pliamem search "model routing" --recent --top 5
`);
}

// ─── CLI Router ─────────────────────────────────────────────────────────────

const [cmd, ...args] = process.argv.slice(2);

const flags = args.filter(a => a.startsWith('--'));
const posArgs = args.filter(a => !a.startsWith('--'));

const opts = {
  json: flags.includes('--json'),
  recent: flags.includes('--recent'),
  layer: flags.find(f => f.startsWith('--layer='))?.replace('--layer=', '') || null,
  top: parseInt(flags.find(f => f.startsWith('--top='))?.replace('--top=', '') || '0', 10),
  limit: flags.find(f => f.startsWith('--limit='))?.replace('--limit=', '') || 5,
};

(async () => {
  switch (cmd) {
    case 'search':
      if (!posArgs[0]) { await cmdHelp(); process.exit(1); }
      await cmdSearch(posArgs.join(' '), opts);
      break;
    case 'layers':
      if (args[1] === 'status') await cmdLayersStatus();
      else if (args[1] === 'list') await cmdLayersList();
      else { await cmdHelp(); process.exit(1); }
      break;
    case 'config':
      if (args[1] === 'get') await cmdConfigGet();
      else if (args[1] === 'set') await cmdConfigSet(posArgs[0], posArgs[1]);
      else { await cmdHelp(); process.exit(1); }
      break;
    default:
      await cmdHelp();
  }
})();