#!/usr/bin/env node
process.env.PLIAMEM_OMPA_VAULT = '/home/ubuntu/.openclaw/workspace/.ompa/shared';
process.env.PLIAMEM_KG_PATH = '/home/ubuntu/.openclaw/workspace/vault/knowledge-graph.json';
process.env.PLIAMEM_LOGS_DIR = '/home/ubuntu/.openclaw/workspace/memory';
process.env.PLIAMEM_DOCS_DIR = '/home/ubuntu/.openclaw/workspace';

const { Pliamem } = require('/home/ubuntu/pliamem/src/index');

(async () => {
  const pliamem = new Pliamem();
  const results = await pliamem.recall('ZTB Protocol', { limit: 3 });
  console.log('Results:', results.length);
  results.forEach(r => {
    console.log('[' + r.layer + '] score: ' + (r.finalScore || 0).toFixed(3));
    console.log('  path: ' + r.path);
    console.log('  excerpt: ' + (r.excerpt || '').slice(0, 100));
  });
  const status = await pliamem.status();
  const layerCount = Object.keys(status).length;
  console.log('Layers responding: ' + layerCount + '/5');
  Object.entries(status).forEach(([k, v]) => {
    console.log(' ' + (v.ok ? 'ok' : 'FAIL') + ' ' + k + ' ' + JSON.stringify(v.stats || v.error || {}));
  });
})().catch(e => { console.error('Error:', e.message); process.exit(1); });