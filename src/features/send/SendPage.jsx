import { useCallback, useMemo, useState } from 'react';
import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { SEND_REQUIRED_KEYS } from '../../constants/settingsFields.js';
import { SENDER_PHASE } from '../../hooks/useCampaignSender.js';
import { buildContacts } from '../../lib/contacts.js';
import { getMissingKeys } from '../../lib/settings.js';
import { MissingSettingsAlert } from '../settings/MissingSettingsAlert.jsx';
import { ImageUploadStep } from './ImageUploadStep.jsx';
import { ConfirmStep, PreviewStep } from './PreviewConfirm.jsx';
import { SendProgress } from './SendProgress.jsx';
import { TemplateSelector } from './TemplateSelector.jsx';

const STEP = Object.freeze({
  SELECT_TEMPLATE: 'select_template',
  UPLOAD_IMAGE: 'upload_image',
  PREVIEW: 'preview',
  CONFIRM: 'confirm',
  SENDING: 'sending',
});

/**
 * Orchestrates the full send flow:
 *   contacts → pick template → upload image → preview → confirm → send
 *
 * @param {{
 *   settings: object,
 *   contactsImport: object | null,
 *   templatesState: object,
 *   graphClient: object,
 *   backendClient: object,
 *   connectionInfo: object | null,
 *   sender: object,
 *   startSend: Function,
 *   stopSend: Function,
 *   onViewResults: (campaignId: string) => void,
 * }} props
 */
export function SendPage({
  settings,
  contactsImport,
  templatesState,
  graphClient,
  backendClient,
  connectionInfo,
  sender,
  startSend,
  stopSend,
  onViewResults,
  onNavigateToSettings,
  onNavigateToContacts,
}) {
  const missingKeys = getMissingKeys(settings, SEND_REQUIRED_KEYS);
  const [step, setStep] = useState(STEP.SELECT_TEMPLATE);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [mediaId, setMediaId] = useState(null);

  // Derive valid contacts from the import state (memoised)
  const validContacts = useMemo(() => {
    if (!contactsImport) return [];
    return buildContacts(contactsImport.table.rows, contactsImport.mapping).valid;
  }, [contactsImport]);

  // If there's an active send, always show progress
  const isActive = sender.phase !== SENDER_PHASE.IDLE;

  const handleTemplateSelect = useCallback((template) => {
    setSelectedTemplate(template);
    setStep(STEP.UPLOAD_IMAGE);
  }, []);

  const handleImageDone = useCallback((id) => {
    setMediaId(id);
    setStep(STEP.PREVIEW);
  }, []);

  const handlePreviewConfirm = useCallback(() => {
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

  const handleBack = useCallback(() => {
    setStep(STEP.PREVIEW);
  }, []);

  if (missingKeys.length > 0) return <MissingSettingsAlert missingKeys={missingKeys} onNavigateToSettings={onNavigateToSettings} />;

  if (!contactsImport || validContacts.length === 0) {
    return (
      <div className="mx-auto max-w-xl py-8">
        <Card>
          <div className="flex flex-col items-center text-center p-6">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 border border-sky-200 shadow-xs">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800">No Contacts Loaded</h3>
            <p className="mt-1.5 text-sm text-slate-600 max-w-md">
              Please import a contact list with phone numbers (Google Sheet, CSV, or Excel) before starting a campaign send.
            </p>
            {onNavigateToContacts && (
              <div className="mt-6">
                <Button onClick={onNavigateToContacts}>
                  Import Contacts →
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  if (isActive) {
    return (
      <SendProgress
        sender={sender}
        onStop={stopSend}
        onViewResults={onViewResults}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Contacts summary */}
      <Card title="Contacts">
        <p className="text-sm text-text-secondary">
          <strong className="text-text-primary">{validContacts.length.toLocaleString()}</strong> valid contacts loaded from{' '}
          <em>{contactsImport.sourceLabel}</em>. Go to the <strong>Contacts</strong> tab to change the list.
        </p>
      </Card>

      {step === STEP.SELECT_TEMPLATE && (
        <TemplateSelector templatesState={templatesState} onSelect={handleTemplateSelect} />
      )}

      {step === STEP.UPLOAD_IMAGE && selectedTemplate && (
        <ImageUploadStep
          template={selectedTemplate}
          graphClient={graphClient}
          settings={settings}
          onDone={handleImageDone}
        />
      )}

      {step === STEP.PREVIEW && selectedTemplate && (
        <PreviewStep
          template={selectedTemplate}
          contacts={validContacts}
          onConfirm={handlePreviewConfirm}
        />
      )}

      {step === STEP.CONFIRM && selectedTemplate && (
        <ConfirmStep
          template={selectedTemplate}
          contacts={validContacts}
          backendClient={backendClient}
          connectionInfo={connectionInfo}
          onStart={handleStart}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
