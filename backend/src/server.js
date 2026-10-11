require('dotenv').config();

const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
const port = Number(process.env.PORT || 3000);
const jwtSecret = process.env.JWT_SECRET || 'local-dev-only-change-this-secret';
const databaseDirectory = path.join(__dirname, '..', 'data');

fs.mkdirSync(databaseDirectory, { recursive: true });

const database = new DatabaseSync(path.join(databaseDirectory, 'localkarya.sqlite'));
database.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL,
    price INTEGER NOT NULL CHECK (price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image_url TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'pending',
    total INTEGER NOT NULL CHECK (total >= 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    price INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0)
  );
`);

const categories = ['Batik', 'Anyaman', 'Kerajinan Tangan', 'Aksesoris'];
const productCount = database.prepare('SELECT COUNT(*) AS count FROM products').get().count;

if (productCount === 0) {
  const addProduct = database.prepare(`
    INSERT INTO products (name, description, category, price, stock)
    VALUES (?, ?, ?, ?, ?)
  `);
  const seedProducts = [
    ['Batik Kediri Motif Simbol', 'Batik tulis dengan motif khas Kediri, dibuat oleh pengrajin lokal.', 'Batik', 150000, 12],
    ['Anyaman Bambu Tas', 'Tas anyaman bambu ringan untuk kebutuhan sehari-hari.', 'Anyaman', 85000, 8],
    ['Kerajinan Kayu Miniatur', 'Miniatur rumah tradisional dari kayu pilihan.', 'Kerajinan Tangan', 120000, 6],
    ['Aksesoris Gelang Batik', 'Gelang kain batik buatan tangan dengan motif pilihan.', 'Aksesoris', 50000, 20],
    ['Batik Tulis Modern', 'Kain batik tulis dengan perpaduan motif klasik dan modern.', 'Batik', 180000, 4],
  ];
  for (const product of seedProducts) addProduct.run(...product);
}

const adminEmail = (process.env.ADMIN_EMAIL || 'admin@localkarya.test').trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD || 'KediriDemo123!';
if (!database.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail)) {
  const passwordHash = bcrypt.hashSync(adminPassword, 10);
  database.prepare(`
    INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')
  `).run(process.env.ADMIN_NAME || 'Admin LokalKarya', adminEmail, passwordHash);
}

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()) || true }));
app.use(express.json({ limit: '1mb' }));

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function authenticate(request, _response, next) {
  const token = request.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return next(httpError(401, 'Silakan login terlebih dahulu.'));

  try {
    request.user = jwt.verify(token, jwtSecret);
    return next();
  } catch {
    return next(httpError(401, 'Token tidak valid atau sudah kedaluwarsa.'));
  }
}

function requireAdmin(request, _response, next) {
  if (request.user?.role !== 'admin') return next(httpError(403, 'Akses khusus admin.'));
  return next();
}

function safeUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function issueToken(user) {
  return jwt.sign(safeUser(user), jwtSecret, { expiresIn: '7d' });
}

function parsePositiveInteger(value, fieldName) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw httpError(400, `${fieldName} harus berupa bilangan bulat positif.`);
  }
  return number;
}

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', service: 'LokalKarya Kediri API' });
});

app.get('/api/categories', (_request, response) => {
  response.json(categories);
});

app.get('/api/products', (request, response) => {
  const search = String(request.query.search || '').trim();
  const category = String(request.query.category || '').trim();
  const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(request.query.limit, 10) || 12));
  const conditions = [];
  const parameters = [];

  if (search) {
    conditions.push('(name LIKE ? OR description LIKE ?)');
    parameters.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    conditions.push('category = ?');
    parameters.push(category);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const total = database.prepare(`SELECT COUNT(*) AS count FROM products ${where}`).get(...parameters).count;
  const products = database.prepare(`
    SELECT id, name, description, category, price, stock, image_url AS imageUrl
    FROM products ${where} ORDER BY id LIMIT ? OFFSET ?
  `).all(...parameters, limit, (page - 1) * limit);

  response.json({ items: products, page, limit, total });
});

app.get('/api/products/:id', (request, response, next) => {
  try {
    const id = parsePositiveInteger(request.params.id, 'id');
    const product = database.prepare(`
      SELECT id, name, description, category, price, stock, image_url AS imageUrl
      FROM products WHERE id = ?
    `).get(id);
    if (!product) throw httpError(404, 'Produk tidak ditemukan.');
    response.json(product);
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/register', async (request, response, next) => {
  try {
    const name = String(request.body.name || '').trim();
    const email = String(request.body.email || '').trim().toLowerCase();
    const password = String(request.body.password || '');
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
      throw httpError(400, 'Nama, email valid, dan kata sandi minimal 8 karakter wajib diisi.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = database.prepare(`
      INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'customer')
    `).run(name, email, passwordHash);
    const user = database.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(Number(result.lastInsertRowid));
    response.status(201).json({ user, token: issueToken(user) });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return next(httpError(409, 'Email sudah terdaftar.'));
    return next(error);
  }
});

app.post('/api/auth/login', async (request, response, next) => {
  try {
    const email = String(request.body.email || '').trim().toLowerCase();
    const password = String(request.body.password || '');
    const user = database.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw httpError(401, 'Email atau kata sandi salah.');
    }
    response.json({ user: safeUser(user), token: issueToken(user) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/products', authenticate, requireAdmin, (request, response, next) => {
  try {
    const { name, description = '', category, price, stock = 0, imageUrl = '' } = request.body;
    const numericPrice = Number(price);
    const numericStock = Number(stock);
    if (!String(name || '').trim() || !categories.includes(category) || !Number.isInteger(numericPrice) || numericPrice < 0 || !Number.isInteger(numericStock) || numericStock < 0) {
      throw httpError(400, 'Nama, kategori yang valid, harga, dan stok wajib diisi dengan benar.');
    }
    const result = database.prepare(`
      INSERT INTO products (name, description, category, price, stock, image_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(String(name).trim(), String(description), category, numericPrice, numericStock, String(imageUrl));
    response.status(201).json(database.prepare(`
      SELECT id, name, description, category, price, stock, image_url AS imageUrl
      FROM products WHERE id = ?
    `).get(Number(result.lastInsertRowid)));
  } catch (error) {
    next(error);
  }
});

