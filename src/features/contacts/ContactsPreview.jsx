import { Table } from '../../components/ui/Table.jsx';

const COLUMNS = [
  { key: 'rowNumber', label: 'Row' },
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'WhatsApp number' },
];

const getRowKey = (row) => row.phone;

export function ContactsPreview({ contacts, limit }) {
  const shown = contacts.slice(0, limit);
  return (
    <div className="flex flex-col gap-2">
      <Table columns={COLUMNS} rows={shown} getRowKey={getRowKey} caption="Contacts ready to send" />
      {contacts.length > shown.length && (
        <p className="text-xs text-text-secondary">Showing the first {shown.length} of {contacts.length}.</p>
      )}
    </div>
  );
}
