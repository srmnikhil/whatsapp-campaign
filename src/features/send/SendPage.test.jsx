import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HEADER_FORMATS } from '../../constants/templates.js';
import { SENDER_PHASE } from '../../hooks/useCampaignSender.js';
import { SendPage } from './SendPage.jsx';

const SETTINGS = {
  accessToken: 'token-123',
  phoneNumberId: 'phone-123',
  graphApiVersion: 'v25.0',
  backendUrl: 'https://backend.example.com',
  backendApiKey: 'api-key-123',
};

const TEXT_TEMPLATE = {
  id: 'tmpl-1',
  name: 'festive_offer',
  language: 'en_US',
  category: 'MARKETING',
  bodyText: 'Hello {{1}}, check out our festive offer!',
  footerText: 'Reply STOP to opt out',
  header: { format: HEADER_FORMATS.NONE },
  buttons: [],
  problems: [],
};

const IMAGE_TEMPLATE = {
  id: 'tmpl-2',
  name: 'image_offer',
  language: 'en_US',
  category: 'MARKETING',
  bodyText: 'Hello {{1}}, big discounts today!',
  footerText: 'Reply STOP to opt out',
  header: { format: HEADER_FORMATS.IMAGE, exampleUrl: 'https://example.com/img.jpg' },
  buttons: [],
  problems: [],
};

const TEMPLATES_STATE = {
  templates: [TEXT_TEMPLATE, IMAGE_TEMPLATE],
  isLoading: false,
};

const SENDER = {
  phase: SENDER_PHASE.IDLE,
};

