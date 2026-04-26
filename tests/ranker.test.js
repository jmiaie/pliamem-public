/**
 * ranker.test.js — Tests for the ranking, deduplication, and recency engine
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { rank } = require('../src/ranker');

describe('rank()', () => {
  it('returns empty array for empty input', () => {
    const result = rank([], {});
    assert.deepStrictEqual(result, []);
  });

  it('applies layer weights to scores', () => {
    const results = [
      { layer: 'brain', path: 'test.md', score: 1.0, excerpt: 'test' },
      { layer: 'docs', path: 'test2.md', score: 1.0, excerpt: 'test' },
    ];
    const weights = { brain: 1.0, docs: 0.5 };
    const ranked = rank(results, weights);

    assert.ok(ranked[0].layer === 'brain', 'brain should rank higher with weight 1.0');
    assert.ok(ranked[0].finalScore > ranked[1].finalScore);
  });

  it('uses weight 1.0 for unknown layers', () => {
    const results = [{ layer: 'custom', path: 'x.md', score: 0.8, excerpt: 'x' }];
    const ranked = rank(results, {});
    assert.ok(ranked[0].finalScore > 0, 'should still have a score');
  });

  it('sorts results by finalScore descending', () => {
    const results = [
      { layer: 'a', path: '1.md', score: 0.3, excerpt: 'low' },
      { layer: 'b', path: '2.md', score: 0.9, excerpt: 'high' },
      { layer: 'c', path: '3.md', score: 0.6, excerpt: 'mid' },
    ];
    const ranked = rank(results, { a: 1, b: 1, c: 1 });
    assert.ok(ranked[0].finalScore >= ranked[1].finalScore);
    assert.ok(ranked[1].finalScore >= ranked[2].finalScore);
  });

  it('deduplicates results with same layer + path + excerpt prefix', () => {
    const results = [
      { layer: 'docs', path: 'dir/file.md', score: 0.9, excerpt: 'same excerpt here' },
      { layer: 'docs', path: 'dir/file.md', score: 0.3, excerpt: 'same excerpt here' },
    ];
    const ranked = rank(results, { docs: 1.0 });
    assert.strictEqual(ranked.length, 1, 'duplicates should be removed');
    assert.ok(ranked[0].score === 0.9, 'should keep highest scored');
  });

  it('does not deduplicate results from different layers', () => {
    const results = [
      { layer: 'docs', path: 'file.md', score: 0.9, excerpt: 'content' },
      { layer: 'logs', path: 'file.md', score: 0.5, excerpt: 'content' },
    ];
    const ranked = rank(results, { docs: 1, logs: 1 });
    assert.strictEqual(ranked.length, 2);
  });
});

describe('recency scoring', () => {
  it('gives higher scores to recent dates', () => {
    const today = new Date().toISOString().slice(0, 10);
    const old = '2020-01-01';

    const results = [
      { layer: 'a', path: `log/${today}.md`, score: 1.0, excerpt: 'recent' },
      { layer: 'b', path: `log/${old}.md`, score: 1.0, excerpt: 'old' },
    ];
    const ranked = rank(results, { a: 1, b: 1 });
    assert.ok(ranked[0].finalScore > ranked[1].finalScore, 'recent should score higher');
  });

  it('returns 0.3 factor for paths without dates', () => {
    const results = [{ layer: 'a', path: 'nodates.md', score: 1.0, excerpt: 'no date info' }];
    const ranked = rank(results, { a: 1.0 });
    assert.strictEqual(ranked[0].finalScore, 0.3, 'no date → 0.3 recency factor');
  });
});

describe('--top flag', () => {
  it('limits output when opts.top is set', () => {
    const results = [
      { layer: 'a', path: '1.md', score: 0.9, excerpt: 'a' },
      { layer: 'b', path: '2.md', score: 0.8, excerpt: 'b' },
      { layer: 'c', path: '3.md', score: 0.7, excerpt: 'c' },
    ];
    const ranked = rank(results, { a: 1, b: 1, c: 1 }, { top: 2 });
    assert.strictEqual(ranked.length, 2);
  });

  it('returns all results when top is 0 or not set', () => {
    const results = [
      { layer: 'a', path: '1.md', score: 0.9, excerpt: 'a' },
      { layer: 'b', path: '2.md', score: 0.8, excerpt: 'b' },
    ];
    assert.strictEqual(rank(results, {}, { top: 0 }).length, 2);
    assert.strictEqual(rank(results, {}, {}).length, 2);
  });
});
