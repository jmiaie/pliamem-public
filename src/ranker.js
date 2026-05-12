/**
 * ranker.js — Scores, merges, and deduplicates results from all adapters
 */

/**
 * @typedef {import('./adapters/base').SearchResult} SearchResult
 */

/**
 * Merge results from multiple adapters, apply weights, recency, and dedup.
 * @param {SearchResult[]} results - Flat array of results from all adapters
 * @param {object} weights - { layerName: weightFloat }
 * @param {object} opts - { recent: boolean }
 * @returns {SearchResult[]} Ranked, deduplicated results
 */
function rank(results, weights = {}, opts = {}) {
  const now = Date.now();

  const scored = results.map(r => {
    const baseWeight = weights[r.layer] !== undefined ? weights[r.layer] : 1.0;
    const recency = calcRecency(r.path, r.excerpt, now);
    return {
      ...r,
      finalScore: r.score * baseWeight * recency,
    };
  });

  const deduped = deduplicate(scored);
  const sorted = deduped.sort((a, b) => b.finalScore - a.finalScore);

  let finalResults = opts.top > 0 ? sorted.slice(0, opts.top) : sorted;

  if (opts.maxTokens > 0) {
    const charsPerToken = 4;
    let currentTokens = 0;
    const truncatedResults = [];

    for (const r of finalResults) {
      const excerptTokens = Math.ceil((r.excerpt || '').length / charsPerToken);
      
      if (currentTokens + excerptTokens > opts.maxTokens) {
        const tokensLeft = opts.maxTokens - currentTokens;
        if (tokensLeft > 0) {
          const newExcerpt = (r.excerpt || '').slice(0, tokensLeft * charsPerToken);
          truncatedResults.push({ ...r, excerpt: newExcerpt + '...' });
        }
        break;
      }
      
      truncatedResults.push(r);
      currentTokens += excerptTokens;
    }
    finalResults = truncatedResults;
  }

  return finalResults;
}

const DATE_PATTERN = /(\d{4}-\d{2}-\d{2})/;

/**
 * Calculate recency factor based on date found in path or excerpt.
 * Returns 1.0 for today, decaying toward 0.3 over ~30 days.
 * @param {string} filePath
 * @param {string} excerpt
 * @param {number} now - Current timestamp (ms)
 * @returns {number} Recency factor between 0.3 and 1.0
 */
function calcRecency(filePath, excerpt, now) {
  const text = (filePath || '') + ' ' + (excerpt || '');
  const match = text.match(DATE_PATTERN);
  if (!match) return 0.3;

  const entryDate = new Date(match[1]).getTime();
  if (isNaN(entryDate)) return 0.3;

  const daysSince = (now - entryDate) / (1000 * 60 * 60 * 24);

  if (daysSince <= 3) return 1.0;
  if (daysSince <= 7) return 0.9;
  if (daysSince <= 14) return 0.7;
  if (daysSince <= 30) return 0.5;
  return 0.3;
}

/**
 * Deduplicate results — keep highest-scored occurrence.
 */
function deduplicate(results) {
  const seen = new Map();

  for (const r of results) {
    const key = canonicalKey(r);
    const prev = seen.get(key);
    if (!prev || r.finalScore > prev.finalScore) {
      seen.set(key, r);
    }
  }

  return Array.from(seen.values());
}

/**
 * Build a canonical key for deduping (layer + path basename + excerpt prefix).
 */
function canonicalKey(r) {
  const basename = (r.path || '').split('/').pop().split('\\').pop();
  return `${r.layer}::${basename}::${(r.excerpt || '').slice(0, 60)}`;
}

module.exports = { rank };
