import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../App.jsx';
import { STORAGE_KEYS } from '../../constants/storageKeys.js';
import { saveSettings } from '../../lib/settings.js';

const TOKEN = 'EAAJBabcdefghijklmnopqrstuvwxyz0123456789';
const SAVED = {
  accessToken: TOKEN,
  appId: '111',
  wabaId: '222',
  phoneNumberId: '333',
  graphApiVersion: 'v26.0',
  backendUrl: '',
  backendApiKey: '',
};

function mockFetchOnce(status, body) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
}

afterEach(() => vi.restoreAllMocks());

describe('Settings page', () => {
  it('saves settings to localStorage with the token masked', async () => {
    const user = userEvent.setup();
    render(<App />);

    const tokenInput = screen.getByLabelText(/System user access token/, { selector: 'input' });
    expect(tokenInput).toHaveAttribute('type', 'password');

    await user.type(tokenInput, TOKEN);
    await user.type(screen.getByLabelText(/Phone number ID/), '333');
    await user.click(screen.getByRole('button', { name: 'Save settings' }));

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS));
    expect(stored).toMatchObject({ accessToken: TOKEN, phoneNumberId: '333' });
    expect(screen.getByText('Settings saved in this browser.')).toBeInTheDocument();
  });

  it('shows validation errors and does not save', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/WhatsApp Business Account ID/), 'abc');
    await user.click(screen.getByRole('button', { name: 'Save settings' }));

    expect(screen.getByText('Use digits only.')).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEYS.SETTINGS)).toBeNull();
  });

  it('clears settings after confirmation', async () => {
    saveSettings(SAVED);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Clear settings' }));

    expect(localStorage.getItem(STORAGE_KEYS.SETTINGS)).toBeNull();
    expect(screen.getByLabelText(/System user access token/, { selector: 'input' })).toHaveValue('');
  });

  it('shows number, quality and tier on test connection', async () => {
    saveSettings(SAVED);
    const fetchSpy = mockFetchOnce(200, {
      verified_name: 'Garaaz',
      display_phone_number: '+91 98765 43210',
      quality_rating: 'GREEN',
      whatsapp_business_manager_messaging_limit: 'TIER_2K',
      name_status: 'APPROVED',
    });
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Test connection' }));

    const details = await screen.findByText('Garaaz');
    const list = within(details.closest('dl'));
    expect(list.getByText('+91 98765 43210')).toBeInTheDocument();
    expect(list.getByText('High')).toBeInTheDocument();
    expect(list.getByText('2,000 unique users / 24 h')).toBeInTheDocument();
    expect(fetchSpy.mock.calls[0][0]).toContain('/v26.0/333?fields=');
  });

  it('shows a Meta error without leaking the token', async () => {
    saveSettings(SAVED);
    mockFetchOnce(401, { error: { message: `Invalid token ${TOKEN}`, code: 190 } });
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Test connection' }));

    const alert = await screen.findByText('Meta error 190');
    expect(alert.closest('[role="alert"]')).not.toHaveTextContent(TOKEN);
  });

  it('sends a test template to a normalised number', async () => {
    saveSettings(SAVED);
    const fetchSpy = mockFetchOnce(200, { messages: [{ id: 'wamid.TEST', message_status: 'accepted' }] });
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/Send to/), '98765 43210');
    await user.click(screen.getByRole('button', { name: 'Send test message' }));

    expect(await screen.findByText('wamid.TEST')).toBeInTheDocument();
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body).toMatchObject({ to: '919876543210', template: { name: 'hello_world', language: { code: 'en_US' } } });
  });
});
