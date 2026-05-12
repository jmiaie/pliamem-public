<div align="center">
  <h1>🧩 Pliamem</h1>
  <p><b>Your AI's memory, unified. A pliable memory microservice for AI swarms and agents.</b></p>
  
  [![Version](https://img.shields.io/badge/version-0.7.0-blue.svg)](https://github.com/jmiaie/pliamem-public)
  [![NPM](https://img.shields.io/badge/npm-v0.7.0-orange.svg)](https://www.npmjs.com/)
  [![PyPI](https://img.shields.io/badge/pypi-v0.7.0-blue.svg)](https://pypi.org/project/pliamem/)
  [![License](https://img.shields.io/badge/license-Copyright-red.svg)](#license)
  [![Micap AI](https://img.shields.io/badge/built%20by-Micap%20AI-purple.svg)](https://github.com/jmiaie)
</div>

---

## 📖 About Pliamem

As AI agents and LLM swarms become more complex, **memory fragmentation** becomes a critical bottleneck. Agents need context from various disconnected sources—vector brains, knowledge graphs, team documentation, and cloud databases.

**Pliamem** (pronounced *"PLY-ah-mem"*) solves this. It acts as a central **memory routing microservice**. A single query searches your entire memory stack, ranks the results using a sophisticated recency and relevance scoring algorithm, and returns deduplicated context perfectly formatted for LLM context windows. 

It is designed with a clean **Adapter Pattern**, allowing seamless integration with local file systems, Python-based vector stores, and cloud Key-Value infrastructure.

### 🌟 Key Technical Features
- **Scalable Architecture:** Built in modular Node.js, utilizing the Adapter design pattern for limitless extensibility and separation of concerns.
- **Interactive AI REPL:** Continuous terminal chat session (`pliamem chat`) that seamlessly injects background memory context into conversations.
- **Smart Context Optimization:** Dynamic chunking and truncation to respect strict LLM token limits (`--max-tokens`).
- **Cloud State Management:** Sync local memory to the Puter Cloud KV store (`pliamem sync`) and automatically garbage collect old logs (`pliamem prune`).
- **Sleek Cloud UI:** Features a standalone Vite-based web dashboard with dynamic glassmorphism to visualize your memory stack and AI synthesis.
- **Zero-Dependency Core:** The base engine runs entirely without `npm install` requirements, ensuring lightweight local deployments.

---

## 🇺🇸 Quick Start (English)

### Installation
```bash
# Install globally via NPM
npm install -g pliamem
```

### Usage
```bash
# Start an interactive AI memory chat
pliamem chat

# Ask a one-shot question to the AI (requires PUTER_AUTH_TOKEN)
pliamem ask "What is the ZTB Protocol?"

# Search across all memory layers with strict token limits
pliamem search "ZTB Protocol" --max-tokens=1500

# Sync local files, logs, and notices to the cloud KV store
pliamem sync

# Start the REST API server for remote agent access
pliamem serve
```

---

## 🇪🇸 Inicio Rápido (Español)

### Instalación
```bash
npm install -g pliamem
```

### Uso
```bash
# Iniciar un chat interactivo con IA
pliamem chat

# Hacer una pregunta directa a la IA
pliamem ask "¿Qué es el Protocolo ZTB?"

# Buscar en todas las capas con límite de tokens
pliamem search "ZTB Protocol" --max-tokens=1500

# Sincronizar archivos locales a la nube
pliamem sync
```

---

## 🇫🇷 Démarrage Rapide (Français)

### Installation
```bash
npm install -g pliamem
```

### Utilisation
```bash
# Démarrer un chat interactif avec l'IA
pliamem chat

# Poser une question directe à l'IA
pliamem ask "Qu'est-ce que le protocole ZTB ?"

# Rechercher avec une limite de jetons
pliamem search "ZTB Protocol" --max-tokens=1500

# Synchroniser les fichiers locaux avec le cloud
pliamem sync
```

---

## 🏗️ Architecture & Layers

Pliamem auto-initializes via environment variables and supports the following layers natively:

| Layer | Type | Description |
|-------|------|-------------|
| `brain` | **OMPA Adapter** | Semantic vector search on Python-based OMPA brains |
| `kg` | **KG Adapter** | Structured entity + relationship JSON lookup |
| `docs` | **Flat File** | Markdown files with section and header scoring |
| `logs` | **Daily Log** | Chronological session logs with recency weight |
| `cloud` | **Puter Adapter**| Cloud Key-Value storage via `puter.js` |

## 🔌 API & Integration

Pliamem can be imported as a robust library into any Node.js AI project:

```javascript
const { Pliamem } = require('./src');

// Auto-initializes adapters from environment variables
const pliamem = new Pliamem();  

const { answer, sources } = await pliamem.ask('What is the ZTB Protocol?');
console.log(answer);
```

---

<div align="center">
  <p>Copyright 2026 Micap AI LLC. All rights reserved.</p>
</div>
