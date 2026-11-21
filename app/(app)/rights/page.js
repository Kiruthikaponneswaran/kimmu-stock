'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const MODULES = ['products', 'categories', 'customers', 'suppliers', 'inventory', 'production', 'sales', 'purchase', 'finance', 'accounts', 'reports'];
const ACTIONS = ['view', 'create', 'edit', 'delete'];

export default function Rights() {
  const [rows, setRows] = useState([]); const [role, setRole] = useState('manager');
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');

  useEffect(() => { api('/rights').then(setRows).catch((e) => setErr(e.message)); }, []);
  const get = (m) => rows.find((r) => r.role === role && r.module === m) || { role, module: m };
  const toggle = (m, a) => {
    const cur = get(m); const next = { ...cur, [`can_${a}`]: cur[`can_${a}`] ? 0 : 1 };
    setRows([...rows.filter((r) => !(r.role === role && r.module === m)), next]); setMsg('');
  };
  const save = async () => {
    try { await api('/rights', { method: 'PUT', body: { rows } }); setMsg('Rights saved. Users get them at next sign-in.'); }
    catch (e) { setErr(e.message); }
  };

  return (
    <>
      <div className="page-head"><h1>Rights</h1><button className="btn primary" onClick={save}>Save rights</button></div>
      <div className="tabs">{['manager', 'staff', 'viewer'].map((r) => <button key={r} className={r === role ? 'on' : ''} onClick={() => setRole(r)}>{r}</button>)}</div>
      <p className="hint">Admins always have full access. Choose what the {role} role can do in each area.</p>
      {err && <p className="error">{err}</p>}{msg && <p className="success">{msg}</p>}
      <div className="card">
        <table className="table rights">
          <thead><tr><th>Area</th>{ACTIONS.map((a) => <th key={a}>{a}</th>)}</tr></thead>
          <tbody>{MODULES.map((m) => (
            <tr key={m}><td data-label="Area"><strong>{m}</strong></td>
              {ACTIONS.map((a) => <td key={a} data-label={a}><input type="checkbox" className="check" checked={!!get(m)[`can_${a}`]} onChange={() => toggle(m, a)} aria-label={`${role} can ${a} ${m}`} /></td>)}
            </tr>))}</tbody>
        </table>
      </div>
    </>
  );
}
