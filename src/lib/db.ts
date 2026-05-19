import initSqlJs, { type Database, type SqlJsStatic, type Statement } from "sql.js";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

type Row = Record<string, unknown>;

declare global {
  var __pp_sqljs: { SQL: SqlJsStatic; db: Database } | undefined;
}

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "dev.sqlite");

async function loadSqlJs() {
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
  });
  return SQL;
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function readDbFile() {
  try {
    return fs.readFileSync(DB_FILE);
  } catch {
    return null;
  }
}

function writeDbFile(database: Database) {
  ensureDir(DB_DIR);
  const binary = database.export();
  fs.writeFileSync(DB_FILE, Buffer.from(binary));
}

function rowsFromStmt(stmt: Statement) {
  const results: Row[] = [];
  const cols = stmt.getColumnNames();
  while (stmt.step()) {
    const row = stmt.get();
    const obj: Row = {};
    for (let i = 0; i < cols.length; i++) obj[cols[i]] = row[i];
    results.push(obj);
  }
  return results;
}

async function getDb() {
  if (global.__pp_sqljs) return global.__pp_sqljs;
  const SQL = await loadSqlJs();
  const file = readDbFile();
  const db = file ? new SQL.Database(file) : new SQL.Database();
  global.__pp_sqljs = { SQL, db };
  await ensureSchema(db);
  return global.__pp_sqljs;
}

