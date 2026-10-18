import { useCallback, useState } from 'react';
import { ErrorAlert } from '../../components/ErrorAlert.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Field } from '../../components/ui/Field.jsx';
import { TextInput } from '../../components/ui/TextInput.jsx';
import { TEST_SEND_DEFAULTS } from '../../config/defaults.js';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';
import { useGraphClient } from '../../hooks/useGraphClient.js';
import { getMissingKeys } from '../../lib/settings.js';
import { prepareTestSend } from '../../lib/testSend.js';
import { sendMessage } from '../../services/messagesApi.js';
import { MissingSettingsAlert } from './MissingSettingsAlert.jsx';

const FORM_FIELDS = Object.freeze([
  { key: 'to', label: 'Send to', help: 'Your own number, e.g. 98765 43210.' },
  { key: 'templateName', label: 'Approved template name', help: 'Must be a template with no variables.' },
  { key: 'languageCode', label: 'Template language code' },
]);

const INITIAL_FORM = Object.freeze({ to: '', ...TEST_SEND_DEFAULTS });

function SendResult({ result }) {
  return (
    <Alert tone="success" title={`Meta ${result.messageStatus === 'accepted' ? 'accepted' : `returned "${result.messageStatus}"`}`}>
      <p className="break-all font-mono text-xs">{result.wamid}</p>
      <p className="mt-1 text-text-secondary">Delivery and read status appear once the webhook is connected.</p>
    </Alert>
  );
}

export function TestSendCard({ settings }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const client = useGraphClient(settings);
  const { phoneNumberId } = settings;
  const send = useCallback(
    (payload, signal) => sendMessage(client, phoneNumberId, payload, { signal }),
    [client, phoneNumberId],
  );
  const { data, error, isLoading, run } = useAsyncAction(send);
  const missingKeys = getMissingKeys(settings);

  const updateField = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    const { errors: validationErrors, payload } = prepareTestSend(form);
    setErrors(validationErrors);
    if (payload) run(payload);
  };

  return (
    <Card title="Test send" description="Sends one approved template to one number to prove the token and number work.">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {missingKeys.length > 0 && <MissingSettingsAlert missingKeys={missingKeys} />}
        {FORM_FIELDS.map((field) => (
          <Field key={field.key} id={`test-send-${field.key}`} label={field.label} required help={field.help} error={errors[field.key]}>
            {(inputProps) => <TextInput {...inputProps} value={form[field.key]} onChange={updateField(field.key)} />}
          </Field>
        ))}
        <div>
          <Button type="submit" disabled={isLoading || missingKeys.length > 0}>
            {isLoading ? 'Sending…' : 'Send test message'}
          </Button>
        </div>
        {error && <ErrorAlert error={error} />}
        {data && <SendResult result={data} />}
      </form>
    </Card>
  );
}
