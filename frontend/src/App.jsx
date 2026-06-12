import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_ALLOCATION, calculateClientSide, clampYears, formatCurrency, projectRecurringInvestment, simulateWealthProjection } from './calculations';
import { getTranslations } from './i18n';
import AnimatedNumber from './components/AnimatedNumber.jsx';
import CurrencySelector, { convertCurrency } from './components/CurrencySelector.jsx';
import GoalFormModal from './components/GoalFormModal.jsx';
import GoalDetails from './components/GoalDetails.jsx';
import ProfileManager from './components/ProfileManager.jsx';
import Home from './Home.jsx';

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3001';

const bucketLabels = [
  ['fixedCosts', 'costs'],
  ['savingsGoals', 'savings'],
  ['activeInvestments', 'investments'],
  ['guiltFreeSpending', 'spending'],
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

function validateForm(form, goalTarget, allocation, t) {
  const errors = [];
  const grossSalary = parsePositiveField(form.grossSalary);
  const bankNet = parsePositiveField(form.bankNet);
  const years = Number(form.years);
  const goal = parsePositiveField(goalTarget);
  const allocationTotal = Object.values(allocation).reduce((sum, value) => sum + parsePositiveField(value), 0);

  if (!form.name.trim()) {
    errors.push(t.errNameRequired);
  }

  if (grossSalary <= 0) {
    errors.push(t.errGrossPositive);
  }

  if (grossSalary > 1000000) {
    errors.push(t.errGrossTooHigh);
  }

  if (bankNet <= 0) {
    errors.push(t.errNetPositive);
  }

  if (grossSalary > 0 && bankNet > grossSalary) {
    errors.push(t.errNetAboveGross);
  }

  if (!Number.isInteger(years) || years < 1 || years > 15) {
    errors.push(t.errYearsRange);
  }

  if (goal <= 0) {
    errors.push(t.errGoalPositive);
  }

  if (goal > 100000000) {
    errors.push(t.errGoalTooHigh);
  }

  Object.entries(allocation).forEach(([key, value]) => {
    const percent = parsePositiveField(value);
    if (percent < 0 || percent > 100) {
      errors.push(t.errBucketRange(t.buckets[key] || key));
    }
  });

  if (allocationTotal > 100) {
    errors.push(t.errAllocationTotal);
  }

  if (parsePositiveField(allocation.activeInvestments) <= 0) {
    errors.push(t.errInvestPositive);
  }

  return errors;
}

function ProjectionChart({ projection, band, currency, t }) {
  const width = 720;
  const height = 300;
  const pad = { top: 18, right: 20, bottom: 34, left: 72 };
  const isMonteCarlo = Boolean(band);
  const values = projection.map((point) => point.value);
  const bandValues = isMonteCarlo ? band.map((point) => point.p90) : [];
  const maxValue = Math.max(...values, ...bandValues, 1);
  const xStep = projection.length > 1
    ? (width - pad.left - pad.right) / (projection.length - 1)
    : 0;
  const yScale = (height - pad.top - pad.bottom) / maxValue;
  const xAt = (index) => pad.left + index * xStep;
  const yAt = (value) => height - pad.bottom - value * yScale;
  const toPoints = (series) => series
    .map((value, index) => `${xAt(index).toFixed(1)},${yAt(value).toFixed(1)}`)
    .join(' ');
  const points = toPoints(values);
  const bandPolygon = isMonteCarlo
    ? `${toPoints(band.map((point) => point.p90))} ${toPoints(band.map((point) => point.p10)).split(' ').reverse().join(' ')}`
    : '';
  const medianPoints = isMonteCarlo ? toPoints(band.map((point) => point.p50)) : '';
  const visibleYearLabels = projection.filter(
    (_, index) => index === 0 || index === projection.length - 1 || (index + 1) % 5 === 0,
  );

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t.chartAriaLabel}>
      <defs>
        <linearGradient id="projectionFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={width} height={height} fill="transparent" />
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = yAt(maxValue * ratio);
        return (
          <g key={ratio}>
            <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#26364f" strokeDasharray="4 6" />
            <text className="axis-label" x="8" y={y + 4}>{formatCurrency(maxValue * ratio, currency)}</text>
          </g>
        );
      })}
      {isMonteCarlo ? (
        <>
          <polygon points={bandPolygon} fill="#34d399" fillOpacity="0.14" className="mc-band" />
          <polyline points={toPoints(band.map((point) => point.p90))} fill="none" stroke="#34d399" strokeWidth="2" strokeOpacity="0.7" />
          <polyline points={toPoints(band.map((point) => point.p10))} fill="none" stroke="#fb7185" strokeWidth="2" strokeOpacity="0.7" />
          <polyline points={medianPoints} fill="none" stroke="#34d399" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={points} fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="5 6" strokeOpacity="0.85" />
        </>
      ) : (
        <>
          <polygon
            points={`${pad.left},${height - pad.bottom} ${points} ${width - pad.right},${height - pad.bottom}`}
            fill="url(#projectionFill)"
          />
          <polyline points={points} fill="none" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          {projection.map((point, index) => (
            <circle key={point.year} cx={xAt(index)} cy={yAt(point.value)} r="3.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="3" />
          ))}
        </>
      )}
      {visibleYearLabels.map((point, index) => {
        const originalIndex = projection.findIndex((item) => item.year === point.year);
        const anchor = index === visibleYearLabels.length - 1 ? 'end' : 'middle';
        return (
          <text key={point.year} className="axis-label" x={xAt(originalIndex)} y={height - 10} textAnchor={anchor}>
            {t.yearShort(point.year)}
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
  const [apiStatusKey, setApiStatusKey] = useState('checking');
  const [chartMode, setChartMode] = useState('fixed');
  const [lang, setLang] = useState(() => {
    try {
      return window.localStorage.getItem('ii-lang') || 'en';
    } catch {
      return 'en';
    }
  });
  const [selectedGoalId, setSelectedGoalId] = useState('car');
  const [sortBy, setSortBy] = useState('progress');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isProfileManagerOpen, setIsProfileManagerOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState(null);
  const [profileServerError, setProfileServerError] = useState('');
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

  const t = getTranslations(lang);
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

  const monteCarloBand = useMemo(() => {
    const simulated = simulateWealthProjection(displayResult.activeInvestments, form.years);
    return simulated.map((point) => ({
      ...point,
      p10: convertCurrency(point.p10, 'ILS', globalCurrency),
      p50: convertCurrency(point.p50, 'ILS', globalCurrency),
      p90: convertCurrency(point.p90, 'ILS', globalCurrency),
    }));
  }, [displayResult.activeInvestments, form.years, globalCurrency]);

  const endingProjectionValue = convertedResult.wealthProjection.at(-1)?.value || 0;
  const yearlyInvestment = convertedResult.activeInvestments * 12;
  const statusClass = apiStatusKey === 'connected' ? 'status connected' : 'status';
  const goalMonths = monthsToGoal(displayResult.savingsGoals, goalTarget);
  const allocationTotal = Object.values(allocation).reduce((sum, value) => sum + parsePositiveField(value), 0);
  const validationErrors = validateForm(form, goalTarget, allocation, t);
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
      ? ['warning', t.insightNetHigh]
      : netRatio > 0.85
        ? ['warning', t.insightNetClose]
        : netRatio < 0.45
          ? ['warning', t.insightNetLow]
          : ['good', t.insightNetOk],
    goalMonths
      ? goalMonths > 120
        ? ['warning', t.insightGoalLong(goalMonths)]
        : ['good', t.insightGoalOk(goalMonths)]
      : ['warning', t.insightGoalMissing],
    portfolioProgress >= 50
      ? ['good', t.insightPortfolioGood(portfolioProgress)]
      : ['warning', t.insightPortfolioWarn(portfolioProgress, formatMoney(portfolioTotals.monthly))],
  ];

  useEffect(() => {
    setResult(liveResult);
  }, [liveResult]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/health`)
      .then((response) => setApiStatusKey(response.ok ? 'connected' : 'unavailable'))
      .catch(() => setApiStatusKey('unavailable'));

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

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = getTranslations(lang).dir;
    try {
      window.localStorage.setItem('ii-lang', lang);
    } catch {
      // Persisting the language is best-effort.
    }
  }, [lang]);

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
      setMessage(t.goalNameTargetRequired);
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

  async function sendJson(path, method, payload) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: payload ? { 'Content-Type': 'application/json' } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
    });

    if (response.status === 204) {
      return null;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  function postJson(path, payload) {
    return sendJson(path, 'POST', payload);
  }

  function remoteIdOf(profile) {
    return typeof profile?.id === 'string' && profile.id.startsWith('remote-')
      ? profile.id.slice('remote-'.length)
      : null;
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
      setMessage(t.duplicateLoaded(form.name.trim()));
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
      setMessage(t.showingLocal(err.message));
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
      setMessage(t.profileSaved);
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
      setMessage(t.profileSaved);
    } catch (err) {
      setResult(liveResult);
      if (!(await recoverFromDuplicateName(err))) {
        setMessage(t.continuingLocal(err.message));
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
      return t.errProfileNameRequired;
    }
    if (grossSalary <= 0) {
      return t.errGrossPositive;
    }
    if (grossSalary > 1000000) {
      return t.errGrossTooHigh;
    }
    if (bankNet <= 0) {
      return t.errNetPositive;
    }
    if (bankNet > grossSalary) {
      return t.errNetAboveGross;
    }
    return '';
  }

  function openProfileManager() {
    setProfileServerError('');
    setProfileDraft({
      name: activeProfile.name,
      grossSalary: form.grossSalary,
      bankNet: form.bankNet,
    });
    setIsProfileManagerOpen(true);
  }

  function updateProfileDraft(draft) {
    setProfileServerError('');
    setProfileDraft(draft);
  }

  function selectManagedProfile(profileId) {
    const profile = profiles.find((item) => item.id === profileId);
    if (!profile) {
      return;
    }

    setActiveProfileId(profileId);
    setProfileServerError('');
    setProfileDraft({
      name: profile.name,
      grossSalary: profile.form.grossSalary,
      bankNet: profile.form.bankNet,
    });
  }

  function toServerError(err) {
    return /already exists/i.test(err.message) ? t.errProfileExists : err.message;
  }

  function closeProfileManager() {
    setProfileDraft(null);
    setProfileServerError('');
    setIsProfileManagerOpen(false);
  }

  async function createManagedProfile() {
    const name = profileDraft.name.trim();
    const grossSalary = Number(profileDraft.grossSalary);
    const bankNet = Number(profileDraft.bankNet);
    let id = `local-${Date.now()}`;

    try {
      const data = await postJson('/calculate/profiles', {
        name,
        grossSalary,
        bankNet,
        years: form.years,
        allocation,
      });
      id = `remote-${data.profile.id}`;
    } catch (err) {
      if (/already exists/i.test(err.message)) {
        setProfileServerError(t.errProfileExists);
        return;
      }
      // Backend unreachable: keep the profile local so the app stays usable.
    }

    setProfiles((current) => [...current, createProfile(id, name, {
      form: { ...form, name, grossSalary, bankNet },
      allocation,
      goals: goals.map((goal) => ({ ...goal })),
    })]);
    setActiveProfileId(id);
    closeProfileManager();
    setMessage(t.profileSaved);
  }

  async function saveManagedProfile() {
    const name = profileDraft.name.trim();
    const grossSalary = Number(profileDraft.grossSalary);
    const bankNet = Number(profileDraft.bankNet);
    const serverId = remoteIdOf(activeProfile);

    if (serverId) {
      try {
        await sendJson(`/calculate/profiles/${serverId}`, 'PATCH', { name, grossSalary, bankNet });
      } catch (err) {
        setProfileServerError(toServerError(err));
        return;
      }
    }

    updateActiveProfile((profile) => ({
      ...profile,
      name,
      form: { ...profile.form, name, grossSalary, bankNet },
    }));
    closeProfileManager();
    setMessage(t.profileSaved);
  }

  async function deleteManagedProfile() {
    if (profiles.length < 2) {
      return;
    }

    const serverId = remoteIdOf(activeProfile);
    if (serverId) {
      try {
        await sendJson(`/calculate/profiles/${serverId}`, 'DELETE');
      } catch (err) {
        if (!/not found/i.test(err.message)) {
          setProfileServerError(toServerError(err));
          return;
        }
      }
    }

    const nextProfiles = profiles.filter((profile) => profile.id !== activeProfileId);
    setProfiles(nextProfiles);
    setActiveProfileId(nextProfiles[0].id);
    closeProfileManager();
  }

  function exportPdf() {
    window.print();
  }

  return (
    <main>
      <div className="toggle-cluster">
        <button
          type="button"
          className="theme-toggle lang-toggle"
          onClick={() => setLang((current) => (current === 'en' ? 'he' : 'en'))}
          aria-label={t.langToggle}
        >
          {t.langToggle}
        </button>
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
          aria-label={theme === 'dark' ? t.switchToLight : t.switchToDark}
        >
          <span className="theme-toggle-icon" aria-hidden="true" />
          {theme === 'dark' ? t.lightMode : t.darkMode}
        </button>
      </div>
      {activeView === 'home' ? (
        <Home
          form={form}
          message={message}
          successMessage={t.profileSaved}
          validationErrors={validationErrors}
          hasValidationErrors={hasValidationErrors}
          onFieldChange={updateField}
          onSaveProfile={saveProfileAndContinue}
          t={t}
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
                <p>{t.appSubtitle}</p>
              </div>
            </div>
            <p id="api-status" className={statusClass}>{t.apiStatus[apiStatusKey]}</p>
          </header>

          <div className="top-toolbar">
            <label className="toolbar-field" htmlFor="profile">
              <span>{t.profile}</span>
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
              aria-label={t.manageProfiles}
              title={t.manageProfiles}
            >
              *
            </button>
            <CurrencySelector value={globalCurrency} onChange={setGlobalCurrency} label={t.currency} />
          </div>

          <nav className="view-switcher" aria-label="Primary views">
            <button
              type="button"
              className={activeView === 'budget' ? 'view-card active' : 'view-card'}
              onClick={() => setActiveView('budget')}
            >
              <strong>{t.budgetView}</strong>
              <span>{t.budgetViewDesc}</span>
            </button>
            <button
              type="button"
              className={activeView === 'goals' ? 'view-card active' : 'view-card'}
              onClick={() => setActiveView('goals')}
            >
              <strong>{t.goalsView}</strong>
              <span>{t.goalsViewDesc}</span>
            </button>
          </nav>

          {activeView === 'budget' && (
            <div className="layout">
              <form className="panel" onSubmit={calculate}>
                <div className="section-title">
                  <span>02</span>
                  <h2>{t.budgetAllocation}</h2>
                </div>

                <label htmlFor="years">{t.projectionYears}</label>
                <input id="years" name="years" type="number" min="1" max="15" step="1" value={form.years} onChange={updateField} />

                <label htmlFor="goalTarget">{t.savingsGoal}</label>
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
                    <h3>{t.bucketPercentages}</h3>
                    <strong>{allocationTotal}%</strong>
                  </div>
                  {bucketLabels.map(([key]) => (
                    <div className="slider-row" key={key}>
                      <label htmlFor={`${key}Percent`}>
                        <span>{t.buckets[key]}</span>
                        <strong>{allocation[key]}%</strong>
                      </label>
                      <input
                        id={`${key}Percent`}
                        aria-label={`${t.buckets[key]} percentage`}
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

                <button type="submit" disabled={hasValidationErrors}>{t.calculate}</button>
                <div className="actions">
                  <button type="button" className="secondary" onClick={saveProfile} disabled={hasValidationErrors}>{t.save}</button>
                  <button type="button" className="secondary" onClick={exportPdf}>{t.exportPdf}</button>
                </div>
                <div className={message === t.profileSaved ? 'notice success' : 'notice'} role="status">{message}</div>
                {hasValidationErrors && (
                  <div className="validation-list" aria-label={t.validationErrors}>
                    {validationErrors.map((error) => (
                      <p key={error}>{error}</p>
                    ))}
                  </div>
                )}
              </form>

              <section>
                <div className="summary-strip" aria-label="Financial summary">
                  <div>
                    <span>{t.monthlyBankNet}</span>
                    <strong><AnimatedNumber value={convertedResult.bankNet} format={formatMoney} /></strong>
                  </div>
                  <div>
                    <span>{t.monthlyInvesting}</span>
                    <strong><AnimatedNumber value={convertedResult.activeInvestments} format={formatMoney} /></strong>
                  </div>
                  <div>
                    <span>{t.annualInvesting}</span>
                    <strong><AnimatedNumber value={yearlyInvestment} format={formatMoney} /></strong>
                  </div>
                  <div>
                    <span>{t.projectedValue}</span>
                    <strong><AnimatedNumber value={endingProjectionValue} format={formatMoney} /></strong>
                  </div>
                </div>

                <div className="buckets" data-testid="bucket-grid">
                  {bucketLabels.map(([key, tone]) => (
                    <article className={`bucket ${tone}`} key={key}>
                      <div className="bucket-top">
                        <strong>{t.buckets[key]}</strong>
                        <small>{parsePositiveField(allocation[key])}%</small>
                      </div>
                      <span data-testid={key}><AnimatedNumber value={convertedResult[key]} format={formatMoney} /></span>
                    </article>
                  ))}
                </div>

                <div className="feature-grid">
                  <section className="feature-card goal-card">
                    <div className="section-title compact">
                      <span>03</span>
                      <h2>{t.savingsGoal}</h2>
                    </div>
                    <strong>{formatMoney(convertCurrency(goalTarget, 'ILS', globalCurrency))}</strong>
                    <p>
                      {goalMonths
                        ? t.goalMonthsAt(goalMonths, formatMoney(convertedResult.savingsGoals))
                        : t.goalSetTimeline}
                    </p>
                  </section>

                  <section className="feature-card insights-card">
                    <div className="section-title compact">
                      <span>04</span>
                      <h2>{t.smartInsights}</h2>
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
                    <h2>{t.scenarioComparison}</h2>
                  </div>
                  <div className="scenario-grid">
                    {scenarioResults.map((scenario) => (
                      <article className="scenario" key={scenario.label}>
                        <strong>{t.scenarios[scenario.label]}</strong>
                        <span>{formatMoney(scenario.endingValue)}</span>
                        <p>{t.scenarioLine((scenario.investmentRate * 100).toFixed(0), (scenario.annualReturn * 100).toFixed(0))}</p>
                      </article>
                    ))}
                  </div>
                </section>

                <div className="chart-panel">
                  <div className="section-title chart-title-row">
                    <span>06</span>
                    <h2>{t.chartTitle(clampYears(form.years))}</h2>
                    <div className="chart-mode-toggle" role="group" aria-label={t.chartAriaLabel}>
                      <button
                        type="button"
                        className={chartMode === 'fixed' ? 'chart-mode active' : 'chart-mode'}
                        onClick={() => setChartMode('fixed')}
                      >
                        {t.chartModeFixed}
                      </button>
                      <button
                        type="button"
                        className={chartMode === 'montecarlo' ? 'chart-mode active' : 'chart-mode'}
                        onClick={() => setChartMode('montecarlo')}
                      >
                        {t.chartModeMonteCarlo}
                      </button>
                    </div>
                  </div>
                  <div className="chart-frame">
                    <ProjectionChart
                      projection={convertedResult.wealthProjection}
                      band={chartMode === 'montecarlo' ? monteCarloBand : null}
                      currency={globalCurrency}
                      t={t}
                    />
                  </div>
                  {chartMode === 'montecarlo' && (
                    <div className="chart-legend" data-testid="mc-legend">
                      <p className="mc-hint">{t.monteCarloHint}</p>
                      <div className="legend-items">
                        <span className="legend-item optimistic">{t.legendOptimistic}</span>
                        <span className="legend-item median">{t.legendMedian}</span>
                        <span className="legend-item pessimistic">{t.legendPessimistic}</span>
                        <span className="legend-item fixed">{t.legendFixed}</span>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {activeView === 'goals' && (
            <section className="view-section">
              <div className="summary-strip portfolio-summary" aria-label="Portfolio summary">
                <div>
                  <span>{t.totalTarget}</span>
                  <strong><AnimatedNumber value={portfolioTotals.target} format={formatMoney} /></strong>
                </div>
                <div>
                  <span>{t.currentlySaved}</span>
                  <strong><AnimatedNumber value={portfolioTotals.saved} format={formatMoney} /></strong>
                </div>
                <div>
                  <span>{t.requiredMonthly}</span>
                  <strong><AnimatedNumber value={portfolioTotals.monthly} format={formatMoney} /></strong>
                </div>
                <div>
                  <span>{t.goalProgress}</span>
                  <strong><AnimatedNumber value={portfolioProgress} format={(value) => `${Math.round(value)}%`} /></strong>
                </div>
              </div>

              <div className="filter-bar" aria-label="Goal filters">
                <label className="toolbar-field" htmlFor="sortBy">
                  <span>{t.sortBy}</span>
                  <select id="sortBy" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                    <option value="progress">{t.sortProgress}</option>
                    <option value="amount">{t.sortAmount}</option>
                    <option value="monthly">{t.sortMonthly}</option>
                  </select>
                </label>
                <label className="toolbar-field" htmlFor="statusFilter">
                  <span>{t.status}</span>
                  <select id="statusFilter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    {statuses.map((status) => <option key={status} value={status}>{t.statusNames[status]}</option>)}
                  </select>
                </label>
                <label className="toolbar-field" htmlFor="categoryFilter">
                  <span>{t.category}</span>
                  <select id="categoryFilter" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                    {categories.map((category) => <option key={category} value={category}>{t.categoryNames[category]}</option>)}
                  </select>
                </label>
                <button type="button" className="create-goal-button" onClick={openCreateGoal}>{t.createGoal}</button>
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
                        <span className={`badge ${status === 'At risk' ? 'risk' : 'track'}`}>{t.statusNames[status]}</span>
                        <div className="goal-actions" aria-label={t.goalActions(goal.name)}>
                          <button type="button" className="icon-button mini" onClick={() => openEditGoal(goal)} aria-label={t.editGoal(goal.name)}>E</button>
                          <button type="button" className="icon-button mini danger-icon" onClick={() => deleteGoal(goal.id)} aria-label={t.deleteGoal(goal.name)}>D</button>
                        </div>
                      </div>
                      {progress >= 100 && (
                        <div className="confetti" aria-hidden="true">
                          {Array.from({ length: 12 }, (_, index) => (
                            <i key={index} style={{ '--i': index }} />
                          ))}
                        </div>
                      )}
                      <button type="button" className="goal-card-body" onClick={() => setSelectedGoalId(goal.id)}>
                        <strong>{goal.name}</strong>
                        <small>{t.categoryNames[goal.category] || goal.category}</small>
                      </button>
                      <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
                      <dl>
                        <div><dt>{t.targetAmount}</dt><dd>{formatMoney(target)}</dd></div>
                        <div><dt>{t.currentlySaved}</dt><dd>{formatMoney(saved)}</dd></div>
                        <div><dt>{t.requiredMonthly}</dt><dd>{formatMoney(monthly)}</dd></div>
                        <div><dt>{t.monthsRemaining}</dt><dd>{monthsLeft === Infinity ? t.notAvailable : monthsLeft}</dd></div>
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
                t={t}
              />
            </section>
          )}

          <ProfileManager
            isOpen={isProfileManagerOpen}
            profiles={profiles}
            activeProfileId={activeProfileId}
            draft={profileDraft}
            onDraftChange={updateProfileDraft}
            error={validateProfileDraft(profileDraft) || profileServerError}
            onClose={closeProfileManager}
            onCreate={createManagedProfile}
            onSave={saveManagedProfile}
            onDelete={deleteManagedProfile}
            onSelect={selectManagedProfile}
            t={t}
          />
          <GoalFormModal
            isOpen={Boolean(goalDraft)}
            mode={goalModalMode}
            draft={goalDraft}
            onChange={setGoalDraft}
            onClose={closeGoalModal}
            onSubmit={saveGoalDraft}
            t={t}
          />
        </>
      )}
    </main>
  );
}
