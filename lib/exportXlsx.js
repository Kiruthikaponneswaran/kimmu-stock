// columns: [{ key, label, exp? }]  rows: array of objects
export async function exportXlsx(file, columns, rows) {
  const XLSX = await import('xlsx');
  const data = rows.map((r) => Object.fromEntries(columns.map((c) => [c.label, c.exp ? c.exp(r) : r[c.key] ?? ''])));
  const ws = XLSX.utils.json_to_sheet(data, { header: columns.map((c) => c.label) });
  ws['!cols'] = columns.map((c) => ({ wch: Math.min(40, Math.max(c.label.length, ...data.slice(0, 200).map((d) => String(d[c.label] ?? '').length)) + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${file}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
