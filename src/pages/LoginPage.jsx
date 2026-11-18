import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AlertCircle, ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const emailInputRef = useRef(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Jika sudah memiliki sesi aktif, langsung arahkan ke dashboard admin
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/admin', { replace: true });
    });
    emailInputRef.current?.focus();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setErrorMsg('');

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      // Pesan generik untuk mencegah user enumeration attack
      setErrorMsg('Email atau kata sandi tidak sesuai. Silakan periksa kembali.');
    } else {
      navigate('/admin', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 flex flex-col justify-between selection:bg-zinc-900 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="w-full px-6 h-16 flex items-center justify-between max-w-5xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Forum Publik
        </Link>

        <div className="flex items-center gap-2">
            <img
                src="/logo.png"
                alt="Logo"
                className="w-5 h-5 rounded object-contain"
            />
            <span className="text-xs font-semibold tracking-tight text-zinc-900">
                Product Feedback
            </span>
        </div>
      </header>

      {/* Main Login Container */}
      <main className="w-full max-w-[380px] mx-auto px-5 py-8">
        <div className="mb-7">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
            Internal Access
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            Masuk ke panel administrator
          </h1>
          <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
            Gunakan kredensial admin yang terdaftar untuk meninjau dan mengelola masukan pengguna.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Input Email */}
          <div>
            <label
              htmlFor="admin-email"
              className="block text-xs font-medium text-zinc-700 mb-1.5"
            >
              Alamat Email
            </label>
            <input
              id="admin-email"
              ref={emailInputRef}
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@perusahaan.com"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-zinc-200/90 rounded-lg text-zinc-900 placeholder:text-zinc-400 shadow-2xs focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition"
            />
          </div>

          {/* Input Password dengan Toggle Visibility */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="admin-password"
                className="block text-xs font-medium text-zinc-700"
              >
                Kata Sandi
              </label>
            </div>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-white border border-zinc-200/90 rounded-lg text-zinc-900 placeholder:text-zinc-400 shadow-2xs focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Error Feedback */}
          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50/90 border border-red-200/80 text-xs text-red-700 leading-relaxed"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-950 disabled:opacity-60 text-white text-sm font-medium py-2.5 px-4 rounded-lg shadow-xs transition cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi sesi...</span>
                </>
              ) : (
                <span>Lanjutkan</span>
              )}
            </button>
          </div>
        </form>
      </main>

      {/* Subtle Footer */}
      <footer className="py-6 text-center px-4">
        <p className="text-[11px] text-zinc-400">
          Akses dibatasi hanya untuk administrator terotorisasi.
        </p>
      </footer>
    </div>
  );
}