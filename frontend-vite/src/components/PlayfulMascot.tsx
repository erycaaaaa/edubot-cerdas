import { AnimatePresence, motion } from 'framer-motion';
import { BingoLogo } from './BingoLogo';

export type MascotState =
  | 'idle'
  | 'thinking'
  | 'correct'
  | 'incorrect'
  | 'partially_correct'
  | 'confused'
  | 'positive'
  | 'achievement'
  | 'error';

const tooltipText: Record<MascotState, string> = {
  idle: 'Ayo mulai belajar! 🚀',
  thinking: 'Hmm, coba aku pikirkan dulu! 🤔',
  correct: 'Wah, kamu hebat! 🎉',
  incorrect: 'Tidak apa-apa, kita coba lagi! 💪',
  partially_correct: 'Sedikit lagi, yuk! ✨',
  confused: 'Aku bantu jelaskan! 🌟',
  positive: 'Senang belajar bareng kamu! 😊',
  achievement: 'Kamu berhasil! ⭐',
  error: 'Sepertinya ada kendala. Yuk, coba lagi! 🔄',
};

export function PlayfulMascot({
  state = 'idle',
  size = 220,
}: {
  state?: MascotState;
  size?: number;
}) {
  const showThinking = state === 'thinking' || state === 'confused';
  const showCelebration = state === 'correct' || state === 'achievement' || state === 'positive';
  const showSupport = state === 'incorrect' || state === 'partially_correct' || state === 'error';

  return (
    <div className="relative flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={state}
          initial={{ opacity: 0, scale: 0.8, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -8 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative"
        >
          <motion.div
            animate={
              showCelebration
                ? { y: [0, -18, 0], rotate: [0, -4, 4, 0] }
                : showSupport
                  ? { y: [0, -8, 0], rotate: [0, 3, -3, 0] }
                  : { y: [0, -12, 0] }
            }
            transition={{
              duration: showCelebration ? 1.8 : 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="relative z-10"
          >
            <BingoLogo size={size} interactive={false} />
          </motion.div>

          {showThinking && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -right-4 top-2 flex -space-x-2"
            >
              {[0, 1, 2].map((dot) => (
                <motion.span
                  key={dot}
                  animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.4,
                    delay: dot * 0.15,
                    ease: 'easeInOut',
                  }}
                  className="h-3 w-3 rounded-full bg-[#F8E5A4] shadow-sm"
                />
              ))}
            </motion.div>
          )}

          {showCelebration && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pointer-events-none absolute -inset-6"
            >
              {[...Array(6)].map((_, index) => (
                <motion.span
                  key={index}
                  initial={{ opacity: 0, scale: 0.4, x: 0, y: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0.4, 1, 0.8],
                    x: [0, (index % 2 === 0 ? 1 : -1) * (16 + index * 6)],
                    y: [0, -22 - index * 6],
                  }}
                  transition={{ repeat: Infinity, duration: 1.6, delay: index * 0.12, ease: 'easeOut' }}
                  className="absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-full bg-[#F8E5A4]"
                />
              ))}
            </motion.div>
          )}

          {showSupport && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute -left-6 top-7 flex h-8 w-8 items-center justify-center rounded-full bg-[#C8E8D5] text-lg shadow-sm"
            >
              💡
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-[#332F2D] px-3 py-2 text-[11px] font-semibold text-white shadow-xl"
      >
        <span>{tooltipText[state]}</span>
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-[6px] border-transparent border-t-[#332F2D]" />
      </motion.div>
    </div>
  );
}

export default PlayfulMascot;
