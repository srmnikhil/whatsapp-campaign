import { Button } from '../../components/ui/Button.jsx';
import { Checkbox } from '../../components/ui/Checkbox.jsx';
import { Field } from '../../components/ui/Field.jsx';
import { RadioGroup } from '../../components/ui/RadioGroup.jsx';
import { SelectInput } from '../../components/ui/SelectInput.jsx';
import { TextArea } from '../../components/ui/TextArea.jsx';
import { TextInput } from '../../components/ui/TextInput.jsx';
import { TEMPLATE_DEFAULTS } from '../../config/defaults.js';
import { BUTTON_TYPES, HEADER_FORMATS, NAME_VARIABLE, TEMPLATE_CATEGORY } from '../../constants/templates.js';
import { DRAFT_LIMITS } from '../../lib/templateDraft.js';
import { Icon } from '../../components/Icon.jsx';

const CATEGORY_OPTIONS = [
  { value: TEMPLATE_CATEGORY.MARKETING, label: 'Marketing (Offers, updates, broadcasts)' },
  { value: TEMPLATE_CATEGORY.UTILITY, label: 'Utility (Order alerts, reminders, receipts)' },
];

const HEADER_OPTIONS = [
  { value: HEADER_FORMATS.IMAGE, label: 'Image' },
  { value: HEADER_FORMATS.TEXT, label: 'Text' },
  { value: HEADER_FORMATS.NONE, label: 'No header' },
];

const BUTTON_TYPE_OPTIONS = [
  { value: 'QUICK_REPLY', label: 'Quick Reply' },
  { value: 'CTA', label: 'Call To Action (CTA)' },
  { value: 'NONE', label: 'None' },
];

const CTA_TYPE_OPTIONS = [
  { value: BUTTON_TYPES.URL, label: 'Visit Website (URL)' },
  { value: BUTTON_TYPES.PHONE_NUMBER, label: 'Call Phone Number' },
  { value: BUTTON_TYPES.COPY_CODE, label: 'Copy Offer Code' },
];

const IMAGE_ACCEPT = 'image/jpeg,image/png';
const FILE_INPUT_CLASSES =
  'block w-full cursor-pointer text-sm text-text-secondary file:mr-3 file:cursor-pointer file:rounded-md file:border ' +
  'file:border-line file:bg-card file:px-3 file:py-2 file:text-sm file:font-medium file:text-navy hover:file:bg-muted';

