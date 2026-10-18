import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "clickbites.db");

// Use built-in node:sqlite (Node 22+) with fallback to better-sqlite3
let db;

try {
  const { DatabaseSync } = await import("node:sqlite");
  const rawDb = new DatabaseSync(dbPath);
  
  db = {
    raw: rawDb,
    pragma(sql) {
      rawDb.exec(`PRAGMA ${sql}`);
    },
    exec(sql) {
      return rawDb.exec(sql);
    },
    prepare(sql) {
      const stmt = rawDb.prepare(sql);
      return {
        all(...params) {
          return stmt.all(...params);
        },
        get(...params) {
          return stmt.get(...params);
        },
        run(...params) {
          const res = stmt.run(...params);
          return {
            changes: res.changes,
            lastInsertRowid: typeof res.lastInsertRowid === "bigint" ? Number(res.lastInsertRowid) : res.lastInsertRowid
          };
        }
      };
    },
    transaction(fn) {
      return (...args) => {
        rawDb.exec("BEGIN");
        try {
          const result = fn(...args);
          rawDb.exec("COMMIT");
          return result;
        } catch (err) {
          rawDb.exec("ROLLBACK");
          throw err;
        }
      };
    }
  };
} catch {
  const { default: Database } = await import("better-sqlite3");
  db = new Database(dbPath);
}

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Local Food',
  address TEXT,
  is_open INTEGER NOT NULL DEFAULT 1,
  rating REAL NOT NULL DEFAULT 4.5,
  FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  rating REAL NOT NULL DEFAULT 4.5,
  image_url TEXT,
  available INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY(shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id, product_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  shop_id INTEGER,
  total REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  payment_method TEXT NOT NULL DEFAULT 'Cash on Delivery',
  delivery_address TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(shop_id) REFERENCES shops(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY(product_id) REFERENCES products(id)
);
`);

function seed() {
  const count = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
  if (count === 0) {
    const password = bcrypt.hashSync("Admin123!", 10);
    db.prepare("INSERT INTO users (name, phone, email, password_hash, role) VALUES (?, ?, ?, ?, ?)")
      .run("ClickBites Admin", "09000000000", "admin@clickbites.local", password, "admin");
  }

  const shopCount = db.prepare("SELECT COUNT(*) AS c FROM shops").get().c;
  if (shopCount === 0) {
    const shops = [
      ["Calbayog Native Delights", "Native Delicacy", "Calbayog City", 1, 4.8],
      ["SnackBites Express", "Fast Food", "Calbayog City", 1, 4.3],
      ["Grandma's Traditional Kakanin", "Native Delicacy", "Calbayog City", 0, 4.6],
      ["Bayfront Seafood Grill", "Seafood", "Calbayog City", 1, 4.9],
      ["Brew & Bean Calbayog", "Beverages", "Calbayog City", 1, 4.7],
      ["Island Catch Kitchen", "Seafood", "Calbayog City", 1, 4.8]
    ];
    const insert = db.prepare("INSERT INTO shops (name, category, address, is_open, rating) VALUES (?, ?, ?, ?, ?)");
    for (const s of shops) insert.run(...s);
  }

  const productCount = db.prepare("SELECT COUNT(*) AS c FROM products").get().c;
  if (productCount === 0) {
    const products = [
      [1, "Sizzling Calbayog Tinapa", "Native Delicacy", "Smoky local tinapa served with native sides.", 180, 4.8, "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85"],
      [2, "Cheesy Corndogs & Milk Tea", "Fast Food", "Crispy cheesy corndogs with a refreshing milk tea.", 120, 4.3, "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=900&q=85"],
      [3, "Special Samar Baduy & Hinagom", "Native Delicacy", "Traditional Samar kakanin made for local celebrations.", 50, 4.6, "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=85"],
      [4, "Fresh Samar Sea Crab Platter", "Seafood", "Fresh seafood platter inspired by Samar's coastal flavors.", 350, 4.9, "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&q=85"],
      [5, "Local Coffee & Cream", "Beverages", "Smooth local coffee with a creamy finish.", 95, 4.7, "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=85"],
      [6, "Samar Garlic Butter Shrimp", "Seafood", "Juicy shrimp tossed in garlic butter.", 280, 4.8, "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=900&q=85"],
      [2, "Chicken Inasal Rice Meal", "Fast Food", "Grilled chicken with rice and local-style sauce.", 149, 4.5, "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=900&q=85"],
      [1, "Samar Chocolate Tablea", "Native Delicacy", "Rich tablea chocolate from local cacao.", 85, 4.6, "https://images.unsplash.com/photo-1548907040-4d42d42d5a6a?auto=format&fit=crop&w=900&q=85"]
    ];
    const insert = db.prepare("INSERT INTO products (shop_id, name, category, description, price, rating, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)");
    for (const p of products) insert.run(...p);
  }
}

seed();
export default db;