import { Table } from '../../components/ui/Table.jsx';
import { formatPhoneDisplay } from '../../lib/phone.js';

const INVALID_COLUMNS = [
  { key: 'rowNumber', label: 'Row' },
  { key: 'name', label: 'Name' },
  { key: 'rawPhone', label: 'Phone as given' },
  { key: 'reason', label: 'Reason' },
];

const DUPLICATE_COLUMNS = [
  { key: 'rowNumber', label: 'Row' },
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'firstRowNumber', label: 'First seen in row' },
];

const getRowKey = (row) => row.rowNumber;

function IssueSection({ title, columns, rows }) {
  if (rows.length === 0) return null;
  return (
    <details className="rounded-lg border border-line">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-navy">{title} ({rows.length})</summary>
      <div className="px-4 pb-4">
        <Table columns={columns} rows={rows} getRowKey={getRowKey} caption={title} />
      </div>
    </details>
  );
}

export function ContactIssues({ invalid, duplicates }) {
  return (
    <div className="flex flex-col gap-3">
      <IssueSection title="Invalid rows (skipped)" columns={INVALID_COLUMNS} rows={invalid} />
      <IssueSection title="Duplicate numbers (skipped)" columns={DUPLICATE_COLUMNS} rows={duplicates.map((d) => ({ ...d, phone: formatPhoneDisplay(d.phone) }))} />
    </div>
  );
}
