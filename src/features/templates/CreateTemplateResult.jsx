import { Alert } from '../../components/ui/Alert.jsx';
import { TEMPLATE_CATEGORY } from '../../constants/templates.js';

export function CreateTemplateResult({ result }) {
  const recategorised = result.category && result.category !== TEMPLATE_CATEGORY.MARKETING;
  return (
    <Alert tone={recategorised ? 'warning' : 'success'} title={`Submitted for review: ${result.status ?? 'PENDING'}`}>
      {recategorised && <p>Meta set the category to {result.category}. It won&apos;t be usable for marketing campaigns.</p>}
      <p>
        {result.listUpdated
          ? 'It is in the list above. Use "Refresh status" to check the review.'
          : 'Use "Reload list" to see it.'}
      </p>
    </Alert>
  );
}
