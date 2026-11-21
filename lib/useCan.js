import { useSelector } from 'react-redux';
const ALL = { view: 1, create: 1, edit: 1, delete: 1 };
export const useCan = (module) =>
  useSelector((s) => (s.auth.user?.role === 'admin' ? ALL : s.auth.rights[module] || {}));
