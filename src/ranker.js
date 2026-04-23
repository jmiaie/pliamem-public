/**
 * ranker.js — Scores, merges, and deduplicates results from all adapters
 */

/**
 * Merge results from multiple adapters, apply weights, recency, and dedup.
 * @param {SearchResult[]} results - Flat array of results from all adapters
 * @param {object} weights - { layerName: weightFloat }
 * @param {object} opts - { recent: boolean }
 */
function rank(results, weights = {}, opts = {}) {
  // Build recency map from date patterns in path/excerpt
  const scored = results.map(r => {
    const baseWeight = weights[r.layer] !== undefined ? weights[r.layer] : 1.0;
    const recency = calcRecency(r.path, r.excerpt);
    return {
      ...r,
      finalScore: r.score * baseWeight * recency,
    };
  });

  // Deduplicate by content similarity (simple: same path OR same excerpt < 80% diff)
  const deduped = deduplicate(scored);

  // Sort descending by finalScore
  return deduped.sort((a, b) => b.finalScore - a.finalScore);
}

/**
 * Calculate recency factor (1.0 for recent, decaying for older).
 * Currently uses date pattern matching in path.
 */
function calcRecency(path, excerpt) {
  const text = (path + ' ' + excerpt).toLowerCase();

  // Recent = this week
  if (text.includes('2026-04-2') || text.includes('2026-04-1')) return 1.0;
  if (text.includes('2026-03-3')) return 0.9;
  if (text.includes('2026-03-2')) return 0.7;
  if (text.includes('2026-03-1')) return 0.5;

  return 0.3; // older
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
 * Build a canonical key for deduping (layer + path basename).
 */
function canonicalKey(r) {
  const basename = r.path.split('/').pop().split('\\').pop();
  return `${r.layer}::${basename}::${r.excerpt.slice(0, 60)}`;
}

module.exports = { rank };
