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

  test('shows validation when bank net is higher than gross salary', () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText(/gross salary/i), { target: { value: '10000' } });
    fireEvent.change(screen.getByLabelText(/bank net/i), { target: { value: '12000' } });

    expect(screen.getByText('Bank net cannot be higher than gross salary.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save profile/i })).toBeDisabled();
  });
});
