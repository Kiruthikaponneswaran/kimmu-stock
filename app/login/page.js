'use client';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/store/authSlice';

export default function Login() {
  const d = useDispatch(); const router = useRouter();
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await d(login(f)).unwrap(); router.replace('/dashboard'); }
    catch (x) { setErr(x.message); setBusy(false); }
  };
  return (
    <main className="login">
      <section className="login-art">
        <div className="logo">Kimmu Stock</div>
        <h1>Stock, sales and purchases in one place.</h1>
        <p>A complete view of your business, from the shelf to the books.</p>
        <ul><li>Inventory tracking and low-stock alerts</li><li>Sales, purchase and production records</li><li>Finance, accounts and Excel reports</li></ul>
      </section>
      <form className="login-form" onSubmit={submit}>
        <h2>Welcome back</h2><p className="sub">Sign in to continue</p>
        <label className="field">Email<input type="email" required autoComplete="username" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        <label className="field">Password<input type="password" required autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
        {err && <p className="error" role="alert">{err}</p>}
        <button className="btn primary" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
        <p className="alt">New here? <Link href="/signup">Create an account</Link></p>
      </form>
    </main>
  );
}
