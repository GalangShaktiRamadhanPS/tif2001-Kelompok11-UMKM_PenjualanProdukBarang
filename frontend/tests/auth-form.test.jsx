// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthDialog } from '../src/App.jsx';

afterEach(cleanup);

describe('login form', () => {
  it('submits the email and password in login mode', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<AuthDialog onClose={vi.fn()} onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText('Email'), 'buyer@example.com');
    await user.type(screen.getByLabelText('Kata sandi'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Masuk ke akun' }));

    expect(onSubmit).toHaveBeenCalledWith(
      { name: '', email: 'buyer@example.com', password: 'secret123' },
      'login',
    );
  });

  it('shows the server error when login fails', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error('Email atau kata sandi salah.'));

    render(<AuthDialog onClose={vi.fn()} onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText('Email'), 'buyer@example.com');
    await user.type(screen.getByLabelText('Kata sandi'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Masuk ke akun' }));

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Email atau kata sandi salah.',
    );
  });
});
