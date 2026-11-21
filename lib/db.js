import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

export const MODULES = ['products', 'categories', 'customers', 'suppliers', 'inventory', 'production', 'sales', 'purchase', 'finance', 'accounts', 'reports'];
const NOW = `strftime('%Y-%m-%dT%H:%M:%SZ','now')`;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin','manager','staff','viewer')), created_at TEXT DEFAULT (${NOW}));
CREATE TABLE IF NOT EXISTS rights (role TEXT NOT NULL CHECK (role IN ('manager','staff','viewer')), module TEXT NOT NULL,
  can_view INTEGER NOT NULL DEFAULT 0, can_create INTEGER NOT NULL DEFAULT 0, can_edit INTEGER NOT NULL DEFAULT 0, can_delete INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (role, module));
CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, description TEXT);
CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, sku TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL, price REAL NOT NULL DEFAULT 0, cost REAL NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0, reorder_level INTEGER NOT NULL DEFAULT 5, description TEXT);
CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT, phone TEXT, address TEXT);
CREATE TABLE IF NOT EXISTS suppliers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT, phone TEXT, address TEXT);
CREATE TABLE IF NOT EXISTS sales (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT, qty INTEGER NOT NULL, unit_price REAL NOT NULL, total REAL NOT NULL, created_at TEXT DEFAULT (${NOW}));
CREATE TABLE IF NOT EXISTS purchases (id INTEGER PRIMARY KEY AUTOINCREMENT, supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT, qty INTEGER NOT NULL, unit_cost REAL NOT NULL, total REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'ordered', created_at TEXT DEFAULT (${NOW}), received_at TEXT);
CREATE TABLE IF NOT EXISTS boms (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  component_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT, qty REAL NOT NULL, UNIQUE (product_id, component_id));
CREATE TABLE IF NOT EXISTS production_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'planned', note TEXT, created_at TEXT DEFAULT (${NOW}), completed_at TEXT);
CREATE TABLE IF NOT EXISTS stock_moves (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL, type TEXT NOT NULL, ref TEXT, note TEXT, user_name TEXT, balance INTEGER, created_at TEXT DEFAULT (${NOW}));
CREATE TABLE IF NOT EXISTS accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, type TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS journal (id INTEGER PRIMARY KEY AUTOINCREMENT, ref TEXT, memo TEXT, account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  debit REAL NOT NULL DEFAULT 0, credit REAL NOT NULL DEFAULT 0, created_at TEXT DEFAULT (${NOW}));
CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, category TEXT NOT NULL, description TEXT, amount REAL NOT NULL);
`;

// lines: [[accountCode, debit, credit], ...]
function postTo(db, ref, memo, lines, at) {
  const find = db.prepare('SELECT id FROM accounts WHERE code=?');
  const ins = db.prepare(`INSERT INTO journal (ref,memo,account_id,debit,credit,created_at) VALUES (?,?,?,?,?,COALESCE(?,${NOW}))`);
  lines.forEach(([code, dr, cr]) => { if (dr || cr) ins.run(ref, memo, find.get(code).id, dr, cr, at ?? null); });
}

function open() {
  const dir = path.join(process.cwd(), 'data');
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(path.join(dir, 'kimmustock.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  // older databases: rebuild users/rights so the new 'viewer' role is allowed
  const lacksViewer = (t) => !db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(t).sql.includes("'viewer'");
  if (lacksViewer('users')) db.exec(`BEGIN; ALTER TABLE users RENAME TO users_old;
    CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin','manager','staff','viewer')), created_at TEXT DEFAULT (${NOW}));
    INSERT INTO users (id,name,email,password_hash,role,created_at) SELECT id,name,email,password_hash,role,created_at FROM users_old;
    DROP TABLE users_old; COMMIT;`);
  if (lacksViewer('rights')) db.exec(`BEGIN; ALTER TABLE rights RENAME TO rights_old;
    CREATE TABLE rights (role TEXT NOT NULL CHECK (role IN ('manager','staff','viewer')), module TEXT NOT NULL,
      can_view INTEGER NOT NULL DEFAULT 0, can_create INTEGER NOT NULL DEFAULT 0, can_edit INTEGER NOT NULL DEFAULT 0, can_delete INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (role, module));
    INSERT INTO rights SELECT * FROM rights_old; DROP TABLE rights_old; COMMIT;`);
  const count = (t) => db.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n;

  if (!count('users')) db.prepare('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)').run('Kimmu', 'admin@kimmustock.com', bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Admin@123', 10), 'admin');

  const staff = { products: [1, 0, 0, 0], categories: [1, 0, 0, 0], customers: [1, 0, 0, 0], inventory: [1, 0, 0, 0], sales: [1, 1, 0, 0] };
  const rin = db.prepare('INSERT OR IGNORE INTO rights VALUES (?,?,?,?,?,?)');
  const viewer = { products: [1, 0, 0, 0], categories: [1, 0, 0, 0] };
  for (const role of ['manager', 'staff', 'viewer']) for (const m of MODULES)
    rin.run(role, m, ...(role === 'manager' ? [1, 1, 1, 0] : (role === 'staff' ? staff[m] : viewer[m]) || [0, 0, 0, 0]));

  db.exec(`INSERT OR IGNORE INTO accounts (code,name,type) VALUES ('1000','Cash and bank','asset'),('1200','Inventory','asset'),
    ('3000','Owner equity','equity'),('4000','Sales revenue','income'),('5000','Cost of goods sold','expense'),('5100','Operating expenses','expense')`);

  if (!count('categories')) {
    db.exec(`INSERT INTO categories (name, description) VALUES ('Beverages','Coffee, tea and cocoa'),('Bakery','Fresh and packaged'),('Stationery','Office supplies');
      INSERT INTO products (sku,name,category_id,price,cost,stock,reorder_level) VALUES
      ('BEV-001','Arabica Coffee 500g',1,42,28,40,10),('BEV-002','Dark Cocoa Powder',1,31,19,6,10),
      ('BAK-001','Almond Croissant Box',2,25,14,18,8),('STA-001','Leather Notebook A5',3,35,18,3,5)`);
  }
  if (!count('suppliers')) db.exec(`INSERT INTO suppliers (name,email,phone,address) VALUES ('Gulf Trading LLC','sales@gulftrading.example','+971 4 000 0000','Dubai, UAE')`);

  // keep history complete for stock that existed before tracking
  db.exec(`INSERT INTO stock_moves (product_id,qty,type,ref,note,user_name,balance)
    SELECT id,stock,'opening','OPEN','Opening stock','System',stock FROM products WHERE stock>0 AND id NOT IN (SELECT product_id FROM stock_moves)`);
  for (const s of db.prepare(`SELECT s.*, p.cost FROM sales s JOIN products p ON p.id=s.product_id
      WHERE 'SO-'||s.id NOT IN (SELECT ref FROM journal WHERE ref IS NOT NULL)`).all())
    postTo(db, `SO-${s.id}`, 'Sale', [['1000', s.total, 0], ['4000', 0, s.total], ['5000', s.cost * s.qty, 0], ['1200', 0, s.cost * s.qty]], s.created_at);
  return db;
}

export const db = globalThis.__kimmuDb || (globalThis.__kimmuDb = open());
export const post = (ref, memo, lines, at) => postTo(db, ref, memo, lines, at);
export const unpost = (ref) => db.prepare('DELETE FROM journal WHERE ref=?').run(ref);
