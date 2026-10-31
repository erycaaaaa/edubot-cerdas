import { useEffect, useState } from 'react';
import type { AvatarCollection } from '../services/apiClient';

const clock = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const calendar = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric',
});
const labels: Record<string, string> = {
  conversation_completed: 'Reward bertanya',
  helpful_feedback: 'Feedback membantu',
  challenge_completed: 'Tantangan selesai',
  learning_milestone: 'Target belajar tercapai',
  safe_interaction: 'Interaksi aman',
  avatar_unlocked: 'Avatar dibuka',
};

export function ExpHistory({ history }: { history: AvatarCollection['history'] }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return <section className="rounded-2xl border border-txt-muted/30 bg-white p-5" aria-labelledby="history-heading">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id="history-heading" className="text-xl font-bold">Riwayat EXP</h2>
      <span className="rounded-full bg-card-soft px-3 py-1 text-xs text-txt-secondary">Sekarang {clock.format(now)} WIB</span>
    </div>
    <p className="mt-2 text-sm text-txt-secondary">30 transaksi terbaru. Pembelian hanya memakai EXP, bukan XP level.</p>
    {history.length === 0 ? <p className="mt-4">Belum ada transaksi.</p> : <>
      <p id="history-scroll-hint" className="mb-2 mt-3 text-xs text-txt-secondary">Geser ke atas atau bawah untuk melihat riwayat. Waktu transaksi ditampilkan dalam WIB.</p>
      <div role="region" aria-label="Daftar transaksi EXP" aria-describedby="history-scroll-hint" tabIndex={0}
        className="max-h-64 overflow-y-auto overscroll-contain rounded-xl border border-txt-muted/20 px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-olive [scrollbar-gutter:stable]">
        <ul className="divide-y divide-txt-muted/20">{history.map(event => {
          const date = new Date(event.created_at);
          const valid = !Number.isNaN(date.getTime());
          const day = valid && calendar.format(date) === calendar.format(now) ? 'Hari ini' : valid ? calendar.format(date) : '';
          return <li key={event.id} className="flex justify-between gap-3 py-4">
            <div className="min-w-0">
              <p className="break-words font-medium">{labels[event.event_type] ?? 'Reward belajar'}{event.reason?.startsWith('Unlocked Avatar: ') ? `: ${event.reason.slice(17)}` : ''}</p>
              {valid ? <time className="text-xs text-txt-secondary" dateTime={event.created_at} title={`${calendar.format(date)}, ${clock.format(date)} WIB`}>
                {day}, {clock.format(date)} WIB
              </time> : <span className="text-xs text-txt-secondary">Waktu tidak tersedia</span>}
            </div>
            <strong className={`shrink-0 whitespace-nowrap text-sm ${event.reward_delta > 0 ? 'text-olive' : 'text-txt-secondary'}`}>
              {event.reward_delta > 0 ? '+' : ''}{event.reward_delta} EXP
            </strong>
          </li>;
        })}</ul>
      </div>
    </>}
  </section>;
}
