import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeToggle } from '../components/ThemeToggle';

const mockSetTheme = vi.fn();
let mockTheme = 'light';

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: mockTheme, setTheme: mockSetTheme }),
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    mockTheme = 'light';
    mockSetTheme.mockClear();
  });

  it('renders without crashing', async () => {
    render(<ThemeToggle />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument()
    );
  });

  it('shows moon icon and "Switch to dark mode" label in light mode', async () => {
    mockTheme = 'light';
    render(<ThemeToggle />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument()
    );
  });

  it('shows sun icon and "Switch to light mode" label in dark mode', async () => {
    mockTheme = 'dark';
    render(<ThemeToggle />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument()
    );
  });

  it('calls setTheme("dark") when clicked in light mode', async () => {
    mockTheme = 'light';
    render(<ThemeToggle />);
    const button = await screen.findByRole('button', { name: /switch to dark mode/i });
    fireEvent.click(button);
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('calls setTheme("light") when clicked in dark mode', async () => {
    mockTheme = 'dark';
    render(<ThemeToggle />);
    const button = await screen.findByRole('button', { name: /switch to light mode/i });
    fireEvent.click(button);
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });
});
