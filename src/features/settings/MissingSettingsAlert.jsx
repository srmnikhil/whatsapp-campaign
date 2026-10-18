import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { getFieldLabel } from '../../lib/settings.js';

export function MissingSettingsAlert({ missingKeys, onNavigateToSettings }) {
  const missingLabels = missingKeys.map(getFieldLabel);

  if (onNavigateToSettings) {
    return (
      <div className="mx-auto max-w-2xl py-6">
        <Card>
          <div className="flex flex-col items-center text-center p-4 sm:p-6">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 shadow-xs">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800">Settings incomplete</h3>
            <p className="mt-1.5 text-sm text-slate-600 max-w-md">
              Before accessing this section, please complete the required credentials in your Settings.
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {missingLabels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200/80"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {label}
                </span>
              ))}
            </div>

            <div className="mt-7">
              <Button onClick={onNavigateToSettings}>
                Configure Settings →
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <Alert tone="warning" title="Settings incomplete">
      Save these first: {missingLabels.join(', ')}.
    </Alert>
  );
}

