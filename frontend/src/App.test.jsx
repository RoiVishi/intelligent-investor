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

    expect(screen.getByTestId('fixedCosts')).toHaveTextContent('₪3,850');
    expect(screen.getByTestId('savingsGoals')).toHaveTextContent('₪700');
    expect(screen.getByTestId('activeInvestments')).toHaveTextContent('₪700');
    expect(screen.getByTestId('guiltFreeSpending')).toHaveTextContent('₪1,925');
  });

  test('shows validation when bank net is higher than gross salary', () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText(/gross salary/i), { target: { value: '10000' } });
    fireEvent.change(screen.getByLabelText(/bank net/i), { target: { value: '12000' } });

    expect(screen.getByText('Bank net cannot be higher than gross salary.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /calculate/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled();
  });
});
