/**
 * SHIELDNET // AI Network Security & Phishing Detector
 * Client-Side Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initPresets();
  initSinglePredictForm();
  initBatchUpload();
});

// Toast notification helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'danger') icon = '⚠️';
  
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Tab Switching
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      
      btn.classList.add('active');
      const pane = document.getElementById(target);
      if (pane) pane.classList.add('active');
    });
  });
}

// Presets for the 30 features
const PHISHING_PRESET = {
  having_IP_Address: -1, URL_Length: 1, Shortining_Service: 1, having_At_Symbol: 1,
  double_slash_redirecting: -1, Prefix_Suffix: -1, having_Sub_Domain: -1, SSLfinal_State: -1,
  Domain_registeration_length: -1, Favicon: 1, port: 1, HTTPS_token: -1, Request_URL: 1,
  URL_of_Anchor: -1, Links_in_tags: 1, SFH: -1, Submitting_to_email: -1, Abnormal_URL: -1,
  Redirect: 0, on_mouseover: 1, RightClick: 1, popUpWidnow: 1, Iframe: 1, age_of_domain: -1,
  DNSRecord: -1, web_traffic: -1, Page_Rank: -1, Google_Index: 1, Links_pointing_to_page: 1,
  Statistical_report: -1
};

const SAFE_PRESET = {
  having_IP_Address: 1, URL_Length: -1, Shortining_Service: 1, having_At_Symbol: 1,
  double_slash_redirecting: 1, Prefix_Suffix: 1, having_Sub_Domain: 0, SSLfinal_State: 1,
  Domain_registeration_length: 1, Favicon: 1, port: 1, HTTPS_token: 1, Request_URL: 1,
  URL_of_Anchor: 0, Links_in_tags: 0, SFH: 1, Submitting_to_email: 1, Abnormal_URL: 1,
  Redirect: 0, on_mouseover: 1, RightClick: 1, popUpWidnow: 1, Iframe: 1, age_of_domain: 1,
  DNSRecord: 1, web_traffic: 1, Page_Rank: 1, Google_Index: 1, Links_pointing_to_page: 1,
  Statistical_report: 1
};

function initPresets() {
  const btnPhishing = document.getElementById('btn-preset-phishing');
  const btnSafe = document.getElementById('btn-preset-safe');
  const btnReset = document.getElementById('btn-preset-reset');
  const form = document.getElementById('single-predict-form');
  
  if (btnPhishing) {
    btnPhishing.addEventListener('click', () => {
      applyPreset(PHISHING_PRESET);
      showToast('Loaded Phishing Attack preset values', 'danger');
    });
  }
  
  if (btnSafe) {
    btnSafe.addEventListener('click', () => {
      applyPreset(SAFE_PRESET);
      showToast('Loaded Legitimate Safe preset values', 'success');
    });
  }
  
  if (btnReset && form) {
    btnReset.addEventListener('click', () => {
      form.reset();
      const verdict = document.getElementById('single-verdict-card');
      if (verdict) verdict.style.display = 'none';
      showToast('Form reset to default values', 'info');
    });
  }
}

function applyPreset(presetData) {
  for (const [key, val] of Object.entries(presetData)) {
    const el = document.querySelector(`[name="${key}"]`);
    if (el) el.value = val;
  }
}

// Single Input Predict Form Submit
function initSinglePredictForm() {
  const form = document.getElementById('single-predict-form');
  const verdictCard = document.getElementById('single-verdict-card');
  const submitBtn = document.getElementById('btn-single-predict');
  
  if (!form || !submitBtn) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const payload = {};
    formData.forEach((value, key) => {
      payload[key] = Number(value);
    });
    
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner"></span> Analyzing Threat Vectors...';
    submitBtn.disabled = true;
    
    try {
      const response = await fetch('/predict-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (!response.ok || data.error) {
        showToast(data.error || 'Prediction failed. Is the model trained?', 'danger');
        return;
      }
      
      displaySingleVerdict(data);
      verdictCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      showToast('Scan complete: ' + data.verdict, data.prediction === 1 ? 'success' : 'danger');
    } catch (err) {
      console.error(err);
      showToast('Error communicating with prediction server', 'danger');
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
}

function displaySingleVerdict(result) {
  const verdictCard = document.getElementById('single-verdict-card');
  const title = document.getElementById('verdict-title');
  const badge = document.getElementById('verdict-badge');
  const desc = document.getElementById('verdict-desc');
  const icon = document.getElementById('verdict-icon');
  
  if (!verdictCard) return;
  
  verdictCard.style.display = 'block';
  verdictCard.classList.remove('verdict-phishing', 'verdict-safe');
  
  const isSafe = (result.prediction === 1);
  
  if (isSafe) {
    verdictCard.classList.add('verdict-safe');
    badge.textContent = 'SECURE VERIFIED';
    title.textContent = '🛡️ Legitimate & Safe URL';
    desc.textContent = 'No malicious indicators or spoofing heuristics detected. This URL matches legitimate network profiles.';
    icon.innerHTML = `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>`;
  } else {
    verdictCard.classList.add('verdict-phishing');
    badge.textContent = 'HIGH THREAT DETECTED';
    title.textContent = '⚠️ Phishing Attack Detected';
    desc.textContent = 'High probability of phishing or credential harvesting attack. Suspicious domain characteristics and SSL discrepancies found.';
    icon.innerHTML = `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
  }
}

// Batch CSV Upload Handler
let batchDataCache = [];
let filteredData = [];

function initBatchUpload() {
  const dropzone = document.getElementById('csv-dropzone');
  const fileInput = document.getElementById('csv-file-input');
  const fileInfo = document.getElementById('selected-file-info');
  const fileNameText = document.getElementById('selected-file-name');
  const btnRemove = document.getElementById('btn-remove-file');
  const batchForm = document.getElementById('batch-upload-form');
  const btnScan = document.getElementById('btn-batch-scan');
  
  if (!dropzone || !fileInput) return;
  
  // Drag and drop events
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });
  
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      handleFileSelected(fileInput.files[0]);
    }
  });
  
  dropzone.addEventListener('click', (e) => {
    if (e.target !== btnRemove) {
      fileInput.click();
    }
  });
  
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
      handleFileSelected(fileInput.files[0]);
    }
  });
  
  if (btnRemove) {
    btnRemove.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.value = '';
      fileInfo.style.display = 'none';
      btnScan.disabled = true;
    });
  }
  
  function handleFileSelected(file) {
    if (!file.name.endsWith('.csv')) {
      showToast('Please select a valid CSV file', 'danger');
      return;
    }
    fileNameText.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    fileInfo.style.display = 'flex';
    btnScan.disabled = false;
  }
  
  // Submit batch predict
  if (batchForm) {
    batchForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!fileInput.files.length) {
        showToast('Please select a CSV file first', 'danger');
        return;
      }
      
      const formData = new FormData();
      formData.append('file', fileInput.files[0]);
      
      const origText = btnScan.innerHTML;
      btnScan.innerHTML = '<span class="spinner"></span> Scanning Batch Dataset...';
      btnScan.disabled = true;
      
      try {
        const res = await fetch('/predict', {
          method: 'POST',
          headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' },
          body: formData
        });
        
        const data = await res.json();
        if (!res.ok || data.error) {
          showToast(data.error || 'Batch scan failed', 'danger');
          return;
        }
        
        displayBatchResults(data);
        showToast(`Scanned ${data.metrics.total} records successfully!`, 'success');
      } catch (err) {
        console.error(err);
        showToast('Network error during batch scan', 'danger');
      } finally {
        btnScan.innerHTML = origText;
        btnScan.disabled = false;
      }
    });
  }
  
  // Search & Filter
  const searchInput = document.getElementById('table-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      applyFilters(term, currentFilterType);
    });
  }
  
  let currentFilterType = 'all';
  const filterBtns = document.querySelectorAll('.btn-filter');
  filterBtns.forEach(b => {
    b.addEventListener('click', () => {
      filterBtns.forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      currentFilterType = b.dataset.filter;
      const term = searchInput ? searchInput.value.toLowerCase().trim() : '';
      applyFilters(term, currentFilterType);
    });
  });
  
  // Export CSV
  const btnExport = document.getElementById('btn-export-csv');
  if (btnExport) {
    btnExport.addEventListener('click', exportResultsToCsv);
  }
}

function displayBatchResults(data) {
  const resultsContainer = document.getElementById('batch-results-container');
  if (!resultsContainer) return;
  
  resultsContainer.style.display = 'block';
  
  // Update Metrics
  const totalEl = document.getElementById('metric-total');
  const phishingEl = document.getElementById('metric-phishing');
  const safeEl = document.getElementById('metric-safe');
  const rateEl = document.getElementById('metric-threat-rate');
  
  if (totalEl) totalEl.textContent = data.metrics.total.toLocaleString();
  if (phishingEl) phishingEl.textContent = data.metrics.phishing.toLocaleString();
  if (safeEl) safeEl.textContent = data.metrics.safe.toLocaleString();
  if (rateEl) rateEl.textContent = `${data.metrics.phishing_percent}%`;
  
  batchDataCache = data.rows || [];
  filteredData = [...batchDataCache];
  
  renderTable(filteredData, data.columns);
  resultsContainer.scrollIntoView({ behavior: 'smooth' });
}

function renderTable(rows, columns) {
  const thead = document.getElementById('table-head');
  const tbody = document.getElementById('table-body');
  if (!thead || !tbody) return;
  
  // Determine displayed columns
  const allCols = columns || (rows.length ? Object.keys(rows[0]) : []);
  
  // Build header
  thead.innerHTML = `
    <tr>
      <th style="width: 70px;">#</th>
      <th style="width: 170px;">SECURITY VERDICT</th>
      ${allCols.filter(c => c !== 'predicted_column' && c !== 'predicted_label').map(col => `<th>${col}</th>`).join('')}
    </tr>
  `;
  
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="${allCols.length + 2}" style="text-align: center; padding: 2.5rem; color: var(--text-dim);">No matching records found.</td></tr>`;
    return;
  }
  
  // Render rows
  const html = rows.slice(0, 100).map((row, idx) => {
    const isSafe = (row.predicted_column === 1);
    const badgeHtml = isSafe 
      ? `<span class="badge-pill badge-safe">🛡️ SAFE</span>` 
      : `<span class="badge-pill badge-threat">⚠️ PHISHING</span>`;
      
    const rowClass = isSafe ? 'row-safe' : 'row-threat';
    
    const cells = allCols
      .filter(c => c !== 'predicted_column' && c !== 'predicted_label')
      .map(c => `<td>${row[c] !== undefined ? row[c] : ''}</td>`)
      .join('');
      
    return `<tr class="${rowClass}"><td>${idx + 1}</td><td>${badgeHtml}</td>${cells}</tr>`;
  }).join('');
  
  tbody.innerHTML = html;
}

function applyFilters(searchTerm, filterType) {
  filteredData = batchDataCache.filter(row => {
    // Type filter
    if (filterType === 'phishing' && row.predicted_column === 1) return false;
    if (filterType === 'safe' && row.predicted_column !== 1) return false;
    
    // Search filter
    if (!searchTerm) return true;
    return Object.values(row).some(val => String(val).toLowerCase().includes(searchTerm));
  });
  
  renderTable(filteredData);
}

function exportResultsToCsv() {
  if (!filteredData.length) {
    showToast('No data to export', 'danger');
    return;
  }
  
  const cols = Object.keys(filteredData[0]);
  const csvRows = [cols.join(',')];
  
  filteredData.forEach(row => {
    const values = cols.map(c => {
      const val = row[c] === null || row[c] === undefined ? '' : String(row[c]);
      return `"${val.replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  });
  
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ShieldNet_Prediction_Results_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Downloaded predictions CSV', 'success');
}
