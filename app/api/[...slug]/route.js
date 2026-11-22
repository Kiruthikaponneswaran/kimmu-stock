import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db, MODULES, post, unpost } from '@/lib/db';

// Signing key: from JWT_SECRET, otherwise generated once and kept in the (git-ignored) data folder
function loadSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const f = path.join(process.cwd(), 'data', '.jwt-secret');
  try { return fs.readFileSync(f, 'utf8'); }
  catch { const s = crypto.randomBytes(32).toString('hex'); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); return s; }
}
const SECRET = loadSecret();
const fail = (status, message) => Object.assign(new Error(message), { status });
const clean = (v) => (v === '' || v === undefined ? null : v);
const ok = (data, status = 200) => NextResponse.json(data, { status });
const q = (sql, ...a) => db.prepare(sql).all(...a);
const one = (sql, ...a) => db.prepare(sql).get(...a);

/* ---------- auth + rights ---------- */
function authUser(req) {
  try { return jwt.verify((req.headers.get('authorization') || '').replace('Bearer ', ''), SECRET); }
  catch { throw fail(401, 'Please sign in again'); }
}
function need(user, mod, act) {
  if (user.role === 'admin') return;
  const r = one('SELECT * FROM rights WHERE role=? AND module=?', user.role, mod);
  if (!r || !r[`can_${act}`]) throw fail(403, 'You do not have access to this action');
}
const adminOnly = (user) => { if (user.role !== 'admin') throw fail(403, 'Admins only'); };
function rightsFor(role) {
  const out = {};
  if (role === 'admin') { MODULES.forEach((m) => (out[m] = { view: 1, create: 1, edit: 1, delete: 1 })); return out; }
  q('SELECT * FROM rights WHERE role=?', role).forEach((r) => (out[r.module] = { view: r.can_view, create: r.can_create, edit: r.can_edit, delete: r.can_delete }));
  return out;
}

/* ---------- stock + accounting helpers ---------- */
const log = (pid, qty, type, ref, note, user) =>
  db.prepare('INSERT INTO stock_moves (product_id,qty,type,ref,note,user_name,balance) VALUES (?,?,?,?,?,?,(SELECT stock FROM products WHERE id=?))')
    .run(pid, qty, type, ref, note ?? null, user?.name ?? 'System', pid);
const bump = (pid, qty, type, ref, note, user) => { db.prepare('UPDATE products SET stock=stock+? WHERE id=?').run(qty, pid); log(pid, qty, type, ref, note, user); };
const postExpense = (id, b) => post(`EXP-${id}`, b.description || b.category, [['5100', +b.amount, 0], ['1000', 0, +b.amount]], b.date ? `${b.date}T12:00:00Z` : null);