async function ensureSchema(db: Database) {
  db.run(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      address TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'CUSTOMER',
      email_verified INTEGER NOT NULL DEFAULT 0,
      email_verify_code TEXT,
      email_verify_code_expires INTEGER,
      reset_code TEXT,
      reset_code_expires INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      meta_json TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS packages (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      price_bdt INTEGER NOT NULL,
      storage_gb INTEGER NOT NULL,
      bandwidth_gb INTEGER NOT NULL,
      features TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      package_id TEXT NOT NULL,
      domain TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT,
      duration_mo INTEGER NOT NULL,
      amount_bdt INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      method TEXT NOT NULL,
      sender_number TEXT NOT NULL,
      trx_id TEXT NOT NULL,
      amount_bdt INTEGER NOT NULL,
      screenshot_url TEXT,
      status TEXT NOT NULL DEFAULT 'SUBMITTED',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      UNIQUE(method, trx_id)
    );

    CREATE TABLE IF NOT EXISTS mobile_settings (
      id TEXT PRIMARY KEY,
      bkash_number TEXT NOT NULL,
      nagad_number TEXT NOT NULL,
      rocket_number TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // Backfill / migrate legacy tables if they were created before new columns existed.
  const userCols = rowsFromStmt(db.prepare(`PRAGMA table_info(users)`)).map((r) => r.name as string);
  if (!userCols.includes("username")) {
    db.run(`ALTER TABLE users ADD COLUMN username TEXT`);
    // Fill username from email prefix if possible.
    db.run(`UPDATE users SET username = COALESCE(username, substr(email, 1, instr(email, '@') - 1)) WHERE username IS NULL`);
    // Enforce non-null by filling any remaining.
    db.run(`UPDATE users SET username = COALESCE(username, id) WHERE username IS NULL`);
    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS users_username_idx ON users(username)`);
  }

  // Make email optional (store empty string for legacy, and index only non-empty).
  // If existing schema requires NOT NULL email, we keep column but allow empty.
  db.run(`UPDATE users SET email = '' WHERE email IS NULL`);
  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS users_email_nonempty_idx ON users(email) WHERE email <> ''`);

  const orderCols = rowsFromStmt(db.prepare(`PRAGMA table_info(orders)`)).map((r) => r.name as string);
  if (!orderCols.includes("customer_name")) {
    db.run(`ALTER TABLE orders ADD COLUMN customer_name TEXT`);
    db.run(`ALTER TABLE orders ADD COLUMN customer_phone TEXT`);
    db.run(`ALTER TABLE orders ADD COLUMN customer_email TEXT`);
    // Backfill from user if possible.
    db.run(`
      UPDATE orders
      SET customer_name = COALESCE(customer_name, (SELECT name FROM users u WHERE u.id = orders.user_id)),
          customer_phone = COALESCE(customer_phone, (SELECT phone FROM users u WHERE u.id = orders.user_id), ''),
          customer_email = COALESCE(customer_email, (SELECT email FROM users u WHERE u.id = orders.user_id), '')
      WHERE customer_name IS NULL OR customer_phone IS NULL OR customer_email IS NULL
    `);
    db.run(`UPDATE orders SET customer_name = COALESCE(customer_name, 'Customer') WHERE customer_name IS NULL`);
    db.run(`UPDATE orders SET customer_phone = COALESCE(customer_phone, '') WHERE customer_phone IS NULL`);
    db.run(`UPDATE orders SET customer_email = COALESCE(customer_email, '') WHERE customer_email IS NULL`);
  }

  const stmt = db.prepare(`SELECT id FROM mobile_settings WHERE id = 'default' LIMIT 1`);
  const has = stmt.step();
  stmt.free();
  if (!has) {
    const now = Date.now();
    db.run(
      `INSERT INTO mobile_settings (id, bkash_number, nagad_number, rocket_number, created_at, updated_at)
       VALUES ('default', '', '', '', ?, ?)`,
      [now, now],
    );
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME ?? "Admin";
  if (adminEmail && adminPassword) {
    const stmt2 = db.prepare(`SELECT id FROM users WHERE email = ? LIMIT 1`);
    stmt2.bind([adminEmail]);
    const rows = rowsFromStmt(stmt2);
    stmt2.free();
    if (!rows[0]) {
      const id = uuid();
      const now = Date.now();
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(adminPassword, salt);
      db.run(
        `INSERT INTO users (id, name, email, password_hash, role, email_verified, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'ADMIN', 1, ?, ?)`,
        [id, adminName, adminEmail, passwordHash, now, now],
      );
      console.log(`[seed] created admin user: ${adminEmail}`);
    }
  }

  // Always ensure default admin credentials exist: username=admin, password=admin123
  {
    const stmt3 = db.prepare(`SELECT id FROM users WHERE username = 'admin' LIMIT 1`);
    const hasAdmin = stmt3.step();
    stmt3.free();
    if (!hasAdmin) {
      const id = uuid();
      const now = Date.now();
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash("admin123", salt);
      db.run(
        `INSERT INTO users (id, name, username, email, phone, password_hash, role, email_verified, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'ADMIN', 1, ?, ?)`,
        [id, "Admin", "admin", "admin@local", "admin", passwordHash, now, now],
      );
      console.log("[seed] created default admin user: username=admin password=admin123");
    }
  }

  writeDbFile(db);
}

function uuid() {
  return crypto.randomUUID();
}

function nowMs() {
  return Date.now();
}

function mapUser(row: Row) {
  return {
    id: row.id as string,
    name: row.name as string,
    username: (row.username as string) ?? (row.id as string),
    email: row.email as string,
    phone: (row.phone as string | null) ?? undefined,
    address: (row.address as string | null) ?? undefined,
    passwordHash: row.password_hash as string,
    role: row.role as "CUSTOMER" | "ADMIN" | "SUPPORT",
    emailVerified: Boolean(row.email_verified),
    emailVerifyCode: (row.email_verify_code as string | null) ?? null,
    emailVerifyCodeExpires: (row.email_verify_code_expires as number | null) ?? null,
    resetCode: (row.reset_code as string | null) ?? null,
    resetCodeExpires: (row.reset_code_expires as number | null) ?? null,
  };
}

function mapPackage(row: Row) {
  return {
    id: row.id as string,
    title: row.title as string,
    type: row.type as string,
    priceBdt: row.price_bdt as number,
    storageGb: row.storage_gb as number,
    bandwidthGb: row.bandwidth_gb as number,
    features: row.features as string,
    isActive: Boolean(row.is_active),
    createdAt: new Date(row.created_at as number),
    updatedAt: new Date(row.updated_at as number),
  };
}

function mapOrder(row: Row) {
  return {
    id: row.id as string,
    userId: (row.user_id as string | null) ?? null,
    packageId: row.package_id as string,
    domain: row.domain as string,
    customerName: (row.customer_name as string) ?? "Customer",
    customerPhone: (row.customer_phone as string) ?? "",
    customerEmail: (row.customer_email as string) ?? "",
    durationMo: row.duration_mo as number,
    amountBdt: row.amount_bdt as number,
    status: row.status as string,
    createdAt: new Date(row.created_at as number),
    updatedAt: new Date(row.updated_at as number),
  };
}

function mapPayment(row: Row) {
  return {
    id: row.id as string,
    orderId: row.order_id as string,
    method: row.method as string,
    senderNumber: row.sender_number as string,
    trxId: row.trx_id as string,
    amountBdt: row.amount_bdt as number,
    screenshotUrl: (row.screenshot_url as string | null) ?? null,
    status: row.status as string,
    createdAt: new Date(row.created_at as number),
    updatedAt: new Date(row.updated_at as number),
  };
}

export const db = {
  async logsAdd(level: "INFO" | "WARN" | "ERROR", message: string, meta?: unknown) {
    const { db } = await getDb();
    const id = uuid();
    const now = nowMs();
    db.run(
      `INSERT INTO logs (id, level, message, meta_json, created_at) VALUES (?, ?, ?, ?, ?)`,
      [id, level, message, meta ? JSON.stringify(meta) : null, now],
    );
    writeDbFile(db);
  },

  async logsList(limit = 100) {
    const { db } = await getDb();
    const stmt = db.prepare(`SELECT * FROM logs ORDER BY created_at DESC LIMIT ?`);
    stmt.bind([limit]);
    const rows = rowsFromStmt(stmt);
    stmt.free();
    return rows.map((r) => ({
      id: r.id as string,
      level: r.level as string,
      message: r.message as string,
      meta: r.meta_json ? JSON.parse(r.meta_json as string) : null,
      createdAt: new Date(r.created_at as number),
    }));
  },

  async usersFindByEmail(email: string) {
    const { db } = await getDb();
    const stmt = db.prepare(`SELECT * FROM users WHERE email = ? LIMIT 1`);
    stmt.bind([email]);
    const rows = rowsFromStmt(stmt);
    stmt.free();
    return rows[0] ? mapUser(rows[0]) : null;
  },

  async usersFindByUsername(username: string) {
    const { db } = await getDb();
    const stmt = db.prepare(`SELECT * FROM users WHERE username = ? LIMIT 1`);
    stmt.bind([username]);
    const rows = rowsFromStmt(stmt);
    stmt.free();
    return rows[0] ? mapUser(rows[0]) : null;
  },

  async usersFindById(id: string) {
    const { db } = await getDb();
    const stmt = db.prepare(`SELECT * FROM users WHERE id = ? LIMIT 1`);
    stmt.bind([id]);
    const rows = rowsFromStmt(stmt);
    stmt.free();
    return rows[0] ? mapUser(rows[0]) : null;
  },

  async usersCreate(data: {
    name: string;
    username: string;
    email: string;
    phone?: string;
    passwordHash: string;
    role?: "CUSTOMER" | "ADMIN" | "SUPPORT";
    emailVerified?: boolean;
    emailVerifyCode?: string;
    emailVerifyCodeExpires?: number;
  }) {
    const { db } = await getDb();
    const id = uuid();
    const now = nowMs();
    db.run(
      `INSERT INTO users (id, name, username, email, phone, password_hash, role, email_verified, email_verify_code, email_verify_code_expires, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.name,
        data.username,
        data.email,
        data.phone ?? null,
        data.passwordHash,
        data.role ?? "CUSTOMER",
        data.emailVerified ? 1 : 0,
        data.emailVerifyCode ?? null,
        data.emailVerifyCodeExpires ?? null,
        now,
        now,
      ],
    );
    writeDbFile(db);
    return { id, email: data.email, name: data.name };
  },

  async usersUpdateById(id: string, data: Partial<{
    name: string;
    phone: string | null;
    address: string | null;
    passwordHash: string;
    role: "CUSTOMER" | "ADMIN" | "SUPPORT";
    emailVerified: boolean;
    emailVerifyCode: string | null;
    emailVerifyCodeExpires: number | null;
    resetCode: string | null;
    resetCodeExpires: number | null;
  }>) {
    const { db } = await getDb();
    const now = nowMs();
    const existing = await this.usersFindById(id);
    if (!existing) throw new Error("NOT_FOUND");
    const name = data.name ?? existing.name;
    const phone = data.phone === undefined ? existing.phone ?? null : data.phone;
    const address = data.address === undefined ? existing.address ?? null : data.address;
    const passwordHash = data.passwordHash ?? existing.passwordHash;
    const role = data.role ?? existing.role;
    const emailVerified = data.emailVerified ?? existing.emailVerified;
    const emailVerifyCode =
      data.emailVerifyCode === undefined ? existing.emailVerifyCode : data.emailVerifyCode;
    const emailVerifyCodeExpires =
      data.emailVerifyCodeExpires === undefined
        ? existing.emailVerifyCodeExpires
        : data.emailVerifyCodeExpires;
    const resetCode = data.resetCode === undefined ? existing.resetCode : data.resetCode;
    const resetCodeExpires =
      data.resetCodeExpires === undefined ? existing.resetCodeExpires : data.resetCodeExpires;
    db.run(
      `UPDATE users SET name=?, phone=?, address=?, password_hash=?, role=?, email_verified=?, email_verify_code=?, email_verify_code_expires=?, reset_code=?, reset_code_expires=?, updated_at=? WHERE id=?`,
      [
        name,
        phone,
        address,
        passwordHash,
        role,
        emailVerified ? 1 : 0,
        emailVerifyCode ?? null,
        emailVerifyCodeExpires ?? null,
        resetCode ?? null,
        resetCodeExpires ?? null,
        now,
        id,
      ],
    );
    writeDbFile(db);
    return this.usersFindById(id);
  },

  async packagesFindActive(opts?: { take?: number }) {
    const { db } = await getDb();
    const takeSql = opts?.take ? ` LIMIT ${opts.take}` : "";
    const stmt = db.prepare(
      `SELECT * FROM packages WHERE is_active = 1 ORDER BY created_at DESC${takeSql}`,
    );
    const rows = rowsFromStmt(stmt);
    stmt.free();
    return rows.map(mapPackage);
  },

  async packagesFindById(id: string) {
    const { db } = await getDb();
    const stmt = db.prepare(`SELECT * FROM packages WHERE id = ? LIMIT 1`);
    stmt.bind([id]);
    const rows = rowsFromStmt(stmt);
    stmt.free();
    return rows[0] ? mapPackage(rows[0]) : null;
  },

  async packagesCreate(data: {
    title: string;
    type: string;
    priceBdt: number;
    storageGb: number;
    bandwidthGb: number;
    features: string;
    isActive?: boolean;
  }) {
    const { db } = await getDb();
    const id = uuid();
    const now = nowMs();
    db.run(
      `INSERT INTO packages (id, title, type, price_bdt, storage_gb, bandwidth_gb, features, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.title,
        data.type,
        data.priceBdt,
        data.storageGb,
        data.bandwidthGb,
        data.features,
        data.isActive === false ? 0 : 1,
        now,
        now,
      ],
    );
    writeDbFile(db);
    return this.packagesFindById(id);
  },

  async packagesUpdateById(id: string, data: Partial<{
    title: string;
    type: string;
    priceBdt: number;
    storageGb: number;
    bandwidthGb: number;
    features: string;
    isActive: boolean;
  }>) {
    const { db } = await getDb();
    const existing = await this.packagesFindById(id);
    if (!existing) throw new Error("NOT_FOUND");
    const now = nowMs();
    db.run(
      `UPDATE packages SET title=?, type=?, price_bdt=?, storage_gb=?, bandwidth_gb=?, features=?, is_active=?, updated_at=? WHERE id=?`,
      [
        data.title ?? existing.title,
        data.type ?? existing.type,
        data.priceBdt ?? existing.priceBdt,
        data.storageGb ?? existing.storageGb,
        data.bandwidthGb ?? existing.bandwidthGb,
        data.features ?? existing.features,
        data.isActive === undefined ? (existing.isActive ? 1 : 0) : data.isActive ? 1 : 0,
        now,
        id,
      ],
    );
    writeDbFile(db);
    return this.packagesFindById(id);
  },

  async packagesDeleteById(id: string) {
    const { db } = await getDb();
    db.run(`DELETE FROM packages WHERE id = ?`, [id]);
    writeDbFile(db);
  },

  async ordersCreate(data: {
    userId?: string | null;
    packageId: string;
    domain: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string | null;
    durationMo: number;
    amountBdt: number;
  }) {
    const { db } = await getDb();
    const id = uuid();
    const now = nowMs();
    db.run(
      `INSERT INTO orders (id, user_id, package_id, domain, customer_name, customer_phone, customer_email, duration_mo, amount_bdt, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
      [
        id,
        data.userId ?? null,
        data.packageId,
        data.domain,
        data.customerName,
        data.customerPhone,
        data.customerEmail ?? "",
        data.durationMo,
        data.amountBdt,
        now,
        now,
      ],
    );
    writeDbFile(db);
    return this.ordersFindById(id);
  },

  async ordersFindById(id: string) {
    const { db } = await getDb();
    const stmt = db.prepare(`SELECT * FROM orders WHERE id = ? LIMIT 1`);
    stmt.bind([id]);
    const rows = rowsFromStmt(stmt);
    stmt.free();
    return rows[0] ? mapOrder(rows[0]) : null;
  },

  async ordersFindByPhone(phone: string) {
    const { db } = await getDb();
    const stmt = db.prepare(`SELECT * FROM orders WHERE customer_phone = ? ORDER BY created_at DESC`);
    stmt.bind([phone]);
    const rows = rowsFromStmt(stmt);
    stmt.free();
    return rows.map(mapOrder);
  },

  async ordersFindForUser(userId: string) {
    const { db } = await getDb();
    const stmt = db.prepare(`SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`);
    stmt.bind([userId]);
    const rows = rowsFromStmt(stmt);
    stmt.free();
    return rows.map(mapOrder);
  },

  async ordersFindAll() {
    const { db } = await getDb();
    const stmt = db.prepare(`SELECT * FROM orders ORDER BY created_at DESC`);
    const rows = rowsFromStmt(stmt);
    stmt.free();
    return rows.map(mapOrder);
  },

  async ordersCountByStatus(status: string) {
    const { db } = await getDb();
    const stmt = db.prepare(`SELECT COUNT(1) as c FROM orders WHERE status = ?`);
    stmt.bind([status]);
    const rows = rowsFromStmt(stmt);
    stmt.free();
    return Number(rows[0]?.c ?? 0);
  },

  async ordersListRecent(limit = 10) {
    const { db } = await getDb();
    const stmt = db.prepare(`SELECT * FROM orders ORDER BY created_at DESC LIMIT ?`);
    stmt.bind([limit]);
    const rows = rowsFromStmt(stmt);
    stmt.free();
    return rows.map(mapOrder);
  },

  async ordersUpdateStatus(id: string, status: string) {
    const { db } = await getDb();
    const now = nowMs();
    db.run(`UPDATE orders SET status=?, updated_at=? WHERE id=?`, [status, now, id]);
    writeDbFile(db);
    return this.ordersFindById(id);
  },

  async paymentsCreate(data: {
    orderId: string;
    method: string;
    senderNumber: string;
    trxId: string;
    amountBdt: number;
  }) {
    const { db } = await getDb();
    const id = uuid();
    const now = nowMs();
    db.run(
      `INSERT INTO payments (id, order_id, method, sender_number, trx_id, amount_bdt, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'SUBMITTED', ?, ?)`,
      [id, data.orderId, data.method, data.senderNumber, data.trxId, data.amountBdt, now, now],
    );
    writeDbFile(db);
    return this.paymentsFindById(id);
  },

  async paymentsFindById(id: string) {
    const { db } = await getDb();
    const stmt = db.prepare(`SELECT * FROM payments WHERE id = ? LIMIT 1`);
    stmt.bind([id]);
    const rows = rowsFromStmt(stmt);
    stmt.free();
    return rows[0] ? mapPayment(rows[0]) : null;
  },

  async paymentsFindForOrder(orderId: string) {
    const { db } = await getDb();
    const stmt = db.prepare(`SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC`);
    stmt.bind([orderId]);
    const rows = rowsFromStmt(stmt);
    stmt.free();
    return rows.map(mapPayment);
  },

  async paymentsUpdateStatus(id: string, status: string) {
    const { db } = await getDb();
    const now = nowMs();
    db.run(`UPDATE payments SET status=?, updated_at=? WHERE id=?`, [status, now, id]);
    writeDbFile(db);
    return this.paymentsFindById(id);
  },

  async paymentsCountByStatus(status: string) {
    const { db } = await getDb();
    const stmt = db.prepare(`SELECT COUNT(1) as c FROM payments WHERE status = ?`);
    stmt.bind([status]);
    const rows = rowsFromStmt(stmt);
    stmt.free();
    return Number(rows[0]?.c ?? 0);
  },

  async mobileSettingsGet() {
    const { db } = await getDb();
    const stmt = db.prepare(`SELECT * FROM mobile_settings WHERE id='default' LIMIT 1`);
    const rows = rowsFromStmt(stmt);
    stmt.free();
    const row = rows[0] ?? {};
    return {
      bkashNumber: (row.bkash_number as string) ?? "",
      nagadNumber: (row.nagad_number as string) ?? "",
      rocketNumber: (row.rocket_number as string) ?? "",
    };
  },

  async mobileSettingsUpsert(data: { bkashNumber: string; nagadNumber: string; rocketNumber: string }) {
    const { db } = await getDb();
    const now = nowMs();
    db.run(
      `UPDATE mobile_settings SET bkash_number=?, nagad_number=?, rocket_number=?, updated_at=? WHERE id='default'`,
      [data.bkashNumber, data.nagadNumber, data.rocketNumber, now],
    );
    writeDbFile(db);
    return this.mobileSettingsGet();
  },
};
