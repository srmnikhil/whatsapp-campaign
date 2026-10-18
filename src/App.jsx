import { useCallback, useState } from 'react';
import { LogConsole } from './components/LogConsole.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { TopNavbar } from './components/TopNavbar.jsx';
import { TAB_ITEMS, TABS } from './constants/tabs.js';
import { LogProvider } from './context/LogContext.jsx';
import { ContactsPage } from './features/contacts/ContactsPage.jsx';
import { HistoryPage } from './features/history/HistoryPage.jsx';
import { ResultsPage } from './features/results/ResultsPage.jsx';
import { SendPage } from './features/send/SendPage.jsx';
import { SettingsPage } from './features/settings/SettingsPage.jsx';
import { TemplatesPage } from './features/templates/TemplatesPage.jsx';
import { useBackendClient } from './hooks/useBackendClient.js';
import { useCampaignSender, SENDER_PHASE } from './hooks/useCampaignSender.js';
import { useGraphClient } from './hooks/useGraphClient.js';
import { useSettings } from './hooks/useSettings.js';
import { useTemplates } from './hooks/useTemplates.js';

function AppLayout() {
  const { settings, revision, save, clear } = useSettings();
  const templatesState = useTemplates(settings);
  const graphClient = useGraphClient(settings);
  const backendClient = useBackendClient(settings);

  const [activeTab, setActiveTab] = useState(TABS.SETTINGS);
  const [contactsImport, setContactsImport] = useState(null);
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);

  // Campaign sender lives at App level so the progress survives tab switches
  const { sender, startSend, stopSend } = useCampaignSender({
    graphClient,
    backendClient,
    settings,
  });

  // After send completes: jump to Results with the campaign ID pre-filled
  const [resultsCampaignId, setResultsCampaignId] = useState(null);
  const handleViewResults = useCallback((campaignId) => {
    setResultsCampaignId(campaignId);
    setActiveTab(TABS.RESULTS);
  }, []);

  // Show a dot on the Send tab badge when a send is in progress
  const tabItems = TAB_ITEMS.map((item) => {
    if (item.id === TABS.SEND && sender.phase === SENDER_PHASE.SENDING) {
      return { ...item, label: '● Send' };
    }
    return item;
  });

  const validContactsCount = contactsImport?.table?.rows?.length ?? 0;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar Navigation */}
      <Sidebar
        items={tabItems}
        activeId={activeTab}
        onSelect={setActiveTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        connectionInfo={connectionInfo}
        sender={sender}
        onOpenLogs={() => setIsLogsOpen(true)}
        contactsCount={validContactsCount}
      />

      {/* Main Column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <TopNavbar
          activeTab={activeTab}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          connectionInfo={connectionInfo}
          sender={sender}
          onStopSend={stopSend}
          onOpenLogs={() => setIsLogsOpen(true)}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 bg-slate-50">
          <div className="w-full max-w-[1750px] mx-auto">
            {activeTab === TABS.SETTINGS && (
              <SettingsPage
                settings={settings}
                revision={revision}
                onSave={save}
                onClear={clear}
                onConnectionInfo={setConnectionInfo}
              />
            )}
            {activeTab === TABS.CONTACTS && (
              <ContactsPage importState={contactsImport} onImportChange={setContactsImport} />
            )}
            {activeTab === TABS.TEMPLATES && (
              <TemplatesPage
                settings={settings}
                templatesState={templatesState}
                onNavigateToSettings={() => setActiveTab(TABS.SETTINGS)}
              />
            )}
            {activeTab === TABS.SEND && (
              <SendPage
                settings={settings}
                contactsImport={contactsImport}
                templatesState={templatesState}
                graphClient={graphClient}
                backendClient={backendClient}
                connectionInfo={connectionInfo}
                sender={sender}
                startSend={startSend}
                stopSend={stopSend}
                onViewResults={handleViewResults}
                onNavigateToSettings={() => setActiveTab(TABS.SETTINGS)}
                onNavigateToContacts={() => setActiveTab(TABS.CONTACTS)}
              />
            )}
            {activeTab === TABS.RESULTS && (
              <ResultsPage
                settings={settings}
                backendClient={backendClient}
                templatesState={templatesState}
                campaignId={resultsCampaignId}
                onNavigateToSettings={() => setActiveTab(TABS.SETTINGS)}
              />
            )}
            {activeTab === TABS.HISTORY && (
              <HistoryPage
                settings={settings}
                backendClient={backendClient}
                onViewResults={handleViewResults}
                onNavigateToSettings={() => setActiveTab(TABS.SETTINGS)}
              />
            )}
          </div>
        </main>
      </div>

      {/* Real-time Logs Console Drawer */}
      <LogConsole isOpen={isLogsOpen} onClose={() => setIsLogsOpen(false)} />
    </div>
  );
}

export function App() {
  return (
    <LogProvider>
      <AppLayout />
    </LogProvider>
  );
}
