import { useCallback, useMemo, useState } from 'react';
import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { CONTACT_IMPORT_LIMITS, MAX_UNIQUE_USERS_LIMIT } from '../../config/defaults.js';
import { SEND_REQUIRED_KEYS } from '../../constants/settingsFields.js';
import { HEADER_FORMATS } from '../../constants/templates.js';
import { SENDER_PHASE } from '../../hooks/useCampaignSender.js';
import { buildContacts, guessColumns } from '../../lib/contacts.js';
import { getMissingKeys } from '../../lib/settings.js';
import { ColumnMapping } from '../contacts/ColumnMapping.jsx';
import { ContactIssues } from '../contacts/ContactIssues.jsx';
import { ContactsPreview } from '../contacts/ContactsPreview.jsx';
import { FileUploadForm } from '../contacts/FileUploadForm.jsx';
import { ImportSummary } from '../contacts/ImportSummary.jsx';
import { SheetLinkForm } from '../contacts/SheetLinkForm.jsx';
import { MissingSettingsAlert } from '../settings/MissingSettingsAlert.jsx';
import { ImageUploadStep } from './ImageUploadStep.jsx';
import { ConfirmStep } from './PreviewConfirm.jsx';
import { SendProgress } from './SendProgress.jsx';
import { TemplateSelector } from './TemplateSelector.jsx';
import { Icon } from '../../components/Icon.jsx';

const STEP = Object.freeze({
  CONTACTS: 'contacts',
  SELECT_TEMPLATE: 'select_template',
  UPLOAD_IMAGE: 'upload_image',
  CONFIRM: 'confirm',
  SENDING: 'sending',
});

/**
 * Orchestrates the full unified campaign send workflow:
 *   1. Upload / Select Sheet (with 2,000 contact limit validation)
 *   2. Pick Template
 *   3. Upload Image (only if template has an image header; otherwise completely skipped)
 *   4. Review & Confirm (single phone preview with account name from credentials, no 3-person preview)
 *   5. Send Progress
 */
