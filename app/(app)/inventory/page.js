'use client';
import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '@/lib/api';
import { useCan } from '@/lib/useCan';
import { money, int, fmtDate, MOVE_LABELS, MOVE_CHIP } from '@/lib/format';
import { exportXlsx } from '@/lib/exportXlsx';
import Table from '@/components/Table';
import { productsCrud } from '@/store';

export default function Inventory() {
  const d = useDispatch(); const can = useCan('inventory'); const products = useSelector((s) => s.products.items);
  const [tab, setTab] = useState('stock'); const [stock, setStock] = useState([]); const [moves, setMoves] = useState([]);
  const [flt, setFlt] = useState({ product: '', from: '', to: '' }); const [adj, setAdj] = useState({ product_id: '', qty: '', note: '' });
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const loadStock = useCallback(() => api('/inventory/stock').then(setStock).catch((e) => setErr(e.message)), []);
  const loadMoves = useCallback(() => api(`/inventory/moves?${new URLSearchParams(Object.entries(flt).filter(([, v]) => v))}`).then(setMoves).catch((e) => setErr(e.message)), [flt]);
  useEffect(() => { d(productsCrud.load()); loadStock(); }, [d, loadStock]);
  useEffect(() => { loadMoves(); }, [loadMoves]);

  const adjust = async (e) => {
    e.preventDefault(); setErr(''); setOk('');
    try { await api('/inventory/adjust', { method: 'POST', body: adj }); setOk('Stock adjusted'); setAdj({ product_id: '', qty: '', note: '' }); loadStock(); loadMoves(); d(productsCrud.load()); }
    catch (x) { setErr(x.message); }
  };
  const stockCols = [{ key: 'sku', label: 'SKU' }, { key: 'name', label: 'Product' }, { key: 'category_name', label: 'Category' },
    { label: 'In stock', render: (r) => <span className={`chip ${r.stock <= r.reorder_level ? 'low' : 'production'}`}>{int(r.stock)}</span> },
    { label: 'Reorder at', render: (r) => int(r.reorder_level) }, { label: 'Unit cost', render: (r) => money(r.cost) }, { label: 'Stock value', render: (r) => money(r.value) },
    { label: 'Status', render: (r) => (r.stock <= r.reorder_level ? 'Reorder' : 'Healthy') }];
  const moveCols = [{ label: 'Date', render: (r) => fmtDate(r.date) }, { label: 'Type', render: (r) => <span className={`chip ${MOVE_CHIP[r.type] || 'ok'}`}>{MOVE_LABELS[r.type] || r.type}</span> },
    { key: 'sku', label: 'SKU' }, { key: 'product', label: 'Product' }, { label: 'Change', render: (r) => <strong>{r.qty > 0 ? '+' : ''}{int(r.qty)}</strong> },
    { label: 'Balance', render: (r) => int(r.balance) }, { key: 'ref', label: 'Reference' }, { key: 'note', label: 'Note' }, { key: 'user', label: 'By' }];
  const exp = () => (tab === 'stock'
    ? exportXlsx('Stock-levels', [{ key: 'sku', label: 'SKU' }, { key: 'name', label: 'Product' }, { key: 'category_name', label: 'Category' }, { key: 'stock', label: 'In stock' }, { key: 'reorder_level', label: 'Reorder at' }, { key: 'cost', label: 'Unit cost' }, { key: 'value', label: 'Stock value' }], stock)
    : exportXlsx('Stock-movements', [{ key: 'date', label: 'Date', exp: (r) => fmtDate(r.date) }, { key: 'type', label: 'Type', exp: (r) => MOVE_LABELS[r.type] || r.type }, { key: 'sku', label: 'SKU' }, { key: 'product', label: 'Product' }, { key: 'qty', label: 'Change' }, { key: 'balance', label: 'Balance' }, { key: 'ref', label: 'Reference' }, { key: 'note', label: 'Note' }, { key: 'user', label: 'By' }], moves));

  return (
    <>
      <div className="page-head"><h1>Stock and tracking</h1><button className="btn" onClick={exp}>Export Excel</button></div>
      <div className="tabs"><button className={tab === 'stock' ? 'on' : ''} onClick={() => setTab('stock')}>Stock levels</button><button className={tab === 'moves' ? 'on' : ''} onClick={() => setTab('moves')}>Movement history</button></div>
      {err && <p className="error">{err}</p>}
      {tab === 'stock' ? (
        <>
          {can.create ? (
            <form className="card sale-form" onSubmit={adjust}>
              <label className="field">Product<select required value={adj.product_id} onChange={(e) => setAdj({ ...adj, product_id: e.target.value })}><option value="">Select...</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.stock})</option>)}</select></label>
              <label className="field">Change (use - to reduce)<input type="number" required value={adj.qty} onChange={(e) => setAdj({ ...adj, qty: e.target.value })} /></label>
              <label className="field">Reason<input value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} placeholder="Damaged, recount..." /></label>
              <button className="btn primary">Adjust stock</button>{ok && <p className="success">{ok}</p>}
            </form>) : null}
          <Table columns={stockCols} rows={stock} empty="No products yet." />
        </>
      ) : (
        <>
          <div className="toolbar">
            <label className="field">Product<select value={flt.product} onChange={(e) => setFlt({ ...flt, product: e.target.value })}><option value="">All products</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <label className="field">From<input type="date" value={flt.from} onChange={(e) => setFlt({ ...flt, from: e.target.value })} /></label>
            <label className="field">To<input type="date" value={flt.to} onChange={(e) => setFlt({ ...flt, to: e.target.value })} /></label>
          </div>
          <Table columns={moveCols} rows={moves} empty="No movements match these filters." />
        </>
      )}
    </>
  );
}
