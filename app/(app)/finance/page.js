'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { money, compact, COLORS } from '@/lib/format';
import { exportXlsx } from '@/lib/exportXlsx';
import CrudPage from '@/components/CrudPage';
import { expensesCrud } from '@/store';

const fields = [
  { key: 'date', label: 'Date', type: 'date', required: true }, { key: 'category', label: 'Category', required: true, options: ['Rent', 'Salaries', 'Utilities', 'Transport', 'Marketing', 'Other'] },
  { key: 'description', label: 'Description' }, { key: 'amount', label: 'Amount', type: 'number', required: true, render: (r) => money(r.amount) },
];

export default function Finance() {
  const [d, setD] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { api('/finance/summary').then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <p className="error">{err}</p>;
  if (!d) return <p className="empty">Loading...</p>;
  const max = Math.max(1, ...d.monthly.flatMap((m) => [m.a, m.b]));
  const cards = [['Revenue', d.revenue, COLORS[0]], ['Cost of goods', d.cogs, COLORS[3]], ['Gross profit', d.gross, COLORS[2]], ['Expenses', d.opex, COLORS[4]], ['Net profit', d.net, d.net < 0 ? '#dc2626' : COLORS[1]], ['Cash', d.cash, COLORS[5]]];
  return (
    <>
      <div className="page-head"><h1>Finance</h1>
        <button className="btn" onClick={() => exportXlsx('Finance-monthly', [{ key: 'label', label: 'Month' }, { key: 'a', label: 'Revenue' }, { key: 'b', label: 'Costs' }, { key: 'net', label: 'Net', exp: (m) => m.a - m.b }], d.monthly)}>Export Excel</button></div>
      <div className="stats">{cards.map(([l, v, c]) => <div className="stat" key={l} style={{ '--c': c }}><span>{l}</span><strong>{money(v)}</strong></div>)}</div>
      <section className="card"><h2>Revenue and costs, last 6 months</h2>
        <div className="dots"><span style={{ '--c': COLORS[2] }}>Revenue</span><span style={{ '--c': COLORS[3] }}>Costs</span></div>
        <div className="bars">{d.monthly.map((m, i) => (
          <div className="bar" key={m.label}><em>{compact(m.a - m.b)}</em>
            <div className="duo"><i style={{ '--h': `${(m.a / max) * 100}%`, '--c': COLORS[2], '--d': `${i * 70}ms` }} /><i style={{ '--h': `${(m.b / max) * 100}%`, '--c': COLORS[3], '--d': `${i * 70 + 40}ms` }} /></div><span>{m.label}</span></div>))}</div></section>
      <CrudPage title="Expenses" singular="expense" module="finance" sliceName="expenses" crud={expensesCrud} fields={fields} />
    </>
  );
}
