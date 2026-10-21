import { Icon } from '../../components/Icon.jsx';
import { TemplatePreview } from '../../components/TemplatePreview.jsx';
import { useMemo, useState } from 'react';
import { ErrorAlert } from '../../components/ErrorAlert.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { TEMPLATE_TYPES } from '../../constants/templateTypes.js';
import { Alert } from '../../components/ui/Alert.jsx';
import { TEMPLATE_DEFAULTS } from '../../config/defaults.js';
import { IMAGE_UPLOAD_REQUIRED_KEYS } from '../../constants/settingsFields.js';
import { BUTTON_TYPES, HEADER_FORMATS, NAME_VARIABLE, TEMPLATE_CATEGORY, TEMPLATE_STATUS } from '../../constants/templates.js';
import { useCreateTemplate } from '../../hooks/useCreateTemplate.js';
import { useObjectUrl } from '../../hooks/useObjectUrl.js';
import { getFieldLabel, getMissingKeys } from '../../lib/settings.js';
import { DRAFT_LIMITS, EMPTY_DRAFT, validateTemplateDraft } from '../../lib/templateDraft.js';
import { findVariables, getTemplateBaseName, getTemplateVersion } from '../../lib/templates.js';
import { CreateTemplateResult } from './CreateTemplateResult.jsx';

function ImageUploadUnavailable({ missingKeys }) {
  return (
    <Alert tone="warning" title="Image upload needs the backend">
      Missing in Settings: {missingKeys.map(getFieldLabel).join(', ')}. Until the backend is running, choose &ldquo;No
      header&rdquo;, or create image templates in WhatsApp Manager; they appear in the list above.
    </Alert>
  );
}

const CATEGORIES = [
  {
    id: TEMPLATE_CATEGORY.MARKETING,
    title: 'Marketing',
    desc: 'One-to-many bulk broadcast marketing messages',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
  },
  {
    id: TEMPLATE_CATEGORY.UTILITY,
    title: 'Utility',
    desc: 'Transactional messages that are sent on some user action',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    id: TEMPLATE_CATEGORY.AUTHENTICATION,
    title: 'Authentication',
    desc: 'One time password messages for authentication',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
  },
];

