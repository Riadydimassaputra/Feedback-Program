import { useState, useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { supabase } from '../lib/supabase';
import {
  Check,
  AlertCircle,
  Sparkles,
  Bug,
  Lightbulb,
  CornerDownLeft,
  ArrowUpRight,
  RotateCcw,
} from 'lucide-react';

const CATEGORIES = [
  {
    id: 'neutral',
    label: 'Ide & Saran',
    desc: 'Usulan fitur atau perbaikan alur',
    icon: Lightbulb,
  },
  {
    id: 'positive',
    label: 'Apresiasi',
    desc: 'Hal yang sudah berjalan baik',
    icon: Sparkles,
  },
  {
    id: 'bug',
    label: 'Kendala',
    desc: 'Error, bug, atau masalah teknis',
    icon: Bug,
  },
];

export default function FeedbackPage() {
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [sentiment, setSentiment] = useState('neutral');
  const [honeypot, setHoneypot] = useState(''); // Jebakan bot spam
  const [status, setStatus] = useState({ type: 'idle', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const textareaRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const submitFeedback = async () => {
    if (isSubmitting) return;

    // Jika honeypot terisi oleh bot, gagalkan secara diam-diam
    if (honeypot) {
      setIsSubmitted(true);
      return;
    }

    // Rate limiting 15 detik di sisi klien
    const lastSent = localStorage.getItem('last_feedback_time');
    if (lastSent && Date.now() - Number(lastSent) < 15000) {
      const remaining = Math.ceil((15000 - (Date.now() - Number(lastSent))) / 1000);
      setStatus({
        type: 'error',
        text: `Mohon tunggu ${remaining} detik sebelum mengirim masukan berikutnya.`,
      });
      return;
    }

    const cleanName = DOMPurify.sanitize(senderName.trim(), { ALLOWED_TAGS: [] }) || 'Anonim';
    const cleanMessage = DOMPurify.sanitize(message.trim(), { ALLOWED_TAGS: [] });

    if (cleanMessage.length < 5) {
      setStatus({ type: 'error', text: 'Tuliskan minimal 5 karakter agar mudah dipahami.' });
      textareaRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: 'idle', text: '' });

    const { error } = await supabase.from('feedbacks').insert([
      {
        sender_name: cleanName,
        message: cleanMessage,
        sentiment,
      },
    ]);

    setIsSubmitting(false);

    if (error) {
      setStatus({
        type: 'error',
        text: 'Koneksi terganggu. Gagal menyimpan masukan, silakan coba lagi.',
      });
    } else {
      localStorage.setItem('last_feedback_time', Date.now().toString());
      setIsSubmitted(true);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitFeedback();
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      submitFeedback();
    }
  };

  const handleReset = () => {
    setSenderName('');
    setMessage('');
    setSentiment('neutral');
    setStatus({ type: 'idle', text: '' });
    setIsSubmitted(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-zinc-200/80 bg-white/80 backdrop-blur-xs">
        <div className="flex items-center gap-2.5">
            <img
                src="/logo.png"
                alt="Logo"
                className="w-6 h-6 rounded-md object-contain"
            />
            <span className="text-sm font-semibold tracking-tight text-zinc-900">
                Product Feedback
            </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center">
        <div className="max-w-4xl w-full mx-auto px-6 py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-12 items-start">
            
            {/* Kolom Kiri: Konteks & Panduan */}
            <div className="md:col-span-5 space-y-6">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 leading-snug">
                  Bantu kami membangun produk yang lebih baik.
                </h1>
                <p className="text-sm text-zinc-500 mt-2.5 leading-relaxed">
                  Punya ide fitur, menemukan kendala teknis, atau sekadar ingin berbagi pengalaman? Tulis langsung di sini.
                </p>
              </div>

              <div className="border-t border-zinc-200/80 pt-5 space-y-3.5 text-xs text-zinc-600">
                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mt-1.5 shrink-0" />
                  <p className="leading-relaxed">
                    <strong className="font-medium text-zinc-900">Privasi terjaga.</strong> Anda tidak perlu login atau mencantumkan email untuk mengirim ulasan.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mt-1.5 shrink-0" />
                  <p className="leading-relaxed">
                    <strong className="font-medium text-zinc-900">Dibaca langsung.</strong> Setiap catatan masuk ke kotak masuk internal dan ditinjau secara berkala.
                  </p>
                </div>
              </div>
            </div>

            {/* Kolom Kanan: Composer Card */}
            <div className="md:col-span-7">
              <div className="bg-white rounded-xl border border-zinc-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.02)] overflow-hidden">
                {isSubmitted ? (
                  /* Tampilan Sukses setelah Terkirim */
                  <div className="p-8 sm:p-10 text-center space-y-4">
                    <div className="w-10 h-10 rounded-full bg-zinc-900 text-white flex items-center justify-center mx-auto">
                      <Check className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-base font-semibold text-zinc-900">
                        Masukan telah diterima
                      </h2>
                      <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
                        Terima kasih telah meluangkan waktu. Catatan Anda sudah tersimpan dan akan segera kami tinjau.
                      </p>
                    </div>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleReset}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200/70 rounded-lg transition cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Kirim masukan lain
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Form Input */
                  <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-5">
                    {/* Honeypot field (tersembunyi dari manusia) */}
                    <input
                      type="text"
                      name="website_url"
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                      className="hidden"
                    />

                    {/* Pilihan Tipe Masukan */}
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-2">
                        Jenis masukan
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {CATEGORIES.map((item) => {
                          const Icon = item.icon;
                          const isSelected = sentiment === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setSentiment(item.id)}
                              className={`text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-zinc-900 bg-zinc-900/[0.02] ring-1 ring-zinc-900'
                                  : 'border-zinc-200 hover:border-zinc-300 bg-white'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <Icon
                                  className={`w-3.5 h-3.5 ${
                                    isSelected ? 'text-zinc-900' : 'text-zinc-400'
                                  }`}
                                />
                                <span
                                  className={`text-xs font-medium ${
                                    isSelected ? 'text-zinc-900' : 'text-zinc-700'
                                  }`}
                                >
                                  {item.label}
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-400 leading-tight">
                                {item.desc}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Textarea Ulasan */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label htmlFor="feedback-message" className="text-xs font-medium text-zinc-700">
                          Detail catatan
                        </label>
                        <span className="text-[11px] text-zinc-400 tabular-nums">
                          {message.length} / 2000
                        </span>
                      </div>
                      <textarea
                        id="feedback-message"
                        ref={textareaRef}
                        required
                        rows={5}
                        maxLength={2000}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Jelaskan ide, kendala yang dialami, atau hal yang menurut Anda bisa ditingkatkan..."
                        className="w-full px-3.5 py-2.5 text-sm bg-zinc-50/50 focus:bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition resize-none leading-relaxed"
                      />
                    </div>

                    {/* Nama Pengirim */}
                    <div>
                      <label htmlFor="sender-name" className="block text-xs font-medium text-zinc-700 mb-1.5">
                        Nama atau inisial{' '}
                        <span className="text-zinc-400 font-normal">(opsional)</span>
                      </label>
                      <input
                        id="sender-name"
                        type="text"
                        maxLength={60}
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="Anonim"
                        className="w-full px-3.5 py-2 text-sm bg-zinc-50/50 focus:bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition"
                      />
                    </div>

                    {/* Error Alert */}
                    {status.type === 'error' && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50/80 border border-red-200/80 text-xs text-red-700">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{status.text}</span>
                      </div>
                    )}

                    {/* Footer Form & Submit */}
                    <div className="pt-1 flex items-center justify-between gap-4">
                      <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-zinc-400">
                        Tekan{' '}
                        <kbd className="px-1.5 py-0.5 text-[10px] font-sans bg-zinc-100 border border-zinc-200 rounded text-zinc-600">
                          Ctrl
                        </kbd>{' '}
                        +{' '}
                        <kbd className="px-1.5 py-0.5 text-[10px] font-sans bg-zinc-100 border border-zinc-200 rounded text-zinc-600">
                          Enter
                        </kbd>
                      </span>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full sm:w-auto ml-auto inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-950 disabled:opacity-50 text-white text-xs font-medium py-2.5 px-5 rounded-lg transition cursor-pointer"
                      >
                        {isSubmitting ? 'Mengirim...' : 'Kirim Masukan'}
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}