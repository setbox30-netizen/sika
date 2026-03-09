import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("masjid.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanggal TEXT,
    keterangan TEXT,
    jenis TEXT,
    jumlah REAL
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_barang TEXT,
    jml_barang INTEGER,
    kondisi TEXT,
    lokasi TEXT
  );

  CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_pengurus TEXT,
    jabatan TEXT,
    nohp TEXT
  );
`);

// Seed default settings if empty
const settingsCount = db.prepare("SELECT COUNT(*) as count FROM settings").get() as { count: number };
if (settingsCount.count === 0) {
  const insertSetting = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
  insertSetting.run("nama_masjid", "Masjid Al-Ikhlas");
  insertSetting.run("alamat", "Jl. Raya No. 123");
  insertSetting.run("kota", "Jakarta");
  insertSetting.run("running_text", "Selamat Datang di Masjid Al-Ikhlas - Mari Makmurkan Masjid Kita");
  insertSetting.run("logo_url", "https://cdn-icons-png.flaticon.com/512/2317/2317963.png");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/initial-data", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all() as { key: string, value: string }[];
    const settingsMap = settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});

    const transactions = db.prepare("SELECT * FROM transactions").all() as any[];
    let pemasukan = 0;
    let pengeluaran = 0;
    transactions.forEach(t => {
      if (t.jenis === "Pemasukan") pemasukan += t.jumlah;
      else pengeluaran += t.jumlah;
    });

    const inventoryCount = db.prepare("SELECT COUNT(*) as count FROM inventory").get() as { count: number };
    const staffCount = db.prepare("SELECT COUNT(*) as count FROM staff").get() as { count: number };

    res.json({
      settings: settingsMap,
      stats: {
        pemasukan,
        pengeluaran,
        saldo: pemasukan - pengeluaran,
        jml_barang: inventoryCount.count,
        jml_pengurus: staffCount.count
      }
    });
  });

  // Transactions
  app.get("/api/transactions", (req, res) => {
    const data = db.prepare("SELECT * FROM transactions ORDER BY tanggal DESC").all();
    res.json(data);
  });

  app.post("/api/transactions", (req, res) => {
    const { id, tanggal, keterangan, jenis, jumlah } = req.body;
    if (id) {
      db.prepare("UPDATE transactions SET tanggal = ?, keterangan = ?, jenis = ?, jumlah = ? WHERE id = ?")
        .run(tanggal, keterangan, jenis, jumlah, id);
    } else {
      db.prepare("INSERT INTO transactions (tanggal, keterangan, jenis, jumlah) VALUES (?, ?, ?, ?)")
        .run(tanggal, keterangan, jenis, jumlah);
    }
    res.json({ success: true });
  });

  app.delete("/api/transactions/:id", (req, res) => {
    db.prepare("DELETE FROM transactions WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Inventory
  app.get("/api/inventory", (req, res) => {
    const data = db.prepare("SELECT * FROM inventory").all();
    res.json(data);
  });

  app.post("/api/inventory", (req, res) => {
    const { nama_barang, jml_barang, kondisi, lokasi } = req.body;
    db.prepare("INSERT INTO inventory (nama_barang, jml_barang, kondisi, lokasi) VALUES (?, ?, ?, ?)")
      .run(nama_barang, jml_barang, kondisi, lokasi);
    res.json({ success: true });
  });

  // Staff
  app.get("/api/staff", (req, res) => {
    const data = db.prepare("SELECT * FROM staff").all();
    res.json(data);
  });

  app.post("/api/staff", (req, res) => {
    const { nama_pengurus, jabatan, nohp } = req.body;
    db.prepare("INSERT INTO staff (nama_pengurus, jabatan, nohp) VALUES (?, ?, ?, ?)")
      .run(nama_pengurus, jabatan, nohp);
    res.json({ success: true });
  });

  // Settings
  app.post("/api/settings", (req, res) => {
    const { set_nama, set_alamat, set_kota, set_text, set_logo } = req.body;
    const update = db.prepare("UPDATE settings SET value = ? WHERE key = ?");
    update.run(set_nama, "nama_masjid");
    update.run(set_alamat, "alamat");
    update.run(set_kota, "kota");
    update.run(set_text, "running_text");
    update.run(set_logo, "logo_url");
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
