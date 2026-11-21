'use client';
import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '@/lib/api';
import { useCan } from '@/lib/useCan';
import { int, fmtDate } from '@/lib/format';
import { exportXlsx } from '@/lib/exportXlsx';
import Table from '@/components/Table';
import CrudPage from '@/components/CrudPage';
import { productsCrud, bomsCrud } from '@/store';

const bomFields = [
  { key: 'product_id', label: 'Finished product', options: 'products', required: true, table: false },
  { key: 'component_id', label: 'Component used', options: 'products', required: true, table: false },
  { key: 'product_name', label: 'Finished product', form: false }, { key: 'component_name', label: 'Component', form: false },
  { key: 'qty', label: 'Qty per unit', type: 'number', required: true },
];

export default function Production() {
  const d = useDispatch(); const can = useCan('production'); const products = useSelector((s) => s.products.items);
  const [tab, setTab] = useState('orders'); const [rows, setRows] = useState([]); const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const [f, setF] = useState({ product_id: '', qty: 1, note: '' });
  const load = useCallback(() => api('/production').then(setRows).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); d(productsCrud.load()); }, [d, load]);
  const act = async (fn, msg) => { setErr(''); setOk(''); try { await fn(); if (msg) setOk(msg); load(); d(productsCrud.load()); } catch (x) { setErr(x.message); } };
  const cols = [{ label: 'Order', render: (r) => `MO-${r.id}` }, { label: 'Date', render: (r) => fmtDate(r.created_at) }, { key: 'product_name', label: 'Product' }, { label: 'Qty', render: (r) => int(r.qty) },
    { key: 'note', label: 'Note' }, { label: 'Status', render: (r) => <span className={`chip ${r.status === 'completed' ? 'production' : 'sale'}`}>{r.status}</span> },
    { label: '', cls: 'actions', render: (r) => (
      <>{r.status !== 'completed' && can.edit ? <button className="btn small primary" onClick={() => act(() => api(`/production/${r.id}/complete`, { method: 'POST' }), `MO-${r.id} completed. Components used and stock updated`)}>Complete</button> : null}
        {r.status !== 'completed' && can.delete ? <button className="btn small danger" onClick={() => confirm('Delete this order?') && act(() => api(`/production/${r.id}`, { method: 'DELETE' }))}>Delete</button> : null}</>) }];
  return (
    <>
      {tab === 'orders' && <div className="page-head"><h1>Production</h1>
        <button className="btn" onClick={() => exportXlsx('Production', [{ key: 'id', label: 'Order', exp: (r) => `MO-${r.id}` }, { key: 'created_at', label: 'Date', exp: (r) => fmtDate(r.created_at) }, { key: 'product_name', label: 'Product' }, { key: 'qty', label: 'Qty' }, { key: 'status', label: 'Status' }, { key: 'note', label: 'Note' }], rows)}>Export Excel</button></div>}
      <div className="tabs"><button className={tab === 'orders' ? 'on' : ''} onClick={() => setTab('orders')}>Production orders</button><button className={tab === 'bom' ? 'on' : ''} onClick={() => setTab('bom')}>Bill of materials</button></div>
      {tab === 'bom' ? <CrudPage title="Bill of materials" singular="item" module="production" sliceName="boms" crud={bomsCrud} fields={bomFields} lookups={{ products: productsCrud }} /> : (
        <>
          {can.create ? (
            <form className="card sale-form" onSubmit={(e) => { e.preventDefault(); act(() => api('/production', { method: 'POST', body: f }), 'Production order created'); }}>
              <label className="field">Product to make<select required value={f.product_id} onChange={(e) => setF({ ...f, product_id: e.target.value })}><option value="">Select...</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
              <label className="field">Quantity<input type="number" min="1" required value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} /></label>
              <label className="field">Note<input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
              <button className="btn primary">Create order</button>
            </form>) : null}
          {err && <p className="error" role="alert">{err}</p>}{ok && <p className="success">{ok}</p>}
          <Table columns={cols} rows={rows} empty="No production orders yet. Add a bill of materials first, then create an order." />
        </>)}
    </>
  );
}
