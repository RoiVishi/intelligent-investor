import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import App from './App.jsx';

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', database: 'connected' }),
    }));
  });

  test('entering salary values updates the displayed bucket amounts', async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText(/gross salary/i), { target: { value: '10000' } });
    fireEvent.change(screen.getByLabelText(/bank net/i), { target: { value: '7000' } });
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));

    await screen.findByTestId('bucket-grid');

    expect(screen.getByTestId('fixedCosts')).toHaveTextContent('₪3,850');
    expect(screen.getByTestId('savingsGoals')).toHaveTextContent('₪700');
    expect(screen.getByTestId('activeInvestments')).toHaveTextContent('₪700');
    expect(screen.getByTestId('guiltFreeSpending')).toHaveTextContent('₪1,750');
  });

  test('changing bucket percentages updates the displayed amounts', async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText(/bank net/i), { target: { value: '7000' } });
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));

    await screen.findByTestId('bucket-grid');

    fireEvent.change(screen.getByLabelText(/fixed costs/i), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText(/guilt-free spending/i), { target: { value: '30' } });

    expect(screen.getByTestId('fixedCosts')).toHaveTextContent('₪3,500');
    expect(screen.getByTestId('guiltFreeSpending')).toHaveTextContent('₪2,100');
  });

  test('duplicate profile name loads the saved profile from the server', async () => {
    let profileListCalls = 0;

    vi.stubGlobal('fetch', vi.fn((url, options = {}) => {
      if (options.method === 'POST' && String(url).includes('/calculate/profiles')) {
        return Promise.resolve({
          ok: false,
          status: 409,
          json: async () => ({ error: 'profile name already exists' }),
        });
      }

      if (String(url).includes('/calculate/profiles')) {
        profileListCalls += 1;
        return Promise.resolve({
          ok: true,
          json: async () => (profileListCalls === 1
            ? []
            : [{ id: 7, name: 'Roi', grossSalary: 11000, bankNet: 7700 }]),
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({ status: 'ok', database: 'connected' }),
      });
    }));

    render(<App />);

    fireEvent.change(screen.getByLabelText(/gross salary/i), { target: { value: '10000' } });
    fireEvent.change(screen.getByLabelText(/bank net/i), { target: { value: '7000' } });
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));

    await screen.findByText(/already exists - loaded the saved version/i);
    await screen.findByTestId('bucket-grid');

    expect(screen.getByTestId('fixedCosts')).toHaveTextContent('₪4,235');
  });

  test('inputs stay editable after profiles load from the server', async () => {
    vi.stubGlobal('fetch', vi.fn((url, options = {}) => {
      if (!options.method && String(url).includes('/calculate/profiles')) {
        return Promise.resolve({
          ok: true,
          json: async () => ([{ id: 7, name: 'Roi', grossSalary: 11000, bankNet: 7700 }]),
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({ status: 'ok', database: 'connected' }),
      });
    }));

    render(<App />);

    // The remote profile replaces the default local one and populates the form.
    await screen.findByDisplayValue('11000');

    // Editing must still work after the remote profile becomes active.
    fireEvent.change(screen.getByLabelText(/gross salary/i), { target: { value: '15000' } });
    expect(screen.getByLabelText(/gross salary/i)).toHaveValue(15000);

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Roi Updated' } });
    expect(screen.getByLabelText(/name/i)).toHaveValue('Roi Updated');
  });

  test('theme toggle switches between dark and light mode and persists', () => {
    window.localStorage.removeItem('ii-theme');
    render(<App />);

    expect(document.documentElement.dataset.theme).toBe('dark');

    fireEvent.click(screen.getByRole('button', { name: /switch to light mode/i }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(window.localStorage.getItem('ii-theme')).toBe('light');

    fireEvent.click(screen.getByRole('button', { name: /switch to dark mode/i }));
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  test('language toggle switches the UI to Hebrew with RTL direction', () => {
    window.localStorage.removeItem('ii-lang');
    render(<App />);

    expect(screen.getByText('Own Your Finances. Shape Your Future.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'עברית' }));

    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('he');
    expect(screen.getByText('קחו שליטה על הכסף. עצבו את העתיד.')).toBeInTheDocument();
    expect(screen.getByLabelText('שכר ברוטו')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(document.documentElement.dir).toBe('ltr');
  });

  test('Monte Carlo toggle shows the simulation legend on the chart', async () => {
    window.localStorage.removeItem('ii-lang');
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));
    await screen.findByTestId('bucket-grid');

    fireEvent.click(screen.getByRole('button', { name: 'Monte Carlo' }));
    expect(screen.getByTestId('mc-legend')).toBeInTheDocument();
    expect(screen.getByText(/90th percentile/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Fixed 7%' }));
    expect(screen.queryByTestId('mc-legend')).not.toBeInTheDocument();
  });

  test('shows validation when bank net is higher than gross salary', () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText(/gross salary/i), { target: { value: '10000' } });
    fireEvent.change(screen.getByLabelText(/bank net/i), { target: { value: '12000' } });

    expect(screen.getByText('Bank net cannot be higher than gross salary.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save profile/i })).toBeDisabled();
  });
});
