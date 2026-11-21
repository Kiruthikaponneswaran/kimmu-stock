'use client';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useCan } from '@/lib/useCan';
import { exportXlsx } from '@/lib/exportXlsx';

/* fields: [{ key, label, type, options, table, required, render }]
   options: array of strings, or a lookup name (e.g. 'categories') whose items become { id, name } choices */
export default function CrudPage({ title, singular, module, sliceName, crud, fields, lookups = {} }) {
  const d = useDispatch();
  const { items, status } = useSelector((s) => s[sliceName]);
  const looked = useSelector((s) => Object.fromEntries(Object.keys(lookups).map((k) => [k, s[k].items])));
  const can = useCan(module);
  const [q, setQ] = useState(''); const [form, setForm] = useState(null); const [err, setErr] = useState('');

  useEffect(() => {
    d(crud.load());
    Object.values(lookups).forEach((l) => d(l.load()));
  }, [d]); // eslint-disable-line

  const opts = (f) => (typeof f.options === 'string' ? (looked[f.options] || []).map((o) => ({ value: o.id, label: o.name })) : f.options.map((o) => ({ value: o, label: o })));
  const shown = items.filter((i) => Object.values(i).join(' ').toLowerCase().includes(q.toLowerCase()));

  const save = async (e) => {
    e.preventDefault(); setErr('');
    try { await d(crud.save(form)).unwrap(); setForm(null); d(crud.load()); }
    catch (x) { setErr(x.message); }
  };
  const del = async (i) => {
    if (!confirm(`Delete this ${singular}?`)) return;
    try { await d(crud.remove(i.id)).unwrap(); } catch (x) { setErr(x.message); }
  };

  return (
    <>
      <div className="page-head">
        <h1>{title}</h1>
        <input className="search" placeholder={`Search ${title.toLowerCase()}`} value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn" onClick={() => exportXlsx(title, fields.filter((f) => f.table !== false && f.key !== 'password').map((f) => ({ key: f.key, label: f.label })), shown)}>Export Excel</button>
        {can.create ? <button className="btn primary" onClick={() => { setErr(''); setForm({}); }}>Add {singular}</button> : null}
      </div>
      {err && !form && <p className="error">{err}</p>}
      <div className="card">
        <table className="table">
          <thead><tr>{fields.filter((f) => f.table !== false).map((f) => <th key={f.key}>{f.label}</th>)}<th /></tr></thead>
          <tbody>
            {shown.map((i) => (
              <tr key={i.id}>
                {fields.filter((f) => f.table !== false).map((f) => <td key={f.key} data-label={f.label}>{f.render ? f.render(i) : i[f.key] ?? '-'}</td>)}
                <td className="actions">
                  {can.edit ? <button className="btn small" onClick={() => { setErr(''); setForm({ ...i, password: '' }); }}>Edit</button> : null}
                  {can.delete ? <button className="btn small danger" onClick={() => del(i)}>Delete</button> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {status === 'done' && !shown.length && <p className="empty">No {title.toLowerCase()} yet. {can.create ? `Use "Add ${singular}" to create the first one.` : ''}</p>}
        {status === 'loading' && <p className="empty">Loading...</p>}
        {status === 'error' && <p className="error">Could not load data. Check that the API is running.</p>}
      </div>

      {form && (
        <div className="modal-wrap" onMouseDown={(e) => e.target === e.currentTarget && setForm(null)}>
          <form className="modal" onSubmit={save}>
            <h2>{form.id ? 'Edit' : 'Add'} {singular}</h2>
            <div className="grid2">
              {fields.filter((f) => f.form !== false).map((f) => (
                <label key={f.key} className={`field ${f.type === 'textarea' ? 'wide' : ''}`}>{f.label}
                  {f.options ? (
                    <select required={f.required} value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                      <option value="">Select...</option>{opts(f).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : f.type === 'textarea' ? (
                    <textarea rows="3" value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                  ) : (
                    <input type={f.type || 'text'} step={f.type === 'number' ? '0.01' : undefined} required={f.required && !(f.type === 'password' && form.id)}
                      placeholder={f.type === 'password' && form.id ? 'Leave blank to keep current' : ''}
                      value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                  )}
                </label>
              ))}
            </div>
            {err && <p className="error" role="alert">{err}</p>}
            <div className="modal-actions"><button type="button" className="btn" onClick={() => setForm(null)}>Cancel</button><button className="btn primary">Save {singular}</button></div>
          </form>
        </div>
      )}
    </>
  );
}
