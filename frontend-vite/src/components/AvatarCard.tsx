import { useState } from 'react';
import { Check, LockKeyhole, Sparkles, Star } from 'lucide-react';
import type { AvatarCollection } from '../services/apiClient';
import { avatarCardDesigns } from '../config/avatarCards';

const frames = {
  Common: 'from-[#c5cdb7] via-[#f6f4df] to-[#9aa889]',
  Rare: 'from-[#91b9d4] via-[#e4f5ff] to-[#8c91c8]',
  Legendary: 'from-[#d8ac55] via-[#fff2bc] to-[#c99569]',
};

export function AvatarCard({ avatar, balance, busy, onAction }: {
  avatar: AvatarCollection['avatars'][number];
  balance: number;
  busy: string | null;
  onAction: (id: string, action: 'unlock' | 'equip') => void;
}) {
  const design = avatarCardDesigns[avatar.id] ?? {};
  const rarity = design.rarity ?? 'Common';
  const name = design.name ?? avatar.name;
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const needed = Math.max(0, avatar.cost_exp - balance);
  const unavailable = !avatar.owned && !avatar.is_active;
  const processing = busy === avatar.id;
  const disabled = busy !== null || avatar.equipped || (!avatar.owned && (needed > 0 || unavailable));

  return <article aria-label={`Kartu ${name}`} className={`group flex h-full flex-col rounded-[1.5rem] bg-gradient-to-br ${frames[rarity]} p-2 shadow-md motion-safe:transition-transform motion-safe:hover:-translate-y-1 ${avatar.equipped ? 'ring-2 ring-olive ring-offset-4 ring-offset-card-soft' : ''}`}>
    <div className="flex h-full flex-col overflow-hidden rounded-[1.1rem] border border-white/70 bg-[#fffcf3]">
      <div className="flex items-center justify-between gap-2 px-4 pt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-txt-secondary">
        <span>{design.edition ?? 'EduBuz Collection'}</span>
        <span className="shrink-0">#{design.number ?? avatar.id}</span>
      </div>
      <div className="flex items-start justify-between gap-2 px-4 py-2">
        <h3 className="break-words text-xl font-extrabold">{name}</h3>
        <span className="mt-1 inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-olive"><Star size={12} aria-hidden="true" />{rarity}</span>
      </div>
      <div className="relative mx-3 aspect-[4/3] overflow-hidden rounded-xl border border-white bg-gradient-to-br from-white via-[#f1ead9] to-[#d9dfcf]">
        <div aria-hidden="true" className="absolute -right-6 -top-8 h-40 w-40 rounded-full border-[20px] border-white/40" />
        <div aria-hidden="true" className="absolute -bottom-12 -left-8 h-40 w-40 rounded-full border-[20px] border-white/40" />
        {design.image && failedImage !== design.image ? <img src={design.image} alt={name} loading="lazy"
          onError={() => setFailedImage(design.image ?? null)}
          className={`relative h-full w-full ${design.imageFit === 'cover' ? 'object-cover' : 'object-contain p-3'}`} />
          : <div className="relative flex h-full items-center justify-center"><span className="text-8xl drop-shadow-lg" role="img" aria-label={name}>{avatar.emoji}</span></div>}
        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-txt-main">
          {avatar.owned ? <Check size={12} aria-hidden="true" /> : <LockKeyhole size={12} aria-hidden="true" />}
          {avatar.equipped ? 'Dipakai' : avatar.owned ? 'Dimiliki' : 'Terkunci'}
        </span>
      </div>
      <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
        <p className="min-h-12 flex-1 text-sm leading-relaxed text-txt-secondary">{design.description ?? avatar.description}</p>
        <div className="my-3 flex items-center justify-between gap-2 border-y border-txt-muted/30 py-2">
          <span className="inline-flex items-center gap-1 text-xs text-txt-secondary"><Sparkles size={14} aria-hidden="true" />Avatar koleksi</span>
          <span className="font-bold text-olive">{avatar.cost_exp === 0 ? 'Gratis' : `${avatar.cost_exp} EXP`}</span>
        </div>
        <p className="mb-3 min-h-5 text-xs text-txt-secondary">{avatar.equipped ? 'Teman belajarmu saat ini.' : avatar.owned ? 'Sudah menjadi bagian koleksimu.' : unavailable ? 'Saat ini belum tersedia.' : needed > 0 ? `Kumpulkan ${needed} EXP lagi untuk membuka.` : 'Siap ditambahkan ke koleksimu.'}</p>
        <button type="button" disabled={disabled} aria-label={`${avatar.owned ? 'Pakai' : 'Buka'} avatar ${name}`}
          onClick={() => onAction(avatar.id, avatar.owned ? 'equip' : 'unlock')}
          className={`w-full rounded-xl px-3 py-3 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive disabled:cursor-not-allowed disabled:opacity-60 ${avatar.owned ? 'bg-olive hover:bg-olive-hover' : 'bg-brand hover:bg-brand-hover'}`}>
          {processing ? 'Memproses...' : avatar.equipped ? 'Sedang dipakai' : avatar.owned ? 'Pakai avatar' : unavailable ? 'Belum tersedia' : avatar.cost_exp === 0 ? 'Buka gratis' : `Buka · ${avatar.cost_exp} EXP`}
        </button>
      </div>
    </div>
  </article>;
}
