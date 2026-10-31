import { useRef, useState } from 'react';
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

  async function submit() {
    if (inFlight.current || done || disabled) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      // Keep the chat request ID on retries so the server credits only once.
      const reward = await submitHelpfulFeedback(requestId);
      setDone(true);
      setStatus(reward.reward_delta > 0
        ? `Terima kasih! +${reward.reward_delta} XP sudah masuk.`
        : 'Terima kasih! Penilaian ini sudah tercatat.');
      onReward(reward);
    } catch (cause) {
      setError(isAxiosError(cause) && cause.response?.status === 401
        ? 'Sesi berakhir. Silakan masuk kembali.'
        : isAxiosError(cause) && cause.response?.status === 409
        ? 'Percakapan ini belum memenuhi syarat feedback. Pastikan reward chat sudah tercatat.'
        : 'Penilaian belum terkonfirmasi. Coba lagi.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return <div className="mt-3 border-t border-txt-muted/25 pt-3 text-sm">
    <button type="button" onClick={submit} disabled={disabled || busy || done}
      className="inline-flex items-center gap-2 rounded-xl border border-olive/30 px-3 py-2 font-semibold text-olive hover:bg-olive-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive disabled:opacity-60 disabled:cursor-not-allowed">
      <ThumbsUp size={16} aria-hidden="true" />
      {busy ? 'Mengirim...' : done ? 'Dinilai membantu' : 'Membantu · +2 XP'}
    </button>
    {status && <p role="status" className="mt-2 text-olive">{status}</p>}
    {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
  </div>;
}
