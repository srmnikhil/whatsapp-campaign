import { useEffect, useState } from 'react';
import { ASYNC_STATUS } from '../../constants/asyncStatus.js';
import { TEMPLATE_REQUIRED_KEYS } from '../../constants/settingsFields.js';
import { getMissingKeys } from '../../lib/settings.js';
import { MissingSettingsAlert } from '../settings/MissingSettingsAlert.jsx';
import { CreateTemplateForm } from './CreateTemplateForm.jsx';
import { TemplateList } from './TemplateList.jsx';

export function TemplatesPage({ settings, templatesState, onNavigateToSettings }) {
  const { status, load, templates = [] } = templatesState || {};
  const missingKeys = getMissingKeys(settings, TEMPLATE_REQUIRED_KEYS);
  const canLoad = missingKeys.length === 0;
  const [showCreate, setShowCreate] = useState(() => templates.length === 0);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (canLoad && status === ASYNC_STATUS.IDLE) load();
  }, [canLoad, status, load]);

  if (!canLoad) return <MissingSettingsAlert missingKeys={missingKeys} onNavigateToSettings={onNavigateToSettings} />;

  const isCreating = showCreate || templates.length === 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Create Template Form (shown when creating or when no templates exist) */}
      {isCreating && (
        <div className="flex flex-col gap-3">
          {templates.length > 0 && (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                ← Back to templates list
              </button>
            </div>
          )}
          <CreateTemplateForm
            settings={settings}
            onCreated={templatesState.refreshOne}
          />
        </div>
      )}

      {/* Template List + Right Phone Preview */}
      <TemplateList
        templatesState={templatesState}
        selectedId={selectedId}
        onSelectId={setSelectedId}
        onOpenCreate={() => setShowCreate(true)}
      />
    </div>
  );
}
