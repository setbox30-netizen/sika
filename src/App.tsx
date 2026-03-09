import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Wallet, 
  Box, 
  Users, 
  Settings as SettingsIcon, 
  Plus, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  TrendingUp,
  Search,
  Printer,
  FileSpreadsheet,
  Pencil,
  Trash2,
  Moon,
  Clock,
  Info,
  MapPin,
  Phone,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Transaction {
  id?: number;
  tanggal: string;
  keterangan: string;
  jenis: "Pemasukan" | "Pengeluaran";
  jumlah: number;
}

interface InventoryItem {
  id?: number;
  nama_barang: string;
  jml_barang: number;
  kondisi: string;
  lokasi: string;
}

interface StaffMember {
  id?: number;
  nama_pengurus: string;
  jabatan: string;
  nohp: string;
}

interface AppSettings {
  nama_masjid: string;
  alamat: string;
  kota: string;
  running_text: string;
  logo_url: string;
}

interface Stats {
  pemasukan: number;
  pengeluaran: number;
  saldo: number;
  jml_barang: number;
  jml_pengurus: number;
}

// --- Components ---

const StatCard = ({ title, value, icon: Icon, colorClass }: { title: string, value: string, icon: any, colorClass: string }) => (
  <div className={cn("stat-card", colorClass)}>
    <Icon className="absolute -right-4 -bottom-4 w-24 h-24 opacity-15 rotate-[-15deg]" />
    <p className="text-xs font-bold opacity-80 uppercase tracking-wider">{title}</p>
    <h3 className="text-xl md:text-2xl font-bold mt-2">{value}</h3>
  </div>
);

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden"
        >
          <div className="bg-primary p-6 text-white flex justify-between items-center">
            <h3 className="text-lg font-bold">{title}</h3>
            <button onClick={onClose} className="hover:bg-white/20 rounded-full p-1 transition-colors">
              <Plus className="rotate-45" />
            </button>
          </div>
          <div className="p-6">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [prayerTimes, setPrayerTimes] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isTransModalOpen, setIsTransModalOpen] = useState(false);
  const [isInvModalOpen, setIsInvModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Filters
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchInitialData();
    fetchPrayerTimes();
  }, []);

  const fetchInitialData = async () => {
    try {
      const res = await fetch("/api/initial-data");
      const data = await res.json();
      setSettings(data.settings);
      setStats(data.stats);
      
      const transRes = await fetch("/api/transactions");
      setTransactions(await transRes.json());
      
      const invRes = await fetch("/api/inventory");
      setInventory(await invRes.json());
      
      const staffRes = await fetch("/api/staff");
      setStaff(await staffRes.json());
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  const fetchPrayerTimes = async () => {
    try {
      const res = await fetch("https://api.aladhan.com/v1/timingsByCity?city=Jakarta&country=Indonesia&method=20");
      const data = await res.json();
      setPrayerTimes(data.data.timings);
    } catch (error) {
      console.error("Error fetching prayer times:", error);
    }
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);
  };

  const handleTransactionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      id: editingTransaction?.id,
      tanggal: formData.get("tanggal"),
      keterangan: formData.get("keterangan"),
      jenis: formData.get("jenis"),
      jumlah: Number(formData.get("jumlah"))
    };

    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    setIsTransModalOpen(false);
    setEditingTransaction(null);
    fetchInitialData();
  };

  const handleDeleteTransaction = async (id: number) => {
    if (confirm("Hapus transaksi ini?")) {
      await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      fetchInitialData();
    }
  };

  const handleInventorySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      nama_barang: formData.get("nama_barang"),
      jml_barang: Number(formData.get("jml_barang")),
      kondisi: formData.get("kondisi"),
      lokasi: formData.get("lokasi")
    };

    await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    setIsInvModalOpen(false);
    fetchInitialData();
  };

  const handleStaffSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      nama_pengurus: formData.get("nama_pengurus"),
      jabatan: formData.get("jabatan"),
      nohp: formData.get("nohp")
    };

    await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    setIsStaffModalOpen(false);
    fetchInitialData();
  };

  const handleSettingsSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    fetchInitialData();
    alert("Pengaturan disimpan!");
  };

  const filteredTransactions = transactions.filter(t => {
    const date = new Date(t.tanggal);
    const monthMatch = filterMonth === "all" || date.getMonth().toString() === filterMonth;
    const yearMatch = filterYear === "all" || date.getFullYear().toString() === filterYear;
    const searchMatch = t.keterangan.toLowerCase().includes(searchQuery.toLowerCase());
    return monthMatch && yearMatch && searchMatch;
  });

  const chartData = [
    { name: "Pemasukan", value: stats?.pemasukan || 0, color: "#10b981" },
    { name: "Pengeluaran", value: stats?.pengeluaran || 0, color: "#ef4444" }
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 font-bold text-primary">Memuat Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-gradient-to-b from-primary-dark to-primary text-white fixed h-full z-50">
        <div className="p-6 flex items-center gap-4">
          <img src={settings?.logo_url} alt="Logo" className="w-12 h-12 rounded-xl bg-white p-1 object-contain" />
          <div>
            <h1 className="font-bold text-sm leading-tight">{settings?.nama_masjid}</h1>
            <p className="text-[10px] opacity-70 uppercase tracking-widest">{settings?.kota}</p>
          </div>
        </div>

        <nav className="mt-8 flex flex-col gap-1">
          <button onClick={() => setActiveTab("dashboard")} className={cn("nav-link-sidebar", activeTab === "dashboard" && "active")}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button onClick={() => setActiveTab("keuangan")} className={cn("nav-link-sidebar", activeTab === "keuangan" && "active")}>
            <Wallet size={20} /> Keuangan
          </button>
          <button onClick={() => setActiveTab("inventaris")} className={cn("nav-link-sidebar", activeTab === "inventaris" && "active")}>
            <Box size={20} /> Inventaris
          </button>
          <button onClick={() => setActiveTab("pengurus")} className={cn("nav-link-sidebar", activeTab === "pengurus" && "active")}>
            <Users size={20} /> Pengurus
          </button>
          <button onClick={() => setActiveTab("pengaturan")} className={cn("nav-link-sidebar", activeTab === "pengaturan" && "active")}>
            <SettingsIcon size={20} /> Pengaturan
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pb-24 md:pb-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-8 bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-sm sticky top-4 z-40 border border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-800 capitalize">{activeTab}</h2>
            <p className="text-xs text-slate-500 font-medium">{format(new Date(), "EEEE, d MMMM yyyy", { locale: id })}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-primary leading-none">{settings?.nama_masjid}</p>
            </div>
            <img src={settings?.logo_url} alt="Logo" className="w-10 h-10 rounded-full border-2 border-primary object-contain" />
          </div>
        </header>

        {/* Marquee */}
        <div className="bg-primary/10 text-primary-dark px-6 py-2.5 rounded-full font-semibold overflow-hidden whitespace-nowrap text-sm border border-primary/20 mb-8">
          <div className="animate-marquee flex items-center gap-4">
            <Info size={16} /> {settings?.running_text}
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "dashboard" && (
              <div className="space-y-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard title="Saldo Akhir" value={formatRupiah(stats?.saldo || 0)} icon={Wallet} colorClass="bg-gradient-to-br from-primary to-emerald-700" />
                  <StatCard title="Pemasukan" value={formatRupiah(stats?.pemasukan || 0)} icon={ArrowDownCircle} colorClass="bg-gradient-to-br from-emerald-500 to-teal-600" />
                  <StatCard title="Pengeluaran" value={formatRupiah(stats?.pengeluaran || 0)} icon={ArrowUpCircle} colorClass="bg-gradient-to-br from-rose-500 to-red-700" />
                  <StatCard title="Info Masjid" value={`${stats?.jml_barang} Aset | ${stats?.jml_pengurus} Staf`} icon={TrendingUp} colorClass="bg-gradient-to-br from-amber-500 to-orange-600" />
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Chart */}
                  <div className="lg:col-span-2 card-modern">
                    <h3 className="text-sm font-bold text-slate-500 mb-6 uppercase tracking-wider">Statistik Keuangan</h3>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: "#64748b" }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(val) => `Rp ${val/1000}k`} />
                          <Tooltip 
                            cursor={{ fill: "#f8fafc" }}
                            contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                            formatter={(value: number) => [formatRupiah(value), ""]}
                          />
                          <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={60}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Prayer Times */}
                  <div className="bg-gradient-to-br from-primary-dark to-primary rounded-[24px] p-8 text-white relative overflow-hidden shadow-xl">
                    <Moon className="absolute -right-8 -top-8 w-48 h-48 opacity-10" />
                    <div className="relative">
                      <div className="flex items-center gap-3 mb-8">
                        <Clock className="text-primary-light" />
                        <h3 className="text-lg font-bold">Jadwal Sholat</h3>
                      </div>
                      <div className="space-y-4">
                        {prayerTimes ? (
                          ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].map((key) => (
                            <div key={key} className="flex justify-between items-center border-b border-white/10 pb-3">
                              <span className="text-sm font-medium opacity-80">
                                {key === "Fajr" ? "Subuh" : key === "Dhuhr" ? "Dzuhur" : key === "Asr" ? "Ashar" : key}
                              </span>
                              <span className="text-xl font-bold">{prayerTimes[key]}</span>
                            </div>
                          ))
                        ) : (
                          <div className="flex justify-center py-8">
                            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "keuangan" && (
              <div className="card-modern">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                  <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                    <select 
                      value={filterMonth} 
                      onChange={(e) => setFilterMonth(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="all">Semua Bulan</option>
                      {Array.from({ length: 12 }).map((_, i) => (
                        <option key={i} value={i}>{format(new Date(2024, i, 1), "MMMM", { locale: id })}</option>
                      ))}
                    </select>
                    <select 
                      value={filterYear} 
                      onChange={(e) => setFilterYear(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="all">Semua Tahun</option>
                      <option value="2024">2024</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                    </select>
                    <div className="relative flex-1 lg:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Cari uraian..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 w-full lg:w-auto">
                    <button onClick={() => window.print()} className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold transition-colors">
                      <Printer size={18} /> <span className="hidden sm:inline">Cetak</span>
                    </button>
                    <button className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold transition-colors">
                      <FileSpreadsheet size={18} /> <span className="hidden sm:inline">Excel</span>
                    </button>
                    <button onClick={() => { setEditingTransaction(null); setIsTransModalOpen(true); }} className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-primary/20">
                      <Plus size={18} /> Transaksi Baru
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto -mx-6">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-y border-slate-100">
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tanggal</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Uraian</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Jenis</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Jumlah</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((t) => (
                        <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-bold text-slate-700">{format(new Date(t.tanggal), "d MMM yyyy", { locale: id })}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-slate-600 font-medium">{t.keterangan}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={cn(
                              "inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                              t.jenis === "Pemasukan" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            )}>
                              {t.jenis === "Pemasukan" ? <ArrowDownCircle size={12} /> : <ArrowUpCircle size={12} />}
                              {t.jenis}
                            </span>
                          </td>
                          <td className={cn("px-6 py-4 text-right font-bold text-sm", t.jenis === "Pemasukan" ? "text-emerald-600" : "text-rose-600")}>
                            {formatRupiah(t.jumlah)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center gap-1">
                              <button onClick={() => { setEditingTransaction(t); setIsTransModalOpen(true); }} className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors">
                                <Pencil size={16} />
                              </button>
                              <button onClick={() => handleDeleteTransaction(t.id!)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-full transition-colors">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "inventaris" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-700">Daftar Aset Masjid</h3>
                  <button onClick={() => setIsInvModalOpen(true)} className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20">
                    <Plus size={18} /> Tambah Aset
                  </button>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inventory.map((item) => (
                    <div key={item.id} className="card-modern border-l-4 border-primary">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-bold text-slate-800">{item.nama_barang}</h4>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                          item.kondisi === "Baik" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        )}>
                          {item.kondisi}
                        </span>
                      </div>
                      <div className="flex gap-4 mb-4">
                        <div className="bg-slate-50 px-3 py-1.5 rounded-lg flex items-center gap-2">
                          <Box size={14} className="text-primary" />
                          <span className="text-xs font-bold text-slate-600">{item.jml_barang} Unit</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <MapPin size={14} />
                        <span className="text-xs font-medium">{item.lokasi}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "pengurus" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-700">Struktur Pengurus</h3>
                  <button onClick={() => setIsStaffModalOpen(true)} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-slate-900/20">
                    <Users size={18} /> Tambah Pengurus
                  </button>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {staff.map((member) => (
                    <div key={member.id} className="card-modern flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-emerald-700 flex items-center justify-center text-white font-bold text-xl">
                        {member.nama_pengurus.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-800 truncate">{member.nama_pengurus}</h4>
                        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">{member.jabatan}</p>
                        <div className="flex items-center gap-1.5 text-emerald-600">
                          <Phone size={12} />
                          <span className="text-xs font-medium">{member.nohp}</span>
                        </div>
                      </div>
                      <ChevronRight className="text-slate-300" size={20} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "pengaturan" && (
              <div className="max-w-2xl mx-auto">
                <div className="card-modern">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                      <SettingsIcon size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Pengaturan Sistem</h3>
                  </div>
                  <form onSubmit={handleSettingsSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nama Masjid</label>
                      <input name="set_nama" defaultValue={settings?.nama_masjid} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Kota / Kabupaten</label>
                        <input name="set_kota" defaultValue={settings?.kota} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">URL Logo</label>
                        <input name="set_logo" defaultValue={settings?.logo_url} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Alamat Lengkap</label>
                      <textarea name="set_alamat" defaultValue={settings?.alamat} rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Teks Berjalan (Marquee)</label>
                      <input name="set_text" defaultValue={settings?.running_text} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium" />
                    </div>
                    <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-primary/20">
                      Simpan Perubahan
                    </button>
                  </form>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Nav - Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around items-center p-2 z-50 pb-6 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        {[
          { id: "dashboard", icon: LayoutDashboard, label: "Home" },
          { id: "keuangan", icon: Wallet, label: "Keu" },
          { id: "inventaris", icon: Box, label: "Aset" },
          { id: "pengurus", icon: Users, label: "Staf" },
          { id: "pengaturan", icon: SettingsIcon, label: "Set" }
        ].map((item) => (
          <button 
            key={item.id} 
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-2xl transition-all",
              activeTab === item.id ? "text-primary" : "text-slate-400"
            )}
          >
            <div className={cn("p-2 rounded-xl transition-all", activeTab === item.id && "bg-primary/10")}>
              <item.icon size={20} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* FAB - Mobile */}
      <button 
        onClick={() => {
          if (activeTab === "keuangan") { setEditingTransaction(null); setIsTransModalOpen(true); }
          else if (activeTab === "inventaris") setIsInvModalOpen(true);
          else if (activeTab === "pengurus") setIsStaffModalOpen(true);
        }}
        className={cn(
          "md:hidden fixed bottom-24 right-6 w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/40 z-40 transition-transform active:scale-90",
          !["keuangan", "inventaris", "pengurus"].includes(activeTab) && "hidden"
        )}
      >
        <Plus size={28} />
      </button>

      {/* Modals */}
      <Modal isOpen={isTransModalOpen} onClose={() => setIsTransModalOpen(false)} title={editingTransaction ? "Edit Transaksi" : "Input Transaksi Baru"}>
        <form onSubmit={handleTransactionSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Tanggal</label>
            <input type="date" name="tanggal" defaultValue={editingTransaction?.tanggal || format(new Date(), "yyyy-MM-dd")} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Jenis</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="jenis" value="Pemasukan" defaultChecked={!editingTransaction || editingTransaction.jenis === "Pemasukan"} className="accent-emerald-600" />
                <span className="text-sm font-bold text-emerald-600">Pemasukan</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="jenis" value="Pengeluaran" defaultChecked={editingTransaction?.jenis === "Pengeluaran"} className="accent-rose-600" />
                <span className="text-sm font-bold text-rose-600">Pengeluaran</span>
              </label>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Keterangan</label>
            <input type="text" name="keterangan" defaultValue={editingTransaction?.keterangan} placeholder="Contoh: Infak Jumat" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Jumlah (Rp)</label>
            <input type="number" name="jumlah" defaultValue={editingTransaction?.jumlah} placeholder="0" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" />
          </div>
          <button type="submit" className="w-full bg-primary text-white font-bold py-3 rounded-xl mt-4 shadow-lg shadow-primary/20">
            Simpan Transaksi
          </button>
        </form>
      </Modal>

      <Modal isOpen={isInvModalOpen} onClose={() => setIsInvModalOpen(false)} title="Tambah Aset Baru">
        <form onSubmit={handleInventorySubmit} className="space-y-4">
          <input name="nama_barang" placeholder="Nama Barang" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
          <input type="number" name="jml_barang" placeholder="Jumlah" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
          <select name="kondisi" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium">
            <option>Baik</option>
            <option>Rusak</option>
          </select>
          <input name="lokasi" placeholder="Lokasi (Contoh: Gudang)" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
          <button type="submit" className="w-full bg-primary text-white font-bold py-3 rounded-xl mt-4 shadow-lg shadow-primary/20">
            Simpan Aset
          </button>
        </form>
      </Modal>

      <Modal isOpen={isStaffModalOpen} onClose={() => setIsStaffModalOpen(false)} title="Tambah Pengurus">
        <form onSubmit={handleStaffSubmit} className="space-y-4">
          <input name="nama_pengurus" placeholder="Nama Lengkap" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
          <input name="jabatan" placeholder="Jabatan" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
          <input name="nohp" placeholder="No HP / WhatsApp" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
          <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl mt-4 shadow-lg shadow-slate-900/20">
            Simpan Pengurus
          </button>
        </form>
      </Modal>
    </div>
  );
}
