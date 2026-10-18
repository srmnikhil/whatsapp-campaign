/**
 * @param {{ columns: { key: string, label: string }[], rows: object[], getRowKey: (row: object) => string | number, caption?: string }} props
 */
export function Table({ columns, rows, getRowKey, caption }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="bg-slate-50/95 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className="px-4 py-3 whitespace-nowrap">{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={getRowKey(row)} className="hover:bg-slate-50/80 transition-colors duration-100">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-xs sm:text-sm text-text-primary whitespace-nowrap">
                    {row[column.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
