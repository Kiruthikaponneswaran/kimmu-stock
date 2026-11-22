'use client';
import CrudPage from '@/components/CrudPage';
import { productsCrud, categoriesCrud } from '@/store';
import { money } from '@/lib/format';

const fields = [
  { key: 'image_thumb', label: '', form: false, noExport: true,
    render: (i) => (i.image_url
      ? <img className="thumb" src={i.image_url} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      : <span className="thumb ph">{(i.name || '?')[0].toUpperCase()}</span>) },
  { key: 'sku', label: 'SKU', required: true },
  { key: 'name', label: 'Name', required: true },
  { key: 'category_id', label: 'Category', options: 'categories', table: false },
  { key: 'category_name', label: 'Category', form: false },
  { key: 'price', label: 'Price', type: 'number', required: true, render: (i) => money(i.price) },
  { key: 'cost', label: 'Cost', type: 'number', table: false },
  { key: 'stock', label: 'Stock', type: 'number', required: true,
    render: (i) => <span className={`chip ${i.stock <= i.reorder_level ? 'low' : 'ok'}`}>{i.stock}{i.stock <= i.reorder_level ? ' low' : ''}</span> },
  { key: 'reorder_level', label: 'Reorder at', type: 'number', table: false },
  { key: 'image_url', label: 'Image link (optional)', table: false },
  { key: 'description', label: 'Description', type: 'textarea', table: false },
];
export default function Page() {
  return <CrudPage title="Products" singular="product" module="products" sliceName="products" crud={productsCrud} fields={fields} lookups={{ categories: categoriesCrud }} />;
}
