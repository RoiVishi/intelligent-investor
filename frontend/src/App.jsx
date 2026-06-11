import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_ALLOCATION, calculateClientSide, clampYears, formatCurrency, projectRecurringInvestment } from './calculations';
import CurrencySelector, { convertCurrency } from './components/CurrencySelector.jsx';
import GoalFormModal from './components/GoalFormModal.jsx';
import GoalDetails from './components/GoalDetails.jsx';
import ProfileManager from './components/ProfileManager.jsx';
import Home from './Home.jsx';

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3001';

const bucketLabels = [
  ['fixedCosts', 'Fixed Costs', 'costs'],
  ['savingsGoals', 'Savings Goals', 'savings'],
  ['activeInvestments', 'Active Investments', 'investments'],
  ['guiltFreeSpending', 'Guilt-Free Spending', 'spending'],
];

const scenarios = [
  ['Conservative', 0.08, 0.05],
  ['Balanced', 0.10, 0.07],
  ['Aggressive', 0.15, 0.09],
];

const categories = ['All', 'Transport', 'Housing', 'Education', 'Lifestyle'];
const statuses = ['All', 'On track', 'At risk'];
const goalTemplate = {
  name: 'Car',
  category: 'Transport',
  targetAmount: 100000,
  currentAmount: 0,
  monthlyContribution: 2500,
  currency: 'ILS',
  accent: 'teal',
};

const defaultGoals = [
  {
    id: 'car',
    name: 'Car',
    category: 'Transport',
    targetAmount: 120000,
    currentAmount: 42000,
    monthlyContribution: 3500,
    currency: 'ILS',
    accent: 'teal',
  },
  {
    id: 'home',
    name: 'Apartment deposit',
    category: 'Housing',
    targetAmount: 450000,
    currentAmount: 180000,
    monthlyContribution: 5000,
    currency: 'ILS',
    accent: 'blue',
  },
  {
    id: 'degree',
    name: 'MBA fund',
    category: 'Education',
    targetAmount: 38000,
    currentAmount: 12000,
    monthlyContribution: 650,
    currency: 'USD',
    accent: 'gold',
  },
];

function createProfile(id, name, overrides = {}) {
  return {
    id,
    name,
    form: {
      name,
      grossSalary: 10000,
      bankNet: 6800,
      years: 15,
      ...overrides.form,
    },
    goalTarget: overrides.goalTarget || 100000,
    allocation: overrides.allocation || DEFAULT_ALLOCATION,
    goals: overrides.goals || defaultGoals,
  };
}

function monthsToGoal(monthlyAmount, target) {
  const safeMonthly = Number(monthlyAmount) || 0;
  const safeTarget = Number(target) || 0;

  if (safeMonthly <= 0 || safeTarget <= 0) {
    return null;
  }

  return Math.ceil(safeTarget / safeMonthly);
}

