'use client';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signup } from '@/store/authSlice';

export default function Signup() {
  const d = useDispatch(); const router = useRouter();
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (f.password !== f.confirm) return setErr('The two passwords do not match');
    setBusy(true);
    try { await d(signup({ name: f.name, email: f.email, password: f.password })).unwrap(); router.replace('/dashboard'); }
    catch (x) { setErr(x.message); setBusy(false); }
  };
  return (
    <main className="login">
      <section className="login-art">
        <div className="logo">Kimmu Stock</div>
        <h1>Create your free account.</h1>
        <p>Browse products, categories and stock health. Your account is view-only; an administrator can give you more access.</p>
      </section>
      <form className="login-form" onSubmit={submit}>
        <h2>Sign up</h2><p className="sub">It takes less than a minute</p>
        <label className="field">Full name<input required autoComplete="name" value={f.name} onChange={set('name')} /></label>
        <label className="field">Email<input type="email" required autoComplete="username" value={f.email} onChange={set('email')} /></label>
        <label className="field">Password<input type="password" required minLength={8} autoComplete="new-password" value={f.password} onChange={set('password')} placeholder="At least 8 characters" /></label>
        <label className="field">Confirm password<input type="password" required autoComplete="new-password" value={f.confirm} onChange={set('confirm')} /></label>
        {err && <p className="error" role="alert">{err}</p>}
        <button className="btn primary" disabled={busy}>{busy ? 'Creating account...' : 'Create account'}</button>
        <p className="alt">Already have an account? <Link href="/login">Sign in</Link></p>
      </form>
    </main>
  );
}