export function TemplateDraftFields({ draft, errors, onChange }) {
  const setField = (key) => (event) => onChange({ [key]: event.target.value });
  const insertName = () => onChange({ bodyText: `${draft.bodyText || ''}${NAME_VARIABLE}` });

  // CTA button helpers
  const handleAddCtaButton = () => {
    const current = draft.ctaButtons || [];
    if (current.length >= 2) return;
    onChange({
      ctaButtons: [...current, { type: BUTTON_TYPES.URL, text: 'Visit Website', url: 'https://' }],
    });
  };

  const handleUpdateCtaButton = (index, patch) => {
    const next = [...(draft.ctaButtons || [])];
    next[index] = { ...next[index], ...patch };
    onChange({ ctaButtons: next });
  };

  const handleRemoveCtaButton = (index) => {
    const next = (draft.ctaButtons || []).filter((_, i) => i !== index);
    onChange({ ctaButtons: next });
  };

  // Quick reply helpers
  const handleAddQuickReply = () => {
    const current = draft.quickReplies || [];
    if (current.length >= 3) return;
    onChange({
      quickReplies: [...current, { text: `Option ${current.length + 1}` }],
    });
  };

  const handleUpdateQuickReply = (index, text) => {
    const next = [...(draft.quickReplies || [])];
    next[index] = { ...next[index], text };
    onChange({ quickReplies: next });
  };

  const handleRemoveQuickReply = (index) => {
    const next = (draft.quickReplies || []).filter((_, i) => i !== index);
    onChange({ quickReplies: next });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Basic Settings */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="draft-name"
          label="Template name"
          required
          help="Lowercase, digits and underscores, e.g. workshop_offer_v2."
          error={errors.name}
        >
          {(inputProps) => <TextInput {...inputProps} value={draft.name || ''} onChange={setField('name')} />}
        </Field>

        <Field id="draft-category" label="Category" required help="Select whether this is promotional or transactional.">
          {(inputProps) => (
            <SelectInput
              {...inputProps}
              options={CATEGORY_OPTIONS}
              value={draft.category || TEMPLATE_CATEGORY.MARKETING}
              onChange={setField('category')}
            />
          )}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="draft-language" label="Language" required>
          {(inputProps) => (
            <SelectInput
              {...inputProps}
              options={TEMPLATE_DEFAULTS.languages}
              value={draft.language || TEMPLATE_DEFAULTS.languages[0].value}
              onChange={setField('language')}
            />
          )}
        </Field>
      </div>

      {/* Header Section */}
      <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 flex flex-col gap-3">
        <RadioGroup
          name="draft-header"
          legend="Header format"
          options={HEADER_OPTIONS}
          value={draft.headerFormat || HEADER_FORMATS.NONE}
          onChange={(headerFormat) => onChange({ headerFormat })}
        />

        {draft.headerFormat === HEADER_FORMATS.TEXT && (
          <Field
            id="draft-header-text"
            label="Header text"
            required
            help={`Title shown at the top of the message. Max ${DRAFT_LIMITS.headerTextMax} chars. No variables.`}
            error={errors.headerText}
          >
            {(inputProps) => (
              <TextInput
                {...inputProps}
                maxLength={DRAFT_LIMITS.headerTextMax}
                value={draft.headerText || ''}
                onChange={setField('headerText')}
                placeholder="e.g. Exclusive Workshop Deal"
              />
            )}
          </Field>
        )}

        {draft.headerFormat === HEADER_FORMATS.IMAGE && (
          <Field
            id="draft-image"
            label="Sample header image"
            required
            help="Uploaded for Meta's review. JPEG or PNG, up to 5 MB."
            error={errors.imageFile}
          >
            {(inputProps) => (
              <input
                {...inputProps}
                type="file"
                accept={IMAGE_ACCEPT}
                className={FILE_INPUT_CLASSES}
                onChange={(event) => onChange({ imageFile: event.target.files?.[0] ?? null })}
              />
            )}
          </Field>
        )}
      </div>

      {/* Body Message */}
      <Field
        id="draft-body"
        label="Message text"
        required
        help={`${NAME_VARIABLE} becomes the contact's name. ${(draft.bodyText || '').length}/${DRAFT_LIMITS.bodyMax}`}
        error={errors.bodyText}
      >
        {(inputProps) => (
          <TextArea
            {...inputProps}
            maxLength={DRAFT_LIMITS.bodyMax}
            value={draft.bodyText || ''}
            onChange={setField('bodyText')}
            rows={4}
            placeholder="Type your WhatsApp message here..."
          />
        )}
      </Field>

      <div className="flex items-center gap-3">
        <Button variant="secondary" onClick={insertName}>
          Insert {NAME_VARIABLE} (name)
        </Button>
      </div>

      <Field
        id="draft-sample"
        label="Sample name for review"
        help={`Meta reviewers see this in place of ${NAME_VARIABLE}.`}
        error={errors.sampleName}
      >
        {(inputProps) => (
          <TextInput
            {...inputProps}
            maxLength={DRAFT_LIMITS.sampleMax}
            value={draft.sampleName || ''}
            onChange={setField('sampleName')}
            placeholder="e.g. Rahul"
          />
        )}
      </Field>

      {/* Footer */}
      <Field
        id="draft-footer"
        label="Footer (optional)"
        help={`Light-grey note at the bottom. Up to ${DRAFT_LIMITS.footerMax} characters.`}
        error={errors.footerText}
      >
        {(inputProps) => (
          <TextInput
            {...inputProps}
            maxLength={DRAFT_LIMITS.footerMax}
            value={draft.footerText || ''}
            onChange={setField('footerText')}
            placeholder="e.g. Garaaz Spares • Reply STOP to unsubscribe"
          />
        )}
      </Field>

      {/* Buttons Section (CTA & Quick Replies) */}
      <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 flex flex-col gap-4">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Buttons & Actions (CTA)</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Choose whether to add interactive Call To Action buttons (Website, Phone, Coupon) or Quick Replies.
          </p>
        </div>

        <RadioGroup
          name="draft-button-type"
          legend="Button type"
          options={BUTTON_TYPE_OPTIONS}
          value={draft.buttonType || 'QUICK_REPLY'}
          onChange={(buttonType) => onChange({ buttonType })}
        />

        {/* CTA Buttons Options */}
        {draft.buttonType === 'CTA' && (
          <div className="flex flex-col gap-3">
            {(draft.ctaButtons || []).map((btn, idx) => (
              <div key={idx} className="rounded-lg border border-slate-200 bg-white p-3 flex flex-col gap-3 shadow-2xs">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800">CTA Button #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCtaButton(idx)}
                    className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-medium cursor-pointer"
                  >
                    <Icon name="close" className="h-3 w-3 shrink-0" /> Remove
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Action Type</label>
                    <SelectInput
                      options={CTA_TYPE_OPTIONS}
                      value={btn.type}
                      onChange={(e) => handleUpdateCtaButton(idx, { type: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Button Label (max 25 chars)</label>
                    <TextInput
                      maxLength={DRAFT_LIMITS.buttonTextMax}
                      value={btn.text || ''}
                      onChange={(e) => handleUpdateCtaButton(idx, { text: e.target.value })}
                      placeholder={btn.type === BUTTON_TYPES.URL ? 'Visit Website' : btn.type === BUTTON_TYPES.PHONE_NUMBER ? 'Call Support' : 'Copy Code'}
                    />
                  </div>
                </div>

                {btn.type === BUTTON_TYPES.URL && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Website URL</label>
                    <TextInput
                      value={btn.url || ''}
                      onChange={(e) => handleUpdateCtaButton(idx, { url: e.target.value })}
                      placeholder="https://www.garaaz.com/offers"
                    />
                  </div>
                )}

                {btn.type === BUTTON_TYPES.PHONE_NUMBER && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Phone Number (with country code)</label>
                    <TextInput
                      value={btn.phoneNumber || ''}
                      onChange={(e) => handleUpdateCtaButton(idx, { phoneNumber: e.target.value })}
                      placeholder="+919257039785"
                    />
                  </div>
                )}

                {btn.type === BUTTON_TYPES.COPY_CODE && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Offer / Coupon Code (max 15 chars)</label>
                    <TextInput
                      maxLength={DRAFT_LIMITS.codeMax}
                      value={btn.example || btn.code || ''}
                      onChange={(e) => handleUpdateCtaButton(idx, { example: e.target.value, code: e.target.value })}
                      placeholder="e.g. GARAAZ20"
                    />
                  </div>
                )}
              </div>
            ))}

            {errors.buttons && <p className="text-xs text-rose-600">{errors.buttons}</p>}

            {(draft.ctaButtons || []).length < 2 && (
              <div>
                <Button variant="secondary" onClick={handleAddCtaButton}>
                  + Add CTA Button ({2 - (draft.ctaButtons || []).length} remaining)
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Quick Reply Options */}
        {draft.buttonType === 'QUICK_REPLY' && (
          <div className="flex flex-col gap-3">
            <Checkbox
              id="draft-stop-button"
              label={`Add a "${TEMPLATE_DEFAULTS.stopButtonText}" button`}
              help="Recommended by WhatsApp for marketing broadcasts to maintain high quality rating."
              checked={Boolean(draft.includeStopButton)}
              onChange={(event) => onChange({ includeStopButton: event.target.checked })}
            />

            {(draft.quickReplies || []).map((reply, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-1">
                  <TextInput
                    maxLength={DRAFT_LIMITS.buttonTextMax}
                    value={reply.text || ''}
                    onChange={(e) => handleUpdateQuickReply(idx, e.target.value)}
                    placeholder={`Quick reply #${idx + 1}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveQuickReply(idx)}
                  className="px-2 py-1 text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                >
                  <Icon name="close" className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {errors.buttons && <p className="text-xs text-rose-600">{errors.buttons}</p>}

            {(draft.quickReplies || []).length < 3 && (
              <div>
                <Button variant="secondary" onClick={handleAddQuickReply}>
                  + Add Custom Quick Reply ({3 - (draft.quickReplies || []).length} remaining)
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
