import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../App.jsx';
import { saveSettings } from '../../lib/settings.js';

const SETTINGS = {
  accessToken: 'EAAJBabcdefghijklmnopqrstuvwxyz0123456789',
  appId: '111',
  wabaId: '222',
  phoneNumberId: '333',
  graphApiVersion: 'v25.0',
  backendUrl: '',
  backendApiKey: '',
};

const TEMPLATES = [
  {
    id: '1',
    name: 'diwali_offer',
    language: 'en',
    status: 'APPROVED',
    category: 'MARKETING',
    components: [
      { type: 'BODY', text: 'Hi {{1}}, 20% off.' },
      { type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: 'Stop promotions' }] },
    ],
  },
  { id: '2', name: 'new_offer', language: 'hi', status: 'PENDING', category: 'MARKETING', components: [{ type: 'BODY', text: 'Sale' }] },
  { id: '3', name: 'hello_world', language: 'en_US', status: 'APPROVED', category: 'UTILITY', components: [{ type: 'BODY', text: 'Hello' }] },
];

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function openTemplates(user) {
  await user.click(screen.getByRole('button', { name: 'Templates' }));
  return screen.findByRole('article', { name: 'Template diwali_offer' });
}

afterEach(() => vi.restoreAllMocks());

describe('Templates page', () => {
  it('asks for settings before loading', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Templates' }));
    expect(screen.getByText('Settings incomplete')).toBeInTheDocument();
  });

  it('lists marketing templates, hides others, and refreshes one', async () => {
    saveSettings(SETTINGS);
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ data: TEMPLATES, paging: { cursors: {} } }))
      .mockResolvedValueOnce(json({ ...TEMPLATES[1], status: 'APPROVED' }));
    const user = userEvent.setup();
    render(<App />);

    const ready = await openTemplates(user);
    expect(within(ready).getByText('Ready for campaigns')).toBeInTheDocument();
    expect(fetchSpy.mock.calls[0][0]).toContain('/v25.0/222/message_templates?fields=');
    expect(screen.queryByRole('article', { name: 'Template hello_world' })).not.toBeInTheDocument();
    expect(screen.getByText('1 utility or authentication templates are hidden.')).toBeInTheDocument();

    const pending = screen.getByRole('article', { name: 'Template new_offer' });
    expect(within(pending).getByText('Status is PENDING')).toBeInTheDocument();
    await user.click(within(pending).getByRole('button', { name: 'Refresh status of new_offer' }));
    expect(await within(screen.getByRole('article', { name: 'Template new_offer' })).findByText('Ready for campaigns')).toBeInTheDocument();
  });

  it('blocks image templates until the backend is configured', async () => {
    saveSettings(SETTINGS);
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json({ data: [], paging: {} }));
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Templates' }));

    expect(await screen.findByText('Image upload needs the backend')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit for review' })).toBeDisabled();
  });

  it('submits a text template and adds it to the list', async () => {
    saveSettings(SETTINGS);
    const created = { id: '9', name: 'big_sale', language: 'en', status: 'PENDING', category: 'MARKETING', components: [{ type: 'BODY', text: 'Hi {{1}}, big sale today.' }] };
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ data: [], paging: {} }))
      .mockResolvedValueOnce(json({ id: '9', status: 'PENDING', category: 'MARKETING' }))
      .mockResolvedValueOnce(json(created));
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Templates' }));

    await user.type(await screen.findByLabelText(/Template name/), 'big_sale');
    await user.click(screen.getByLabelText('No header'));
    await user.type(screen.getByLabelText(/Message text/), 'Hi ');
    await user.click(screen.getByRole('button', { name: 'Insert {{1}} (name)' }));
    await user.type(screen.getByLabelText(/Message text/), ', big sale today.');
    expect(within(screen.getByLabelText('Message preview', { selector: 'form *' })).getByText('Hi Rahul, big sale today.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Submit for review' }));

    expect(await screen.findByText('Submitted for review: PENDING')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Template big_sale' })).toBeInTheDocument();
    const body = JSON.parse(fetchSpy.mock.calls[1][1].body);
    expect(body).toMatchObject({ name: 'big_sale', category: 'MARKETING', components: [{ type: 'BODY' }, { type: 'BUTTONS' }] });
  });
});
