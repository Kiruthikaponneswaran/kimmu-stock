'use client';
import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '@/lib/api';
import { useCan } from '@/lib/useCan';
import { money, int, fmtDate } from '@/lib/format';
import { exportXlsx } from '@/lib/exportXlsx';
import Table from '@/components/Table';
import { productsCrud, suppliersCrud } from '@/store';

export default function Purchase() {
  const d = useDispatch(); const can = useCan('purchase');
  const products = useSelector((s) => s.products.items); const suppliers = useSelector((s) => s.suppliers.items);
  const [rows, setRows] = useState([]); const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const [f, setF] = useState({ supplier_id: '', product_id: '', qty: 1, unit_cost: '' });
  const load = useCallback(() => api('/purchases').then(setRows).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); d(productsCrud.load()); d(suppliersCrud.load()); }, [d, load]);

  const act = async (fn, msg) => { setErr(''); setOk(''); try { await fn(); if (msg) setOk(msg); load(); d(productsCrud.load()); } catch (x) { setErr(x.message); } };
  const create = (e) => { e.preventDefault(); act(() => api('/purchases', { method: 'POST', body: f }), 'Purchase order created'); };
  const cols = [{ label: 'Order', render: (r) => `PO-${r.id}` }, { label: 'Date', render: (r) => fmtDate(r.created_at) }, { key: 'supplier_name', label: 'Supplier' }, { key: 'product_name', label: 'Product' },
    { label: 'Qty', render: (r) => int(r.qty) }, { label: 'Unit cost', render: (r) => money(r.unit_cost) }, { label: 'Total', render: (r) => money(r.total) },
    { label: 'Status', render: (r) => <span className={`chip ${r.status === 'received' ? 'production' : 'sale'}`}>{r.status}</span> },
    { label: '', cls: 'actions', render: (r) => (
      <>{r.status !== 'received' && can.edit ? <button className="btn small primary" onClick={() => act(() => api(`/purchases/${r.id}/receive`, { method: 'POST' }), `PO-${r.id} received and stock updated`)}>Receive</button> : null}
        {r.status !== 'received' && can.delete ? <button className="btn small danger" onClick={() => confirm('Delete this order?') && act(() => api(`/purchases/${r.id}`, { method: 'DELETE' }))}>Delete</button> : null}</>) }];
  return (
    <>
      <div className="page-head"><h1>Purchase orders</h1>
        <button className="btn" onClick={() => exportXlsx('Purchases', [{ key: 'id', label: 'Order', exp: (r) => `PO-${r.id}` }, { key: 'created_at', label: 'Date', exp: (r) => fmtDate(r.created_at) }, { key: 'supplier_name', label: 'Supplier' }, { key: 'product_name', label: 'Product' }, { key: 'qty', label: 'Qty' }, { key: 'unit_cost', label: 'Unit cost' }, { key: 'total', label: 'Total' }, { key: 'status', label: 'Status' }], rows)}>Export Excel</button></div>
      {can.create ? (
        <form className="card sale-form" onSubmit={create}>
          <label className="field">Supplier<select value={f.supplier_id} onChange={(e) => setF({ ...f, supplier_id: e.target.value })}><option value="">Not specified</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label className="field">Product<select required value={f.product_id} onChange={(e) => setF({ ...f, product_id: e.target.value })}><option value="">Select...</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label className="field">Quantity<input type="number" min="1" required value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} /></label>
          <label className="field">Unit cost<input type="number" min="0" step="0.01" required value={f.unit_cost} onChange={(e) => setF({ ...f, unit_cost: e.target.value })} /></label>
          <div className="sale-total"><span>Total</span><strong>{money((f.qty || 0) * (f.unit_cost || 0))}</strong></div>
          <button className="btn primary">Create order</button>
        </form>) : null}
      {err && <p className="error" role="alert">{err}</p>}{ok && <p className="success">{ok}</p>}
      <Table columns={cols} rows={rows} empty="No purchase orders yet." />
    </>
  );
}
