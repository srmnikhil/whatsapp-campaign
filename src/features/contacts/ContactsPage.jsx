import { useCallback, useMemo } from 'react';
import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { CONTACT_IMPORT_LIMITS } from '../../config/defaults.js';
import { buildContacts, guessColumns } from '../../lib/contacts.js';
import { ColumnMapping } from './ColumnMapping.jsx';
import { ContactIssues } from './ContactIssues.jsx';
import { ContactsPreview } from './ContactsPreview.jsx';
import { FileUploadForm } from './FileUploadForm.jsx';
import { ImportSummary } from './ImportSummary.jsx';
import { SheetLinkForm } from './SheetLinkForm.jsx';

function ImportResult({ importState, onImportChange }) {
  const { sourceLabel, table, mapping } = importState;
  const result = useMemo(() => buildContacts(table.rows, mapping), [table.rows, mapping]);

  return (
    <Card title={`Imported from ${sourceLabel}`} description={`${table.headers.length} columns found.`}>
      <div className="flex flex-col gap-5">
        <ColumnMapping headers={table.headers} mapping={mapping} onChange={(next) => onImportChange({ ...importState, mapping: next })} />
        <ImportSummary counts={result.counts} />
        {result.counts.emptyNames > 0 && (
          <Alert tone="warning" title="Empty names">
            {result.counts.emptyNames === 1
              ? '1 contact has an empty name and will receive the fallback "there" for {{1}}.'
              : `${result.counts.emptyNames} contacts have an empty name and will receive the fallback "there" for {{1}}.`}
          </Alert>
        )}
        {result.counts.valid === 0 ? (
          <Alert tone="warning" title="No valid numbers">Check that the phone column is correct.</Alert>
        ) : (
          <ContactsPreview contacts={result.valid} limit={CONTACT_IMPORT_LIMITS.previewRows} />
        )}
        <ContactIssues invalid={result.invalid} duplicates={result.duplicates} />
        <div>
          <Button variant="secondary" onClick={() => onImportChange(null)}>Clear import</Button>
        </div>
      </div>
    </Card>
  );
}

export function ContactsPage({ importState, onImportChange }) {
  const handleLoaded = useCallback(
    ({ sourceLabel, table }) => onImportChange({ sourceLabel, table, mapping: guessColumns(table.headers) }),
    [onImportChange],
  );

  return (
    <div className="flex flex-col gap-6">
      <Card
        title="Import contacts"
        description="Indian mobile numbers only (+91 automatically formatted). Invalid numbers and duplicates are removed automatically."
      >
        <div className="grid gap-6 md:grid-cols-2">
          {/* Method 1: Google Sheet */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-slate-50/50 p-5 shadow-2xs">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </span>
                Option A: Google Sheets
              </span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                Cloud Sync
              </span>
            </div>
            <SheetLinkForm onLoaded={handleLoaded} />
          </div>

          {/* Method 2: CSV or Excel File */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-slate-50/50 p-5 shadow-2xs">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </span>
                Option B: Upload File (.csv or .xlsx)
              </span>
              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 border border-sky-200">
                Excel & CSV
              </span>
            </div>
            <FileUploadForm onLoaded={handleLoaded} />
          </div>
        </div>
      </Card>
      {importState && <ImportResult importState={importState} onImportChange={onImportChange} />}
    </div>
  );
}

