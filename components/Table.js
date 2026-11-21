export default function Table({ columns, rows, empty = 'No records yet.' }) {
  return (
    <div className="card">
      <table className="table">
        <thead><tr>{columns.map((c) => <th key={c.label}>{c.label}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => (
          <tr key={r.id ?? i}>{columns.map((c) => <td key={c.label} data-label={c.label} className={c.cls}>{c.render ? c.render(r) : r[c.key] ?? '-'}</td>)}</tr>))}</tbody>
      </table>
      {!rows.length && <p className="empty">{empty}</p>}
    </div>
  );
}
