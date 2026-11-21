'use client';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useCan } from '@/lib/useCan';
import { money } from '@/lib/format';
import { exportXlsx } from '@/lib/exportXlsx';
import { salesCrud, productsCrud, customersCrud } from '@/store';

export default function Sales() {
  const d = useDispatch(); const can = useCan('sales');
  const sales = useSelector((s) => s.sales.items);
  const products = useSelector((s) => s.products.items);
  const customers = useSelector((s) => s.customers.items);
  const [f, setF] = useState({ customer_id: '', product_id: '', qty: 1 });
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');

  useEffect(() => { d(salesCrud.load()); d(productsCrud.load()); d(customersCrud.load()); }, [d]);
  const product = products.find((p) => String(p.id) === String(f.product_id));

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setOk('');
    try {
      await d(salesCrud.save(f)).unwrap();
      setOk('Sale recorded and stock updated'); setF({ ...f, qty: 1 });
      d(salesCrud.load()); d(productsCrud.load());
    } catch (x) { setErr(x.message); }
  };
  const del = async (s) => {
    if (!confirm('Delete this sale? The stock will be returned.')) return;
    await d(salesCrud.remove(s.id)); d(productsCrud.load());
  };

  return (
    <>
      <div className="page-head"><h1>Sales</h1><button className="btn" onClick={() => exportXlsx('Sales', [{ key: 'invoice', label: 'Invoice' }, { key: 'created_at', label: 'Date', exp: (s) => new Date(s.created_at).toLocaleDateString('en-GB') }, { key: 'customer_name', label: 'Customer', exp: (s) => s.customer_name || 'Walk-in' }, { key: 'product_name', label: 'Product' }, { key: 'qty', label: 'Qty' }, { key: 'total', label: 'Total' }], sales)}>Export Excel</button></div>
      {can.create ? (
        <form className="card sale-form" onSubmit={submit}>
          <label className="field">Customer
            <select value={f.customer_id} onChange={(e) => setF({ ...f, customer_id: e.target.value })}>
              <option value="">Walk-in customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></label>
          <label className="field">Product
            <select required value={f.product_id} onChange={(e) => setF({ ...f, product_id: e.target.value })}>
              <option value="">Select...</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.stock} in stock)</option>)}
            </select></label>
          <label className="field">Quantity
            <input type="number" min="1" required value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} /></label>
          <div className="sale-total"><span>Total</span><strong>{money(product ? product.price * (f.qty || 0) : 0)}</strong></div>
          <button className="btn primary">Record sale</button>
          {err && <p className="error" role="alert">{err}</p>}{ok && <p className="success">{ok}</p>}
        </form>
      ) : null}
      <div className="card">
        <table className="table">
          <thead><tr><th>Date</th><th>Customer</th><th>Product</th><th>Qty</th><th>Total</th><th /></tr></thead>
          <tbody>{sales.map((s) => (
            <tr key={s.id}>
              <td data-label="Date">{new Date(s.created_at).toLocaleDateString('en-GB')}</td>
              <td data-label="Customer">{s.customer_name || 'Walk-in'}</td><td data-label="Product">{s.product_name}</td>
              <td data-label="Qty">{s.qty}</td><td data-label="Total">{money(s.total)}</td>
              <td className="actions">{can.delete ? <button className="btn small danger" onClick={() => del(s)}>Delete</button> : null}</td>
            </tr>))}</tbody>
        </table>
        {!sales.length && <p className="empty">No sales yet. Record the first one above.</p>}
      </div>
    </>
  );
}
