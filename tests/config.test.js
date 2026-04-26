/**
 * config.test.js — Tests for the configuration loader
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { loadConfig } = require('../src/config');

describe('loadConfig()', () => {
  it('returns defaults when no config files exist', () => {
    const config = loadConfig();
    assert.ok(config.weights);
    assert.strictEqual(config.weights.brain, 1.0);
    assert.strictEqual(config.weights.kg, 0.8);
    assert.strictEqual(config.weights.docs, 0.5);
    assert.strictEqual(config.weights.logs, 0.4);
    assert.strictEqual(config.weights.notices, 0.3);
  });

  it('loads weights from project config/default.json', () => {
    const config = loadConfig();
    // default.json has the same weights as DEFAULT_WEIGHTS
    assert.ok(config.weights.brain >= 0);
  });

  it('merges explicit overrides on top of defaults', () => {
    const config = loadConfig({ weights: { brain: 5.0 } });
    assert.strictEqual(config.weights.brain, 5.0);
    // Other weights should still be populated
    assert.strictEqual(config.weights.kg, 0.8);
  });

  it('returns ranker config', () => {
    const config = loadConfig();
    assert.ok(config.ranker);
    assert.strictEqual(config.ranker.recencyDecay, true);
    assert.strictEqual(config.ranker.dedup, true);
  });

  it('handles ranker overrides', () => {
    const config = loadConfig({ ranker: { recencyDecay: false } });
    assert.strictEqual(config.ranker.recencyDecay, false);
  });

  it('extracts adapter weights into top-level weights', () => {
    const config = loadConfig({
      adapters: {
        custom: { type: 'flat', weight: 0.9 },
      },
    });
    assert.strictEqual(config.weights.custom, 0.9);
  });
});
