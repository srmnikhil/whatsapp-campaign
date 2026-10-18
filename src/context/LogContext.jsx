import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const LogContext = createContext(null);

const MAX_LOGS = 500;

export function LogProvider({ children }) {
  const [logs, setLogs] = useState([
    {
      id: 'init-1',
      timestamp: new Date().toISOString(),
      level: 'info',
      category: 'SYSTEM',
      title: 'Garaaz WhatsApp Campaigns system initialized',
      details: { environment: 'Cloud API v25.0', client: 'Garaaz Web Console' },
    },
  ]);

  const addLog = useCallback(({ level = 'info', category = 'SYSTEM', title, details = null }) => {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      title,
      details,
    };
    setLogs((prev) => [entry, ...prev].slice(0, MAX_LOGS));
    return entry;
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const value = useMemo(
    () => ({
      logs,
      addLog,
      clearLogs,
      logCount: logs.length,
      errorCount: logs.filter((l) => l.level === 'error').length,
    }),
    [logs, addLog, clearLogs],
  );

  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
}

export function useLogger() {
  const context = useContext(LogContext);
  if (!context) {
    // Return a safe no-op fallback if used outside provider
    return {
      logs: [],
      addLog: () => {},
      clearLogs: () => {},
      logCount: 0,
      errorCount: 0,
    };
  }
  return context;
}
