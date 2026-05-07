const fs = require('fs');
const path = require('path');

class KVStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = {};
    this.load();
  }

  load() {
    if (fs.existsSync(this.filePath)) {
      try {
        this.data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      } catch (e) {
        this.data = {};
      }
    }
  }

  save() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
  }

  get(key, def) {
    return this.data[key] !== undefined ? this.data[key] : def;
  }

  set(key, value) {
    this.data[key] = value;
    this.save();
  }
}

module.exports = { KVStore };
