const { init } = require('@heyputer/puter.js/src/init.cjs');

let _puter = null;

function getPuter() {
  if (!_puter) {
    const token = process.env.PUTER_AUTH_TOKEN;
    if (!token) throw new Error('PUTER_AUTH_TOKEN env var required for Puter features');
    _puter = init(token);
  }
  return _puter;
}

module.exports = { getPuter };
