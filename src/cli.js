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
 *   node src/cli.js serve [--port=3000] [--host=127.0.0.1]
 *   node src/cli.js init
 */

const { Pliamem } = require('./index');
const { DEFAULT_LAYER_PATHS, DEFAULT_WEIGHTS, LAYER_TYPE } = require('./defaults');

/**
 * Build a Pliamem instance, registering only layers whose paths exist on disk.
 */
function buildPliamem() {
  const fs = require('fs');
  const pliamem = new Pliamem({ weights: { ...DEFAULT_WEIGHTS } });

  for (const [name, layerPath] of Object.entries(DEFAULT_LAYER_PATHS)) {
    if (!layerPath) continue;
    try {
      if (!fs.existsSync(layerPath)) continue;
      pliamem.setLayer(name, { type: LAYER_TYPE[name], path: layerPath });
    } catch (e) {
      console.warn(`[pliamem] skipping layer [${name}]: ${e.message}`);
    }
  }

  return pliamem;
}

// ─── Commands ──────────────────────────────────────────────────────────────

async function cmdSearch(query, opts) {
  const pliamem = buildPliamem();
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

async function cmdServe(port = 3000, host = '127.0.0.1') {
  const pliamem = buildPliamem();
  const { startServer } = require('./server');
  startServer(pliamem, port, host);
}

async function cmdInit() {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  
  const memoryDir = process.env.PLIAMEM_DOCS_DIR || path.join(os.homedir(), 'memory');
  if (!fs.existsSync(memoryDir)) {
    fs.mkdirSync(memoryDir, { recursive: true });
    console.log(`📁 Created default memory directory: ${memoryDir}`);
  } else {
    console.log(`📁 Memory directory already exists: ${memoryDir}`);
  }
  
  const defaultFile = path.join(memoryDir, 'README.md');
  if (!fs.existsSync(defaultFile)) {
    fs.writeFileSync(defaultFile, '# Pliamem Memory\n\nThis is your default memory directory. Add markdown files here to be indexed by the flat file adapter.');
    console.log(`📄 Created default memory file: ${defaultFile}`);
  }
  
  console.log(`✅ Initialization complete.`);
}

async function cmdAsk(query, opts) {
  const pliamem = buildPliamem();
  const sep = '─'.repeat(60);
  console.log(`\n🧠 pliamem ask: "${query}"\n${sep}`);

  try {
    const { answer, sources } = await pliamem.ask(query, opts);
    console.log(`\n${answer}\n`);
    if (sources.length) {
      console.log('Sources:');
      sources.forEach(s =>
        console.log(`  [${s.ref}] ${s.layer} — ${s.path} (score: ${s.score?.toFixed(2) ?? '?'})`)
      );
    }
  } catch (e) {
    if (e.message.includes('PUTER_AUTH_TOKEN')) {
      console.error('❌ Set PUTER_AUTH_TOKEN env var to use AI features.');
    } else {
      console.error(`❌ ${e.message}`);
    }
    process.exit(1);
  }

  console.log(sep);
}

async function cmdHelp() {
  console.log(`pliamem — Unified Memory Recall

Usage:
  pliamem search "<query>"             Search all layers
  pliamem search "<query>" --layer=brain  Search one layer
  pliamem search "<query>" --json     Machine-readable output
  pliamem search "<query>" --recent    Recent entries only (last 3 days)
  pliamem ask "<question>"            AI-synthesized answer from memory (requires PUTER_AUTH_TOKEN)
  pliamem layers status               Check all adapters
  pliamem layers list                 Show configured layers
  pliamem config get                  Show config
  pliamem config set <layer.weight> <value>  Set weight
  pliamem serve [--port=3000] [--host=127.0.0.1]  Start REST API server
  pliamem init                        Create default memory directory
  pliamem help                        Show this message

Environment variables:
  PLIAMEM_OMPA_VAULT   - Path to OMPA shared brain vault
  PLIAMEM_KG_PATH      - Path to knowledge graph JSON
  PLIAMEM_DOCS_DIR     - Directory of markdown docs
  PLIAMEM_LOGS_DIR     - Directory of daily logs
  PLIAMEM_NOTICES_PATH - Path to team notices file
  PUTER_AUTH_TOKEN     - Puter auth token (required for pliamem ask)

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
  limit: parseInt(flags.find(f => f.startsWith('--limit='))?.replace('--limit=', '') || '5', 10),
};

(async () => {
  switch (cmd) {
    case 'search':
      if (!posArgs[0]) { await cmdHelp(); process.exit(1); }
      await cmdSearch(posArgs.join(' '), opts);
      break;
    case 'ask':
      if (!posArgs[0]) { await cmdHelp(); process.exit(1); }
      await cmdAsk(posArgs.join(' '), opts);
      break;
    case 'layers':
      if (posArgs[0] === 'status') await cmdLayersStatus();
      else if (posArgs[0] === 'list') await cmdLayersList();
      else { await cmdHelp(); process.exit(1); }
      break;
    case 'config':
      if (posArgs[0] === 'get') await cmdConfigGet();
      else if (posArgs[0] === 'set') await cmdConfigSet(posArgs[1], posArgs[2]);
      else { await cmdHelp(); process.exit(1); }
      break;
    case 'serve':
      const port = parseInt(flags.find(f => f.startsWith('--port='))?.replace('--port=', '') || '3000', 10);
      const host = flags.find(f => f.startsWith('--host='))?.replace('--host=', '') || '127.0.0.1';
      await cmdServe(port, host);
      break;
    case 'init':
      await cmdInit();
      break;
    default:
      await cmdHelp();
  }
})();