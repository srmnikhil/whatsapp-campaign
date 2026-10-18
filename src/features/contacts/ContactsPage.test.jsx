import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { ContactsPage } from './ContactsPage.jsx';

const CSV = [
  'Customer Name,Mobile No,City',
  'Ravi Kumar,98765 43210,Delhi',
  'Asha,+91 9123456789,Pune',
  'Ravi dup,919876543210,Delhi',
  'Bad,12345,Agra',
].join('\n');

function Harness() {
  const [importState, setImportState] = useState(null);
  return <ContactsPage importState={importState} onImportChange={setImportState} />;
}

function getStat(label) {
  return within(screen.getByText(label).closest('div')).getByText(/^\d/).textContent;
}

describe('Contacts page', () => {
  it('imports a CSV, guesses columns and shows counts and issues', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.upload(screen.getByLabelText('Upload .csv or .xlsx'), new File([CSV], 'garages.csv', { type: 'text/csv' }));

    expect(await screen.findByText('Imported from garages.csv')).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone column/)).toHaveDisplayValue('Mobile No');
    expect(screen.getByLabelText(/Name column/)).toHaveDisplayValue('Customer Name');
    expect(getStat('Rows')).toBe('4');
    expect(getStat('Ready to send')).toBe('2');
    expect(getStat('Invalid')).toBe('1');
    expect(getStat('Duplicates removed')).toBe('1');
    const preview = screen.getByRole('table', { name: 'Contacts ready to send' });
    expect(within(preview).getByText('919876543210')).toBeInTheDocument();
    expect(within(preview).getByText('919123456789')).toBeInTheDocument();
    expect(screen.getByText('Invalid rows (skipped) (1)')).toBeInTheDocument();
  });

  it('recounts when the phone column changes and clears the import', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.upload(screen.getByLabelText('Upload .csv or .xlsx'), new File([CSV], 'garages.csv', { type: 'text/csv' }));

    await user.selectOptions(await screen.findByLabelText(/Phone column/), 'City');
    expect(getStat('Ready to send')).toBe('0');
    expect(screen.getByText('No valid numbers')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear import' }));
    expect(screen.queryByText('Imported from garages.csv')).not.toBeInTheDocument();
  });

  it('shows a readable error for unsupported files', async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<Harness />);

    await user.upload(screen.getByLabelText('Upload .csv or .xlsx'), new File(['x'], 'old.xls'));
    expect(await screen.findByText('Could not read the file')).toBeInTheDocument();
  });
});
