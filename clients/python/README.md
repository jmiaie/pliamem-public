# Pliamem Python Client

Official Python SDK for [Pliamem](https://github.com/jmiaie/pliamem-public), the unified memory microservice for AI agents.

## Installation

```bash
pip install pliamem
```

## Quick Start

Make sure your Pliamem Node.js server is running (`node src/server.js`).

```python
from pliamem import PliamemClient

client = PliamemClient(base_url="http://127.0.0.1:3000")

# Ask a direct question synthesized from memory
response = client.ask("What is the MTB Protocol?")
print(response["answer"])

# Search across all memory layers
results = client.search("MTB Protocol", top=3)
for res in results:
    print(f"[{res['layer']}] {res.get('excerpt', '')[:50]}...")
```
