'use client';
import CrudPage from '@/components/CrudPage';
import { suppliersCrud } from '@/store';
const fields = [{ key: 'name', label: 'Name', required: true }, { key: 'email', label: 'Email', type: 'email' }, { key: 'phone', label: 'Phone' }, { key: 'address', label: 'Address' }];
export default function Page() { return <CrudPage title="Suppliers" singular="supplier" module="suppliers" sliceName="suppliers" crud={suppliersCrud} fields={fields} />; }
