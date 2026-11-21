'use client';
import CrudPage from '@/components/CrudPage';
import { usersCrud } from '@/store';

const fields = [
  { key: 'name', label: 'Name', required: true }, { key: 'email', label: 'Email', type: 'email', required: true },
  { key: 'password', label: 'Password', type: 'password', required: true, table: false },
  { key: 'role', label: 'Role', options: ['admin', 'manager', 'staff', 'viewer'], required: true, render: (i) => <span className="chip ok">{i.role}</span> },
];
export default function Page() {
  return <CrudPage title="Users" singular="user" module="users" sliceName="users" crud={usersCrud} fields={fields} />;
}