function fin() {
  const g = {};
  q(`SELECT a.code, COALESCE(SUM(j.debit),0) d, COALESCE(SUM(j.credit),0) c FROM accounts a LEFT JOIN journal j ON j.account_id=a.id GROUP BY a.id`).forEach((r) => (g[r.code] = r));
  const dr = (c) => (g[c] ? g[c].d - g[c].c : 0);
  const revenue = -dr('4000'), cogs = dr('5000'), opex = dr('5100');
  return { revenue, cogs, opex, gross: revenue - cogs, net: revenue - cogs - opex, cash: dr('1000'), inventory: dr('1200') };
}
function monthly() {
  const rows = q(`SELECT strftime('%Y-%m',j.created_at) m, a.code, SUM(j.debit) d, SUM(j.credit) c FROM journal j JOIN accounts a ON a.id=j.account_id
    WHERE a.code IN ('4000','5000','5100') AND date(j.created_at)>=date('now','start of month','-5 month') GROUP BY m, a.code`);
  const out = [];
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(); dt.setUTCDate(1); dt.setUTCMonth(dt.getUTCMonth() - i);
    const key = dt.toISOString().slice(0, 7), mine = rows.filter((r) => r.m === key);
    out.push({ label: dt.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' }),
      a: mine.filter((r) => r.code === '4000').reduce((s, r) => s + r.c - r.d, 0),
      b: mine.filter((r) => r.code !== '4000').reduce((s, r) => s + r.d - r.c, 0) });
  }
  return out;
}
function dashboard() {
  const days = Object.fromEntries(q(`SELECT date(created_at) d, SUM(total) t FROM sales WHERE date(created_at)>=date('now','-29 day') GROUP BY d`).map((r) => [r.d, r.t]));
  const trend = [];
  for (let i = 29; i >= 0; i--) {
    const dt = new Date(Date.now() - i * 864e5);
    trend.push({ label: dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' }), value: days[dt.toISOString().slice(0, 10)] || 0 });
  }
  const n = (sql) => one(sql).n;
  const total = n('SELECT COUNT(*) n FROM products'), low = n('SELECT COUNT(*) n FROM products WHERE stock<=reorder_level');
  return {
    fin: fin(), trend, monthly: monthly(),
    cats: q(`SELECT COALESCE(c.name,'Uncategorised') name, SUM(p.stock*CASE WHEN p.cost>0 THEN p.cost ELSE p.price END) value FROM products p
      LEFT JOIN categories c ON c.id=p.category_id GROUP BY c.id HAVING value>0 ORDER BY value DESC`),
    top: q('SELECT p.name, SUM(s.qty) value FROM sales s JOIN products p ON p.id=s.product_id GROUP BY p.id ORDER BY value DESC LIMIT 5'),
    lowList: q('SELECT id, name, stock, reorder_level FROM products WHERE stock<=reorder_level ORDER BY stock LIMIT 6'),
    recent: q(`SELECT m.created_at date, p.name product, m.type, m.qty FROM stock_moves m JOIN products p ON p.id=m.product_id ORDER BY m.id DESC LIMIT 8`),
    counts: { products: total, customers: n('SELECT COUNT(*) n FROM customers'), low,
      openPO: n("SELECT COUNT(*) n FROM purchases WHERE status='ordered'"), plannedMO: n("SELECT COUNT(*) n FROM production_orders WHERE status='planned'") },
    health: total ? Math.round(((total - low) / total) * 100) : 100,
  };
}

/* ---------- reports ---------- */
const range = (sp) => [sp.get('from') || '0000-01-01', sp.get('to') || '9999-12-31'];
function movesRows(sp) {
  const [f, t] = range(sp), pid = sp.get('product');
  return q(`SELECT m.id, m.created_at date, p.sku, p.name product, m.type, m.qty, m.balance, m.ref, m.note, m.user_name user FROM stock_moves m
    JOIN products p ON p.id=m.product_id WHERE date(m.created_at) BETWEEN ? AND ? ${pid ? 'AND m.product_id=?' : ''} ORDER BY m.id DESC LIMIT 1000`, f, t, ...(pid ? [pid] : []));
}
const REPORTS = {
  stock: { columns: [['sku', 'SKU'], ['name', 'Product'], ['category', 'Category'], ['stock', 'In stock', 'int'], ['reorder_level', 'Reorder level', 'int'], ['cost', 'Unit cost', 'money'], ['price', 'Selling price', 'money'], ['value', 'Stock value', 'money'], ['status', 'Status']],
    rows: () => q(`SELECT p.sku, p.name, COALESCE(c.name,'-') category, p.stock, p.reorder_level, p.cost, p.price, p.stock*p.cost value,
      CASE WHEN p.stock<=p.reorder_level THEN 'Low' ELSE 'OK' END status FROM products p LEFT JOIN categories c ON c.id=p.category_id ORDER BY p.name`) },
  movements: { columns: [['date', 'Date', 'date'], ['sku', 'SKU'], ['product', 'Product'], ['type', 'Type', 'movetype'], ['qty', 'Qty', 'signed'], ['balance', 'Balance', 'int'], ['ref', 'Reference'], ['note', 'Note'], ['user', 'By']], rows: movesRows },
  sales: { columns: [['date', 'Date', 'date'], ['invoice', 'Invoice'], ['customer', 'Customer'], ['product', 'Product'], ['qty', 'Qty', 'int'], ['unit_price', 'Unit price', 'money'], ['total', 'Total', 'money']],
    rows: (sp) => q(`SELECT s.created_at date, 'SO-'||s.id invoice, COALESCE(c.name,'Walk-in') customer, p.name product, s.qty, s.unit_price, s.total FROM sales s
      LEFT JOIN customers c ON c.id=s.customer_id JOIN products p ON p.id=s.product_id WHERE date(s.created_at) BETWEEN ? AND ? ORDER BY s.id DESC`, ...range(sp)) },
  purchases: { columns: [['date', 'Date', 'date'], ['po', 'Order'], ['supplier', 'Supplier'], ['product', 'Product'], ['qty', 'Qty', 'int'], ['unit_cost', 'Unit cost', 'money'], ['total', 'Total', 'money'], ['status', 'Status']],
    rows: (sp) => q(`SELECT pu.created_at date, 'PO-'||pu.id po, COALESCE(s.name,'-') supplier, p.name product, pu.qty, pu.unit_cost, pu.total, pu.status FROM purchases pu
      LEFT JOIN suppliers s ON s.id=pu.supplier_id JOIN products p ON p.id=pu.product_id WHERE date(pu.created_at) BETWEEN ? AND ? ORDER BY pu.id DESC`, ...range(sp)) },
  production: { columns: [['date', 'Date', 'date'], ['mo', 'Order'], ['product', 'Product'], ['qty', 'Qty', 'int'], ['status', 'Status'], ['completed_at', 'Completed', 'date']],
    rows: (sp) => q(`SELECT mo.created_at date, 'MO-'||mo.id mo, p.name product, mo.qty, mo.status, mo.completed_at FROM production_orders mo JOIN products p ON p.id=mo.product_id
      WHERE date(mo.created_at) BETWEEN ? AND ? ORDER BY mo.id DESC`, ...range(sp)) },
  pnl: { columns: [['item', 'Line'], ['amount', 'Amount', 'money']],
    rows: (sp) => {
      const [f, t] = range(sp);
      const s = (code) => { const r = one(`SELECT COALESCE(SUM(j.debit),0) d, COALESCE(SUM(j.credit),0) c FROM journal j JOIN accounts a ON a.id=j.account_id WHERE a.code=? AND date(j.created_at) BETWEEN ? AND ?`, code, f, t); return r; };
      const rev = s('4000').c - s('4000').d, cogs = s('5000').d - s('5000').c, ox = s('5100').d - s('5100').c;
      return [{ item: 'Sales revenue', amount: rev }, { item: 'Cost of goods sold', amount: cogs }, { item: 'Gross profit', amount: rev - cogs }, { item: 'Operating expenses', amount: ox }, { item: 'Net profit', amount: rev - cogs - ox }];
    } },
};

/* ---------- masters (generic CRUD, with hooks) ---------- */
const MASTERS = {
  categories: { table: 'categories', cols: ['name', 'description'] },
  customers: { table: 'customers', cols: ['name', 'email', 'phone', 'address'] },
  suppliers: { table: 'suppliers', cols: ['name', 'email', 'phone', 'address'] },
  products: {
    table: 'products', cols: ['sku', 'name', 'category_id', 'price', 'cost', 'stock', 'reorder_level', 'description', 'image_url'],
    list: 'SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id=p.category_id ORDER BY p.id DESC',
    created: (id, b, u) => { if (+b.stock > 0) log(id, +b.stock, 'opening', 'OPEN', 'Opening stock', u); },
    updated: (id, b, u, old) => { const d = Number(b.stock) - old.stock; if (d) log(id, d, 'adjustment', 'EDIT', 'Changed in product master', u); },
  },
  chart: { table: 'accounts', module: 'accounts', cols: ['code', 'name', 'type'], list: 'SELECT * FROM accounts ORDER BY code' },
  expenses: {
    table: 'expenses', module: 'finance', cols: ['date', 'category', 'description', 'amount'], list: 'SELECT * FROM expenses ORDER BY date DESC, id DESC',
    created: (id, b) => postExpense(id, b), updated: (id, b) => { unpost(`EXP-${id}`); postExpense(id, b); }, removed: (id) => unpost(`EXP-${id}`),
  },
  boms: {
    table: 'boms', module: 'production', cols: ['product_id', 'component_id', 'qty'],
    list: 'SELECT b.*, p.name product_name, c.name component_name FROM boms b JOIN products p ON p.id=b.product_id JOIN products c ON c.id=b.component_id ORDER BY b.id DESC',
  },
};

/* ---------- transactions ---------- */
const sellTx = db.transaction((b, qty, user) => {
  const p = one('SELECT * FROM products WHERE id=?', b.product_id);
  if (!p) throw fail(404, 'Product not found');
  if (p.stock < qty) throw fail(400, `Only ${p.stock} in stock for ${p.name}`);
  const id = db.prepare('INSERT INTO sales (customer_id, product_id, qty, unit_price, total) VALUES (?,?,?,?,?)').run(clean(b.customer_id), p.id, qty, p.price, p.price * qty).lastInsertRowid;
  bump(p.id, -qty, 'sale', `SO-${id}`, 'Sold', user);
  post(`SO-${id}`, `Sale of ${p.name}`, [['1000', p.price * qty, 0], ['4000', 0, p.price * qty], ['5000', p.cost * qty, 0], ['1200', 0, p.cost * qty]]);
});
const receiveTx = db.transaction((id, user) => {
  const po = one('SELECT * FROM purchases WHERE id=?', id);
  if (!po) throw fail(404, 'Order not found');
  if (po.status === 'received') throw fail(400, 'This order is already received');
  bump(po.product_id, po.qty, 'purchase', `PO-${id}`, 'Goods received', user);
  db.prepare('UPDATE products SET cost=? WHERE id=?').run(po.unit_cost, po.product_id);
  db.prepare("UPDATE purchases SET status='received', received_at=strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id=?").run(id);
  post(`PO-${id}`, 'Goods received', [['1200', po.total, 0], ['1000', 0, po.total]]);
});
const produceTx = db.transaction((id, user) => {
  const mo = one('SELECT * FROM production_orders WHERE id=?', id);
  if (!mo) throw fail(404, 'Order not found');
  if (mo.status === 'completed') throw fail(400, 'This order is already completed');
  const parts = q('SELECT b.qty, c.* FROM boms b JOIN products c ON c.id=b.component_id WHERE b.product_id=?', mo.product_id);
  if (!parts.length) throw fail(400, 'Add a bill of materials for this product first');
  let unitCost = 0;
  for (const c of parts) {
    const need = Math.ceil(c.qty * mo.qty);
    if (c.stock < need) throw fail(400, `Not enough ${c.name}: need ${need}, have ${c.stock}`);
    bump(c.id, -need, 'production_out', `MO-${id}`, 'Used in production', user);
    unitCost += c.cost * c.qty;
  }
  bump(mo.product_id, mo.qty, 'production_in', `MO-${id}`, 'Produced', user);
  if (unitCost > 0) db.prepare('UPDATE products SET cost=? WHERE id=?').run(unitCost, mo.product_id);
  db.prepare("UPDATE production_orders SET status='completed', completed_at=strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id=?").run(id);
});

/* ---------- request handler ---------- */
async function handle(req, { params }) {
  const [mod, id, action] = (await params).slug;
  const m = req.method, sp = new URL(req.url).searchParams;
  try {
    if (mod === 'auth' && id === 'login' && m === 'POST') {
      const { email, password } = await req.json();
      const u = one('SELECT * FROM users WHERE email=?', (email || '').trim().toLowerCase());
      if (!u || !bcrypt.compareSync(password || '', u.password_hash)) throw fail(401, 'Email or password is incorrect');
      const token = jwt.sign({ id: u.id, role: u.role, name: u.name }, SECRET, { expiresIn: '8h' });
      return ok({ token, user: { id: u.id, name: u.name, email: u.email, role: u.role }, rights: rightsFor(u.role) });
    }
    if (mod === 'auth' && id === 'signup' && m === 'POST') {
      const { name, email, password } = await req.json();
      const mail = (email || '').trim().toLowerCase();
      if (!(name || '').trim() || !/^\S+@\S+\.\S+$/.test(mail)) throw fail(400, 'Enter your name and a valid email address');
      if ((password || '').length < 8) throw fail(400, 'Password must be at least 8 characters');
      if (one('SELECT id FROM users WHERE email=?', mail)) throw fail(400, 'An account with this email already exists');
      const rid = db.prepare('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)').run(name.trim(), mail, bcrypt.hashSync(password, 10), 'viewer').lastInsertRowid;
      const token = jwt.sign({ id: Number(rid), role: 'viewer', name: name.trim() }, SECRET, { expiresIn: '8h' });
      return ok({ token, user: { id: Number(rid), name: name.trim(), email: mail, role: 'viewer' }, rights: rightsFor('viewer') }, 201);
    }
    const user = authUser(req);
    const body = m === 'POST' || m === 'PUT' ? await req.json().catch(() => ({})) : {};

    if (mod === 'dashboard') {
      const dd = dashboard();
      return ok(user.role === 'viewer' ? { restricted: true, counts: dd.counts, top: dd.top, lowList: dd.lowList, health: dd.health } : dd);
    }
    if (mod === 'finance' && id === 'summary') { need(user, 'finance', 'view'); return ok({ ...fin(), monthly: monthly() }); }

    if (mod === 'accounts' && m === 'GET') {
      need(user, 'accounts', 'view');
      if (id === 'ledger') return ok(q(`SELECT j.id, j.created_at date, j.ref, j.memo, a.code, a.name account, j.debit, j.credit FROM journal j JOIN accounts a ON a.id=j.account_id ORDER BY j.id DESC LIMIT 1000`));
      if (id === 'trial') return ok(q(`SELECT a.code, a.name, a.type, COALESCE(SUM(j.debit),0) debit, COALESCE(SUM(j.credit),0) credit FROM accounts a LEFT JOIN journal j ON j.account_id=a.id GROUP BY a.id ORDER BY a.code`));
    }
    if (mod === 'reports' && m === 'GET') {
      need(user, 'reports', 'view');
      const r = REPORTS[id];
      if (!r) throw fail(404, 'Unknown report');
      return ok({ columns: r.columns.map(([key, label, type]) => ({ key, label, type })), rows: r.rows(sp) });
    }

    if (mod === 'inventory') {
      if (id === 'stock' && m === 'GET') {
        need(user, 'inventory', 'view');
        return ok(q(`SELECT p.id, p.sku, p.name, c.name category_name, p.stock, p.reorder_level, p.cost, p.price, p.stock*p.cost value FROM products p LEFT JOIN categories c ON c.id=p.category_id ORDER BY p.name`));
      }
      if (id === 'moves' && m === 'GET') { need(user, 'inventory', 'view'); return ok(movesRows(sp)); }
      if (id === 'adjust' && m === 'POST') {
        need(user, 'inventory', 'create');
        const qty = parseInt(body.qty, 10), p = one('SELECT * FROM products WHERE id=?', body.product_id);
        if (!p || !qty) throw fail(400, 'Choose a product and enter a quantity (use a minus sign to reduce stock)');
        if (p.stock + qty < 0) throw fail(400, `Stock cannot go below zero. ${p.name} has ${p.stock}.`);
        db.transaction(() => bump(p.id, qty, 'adjustment', 'ADJ', body.note || 'Manual adjustment', user))();
        return ok({ ok: true });
      }
    }

    if (mod === 'purchases') {
      if (m === 'GET') return need(user, 'purchase', 'view'), ok(q(`SELECT pu.*, s.name supplier_name, p.name product_name FROM purchases pu LEFT JOIN suppliers s ON s.id=pu.supplier_id JOIN products p ON p.id=pu.product_id ORDER BY pu.id DESC LIMIT 300`));
      if (m === 'POST' && !id) {
        need(user, 'purchase', 'create');
        const qty = parseInt(body.qty, 10), cost = Number(body.unit_cost);
        if (!body.product_id || !(qty > 0) || !(cost >= 0)) throw fail(400, 'Choose a product, a quantity above 0 and a unit cost');
        const r = db.prepare('INSERT INTO purchases (supplier_id, product_id, qty, unit_cost, total) VALUES (?,?,?,?,?)').run(clean(body.supplier_id), body.product_id, qty, cost, qty * cost);
        return ok({ id: Number(r.lastInsertRowid) }, 201);
      }
      if (m === 'POST' && action === 'receive') { need(user, 'purchase', 'edit'); receiveTx(id, user); return ok({ ok: true }); }
      if (m === 'DELETE' && id) {
        need(user, 'purchase', 'delete');
        if (one('SELECT status FROM purchases WHERE id=?', id)?.status === 'received') throw fail(400, 'Received orders cannot be deleted');
        db.prepare('DELETE FROM purchases WHERE id=?').run(id);
        return ok({ ok: true });
      }
    }

    if (mod === 'production') {
      if (m === 'GET') return need(user, 'production', 'view'), ok(q(`SELECT mo.*, p.name product_name FROM production_orders mo JOIN products p ON p.id=mo.product_id ORDER BY mo.id DESC LIMIT 300`));
      if (m === 'POST' && !id) {
        need(user, 'production', 'create');
        const qty = parseInt(body.qty, 10);
        if (!body.product_id || !(qty > 0)) throw fail(400, 'Choose a product and a quantity above 0');
        const r = db.prepare('INSERT INTO production_orders (product_id, qty, note) VALUES (?,?,?)').run(body.product_id, qty, clean(body.note));
        return ok({ id: Number(r.lastInsertRowid) }, 201);
      }
      if (m === 'POST' && action === 'complete') { need(user, 'production', 'edit'); produceTx(id, user); return ok({ ok: true }); }
      if (m === 'DELETE' && id) {
        need(user, 'production', 'delete');
        if (one('SELECT status FROM production_orders WHERE id=?', id)?.status === 'completed') throw fail(400, 'Completed orders cannot be deleted');
        db.prepare('DELETE FROM production_orders WHERE id=?').run(id);
        return ok({ ok: true });
      }
    }

    if (mod === 'sales') {
      if (m === 'GET') return need(user, 'sales', 'view'), ok(q(`SELECT s.*, 'SO-'||s.id invoice, c.name AS customer_name, p.name AS product_name FROM sales s
        LEFT JOIN customers c ON c.id=s.customer_id JOIN products p ON p.id=s.product_id ORDER BY s.id DESC LIMIT 300`));
      if (m === 'POST') {
        need(user, 'sales', 'create');
        const qty = parseInt(body.qty, 10);
        if (!body.product_id || !(qty > 0)) throw fail(400, 'Choose a product and a quantity above 0');
        sellTx(body, qty, user);
        return ok({ ok: true }, 201);
      }
      if (m === 'DELETE' && id) {
        need(user, 'sales', 'delete');
        const s = one('SELECT * FROM sales WHERE id=?', id);
        if (s) db.transaction(() => { bump(s.product_id, s.qty, 'sale_return', `SO-${s.id}`, 'Sale deleted', user); unpost(`SO-${s.id}`); db.prepare('DELETE FROM sales WHERE id=?').run(s.id); })();
        return ok({ ok: true });
      }
    }

    if (MASTERS[mod]) {
      const { table, cols, list, created, updated, removed, module } = MASTERS[mod], perm = module || mod;
      if (m === 'GET') {
        need(user, perm, 'view');
        const rows = q(list || `SELECT * FROM ${table} ORDER BY id DESC`);
        return ok(user.role === 'viewer' && table === 'products' ? rows.map((x) => ({ ...x, cost: 0 })) : rows);
      }
      if (m === 'POST') {
        need(user, perm, 'create');
        const nid = Number(db.transaction(() => {
          const r = db.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...cols.map((c) => clean(body[c])));
          created?.(Number(r.lastInsertRowid), body, user);
          return r.lastInsertRowid;
        })());
        return ok({ id: nid }, 201);
      }
      if (m === 'PUT' && id) {
        need(user, perm, 'edit');
        db.transaction(() => {
          const old = one(`SELECT * FROM ${table} WHERE id=?`, id);
          db.prepare(`UPDATE ${table} SET ${cols.map((c) => `${c}=?`).join(',')} WHERE id=?`).run(...cols.map((c) => clean(body[c])), id);
          updated?.(Number(id), body, user, old);
        })();
        return ok({ id: Number(id) });
      }
      if (m === 'DELETE' && id) {
        need(user, perm, 'delete');
        db.transaction(() => { db.prepare(`DELETE FROM ${table} WHERE id=?`).run(id); removed?.(Number(id)); })();
        return ok({ ok: true });
      }
    }

    if (mod === 'users') {
      adminOnly(user);
      if (m === 'GET') return ok(q('SELECT id,name,email,role,created_at FROM users ORDER BY id'));
      if (m === 'POST') {
        if (!body.name || !body.email || !body.password) throw fail(400, 'Name, email and password are required');
        const r = db.prepare('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)').run(body.name, body.email, bcrypt.hashSync(body.password, 10), body.role || 'staff');
        return ok({ id: Number(r.lastInsertRowid) }, 201);
      }
      if (m === 'PUT' && id) {
        db.prepare('UPDATE users SET name=?, email=?, role=? WHERE id=?').run(body.name, body.email, body.role, id);
        if (body.password) db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(body.password, 10), id);
        return ok({ id: Number(id) });
      }
      if (m === 'DELETE' && id) {
        if (Number(id) === user.id) throw fail(400, 'You cannot delete your own account');
        db.prepare('DELETE FROM users WHERE id=?').run(id);
        return ok({ ok: true });
      }
    }
    if (mod === 'rights') {
      adminOnly(user);
      if (m === 'GET') return ok(q('SELECT * FROM rights ORDER BY role, module'));
      if (m === 'PUT') {
        const up = db.prepare(`INSERT INTO rights (role,module,can_view,can_create,can_edit,can_delete) VALUES (?,?,?,?,?,?)
          ON CONFLICT(role,module) DO UPDATE SET can_view=excluded.can_view, can_create=excluded.can_create, can_edit=excluded.can_edit, can_delete=excluded.can_delete`);
        db.transaction((rows) => rows.forEach((r) => up.run(r.role, r.module, +!!r.can_view, +!!r.can_create, +!!r.can_edit, +!!r.can_delete)))(body.rows || []);
        return ok({ ok: true });
      }
    }
    throw fail(404, 'Not found');
  } catch (e) {
    const c = e.code || '';
    const message = e.status ? e.message
      : c === 'SQLITE_CONSTRAINT_UNIQUE' ? 'That value already exists'
      : c === 'SQLITE_CONSTRAINT_FOREIGNKEY' ? 'This record is in use and cannot be deleted'
      : c === 'SQLITE_CONSTRAINT_NOTNULL' ? 'Please fill in all required fields'
      : c === 'SQLITE_CONSTRAINT_CHECK' ? 'One of the values is not allowed'
      : 'Something went wrong';
    if (!e.status) console.error(e);
    return ok({ message }, e.status || 500);
  }
}
export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
