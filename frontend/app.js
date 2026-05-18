(function init(globalScope) {
  const API_BASE_URL = globalScope.API_BASE_URL || 'http://localhost:3001';
  const bucketLabels = [
    ['fixedCosts', 'Fixed Costs', '55% midpoint'],
    ['savingsGoals', 'Savings Goals', '10%'],
    ['activeInvestments', 'Active Investments', '10%'],
    ['guiltFreeSpending', 'Guilt-Free Spending', '27.5% midpoint'],
  ];

  let state = {
    name: 'Roi',
    grossSalary: 10000,
    bankNet: 6800,
    years: 15,
    result: null,
    message: '',
  };
  let scheduledRender = null;

  function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'ILS',
      maximumFractionDigits: 0,
    }).format(value || 0);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function clampYears(years) {
    const parsed = Number(years);
    return Number.isFinite(parsed) ? Math.min(Math.max(Math.trunc(parsed), 1), 15) : 15;
  }

  function calculateClientSide(grossSalary, bankNet, years = 15) {
    const safeGross = Number(grossSalary) || 0;
    const safeBankNet = Number(bankNet) || safeGross * 0.68;
    const activeInvestments = safeBankNet * 0.10;

    return {
      grossSalary: Number(safeGross.toFixed(2)),
      bankNet: Number(safeBankNet.toFixed(2)),
      fixedCosts: Number((safeBankNet * 0.55).toFixed(2)),
      savingsGoals: Number((safeBankNet * 0.10).toFixed(2)),
      activeInvestments: Number(activeInvestments.toFixed(2)),
      guiltFreeSpending: Number((safeBankNet * 0.275).toFixed(2)),
      wealthProjection: Array.from({ length: clampYears(years) }, (_, index) => ({
        year: index + 1,
        value: Number((activeInvestments * Math.pow(1.07, index + 1)).toFixed(2)),
      })),
    };
  }

  async function postJson(path, payload) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  function chartSvg(projection) {
    const width = 720;
    const height = 300;
    const pad = { top: 18, right: 20, bottom: 34, left: 72 };
    const values = projection.map((point) => point.value);
    const maxValue = Math.max(...values, 1);
    const xStep = projection.length > 1
      ? (width - pad.left - pad.right) / (projection.length - 1)
      : 0;
    const yScale = (height - pad.top - pad.bottom) / maxValue;
    const points = projection.map((point, index) => {
      const x = pad.left + index * xStep;
      const y = height - pad.bottom - point.value * yScale;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const gridLines = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
      const y = height - pad.bottom - maxValue * ratio * yScale;
      const label = formatCurrency(maxValue * ratio);
      return `
        <line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" stroke="#d7dde7" />
        <text class="axis-label" x="8" y="${y + 4}">${label}</text>
      `;
    }).join('');

    const yearLabels = projection
      .filter((_, index) => index === 0 || index === projection.length - 1 || (index + 1) % 5 === 0)
      .map((point, index, filtered) => {
        const originalIndex = projection.findIndex((item) => item.year === point.year);
        const x = pad.left + originalIndex * xStep;
        const anchor = index === filtered.length - 1 ? 'end' : 'middle';
        return `<text class="axis-label" x="${x}" y="${height - 10}" text-anchor="${anchor}">Y${point.year}</text>`;
      }).join('');

    return `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Investment projection chart">
        <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />
        ${gridLines}
        <polyline points="${points}" fill="none" stroke="#2057a5" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
        ${projection.map((point, index) => {
          const x = pad.left + index * xStep;
          const y = height - pad.bottom - point.value * yScale;
          return `<circle cx="${x}" cy="${y}" r="3.5" fill="#2057a5" />`;
        }).join('')}
        ${yearLabels}
      </svg>
    `;
  }

  function render() {
    const root = globalScope.document && document.getElementById('root');
    if (!root) {
      return;
    }

    const result = state.result || calculateClientSide(state.grossSalary, state.bankNet, state.years);
    root.innerHTML = `
      <div class="layout">
        <form class="panel" id="profile-form">
          <h2>Financial profile</h2>
          <label for="name">Name</label>
          <input id="name" name="name" value="${escapeHtml(state.name)}" autocomplete="name" />

          <label for="grossSalary">Gross salary</label>
          <input id="grossSalary" name="grossSalary" type="number" min="1" value="${state.grossSalary}" />

          <label for="bankNet">Bank net</label>
          <input id="bankNet" name="bankNet" type="number" min="1" value="${state.bankNet}" />

          <label for="years">Projection years</label>
          <input id="years" name="years" type="number" min="1" max="15" value="${state.years}" />

          <button type="submit">Calculate</button>
          <div class="actions">
            <button type="button" class="secondary" id="save-profile">Save</button>
          </div>
          <div class="error" role="status">${state.message}</div>
        </form>

        <section>
          <div class="buckets" data-testid="bucket-grid">
            ${bucketLabels.map(([key, label, note]) => `
              <article class="bucket">
                <strong>${label}</strong>
                <span data-testid="${key}">${formatCurrency(result[key])}</span>
                <p>${note}</p>
              </article>
            `).join('')}
          </div>
          <div class="chart-panel">
            <h2>${clampYears(state.years)}-year investment projection</h2>
            <div class="chart-frame">${chartSvg(result.wealthProjection)}</div>
          </div>
        </section>
      </div>
    `;

    bindEvents();
  }

  function updateDisplay() {
    const result = state.result || calculateClientSide(state.grossSalary, state.bankNet, state.years);

    bucketLabels.forEach(([key]) => {
      const node = document.querySelector(`[data-testid="${key}"]`);
      if (node) {
        node.textContent = formatCurrency(result[key]);
      }
    });

    const title = document.querySelector('.chart-panel h2');
    if (title) {
      title.textContent = `${clampYears(state.years)}-year investment projection`;
    }

    const chartFrame = document.querySelector('.chart-frame');
    if (chartFrame) {
      chartFrame.innerHTML = chartSvg(result.wealthProjection);
    }

    const message = document.querySelector('.error');
    if (message) {
      message.textContent = state.message;
    }

  }

  function scheduleRender() {
    if (scheduledRender) {
      cancelAnimationFrame(scheduledRender);
    }
    scheduledRender = requestAnimationFrame(() => {
      scheduledRender = null;
      state.result = calculateClientSide(state.grossSalary, state.bankNet, state.years);
      updateDisplay();
    });
  }

  function updateField(event) {
    const { name, value } = event.target;
    state = {
      ...state,
      [name]: name === 'name' ? value : Number(value),
      message: '',
    };
    scheduleRender();
  }

  function bindEvents() {
    document.querySelectorAll('#profile-form input').forEach((input) => {
      input.addEventListener('input', updateField);
    });

    document.getElementById('profile-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        state.message = '';
        state.result = await postJson('/calculate', state);
      } catch (err) {
        state.result = calculateClientSide(state.grossSalary, state.bankNet, state.years);
        state.message = `${err.message}. Showing local calculation.`;
      }
      render();
    });

    document.getElementById('save-profile').addEventListener('click', async () => {
      try {
        const data = await postJson('/calculate/profiles', state);
        state = { ...state, result: data.calculation, message: 'Profile saved.' };
      } catch (err) {
        state = { ...state, message: err.message };
      }
      render();
    });

  }

  function boot() {
    state.result = calculateClientSide(state.grossSalary, state.bankNet, state.years);
    render();

    fetch(`${API_BASE_URL}/health`)
      .then((response) => {
        document.getElementById('api-status').textContent = response.ok
          ? 'Backend: connected'
          : 'Backend: unavailable';
      })
      .catch(() => {
        document.getElementById('api-status').textContent = 'Backend: unavailable';
      });
  }

  if (globalScope.document) {
    boot();
  }

  if (typeof module !== 'undefined') {
    module.exports = {
      calculateClientSide,
      formatCurrency,
    };
  }
}(typeof window !== 'undefined' ? window : global));
