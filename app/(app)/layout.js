'use client';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { hydrate, logout } from '@/store/authSlice';
import { COLORS } from '@/lib/format';

const NAV = [
  ['Overview', [['/dashboard', 'Dashboard']]],
  ['Masters', [['/products', 'Products', 'products'], ['/categories', 'Categories', 'categories'], ['/customers', 'Customers', 'customers'], ['/suppliers', 'Suppliers', 'suppliers']]],
  ['Inventory', [['/inventory', 'Stock and tracking', 'inventory']]],
  ['Production', [['/production', 'Production', 'production']]],
  ['Sales', [['/sales', 'Sales', 'sales']]],
  ['Purchase', [['/purchase', 'Purchase orders', 'purchase']]],
  ['Finance', [['/finance', 'Finance and expenses', 'finance'], ['/reports', 'Reports', 'reports']]],
  ['Accounts', [['/accounts', 'Ledger and accounts', 'accounts'], ['/users', 'User accounts', '@admin'], ['/rights', 'Access rights', '@admin']]],
];

export default function Shell({ children }) {
  const d = useDispatch(); const router = useRouter(); const pathname = usePathname();
  const { user, rights, ready } = useSelector((s) => s.auth);
  const [open, setOpen] = useState(false);
  useEffect(() => { d(hydrate()); }, [d]);
  useEffect(() => { if (ready && !user) router.replace('/login'); }, [ready, user, router]);
  useEffect(() => setOpen(false), [pathname]);
  if (!user) return null;
  const allowed = (m) => !m || (m === '@admin' ? user.role === 'admin' : user.role === 'admin' || rights[m]?.view);
  return (
    <div className="shell">
      <aside className={`side ${open ? 'open' : ''}`}>
        <div className="brand">Kimmu Stock</div>
        <nav>{NAV.map(([label, items], gi) => {
          const vis = items.filter(([, , m]) => allowed(m));
          return vis.length ? (
            <div className="grp" key={label} style={{ '--c': COLORS[gi % COLORS.length] }}>
              <div className="grp-label">{label}</div>
              {vis.map(([href, text]) => <Link key={href} href={href} className={pathname.startsWith(href) ? 'active' : ''}>{text}</Link>)}
            </div>) : null;
        })}</nav>
        <div className="me"><strong>{user.name}</strong><span>{user.role}</span>
          <button className="btn ghost" onClick={() => { d(logout()); router.replace('/login'); }}>Sign out</button></div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <div className="main">
        <header className="top">
          <button className="burger" aria-label="Open menu" onClick={() => setOpen(true)}><i /><i /><i /></button>
          <div className="who"><span className="avatar">{user.name[0]}</span>{user.name}</div>
        </header>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
