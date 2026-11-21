'use client';
import CrudPage from '@/components/CrudPage';
import { customersCrud } from '@/store';

const fields = [
  { key: 'name', label: 'Name', required: true }, { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone' }, { key: 'address', label: 'Address' },
];
export default function Page() {
  return <CrudPage title="Customers" singular="customer" module="customers" sliceName="customers" crud={customersCrud} fields={fields} />;
}
