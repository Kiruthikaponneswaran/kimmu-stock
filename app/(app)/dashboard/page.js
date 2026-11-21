'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { money, compact, int, fmtDate, MOVE_LABELS, MOVE_CHIP, COLORS } from '@/lib/format';

function Donut({ data, unit }) {
  const total = data.reduce((a, x) => a + Number(x.value), 0) || 1;
  const R = 70, C = 2 * Math.PI * R; let acc = 0;
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 200 200" className="donut" role="img" aria-label="Share chart">
        <g transform="rotate(-90 100 100)">{data.map((x, i) => {
          const len = (Number(x.value) / total) * C;
          const el = <circle key={x.name} cx="100" cy="100" r={R} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="34" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} style={{ '--d': `${i * 120}ms` }} />;
          acc += len; return el;
        })}</g>
        <text x="100" y="98" textAnchor="middle" className="donut-n">{compact(total)}</text><text x="100" y="118" textAnchor="middle" className="donut-l">{unit}</text>
      </svg>
      <ul className="legend">{data.map((x, i) => <li key={x.name} style={{ '--c': COLORS[i % COLORS.length] }}><i />{x.name}<b>{Math.round((Number(x.value) / total) * 100)}%</b></li>)}</ul>
    </div>
  );
}
function Area({ data }) {
  const w = 600, h = 180, max = Math.max(1, ...data.map((d) => d.value));
  const pts = data.map((d, i) => [(i / Math.max(1, data.length - 1)) * w, h - 12 - (d.value / max) * (h - 34)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  return (
    <>
      <svg viewBox={`0 0 ${w} ${h}`} className="area" preserveAspectRatio="none" role="img" aria-label="Sales trend">
        <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2563eb" stopOpacity=".35" /><stop offset="1" stopColor="#2563eb" stopOpacity="0" /></linearGradient></defs>
        <path d={`${line} L${w} ${h} L0 ${h} Z`} fill="url(#ag)" /><path d={line} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="area-x"><span>{data[0]?.label}</span><span>{data[data.length - 1]?.label}</span></div>
    </>
  );
}
function Gauge({ pct }) {
  const R = 64, C = 2 * Math.PI * R, color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <svg viewBox="0 0 160 160" className="donut" role="img" aria-label={`Stock health ${pct} percent`}>
      <circle cx="80" cy="80" r={R} fill="none" stroke="#e1e8f4" strokeWidth="16" />
      <circle cx="80" cy="80" r={R} fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" strokeDasharray={`${(pct / 100) * C} ${C}`} transform="rotate(-90 80 80)" />
      <text x="80" y="88" textAnchor="middle" className="gauge-n">{pct}%</text>
    </svg>
  );
}

export default function Dashboard() {
  const [d, setD] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { api('/dashboard').then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <p className="error">{err}</p>;
  if (!d) return <p className="empty">Loading dashboard...</p>;
  if (d.restricted) {
    return (
      <>
        <div className="page-head"><h1>Overview</h1></div>
        <div className="stats">{[['Products', d.counts.products, COLORS[0]], ['Need reorder', d.counts.low, d.counts.low ? '#dc2626' : COLORS[2]], ['Stock health', `${d.health}%`, COLORS[2]]]
          .map(([l, v, c]) => <div key={l} className="stat" style={{ '--c': c }}><span>{l}</span><strong>{v}</strong></div>)}</div>
        <div className="dash-grid">
          <section className="card"><h2>Best sellers</h2>{d.top.length ? <Donut data={d.top} unit="units" /> : <p className="empty">No sales yet.</p>}</section>
          <section className="card"><h2>Needs restocking</h2>{d.lowList.length ? <ul className="rank">{d.lowList.map((p) => <li key={p.id}><span>{p.name}</span><strong className="chip low">{p.stock} left</strong></li>)}</ul> : <p className="empty">Everything is above its reorder level.</p>}</section>
        </div>
      </>
    );
  }
  const { fin, trend, monthly, cats, top, lowList, recent, counts, health } = d;
  const mmax = Math.max(1, ...monthly.flatMap((m) => [m.a, m.b]));
  const cards = [['Revenue', money(fin.revenue), COLORS[0]], ['Net profit', money(fin.net), fin.net < 0 ? '#dc2626' : COLORS[2]], ['Cash', money(fin.cash), COLORS[1]],
    ['Inventory value', money(fin.inventory), COLORS[4]], ['Open purchase orders', counts.openPO, COLORS[3]], ['Planned production', counts.plannedMO, COLORS[5]]];
  return (
    <>
      <div className="page-head"><h1>Dashboard</h1></div>
      <div className="stats">{cards.map(([l, v, c]) => <div key={l} className="stat" style={{ '--c': c }}><span>{l}</span><strong>{v}</strong></div>)}</div>
      <div className="dash-grid three">
        <section className="card span2"><h2>Sales, last 30 days</h2><Area data={trend} /></section>
        <section className="card"><h2>Stock health</h2><div className="donut-wrap"><Gauge pct={health} />
          <ul className="legend"><li><b style={{ margin: 0 }}>{counts.products}</b>&nbsp;products</li><li><b style={{ margin: 0, color: '#dc2626' }}>{counts.low}</b>&nbsp;need reorder</li><li><b style={{ margin: 0 }}>{counts.customers}</b>&nbsp;customers</li></ul></div></section>
        <section className="card"><h2>Stock value by category</h2>{cats.length ? <Donut data={cats} unit="AED" /> : <p className="empty">Add products to see this.</p>}</section>
        <section className="card"><h2>Best sellers</h2>{top.length ? <Donut data={top} unit="units" /> : <p className="empty">Sell something to see rankings.</p>}</section>
        <section className="card"><h2>Revenue and costs</h2>
          <div className="dots"><span style={{ '--c': COLORS[2] }}>Revenue</span><span style={{ '--c': COLORS[3] }}>Costs</span></div>
          <div className="bars">{monthly.map((m, i) => (
            <div className="bar" key={m.label}><em>{compact(m.a - m.b)}</em>
              <div className="duo"><i style={{ '--h': `${(m.a / mmax) * 100}%`, '--c': COLORS[2], '--d': `${i * 70}ms` }} /><i style={{ '--h': `${(m.b / mmax) * 100}%`, '--c': COLORS[3], '--d': `${i * 70 + 40}ms` }} /></div>
              <span>{m.label}</span></div>))}</div></section>
        <section className="card span2"><h2>Recent stock activity</h2>
          {recent.length ? <ul className="rank">{recent.map((r, i) => <li key={i}><span>{r.product} <span className={`chip ${MOVE_CHIP[r.type] || 'ok'}`}>{MOVE_LABELS[r.type] || r.type}</span></span><strong>{r.qty > 0 ? '+' : ''}{int(r.qty)} <small style={{ color: 'var(--muted)', fontWeight: 400 }}>{fmtDate(r.date)}</small></strong></li>)}</ul> : <p className="empty">No stock activity yet.</p>}</section>
        <section className="card"><h2>Needs restocking</h2>
          {lowList.length ? <ul className="rank">{lowList.map((p) => <li key={p.id}><span>{p.name}</span><strong className="chip low">{p.stock} left</strong></li>)}</ul> : <p className="empty">Everything is above its reorder level.</p>}</section>
      </div>
    </>
  );
}
