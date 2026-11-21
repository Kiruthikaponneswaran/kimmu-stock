'use client';
import CrudPage from '@/components/CrudPage';
import { categoriesCrud } from '@/store';

const fields = [{ key: 'name', label: 'Name', required: true }, { key: 'description', label: 'Description' }];
export default function Page() {
  return <CrudPage title="Categories" singular="category" module="categories" sliceName="categories" crud={categoriesCrud} fields={fields} />;
}
