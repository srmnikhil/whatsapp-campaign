import { TemplatePreview } from '../../components/TemplatePreview.jsx';
import { NAME_VARIABLE } from '../../constants/templates.js';
import { resolveName } from '../../lib/payloadBuilder.js';
import { findVariables } from '../../lib/templates.js';

/**
 * The WhatsApp message that was sent for this campaign.
 * {{1}} is filled with the first recipient's name when the template uses it.
 */
export function CampaignMessage({ template, recipientName, isLoading, loadError, missingAccount }) {
  return (
    <aside className="flex flex-col gap-2 lg:sticky lg:top-6" aria-label="Message sent">
      <p className="text-sm font-medium text-text-primary">Message sent</p>
      {isLoading && (
        <p className="text-sm text-text-secondary animate-pulse">Loading the template…</p>
      )}
      {!isLoading && missingAccount && (
        <p className="text-sm text-text-secondary">
          Add the WhatsApp Business Account ID in Settings to show this message.
        </p>
      )}
      {!isLoading && !missingAccount && !template && (
        <p className="text-sm text-text-secondary">
          {loadError
            ? 'The template could not be loaded from Meta.'
            : 'This template is not on the current WhatsApp account.'}
        </p>
      )}
      {!isLoading && template && (
        <SentTemplate template={template} recipientName={recipientName} />
      )}
    </aside>
  );
}

function SentTemplate({ template, recipientName }) {
  const usesName = findVariables(template.bodyText).includes('1');
  const sampleName = usesName ? resolveName(recipientName) : undefined;

  return (
    <>
      <TemplatePreview
        header={template.header}
        imageUrl={template.header.exampleUrl}
        bodyText={template.bodyText}
        footerText={template.footerText}
        buttons={template.buttons}
        name={sampleName}
      />
      {usesName && (
        <p className="text-xs text-text-secondary">
          {NAME_VARIABLE} is each contact&apos;s name. This preview uses {sampleName}.
        </p>
      )}
    </>
  );
}
