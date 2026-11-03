import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ThumbsUp } from 'lucide-react';
import { isAxiosError } from 'axios';
import { submitHelpfulFeedback } from '../services/apiClient';

type Reward = Awaited<ReturnType<typeof submitHelpfulFeedback>>;

export function HelpfulFeedback({ requestId, disabled, onReward }: {
  requestId: string;
  disabled: boolean;
  onReward: (reward: Reward) => void;
}) {
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [rewardBurst, setRewardBurst] = useState(false);
  const [rewardDelta, setRewardDelta] = useState(0);

  async function submit() {
    if (inFlight.current || done || disabled) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      // Keep the chat request ID on retries so the server credits only once.
      const reward = await submitHelpfulFeedback(requestId);
      const nextDelta = Number(reward?.reward_delta ?? 0);
      setDone(true);
      setRewardDelta(nextDelta);
      setRewardBurst(true);
      setTimeout(() => setRewardBurst(false), 1200);
      setStatus(nextDelta > 0
        ? `Terima kasih! +${nextDelta} XP sudah masuk.`
        : 'Terima kasih! Penilaian ini sudah tercatat.');
      onReward(reward);
    } catch (cause) {
      const axiosError = isAxiosError(cause) ? cause : null;
      const status = axiosError?.response?.status;

      setError(status === 401
        ? 'Sesi berakhir. Silakan masuk kembali.'
        : status === 409
          ? 'Percakapan ini belum memenuhi syarat feedback. Pastikan reward chat sudah tercatat.'
          : status === 404
            ? 'Server reward sedang tidak tersedia. Penilaianmu tetap tercatat di chat, dan XP akan muncul saat server aktif kembali.'
            : 'Penilaian belum terkonfirmasi. Coba lagi.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return <div className="relative mt-3 border-t border-txt-muted/25 pt-3 text-sm">
    <AnimatePresence>
      {rewardBurst && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.7 }}
          animate={{ opacity: 1, y: -18, scale: 1 }}
          exit={{ opacity: 0, y: -34, scale: 0.8 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="pointer-events-none absolute right-2 -top-5 rounded-full bg-[#B9895F] px-2.5 py-1 text-xs font-bold text-white shadow-lg"
        >
          {rewardDelta > 0 ? `+${rewardDelta} XP` : '✓ Tercatat'}
        </motion.div>
      )}
    </AnimatePresence>

    <button type="button" onClick={submit} disabled={disabled || busy || done}
      className="inline-flex items-center gap-2 rounded-xl border border-olive/30 px-3 py-2 font-semibold text-olive hover:bg-olive-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive disabled:opacity-60 disabled:cursor-not-allowed">
      <ThumbsUp size={16} aria-hidden="true" />
      {busy ? 'Mengirim...' : done ? 'Dinilai membantu' : 'Membantu · +2 XP'}
    </button>
    {status && <p role="status" className="mt-2 text-olive">{status}</p>}
    {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
  </div>;
}