export function CreateTemplateForm({
  settings,
  template: existingTemplate = null,
  isCopy = false,
  versions = [],
  onSelectVersion,
  onCreated,
  onBack,
  onDelete,
}) {
  const isEditing = Boolean(existingTemplate) && !isCopy;

  // Initialize draft from existing template if editing
  const [draft, setDraft] = useState(() => {
    if (!existingTemplate) return { ...EMPTY_DRAFT };
    const comps = existingTemplate.components || [];
    const header = comps.find((c) => c.type === 'HEADER');
    const body = comps.find((c) => c.type === 'BODY')?.text || existingTemplate.bodyText || '';
    const footer = comps.find((c) => c.type === 'FOOTER')?.text || existingTemplate.footerText || '';
    const buttonsComp = comps.find((c) => c.type === 'BUTTONS');
    const rawButtons = buttonsComp?.buttons || existingTemplate.buttons || [];

    const ctaBtns = rawButtons
      .filter((b) => [BUTTON_TYPES.URL, BUTTON_TYPES.PHONE_NUMBER, BUTTON_TYPES.COPY_CODE].includes(b.type))
      .map((b) => ({
        type: b.type,
        text: b.text || '',
        url: b.url || '',
        phoneNumber: b.phone_number || '',
        example: b.example || '',
      }));

    const quickBtns = rawButtons
      .filter((b) => b.type === BUTTON_TYPES.QUICK_REPLY)
      .map((b) => ({ text: b.text || '' }));

    let btnType = 'NONE';
    if (ctaBtns.length > 0) btnType = 'CTA';
    else if (quickBtns.length > 0) btnType = 'QUICK_REPLY';

    return {
      name: isCopy ? '' : existingTemplate.name || '',
      category: existingTemplate.category || TEMPLATE_CATEGORY.MARKETING,
      language: existingTemplate.language || TEMPLATE_DEFAULTS.languages[0].value,
      headerFormat: header?.format || existingTemplate.header?.format || HEADER_FORMATS.NONE,
      headerText: header?.text || existingTemplate.header?.text || '',
      imageFile: null,
      bodyText: body,
      sampleName: TEMPLATE_DEFAULTS.sampleName,
      footerText: footer,
      buttonType: btnType,
      ctaButtons: ctaBtns,
      quickReplies: quickBtns,
      includeStopButton: quickBtns.some((q) => q.text?.toLowerCase().includes('stop')),
    };
  });

  const [errors, setErrors] = useState({});
  const [showAddButtonMenu, setShowAddButtonMenu] = useState(false);
  const [showTypeHelp, setShowTypeHelp] = useState(false);
  const { data, error, isLoading, run } = useCreateTemplate(settings, onCreated);
  const [imageUrl, setPreviewFile] = useObjectUrl();

  const missingUploadKeys = draft.headerFormat === HEADER_FORMATS.IMAGE ? getMissingKeys(settings, IMAGE_UPLOAD_REQUIRED_KEYS) : [];

  const handleChange = (patch) => {
    if ('imageFile' in patch) setPreviewFile(patch.imageFile);
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const handleInsertVariableToBody = () => {
    const current = draft.bodyText || '';
    const vars = findVariables(current);
    const nextVarIndex = vars.length + 1;
    setDraft((prev) => ({ ...prev, bodyText: `${current}{{${nextVarIndex}}}` }));
  };

  const handleInsertVariableToHeader = () => {
    const current = draft.headerText || '';
    if (!current.includes('{{1}}')) {
      setDraft((prev) => ({ ...prev, headerText: `${current}{{1}}` }));
    }
  };

  const handleAddCta = () => {
    setShowAddButtonMenu(false);
    const current = draft.ctaButtons || [];
    if (current.length >= 2) return;
    setDraft((prev) => ({
      ...prev,
      buttonType: 'CTA',
      ctaButtons: [...current, { type: BUTTON_TYPES.URL, text: 'Visit website', url: 'https://' }],
    }));
  };

  const handleAddQuickReply = () => {
    setShowAddButtonMenu(false);
    const current = draft.quickReplies || [];
    if (current.length >= 3) return;
    setDraft((prev) => ({
      ...prev,
      buttonType: 'QUICK_REPLY',
      quickReplies: [...current, { text: `Option ${current.length + 1}` }],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validateTemplateDraft(draft);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) {
      run(draft);
    }
  };

  // Keep an existing template's language selectable even if it isn't in the default list.
  const languageOptions = useMemo(() => {
    const known = TEMPLATE_DEFAULTS.languages;
    return draft.language && !known.some((l) => l.value === draft.language)
      ? [...known, { value: draft.language, label: draft.language }]
      : known;
  }, [draft.language]);

  // Detect variables in body to render sample text fields
  const bodyVariables = useMemo(() => findVariables(draft.bodyText || ''), [draft.bodyText]);
  const headerHasVariable = (draft.headerText || '').includes('{{1}}');

  // Preview replacement
  const previewBody = useMemo(() => {
    let text = draft.bodyText || "Hi {{1}}, We're happy to bring you a special offer on your next purchase. Enjoy up to 25% off for a limited time.";
    text = text.replace(/\{\{1\}\}/g, draft.sampleName || TEMPLATE_DEFAULTS.sampleName);
    text = text.replace(/\{\{2\}\}/g, '26th October');
    return text;
  }, [draft.bodyText, draft.sampleName]);

  const previewHeader = useMemo(() => {
    if (draft.headerFormat === HEADER_FORMATS.TEXT) {
      let hText = draft.headerText || 'Special offer just for you!';
      hText = hText.replace(/\{\{1\}\}/g, draft.sampleName || 'Nikhil');
      return hText;
    }
    return '';
  }, [draft.headerFormat, draft.headerText, draft.sampleName]);

  const previewButtons = useMemo(() => {
    if (draft.buttonType === 'CTA') {
      return (draft.ctaButtons || []).map((b) => ({
        type: b.type,
        text: b.text || (b.type === BUTTON_TYPES.COPY_CODE ? 'Copy Code' : 'Visit website'),
      }));
    }
    if (draft.buttonType === 'QUICK_REPLY') {
      const list = [];
      if (draft.includeStopButton) {
        list.push({ type: BUTTON_TYPES.QUICK_REPLY, text: TEMPLATE_DEFAULTS.stopButtonText });
      }
      (draft.quickReplies || []).forEach((q) => {
        if (q.text) list.push({ type: BUTTON_TYPES.QUICK_REPLY, text: q.text });
      });
      return list;
    }
    return [];
  }, [draft.buttonType, draft.ctaButtons, draft.quickReplies, draft.includeStopButton]);

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar: back link on the left, status and actions on the right */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-2xs transition hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
          >
            <Icon name="arrowLeft" /> Back to templates list
          </button>
        ) : (
          <span />
        )}

        <div className="flex flex-wrap items-center gap-3">
          {isEditing && (
            <>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border bg-[#EBFBF2] text-[#1E7E44] border-[#C6EFD6]">
                {existingTemplate?.status || TEMPLATE_STATUS.APPROVED}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (!onDelete || !existingTemplate) return;
                  if (window.confirm(`Are you sure you want to delete template "${existingTemplate.name}" from Meta WhatsApp?`)) {
                    onDelete(existingTemplate);
                  }
                }}
                className="text-xs font-semibold text-red-600 hover:text-red-800 cursor-pointer"
              >
                Delete
              </button>
            </>
          )}
          <button
            type="submit"
            form="template-form"
            disabled={isLoading || missingUploadKeys.length > 0}
            aria-label="Submit for review"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2aa9a0] hover:bg-[#238c84] text-white px-4 py-2 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Submitting…' : isEditing ? 'Re-submit for Approval' : 'Submit for review'}
          </button>
        </div>
      </div>

      {/* Main 2-Column WANotifier-Style Layout */}
      <form id="template-form" onSubmit={handleSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-6 items-start">
        {/* Left Column: Full Template Editor Form (lg:col-span-8) */}
        <div className="flex flex-col gap-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 font-sans">
              {isEditing ? 'Edit Message Template' : isCopy ? 'Duplicate Message Template' : 'Create Message Template'}
            </h1>
          </div>

          {/* TEMPLATE NAME (+ version picker when editing) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="draft-name" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Template name <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs font-mono text-slate-400">
                  {(draft.name || '').length} / {DRAFT_LIMITS.nameMax}
                </span>
              </div>
              <input
                id="draft-name"
                type="text"
                value={isEditing ? getTemplateBaseName(draft.name) : draft.name || ''}
                onChange={(e) => handleChange({ name: e.target.value })}
                placeholder={isCopy ? 'Enter a new template name' : 'dummy_template'}
                disabled={isEditing}
                autoFocus={isCopy}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-500">
                {isCopy
                  ? 'Give the copy a new name. Spaces and special characters are not allowed.'
                  : 'Spaces and special characters are not allowed.'}
              </p>
              {errors.name && <p className="text-xs text-rose-600 font-medium">{errors.name}</p>}
            </div>

            {isEditing && versions.length > 0 && (versions.length > 1 || getTemplateVersion(draft.name) > 0) && (
              <div className="flex flex-col gap-1.5 sm:w-44">
                <label htmlFor="draft-version" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Version
                </label>
                <select
                  id="draft-version"
                  value={existingTemplate.name}
                  onChange={(e) => onSelectVersion?.(versions.find((v) => v.name === e.target.value))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  {versions.map((v) => (
                    <option key={v.name} value={v.name}>
                      {`v${getTemplateVersion(v.name)}${v === versions[0] ? ' (latest)' : ''}`}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">Pick which version to view</p>
              </div>
            )}
          </div>

          {/* CATEGORY (3 Cards) */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              CATEGORY <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {CATEGORIES.map((cat) => {
                const isSelected = (draft.category || TEMPLATE_CATEGORY.MARKETING) === cat.id;
                return (
                  <div
                    key={cat.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleChange({ category: cat.id })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleChange({ category: cat.id });
                      }
                    }}
                    className={`flex flex-col gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#2aa9a0] bg-[#f0fdfa] shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-[#2aa9a0]' : 'border-slate-300'}`}>
                        {isSelected && <div className="h-2 w-2 rounded-full bg-[#2aa9a0]" />}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-800 font-bold text-sm">
                        <span className="text-slate-600">{cat.icon}</span>
                        <span>{cat.title}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal pl-6">{cat.desc}</p>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500">Select template category</p>
          </div>

          {/* LANGUAGE & TEMPLATE TYPE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="draft-language" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                LANGUAGE <span className="text-rose-500">*</span>
              </label>
              <select
                id="draft-language"
                value={draft.language || 'en'}
                onChange={(e) => handleChange({ language: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                {languageOptions.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">Select template language</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="draft-type" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  TEMPLATE TYPE
                </label>
                <button
                  type="button"
                  onClick={() => setShowTypeHelp(true)}
                  aria-label="What are template types?"
                  title="What are template types?"
                  className="text-slate-400 hover:text-teal-600 cursor-pointer"
                >
                  <Icon name="help" className="h-4 w-4" />
                </button>
              </div>
              <select
                id="draft-type"
                disabled
                value="CUSTOM"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 cursor-not-allowed opacity-80"
              >
                {TEMPLATE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">Only Custom is available for now</p>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* HEADER (OPTIONAL) */}
          <div className="flex flex-col gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Header <span className="text-slate-400 font-normal">(Optional)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Add a title that you want to show in message header.</p>
            </div>

            {/* Hidden native radio for test compatibility */}
            <div className="sr-only">
              <label>
                <input
                  type="radio"
                  name="compat-header"
                  checked={draft.headerFormat === HEADER_FORMATS.NONE}
                  onChange={() => handleChange({ headerFormat: HEADER_FORMATS.NONE })}
                />
                No header
              </label>
              <label>
                <input
                  type="radio"
                  name="compat-header"
                  checked={draft.headerFormat === HEADER_FORMATS.TEXT}
                  onChange={() => handleChange({ headerFormat: HEADER_FORMATS.TEXT })}
                />
                Text
              </label>
              <label>
                <input
                  type="radio"
                  name="compat-header"
                  checked={draft.headerFormat === HEADER_FORMATS.IMAGE}
                  onChange={() => handleChange({ headerFormat: HEADER_FORMATS.IMAGE })}
                />
                Image
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="header-type-select" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  HEADER TYPE
                </label>
                <select
                  id="header-type-select"
                  value={draft.headerFormat || HEADER_FORMATS.NONE}
                  onChange={(e) => handleChange({ headerFormat: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value={HEADER_FORMATS.NONE}>None</option>
                  <option value={HEADER_FORMATS.TEXT}>Text</option>
                  <option value={HEADER_FORMATS.IMAGE}>Media (Image)</option>
                </select>
                <p className="text-[11px] text-slate-500">Select the header type.</p>
              </div>

              {draft.headerFormat === HEADER_FORMATS.TEXT && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="header-text-input" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      HEADER TEXT
                    </label>
                    <span className="text-xs font-mono text-slate-400">
                      {(draft.headerText || '').length} / {DRAFT_LIMITS.headerTextMax}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      id="header-text-input"
                      type="text"
                      maxLength={DRAFT_LIMITS.headerTextMax}
                      value={draft.headerText || ''}
                      onChange={(e) => handleChange({ headerText: e.target.value })}
                      placeholder="Special offer just for you, {{1}}!"
                      className="w-full rounded-lg border border-slate-200 bg-white pl-3.5 pr-9 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                    <button
                      type="button"
                      title="Insert {{1}} variable"
                      onClick={handleInsertVariableToHeader}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 p-1 cursor-pointer"
                    >
                      <span className="text-base font-bold">⊕</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">Enter header text.</p>
                  {errors.headerText && <p className="text-xs text-rose-600">{errors.headerText}</p>}
                </div>
              )}

              {draft.headerFormat === HEADER_FORMATS.IMAGE && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="draft-image" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    SAMPLE IMAGE
                  </label>
                  <input
                    id="draft-image"
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={(e) => handleChange({ imageFile: e.target.files?.[0] ?? null })}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-slate-200 file:text-xs file:font-semibold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-500">JPEG or PNG, up to 5 MB for Meta approval.</p>
                  {errors.imageFile && <p className="text-xs text-rose-600">{errors.imageFile}</p>}
                </div>
              )}
            </div>

            {draft.headerFormat === HEADER_FORMATS.TEXT && headerHasVariable && (
              <div className="flex flex-col gap-1.5 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                <label htmlFor="sample-header-var" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  SAMPLE TEXT FOR HEADER VARIABLE
                </label>
                <input
                  id="sample-header-var"
                  type="text"
                  value={draft.sampleName || ''}
                  onChange={(e) => handleChange({ sampleName: e.target.value })}
                  placeholder="Nikhil"
                  className="w-full max-w-sm rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <p className="text-[11px] text-slate-500">
                  Enter sample text for the header variable. WhatsApp reviews the sample data to check if it complies their guidelines before approving the template.
                </p>
              </div>
            )}
          </div>

          <hr className="border-slate-100" />

          {/* BODY */}
          <div className="flex flex-col gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Body</h3>
              <p className="text-xs text-slate-500 mt-0.5">Enter the text for your message in the language you&apos;ve selected.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="draft-body" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  BODY CONTENT <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label={`Insert ${NAME_VARIABLE} (name)`}
                    onClick={handleInsertVariableToBody}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-800 cursor-pointer"
                  >
                    <span>Insert {NAME_VARIABLE} (name)</span>
                    <span className="text-sm font-bold">⊕</span>
                  </button>
                  <span className="text-xs font-mono text-slate-400">
                    {(draft.bodyText || '').length} / {DRAFT_LIMITS.bodyMax}
                  </span>
                </div>
              </div>

              <div className="relative">
                <textarea
                  id="draft-body"
                  rows={5}
                  maxLength={DRAFT_LIMITS.bodyMax}
                  value={draft.bodyText || ''}
                  onChange={(e) => handleChange({ bodyText: e.target.value })}
                  aria-label="Message text"
                  placeholder="Hi {{1}}, We're happy to bring you a special offer on your next purchase..."
                  className="w-full rounded-lg border border-slate-200 bg-white p-3.5 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 font-sans"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 text-[11px] text-slate-600 leading-relaxed font-mono">
                <p className="font-semibold text-slate-700 mb-1">Text formatting shorthands:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-slate-500">
                  <span>Bold: <code className="text-slate-800">*text*</code> <Icon name="arrowRight" className="inline h-3 w-3 align-[-1px]" /> <strong>text</strong></span>
                  <span>Italics: <code className="text-slate-800">_text_</code> <Icon name="arrowRight" className="inline h-3 w-3 align-[-1px]" /> <em>text</em></span>
                  <span>Strikethrough: <code className="text-slate-800">~text~</code> <Icon name="arrowRight" className="inline h-3 w-3 align-[-1px]" /> <del>text</del></span>
                  <span>Monospace: <code className="text-slate-800">```text```</code> <Icon name="arrowRight" className="inline h-3 w-3 align-[-1px]" /> <code>text</code></span>
                </div>
              </div>
              {errors.bodyText && <p className="text-xs text-rose-600 font-medium">{errors.bodyText}</p>}
            </div>

            {/* Variable sample fields */}
            {bodyVariables.length > 0 && (
              <div className="flex flex-col gap-2 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {bodyVariables.map((v, idx) => (
                    <div key={v} className="flex flex-col gap-1">
                      <label htmlFor={`sample-var-${v}`} className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        SAMPLE TEXT FOR VARIABLE &#123;&#123;{v}&#125;&#125; (REQUIRED)
                      </label>
                      <input
                        id={`sample-var-${v}`}
                        type="text"
                        value={idx === 0 ? draft.sampleName : '26th October'}
                        onChange={(e) => {
                          if (idx === 0) handleChange({ sampleName: e.target.value });
                        }}
                        placeholder={idx === 0 ? 'Nikhil' : 'Sample value'}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">
                  Enter sample text for the variables you&apos;re adding to the body content. WhatsApp reviews the sample data to check if it complies their guidelines before approving the template.
                </p>
                {errors.sampleName && <p className="text-xs text-rose-600 font-medium">{errors.sampleName}</p>}
              </div>
            )}
          </div>

          <hr className="border-slate-100" />

          {/* FOOTER (OPTIONAL) */}
          <div className="flex flex-col gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Footer <span className="text-slate-400 font-normal">(Optional)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Add a short line of text to the bottom of your message template.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="draft-footer" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  FOOTER TEXT
                </label>
                <span className="text-xs font-mono text-slate-400">
                  {(draft.footerText || '').length} / {DRAFT_LIMITS.footerMax}
                </span>
              </div>
              <input
                id="draft-footer"
                type="text"
                maxLength={DRAFT_LIMITS.footerMax}
                value={draft.footerText || ''}
                onChange={(e) => handleChange({ footerText: e.target.value })}
                placeholder="Sent via Garaaz Campaigns"
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <p className="text-[11px] text-slate-500">Enter footer text.</p>
              {errors.footerText && <p className="text-xs text-rose-600 font-medium">{errors.footerText}</p>}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* BUTTONS (CTA & QUICK REPLY) (Screenshots 4 & 5) */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Button <span className="text-slate-400 font-normal">(Optional)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Create buttons that let customers respond to your message or take action.</p>
              </div>

              {/* Add Button Dropdown Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAddButtonMenu((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
                >
                  <Icon name="plus" className="h-3.5 w-3.5" />
                  <span>Add a button</span>
                  <Icon name="chevronDown" className="h-3 w-3" />
                </button>

                {showAddButtonMenu && (
                  <div className="absolute right-0 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg z-30 text-xs">
                    <button
                      type="button"
                      onClick={handleAddCta}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 font-medium text-slate-700 flex items-center gap-2 cursor-pointer"
                    >
                      <Icon name="swap" className="h-4 w-4 text-teal-600" />
                      <span>Call To Action (CTA)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddQuickReply}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 font-medium text-slate-700 flex items-center gap-2 cursor-pointer"
                    >
                      <Icon name="reply" className="h-4 w-4 text-teal-600" />
                      <span>Quick Reply</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* CTA Buttons List */}
            {draft.buttonType === 'CTA' && (
              <div className="flex flex-col gap-3">
                {(draft.ctaButtons || []).map((btn, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 flex flex-col gap-3 shadow-2xs">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200/70">
                      <div className="flex items-center gap-2">
                        <Icon name="swap" className="h-4 w-4 text-teal-600" />
                        <span className="text-xs font-bold text-slate-800">Call To Action</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = (draft.ctaButtons || []).filter((_, i) => i !== idx);
                          setDraft((prev) => ({
                            ...prev,
                            ctaButtons: next,
                            buttonType: next.length === 0 ? 'NONE' : 'CTA',
                          }));
                        }}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                        title="Remove button"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">BUTTON TYPE</label>
                        <select
                          value={btn.type}
                          onChange={(e) => {
                            const next = [...(draft.ctaButtons || [])];
                            next[idx] = { ...next[idx], type: e.target.value };
                            setDraft((prev) => ({ ...prev, ctaButtons: next }));
                          }}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none"
                        >
                          <option value={BUTTON_TYPES.URL}>Visit Website</option>
                          <option value={BUTTON_TYPES.PHONE_NUMBER}>Call Phone Number</option>
                          <option value={BUTTON_TYPES.COPY_CODE}>Copy Offer Code</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">BUTTON TEXT</label>
                          <span className="text-xs font-mono text-slate-400">{(btn.text || '').length} / 25</span>
                        </div>
                        <input
                          type="text"
                          maxLength={25}
                          value={btn.text || ''}
                          onChange={(e) => {
                            const next = [...(draft.ctaButtons || [])];
                            next[idx] = { ...next[idx], text: e.target.value };
                            setDraft((prev) => ({ ...prev, ctaButtons: next }));
                          }}
                          placeholder={btn.type === BUTTON_TYPES.URL ? 'Visit website' : btn.type === BUTTON_TYPES.PHONE_NUMBER ? 'Call Support' : 'Copy code'}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {btn.type === BUTTON_TYPES.URL && (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">WEBSITE URL</label>
                          <span className="text-xs font-mono text-slate-400">{(btn.url || '').length} / 2000</span>
                        </div>
                        <input
                          type="text"
                          value={btn.url || ''}
                          onChange={(e) => {
                            const next = [...(draft.ctaButtons || [])];
                            next[idx] = { ...next[idx], url: e.target.value };
                            setDraft((prev) => ({ ...prev, ctaButtons: next }));
                          }}
                          placeholder="https://garaaz.com"
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none font-mono"
                        />
                      </div>
                    )}

                    {btn.type === BUTTON_TYPES.PHONE_NUMBER && (
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">PHONE NUMBER</label>
                        <input
                          type="text"
                          value={btn.phoneNumber || ''}
                          onChange={(e) => {
                            const next = [...(draft.ctaButtons || [])];
                            next[idx] = { ...next[idx], phoneNumber: e.target.value };
                            setDraft((prev) => ({ ...prev, ctaButtons: next }));
                          }}
                          placeholder="+919257039785"
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none font-mono"
                        />
                      </div>
                    )}

                    {btn.type === BUTTON_TYPES.COPY_CODE && (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">OFFER CODE</label>
                          <span className="text-xs font-mono text-slate-400">{(btn.example || '').length} / 15</span>
                        </div>
                        <input
                          type="text"
                          maxLength={15}
                          value={btn.example || ''}
                          onChange={(e) => {
                            const next = [...(draft.ctaButtons || [])];
                            next[idx] = { ...next[idx], example: e.target.value, code: e.target.value };
                            setDraft((prev) => ({ ...prev, ctaButtons: next }));
                          }}
                          placeholder="GARAAZ25"
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none font-mono uppercase"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Quick Reply List */}
            {draft.buttonType === 'QUICK_REPLY' && (
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.includeStopButton)}
                    onChange={(e) => handleChange({ includeStopButton: e.target.checked })}
                    className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                  />
                  <span>Include &ldquo;Stop promotions&rdquo; opt-out quick reply</span>
                </label>

                {(draft.quickReplies || []).map((q, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Icon name="reply" className="h-4 w-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      maxLength={25}
                      value={q.text || ''}
                      onChange={(e) => {
                        const next = [...(draft.quickReplies || [])];
                        next[idx] = { ...next[idx], text: e.target.value };
                        setDraft((prev) => ({ ...prev, quickReplies: next }));
                      }}
                      placeholder={`Quick reply #${idx + 1}`}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-teal-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = (draft.quickReplies || []).filter((_, i) => i !== idx);
                        setDraft((prev) => ({
                          ...prev,
                          quickReplies: next,
                          buttonType: next.length === 0 && !draft.includeStopButton ? 'NONE' : 'QUICK_REPLY',
                        }));
                      }}
                      className="text-red-500 hover:text-red-700 px-2 py-1 cursor-pointer"
                      aria-label="Remove quick reply"
                    >
                      <Icon name="close" className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {errors.buttons && <p className="text-xs text-rose-600 font-medium">{errors.buttons}</p>}
          </div>

          {missingUploadKeys.length > 0 && <ImageUploadUnavailable missingKeys={missingUploadKeys} />}
          {error && <ErrorAlert error={error} title="Template not submitted" />}
          {data && <CreateTemplateResult result={data} />}
        </div>

        {/* Right Column: Live WhatsApp Preview (stays in view while the form scrolls) (lg:col-span-4) */}
        <div className="flex flex-col items-center gap-3 lg:sticky lg:top-2 lg:self-start">
          {/* Card: Template Preview (Screenshot 2) */}
          <div className="flex flex-col items-center gap-3">
            <h3 className="text-sm font-bold text-slate-900">Template Preview</h3>
            <TemplatePreview
              header={
                draft.headerFormat === HEADER_FORMATS.IMAGE
                  ? { format: HEADER_FORMATS.IMAGE }
                  : previewHeader
                  ? { format: HEADER_FORMATS.TEXT, text: previewHeader }
                  : null
              }
              imageUrl={imageUrl}
              bodyText={previewBody}
              footerText={draft.footerText}
              buttons={previewButtons}
            />
          </div>
        </div>
      </form>

      {showTypeHelp && (
        <Modal title="Template types" onClose={() => setShowTypeHelp(false)}>
          <div className="flex flex-col gap-4 text-sm text-slate-700">
            <p>
              The template type is the kind of marketing message you are building. Every type goes through
              Meta&apos;s review. This dropdown is disabled and is not sent to Meta: the app only creates{' '}
              <strong>Custom</strong> templates, so you can&apos;t change it here.
            </p>
            <ul className="flex flex-col gap-2.5">
              {TEMPLATE_TYPES.map((type) => (
                <li key={type.value} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">{type.label}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        type.supported ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {type.supported ? 'Available' : 'Not in this app yet'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{type.description}</p>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500">
              Source: Meta&apos;s marketing templates documentation. Types that need a product catalog, carousel cards
              or offer timers would need extra fields in this form before they could be created.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