describe('SendPage unified flow', () => {
  it('shows sheet upload options directly in SendPage when no contacts are loaded', () => {
    render(
      <SendPage
        settings={SETTINGS}
        contactsImport={null}
        onImportChange={vi.fn()}
        templatesState={TEMPLATES_STATE}
        graphClient={{}}
        backendClient={{}}
        connectionInfo={null}
        sender={SENDER}
        startSend={vi.fn()}
        stopSend={vi.fn()}
        onViewResults={vi.fn()}
      />,
    );

    expect(screen.getByText('Step 1: Upload or Connect Contact Sheet')).toBeInTheDocument();
    expect(screen.getByText(/Option A: Google Sheets Link/)).toBeInTheDocument();
    expect(screen.getByText(/Option B: Upload File/)).toBeInTheDocument();
  });

  it('skips image upload step and never displays "no image" notice for templates without an image', async () => {
    const user = userEvent.setup();
    const contactsImport = {
      sourceLabel: 'customers.csv',
      table: {
        headers: ['Name', 'Phone'],
        rows: [
          ['Vikram', '9876543210'],
          ['Amit', '9876543211'],
        ],
      },
      mapping: { nameIndex: 0, phoneIndex: 1 },
    };

    const mockBackend = {
      request: vi.fn().mockImplementation((path) => {
        if (path.includes('/opted-out')) return Promise.resolve({ optedOut: [] });
        if (path.includes('/usage-24h')) return Promise.resolve({ uniqueRecipients: 0 });
        return Promise.resolve({});
      }),
    };

    render(
      <SendPage
        settings={SETTINGS}
        contactsImport={contactsImport}
        onImportChange={vi.fn()}
        templatesState={TEMPLATES_STATE}
        graphClient={{}}
        backendClient={mockBackend}
        connectionInfo={{ verifiedName: 'Garaaz Notification' }}
        sender={SENDER}
        startSend={vi.fn()}
        stopSend={vi.fn()}
        onViewResults={vi.fn()}
      />,
    );

    // Click on template festive_offer (which has NO image)
    const templateBtn = screen.getByRole('button', { name: /Select template festive_offer/i });
    await user.click(templateBtn);

    // Click "Use this template →" button
    const useBtn = screen.getByRole('button', { name: /Use this template/i });
    await user.click(useBtn);

    // It should jump straight to Confirm step without showing any "This template has no image header"
    expect(screen.queryByText(/This template has no image header/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/no image in the template/i)).not.toBeInTheDocument();

    // Confirm step card should be present
    expect(await screen.findByText('Campaign Confirmation')).toBeInTheDocument();

    // Account display name auto-fetched from verified credentials should be shown
    expect(screen.getByText('Account: Garaaz Notification')).toBeInTheDocument();

    // Preview of 3 persons should NOT be present (no 3 separate cards)
    expect(screen.queryByText('How the message will look for the first few contacts.')).not.toBeInTheDocument();
  });

  it('blocks sending and shows error warning when contacts list exceeds 2,000 unique users', async () => {
    const rows = [];
    for (let i = 0; i < 2005; i++) {
      rows.push([`User ${i}`, `98765${String(i).padStart(5, '0')}`]);
    }

    const contactsImport = {
      sourceLabel: 'large_list.csv',
      table: {
        headers: ['Name', 'Phone'],
        rows,
      },
      mapping: { nameIndex: 0, phoneIndex: 1 },
    };

    render(
      <SendPage
        settings={SETTINGS}
        contactsImport={contactsImport}
        onImportChange={vi.fn()}
        templatesState={TEMPLATES_STATE}
        graphClient={{}}
        backendClient={{}}
        connectionInfo={null}
        sender={SENDER}
        startSend={vi.fn()}
        stopSend={vi.fn()}
        onViewResults={vi.fn()}
      />,
    );

    // Switch to contacts step to view summary
    const sheetTab = screen.getByRole('button', { name: /1. Contact Sheet/i });
    await userEvent.click(sheetTab);

    // Should display warning
    expect(screen.getByText(/Contact limit exceeded \(2,000 max\)/i)).toBeInTheDocument();

    // Next button must be disabled
    const nextBtn = screen.getByRole('button', { name: /Cannot proceed: Exceeds 2,000 limit/i });
    expect(nextBtn).toBeDisabled();
  });

  it('filters templates in TemplateSelector by search text and category', async () => {
    const user = userEvent.setup();
    const UTILITY_TEMPLATE = {
      id: 'tmpl-3',
      name: 'order_update_notification',
      category: 'UTILITY',
      language: 'en',
      bodyText: 'Your order has been allocated to you.',
      footerText: 'Garaaz',
      header: { format: HEADER_FORMATS.NONE },
      buttons: [],
      problems: [],
    };

    const templatesWithUtility = {
      templates: [TEXT_TEMPLATE, IMAGE_TEMPLATE],
      allTemplates: [TEXT_TEMPLATE, IMAGE_TEMPLATE, UTILITY_TEMPLATE],
      isLoading: false,
    };

    const contactsImport = {
      sourceLabel: 'customers.csv',
      table: {
        headers: ['Name', 'Phone'],
        rows: [['Vikram', '9876543210']],
      },
      mapping: { nameIndex: 0, phoneIndex: 1 },
    };

    render(
      <SendPage
        settings={{ accessToken: 'tok', phoneNumberId: '123', graphApiVersion: 'v26.0' }}
        contactsImport={contactsImport}
        onImportChange={vi.fn()}
        templatesState={templatesWithUtility}
        graphClient={{}}
        backendClient={{}}
        connectionInfo={null}
        sender={SENDER}
        startSend={vi.fn()}
        stopSend={vi.fn()}
        onViewResults={vi.fn()}
      />,
    );

    // Initial state: shows all 3 templates
    expect(screen.getByText('order_update_notification')).toBeInTheDocument();
    expect(screen.getByText('festive_offer')).toBeInTheDocument();
    expect(screen.getByText('image_offer')).toBeInTheDocument();

    // Type search query
    const searchInput = screen.getByLabelText('Search templates');
    await user.type(searchInput, 'order');

    // Only matching template remains visible
    expect(screen.getByText('order_update_notification')).toBeInTheDocument();
    expect(screen.queryByText('festive_offer')).not.toBeInTheDocument();
    expect(screen.queryByText('image_offer')).not.toBeInTheDocument();

    // Clear search
    await user.click(screen.getByLabelText('Clear search'));
    expect(screen.getByText('festive_offer')).toBeInTheDocument();

    // Switch to Marketing category tab
    await user.click(screen.getByRole('button', { name: /Marketing \(/i }));
    expect(screen.queryByText('order_update_notification')).not.toBeInTheDocument();
    expect(screen.getByText('festive_offer')).toBeInTheDocument();

    // Switch to Utility category tab
    await user.click(screen.getByRole('button', { name: /Utility \(/i }));
    expect(screen.getByText('order_update_notification')).toBeInTheDocument();
    expect(screen.queryByText('festive_offer')).not.toBeInTheDocument();
  });

  it('runs send flow without requiring any backend configuration (standalone mode)', async () => {
    const user = userEvent.setup();
    const contactsImport = {
      sourceLabel: 'customers.csv',
      table: {
        headers: ['Name', 'Phone'],
        rows: [['Vikram', '9876543210']],
      },
      mapping: { nameIndex: 0, phoneIndex: 1 },
    };

    const standaloneSettings = {
      accessToken: 'token-123',
      phoneNumberId: 'phone-123',
      graphApiVersion: 'v26.0',
      // No backendUrl, No backendApiKey!
    };

    const startSendMock = vi.fn();

    render(
      <SendPage
        settings={standaloneSettings}
        contactsImport={contactsImport}
        onImportChange={vi.fn()}
        templatesState={TEMPLATES_STATE}
        graphClient={{}}
        backendClient={null}
        connectionInfo={{ verifiedName: 'Garaaz Notification' }}
        sender={SENDER}
        startSend={startSendMock}
        stopSend={vi.fn()}
        onViewResults={vi.fn()}
      />,
    );

    // Select festive_offer
    await user.click(screen.getByRole('button', { name: /Select template festive_offer/i }));
    await user.click(screen.getByRole('button', { name: /Use this template/i }));

    // Confirm step renders without missing backend errors
    expect(screen.queryByText(/Backend URL/i)).not.toBeInTheDocument();
    expect(await screen.findByText('Campaign Confirmation')).toBeInTheDocument();

    // Click Start Campaign
    const sendBtn = screen.getByRole('button', { name: /Send to/i });
    expect(sendBtn).toBeEnabled();
    await user.click(sendBtn);

    expect(startSendMock).toHaveBeenCalledTimes(1);
    expect(startSendMock.mock.calls[0][0].template.name).toBe('festive_offer');
  });
});
