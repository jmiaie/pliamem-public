import './style.css'

const API_URL = 'http://127.0.0.1:3000';
let currentController = null;

const elements = {
  searchInput: document.getElementById('search-input'),
  searchBtn: document.getElementById('search-btn'),
  resultsContainer: document.getElementById('results-container'),
  statusText: document.getElementById('status-text'),
  statusIndicator: document.querySelector('.status-indicator'),
  recentToggle: document.getElementById('recent-toggle'),
  modeSearch: document.getElementById('mode-search'),
  modeAsk: document.getElementById('mode-ask'),
};

let currentMode = 'search';

// Check API Status
async function checkStatus() {
  try {
    const res = await fetch(`${API_URL}/v1/status`);
    if (res.ok) {
      const data = await res.json();
      const layersCount = Object.keys(data.status || {}).length;
      elements.statusText.textContent = `Connected (${layersCount} layers)`;
      elements.statusIndicator.classList.add('online');
      elements.statusIndicator.classList.remove('offline');
    } else {
      throw new Error('Not OK');
    }
  } catch (err) {
    elements.statusText.textContent = 'Offline';
    elements.statusIndicator.classList.add('offline');
    elements.statusIndicator.classList.remove('online');
  }
}

// Perform Search
async function performSearch() {
  const query = elements.searchInput.value.trim();
  if (!query) {
    elements.resultsContainer.innerHTML = `
      <div class="empty-state">
        <p>Your AI's memory, unified. Enter a query to begin recall.</p>
      </div>`;
    return;
  }

  const isRecent = elements.recentToggle.checked;
  
  if (currentController) currentController.abort();
  currentController = new AbortController();

  elements.resultsContainer.innerHTML = `
    <div class="empty-state loading-pulse">
      <p>Searching memory layers...</p>
    </div>`;

  try {
    let url = '';
    if (currentMode === 'search') {
      url = `${API_URL}/v1/recall?query=${encodeURIComponent(query)}&top=10&recent=${isRecent}`;
    } else {
      url = `${API_URL}/v1/ask?query=${encodeURIComponent(query)}`;
    }

    const res = await fetch(url, { signal: currentController.signal });
    
    if (!res.ok) throw new Error('Query failed');
    const data = await res.json();
    
    if (currentMode === 'search') {
      renderResults(data.results);
    } else {
      renderAiAnswer(data);
    }
  } catch (err) {
    if (err.name === 'AbortError') return;
    elements.resultsContainer.innerHTML = `
      <div class="empty-state" style="color: #ef4444">
        <p>Error: ${err.message}. Make sure Pliamem server is running.</p>
      </div>`;
  }
}

function renderAiAnswer(data) {
  let html = `
    <div class="ai-answer-card glass">
      <h3>✨ AI Synthesis</h3>
      <div class="ai-content">${escapeHtml(data.answer)}</div>
    </div>
  `;

  if (data.sources && data.sources.length > 0) {
    html += `<h4 class="sources-title">Sources Context</h4>`;
    html += data.sources.map((r, i) => `
      <div class="result-card glass" style="animation-delay: ${i * 0.05}s">
        <div class="result-header">
          <span class="result-layer">${r.layer}</span>
          <span class="result-score">[${r.ref}] Score: ${(r.score || 0).toFixed(3)}</span>
        </div>
        <div class="result-path">📄 ${r.path}</div>
      </div>
    `).join('');
  }

  elements.resultsContainer.innerHTML = html;
}

function renderResults(results) {
  if (!results || results.length === 0) {
    elements.resultsContainer.innerHTML = `
      <div class="empty-state">
        <p>No memories found for this query.</p>
      </div>`;
    return;
  }

  elements.resultsContainer.innerHTML = results.map((r, i) => `
    <div class="result-card glass" style="animation-delay: ${i * 0.05}s">
      <div class="result-header">
        <span class="result-layer">${r.layer}</span>
        <span class="result-score">${(r.finalScore || r.score).toFixed(3)}</span>
      </div>
      <div class="result-path">📄 ${r.path}</div>
      <div class="result-excerpt">${escapeHtml(r.excerpt || '(no content)')}</div>
    </div>
  `).join('');
}

function escapeHtml(unsafe) {
  return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
}

// Event Listeners
elements.searchBtn.addEventListener('click', performSearch);
elements.searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') performSearch();
});
elements.recentToggle.addEventListener('change', () => {
  if (elements.searchInput.value.trim() && currentMode === 'search') performSearch();
});

elements.modeSearch.addEventListener('click', () => {
  currentMode = 'search';
  elements.modeSearch.classList.add('active');
  elements.modeAsk.classList.remove('active');
  elements.searchInput.placeholder = 'Search your unified memory...';
});

elements.modeAsk.addEventListener('click', () => {
  currentMode = 'ask';
  elements.modeAsk.classList.add('active');
  elements.modeSearch.classList.remove('active');
  elements.searchInput.placeholder = 'Ask the AI a question about your memory...';
});

// Initial Setup
checkStatus();
setInterval(checkStatus, 10000);
