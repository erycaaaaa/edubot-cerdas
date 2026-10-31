import { Link } from 'react-router-dom';
import { MessageCircle, ThumbsUp, Trophy, Flag, ShieldCheck } from 'lucide-react';

const activities = [
  { title: 'Tanya tentang PJOK', points: 1, icon: MessageCircle, active: true,
    description: 'Kirim pertanyaan dan dapatkan jawaban yang lolos moderasi. Sepuluh pertanyaan yang mendapat reward menghasilkan 10 XP.' },
  { title: 'Beri penilaian membantu', points: 2, icon: ThumbsUp, active: true,
    description: 'Tekan “Membantu” pada jawaban chatbot yang membantumu belajar. Reward diberikan sekali untuk setiap jawaban.' },
  { title: 'Selesaikan tantangan', points: 20, icon: Trophy, active: false,
    description: 'Reward untuk tantangan belajar. Fitur tantangan belum tersedia.' },
  { title: 'Capai target belajar', points: 50, icon: Flag, active: false,
    description: 'Reward untuk pencapaian belajar. Target dan fiturnya belum tersedia.' },
  { title: 'Interaksi aman', points: 1, icon: ShieldCheck, active: false,
    description: 'Reward interaksi aman terpisah belum tersedia. Chat aman saat ini mendapat reward chat saja.' },
];

export function RewardGuide() {
  return <section id="cara-dapat-xp" aria-labelledby="reward-guide-heading" className="scroll-mt-6 rounded-2xl border border-txt-muted/30 bg-white p-5 md:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-olive">Belajar sedikit demi sedikit</p>
        <h2 id="reward-guide-heading" className="mt-1 text-2xl font-bold">Cara mendapat XP</h2>
        <p className="mt-2 text-txt-secondary">Kumpulkan XP untuk naik level dan EXP untuk membuka avatar favoritmu.</p>
      </div>
      <Link to="/student/chat" className="rounded-xl bg-brand px-4 py-3 font-semibold text-white hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Mulai bertanya</Link>
    </div>
    <ul className="mt-5 grid gap-3 sm:grid-cols-2">
      {activities.map(({ title, points, icon: Icon, active, description }) => <li key={title}
        className={`rounded-xl border p-4 ${active ? 'border-olive/25 bg-olive-light/30' : 'border-txt-muted/25 bg-card-soft'}`}>
        <div className="flex items-center gap-3">
          <Icon size={20} className="shrink-0 text-olive" aria-hidden="true" />
          <h3 className="flex-1 font-bold">{title}</h3>
          <span className="whitespace-nowrap font-bold text-olive">+{points} XP</span>
        </div>
        <p className="mt-3 text-sm text-txt-secondary">{description}</p>
        <span className={`mt-3 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${active ? 'bg-olive-light text-olive' : 'bg-white text-txt-secondary'}`}>
          {active ? 'Tersedia' : 'Belum tersedia'}
        </span>
      </li>)}
    </ul>
    <p className="mt-4 text-sm text-txt-secondary">Pesan yang melanggar aturan tidak mendapat reward. Memakai EXP untuk avatar tidak mengurangi XP total atau level.</p>
  </section>;
}