app.put('/api/products/:id', authenticate, requireAdmin, (request, response, next) => {
  try {
    const id = parsePositiveInteger(request.params.id, 'id');
    const current = database.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!current) throw httpError(404, 'Produk tidak ditemukan.');
    const input = request.body;
    const product = {
      name: String(input.name ?? current.name).trim(),
      description: String(input.description ?? current.description),
      category: input.category ?? current.category,
      price: Number(input.price ?? current.price),
      stock: Number(input.stock ?? current.stock),
      imageUrl: String(input.imageUrl ?? current.image_url),
    };
    if (!product.name || !categories.includes(product.category) || !Number.isInteger(product.price) || product.price < 0 || !Number.isInteger(product.stock) || product.stock < 0) {
      throw httpError(400, 'Data produk tidak valid.');
    }
    database.prepare(`
      UPDATE products SET name = ?, description = ?, category = ?, price = ?, stock = ?, image_url = ?
      WHERE id = ?
    `).run(product.name, product.description, product.category, product.price, product.stock, product.imageUrl, id);
    response.json(database.prepare(`
      SELECT id, name, description, category, price, stock, image_url AS imageUrl
      FROM products WHERE id = ?
    `).get(id));
  } catch (error) {
    next(error);
  }
});

app.delete('/api/products/:id', authenticate, requireAdmin, (request, response, next) => {
  try {
    const id = parsePositiveInteger(request.params.id, 'id');
    const result = database.prepare('DELETE FROM products WHERE id = ?').run(id);
    if (!result.changes) throw httpError(404, 'Produk tidak ditemukan.');
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post('/api/orders', authenticate, (request, response, next) => {
  try {
    if (!Array.isArray(request.body.items) || request.body.items.length === 0) {
      throw httpError(400, 'Pesanan harus memiliki minimal satu produk.');
    }
    const quantities = new Map();
    for (const item of request.body.items) {
      const productId = parsePositiveInteger(item.productId, 'productId');
      const quantity = parsePositiveInteger(item.quantity, 'quantity');
      quantities.set(productId, (quantities.get(productId) || 0) + quantity);
    }

    database.exec('BEGIN IMMEDIATE');
    try {
      const selectedProducts = [];
      let total = 0;
      for (const [productId, quantity] of quantities) {
        const product = database.prepare('SELECT * FROM products WHERE id = ?').get(productId);
        if (!product) throw httpError(404, `Produk dengan id ${productId} tidak ditemukan.`);
        if (product.stock < quantity) throw httpError(409, `Stok ${product.name} tidak mencukupi.`);
        total += product.price * quantity;
        selectedProducts.push({ ...product, quantity });
      }

      const orderResult = database.prepare('INSERT INTO orders (user_id, total) VALUES (?, ?)').run(request.user.id, total);
      const newOrderId = Number(orderResult.lastInsertRowid);
      const addItem = database.prepare(`
        INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
        VALUES (?, ?, ?, ?, ?)
      `);
      const reduceStock = database.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
      for (const product of selectedProducts) {
        addItem.run(newOrderId, product.id, product.name, product.price, product.quantity);
        reduceStock.run(product.quantity, product.id);
      }
      database.exec('COMMIT');
      response.status(201).json({ id: newOrderId, status: 'pending', total, items: selectedProducts.map(({ id, name, price, quantity }) => ({ productId: id, name, price, quantity })) });
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

app.get('/api/orders/me', authenticate, (request, response) => {
  const orders = database.prepare(`
    SELECT id, status, total, created_at AS createdAt FROM orders
    WHERE user_id = ? ORDER BY id DESC
  `).all(request.user.id);
  const getItems = database.prepare(`
    SELECT product_id AS productId, product_name AS name, price, quantity
    FROM order_items WHERE order_id = ?
  `);
  response.json(orders.map((order) => ({ ...order, items: getItems.all(order.id) })));
});

app.get('/api/admin/dashboard', authenticate, requireAdmin, (_request, response) => {
  const summary = database.prepare(`
    SELECT
      (SELECT COUNT(*) FROM products) AS totalProducts,
      (SELECT COUNT(*) FROM orders) AS totalOrders,
      (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status != 'cancelled') AS totalRevenue,
      (SELECT COUNT(*) FROM products WHERE stock <= 5) AS lowStockProducts
  `).get();
  const latestOrders = database.prepare(`
    SELECT orders.id, orders.status, orders.total, orders.created_at AS createdAt,
      users.name AS customerName
    FROM orders JOIN users ON users.id = orders.user_id
    ORDER BY orders.id DESC LIMIT 10
  `).all();
  response.json({ ...summary, latestOrders });
});

app.get('/api/admin/orders', authenticate, requireAdmin, (_request, response) => {
  const orders = database.prepare(`
    SELECT orders.id, orders.status, orders.total, orders.created_at AS createdAt,
      users.name AS customerName, users.email AS customerEmail
    FROM orders JOIN users ON users.id = orders.user_id ORDER BY orders.id DESC
  `).all();
  response.json(orders);
});

app.patch('/api/admin/orders/:id/status', authenticate, requireAdmin, (request, response, next) => {
  try {
    const id = parsePositiveInteger(request.params.id, 'id');
    const allowedStatuses = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];
    const status = request.body.status;
    if (!allowedStatuses.includes(status)) throw httpError(400, 'Status pesanan tidak valid.');
    const order = database.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) throw httpError(404, 'Pesanan tidak ditemukan.');

    database.exec('BEGIN IMMEDIATE');
    try {
      if (status === 'cancelled' && order.status !== 'cancelled') {
        const items = database.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(id);
        const restoreStock = database.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
        for (const item of items) {
          if (item.product_id !== null) restoreStock.run(item.quantity, item.product_id);
        }
      }
      database.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
    response.json({ id, status });
  } catch (error) {
    next(error);
  }
});

app.use((_request, _response, next) => next(httpError(404, 'Endpoint tidak ditemukan.')));

app.use((error, _request, response, _next) => {
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  response.status(status).json({ error: status >= 500 ? 'Terjadi kesalahan pada server.' : error.message });
});

const server = app.listen(port, () => {
  console.log(`LokalKarya Kediri API berjalan di http://localhost:${port}`);
});

function shutdown() {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);