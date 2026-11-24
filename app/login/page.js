'use client';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/store/authSlice';

const DEMO = { email: 'admin@kimmustock.com', password: 'Admin@123' };
const PHRASES = ['Smart stock tracking.', 'Instant low-stock alerts.', 'AI-powered insights.', 'Sales, purchase & finance.'];

function Typewriter() {
  const [i, setI] = useState(0); const [n, setN] = useState(0); const [del, setDel] = useState(false);
  useEffect(() => {
    const w = PHRASES[i];
    const t = setTimeout(() => {
      if (!del && n < w.length) setN(n + 1);
      else if (!del) setDel(true);
      else if (n > 0) setN(n - 1);
      else { setDel(false); setI((i + 1) % PHRASES.length); }
    }, !del && n === w.length ? 1400 : del ? 30 : 65);
    return () => clearTimeout(t);
  }, [n, del, i]);
  return <span className="type">{PHRASES[i].slice(0, n)}<i className="caret" /></span>;
}

export default function Login() {
  const d = useDispatch(); const router = useRouter();
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false); const [copied, setCopied] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await d(login(f)).unwrap(); router.replace('/dashboard'); }
    catch (x) { setErr(x.message); setBusy(false); }
  };
  const fill = () => { setF(DEMO); setErr(''); };
  const copy = async (k) => {
    try { await navigator.clipboard.writeText(DEMO[k]); setCopied(k); setTimeout(() => setCopied(''), 1400); } catch {}
  };
  return (
    <main className="login">
      <div className="orb o1" /><div className="orb o2" /><div className="orb o3" />
      <section className="login-art">
        <div className="logo"><span className="logo-mark">K</span>Kimmu Stock</div>
        <span className="ai-pill"><i />AI-enhanced inventory</span>
        <h1>Stock, sales and purchases in one place.</h1>
        <p className="live">Your business, now with <Typewriter /></p>
        <ul><li>Inventory tracking and low-stock alerts</li><li>Sales, purchase and production records</li><li>Finance, accounts and Excel reports</li></ul>
        <div className="crates" aria-hidden="true">{Array.from({ length: 9 }, (_, k) => <span key={k} style={{ '--i': k }} />)}</div>
      </section>
      <form className="login-form glass" onSubmit={submit}>
        <h2>Welcome back</h2><p className="sub">Sign in to continue</p>

        <div className="demo" role="note" aria-label="Demo login">
          <div className="demo-head"><span className="demo-badge">Demo</span><strong>Try it instantly</strong>
            <button type="button" className="demo-fill" onClick={fill}>Use demo login</button></div>
          <div className="demo-row"><span>Email</span><code>{DEMO.email}</code>
            <button type="button" onClick={() => copy('email')} aria-label="Copy demo email">{copied === 'email' ? 'Copied' : 'Copy'}</button></div>
          <div className="demo-row"><span>Password</span><code>{DEMO.password}</code>
            <button type="button" onClick={() => copy('password')} aria-label="Copy demo password">{copied === 'password' ? 'Copied' : 'Copy'}</button></div>
        </div>

        <label className="field">Email<input type="email" required autoComplete="username" placeholder="you@company.com" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        <label className="field">Password
          <span className="pw"><input type={show ? 'text' : 'password'} required autoComplete="current-password" placeholder="Your password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
            <button type="button" className="eye" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? 'Hide' : 'Show'}</button></span>
        </label>
        {err && <p className="error" role="alert">{err}</p>}
        <button className="btn primary glow" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
        <p className="alt">New here? <Link href="/signup">Create an account</Link></p>
      </form>
    </main>
  );
}
