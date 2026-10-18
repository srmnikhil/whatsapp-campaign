import { useState } from 'react';
import { Alert } from '../../components/ui/Alert.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { ConnectionCard } from './ConnectionCard.jsx';
import { SettingsForm } from './SettingsForm.jsx';
import { TestSendCard } from './TestSendCard.jsx';

const NOTICES = Object.freeze({
  saved: { tone: 'success', text: 'Settings saved in this browser.' },
  cleared: { tone: 'info', text: 'Settings cleared from this browser.' },
});

export function SettingsPage({ settings, revision, onSave, onClear, onConnectionInfo }) {
  const [noticeKey, setNoticeKey] = useState(null);
  const notice = NOTICES[noticeKey];

  const handleSave = (next) => {
    onSave(next);
    setNoticeKey('saved');
  };

  const handleClear = () => {
    onClear();
    setNoticeKey('cleared');
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card title="Cloud API settings" description="Stored only in this browser's localStorage. Clear them before handing over this laptop.">
        <div className="flex flex-col gap-4">
          {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
          <SettingsForm key={revision} settings={settings} onSave={handleSave} onClear={handleClear} />
        </div>
      </Card>
      <div className="flex flex-col gap-6">
        <ConnectionCard key={`connection-${revision}`} settings={settings} onConnectionInfo={onConnectionInfo} />
        <TestSendCard key={`test-send-${revision}`} settings={settings} />
      </div>
    </div>
  );
}
