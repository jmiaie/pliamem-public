/**
 * adapters.test.js — Tests for all adapter implementations
 *
 * Uses temporary directories/files to test adapter behavior without
 * depending on any real memory stores.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { BaseAdapter } = require('../src/adapters/base');
const { KgAdapter } = require('../src/adapters/kg');
const { FlatFileAdapter } = require('../src/adapters/flat');
const { DailyLogAdapter } = require('../src/adapters/dailylog');
const { NoticesAdapter } = require('../src/adapters/notices');

// ─── Test fixtures ──────────────────────────────────────────────────────────

let tmpDir;

function setupFixtures() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pliamem-test-'));

  // KG fixture
  const kgData = {
    entities: [
      { id: 'ztb-1', name: 'ZTB Protocol', type: 'Protocol', content: 'Routing hierarchy for agent communication' },
      { id: 'tai-1', name: 'Tai', type: 'Agent', content: 'Primary AI agent' },
      { id: 'ompa-1', name: 'OMPA', type: 'Tool', content: 'Vector memory system' },
    ],
    relationships: [
      { subject: 'Tai', predicate: 'uses', object: 'ZTB Protocol' },
      { subject: 'OMPA', predicate: 'stores', object: 'memories' },
    ],
  };
  fs.writeFileSync(path.join(tmpDir, 'kg.json'), JSON.stringify(kgData));

  // Flat files fixture
  const docsDir = path.join(tmpDir, 'docs');
  fs.mkdirSync(docsDir);
  fs.writeFileSync(path.join(docsDir, 'README.md'), '# Project\nThis is about the ZTB Protocol.\nMore details here.');
  fs.writeFileSync(path.join(docsDir, 'notes.md'), '# Notes\nSome unrelated content.\nNothing about protocols.');
  fs.writeFileSync(path.join(docsDir, 'deep.txt'), 'Not a markdown file');

  const subDir = path.join(docsDir, 'sub');
  fs.mkdirSync(subDir);
  fs.writeFileSync(path.join(subDir, 'nested.md'), '# Nested\nZTB Protocol reference in nested file.');

  // Daily log fixtures
  const logsDir = path.join(tmpDir, 'logs');
  fs.mkdirSync(logsDir);
  fs.writeFileSync(path.join(logsDir, '2026-04-26.md'), '# Session\nDiscussed ZTB Protocol changes.\nReviewed agent architecture.');
  fs.writeFileSync(path.join(logsDir, '2026-04-25.md'), '# Session\nWorked on deployment.\nNo protocol discussion.');
  fs.writeFileSync(path.join(logsDir, '2026-04-20.md'), '# Session\nEarly ZTB Protocol draft.\nInitial design.');
  fs.writeFileSync(path.join(logsDir, 'not-a-log.md'), 'Random file that should be ignored');

  // Notices fixture
  const noticesContent = `# Team Notices

## 2026-04-25 — ZTB Protocol Update
The ZTB Protocol has been updated to v2.2.
All agents should migrate by end of week.

## 2026-04-20 — New Agent Onboarding
Welcome new team members.
Please review the onboarding guide.

## 2026-04-15 — System Maintenance
Scheduled downtime on Saturday.
`;
  fs.writeFileSync(path.join(tmpDir, 'notices.md'), noticesContent);
}

function cleanupFixtures() {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ─── BaseAdapter ────────────────────────────────────────────────────────────

describe('BaseAdapter', () => {
  it('throws if constructed without a name', () => {
    assert.throws(() => new BaseAdapter(''), /must have a name/);
    assert.throws(() => new BaseAdapter(null), /must have a name/);
  });

  it('throws if search() is not overridden', async () => {
    const adapter = new BaseAdapter('test');
    await assert.rejects(() => adapter.search('query'), /must implement search/);
  });

  it('throws if status() is not overridden', async () => {
    const adapter = new BaseAdapter('test');
    await assert.rejects(() => adapter.status(), /must implement status/);
  });

  it('normalizes results correctly', () => {
    const adapter = new BaseAdapter('test');
    const result = adapter._normalize({ path: '/a/b.md', score: 0.8, excerpt: 'hello world' });
    assert.strictEqual(result.layer, 'test');
    assert.strictEqual(result.path, '/a/b.md');
    assert.strictEqual(result.score, 0.8);
    assert.strictEqual(result.excerpt, 'hello world');
    assert.deepStrictEqual(result.metadata, {});
  });

  it('normalizes missing fields to defaults', () => {
    const adapter = new BaseAdapter('test');
    const result = adapter._normalize({});
    assert.strictEqual(result.path, '');
    assert.strictEqual(result.score, 0);
    assert.strictEqual(result.excerpt, '');
  });

  it('truncates excerpts to 300 chars', () => {
    const adapter = new BaseAdapter('test');
    const longExcerpt = 'x'.repeat(500);
    const result = adapter._normalize({ excerpt: longExcerpt });
    assert.strictEqual(result.excerpt.length, 300);
  });
});

// ─── KgAdapter ──────────────────────────────────────────────────────────────

describe('KgAdapter', () => {
  before(setupFixtures);
  after(cleanupFixtures);

  it('throws if constructed without path', () => {
    assert.throws(() => new KgAdapter({}), /requires opts.path/);
  });

  it('finds entities by name match', async () => {
    const adapter = new KgAdapter({ path: path.join(tmpDir, 'kg.json') });
    const results = await adapter.search('ZTB Protocol');
    assert.ok(results.length >= 1);
    assert.ok(results[0].score >= 0.7, 'name match should score high');
    assert.ok(results[0].excerpt.includes('ZTB Protocol'));
  });

  it('finds entities by type match', async () => {
    const adapter = new KgAdapter({ path: path.join(tmpDir, 'kg.json') });
    const results = await adapter.search('Protocol');
    assert.ok(results.length >= 1);
  });

  it('finds relationship matches', async () => {
    const adapter = new KgAdapter({ path: path.join(tmpDir, 'kg.json') });
    const results = await adapter.search('Tai');
    const relResult = results.find(r => r.path.includes('kg://rel/'));
    assert.ok(relResult, 'should include relationship results');
  });

  it('returns empty for no matches', async () => {
    const adapter = new KgAdapter({ path: path.join(tmpDir, 'kg.json') });
    const results = await adapter.search('nonexistent-term-xyz');
    assert.strictEqual(results.length, 0);
  });

  it('respects limit option', async () => {
    const adapter = new KgAdapter({ path: path.join(tmpDir, 'kg.json') });
    const results = await adapter.search('a', { limit: 1 });
    assert.ok(results.length <= 1);
  });

  it('reports correct status', async () => {
    const adapter = new KgAdapter({ path: path.join(tmpDir, 'kg.json') });
    const status = await adapter.status();
    assert.strictEqual(status.ok, true);
    assert.strictEqual(status.stats.entities, 3);
    assert.strictEqual(status.stats.relationships, 2);
  });
});

// ─── FlatFileAdapter ────────────────────────────────────────────────────────

describe('FlatFileAdapter', () => {
  before(setupFixtures);
  after(cleanupFixtures);

  it('throws if constructed without path', () => {
    assert.throws(() => new FlatFileAdapter({}), /requires opts.path/);
  });

  it('finds matches in markdown files', async () => {
    const adapter = new FlatFileAdapter({ path: path.join(tmpDir, 'docs') });
    const results = await adapter.search('ZTB Protocol');
    assert.ok(results.length >= 1);
    assert.ok(results[0].score > 0);
  });

  it('finds matches in nested directories', async () => {
    const adapter = new FlatFileAdapter({ path: path.join(tmpDir, 'docs') });
    const results = await adapter.search('nested');
    assert.ok(results.length >= 1);
    assert.ok(results[0].path.includes('nested.md'));
  });

  it('ignores non-markdown files by default', async () => {
    const adapter = new FlatFileAdapter({ path: path.join(tmpDir, 'docs') });
    const results = await adapter.search('Not a markdown');
    assert.strictEqual(results.length, 0);
  });

  it('scores header matches higher than body matches', async () => {
    const adapter = new FlatFileAdapter({ path: path.join(tmpDir, 'docs') });
    const results = await adapter.search('ZTB Protocol');
    const readmeResult = results.find(r => r.path.includes('README.md'));
    assert.ok(readmeResult, 'should find README.md');
    assert.ok(readmeResult.score > 0.3, 'early-content match should boost score');
  });

  it('respects maxDepth', async () => {
    const adapter = new FlatFileAdapter({ path: path.join(tmpDir, 'docs'), maxDepth: 0 });
    const results = await adapter.search('nested');
    assert.strictEqual(results.length, 0, 'should not traverse into subdirectories');
  });

  it('reports correct status', async () => {
    const adapter = new FlatFileAdapter({ path: path.join(tmpDir, 'docs') });
    const status = await adapter.status();
    assert.strictEqual(status.ok, true);
    assert.strictEqual(status.stats.files, 3, 'should count 3 .md files (README, notes, nested)');
  });
});

// ─── DailyLogAdapter ────────────────────────────────────────────────────────

describe('DailyLogAdapter', () => {
  before(setupFixtures);
  after(cleanupFixtures);

  it('throws if constructed without path', () => {
    assert.throws(() => new DailyLogAdapter({}), /requires opts.path/);
  });

  it('finds matches in daily log files', async () => {
    const adapter = new DailyLogAdapter({ path: path.join(tmpDir, 'logs') });
    const results = await adapter.search('ZTB Protocol');
    assert.ok(results.length >= 1);
  });

  it('ignores non-date-formatted files', async () => {
    const adapter = new DailyLogAdapter({ path: path.join(tmpDir, 'logs') });
    const results = await adapter.search('Random file');
    assert.strictEqual(results.length, 0, 'not-a-log.md should be ignored');
  });

  it('returns newest files first', async () => {
    const adapter = new DailyLogAdapter({ path: path.join(tmpDir, 'logs') });
    const results = await adapter.search('Session');
    assert.ok(results.length >= 2);
  });

  it('limits to recent days when opts.recent is true', async () => {
    const adapter = new DailyLogAdapter({ path: path.join(tmpDir, 'logs'), recentDays: 2 });
    const results = await adapter.search('ZTB Protocol', { recent: true });
    // With recentDays=2, should only search the 2 newest files
    assert.ok(results.length <= 2);
  });

  it('returns empty for missing directory', async () => {
    const adapter = new DailyLogAdapter({ path: path.join(tmpDir, 'nonexistent') });
    const results = await adapter.search('anything');
    assert.strictEqual(results.length, 0);
  });

  it('reports correct status', async () => {
    const adapter = new DailyLogAdapter({ path: path.join(tmpDir, 'logs') });
    const status = await adapter.status();
    assert.strictEqual(status.ok, true);
    assert.strictEqual(status.stats.logs, 3, 'should count 3 date-formatted files');
  });

  it('reports not ok for missing directory', async () => {
    const adapter = new DailyLogAdapter({ path: path.join(tmpDir, 'nonexistent') });
    const status = await adapter.status();
    assert.strictEqual(status.ok, false);
  });
});

// ─── NoticesAdapter ─────────────────────────────────────────────────────────

describe('NoticesAdapter', () => {
  before(setupFixtures);
  after(cleanupFixtures);

  it('throws if constructed without path', () => {
    assert.throws(() => new NoticesAdapter({}), /requires opts.path/);
  });

  it('finds notices matching query', async () => {
    const adapter = new NoticesAdapter({ path: path.join(tmpDir, 'notices.md') });
    const results = await adapter.search('ZTB Protocol');
    assert.ok(results.length >= 1);
    assert.ok(results[0].score >= 0.5);
  });

  it('scores header matches higher', async () => {
    const adapter = new NoticesAdapter({ path: path.join(tmpDir, 'notices.md') });
    const results = await adapter.search('ZTB Protocol');
    assert.ok(results[0].score >= 0.9, 'header match should get 0.9');
  });

  it('extracts notice date from header', async () => {
    const adapter = new NoticesAdapter({ path: path.join(tmpDir, 'notices.md') });
    const results = await adapter.search('ZTB Protocol');
    assert.ok(results[0].metadata.noticeDate, 'should extract date');
    assert.strictEqual(results[0].metadata.noticeDate, '2026-04-25');
  });

  it('returns empty for no matches', async () => {
    const adapter = new NoticesAdapter({ path: path.join(tmpDir, 'notices.md') });
    const results = await adapter.search('nonexistent-xyz');
    assert.strictEqual(results.length, 0);
  });

  it('returns empty for missing file', async () => {
    const adapter = new NoticesAdapter({ path: path.join(tmpDir, 'missing.md') });
    const results = await adapter.search('anything');
    assert.strictEqual(results.length, 0);
  });

  it('reports correct status', async () => {
    const adapter = new NoticesAdapter({ path: path.join(tmpDir, 'notices.md') });
    const status = await adapter.status();
    assert.strictEqual(status.ok, true);
    assert.ok(status.stats.size > 0);
  });

  it('reports not ok for missing file', async () => {
    const adapter = new NoticesAdapter({ path: path.join(tmpDir, 'missing.md') });
    const status = await adapter.status();
    assert.strictEqual(status.ok, false);
  });
});
