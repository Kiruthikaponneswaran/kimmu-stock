'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { money, fmtDate } from '@/lib/format';
import { exportXlsx } from '@/lib/exportXlsx';
import Table from '@/components/Table';
import CrudPage from '@/components/CrudPage';
import { chartCrud } from '@/store';

const chartFields = [
  { key: 'code', label: 'Code', required: true }, { key: 'name', label: 'Account name', required: true },
  { key: 'type', label: 'Type', required: true, options: ['asset', 'liability', 'equity', 'income', 'expense'] },
];

export default function Accounts() {
  const [tab, setTab] = useState('ledger'); const [ledger, setLedger] = useState([]); const [trial, setTrial] = useState([]); const [err, setErr] = useState('');
  useEffect(() => { api('/accounts/ledger').then(setLedger).catch((e) => setErr(e.message)); api('/accounts/trial').then(setTrial).catch(() => {}); }, []);
  const td = trial.reduce((a, r) => a + r.debit, 0), tc = trial.reduce((a, r) => a + r.credit, 0);
  const ledgerCols = [{ label: 'Date', render: (r) => fmtDate(r.date) }, { key: 'ref', label: 'Reference' }, { key: 'memo', label: 'Description' }, { label: 'Account', render: (r) => `${r.code} ${r.account}` },
    { label: 'Debit', render: (r) => (r.debit ? money(r.debit) : '-') }, { label: 'Credit', render: (r) => (r.credit ? money(r.credit) : '-') }];
  const trialCols = [{ key: 'code', label: 'Code' }, { key: 'name', label: 'Account' }, { key: 'type', label: 'Type' }, { label: 'Debit', render: (r) => money(r.debit) }, { label: 'Credit', render: (r) => money(r.credit) }];
  const exp = () => (tab === 'ledger'
    ? exportXlsx('Ledger', [{ key: 'date', label: 'Date', exp: (r) => fmtDate(r.date) }, { key: 'ref', label: 'Reference' }, { key: 'memo', label: 'Description' }, { key: 'account', label: 'Account' }, { key: 'debit', label: 'Debit' }, { key: 'credit', label: 'Credit' }], ledger)
    : exportXlsx('Trial-balance', [{ key: 'code', label: 'Code' }, { key: 'name', label: 'Account' }, { key: 'type', label: 'Type' }, { key: 'debit', label: 'Debit' }, { key: 'credit', label: 'Credit' }], trial));
  return (
    <>
      {tab !== 'chart' && <div className="page-head"><h1>Ledger and accounts</h1><button className="btn" onClick={exp}>Export Excel</button></div>}
      <div className="tabs">{[['ledger', 'General ledger'], ['trial', 'Trial balance'], ['chart', 'Chart of accounts']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      {err && <p className="error">{err}</p>}
      {tab === 'ledger' && <Table columns={ledgerCols} rows={ledger} empty="No entries yet. Sales, purchases and expenses post here automatically." />}
      {tab === 'trial' && <><Table columns={trialCols} rows={trial} />
        <p className={td.toFixed(2) === tc.toFixed(2) ? 'success' : 'error'}>Total debit {money(td)} | Total credit {money(tc)} {td.toFixed(2) === tc.toFixed(2) ? '(balanced)' : '(not balanced)'}</p></>}
      {tab === 'chart' && <CrudPage title="Chart of accounts" singular="account" module="accounts" sliceName="chart" crud={chartCrud} fields={chartFields} />}
    </>
  );
}
