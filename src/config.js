/**
 * config.js — Configuration loader for pliamem
 *
 * Loads config from (in priority order):
 *   1. Explicit config object passed to constructor
 *   2. User config: ~/.pliamem/config.json
 *   3. Project config: ./config/default.json
 *   4. Hardcoded defaults from defaults.js
 *
 * Environment variables always override file-based config for layer paths.
 */

const fs = require('fs');
const path = require('path');
const { DEFAULT_WEIGHTS, LAYER_TYPE } = require('./defaults');

const HOME = process.env.HOME || process.env.USERPROFILE || '';
const USER_CONFIG_PATH = path.join(HOME, '.pliamem', 'config.json');
const PROJECT_CONFIG_PATH = path.join(__dirname, '..', 'config', 'default.json');

/**
 * Load and merge configuration from all sources.
 * @param {object} [overrides] - Explicit config to merge on top
 * @returns {{ weights: object, adapters: object, ranker: object }}
 */
function loadConfig(overrides = {}) {
  let projectConfig = {};
  let userConfig = {};

  // Load project-level defaults
  try {
    if (fs.existsSync(PROJECT_CONFIG_PATH)) {
      projectConfig = JSON.parse(fs.readFileSync(PROJECT_CONFIG_PATH, 'utf8'));
    }
  } catch (e) {
    console.warn(`[pliamem] failed to load project config: ${e.message}`);
  }

  // Load user-level overrides
  try {
    if (fs.existsSync(USER_CONFIG_PATH)) {
      userConfig = JSON.parse(fs.readFileSync(USER_CONFIG_PATH, 'utf8'));
    }
  } catch (e) {
    console.warn(`[pliamem] failed to load user config: ${e.message}`);
  }

  // Merge: project defaults → user overrides → explicit overrides
  const merged = deepMerge(projectConfig, userConfig, overrides);

  // Extract weights from adapter configs if not set at top level
  const weights = merged.weights || {};
  if (merged.adapters) {
    for (const [name, cfg] of Object.entries(merged.adapters)) {
      if (cfg.weight !== undefined && weights[name] === undefined) {
        weights[name] = cfg.weight;
      }
    }
  }

  // Fill missing weights from defaults
  for (const [name, weight] of Object.entries(DEFAULT_WEIGHTS)) {
    if (weights[name] === undefined) weights[name] = weight;
  }

  return {
    weights,
    adapters: merged.adapters || {},
    ranker: merged.ranker || { recencyDecay: true, dedup: true },
  };
}

/**
 * Deep merge objects (right wins on conflict). Arrays are replaced, not merged.
 * @param {...object} objects
 * @returns {object}
 */
function deepMerge(...objects) {
  const result = {};
  for (const obj of objects) {
    if (!obj || typeof obj !== 'object') continue;
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object' && !Array.isArray(value) &&
          result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
        result[key] = deepMerge(result[key], value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

module.exports = { loadConfig, USER_CONFIG_PATH, PROJECT_CONFIG_PATH };
