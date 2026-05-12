/**
 * integration.test.js — End-to-end tests for the Pliamem class
 *
 * Tests the full flow: Pliamem construction → adapter registration →
 * recall (search + rank) → status checks.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { Pliamem } = require('../src/index');
const { KgAdapter } = require('../src/adapters/kg');
const { FlatFileAdapter } = require('../src/adapters/flat');
const { DailyLogAdapter } = require('../src/adapters/dailylog');
const { NoticesAdapter } = require('../src/adapters/notices');

let tmpDir;

function setupFixtures() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pliamem-integ-'));

  // KG
  const kgData = {
    entities: [
      { id: 'mtb-1', name: 'MTB Protocol', type: 'Protocol', content: 'Agent routing hierarchy' },
      { id: 'ompa-1', name: 'OMPA', type: 'Tool', content: 'Vector memory system' },
    ],
    relationships: [
      { subject: 'Agent', predicate: 'uses', object: 'MTB Protocol' },
    ],
  };
  fs.writeFileSync(path.join(tmpDir, 'kg.json'), JSON.stringify(kgData));

  // Flat docs
  const docsDir = path.join(tmpDir, 'docs');
  fs.mkdirSync(docsDir);
  fs.writeFileSync(path.join(docsDir, 'mtb.md'), '# MTB Protocol\nDetailed protocol specification.\nVersion 2.2 updates.');
  fs.writeFileSync(path.join(docsDir, 'other.md'), '# Other\nUnrelated documentation.');

  // Daily logs
  const logsDir = path.join(tmpDir, 'logs');
  fs.mkdirSync(logsDir);
  const today = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(path.join(logsDir, `${today}.md`), '# Session\nDiscussed MTB Protocol.\nReviewed OMPA integration.');

  // Notices
  fs.writeFileSync(path.join(tmpDir, 'notices.md'), '## 2026-04-25 — MTB Protocol Update\nProtocol v2.2 released.\n\n## 2026-04-20 — General\nTeam standup notes.');
}

function cleanupFixtures() {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ─── Pliamem Construction ───────────────────────────────────────────────────

describe('Pliamem construction', () => {
  it('constructs with default config', () => {
    const p = new Pliamem();
    assert.ok(p.weights);
    assert.ok(typeof p.recall === 'function');
    assert.ok(typeof p.status === 'function');
  });

  it('accepts custom weights', () => {
    const p = new Pliamem({ weights: { brain: 2.0, kg: 0.5 } });
    assert.strictEqual(p.weights.brain, 2.0);
    assert.strictEqual(p.weights.kg, 0.5);
  });
});

// ─── setLayer ───────────────────────────────────────────────────────────────

describe('Pliamem.setLayer()', () => {
  before(setupFixtures);
  after(cleanupFixtures);

  it('accepts adapter instances directly', () => {
    const p = new Pliamem();
    const adapter = new KgAdapter({ path: path.join(tmpDir, 'kg.json') });
    p.setLayer('kg', adapter);
    assert.ok(p._adapters.kg);
  });

  it('accepts adapter config objects', () => {
    const p = new Pliamem();
    p.setLayer('kg', { type: 'kg', path: path.join(tmpDir, 'kg.json') });
    assert.ok(p._adapters.kg);
  });

  it('throws for unknown adapter type', () => {
    const p = new Pliamem();
    assert.throws(() => p.setLayer('x', { type: 'nonexistent' }), /Unknown adapter type/);
  });
});

// ─── Recall (full pipeline) ─────────────────────────────────────────────────

describe('Pliamem.recall()', () => {
  before(setupFixtures);
  after(cleanupFixtures);

  it('returns ranked results from multiple adapters', async () => {
    const p = new Pliamem({ weights: { kg: 0.8, docs: 0.5 } });
    p.setLayer('kg', new KgAdapter({ path: path.join(tmpDir, 'kg.json') }));
    p.setLayer('docs', new FlatFileAdapter({ path: path.join(tmpDir, 'docs') }));

    const results = await p.recall('MTB Protocol');
    assert.ok(results.length >= 2, 'should get results from both layers');

    // Results should be sorted by finalScore
    for (let i = 1; i < results.length; i++) {
      assert.ok(results[i - 1].finalScore >= results[i].finalScore, 'results should be sorted');
    }

    // Each result should have a finalScore
    results.forEach(r => {
      assert.ok(r.finalScore !== undefined, 'should have finalScore');
      assert.ok(r.layer, 'should have layer');
      assert.ok(r.path, 'should have path');
    });
  });

  it('filters by single layer when opts.layer is set', async () => {
    const p = new Pliamem();
    p.setLayer('kg', new KgAdapter({ path: path.join(tmpDir, 'kg.json') }));
    p.setLayer('docs', new FlatFileAdapter({ path: path.join(tmpDir, 'docs') }));

    const results = await p.recall('MTB Protocol', { layer: 'kg' });
    results.forEach(r => assert.strictEqual(r.layer, 'kg'));
  });

  it('respects --top option', async () => {
    const p = new Pliamem();
    p.setLayer('kg', new KgAdapter({ path: path.join(tmpDir, 'kg.json') }));
    p.setLayer('docs', new FlatFileAdapter({ path: path.join(tmpDir, 'docs') }));

    const results = await p.recall('MTB', { top: 1 });
    assert.strictEqual(results.length, 1);
  });

  it('handles adapter errors gracefully', async () => {
    const p = new Pliamem();
    // Set a mock adapter that throws
    p._adapters.broken = {
      search: async () => { throw new Error('adapter exploded'); },
    };
    p.setLayer('kg', new KgAdapter({ path: path.join(tmpDir, 'kg.json') }));

    // Should not throw, should just skip the broken adapter
    const results = await p.recall('MTB Protocol');
    assert.ok(Array.isArray(results));
  });

  it('returns empty for no matches', async () => {
    const p = new Pliamem();
    p.setLayer('kg', new KgAdapter({ path: path.join(tmpDir, 'kg.json') }));
    const results = await p.recall('completely-nonexistent-term-xyz-123');
    assert.strictEqual(results.length, 0);
  });
});

// ─── Status ─────────────────────────────────────────────────────────────────

describe('Pliamem.status()', () => {
  before(setupFixtures);
  after(cleanupFixtures);

  it('returns status for all registered adapters', async () => {
    const p = new Pliamem();
    p.setLayer('kg', new KgAdapter({ path: path.join(tmpDir, 'kg.json') }));
    p.setLayer('docs', new FlatFileAdapter({ path: path.join(tmpDir, 'docs') }));

    const status = await p.status();
    assert.ok(status.kg, 'should have kg status');
    assert.ok(status.docs, 'should have docs status');
    assert.strictEqual(status.kg.ok, true);
    assert.strictEqual(status.docs.ok, true);
  });

  it('reports adapter failures without crashing', async () => {
    const p = new Pliamem();
    p._adapters.broken = {
      status: async () => { throw new Error('broken'); },
    };

    const status = await p.status();
    assert.strictEqual(status.broken.ok, false);
    assert.ok(status.broken.error.includes('broken'));
  });
});

// ─── All adapters together ──────────────────────────────────────────────────

describe('Full stack recall', () => {
  before(setupFixtures);
  after(cleanupFixtures);

  it('searches across all 4 testable adapter types', async () => {
    const p = new Pliamem({
      weights: { kg: 0.8, docs: 0.5, logs: 0.4, notices: 0.3 },
    });

    p.setLayer('kg', new KgAdapter({ path: path.join(tmpDir, 'kg.json') }));
    p.setLayer('docs', new FlatFileAdapter({ path: path.join(tmpDir, 'docs') }));
    p.setLayer('logs', new DailyLogAdapter({ path: path.join(tmpDir, 'logs') }));
    p.setLayer('notices', new NoticesAdapter({ path: path.join(tmpDir, 'notices.md') }));

    const results = await p.recall('MTB Protocol');

    // Should get results from multiple layers
    const layers = new Set(results.map(r => r.layer));
    assert.ok(layers.size >= 2, `expected results from ≥2 layers, got: ${[...layers].join(', ')}`);

    // All results should have required fields
    results.forEach(r => {
      assert.ok(r.layer, 'missing layer');
      assert.ok(r.path, 'missing path');
      assert.ok(typeof r.score === 'number', 'score should be a number');
      assert.ok(typeof r.finalScore === 'number', 'finalScore should be a number');
      assert.ok(typeof r.excerpt === 'string', 'excerpt should be a string');
    });
  });
});
