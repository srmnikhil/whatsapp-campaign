import { useState } from 'react';
import { ErrorAlert } from '../../components/ErrorAlert.jsx';
import { TemplatePreview } from '../../components/TemplatePreview.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { TEMPLATE_DEFAULTS } from '../../config/defaults.js';
import { IMAGE_UPLOAD_REQUIRED_KEYS } from '../../constants/settingsFields.js';
import { HEADER_FORMATS } from '../../constants/templates.js';
import { useCreateTemplate } from '../../hooks/useCreateTemplate.js';
import { useObjectUrl } from '../../hooks/useObjectUrl.js';
import { getFieldLabel, getMissingKeys } from '../../lib/settings.js';
import { EMPTY_DRAFT, validateTemplateDraft } from '../../lib/templateDraft.js';
import { CreateTemplateResult } from './CreateTemplateResult.jsx';
import { TemplateDraftFields } from './TemplateDraftFields.jsx';

function ImageUploadUnavailable({ missingKeys }) {
  return (
    <Alert tone="warning" title="Image upload needs the backend">
      Missing in Settings: {missingKeys.map(getFieldLabel).join(', ')}. Until the backend is running, choose &ldquo;No
      header&rdquo;, or create image templates in WhatsApp Manager; they appear in the list above.
    </Alert>
  );
}

export function CreateTemplateForm({ settings, onCreated }) {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [errors, setErrors] = useState({});
  const { data, error, isLoading, run } = useCreateTemplate(settings, onCreated);
  const [imageUrl, setPreviewFile] = useObjectUrl();
  const missingUploadKeys = draft.headerFormat === HEADER_FORMATS.IMAGE ? getMissingKeys(settings, IMAGE_UPLOAD_REQUIRED_KEYS) : [];

  const handleChange = (changes) => {
    if ('imageFile' in changes) setPreviewFile(changes.imageFile);
    setDraft((current) => ({ ...current, ...changes }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const validationErrors = validateTemplateDraft(draft);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) run(draft);
  };

  const previewButtons = draft.includeStopButton ? [{ text: TEMPLATE_DEFAULTS.stopButtonText }] : [];

  return (
    <Card title="Create a marketing template" description="Submitted to Meta for review as MARKETING. Approval usually takes minutes, up to 24 hours.">
      <form onSubmit={handleSubmit} noValidate className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_410px] items-start">
        <div className="flex flex-col gap-4">
          <TemplateDraftFields draft={draft} errors={errors} onChange={handleChange} />
          {missingUploadKeys.length > 0 && <ImageUploadUnavailable missingKeys={missingUploadKeys} />}
          <div>
            <Button type="submit" disabled={isLoading || missingUploadKeys.length > 0}>
              {isLoading ? 'Submitting…' : 'Submit for review'}
            </Button>
          </div>
          {error && <ErrorAlert error={error} title="Template not submitted" />}
          {data && <CreateTemplateResult result={data} />}
        </div>
        <div className="flex flex-col gap-2 items-center lg:sticky lg:top-6 w-full">
          <p className="text-sm font-semibold text-slate-700 w-full text-center">Live WhatsApp Mobile Screen</p>
          <TemplatePreview
            header={{ format: draft.headerFormat }}
            imageUrl={imageUrl}
            bodyText={draft.bodyText}
            footerText={draft.footerText}
            buttons={previewButtons}
            name={draft.sampleName}
          />
        </div>
      </form>
    </Card>
  );
}
