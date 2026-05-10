/**
 * defaults.js — Shared constants for pliamem
 *
 * Single source of truth for layer paths, weights, and type mappings.
 * Used by both the programmatic API (index.js) and CLI (cli.js).
 */

const path = require('path');

const HOME = process.env.HOME || process.env.USERPROFILE || '';

/**
 * Default paths for each memory layer, sourced from environment or fallbacks.
 */
const DEFAULT_LAYER_PATHS = {
  brain:   process.env.PLIAMEM_OMPA_VAULT  || path.join(HOME, '.ompa/shared'),
  kg:      process.env.PLIAMEM_KG_PATH     || path.join(HOME, '.ompa/knowledge-graph.json'),
  docs:    process.env.PLIAMEM_DOCS_DIR    || path.join(HOME, 'memory'),
  logs:    process.env.PLIAMEM_LOGS_DIR    || path.join(HOME, 'memory'),
  notices: process.env.PLIAMEM_NOTICES_PATH || path.join(HOME, 'vault/TEAM_NOTICES.md'),
  team:    process.env.PLIAMEM_REMOTE_URL  || null,
  cloud:   process.env.PUTER_AUTH_TOKEN    || null,
};

/**
 * Default ranking weights per layer.
 */
const DEFAULT_WEIGHTS = { brain: 1.0, kg: 0.8, team: 0.7, cloud: 0.7, docs: 0.5, logs: 0.4, notices: 0.3 };

/**
 * Maps layer names to adapter types for auto-initialization.
 */
const LAYER_TYPE = {
  brain: 'ompa',
  kg: 'kg',
  docs: 'flat',
  logs: 'dailylog',
  notices: 'notices',
  team: 'remote',
  cloud: 'puter',
};

module.exports = { DEFAULT_LAYER_PATHS, DEFAULT_WEIGHTS, LAYER_TYPE };
