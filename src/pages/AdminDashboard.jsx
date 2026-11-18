import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Search,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Check,
  Trash2,
  RefreshCw,
  ArrowUpRight,
  X,
  CheckCheck,
  Inbox,
} from 'lucide-react';

const PAGE_SIZE = 12;

const SENTIMENT_TABS = [
  { id: 'all', label: 'Semua' },
  { id: 'neutral', label: 'Ide & Saran' },
  { id: 'positive', label: 'Apresiasi' },
  { id: 'bug', label: 'Kendala' },
];

const STATUS_TABS = [
  { id: 'all', label: 'Semua Status' },
  { id: 'unread', label: 'Belum Dibaca' },
  { id: 'read', label: 'Selesai' },
];

function formatRelativeTime(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Baru saja';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}j lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}h lalu`;

  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatFullDate(dateString) {
  return new Date(dateString).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const searchInputRef = useRef(null);

  const [feedbacks, setFeedbacks] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({ unread: 0, bugs: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [readFilter, setReadFilter] = useState('all');

  // UI Interaction States
  const [selectedItem, setSelectedItem] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Ambil ringkasan statistik ringkas (unread & bug) secara paralel
  const fetchStats = useCallback(async () => {
    const [unreadRes, bugRes] = await Promise.all([
      supabase
        .from('feedbacks')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false),
      supabase
        .from('feedbacks')
        .select('*', { count: 'exact', head: true })
        .eq('sentiment', 'bug')
        .eq('is_read', false),
    ]);

    setStats({
      unread: unreadRes.count || 0,
      bugs: bugRes.count || 0,
    });
  }, []);

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('feedbacks')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (sentimentFilter !== 'all') {
      query = query.eq('sentiment', sentimentFilter);
    }

    if (readFilter === 'unread') {
      query = query.eq('is_read', false);
    } else if (readFilter === 'read') {
      query = query.eq('is_read', true);
    }

    if (searchQuery.trim() !== '') {
      const term = searchQuery.trim();
      query = query.or(`message.ilike.%${term}%,sender_name.ilike.%${term}%`);
    }

    const { data, count, error } = await query;

    if (!error) {
      setFeedbacks(data || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [page, sentimentFilter, readFilter, searchQuery]);

  // Debounce pencarian
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFeedbacks();
    }, 220);
    return () => clearTimeout(timer);
  }, [fetchFeedbacks]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Keyboard shortcut '/' untuk fokus ke pencarian & 'Escape' untuk tutup panel detail
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        setSelectedItem(null);
        setConfirmDeleteId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleRead = async (item, e) => {
    e?.stopPropagation();
    const nextStatus = !item.is_read;

    setFeedbacks((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, is_read: nextStatus } : row))
    );
    if (selectedItem?.id === item.id) {
      setSelectedItem((prev) => ({ ...prev, is_read: nextStatus }));
    }

    await supabase.from('feedbacks').update({ is_read: nextStatus }).eq('id', item.id);
    fetchStats();
  };

  const handleOpenDetail = async (item) => {
    setSelectedItem(item);
    setConfirmDeleteId(null);

    // Otomatis tandai sudah dibaca saat dibuka
    if (!item.is_read) {
      setFeedbacks((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, is_read: true } : row))
      );
      setSelectedItem({ ...item, is_read: true });
      await supabase.from('feedbacks').update({ is_read: true }).eq('id', item.id);
      fetchStats();
    }
  };

  const handleMarkAllRead = async () => {
    if (stats.unread === 0) return;
    setFeedbacks((prev) => prev.map((row) => ({ ...row, is_read: true })));
    setStats((prev) => ({ ...prev, unread: 0, bugs: 0 }));
    await supabase.from('feedbacks').update({ is_read: true }).eq('is_read', false);
    fetchStats();
  };

  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    setFeedbacks((prev) => prev.filter((item) => item.id !== id));
    setTotalCount((prev) => Math.max(0, prev - 1));
    setConfirmDeleteId(null);
    if (selectedItem?.id === id) {
      setSelectedItem(null);
    }

    await supabase.from('feedbacks').delete().eq('id', id);
    fetchStats();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const sentimentConfig = {
    positive: {
      label: 'Apresiasi',
      dot: 'bg-emerald-500',
      badge: 'text-emerald-700 bg-emerald-50/80 border-emerald-200/80',
    },
    neutral: {
      label: 'Ide & Saran',
      dot: 'bg-zinc-400',
      badge: 'text-zinc-700 bg-zinc-100/80 border-zinc-200/80',
    },
    bug: {
      label: 'Kendala',
      dot: 'bg-amber-500',
      badge: 'text-amber-700 bg-amber-50/80 border-amber-200/80',
    },
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 selection:bg-zinc-900 selection:text-white">
      {/* Top Workspace Header */}
      <header className="bg-white border-b border-zinc-200/80 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
                src="/logo.png"
                alt="Logo"
                className="w-6 h-6 rounded-md object-contain"
            />
            <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold tracking-tight text-zinc-900">
                Feedback Inbox
                </span>
                <span className="text-zinc-300">/</span>
                <span className="text-xs text-zinc-500">Admin</span>
            </div>
        </div>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 rounded-md hover:bg-zinc-100 transition"
            >
              Lihat Forum
              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400" />
            </Link>

            <button
              onClick={() => {
                fetchFeedbacks();
                fetchStats();
              }}
              title="Muat ulang data"
              className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <div className="h-4 w-px bg-zinc-200 mx-0.5" />

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:text-red-600 hover:bg-red-50/70 rounded-md transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Page Title & Compact Triage Metrics */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
              Masukan Pengguna
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              Tinjau laporan kendala, saran fitur, dan ulasan masuk secara real-time.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-zinc-200/90 rounded-lg shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span className="text-zinc-500">Belum dibaca:</span>
              <span className="font-semibold text-zinc-900 tabular-nums">{stats.unread}</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-zinc-200/90 rounded-lg shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-zinc-500">Kendala aktif:</span>
              <span className="font-semibold text-zinc-900 tabular-nums">{stats.bugs}</span>
            </div>
          </div>
        </div>

        {/* Control Toolbar: Search & Segmented Tabs */}
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row gap-3 justify-between">
            {/* Segmented Sentiment Tabs */}
            <div className="inline-flex p-1 bg-zinc-200/60 rounded-lg self-start overflow-x-auto max-w-full">
              {SENTIMENT_TABS.map((tab) => {
                const active = sentimentFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setSentimentFilter(tab.id);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-white text-zinc-900 shadow-2xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Search Input dengan Keyboard Hint */}
            <div className="relative w-full md:w-72">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari ulasan atau nama..."
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-white border border-zinc-200/90 rounded-lg text-zinc-900 placeholder:text-zinc-400 shadow-2xs focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition"
              />
              {searchQuery ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-sans text-zinc-400 bg-zinc-50 border border-zinc-200 rounded">
                  /
                </kbd>
              )}
            </div>
          </div>

          {/* Sub-bar: Status Filter & Mark All Read */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              {STATUS_TABS.map((tab) => {
                const active = readFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setReadFilter(tab.id);
                      setPage(1);
                    }}
                    className={`px-2.5 py-1 text-xs rounded-md border transition cursor-pointer ${
                      active
                        ? 'bg-zinc-900 text-white border-zinc-900 font-medium'
                        : 'bg-white text-zinc-600 border-zinc-200/80 hover:border-zinc-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {stats.unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Tandai semua dibaca</span>
              </button>
            )}
          </div>
        </div>

        {/* Inbox List Container */}
        <div className="bg-white border border-zinc-200/90 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
          {loading ? (
            <div className="divide-y divide-zinc-100">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="px-5 py-4 flex items-center justify-between gap-4 animate-pulse">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="h-3.5 bg-zinc-100 rounded w-28" />
                      <div className="h-4 bg-zinc-100 rounded w-16" />
                    </div>
                    <div className="h-3.5 bg-zinc-100 rounded w-3/4" />
                  </div>
                  <div className="h-3 bg-zinc-100 rounded w-14" />
                </div>
              ))}
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="py-20 px-4 text-center">
              <div className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto mb-3">
                <Inbox className="w-4 h-4" />
              </div>
              <p className="text-sm font-medium text-zinc-900">Kotak masuk kosong</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
                Tidak ada ulasan yang cocok dengan filter saat ini.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {feedbacks.map((item) => {
                const config = sentimentConfig[item.sentiment] || sentimentConfig.neutral;
                const isConfirming = confirmDeleteId === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleOpenDetail(item)}
                    className={`group px-5 py-4 transition-colors cursor-pointer flex items-start justify-between gap-4 ${
                      !item.is_read
                        ? 'bg-white hover:bg-zinc-50/90'
                        : 'bg-zinc-50/35 hover:bg-zinc-50/90'
                    }`}
                  >
                    {/* Left: Unread Indicator + Content */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="pt-1.5 shrink-0 w-2 flex justify-center">
                        {!item.is_read && (
                          <span
                            className="w-2 h-2 rounded-full bg-blue-600"
                            title="Belum dibaca"
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-sm truncate ${
                              !item.is_read
                                ? 'font-semibold text-zinc-900'
                                : 'font-medium text-zinc-700'
                            }`}
                          >
                            {item.sender_name}
                          </span>

                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium border rounded-md ${config.badge}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                            {config.label}
                          </span>

                          <span
                            title={formatFullDate(item.created_at)}
                            className="text-xs text-zinc-400 tabular-nums"
                          >
                            {formatRelativeTime(item.created_at)}
                          </span>
                        </div>

                        <p
                          className={`text-sm leading-relaxed line-clamp-2 break-words ${
                            !item.is_read ? 'text-zinc-800' : 'text-zinc-500'
                          }`}
                        >
                          {item.message}
                        </p>
                      </div>
                    </div>

                    {/* Right: Quick Hover Actions */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 shrink-0 pt-0.5"
                    >
                      {isConfirming ? (
                        <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-md px-2 py-1">
                          <span className="text-[11px] font-medium text-red-700 mr-1">
                            Hapus?
                          </span>
                          <button
                            onClick={(e) => handleDelete(item.id, e)}
                            className="px-1.5 py-0.5 text-[11px] font-semibold bg-red-600 text-white rounded hover:bg-red-700 cursor-pointer"
                          >
                            Ya
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-1.5 py-0.5 text-[11px] font-medium text-zinc-600 hover:text-zinc-900 cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleToggleRead(item, e)}
                            title={
                              item.is_read
                                ? 'Tandai belum dibaca'
                                : 'Tandai selesai dibaca'
                            }
                            className={`p-1.5 rounded-md border transition cursor-pointer ${
                              item.is_read
                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-700'
                                : 'bg-white border-zinc-200 text-zinc-500 hover:text-zinc-900'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setConfirmDeleteId(item.id)}
                            title="Hapus ulasan"
                            className="p-1.5 rounded-md bg-white border border-zinc-200 text-zinc-500 hover:text-red-600 hover:border-red-200 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Footer */}
          <div className="px-5 py-3 bg-zinc-50/70 border-t border-zinc-200/80 flex items-center justify-between text-xs text-zinc-500">
            <div className="tabular-nums">
              Menampilkan{' '}
              <span className="font-medium text-zinc-900">
                {totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
              </span>
              –
              <span className="font-medium text-zinc-900">
                {Math.min(page * PAGE_SIZE, totalCount)}
              </span>{' '}
              dari <span className="font-medium text-zinc-900">{totalCount}</span> ulasan
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-zinc-200 rounded-md font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-zinc-200 rounded-md font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 transition cursor-pointer"
              >
                <span>Berikutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Slide-Over Detail Inspector Drawer */}
      {selectedItem && (
        <div
          onClick={() => setSelectedItem(null)}
          className="fixed inset-0 z-30 bg-zinc-900/20 backdrop-blur-[1px] flex justify-end"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white h-full border-l border-zinc-200 shadow-xl flex flex-col justify-between"
          >
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border rounded-md ${
                    (sentimentConfig[selectedItem.sentiment] || sentimentConfig.neutral).badge
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      (sentimentConfig[selectedItem.sentiment] || sentimentConfig.neutral).dot
                    }`}
                  />
                  {(sentimentConfig[selectedItem.sentiment] || sentimentConfig.neutral).label}
                </span>

                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sender Metadata */}
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  {selectedItem.sender_name}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Dikirim pada {formatFullDate(selectedItem.created_at)}
                </p>
              </div>

              {/* Full Feedback Message */}
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap break-words">
                {selectedItem.message}
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-zinc-200/80 bg-zinc-50/60 flex items-center justify-between gap-3">
              <button
                onClick={(e) => handleDelete(selectedItem.id, e)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Ulasan
              </button>

              <button
                onClick={(e) => handleToggleRead(selectedItem, e)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg transition cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                {selectedItem.is_read ? 'Tandai Belum Dibaca' : 'Tandai Selesai'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}