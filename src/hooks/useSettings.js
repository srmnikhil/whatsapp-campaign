import { useCallback, useState } from 'react';
import { EMPTY_SETTINGS, clearSettings, loadSettings, saveSettings } from '../lib/settings.js';

/**
 * Settings persisted in localStorage. `revision` changes on every save or clear so
 * forms can reset their draft with `key={revision}`.
 */
export function useSettings() {
  const [state, setState] = useState(() => ({ settings: loadSettings(), revision: 0 }));

  const save = useCallback((next) => {
    const settings = saveSettings(next);
    setState((current) => ({ settings, revision: current.revision + 1 }));
  }, []);

  const clear = useCallback(() => {
    clearSettings();
    setState((current) => ({ settings: { ...EMPTY_SETTINGS }, revision: current.revision + 1 }));
  }, []);

  return { settings: state.settings, revision: state.revision, save, clear };
}
