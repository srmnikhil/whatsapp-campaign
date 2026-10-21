import { useEffect, useState } from 'react';
import { ASYNC_STATUS } from '../../constants/asyncStatus.js';
import { TEMPLATE_REQUIRED_KEYS } from '../../constants/settingsFields.js';
import { getMissingKeys } from '../../lib/settings.js';
import { groupTemplatesByVersion } from '../../lib/templates.js';
import { MissingSettingsAlert } from '../settings/MissingSettingsAlert.jsx';
import { CreateTemplateForm } from './CreateTemplateForm.jsx';
import { TemplateList } from './TemplateList.jsx';

/** The app scrolls inside <main>, not the window. */
function scrollToTop() {
  document.getElementById('app-scroll')?.scrollTo?.({ top: 0, behavior: 'smooth' });
}

export function TemplatesPage({ settings, templatesState, onNavigateToSettings }) {
  const { status, load, templates = [] } = templatesState || {};
  const missingKeys = getMissingKeys(settings, TEMPLATE_REQUIRED_KEYS);
  const canLoad = missingKeys.length === 0;
  const [showCreate, setShowCreate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isCopy, setIsCopy] = useState(false);

  useEffect(() => {
    if (canLoad && status === ASYNC_STATUS.IDLE) load();
  }, [canLoad, status, load]);

  if (!canLoad) return <MissingSettingsAlert missingKeys={missingKeys} onNavigateToSettings={onNavigateToSettings} />;

  const isFormOpen = showCreate || Boolean(editingTemplate);

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setIsCopy(false);
    setShowCreate(false);
    scrollToTop();
  };

  const handleDuplicate = (template) => {
    setEditingTemplate(template);
    setIsCopy(true);
    setShowCreate(false);
    scrollToTop();
  };

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setIsCopy(false);
    setShowCreate(true);
    scrollToTop();
  };

  const handleCloseForm = () => {
    setShowCreate(false);
    setEditingTemplate(null);
    setIsCopy(false);
  };

  const versions =
    editingTemplate && !isCopy
      ? (groupTemplatesByVersion(templates).find((g) =>
          g.versions.some((v) => v.name === editingTemplate.name),
        )?.versions ?? [])
      : [];

  return (
    <div className="flex flex-col gap-8">
      {/* Create / Edit Template Form (shown when creating, editing, or when no templates exist) */}
      {isFormOpen && (
        <div className="flex flex-col gap-3">
          <CreateTemplateForm
            key={`${editingTemplate?.name ?? 'new'}${isCopy ? ':copy' : ''}`}
            settings={settings}
            template={editingTemplate}
            isCopy={isCopy}
            versions={versions}
            onSelectVersion={setEditingTemplate}
            onCreated={templatesState.refreshOne}
            onBack={handleCloseForm}
            onDelete={(t) => {
              templatesState.deleteOne?.(t.name);
              handleCloseForm();
            }}
          />
        </div>
      )}

      {/* Templates Table List */}
      <TemplateList
        templatesState={templatesState}
        onOpenCreate={handleOpenCreate}
        onEditTemplate={handleEdit}
        onDuplicateTemplate={handleDuplicate}
      />
    </div>
  );
}
