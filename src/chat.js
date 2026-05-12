const readline = require('readline');
const { getPuter } = require('./puter-client');

async function startChat(pliamem) {
  const puter = getPuter();
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\x1b[36mYou:\x1b[0m '
  });

  const sep = '─'.repeat(60);
  console.log(`\n🧠 pliamem interactive chat mode\n${sep}`);
  console.log('Type "exit" or "quit" to end the session.\n');

  let history = [
    { role: 'system', content: 'You are an AI assistant integrated with Pliamem, a unified memory recall system. You answer user questions using the memory context provided. Be helpful, concise, and direct.' }
  ];

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }
    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      console.log('Goodbye!');
      process.exit(0);
    }

    try {
      process.stdout.write('\x1b[90mThinking... (recalling memories)\x1b[0m\r');
      
      // Recall memory context based on the current user input
      const results = await pliamem.recall(input, { limit: 5 });
      
      let contextStr = '';
      if (results.length > 0) {
        contextStr = "Relevant memory context:\n" + results.slice(0, 5).map((r, i) => 
          `[${i+1}] Layer: ${r.layer} | ${r.path}\n${r.excerpt?.slice(0, 300) || ''}`
        ).join('\n\n') + "\n\n";
      }

      // We append context to the user's prompt temporarily for the API call
      const userMessage = contextStr + `User Question: ${input}`;
      
      const currentMessages = [...history, { role: 'user', content: userMessage }];

      const response = await puter.ai.chat(currentMessages);
      const answer = response?.message?.content ?? String(response);

      // Clear thinking text
      process.stdout.write('\x1b[2K\r');
      
      console.log(`\x1b[35mPliamem:\x1b[0m ${answer}\n`);

      // Store clean history (without the heavy context payload to save tokens for future turns)
      history.push({ role: 'user', content: input });
      history.push({ role: 'assistant', content: answer });

    } catch (e) {
      process.stdout.write('\x1b[2K\r');
      if (e.message.includes('PUTER_AUTH_TOKEN')) {
        console.error('❌ Set PUTER_AUTH_TOKEN env var to use AI features.');
        process.exit(1);
      } else {
        console.error(`\x1b[31m❌ Error:\x1b[0m ${e.message}\n`);
      }
    }

    rl.prompt();
  }).on('close', () => {
    console.log('Goodbye!');
    process.exit(0);
  });
}

module.exports = { startChat };