function parsePositiveField(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getGoalStatus(goal) {
  const monthsLeft = getMonthsLeft(goal);
  return monthsLeft > 36 ? 'At risk' : 'On track';
}

function getMonthsLeft(goal) {
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
  return goal.monthlyContribution > 0 ? Math.ceil(remaining / goal.monthlyContribution) : Infinity;
}

function validateForm(form, goalTarget, allocation) {
  const errors = [];
  const grossSalary = parsePositiveField(form.grossSalary);
  const bankNet = parsePositiveField(form.bankNet);
  const years = Number(form.years);
  const goal = parsePositiveField(goalTarget);
  const allocationTotal = Object.values(allocation).reduce((sum, value) => sum + parsePositiveField(value), 0);

  if (!form.name.trim()) {
    errors.push('Name is required.');
  }

  if (grossSalary <= 0) {
    errors.push('Gross salary must be greater than 0.');
  }

  if (grossSalary > 1000000) {
    errors.push('Gross salary looks too high for a monthly salary.');
  }

  if (bankNet <= 0) {
    errors.push('Bank net must be greater than 0.');
  }

  if (grossSalary > 0 && bankNet > grossSalary) {
    errors.push('Bank net cannot be higher than gross salary.');
  }

  if (!Number.isInteger(years) || years < 1 || years > 15) {
    errors.push('Projection years must be a whole number between 1 and 15.');
  }

  if (goal <= 0) {
    errors.push('Savings goal must be greater than 0.');
  }

  if (goal > 100000000) {
    errors.push('Savings goal is too high for this planner.');
  }

  Object.entries(allocation).forEach(([key, value]) => {
    const percent = parsePositiveField(value);
    if (percent < 0 || percent > 100) {
      errors.push(`${key} percentage must be between 0 and 100.`);
    }
  });

  if (allocationTotal > 100) {
    errors.push('Allocation percentages cannot add up to more than 100%.');
  }

  if (parsePositiveField(allocation.activeInvestments) <= 0) {
    errors.push('Active investments percentage must be greater than 0.');
  }

  return errors;
}

function ProjectionChart({ projection, currency }) {
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
  const visibleYearLabels = projection.filter(
    (_, index) => index === 0 || index === projection.length - 1 || (index + 1) % 5 === 0,
  );

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Investment projection chart">
      <defs>
        <linearGradient id="projectionFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={width} height={height} fill="transparent" />
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = height - pad.bottom - maxValue * ratio * yScale;
        return (
          <g key={ratio}>
            <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#26364f" strokeDasharray="4 6" />
            <text className="axis-label" x="8" y={y + 4}>{formatCurrency(maxValue * ratio, currency)}</text>
          </g>
        );
      })}
      <polygon
        points={`${pad.left},${height - pad.bottom} ${points} ${width - pad.right},${height - pad.bottom}`}
        fill="url(#projectionFill)"
      />
      <polyline points={points} fill="none" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {projection.map((point, index) => {
        const x = pad.left + index * xStep;
        const y = height - pad.bottom - point.value * yScale;
        return <circle key={point.year} cx={x} cy={y} r="3.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="3" />;
      })}
      {visibleYearLabels.map((point, index) => {
        const originalIndex = projection.findIndex((item) => item.year === point.year);
        const x = pad.left + originalIndex * xStep;
        const anchor = index === visibleYearLabels.length - 1 ? 'end' : 'middle';
        return (
          <text key={point.year} className="axis-label" x={x} y={height - 10} textAnchor={anchor}>
            Y{point.year}
          </text>
        );
      })}
    </svg>
  );
}

