const { getPuter } = require('./puter-client');

async function ask(query, results) {
  const puter = getPuter();

  if (!results.length) {
    return { answer: 'No relevant memory found for that query.', sources: [] };
  }

  const top = results.slice(0, 6);
  const context = top.map((r, i) =>
    `[${i + 1}] Layer: ${r.layer} | ${r.path}\n${r.excerpt?.slice(0, 300) || '(no excerpt)'}`
  ).join('\n\n');

  const prompt = `You are a memory recall assistant. Answer the question using ONLY the memory context below. Be concise and direct. Cite sources by [number]. If the context doesn't clearly answer the question, say so.

Memory context:
${context}

Question: ${query}`;

  const response = await puter.ai.chat(prompt);
  const answer = response?.message?.content ?? String(response);

  const sources = top.map((r, i) => ({
    ref: i + 1,
    layer: r.layer,
    path: r.path,
    score: r.finalScore ?? r.score,
  }));

  return { answer, sources };
}

module.exports = { ask };