export function SendPage({
  settings,
  contactsImport,
  onImportChange,
  templatesState,
  graphClient,
  backendClient,
  connectionInfo,
  sender,
  startSend,
  stopSend,
  resetSender,
  onViewResults,
  onNavigateToSettings,
  onNavigateToContacts,
}) {
  const missingKeys = getMissingKeys(settings, SEND_REQUIRED_KEYS);

  // Derive contacts from import state
  const contactsData = useMemo(() => {
    if (!contactsImport) return null;
    return buildContacts(contactsImport.table.rows, contactsImport.mapping);
  }, [contactsImport]);

  const validContacts = contactsData?.valid ?? [];
  const validCount = validContacts.length;
  const exceedsLimit = validCount > MAX_UNIQUE_USERS_LIMIT;

  // Initial step: If contacts are already loaded, user can select template or view sheet
  const [step, setStep] = useState(() => (contactsImport && validCount > 0 ? STEP.SELECT_TEMPLATE : STEP.CONTACTS));
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [mediaId, setMediaId] = useState(null);

  // If there's an active send, always show progress
  const isActive = sender.phase !== SENDER_PHASE.IDLE;

  const handleSheetLoaded = useCallback(
    ({ sourceLabel, table }) => {
      onImportChange?.({
        sourceLabel,
        table,
        mapping: guessColumns(table.headers),
      });
      // Stay on contacts step to let user review mapping & counts
      setStep(STEP.CONTACTS);
    },
    [onImportChange],
  );

  const handleTemplateSelect = useCallback((template) => {
    setSelectedTemplate(template);
    // If template has an image header, go to image upload; otherwise skip straight to confirm!
    if (template.header?.format === HEADER_FORMATS.IMAGE) {
      setStep(STEP.UPLOAD_IMAGE);
    } else {
      setMediaId(null);
      setStep(STEP.CONFIRM);
    }
  }, []);

  const handleImageDone = useCallback((id) => {
    setMediaId(id);
    setStep(STEP.CONFIRM);
  }, []);

  const handleStart = useCallback(
    (eligibleContacts) => {
      setStep(STEP.SENDING);
      startSend({
        campaignName: `Campaign – ${selectedTemplate.name} – ${new Date().toLocaleDateString('en-IN')}`,
        template: selectedTemplate,
        contacts: eligibleContacts,
        mediaId,
      });
    },
    [startSend, selectedTemplate, mediaId],
  );

  // Send again to everyone who failed or was never sent, using the same template.
  const handleRetryFailed = useCallback(() => {
    const retryRows = sender.rows.filter((r) => r.state === 'failed' || r.state === 'not_sent');
    if (retryRows.length === 0 || !sender.template) return;
    startSend({
      campaignName: `Retry – ${sender.template.name} – ${new Date().toLocaleDateString('en-IN')}`,
      template: sender.template,
      contacts: retryRows.map(({ phone, name }) => ({ phone, name })),
      mediaId: sender.mediaId,
    });
  }, [sender.rows, sender.template, sender.mediaId, startSend]);

  // Leave the finished campaign and pick a template again.
  const handleNewCampaign = useCallback(() => {
    resetSender();
    setSelectedTemplate(null);
    setMediaId(null);
    setStep(validCount > 0 ? STEP.SELECT_TEMPLATE : STEP.CONTACTS);
  }, [resetSender, validCount]);

  const handleBackFromConfirm = useCallback(() => {
    if (selectedTemplate?.header?.format === HEADER_FORMATS.IMAGE) {
      setStep(STEP.UPLOAD_IMAGE);
    } else {
      setStep(STEP.SELECT_TEMPLATE);
    }
  }, [selectedTemplate]);

  if (missingKeys.length > 0) {
    return <MissingSettingsAlert missingKeys={missingKeys} onNavigateToSettings={onNavigateToSettings} />;
  }

  if (isActive) {
    return (
      <SendProgress
        sender={sender}
        onStop={stopSend}
        onViewResults={onViewResults}
        onRetryFailed={handleRetryFailed}
        onNewCampaign={handleNewCampaign}
      />
    );
  }

  // Stepper items
  const hasImage = selectedTemplate?.header?.format === HEADER_FORMATS.IMAGE;
  const stepsList = [
    { id: STEP.CONTACTS, label: '1. Contact Sheet', count: validCount ? `${validCount.toLocaleString()}` : null },
    { id: STEP.SELECT_TEMPLATE, label: '2. Select Template', value: selectedTemplate?.name ?? null },
    ...(hasImage ? [{ id: STEP.UPLOAD_IMAGE, label: '3. Header Image' }] : []),
    { id: STEP.CONFIRM, label: hasImage ? '4. Review & Send' : '3. Review & Send' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Top Stepper Breadcrumb */}
      <nav aria-label="Campaign Progress Stepper" className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        <ol className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs">
          {stepsList.map((s, idx) => {
            const isCurrent = step === s.id;
            const canClick =
              (s.id === STEP.CONTACTS) ||
              (s.id === STEP.SELECT_TEMPLATE && validCount > 0 && !exceedsLimit) ||
              (s.id === STEP.UPLOAD_IMAGE && selectedTemplate && hasImage) ||
              (s.id === STEP.CONFIRM && selectedTemplate && validCount > 0);

            return (
              <li key={s.id} className="flex items-center gap-2 sm:gap-4">
                <button
                  type="button"
                  onClick={() => canClick && setStep(s.id)}
                  disabled={!canClick}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                    isCurrent
                      ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                      : canClick
                      ? 'text-slate-700 hover:bg-slate-100 cursor-pointer'
                      : 'text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span>{s.label}</span>
                  {s.count && (
                    <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                      isCurrent ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {s.count}
                    </span>
                  )}
                </button>
                {idx < stepsList.length - 1 && (
                  <svg className="h-4 w-4 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step 1: Upload / Connect Contact Sheet */}
      {step === STEP.CONTACTS && (
        <div className="flex flex-col gap-6">
          {!contactsImport ? (
            <Card
              title="Step 1: Upload or Connect Contact Sheet"
              description="Upload a CSV/Excel file or link a public Google Sheet with customer phone numbers. Indian numbers (+91) are auto-formatted."
            >
              <div className="grid gap-6 md:grid-cols-2">
                <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </span>
                      Option A: Google Sheets Link
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                      Cloud Sync
                    </span>
                  </div>
                  <SheetLinkForm onLoaded={handleSheetLoaded} />
                </div>

                <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
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
                  <FileUploadForm onLoaded={handleSheetLoaded} />
                </div>
              </div>
            </Card>
          ) : (
            <Card
              title={`Sheet: ${contactsImport.sourceLabel}`}
              description={`${contactsImport.table.headers.length} columns detected.`}
            >
              <div className="flex flex-col gap-5">
                <ColumnMapping
                  headers={contactsImport.table.headers}
                  mapping={contactsImport.mapping}
                  onChange={(next) => onImportChange?.({ ...contactsImport, mapping: next })}
                />
                <ImportSummary counts={contactsData.counts} />

                {/* 2000 Unique Users Limit Warning */}
                {exceedsLimit && (
                  <Alert tone="error" title="Contact limit exceeded (2,000 max)">
                    This contact list contains <strong>{validCount.toLocaleString()}</strong> unique contacts,
                    which exceeds the limit of <strong>{MAX_UNIQUE_USERS_LIMIT.toLocaleString()}</strong> unique users
                    allowed for WhatsApp broadcasts. You must upload a sheet with 2,000 or fewer contacts before sending.
                  </Alert>
                )}

                {validCount === 0 ? (
                  <Alert tone="warning" title="No valid numbers">
                    Check that the phone number column is mapped correctly.
                  </Alert>
                ) : (
                  <ContactsPreview contacts={contactsData.valid} limit={CONTACT_IMPORT_LIMITS.previewRows} />
                )}

                <ContactIssues invalid={contactsData.invalid} duplicates={contactsData.duplicates} />

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <Button variant="secondary" onClick={() => onImportChange?.(null)}>
                    Replace sheet / Upload different file
                  </Button>
                  <Button
                    onClick={() => setStep(STEP.SELECT_TEMPLATE)}
                    disabled={validCount === 0 || exceedsLimit}
                  >
                    {exceedsLimit
                      ? `Cannot proceed: Exceeds ${MAX_UNIQUE_USERS_LIMIT.toLocaleString()} limit`
                      : <>Next: Select Template <Icon name="arrowRight" /></>}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Step 2: Select Template */}
      {step === STEP.SELECT_TEMPLATE && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Button variant="secondary" onClick={() => setStep(STEP.CONTACTS)}>
              <Icon name="arrowLeft" /> Back to Sheet ({validCount.toLocaleString()} contacts)
            </Button>
          </div>
          <TemplateSelector
            templatesState={templatesState}
            onSelect={handleTemplateSelect}
            businessName={connectionInfo?.verifiedName || connectionInfo?.displayName || 'Garaaz Notification'}
          />
        </div>
      )}

      {/* Step 3: Upload Image (Only if template has IMAGE header) */}
      {step === STEP.UPLOAD_IMAGE && selectedTemplate && hasImage && (
        <ImageUploadStep
          template={selectedTemplate}
          graphClient={graphClient}
          settings={settings}
          onDone={handleImageDone}
          onBack={() => setStep(STEP.SELECT_TEMPLATE)}
        />
      )}

      {/* Step 4: Review & Confirm */}
      {step === STEP.CONFIRM && selectedTemplate && (
        <ConfirmStep
          template={selectedTemplate}
          contacts={validContacts}
          mediaId={mediaId}
          backendClient={backendClient}
          graphClient={graphClient}
          connectionInfo={connectionInfo}
          settings={settings}
          onStart={handleStart}
          onBack={handleBackFromConfirm}
        />
      )}
    </div>
  );
}
