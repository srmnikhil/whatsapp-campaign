const numberFormat = new Intl.NumberFormat('en-IN');

const STATS = Object.freeze([
  { key: 'total', label: 'Rows', tone: 'text-text-primary' },
  { key: 'valid', label: 'Ready to send', tone: 'text-brand-green' },
  { key: 'invalid', label: 'Invalid', tone: 'text-brand-red' },
  { key: 'duplicates', label: 'Duplicates removed', tone: 'text-brand-yellow' },
]);

export function ImportSummary({ counts }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {STATS.map((stat) => (
        <div key={stat.key} className="rounded-lg border border-line bg-surface px-4 py-3">
          <dt className="text-xs text-text-secondary">{stat.label}</dt>
          <dd className={`mt-1 text-2xl font-semibold ${stat.tone}`}>{numberFormat.format(counts[stat.key])}</dd>
        </div>
      ))}
    </dl>
  );
}