export default function App() {
  const [profiles, setProfiles] = useState(() => [
    createProfile('local-roi', 'Roi'),
    createProfile('local-family', 'Family', {
      form: { name: 'Family', grossSalary: 18000, bankNet: 12600, years: 12 },
      goals: defaultGoals.map((goal) => ({ ...goal, currentAmount: Math.round(goal.currentAmount * 1.25) })),
    }),
  ]);
  const [activeProfileId, setActiveProfileId] = useState('local-roi');
  const [globalCurrency, setGlobalCurrency] = useState('ILS');
  const [result, setResult] = useState(() => calculateClientSide(10000, 6800, 15, DEFAULT_ALLOCATION));
  const [message, setMessage] = useState('');
  const [apiStatus, setApiStatus] = useState('Backend: checking...');
  const [selectedGoalId, setSelectedGoalId] = useState('car');
  const [sortBy, setSortBy] = useState('progress');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isProfileManagerOpen, setIsProfileManagerOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState(null);
  const [goalModalMode, setGoalModalMode] = useState('create');
  const [goalDraft, setGoalDraft] = useState(null);
  const [activeView, setActiveView] = useState('home');
  const [theme, setTheme] = useState(() => {
    try {
      return window.localStorage.getItem('ii-theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) || profiles[0];
  const { form, allocation, goalTarget, goals } = activeProfile;
  const selectedGoal = goals.find((goal) => goal.id === selectedGoalId) || goals[0];
  const formatMoney = (value) => formatCurrency(value, globalCurrency);

  const liveResult = useMemo(
    () => calculateClientSide(form.grossSalary, form.bankNet, form.years, allocation),
    [form.grossSalary, form.bankNet, form.years, allocation],
  );
  const displayResult = result || liveResult;
  const convertedResult = useMemo(() => ({
    ...displayResult,
    bankNet: convertCurrency(displayResult.bankNet, 'ILS', globalCurrency),
    fixedCosts: convertCurrency(displayResult.fixedCosts, 'ILS', globalCurrency),
    savingsGoals: convertCurrency(displayResult.savingsGoals, 'ILS', globalCurrency),
    activeInvestments: convertCurrency(displayResult.activeInvestments, 'ILS', globalCurrency),
    guiltFreeSpending: convertCurrency(displayResult.guiltFreeSpending, 'ILS', globalCurrency),
    wealthProjection: displayResult.wealthProjection.map((point) => ({
      ...point,
      value: convertCurrency(point.value, 'ILS', globalCurrency),
    })),
  }), [displayResult, globalCurrency]);

  const endingProjectionValue = convertedResult.wealthProjection.at(-1)?.value || 0;
  const yearlyInvestment = convertedResult.activeInvestments * 12;
  const statusClass = apiStatus.includes('connected') ? 'status connected' : 'status';
  const goalMonths = monthsToGoal(displayResult.savingsGoals, goalTarget);
  const allocationTotal = Object.values(allocation).reduce((sum, value) => sum + parsePositiveField(value), 0);
  const validationErrors = validateForm(form, goalTarget, allocation);
  const hasValidationErrors = validationErrors.length > 0;
  const grossSalary = parsePositiveField(form.grossSalary);
  const bankNet = parsePositiveField(form.bankNet);
  const netRatio = grossSalary > 0 ? bankNet / grossSalary : 0;
  const portfolioTotals = goals.reduce((totals, goal) => {
    totals.target += convertCurrency(goal.targetAmount, goal.currency, globalCurrency);
    totals.saved += convertCurrency(goal.currentAmount, goal.currency, globalCurrency);
    totals.monthly += convertCurrency(goal.monthlyContribution, goal.currency, globalCurrency);
    return totals;
  }, { target: 0, saved: 0, monthly: 0 });
  const portfolioProgress = portfolioTotals.target > 0 ? Math.round((portfolioTotals.saved / portfolioTotals.target) * 100) : 0;
  const scenarioResults = scenarios.map(([label, investmentRate, annualReturn]) => {
    const monthlyInvestment = convertCurrency(bankNet * investmentRate, 'ILS', globalCurrency);
    const projection = projectRecurringInvestment(monthlyInvestment, annualReturn, form.years);

    return {
      label,
      annualReturn,
      investmentRate,
      monthlyInvestment,
      endingValue: projection.at(-1)?.value || 0,
    };
  });
  const filteredGoals = goals
    .filter((goal) => statusFilter === 'All' || getGoalStatus(goal) === statusFilter)
    .filter((goal) => categoryFilter === 'All' || goal.category === categoryFilter)
    .sort((left, right) => {
      if (sortBy === 'amount') {
        return convertCurrency(right.targetAmount, right.currency, globalCurrency) - convertCurrency(left.targetAmount, left.currency, globalCurrency);
      }
      if (sortBy === 'monthly') {
        return convertCurrency(right.monthlyContribution, right.currency, globalCurrency) - convertCurrency(left.monthlyContribution, left.currency, globalCurrency);
      }
      return (right.currentAmount / right.targetAmount) - (left.currentAmount / left.targetAmount);
    });
  const insights = [
    netRatio > 1
      ? ['warning', 'Bank net is higher than gross salary. Fix this before saving.']
      : netRatio > 0.85
        ? ['warning', 'Bank net is unusually close to gross salary. Double-check the numbers.']
        : netRatio < 0.45
          ? ['warning', 'Bank net is low compared with gross salary. Taxes or deductions may be very high.']
          : ['good', 'Bank net looks reasonable compared with gross salary.'],
    goalMonths
      ? goalMonths > 120
        ? ['warning', `This goal may take about ${goalMonths} months at the current savings rate.`]
        : ['good', `At the current savings rate, the goal can be reached in about ${goalMonths} months.`]
      : ['warning', 'Add a savings goal to estimate the timeline.'],
    portfolioProgress >= 50
      ? ['good', `Goal portfolio is ${portfolioProgress}% funded.`]
      : ['warning', `Goal portfolio is ${portfolioProgress}% funded. Monthly funding is ${formatMoney(portfolioTotals.monthly)}.`],
  ];

  useEffect(() => {
    setResult(liveResult);
  }, [liveResult]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/health`)
      .then((response) => setApiStatus(response.ok ? 'Backend: connected' : 'Backend: unavailable'))
      .catch(() => setApiStatus('Backend: unavailable'));

    fetch(`${API_BASE_URL}/calculate/profiles`)
      .then((response) => (response.ok ? response.json() : []))
      .then((remoteProfiles) => {
        if (!Array.isArray(remoteProfiles) || remoteProfiles.length === 0) {
          return;
        }

        setProfiles((current) => {
          const remote = remoteProfiles.map((profile) => createProfile(`remote-${profile.id}`, profile.name, {
            form: {
              name: profile.name,
              grossSalary: profile.grossSalary,
              bankNet: profile.bankNet,
              years: 15,
            },
          }));
          return [...remote, ...current.filter((profile) => !remote.some((item) => item.name === profile.name))];
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (profiles.length > 0 && !profiles.some((profile) => profile.id === activeProfileId)) {
      setActiveProfileId(profiles[0].id);
    }
  }, [profiles, activeProfileId]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem('ii-theme', theme);
    } catch {
      // Persisting the theme is best-effort.
    }
  }, [theme]);

  function updateActiveProfile(updater) {
    setMessage('');
    setProfiles((current) => {
      const resolvedId = current.some((profile) => profile.id === activeProfileId)
        ? activeProfileId
        : (current[0] && current[0].id);
      return current.map((profile) => (
        profile.id === resolvedId ? updater(profile) : profile
      ));
    });
  }

  function updateField(event) {
    const { name, value } = event.target;
    updateActiveProfile((profile) => ({
      ...profile,
      form: {
        ...profile.form,
        [name]: name === 'name' ? value : value === '' ? '' : Number(value),
      },
      name: name === 'name' ? value : profile.name,
    }));
  }

  function updateAllocation(event) {
    const { name, value } = event.target;
    updateActiveProfile((profile) => ({
      ...profile,
      allocation: {
        ...profile.allocation,
        [name]: value === '' ? '' : Number(value),
      },
    }));
  }

  function updateGoal(goalId, patch) {
    updateActiveProfile((profile) => ({
      ...profile,
      goals: profile.goals.map((goal) => (goal.id === goalId ? { ...goal, ...patch } : goal)),
    }));
  }

  function openCreateGoal() {
    setGoalModalMode('create');
    setGoalDraft({
      ...goalTemplate,
      id: `goal-${Date.now()}`,
    });
  }

  function openEditGoal(goal) {
    setGoalModalMode('edit');
    setGoalDraft({ ...goal });
  }

  function closeGoalModal() {
    setGoalDraft(null);
  }

  function saveGoalDraft() {
    if (!goalDraft?.name?.trim() || goalDraft.targetAmount <= 0) {
      setMessage('Goal name and target amount are required.');
      return;
    }

    const normalizedGoal = {
      ...goalDraft,
      name: goalDraft.name.trim(),
      targetAmount: Math.max(Number(goalDraft.targetAmount) || 0, 1),
      currentAmount: Math.max(Number(goalDraft.currentAmount) || 0, 0),
      monthlyContribution: Math.max(Number(goalDraft.monthlyContribution) || 0, 0),
    };

    updateActiveProfile((profile) => ({
      ...profile,
      goals: goalModalMode === 'edit'
        ? profile.goals.map((goal) => (goal.id === normalizedGoal.id ? normalizedGoal : goal))
        : [...profile.goals, normalizedGoal],
    }));
    setSelectedGoalId(normalizedGoal.id);
    closeGoalModal();
  }

  function deleteGoal(goalId) {
    const remainingGoals = goals.filter((goal) => goal.id !== goalId);
    if (selectedGoalId === goalId) {
      setSelectedGoalId(remainingGoals[0]?.id || '');
    }

    updateActiveProfile((profile) => {
      return {
        ...profile,
        goals: profile.goals.filter((goal) => goal.id !== goalId),
      };
    });
  }

  function requestPayload() {
    return {
      ...form,
      allocation,
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

  async function loadExistingProfileByName(name) {
    try {
      const response = await fetch(`${API_BASE_URL}/calculate/profiles`);
      if (!response.ok) {
        return false;
      }

      const remoteProfiles = await response.json();
      const match = Array.isArray(remoteProfiles)
        ? remoteProfiles.find(
          (profile) => profile.name.trim().toLowerCase() === name.trim().toLowerCase(),
        )
        : null;

      if (!match) {
        return false;
      }

      updateActiveProfile((profile) => ({
        ...profile,
        name: match.name,
        form: {
          ...profile.form,
          name: match.name,
          grossSalary: match.grossSalary,
          bankNet: match.bankNet,
        },
      }));
      return true;
    } catch {
      return false;
    }
  }

  async function recoverFromDuplicateName(err) {
    if (!/already exists/i.test(err.message)) {
      return false;
    }

    const loaded = await loadExistingProfileByName(form.name);
    if (loaded) {
      setMessage(`Profile "${form.name.trim()}" already exists - loaded the saved version from the server.`);
    }
    return loaded;
  }

  async function calculate(event) {
    event.preventDefault();

    if (hasValidationErrors) {
      setMessage(validationErrors[0]);
      return;
    }

    try {
      const data = await postJson('/calculate', requestPayload());
      setResult(data);
      setMessage('');
    } catch (err) {
      setResult(liveResult);
      setMessage(`${err.message}. Showing local calculation.`);
    }
  }

  async function saveProfile() {
    if (hasValidationErrors) {
      setMessage(validationErrors[0]);
      return;
    }

    try {
      const data = await postJson('/calculate/profiles', requestPayload());
      setResult(data.calculation);
      setMessage('Profile saved.');
    } catch (err) {
      if (!(await recoverFromDuplicateName(err))) {
        setMessage(err.message);
      }
    }
  }

  async function saveProfileAndContinue(event) {
    event.preventDefault();

    if (hasValidationErrors) {
      setMessage(validationErrors[0]);
      return;
    }

    try {
      const data = await postJson('/calculate/profiles', requestPayload());
      setResult(data.calculation || liveResult);
      setMessage('Profile saved.');
    } catch (err) {
      setResult(liveResult);
      if (!(await recoverFromDuplicateName(err))) {
        setMessage(`${err.message}. Continuing with local profile.`);
      }
    }

    setActiveView('budget');
  }

  function validateProfileDraft(draft) {
    if (!draft) {
      return '';
    }

    const grossSalary = parsePositiveField(draft.grossSalary);
    const bankNet = parsePositiveField(draft.bankNet);

    if (!draft.name.trim()) {
      return 'Profile name is required.';
    }
    if (grossSalary <= 0) {
      return 'Gross salary must be greater than 0.';
    }
    if (grossSalary > 1000000) {
      return 'Gross salary looks too high for a monthly salary.';
    }
    if (bankNet <= 0) {
      return 'Bank net must be greater than 0.';
    }
    if (bankNet > grossSalary) {
      return 'Bank net cannot be higher than gross salary.';
    }
    return '';
  }

  function openProfileManager() {
    setProfileDraft({
      name: activeProfile.name,
      grossSalary: form.grossSalary,
      bankNet: form.bankNet,
    });
    setIsProfileManagerOpen(true);
  }

  function selectManagedProfile(profileId) {
    const profile = profiles.find((item) => item.id === profileId);
    if (!profile) {
      return;
    }

    setActiveProfileId(profileId);
    setProfileDraft({
      name: profile.name,
      grossSalary: profile.form.grossSalary,
      bankNet: profile.form.bankNet,
    });
  }

  function createManagedProfile() {
    const name = profileDraft.name.trim();
    const id = `local-${Date.now()}`;
    setProfiles((current) => [...current, createProfile(id, name, {
      form: {
        ...form,
        name,
        grossSalary: Number(profileDraft.grossSalary),
        bankNet: Number(profileDraft.bankNet),
      },
      allocation,
      goals: goals.map((goal) => ({ ...goal })),
    })]);
    setActiveProfileId(id);
    setProfileDraft(null);
    setIsProfileManagerOpen(false);
  }

  function saveManagedProfile() {
    const name = profileDraft.name.trim();
    updateActiveProfile((profile) => ({
      ...profile,
      name,
      form: {
        ...profile.form,
        name,
        grossSalary: Number(profileDraft.grossSalary),
        bankNet: Number(profileDraft.bankNet),
      },
    }));
    setProfileDraft(null);
    setIsProfileManagerOpen(false);
  }

  function deleteManagedProfile() {
    if (profiles.length < 2) {
      return;
    }

    const nextProfiles = profiles.filter((profile) => profile.id !== activeProfileId);
    setProfiles(nextProfiles);
    setActiveProfileId(nextProfiles[0].id);
    setIsProfileManagerOpen(false);
  }

  function exportPdf() {
    window.print();
  }

  return (
    <main>
      <button
        type="button"
        className="theme-toggle"
        onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <span className="theme-toggle-icon" aria-hidden="true" />
        {theme === 'dark' ? 'Light mode' : 'Dark mode'}
      </button>
      {activeView === 'home' ? (
        <Home
          form={form}
          message={message}
          validationErrors={validationErrors}
          hasValidationErrors={hasValidationErrors}
          onFieldChange={updateField}
          onSaveProfile={saveProfileAndContinue}
        />
      ) : (
        <>
          <header className="app-header">
            <div className="brand-lockup">
              <span className="logo-mark" aria-hidden="true">
                <span />
              </span>
              <div className="headline">
                <h1>intelligent investor</h1>
                <p>Financial goals, portfolio progress, and multi-currency planning.</p>
              </div>
            </div>
            <p id="api-status" className={statusClass}>{apiStatus}</p>
          </header>

          <div className="top-toolbar">
            <label className="toolbar-field" htmlFor="profile">
              <span>Profile</span>
              <select id="profile" value={activeProfileId} onChange={(event) => setActiveProfileId(event.target.value)}>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>{profile.name}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="icon-button manage-button"
              onClick={openProfileManager}
              aria-label="Manage profiles"
              title="Manage profiles"
            >
              *
            </button>
            <CurrencySelector value={globalCurrency} onChange={setGlobalCurrency} />
          </div>

          <nav className="view-switcher" aria-label="Primary views">
            <button
              type="button"
              className={activeView === 'budget' ? 'view-card active' : 'view-card'}
              onClick={() => setActiveView('budget')}
            >
              <strong>Budget Allocation</strong>
              <span>Review income buckets and investment projections.</span>
            </button>
            <button
              type="button"
              className={activeView === 'goals' ? 'view-card active' : 'view-card'}
              onClick={() => setActiveView('goals')}
            >
              <strong>Financial Goals</strong>
              <span>Track, sort, and update your goal portfolio.</span>
            </button>
          </nav>

          {activeView === 'budget' && (
            <div className="layout">
              <form className="panel" onSubmit={calculate}>
                <div className="section-title">
                  <span>02</span>
                  <h2>Budget allocation</h2>
                </div>

                <label htmlFor="years">Projection years</label>
                <input id="years" name="years" type="number" min="1" max="15" step="1" value={form.years} onChange={updateField} />

                <label htmlFor="goalTarget">Savings goal</label>
                <input
                  id="goalTarget"
                  name="goalTarget"
                  type="number"
                  min="1"
                  max="100000000"
                  step="1"
                  value={goalTarget}
                  onChange={(event) => updateActiveProfile((profile) => ({
                    ...profile,
                    goalTarget: event.target.value === '' ? '' : Number(event.target.value),
                  }))}
                />

                <div className="allocation-controls">
                  <div className="allocation-header">
                    <h3>Bucket percentages</h3>
                    <strong>{allocationTotal}%</strong>
                  </div>
                  {bucketLabels.map(([key, label]) => (
                    <div className="slider-row" key={key}>
                      <label htmlFor={`${key}Percent`}>
                        <span>{label}</span>
                        <strong>{allocation[key]}%</strong>
                      </label>
                      <input
                        id={`${key}Percent`}
                        aria-label={`${label} percentage`}
                        name={key}
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={allocation[key]}
                        onChange={updateAllocation}
                        style={{ '--value': `${allocation[key]}%` }}
                      />
                    </div>
                  ))}
                </div>

                <button type="submit" disabled={hasValidationErrors}>Calculate</button>
                <div className="actions">
                  <button type="button" className="secondary" onClick={saveProfile} disabled={hasValidationErrors}>Save</button>
                  <button type="button" className="secondary" onClick={exportPdf}>Export PDF</button>
                </div>
                <div className={message === 'Profile saved.' ? 'notice success' : 'notice'} role="status">{message}</div>
                {hasValidationErrors && (
                  <div className="validation-list" aria-label="Validation errors">
                    {validationErrors.map((error) => (
                      <p key={error}>{error}</p>
                    ))}
                  </div>
                )}
              </form>

              <section>
                <div className="summary-strip" aria-label="Financial summary">
                  <div>
                    <span>Monthly bank net</span>
                    <strong>{formatMoney(convertedResult.bankNet)}</strong>
                  </div>
                  <div>
                    <span>Monthly investing</span>
                    <strong>{formatMoney(convertedResult.activeInvestments)}</strong>
                  </div>
                  <div>
                    <span>Annual investing</span>
                    <strong>{formatMoney(yearlyInvestment)}</strong>
                  </div>
                  <div>
                    <span>Projected value</span>
                    <strong>{formatMoney(endingProjectionValue)}</strong>
                  </div>
                </div>

                <div className="buckets" data-testid="bucket-grid">
                  {bucketLabels.map(([key, label, tone]) => (
                    <article className={`bucket ${tone}`} key={key}>
                      <div className="bucket-top">
                        <strong>{label}</strong>
                        <small>{parsePositiveField(allocation[key])}%</small>
                      </div>
                      <span data-testid={key}>{formatMoney(convertedResult[key])}</span>
                    </article>
                  ))}
                </div>

                <div className="feature-grid">
                  <section className="feature-card goal-card">
                    <div className="section-title compact">
                      <span>03</span>
                      <h2>Savings goal</h2>
                    </div>
                    <strong>{formatMoney(convertCurrency(goalTarget, 'ILS', globalCurrency))}</strong>
                    <p>
                      {goalMonths
                        ? `${goalMonths} months at ${formatMoney(convertedResult.savingsGoals)} per month.`
                        : 'Set a goal to calculate the timeline.'}
                    </p>
                  </section>

                  <section className="feature-card insights-card">
                    <div className="section-title compact">
                      <span>04</span>
                      <h2>Smart insights</h2>
                    </div>
                    <div className="insight-list">
                      {insights.map(([tone, text]) => (
                        <p className={`insight ${tone}`} key={text}>{text}</p>
                      ))}
                    </div>
                  </section>
                </div>

                <section className="scenario-panel">
                  <div className="section-title compact">
                    <span>05</span>
                    <h2>Scenario comparison</h2>
                  </div>
                  <div className="scenario-grid">
                    {scenarioResults.map((scenario) => (
                      <article className="scenario" key={scenario.label}>
                        <strong>{scenario.label}</strong>
                        <span>{formatMoney(scenario.endingValue)}</span>
                        <p>
                          {(scenario.investmentRate * 100).toFixed(0)}% invested,
                          {' '}
                          {(scenario.annualReturn * 100).toFixed(0)}% return
                        </p>
                      </article>
                    ))}
                  </div>
                </section>

                <div className="chart-panel">
                  <div className="section-title">
                    <span>06</span>
                    <h2>{clampYears(form.years)}-year investment projection</h2>
                  </div>
                  <div className="chart-frame">
                    <ProjectionChart projection={convertedResult.wealthProjection} currency={globalCurrency} />
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeView === 'goals' && (
            <section>
              <div className="summary-strip portfolio-summary" aria-label="Portfolio summary">
                <div>
                  <span>Total target</span>
                  <strong>{formatMoney(portfolioTotals.target)}</strong>
                </div>
                <div>
                  <span>Currently saved</span>
                  <strong>{formatMoney(portfolioTotals.saved)}</strong>
                </div>
                <div>
                  <span>Required monthly</span>
                  <strong>{formatMoney(portfolioTotals.monthly)}</strong>
                </div>
                <div>
                  <span>Goal progress</span>
                  <strong>{portfolioProgress}%</strong>
                </div>
              </div>

              <div className="filter-bar" aria-label="Goal filters">
                <label className="toolbar-field" htmlFor="sortBy">
                  <span>Sort by</span>
                  <select id="sortBy" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                    <option value="progress">Progress</option>
                    <option value="amount">Target amount</option>
                    <option value="monthly">Required monthly</option>
                  </select>
                </label>
                <label className="toolbar-field" htmlFor="statusFilter">
                  <span>Status</span>
                  <select id="statusFilter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
                <label className="toolbar-field" htmlFor="categoryFilter">
                  <span>Category</span>
                  <select id="categoryFilter" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </label>
                <button type="button" className="create-goal-button" onClick={openCreateGoal}>Create goal</button>
              </div>

              <div className="goal-grid">
                {filteredGoals.map((goal) => {
                  const status = getGoalStatus(goal);
                  const monthsLeft = getMonthsLeft(goal);
                  const progress = Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
                  const target = convertCurrency(goal.targetAmount, goal.currency, globalCurrency);
                  const saved = convertCurrency(goal.currentAmount, goal.currency, globalCurrency);
                  const monthly = convertCurrency(goal.monthlyContribution, goal.currency, globalCurrency);

                  return (
                    <article
                      className={`goal-tile ${goal.accent} ${goal.id === selectedGoal?.id ? 'selected' : ''}`}
                      key={goal.id}
                    >
                      <div className="goal-tile-header">
                        <span className={`badge ${status === 'At risk' ? 'risk' : 'track'}`}>{status}</span>
                        <div className="goal-actions" aria-label={`${goal.name} actions`}>
                          <button type="button" className="icon-button mini" onClick={() => openEditGoal(goal)} aria-label={`Edit ${goal.name}`}>E</button>
                          <button type="button" className="icon-button mini danger-icon" onClick={() => deleteGoal(goal.id)} aria-label={`Delete ${goal.name}`}>D</button>
                        </div>
                      </div>
                      <button type="button" className="goal-card-body" onClick={() => setSelectedGoalId(goal.id)}>
                        <strong>{goal.name}</strong>
                        <small>{goal.category}</small>
                      </button>
                      <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
                      <dl>
                        <div><dt>Target amount</dt><dd>{formatMoney(target)}</dd></div>
                        <div><dt>Currently saved</dt><dd>{formatMoney(saved)}</dd></div>
                        <div><dt>Required monthly</dt><dd>{formatMoney(monthly)}</dd></div>
                        <div><dt>Months remaining</dt><dd>{monthsLeft === Infinity ? 'n/a' : monthsLeft}</dd></div>
                      </dl>
                    </article>
                  );
                })}
              </div>

              <GoalDetails
                goal={selectedGoal}
                globalCurrency={globalCurrency}
                formatMoney={formatMoney}
                onContributionChange={(goalId, monthlyContribution) => updateGoal(goalId, { monthlyContribution })}
                onCurrencyChange={(goalId, currency) => updateGoal(goalId, { currency })}
              />
            </section>
          )}

          <ProfileManager
            isOpen={isProfileManagerOpen}
            profiles={profiles}
            activeProfileId={activeProfileId}
            draft={profileDraft}
            onDraftChange={setProfileDraft}
            error={validateProfileDraft(profileDraft)}
            onClose={() => setIsProfileManagerOpen(false)}
            onCreate={createManagedProfile}
            onSave={saveManagedProfile}
            onDelete={deleteManagedProfile}
            onSelect={selectManagedProfile}
          />
          <GoalFormModal
            isOpen={Boolean(goalDraft)}
            mode={goalModalMode}
            draft={goalDraft}
            onChange={setGoalDraft}
            onClose={closeGoalModal}
            onSubmit={saveGoalDraft}
          />
        </>
      )}
    </main>
  );
}
