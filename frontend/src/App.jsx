import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, formatDate, formatRupiah } from './api.js';

const categoryArt = {
  Batik: { icon: '✳', tone: 'batik' },
  Anyaman: { icon: '▧', tone: 'anyaman' },
  'Kerajinan Tangan': { icon: '✿', tone: 'kerajinan' },
  Aksesoris: { icon: '◇', tone: 'aksesoris' },
};

const orderStatus = {
  pending: 'Menunggu',
  processing: 'Diproses',
  shipped: 'Dikirim',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

function readStored(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function ProductArtwork({ product, className = '' }) {
  const art = categoryArt[product.category] || categoryArt.Batik;
  return product.imageUrl ? (
    <img className={`product-image ${className}`} src={product.imageUrl} alt={product.name} />
  ) : (
    <div className={`product-art ${art.tone} ${className}`} aria-label={product.category}>
      <span className="art-stamp">{art.icon}</span>
      <span className="art-caption">KARYA LOKAL · KEDIRI</span>
    </div>
  );
}

function Icon({ name, size = 20 }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    bag: <><path d="M5 8h14l1 13H4L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    minus: <path d="M5 12h14" />,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    leaf: <><path d="M20 4c-7 0-13 2-13 9a6 6 0 0 0 6 6c7 0 7-8 7-15Z" /><path d="M4 21c2-5 5-8 10-11" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function App() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [cart, setCart] = useState(() => readStored('localkarya-cart', []));
  const [session, setSession] = useState(() => readStored('localkarya-session', null));
  const [dialog, setDialog] = useState('');
  const [notice, setNotice] = useState('');

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const query = new URLSearchParams({ limit: '50' });
      if (search.trim()) query.set('search', search.trim());
      if (activeCategory) query.set('category', activeCategory);
      const [catalog, categoryList] = await Promise.all([
        api(`/products?${query}`),
        api('/categories'),
      ]);
      setProducts(catalog.items);
      setCategories(categoryList);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, [search, activeCategory]);

  useEffect(() => {
    const timer = window.setTimeout(loadCatalog, search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [loadCatalog, search]);

  useEffect(() => {
    localStorage.setItem('localkarya-cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 3400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  function addToCart(product) {
    if (product.stock < 1) return;
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing && existing.quantity >= product.stock) {
        setNotice('Jumlah di keranjang sudah mencapai stok yang tersedia.');
        return current;
      }
      return existing
        ? current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1, stock: product.stock } : item)
        : [...current, { ...product, quantity: 1 }];
    });
    setNotice(`${product.name} ditambahkan ke keranjang.`);
  }

  function updateQuantity(id, quantity) {
    setCart((current) => current
      .map((item) => item.id === id ? { ...item, quantity: Math.min(item.stock, quantity) } : item)
      .filter((item) => item.quantity > 0));
  }

  async function authenticate(credentials, mode) {
    const result = await api(`/auth/${mode}`, { method: 'POST', body: credentials });
    const nextSession = { token: result.token, user: result.user };
    localStorage.setItem('localkarya-session', JSON.stringify(nextSession));
    setSession(nextSession);
    setDialog('');
    setNotice(`Selamat datang, ${result.user.name}.`);
  }

  function signOut() {
    localStorage.removeItem('localkarya-session');
    setSession(null);
    setDialog('');
    setNotice('Anda sudah keluar dari akun.');
  }

  async function checkout() {
    if (!session) {
      setDialog('auth');
      setNotice('Masuk atau daftar terlebih dahulu untuk melanjutkan pesanan.');
      return;
    }
    try {
      await api('/orders', {
        method: 'POST',
        token: session.token,
        body: { items: cart.map(({ id, quantity }) => ({ productId: id, quantity })) },
      });
      setCart([]);
      setDialog('orders');
      setNotice('Pesanan berhasil dibuat. Terima kasih sudah mendukung UMKM lokal!');
      await loadCatalog();
    } catch (error) {
      setNotice(error.message);
      await loadCatalog();
    }
  }

  return (
    <div className="site-shell">
      <div className="announcement"><span className="announcement-spark">✳</span> Beli lokal, hidupkan cerita dari Kediri <span className="announcement-spark">✳</span></div>
      <header className="site-header">
        <a className="brand" href="#beranda" aria-label="LokalKarya beranda">
          <span className="brand-mark"><Icon name="leaf" size={23} /></span>
          <span className="brand-copy"><strong>lokalkarya</strong><small>KEDIRI, JAWA TIMUR</small></span>
        </a>
        <nav className="main-nav" aria-label="Navigasi utama">
          <a className="nav-active" href="#koleksi">Jelajahi</a>
          <a href="#cerita">Cerita kami</a>
        </nav>
        <div className="header-actions">
          {session?.user.role === 'admin' && <button className="admin-link" onClick={() => setDialog('admin')}>Dashboard</button>}
          {session ? (
            <div className="account-menu">
              <button className="account-button" onClick={() => setDialog('orders')} aria-label="Lihat akun dan pesanan"><Icon name="user" /><span className="account-name">{session.user.name.split(' ')[0]}</span></button>
              <button className="icon-button logout-button" title="Keluar" onClick={signOut}><Icon name="logout" /></button>
            </div>
          ) : (
            <button className="login-button" onClick={() => setDialog('auth')}><Icon name="user" /><span>Masuk</span></button>
          )}
          <button className="cart-button" onClick={() => setDialog('cart')} aria-label={`Buka keranjang, ${cartCount} barang`}>
            <Icon name="bag" /><span className="cart-label">Keranjang</span>{cartCount > 0 && <span className="cart-count">{cartCount}</span>}
          </button>
        </div>
      </header>

      <main>
        <section className="hero" id="beranda">
          <div className="hero-copy">
            <div className="eyebrow"><span /> DIBUAT DENGAN HATI, DARI KEDIRI</div>
            <h1>Setiap karya<br />punya <em>cerita.</em></h1>
            <p>Temukan benda-benda istimewa yang dibuat oleh tangan-tangan terampil pengrajin lokal Kediri.</p>
            <a className="primary-button" href="#koleksi">Jelajahi koleksi <Icon name="arrow" size={18} /></a>
            <div className="hero-note"><span className="note-seal">✿</span><span><strong>100% karya lokal</strong><small>Dibuat oleh UMKM Kediri</small></span></div>
          </div>
          <div className="hero-art" aria-label="Kain batik dan kerajinan tangan khas Kediri">
            <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
            <div className="hero-flower flower-one">✿</div><div className="hero-flower flower-two">✳</div>
            <div className="hero-art-center"><span className="center-sun">✳</span><span className="center-text">KEDIRI<br />PUNYA CERITA</span></div>
            <div className="hero-art-tag">HANDMADE<br />WITH LOVE <span>♡</span></div>
          </div>
        </section>

        <section className="value-strip" id="cerita">
          <div><span className="value-icon">✿</span><span><strong>Dibuat oleh pengrajin lokal</strong><small>Bangga dengan karya sekitar</small></span></div>
          <div><span className="value-icon">♧</span><span><strong>Unik, bukan produksi massal</strong><small>Setiap karya punya karakternya</small></span></div>
          <div><span className="value-icon">♡</span><span><strong>Belanja sambil berdampak</strong><small>Dukung usaha kecil tetap tumbuh</small></span></div>
        </section>

        <section className="collection-section" id="koleksi">
          <div className="section-heading">
            <div><div className="eyebrow"><span /> PILIHAN PENGRAJIN</div><h2>Karya untuk <em>dirayakan.</em></h2><p>Temukan sesuatu yang terasa lebih personal.</p></div>
            <div className="search-field"><Icon name="search" size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari karya favoritmu..." aria-label="Cari produk" /><kbd>⌘ K</kbd></div>
          </div>
          <div className="category-row" aria-label="Filter kategori">
            <button className={`category-chip ${activeCategory === '' ? 'selected' : ''}`} onClick={() => setActiveCategory('')}>Semua karya</button>
            {categories.map((category) => <button key={category} className={`category-chip ${activeCategory === category ? 'selected' : ''}`} onClick={() => setActiveCategory(activeCategory === category ? '' : category)}>{category}</button>)}
          </div>

          {loading ? (
            <div className="loading-state"><span className="loader" />Sedang menyiapkan karya terbaik untukmu...</div>
          ) : loadError ? (
            <div className="error-state"><span className="error-mark">!</span><div><strong>Belum bisa memuat koleksi</strong><p>{loadError}</p><button className="text-button" onClick={loadCatalog}>Coba lagi <Icon name="arrow" size={15} /></button></div></div>
          ) : products.length === 0 ? (
            <div className="empty-state"><span>⌕</span><strong>Karyanya belum ditemukan.</strong><p>Coba kata kunci lain atau pilih kategori berbeda.</p><button className="text-button" onClick={() => { setSearch(''); setActiveCategory(''); }}>Hapus filter</button></div>
          ) : (
            <div className="product-grid">
              {products.map((product, index) => (
                <article className="product-card" key={product.id}>
                  <div className="product-visual"><ProductArtwork product={product} /><span className="product-index">0{index + 1}</span><button className={`quick-add ${product.stock === 0 ? 'unavailable' : ''}`} onClick={() => addToCart(product)} disabled={product.stock === 0} aria-label={`Tambahkan ${product.name} ke keranjang`}><Icon name="plus" size={19} /></button></div>
                  <div className="product-meta"><span>{product.category}</span><span className={product.stock <= 5 ? 'stock-warning' : ''}>{product.stock > 0 ? `Stok ${product.stock}` : 'Habis'}</span></div>
                  <h3>{product.name}</h3>
                  <p className="product-description">{product.description || 'Karya autentik pilihan pengrajin lokal Kediri.'}</p>
                  <div className="product-footer"><strong>{formatRupiah(product.price)}</strong><button onClick={() => addToCart(product)} disabled={product.stock === 0}>{product.stock > 0 ? 'Tambah' : 'Habis'}</button></div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="maker-note">
          <div className="maker-stamp">KEDIRI<br /><span>✳</span><br />LOCAL</div>
          <div><div className="eyebrow"><span /> DARI TANGAN PENGRAJIN</div><h2>Beli satu karya,<br /><em>dukung satu cerita.</em></h2></div>
          <p>Setiap pesanan membantu pengrajin lokal menjaga tradisi sekaligus membawa karyanya lebih jauh. Terima kasih sudah memilih karya lokal.</p>
          <a href="#koleksi" aria-label="Lihat koleksi"><Icon name="arrow" size={23} /></a>
        </section>
      </main>

      <footer className="site-footer"><a className="brand footer-brand" href="#beranda"><span className="brand-mark"><Icon name="leaf" size={20} /></span><span className="brand-copy"><strong>lokalkarya</strong><small>KEDIRI, JAWA TIMUR</small></span></a><span>Dengan bangga, dari Kediri. <span className="footer-heart">♥</span></span><span>© {new Date().getFullYear()} LokalKarya</span></footer>

      {notice && <div className="toast" role="status">{notice}</div>}
      {dialog === 'auth' && <AuthDialog onClose={() => setDialog('')} onSubmit={authenticate} />}
      {dialog === 'cart' && <CartDialog cart={cart} onClose={() => setDialog('')} onUpdate={updateQuantity} onCheckout={checkout} />}
      {dialog === 'orders' && <OrdersDialog session={session} onClose={() => setDialog('')} onLogin={() => setDialog('auth')} />}
      {dialog === 'admin' && session?.user.role === 'admin' && <AdminDialog session={session} categories={categories} onClose={() => setDialog('')} onChanged={async (message) => { setNotice(message); await loadCatalog(); }} />}
    </div>
  );
}

function DialogFrame({ title, subtitle, onClose, children, wide = false }) {
  useEffect(() => {
    const onKeyDown = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={`dialog ${wide ? 'dialog-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <button className="dialog-close" onClick={onClose} aria-label="Tutup"><Icon name="close" /></button>
        <div className="dialog-heading"><div className="eyebrow"><span /> LOKALKARYA KEDIRI</div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
        {children}
      </section>
    </div>
  );
}

function AuthDialog({ onClose, onSubmit }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onSubmit(form, mode);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogFrame title={mode === 'login' ? 'Senang melihatmu.' : 'Mulai perjalananmu.'} subtitle={mode === 'login' ? 'Masuk untuk melihat pesanan dan belanja karya lokal.' : 'Buat akun untuk mendukung cerita dari Kediri.'} onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        {mode === 'register' && <label>Nama lengkap<input required autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Namamu" /></label>}
        <label>Email<input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="nama@email.com" /></label>
        <label>Kata sandi<input required type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'register' ? 8 : undefined} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={mode === 'register' ? 'Minimal 8 karakter' : 'Masukkan kata sandi'} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button full-button" disabled={submitting}>{submitting ? 'Mohon tunggu...' : mode === 'login' ? 'Masuk ke akun' : 'Buat akun'}</button>
        <p className="form-switch">{mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'} <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'Daftar di sini' : 'Masuk'}</button></p>
      </form>
    </DialogFrame>
  );
}

function CartDialog({ cart, onClose, onUpdate, onCheckout }) {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return (
    <DialogFrame title="Keranjang karyamu." subtitle={cart.length ? 'Karya pilihanmu siap dibawa pulang.' : 'Sepertinya keranjangmu masih kosong.'} onClose={onClose}>
      {cart.length ? <>
        <div className="cart-items">{cart.map((item) => (
          <div className="cart-item" key={item.id}><ProductArtwork product={item} /><div className="cart-item-info"><strong>{item.name}</strong><small>{formatRupiah(item.price)}</small><div className="quantity-control"><button aria-label="Kurangi jumlah" onClick={() => onUpdate(item.id, item.quantity - 1)}><Icon name="minus" size={14} /></button><span>{item.quantity}</span><button aria-label="Tambah jumlah" disabled={item.quantity >= item.stock} onClick={() => onUpdate(item.id, item.quantity + 1)}><Icon name="plus" size={14} /></button></div></div><strong className="cart-line-total">{formatRupiah(item.price * item.quantity)}</strong></div>
        ))}</div>
        <div className="cart-summary"><span>Subtotal</span><strong>{formatRupiah(subtotal)}</strong><small>Ongkos kirim akan diinformasikan oleh penjual.</small></div>
        <button className="primary-button full-button" onClick={onCheckout}>Buat pesanan <Icon name="arrow" size={18} /></button>
      </> : <div className="empty-cart"><span>♡</span><p>Yuk, temukan karya lokal yang kamu suka.</p><button className="primary-button full-button" onClick={onClose}>Jelajahi koleksi</button></div>}
    </DialogFrame>
  );
}

function OrdersDialog({ session, onClose, onLogin }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(session));
  useEffect(() => {
    if (!session) return;
    api('/orders/me', { token: session.token })
      .then(setOrders)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [session]);

  return (
    <DialogFrame title="Pesananmu." subtitle={session ? 'Semua cerita belanjamu, tersimpan di sini.' : 'Masuk dulu untuk melihat pesananmu.'} onClose={onClose}>
      {!session ? <button className="primary-button full-button" onClick={onLogin}>Masuk ke akun <Icon name="arrow" size={18} /></button>
        : loading ? <div className="loading-state compact"><span className="loader" />Memuat pesanan...</div>
          : error ? <p className="form-error" role="alert">{error}</p>
            : orders.length === 0 ? <div className="empty-cart"><span>✿</span><p>Belum ada pesanan. Setiap karya punya cerita untukmu.</p></div>
              : <div className="order-list">{orders.map((order) => <article className="order-card" key={order.id}><div className="order-top"><strong>Pesanan #{String(order.id).padStart(4, '0')}</strong><span className={`status-pill status-${order.status}`}>{orderStatus[order.status] || order.status}</span></div><small>{formatDate(order.createdAt)}</small><div className="order-items">{order.items.map((item, index) => <span key={`${order.id}-${index}`}>{item.name} × {item.quantity}</span>)}</div><div className="order-total"><span>Total</span><strong>{formatRupiah(order.total)}</strong></div></article>)}</div>}
    </DialogFrame>
  );
}

function AdminDialog({ session, categories, onClose, onChanged }) {
  const [tab, setTab] = useState('ringkasan');
  const [dashboard, setDashboard] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadAdminData = useCallback(async () => {
    setError('');
    try {
      const [summary, catalog, orderList] = await Promise.all([
        api('/admin/dashboard', { token: session.token }),
        api('/products?limit=50', { token: session.token }),
        api('/admin/orders', { token: session.token }),
      ]);
      setDashboard(summary);
      setProducts(catalog.items);
      setOrders(orderList);
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [session.token]);

  useEffect(() => { loadAdminData(); }, [loadAdminData]);

  async function saveProduct(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const body = {
      name: form.get('name'),
      description: form.get('description'),
      category: form.get('category'),
      price: Number(form.get('price')),
      stock: Number(form.get('stock')),
      imageUrl: form.get('imageUrl'),
    };
    try {
      await api(editing?.id ? `/products/${editing.id}` : '/products', {
        method: editing?.id ? 'PUT' : 'POST',
        token: session.token,
        body,
      });
      setEditing(null);
      await loadAdminData();
      await onChanged(editing?.id ? 'Produk berhasil diperbarui.' : 'Produk baru berhasil ditambahkan.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeProduct(product) {
    if (!window.confirm(`Hapus "${product.name}" dari katalog?`)) return;
    try {
      await api(`/products/${product.id}`, { method: 'DELETE', token: session.token });
      await loadAdminData();
      await onChanged('Produk berhasil dihapus.');
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function setOrderStatus(orderId, status) {
    try {
      await api(`/admin/orders/${orderId}/status`, { method: 'PATCH', token: session.token, body: { status } });
      await loadAdminData();
      await onChanged('Status pesanan berhasil diperbarui.');
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <DialogFrame title="Ruang pengrajin." subtitle="Kelola toko dan lihat karya lokal yang terus tumbuh." onClose={onClose} wide>
      <div className="admin-tabs">{['ringkasan', 'produk', 'pesanan'].map((value) => <button className={tab === value ? 'active' : ''} key={value} onClick={() => { setTab(value); setEditing(null); }}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div>
      {error && <p className="form-error admin-error" role="alert">{error}</p>}
      {tab === 'ringkasan' && (dashboard ? <div className="admin-content"><div className="stat-grid"><div><small>Total produk</small><strong>{dashboard.totalProducts}</strong></div><div><small>Total pesanan</small><strong>{dashboard.totalOrders}</strong></div><div><small>Total pendapatan</small><strong>{formatRupiah(dashboard.totalRevenue)}</strong></div><div><small>Stok menipis</small><strong>{dashboard.lowStockProducts}</strong></div></div><div className="admin-subheading"><h3>Pesanan terbaru</h3><button className="text-button" onClick={() => setTab('pesanan')}>Lihat semua <Icon name="arrow" size={15} /></button></div><div className="admin-table-wrap"><table><thead><tr><th>Pesanan</th><th>Pelanggan</th><th>Status</th><th>Total</th></tr></thead><tbody>{dashboard.latestOrders.map((order) => <tr key={order.id}><td>#{order.id} · {formatDate(order.createdAt)}</td><td>{order.customerName}</td><td><span className={`status-pill status-${order.status}`}>{orderStatus[order.status] || order.status}</span></td><td>{formatRupiah(order.total)}</td></tr>)}</tbody></table></div></div> : <div className="loading-state compact"><span className="loader" />Memuat ringkasan...</div>)}
      {tab === 'produk' && <div className="admin-content">{editing ? <form className="product-form" onSubmit={saveProduct}><h3>{editing.id ? 'Ubah produk' : 'Tambah produk baru'}</h3><label>Nama produk<input name="name" required defaultValue={editing.name || ''} /></label><label>Deskripsi<textarea name="description" rows="2" defaultValue={editing.description || ''} /></label><div className="form-row"><label>Kategori<select name="category" defaultValue={editing.category || categories[0]}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Harga (Rp)<input name="price" type="number" min="0" step="1" required defaultValue={editing.price ?? ''} /></label><label>Stok<input name="stock" type="number" min="0" step="1" required defaultValue={editing.stock ?? 0} /></label></div><label>URL gambar (opsional)<input name="imageUrl" type="url" defaultValue={editing.imageUrl || ''} placeholder="https://..." /></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="secondary-button" onClick={() => setEditing(null)}>Batal</button><button className="primary-button" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan produk'}</button></div></form> : <><div className="admin-subheading"><h3>Inventaris produk</h3><button className="primary-button compact-button" onClick={() => setEditing({})}><Icon name="plus" size={16} /> Produk baru</button></div><div className="admin-table-wrap"><table><thead><tr><th>Produk</th><th>Kategori</th><th>Harga</th><th>Stok</th><th>Aksi</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td>{product.name}</td><td>{product.category}</td><td>{formatRupiah(product.price)}</td><td className={product.stock <= 5 ? 'stock-warning' : ''}>{product.stock}</td><td><button className="table-action" onClick={() => setEditing(product)}>Ubah</button><button className="table-action danger-text" onClick={() => removeProduct(product)}>Hapus</button></td></tr>)}</tbody></table></div></>}</div>}
      {tab === 'pesanan' && <div className="admin-content"><div className="admin-subheading"><h3>Semua pesanan</h3><span className="muted-text">{orders.length} pesanan</span></div><div className="admin-table-wrap"><table><thead><tr><th>Pesanan</th><th>Pelanggan</th><th>Tanggal</th><th>Total</th><th>Status</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td>#{String(order.id).padStart(4, '0')}</td><td>{order.customerName}<small className="table-email">{order.customerEmail}</small></td><td>{formatDate(order.createdAt)}</td><td>{formatRupiah(order.total)}</td><td><select aria-label={`Ubah status pesanan ${order.id}`} value={order.status} onChange={(event) => setOrderStatus(order.id, event.target.value)}>{Object.entries(orderStatus).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td></tr>)}</tbody></table></div></div>}
    </DialogFrame>
  );
}

export default App;
