import { useState } from 'react';
import { TemplatePreview } from '../../components/TemplatePreview.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { HEADER_FORMATS } from '../../constants/templates.js';

/**
 * Shows the list of APPROVED marketing templates (from templatesState) and
 * lets the user pick one. Only templates with problems.length === 0 are selectable.
 */
export function TemplateSelector({ templatesState, onSelect }) {
  const [selected, setSelected] = useState(null);
  const { templates, isLoading } = templatesState;
  const approved = templates.filter((t) => t.problems.length === 0);

  if (isLoading) {
    return (
      <Card title="Pick a template">
        <p className="text-sm text-text-secondary animate-pulse">Loading templates…</p>
      </Card>
    );
  }

  if (approved.length === 0) {
    return (
      <Card title="Pick a template">
        <p className="text-sm text-text-secondary">
          No approved, usable marketing templates found. Go to the{' '}
          <strong>Templates</strong> tab to create or reload them.
        </p>
      </Card>
    );
  }

  return (
    <Card
      title="Pick a template"
      description={`${approved.length} APPROVED marketing template${approved.length !== 1 ? 's' : ''} available.`}
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {approved.map((template) => {
            const isSelected = selected?.id === template.id;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelected(template)}
                className={[
                  'flex flex-col gap-2 rounded-xl border-2 p-3 text-left transition-all cursor-pointer',
                  isSelected
                    ? 'border-navy bg-navy/5 shadow-md'
                    : 'border-line bg-card hover:border-navy/40 hover:shadow-sm',
                ].join(' ')}
                aria-pressed={isSelected}
                aria-label={`Select template ${template.name}`}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-xs font-semibold text-text-primary">{template.name}</span>
                  <span className="text-xs text-text-secondary">{template.language}</span>
                  {isSelected && <Badge tone="success">Selected</Badge>}
                </div>
                <TemplatePreview
                  header={template.header}
                  imageUrl={template.header.exampleUrl}
                  bodyText={template.bodyText}
                  footerText={template.footerText}
                  buttons={template.buttons}
                />
              </button>
            );
          })}
        </div>

        <div>
          <Button onClick={() => onSelect(selected)} disabled={!selected}>
            Use this template →
          </Button>
        </div>
      </div>
    </Card>
  );
}
