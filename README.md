<div align="center">
  <h1>🧩 Pliamem</h1>
  <p><b>Your AI's memory, unified. A pliable memory microservice for AI swarms and agents.</b></p>
  
  [![Version](https://img.shields.io/badge/version-0.5.0-blue.svg)](https://github.com/jmiaie/pliamem-public)
  [![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
  [![License](https://img.shields.io/badge/license-Copyright-red.svg)](#license)
  [![Micap AI](https://img.shields.io/badge/built%20by-Micap%20AI-purple.svg)](https://github.com/jmiaie)
</div>

---

## 📖 About Pliamem

As AI agents and LLM swarms become more complex, **memory fragmentation** becomes a critical bottleneck. Agents need context from various disconnected sources—vector brains, knowledge graphs, team documentation, and cloud databases.

**Pliamem** (pronounced *"PLY-ah-mem"*) solves this. It acts as a central **memory routing microservice**. A single query searches your entire memory stack, ranks the results using a sophisticated recency and relevance scoring algorithm, and returns deduplicated context perfectly formatted for LLM context windows. 

It is designed with a clean **Adapter Pattern**, allowing seamless integration with local file systems, Python-based vector stores, and cloud Key-Value infrastructure.

### 🌟 Why Engineering Teams & Recruiters Should Care
- **Scalable Architecture:** Built in modular Node.js, utilizing the Adapter design pattern for limitless extensibility and separation of concerns.
- **RESTful API & Webhooks:** Includes a built-in server for distributed agent recall across local networks.
- **AI Synthesis Integration:** Native integration with `@heyputer/puter.js` for instant, AI-synthesized answers derived directly from your memory context.
- **Zero-Dependency Core:** The base engine runs entirely without `npm install` requirements, ensuring lightweight deployments.

---

## 🇺🇸 Quick Start (English)

### Installation
```bash
git clone https://github.com/jmiaie/pliamem-public.git pliamem
cd pliamem
```

### Usage
```bash
# Ask the AI to synthesize an answer from your memory (requires PUTER_AUTH_TOKEN)
node src/cli.js ask "What is the ZTB Protocol?"

# Search across all memory layers
node src/cli.js search "ZTB Protocol"

# Search a specific layer (e.g., your vector brain or cloud KV)
node src/cli.js search "Tai" --layer=brain

# Start the REST API server for remote agent access
node src/server.js
```

---

## 🇪🇸 Inicio Rápido (Español)

### Instalación
```bash
git clone https://github.com/jmiaie/pliamem-public.git pliamem
cd pliamem
```

### Uso
```bash
# Pide a la IA que sintetice una respuesta desde tu memoria (requiere PUTER_AUTH_TOKEN)
node src/cli.js ask "¿Qué es el Protocolo ZTB?"

# Buscar en todas las capas de memoria
node src/cli.js search "ZTB Protocol"

# Buscar en una capa específica (ej. tu cerebro de vectores)
node src/cli.js search "Tai" --layer=brain

# Iniciar el servidor API REST para acceso remoto
node src/server.js
```

---

## 🇫🇷 Démarrage Rapide (Français)

### Installation
```bash
git clone https://github.com/jmiaie/pliamem-public.git pliamem
cd pliamem
```

### Utilisation
```bash
# Demandez à l'IA de synthétiser une réponse à partir de votre mémoire (nécessite PUTER_AUTH_TOKEN)
node src/cli.js ask "Qu'est-ce que le protocole ZTB ?"

# Rechercher dans toutes les couches de mémoire
node src/cli.js search "ZTB Protocol"

# Rechercher dans une couche spécifique (ex. votre cerveau vectoriel)
node src/cli.js search "Tai" --layer=brain

# Démarrer le serveur API REST pour l'accès distant
node src/server.js
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
