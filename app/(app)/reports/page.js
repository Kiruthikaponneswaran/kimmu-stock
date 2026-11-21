'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { money, int, fmtDate, MOVE_LABELS } from '@/lib/format';
import { exportXlsx } from '@/lib/exportXlsx';

const REPORTS = [['stock', 'Stock report'], ['movements', 'Stock movement tracking'], ['sales', 'Sales report'], ['purchases', 'Purchase report'], ['production', 'Production report'], ['pnl', 'Profit and loss']];
const show = (c, r) => {
  const v = r[c.key]; if (v == null || v === '') return '-';
  return c.type === 'money' ? money(v) : c.type === 'int' ? int(v) : c.type === 'date' ? fmtDate(v) : c.type === 'movetype' ? MOVE_LABELS[v] || v : c.type === 'signed' ? (v > 0 ? '+' : '') + v : v;
};

export default function Reports() {
  const [id, setId] = useState('stock'); const [rg, setRg] = useState({ from: '', to: '' }); const [data, setData] = useState({ columns: [], rows: [] }); const [err, setErr] = useState('');
  useEffect(() => {
    setErr('');
    api(`/reports/${id}?${new URLSearchParams(Object.entries(rg).filter(([, v]) => v))}`).then(setData).catch((e) => setErr(e.message));
  }, [id, rg]);
  const exp = () => exportXlsx(REPORTS.find(([k]) => k === id)[1], data.columns.map((c) => ({ key: c.key, label: c.label, exp: (r) => (c.type === 'money' || c.type === 'int' ? r[c.key] : show(c, r)) })), data.rows);
  const dated = id !== 'stock';
  return (
    <>
      <div className="page-head"><h1>Reports</h1><button className="btn primary" onClick={exp}>Export Excel</button></div>
      <div className="toolbar">
        <label className="field">Report<select value={id} onChange={(e) => setId(e.target.value)}>{REPORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        {dated && <><label className="field">From<input type="date" value={rg.from} onChange={(e) => setRg({ ...rg, from: e.target.value })} /></label>
          <label className="field">To<input type="date" value={rg.to} onChange={(e) => setRg({ ...rg, to: e.target.value })} /></label></>}
      </div>
      {err && <p className="error">{err}</p>}
      <div className="card">
        <table className="table">
          <thead><tr>{data.columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
          <tbody>{data.rows.map((r, i) => <tr key={i}>{data.columns.map((c) => <td key={c.key} data-label={c.label}>{show(c, r)}</td>)}</tr>)}</tbody>
        </table>
        {!data.rows.length && <p className="empty">No records for this report and date range.</p>}
      </div>
    </>
  );
}
